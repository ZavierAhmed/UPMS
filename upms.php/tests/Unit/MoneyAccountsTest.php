<?php

declare(strict_types=1);

namespace Tests\Unit;

use App\Upms\{BusinessCommand,CrudGuards,MoneyAccounts,MoneyGuards,MoneyRecovery,MoneySchema};
use PHPUnit\Framework\TestCase;

final class MoneyAccountsTest extends TestCase
{
    private function fixture(): array
    {
        $accounts = [['id' => '71','code' => 'CUSTOM_CASH','name' => 'Any cash holder','type' => 'CASH_HOLDER'],['id' => '92','code' => 'CUSTOM_BANK','name' => 'Any bank','type' => 'BANK'],['id' => '105','code' => 'CUSTOM_CUSTODY','name' => 'Any custody','type' => 'CHEQUE_CUSTODY']];
        $b = [];
        $m = [];
        $audit = [];
        $balances = ['71' => '0.00','92' => '0.00','105' => '0.00'];
        $opened = [];
        $add = function (string $id, string $kind, ?string $from, ?string $to, string $amount) use (&$b, &$m, &$audit, &$balances, &$opened) {
            $row = ['id' => $id,'kind' => $kind,'date' => '2026-10-30','source_type' => $kind,'source_key' => MoneyAccounts::sourceKey($kind === 'OPENING' ? $to : 'SRC-'.$id),'source_ref' => 'SRC-'.$id,'from_account_id' => $from,'to_account_id' => $to,'opening_account_id' => $kind === 'OPENING' ? $to : null,'amount' => $amount,'corrects_id' => null,'actor_id' => '1','reason' => 'Synthetic verified source','created_at' => '2026-10-30 05:00:00.000000'];
            $b[] = $row;
            $before = [];
            $after = [];
            foreach (MoneyAccounts::legs($row) as $account => $delta) {
                $before[$account] = isset($opened[$account]) ? $balances[$account] : null;
                $balances[$account] = \App\Upms\Exact::money(\App\Upms\Exact::cents($balances[$account], zero:true)->plus(\App\Upms\Exact::cents($delta, signed:true, zero:true)));
                $after[$account] = $balances[$account];
                $opened[$account] = true;
                $m[] = ['id' => (string)(count($m) + 1),'batch_id' => $id,'account_id' => (string)$account,'delta' => $delta];
            }
            $audit[] = ['id' => $id,'batch_id' => $id,'actor_id' => '1','action' => 'money.posted.'.$kind,'reason' => $row['reason'],'created_at' => $row['created_at'],'evidence' => json_encode(['batchHash' => hash('sha256', BusinessCommand::canonical((object)$row)),'approvedBy' => '1','before' => $before,'after' => $after], JSON_THROW_ON_ERROR)];
        };
        $add('1', 'OPENING', null, '71', '100.01');
        $add('2', 'OPENING', null, '92', '0.00');
        $add('3', 'OPENING', null, '105', '50.00');
        $add('4', 'TRANSFER', '71', '92', '0.02');
        return [$accounts,$b,$m,$audit];
    }
    public function test_configured_identities_and_exact_independent_balances(): void
    {
        $r = MoneyAccounts::reconcile(...$this->fixture());
        self::assertTrue($r['matched']);
        self::assertSame('99.99', $r['balances']['71']);
        self::assertSame('0.02', $r['balances']['92']);
        self::assertSame('50.00', $r['balances']['105']);
        self::assertSame('2026-10-30', $r['openings']['105']);
        self::assertSame(['71' => '-0.02','92' => '0.02'], MoneyAccounts::legs($this->fixture()[1][3]));
    }
    public function test_empty_accounts_remain_unverified_without_invented_openings(): void
    {
        $f = $this->fixture();
        $r = MoneyAccounts::reconcile($f[0], [], [], []);
        self::assertTrue($r['matched']);
        self::assertSame([], $r['openings']);
    }
    public function test_missing_transfer_leg_never_reconciles(): void
    {
        $f = $this->fixture();
        array_pop($f[2]);
        $r = MoneyAccounts::reconcile(...$f);
        self::assertFalse($r['matched']);
        self::assertContains('SOURCE_EFFECT_MISMATCH', array_column($r['findings'], 'code'));
    }
    public function test_forged_or_missing_audit_never_reconciles(): void
    {
        $f = $this->fixture();
        $f[3][0]['reason'] = 'Changed';
        self::assertFalse(MoneyAccounts::reconcile(...$f)['matched']);
        $f = $this->fixture();
        array_pop($f[3]);
        self::assertFalse(MoneyAccounts::reconcile(...$f)['matched']);
    }
    public function test_numeric_instead_of_exact_audit_strings_is_rejected(): void
    {
        $f = $this->fixture();
        $e = json_decode($f[3][1]['evidence'], true);
        $e['after']['92'] = 0;
        $f[3][1]['evidence'] = json_encode($e);
        self::assertFalse(MoneyAccounts::reconcile(...$f)['matched']);
    }
    public function test_custody_and_unverified_spending_fail_reconciliation(): void
    {
        $f = $this->fixture();
        $f[0][0]['type'] = 'CHEQUE_CUSTODY';
        $r = MoneyAccounts::reconcile(...$f);
        self::assertContains('NONSPENDABLE_CUSTODY_EFFECT', array_column($r['findings'], 'code'));
        $f = $this->fixture();
        array_shift($f[1]);
        $r = MoneyAccounts::reconcile(...$f);
        self::assertContains('OPENING_REQUIRED', array_column($r['findings'], 'code'));
    }
    public function test_account_configuration_is_independent_of_names_and_json_key_order(): void
    {
        self::assertSame([['code' => 'ANY_BANK','name' => 'Owner chosen bank','type' => 'BANK']], MoneySchema::accounts([['type' => 'BANK','name' => 'Owner chosen bank','code' => 'ANY_BANK']]));
        $this->expectException(\RuntimeException::class);
        MoneySchema::accounts([['code' => 'X','name' => 'x','type' => 'BANK'],['code' => 'X','name' => 'y','type' => 'CASH_HOLDER']]);
    }
    public function test_source_normalization_and_new_guard_impact(): void
    {
        self::assertSame(MoneyAccounts::sourceKey(' source-Abc '), MoneyAccounts::sourceKey('SOURCE-abc'));
        self::assertCount(45, CrudGuards::plan());
        self::assertCount(15, MoneyGuards::plan('upms_runtime84'));
        self::assertCount(25, MoneyRecovery::tables());
        self::assertSame('7047bb1d5bce5b1208330594cb88478248a9f0cd10ceab09bd0ab34d4cdbce13', CrudGuards::hash());
        self::assertCount(5, MoneySchema::plan()['tables']);
    }
    public function test_encrypted_snapshot_roundtrip_and_ciphertext_tampering(): void
    {
        $kp = sodium_crypto_box_keypair();
        $snapshot = ['format' => MoneyRecovery::FORMAT,'synthetic' => 'private synthetic value'];
        $cipher = MoneyRecovery::encrypt($snapshot, sodium_crypto_box_publickey($kp));
        self::assertStringNotContainsString('private synthetic', $cipher);
        self::assertSame($snapshot, MoneyRecovery::decrypt($cipher, $kp));
        $cipher[20] = chr(ord($cipher[20]) ^ 1);
        $this->expectException(\RuntimeException::class);
        try {
            MoneyRecovery::decrypt($cipher, $kp);
        } finally {
            sodium_memzero($kp);
        }
    }
}
