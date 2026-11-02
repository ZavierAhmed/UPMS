<?php

declare(strict_types=1);

namespace Tests\Unit;

use App\Upms\{ApiError, HaftaReport, V1Input};
use PHPUnit\Framework\TestCase;

final class HaftaReportTest extends TestCase
{
    private function fixture(): array
    {
        $doc = fn ($id, $date, $kind, $total, $payload = []) => ['id' => (string)$id,'party_id' => '1','date' => $date,'status' => 'POSTED','kind' => $kind,'total' => $total,'official_number' => 'TEST-'.$id,'payload' => $payload];
        $docs = [$doc(1, '2026-10-25', 'CLIENT_OPENING', '100.00'),$doc(3, '2026-10-28', 'CLIENT_PAYMENT', '10.00'),$doc(2, '2026-10-26', 'CHALLAN', '0.54', ['discountSummary' => ['amount' => '0.06']]),$doc(4, '2026-10-29', 'CHALLAN_RETURN', '0.18'),$doc(5, '2026-10-30', 'PAYMENT_REVERSAL', '10.00'),$doc(6, '2026-11-02', 'CHALLAN', '900.00')];
        $line = fn ($id, $qty, $rate, $amount) => ['document_id' => $id,'line_no' => 1,'snapshot' => ['description' => str_repeat('Historic bottle ', 12),'quality' => ''],'quantity' => $qty,'rate' => $rate,'amount' => $amount];
        $journal = [];
        foreach ([['1','100.00','0.00'],['2','0.54','0.00'],['3','0.00','10.00'],['4','0.00','0.18'],['5','10.00','0.00']] as [$id,$dr,$cr]) {
            $journal[] = ['document_id' => $id,'party_id' => '1','debit' => $dr,'credit' => $cr];
        }
        return [['from' => '2026-10-26','to' => '2026-11-01','parties' => []],[['id' => '1','kind' => 'CLIENT','name' => 'Synthetic client','opening_verified' => 1],['id' => '2','kind' => 'CLIENT','name' => 'Empty / unverified','opening_verified' => 0],['id' => '3','kind' => 'VENDOR','name' => 'Do not combine','opening_verified' => 1]],$docs,[$line('4', '1', '0.20', '0.18'),$line('2', '3', '0.20', '0.60')],$journal];
    }
    public function test_exact_chronological_snapshot_sales_discounts_returns_and_receipts(): void
    {
        $r = HaftaReport::assemble(...$this->fixture());
        $b = $r['blocks'][0];
        self::assertCount(2, $r['blocks']);
        self::assertSame('100.00', $b['opening']);
        self::assertSame('0.60', $b['grossSales']);
        self::assertSame('0.06', $b['discounts']);
        self::assertSame('0.18', $b['returns']);
        self::assertSame('0.36', $b['total']);
        self::assertSame('10.00', $b['receipts']);
        self::assertSame('10.00', $b['receiptReversals']);
        self::assertSame('100.36', $b['balance']);
        self::assertNull($b['advance']);
        self::assertNull($b['colorAndDieChange']);
        self::assertSame(['CHALLAN','DISCOUNT','CLIENT_PAYMENT','CHALLAN_RETURN','PAYMENT_REVERSAL'], array_column($b['rows'], 'kind'));
        self::assertStringStartsWith('Historic bottle', $b['rows'][0]['description']);
        self::assertSame('0.20', $b['rows'][3]['rate']);
        self::assertSame('0.18', $b['rows'][3]['amount']);
    }
    public function test_empty_parties_and_unverified_openings_are_not_zero_balances(): void
    {
        $b = HaftaReport::assemble(...$this->fixture())['blocks'][1];
        self::assertSame([], $b['rows']);
        self::assertNull($b['opening']);
        self::assertNull($b['balance']);
        self::assertNotEmpty($b['warnings']);
        self::assertSame('0.00', $b['total']);
        $f = $this->fixture();
        $f[1] = [];
        self::assertSame([], HaftaReport::assemble(...$f)['blocks']);
    }
    public function test_opening_recorded_inside_range_does_not_invent_brought_forward(): void
    {
        $f = $this->fixture();
        $f[2][0]['date'] = '2026-10-26';
        $b = HaftaReport::assemble(...$f)['blocks'][0];
        self::assertFalse($b['openingVerified']);
        self::assertNull($b['balance']);
        self::assertSame('100.00', $b['openingEntries']);
    }
    public function test_drafts_and_outside_dates_are_excluded(): void
    {
        $f = $this->fixture();
        $f[2][2]['status'] = 'DRAFT';
        $f[4] = array_values(array_filter($f[4], fn ($j) => $j['document_id'] !== '2'));
        $b = HaftaReport::assemble(...$f)['blocks'][0];
        self::assertSame('0.00', $b['grossSales']);
        self::assertSame('-0.18', $b['total']);
    }
    public function test_corrupt_line_evidence_fails_closed(): void
    {
        $f = $this->fixture();
        $f[3][1]['amount'] = '0.61';
        $this->expectException(ApiError::class);
        HaftaReport::assemble(...$f);
    }
    public function test_future_classified_records_are_not_silently_combined(): void
    {
        $f = $this->fixture();
        $f[2][2]['payload']['classification'] = 'GST';
        $this->expectException(ApiError::class);
        HaftaReport::assemble(...$f);
    }
    public function test_only_item_name_is_required_and_blank_price_remains_unset(): void
    {
        $p = V1Input::item((object)['description' => 'Bottle 500ml']);
        self::assertSame('', $p['quality']);
        self::assertSame('', $p['colour']);
        self::assertSame('', $p['packing']);
        self::assertArrayNotHasKey('sellingPrice', $p);
        self::assertNull(V1Input::item((object)['description' => 'Bottle 500ml','sellingPrice' => null])['sellingPrice']);
        $this->expectException(ApiError::class);
        V1Input::item((object)['description' => '   ']);
    }
    public function test_filters_validate_range_and_ids(): void
    {
        self::assertSame(['1','2'], HaftaReport::filters(['from' => '2026-10-26','to' => '2026-11-01','parties' => '1,2,1'])['parties']);
        foreach ([['from' => '2026-02-30'],['from' => '2026-11-02','to' => '2026-10-01'],['parties' => '1 OR 1=1'],['from' => '2020-01-01','to' => '2026-01-01'],['parties' => ['1']]] as $f) {
            try {
                HaftaReport::filters($f);
                self::fail('Invalid filter accepted');
            } catch (ApiError) {
                self::assertTrue(true);
            }
        }
    }
    public function test_sunday_is_inclusive_and_following_monday_is_excluded(): void
    {
        $f = $this->fixture();
        $f[2][5]['date'] = '2026-11-01';
        $f[2][5]['total'] = '0.60';
        $f[3][] = [...$f[3][1], 'document_id' => '6'];
        $f[4][] = ['document_id' => '6', 'party_id' => '1', 'debit' => '0.60', 'credit' => '0.00'];
        $b = HaftaReport::assemble(...$f)['blocks'][0];
        self::assertSame('0.96', $b['total']);
        self::assertSame('2026-11-01', $b['rows'][array_key_last($b['rows'])]['date']);
        self::assertSame('100.96', $b['balance']);
        $f[2][5]['date'] = '2026-11-02';
        self::assertSame('0.36', HaftaReport::assemble(...$f)['blocks'][0]['total']);
    }
    public function test_missing_receipt_journal_is_not_reported_as_a_complete_balance(): void
    {
        $f = $this->fixture();
        $f[4] = array_values(array_filter($f[4], fn ($j) => $j['document_id'] !== '3'));
        $this->expectException(ApiError::class);
        HaftaReport::assemble(...$f);
    }
}
