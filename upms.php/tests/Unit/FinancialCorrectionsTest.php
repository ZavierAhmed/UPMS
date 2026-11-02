<?php

declare(strict_types=1);

namespace Tests\Unit;

use App\Upms\{ExpenseRecovery,FinancialCorrections,FinancialRecovery,MoneyAccounts,MoneyDocuments};
use PHPUnit\Framework\TestCase;

final class FinancialCorrectionsTest extends TestCase
{
    private function fixture(string $kind = 'CLIENT_PAYMENT'): array
    {
        $p = ['kind' => $kind,'date' => '2026-10-30','method' => 'CASH','moneyAccountId' => '71','moneyIntegrationVersion' => MoneyDocuments::VERSION,'amount' => '0.03','lines' => [],'partyId' => $kind === 'EXPENSE' ? null : '41','reference' => 'ORIGINAL'];
        if ($kind === 'EXPENSE') {
            $p = [...$p,'category' => 'Original category','categoryId' => '81','categorySnapshot' => ['id' => '81','name' => 'Original category','version' => 1,'employeeBased' => true],'employeeId' => '91','employeeSnapshot' => ['id' => '91','name' => 'Original employee','version' => 1],'businessExpenseConfirmed' => true,'expensePurpose' => 'BUSINESS_EXPENSE','expenseMasterVersion' => 'p32b2','payee' => 'Original payee','description' => 'Original business expense'];
        }
        $source = ['id' => '5','kind' => $kind,'date' => $p['date'],'party_id' => $p['partyId'],'version' => 1,'status' => 'POSTED','total' => '0.03','official_number' => $kind === 'EXPENSE' ? null : 'CR-0005','payload' => json_encode($p)];
        $b = ['id' => '6','kind' => $kind === 'CLIENT_PAYMENT' ? 'SOURCE_CREDIT' : 'SOURCE_DEBIT','date' => $p['date'],'source_type' => 'DOCUMENT','source_key' => MoneyAccounts::sourceKey('5'),'source_ref' => 'UPMS-DOC:5','from_account_id' => $kind === 'CLIENT_PAYMENT' ? null : '71','to_account_id' => $kind === 'CLIENT_PAYMENT' ? '71' : null,'amount' => '0.03','created_at' => '2026-10-30 05:00:00.000000'];
        $rp = [...$p,'kind' => FinancialCorrections::KIND,'date' => '2026-11-02','originalId' => '5','correctsId' => '5','originalKind' => $kind,'originalReference' => 'CR-0005','sourceHash' => FinancialCorrections::hash($source),'sourceMoneyHash' => FinancialCorrections::hash($b),'sourceMoneyBatchId' => '6','sourceVersion' => 1,'refundPolicyVersion' => FinancialCorrections::VERSION,'refundType' => FinancialCorrections::TYPE,'actualFundsReturned' => true,'refundEvidence' => 'Synthetic actual funds return evidence','reason' => 'Reviewed full refund','recordedBusinessDate' => '2026-11-02'];
        $refund = ['id' => '9','kind' => FinancialCorrections::KIND,'status' => 'POSTED','date' => $rp['date'],'corrects_id' => '5','party_id' => $source['party_id'],'total' => '0.03','official_number' => 'RF-0009','payload' => json_encode($rp)];
        $rb = ['id' => '10','kind' => $kind === 'CLIENT_PAYMENT' ? 'SOURCE_DEBIT' : 'SOURCE_CREDIT','date' => $rp['date'],'source_key' => MoneyAccounts::sourceKey('9'),'source_type' => 'DOCUMENT','source_ref' => 'UPMS-DOC:9','from_account_id' => $kind === 'CLIENT_PAYMENT' ? '71' : null,'to_account_id' => $kind === 'CLIENT_PAYMENT' ? null : '71','amount' => '0.03','created_at' => '2026-11-02 05:00:00.000000'];
        $j = $kind === 'EXPENSE' ? [] : [['document_id' => '9','party_id' => '41','debit' => $kind === 'CLIENT_PAYMENT' ? '0.03' : '0.00','credit' => $kind === 'VENDOR_PAYMENT' ? '0.03' : '0.00']];
        return [[$source,$refund],[$b,$rb],$j,[],[]];
    }
    public function test_full_refund_source_and_party_directions_are_exact(): void
    {
        foreach (['CLIENT_PAYMENT','VENDOR_PAYMENT','EXPENSE'] as $kind) {
            $f = $this->fixture($kind);
            $r = FinancialCorrections::reconcile(...$f);
            self::assertTrue($r['matched'], $kind);
            self::assertSame(1, $r['postedRefunds']);
            self::assertSame($kind !== 'CLIENT_PAYMENT', MoneyDocuments::credit(json_decode($f[0][1]['payload'], true)));
        }
    }
    public function test_entry_metadata_partial_cross_account_and_purchase_policies_are_blocked(): void
    {
        self::assertTrue(FinancialCorrections::policy('CLIENT_PAYMENT')['eligible']);
        foreach (['INCORRECT_ENTRY','METADATA_CORRECTION','WRONG_ACCOUNT','PARTIAL_REFUND','DUPLICATE_ENTRY'] as $type) {
            self::assertFalse(FinancialCorrections::policy('CLIENT_PAYMENT', $type)['eligible']);
        }
        foreach (['PURCHASE','PAYMENT_REVERSAL',FinancialCorrections::KIND,'CHALLAN'] as $kind) {
            self::assertFalse(FinancialCorrections::policy($kind)['eligible']);
        }
    }
    public function test_forged_amount_identity_evidence_type_and_account_never_reconcile(): void
    {
        foreach (['amount' => '0.02','originalId' => '99','sourceMoneyBatchId' => '7','sourceVersion' => 2,'actualFundsReturned' => false,'refundType' => 'INCORRECT_ENTRY','moneyAccountId' => '72','sourceHash' => str_repeat('0', 64),'refundEvidence' => ''] as $field => $value) {
            $f = $this->fixture();
            $p = json_decode($f[0][1]['payload'], true);
            $p[$field] = $value;
            $f[0][1]['payload'] = json_encode($p);
            self::assertFalse(FinancialCorrections::reconcile(...$f)['matched'], $field);
        }
    }
    public function test_refund_batch_amount_direction_account_key_and_date_are_independently_checked(): void
    {
        foreach (['amount' => '0.02','kind' => 'SOURCE_CREDIT','from_account_id' => '72','source_key' => MoneyAccounts::sourceKey('99'),'date' => '2026-11-01'] as $field => $value) {
            $f = $this->fixture();
            $f[1][1][$field] = $value;
            self::assertFalse(FinancialCorrections::reconcile(...$f)['matched'], $field);
        }
    }
    public function test_recovery_requires_posting_day_evidence_not_arbitrary_backdating(): void
    {
        $f = $this->fixture();
        $f[1][1]['created_at'] = '2026-11-03 05:00:00.000000';
        self::assertFalse(FinancialCorrections::reconcile(...$f)['matched']);
    }
    public function test_duplicate_source_claim_and_missing_party_effect_are_rejected(): void
    {
        $f = $this->fixture();
        $f[0][] = [...$f[0][1],'id' => '11','official_number' => 'RF-0011'];
        $f[1][] = [...$f[1][1],'id' => '12','source_ref' => 'UPMS-DOC:11'];
        self::assertFalse(FinancialCorrections::reconcile(...$f)['matched']);
        $f = $this->fixture();
        $f[2] = [];
        self::assertFalse(FinancialCorrections::reconcile(...$f)['matched']);
    }
    public function test_refunds_never_create_stock_or_an_expense_party_ledger(): void
    {
        $f = $this->fixture('EXPENSE');
        $f[2] = [['document_id' => '9','party_id' => '41','debit' => '0.03','credit' => '0.00']];
        self::assertFalse(FinancialCorrections::reconcile(...$f)['matched']);
        $f = $this->fixture();
        $f[4] = [['document_id' => '9','item_id' => '1','delta' => '1']];
        self::assertFalse(FinancialCorrections::reconcile(...$f)['matched']);
    }
    public function test_expense_refund_cannot_reclassify_historic_snapshots(): void
    {
        $f = $this->fixture('EXPENSE');
        $p = json_decode($f[0][1]['payload'], true);
        $p['employeeSnapshot']['name'] = 'New name';
        $f[0][1]['payload'] = json_encode($p);
        self::assertFalse(FinancialCorrections::reconcile(...$f)['matched']);
    }
    public function test_source_hash_survives_native_pdo_numeric_representation(): void
    {
        $f = $this->fixture();
        $hash = FinancialCorrections::hash($f[0][0]);
        $f[0][0]['id'] = 5;
        $f[0][0]['version'] = '1';
        self::assertSame($hash, FinancialCorrections::hash($f[0][0]));
    }
    public function test_recovery_format_is_versioned_and_authenticated(): void
    {
        self::assertNotSame(ExpenseRecovery::FORMAT, FinancialRecovery::FORMAT);
        $key = sodium_crypto_box_keypair();
        $snapshot = ['format' => FinancialRecovery::FORMAT,'refundPolicyVersion' => FinancialCorrections::VERSION];
        $cipher = FinancialRecovery::encrypt($snapshot, sodium_crypto_box_publickey($key));
        self::assertSame($snapshot, FinancialRecovery::decrypt($cipher, $key));
        $cipher[15] = chr(ord($cipher[15]) ^ 1);
        $this->expectException(\RuntimeException::class);
        FinancialRecovery::decrypt($cipher,$key);
    }
}
