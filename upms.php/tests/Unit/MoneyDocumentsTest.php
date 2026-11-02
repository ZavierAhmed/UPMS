<?php

declare(strict_types=1);

namespace Tests\Unit;

use App\Upms\{ApiError,MoneyAccounts,MoneyDocuments};
use PHPUnit\Framework\TestCase;

final class MoneyDocumentsTest extends TestCase
{
    private function fixture(): array
    {
        $p = ['kind' => 'CLIENT_PAYMENT','method' => 'CASH','moneyAccountId' => '71','moneyIntegrationVersion' => 'p32b1'];
        $d = ['id' => '42','kind' => 'CLIENT_PAYMENT','date' => '2026-10-30','status' => 'POSTED','total' => '0.03','actor_id' => '1','official_number' => 'CR-000042','payload' => json_encode($p)];
        // The finalizing administrator may be different from the author of the draft.
        $b = ['id' => '9','kind' => 'SOURCE_CREDIT','source_type' => 'DOCUMENT','source_ref' => 'UPMS-DOC:42','source_key' => MoneyAccounts::sourceKey('42'),'date' => $d['date'],'amount' => '0.03','from_account_id' => null,'to_account_id' => '71','actor_id' => '2'];
        return [[$d],[$b],[['id' => '71','type' => 'CASH_HOLDER']],[['action' => 'document.posted','reference' => 'CR-000042','actor_id' => '2']]];
    }
    public function test_canonical_document_identity_and_actual_posting_actor(): void
    {
        $r = MoneyDocuments::reconcile(...$this->fixture());
        self::assertTrue($r['matched']);
        self::assertSame(1, $r['linkedDocuments']);
    }
    public function test_missing_duplicate_and_orphan_claims_fail(): void
    {
        foreach (['missing','duplicate','orphan'] as $case) {
            $f = $this->fixture();
            if ($case === 'missing') {
                $f[1] = [];
            } elseif ($case === 'duplicate') {
                $f[1][] = $f[1][0];
            } else {
                $f[0] = [];
            }
            self::assertFalse(MoneyDocuments::reconcile(...$f)['matched'], $case);
        }
    }
    public function test_wrong_amount_direction_date_key_account_method_and_actor_fail(): void
    {
        foreach (['amount' => '0.02','kind' => 'SOURCE_DEBIT','date' => '2026-10-29','source_key' => MoneyAccounts::sourceKey('41'),'to_account_id' => '72','actor_id' => '1'] as $field => $value) {
            $f = $this->fixture();
            $f[1][0][$field] = $value;
            self::assertFalse(MoneyDocuments::reconcile(...$f)['matched'], $field);
        }
        $f = $this->fixture();
        $f[2][0]['type'] = 'CHEQUE_CUSTODY';
        self::assertFalse(MoneyDocuments::reconcile(...$f)['matched']);
    }
    public function test_historical_sources_are_explicitly_unlinked_not_backfilled(): void
    {
        $f = $this->fixture();
        $p = json_decode($f[0][0]['payload'], true);
        unset($p['moneyIntegrationVersion'],$p['moneyAccountId']);
        $f[0][0]['payload'] = json_encode($p);
        $f[1] = [];
        $r = MoneyDocuments::reconcile(...$f);
        self::assertTrue($r['matched']);
        self::assertSame(1, $r['historicalUnlinkedDocuments']);
        self::assertSame(0, $r['linkedDocuments']);
    }
    public function test_credit_purchase_has_no_immediate_money_requirement(): void
    {
        self::assertFalse(MoneyDocuments::required(['kind' => 'PURCHASE','paidImmediately' => false]));
        self::assertTrue(MoneyDocuments::required(['kind' => 'PURCHASE','paidImmediately' => true]));
        self::assertFalse(MoneyDocuments::required(['kind' => 'CHALLAN']));
    }
    public function test_money_command_receipt_is_exactly_bound_to_batch_and_actor(): void
    {
        $batch = ['id' => '9','kind' => 'TRANSFER','source_type' => 'TRANSFER','amount' => '0.03','actor_id' => '2','corrects_id' => null];
        $command = ['key' => 'e082d3e0-5998-4ea4-9b72-7dc5cf770d07','fingerprint' => str_repeat('a', 64),'actor_id' => '2','result' => json_encode(MoneyAccounts::receipt($batch))];
        $inspect = fn ($c, $b) => \App\Upms\Integrity::inspect([], [$c], [['id' => '2']], [], [], [], [$b]);
        self::assertSame([], $inspect($command, $batch)['findings']);
        foreach (['amount' => '0.04','actor_id' => '3','source_type' => 'DOCUMENT'] as $field => $value) {
            $bad = $batch;
            $bad[$field] = $value;
            self::assertContains('COMMAND_MONEY_RESULT_INVALID', array_column($inspect($command, $bad)['findings'], 'code'));
        }
        $bad = json_decode($command['result'], true);
        $bad['allowDeficit'] = true;
        $command['result'] = json_encode($bad);
        self::assertContains('COMMAND_RESULT_INVALID', array_column($inspect($command, $batch)['findings'], 'code'));
    }
    public function test_validator_allows_account_only_in_explicit_integration_mode(): void
    {
        $input = (object)['kind' => 'CLIENT_PAYMENT','date' => '2026-10-30','moneyAccountId' => '71'];
        self::assertSame('71', \App\Upms\V1Input::document($input, true)['moneyAccountId']);
        $this->expectException(ApiError::class);
        \App\Upms\V1Input::document($input);
    }
    public function test_integrated_receipt_cannot_lose_or_forge_its_money_link(): void
    {
        [$docs,$batches,$accounts,$audit] = $this->fixture();
        $p = json_decode($docs[0]['payload'], true);
        $p['date'] = $docs[0]['date'];
        $p['amount'] = '0.03';
        $docs[0]['payload'] = json_encode($p);
        $receipt = ['id' => '42','status' => 'POSTED','official_number' => 'CR-000042','total' => '0.03','moneyMovement' => MoneyAccounts::receipt([...$batches[0],'corrects_id' => null])];
        $command = ['key' => 'e082d3e0-5998-4ea4-9b72-7dc5cf770d07','fingerprint' => str_repeat('a', 64),'actor_id' => '2'];
        $inspect = fn ($r) => \App\Upms\Integrity::inspect($docs, [[...$command,'result' => json_encode($r)]], [['id' => '1'],['id' => '2']], [], [], $audit, [[...$batches[0],'corrects_id' => null]])['findings'];
        self::assertSame([], $inspect($receipt));
        $wrong = $receipt;
        $wrong['moneyMovement']['amount'] = '0.04';
        self::assertContains('COMMAND_MONEY_LINK_INVALID', array_column($inspect($wrong), 'code'));
        unset($receipt['moneyMovement']);
        self::assertContains('COMMAND_MONEY_LINK_REQUIRED', array_column($inspect($receipt), 'code'));
    }
    public function test_cheque_validation_has_explicit_pending_error(): void
    {
        try {
            MoneyDocuments::validate(['kind' => 'CLIENT_PAYMENT','method' => 'CHEQUE_RECEIVED','moneyAccountId' => '71']);
            self::fail('Cheque unexpectedly accepted');
        } catch (ApiError $e) {
            self::assertSame('MONEY_CHEQUE_PENDING', $e->getMessage());
        }
    }
}
