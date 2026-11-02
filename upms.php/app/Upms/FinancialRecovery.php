<?php

declare(strict_types=1);

namespace App\Upms;

use PDO;

/** Same 29 canonical tables/72 guards; distinct refund-aware recovery semantics. Not the live backup job. */
final class FinancialRecovery
{
    public const FORMAT = 'UPMS_FINANCIAL_SNAPSHOT_V1';
    public static function evidence(array $snapshot): array
    {
        $rows = static function ($t) use ($snapshot) {
            $records = $snapshot['tables'][$t]['rows'];
            foreach ($records as &$row) {
                foreach (['id','account_id','batch_id','actor_id','from_account_id','to_account_id','opening_account_id','corrects_id','party_id','document_id','item_id','entity_id'] as $key) {
                    if (isset($row[$key])) {
                        $row[$key] = (string)$row[$key];
                    }
                }
            }unset($row);
            if ($records && isset($records[0]['id'])) {
                usort($records, fn ($a, $b) => \Brick\Math\BigInteger::of((string)$a['id'])->compareTo((string)$b['id']));
            }return $records;
        };
        $refunds = FinancialCorrections::reconcile($rows('v1_documents'), $rows('money_batches'), $rows('v1_party_journal'), $rows('v1_lines'), $rows('v1_stock_journal'));
        $money = MoneyAccounts::reconcile($rows('money_accounts'), $rows('money_batches'), $rows('money_movements'), $rows('money_audit'));
        $sources = MoneyDocuments::reconcile($rows('v1_documents'), $rows('money_batches'), $rows('money_accounts'), array_values(array_filter($rows('v1_audit'), fn ($event) => $event['action'] === 'document.posted')));
        $masters = ExpenseMasters::reconcile($rows('expense_categories'), $rows('employees'), $rows('expense_master_audit'));
        $expenses = ExpenseMasters::documents($rows('v1_documents'), $rows('expense_master_audit'));
        $numbers = ChallanNumbers::reconcile($rows('v1_documents'));
        return ['matched' => $numbers['matched'] && $refunds['matched'] && $money['matched'] && $sources['matched'] && $masters['matched'] && $expenses['matched'],'customChallanNumbers' => $numbers,'refunds' => $refunds,'money' => $money,'sources' => $sources,'masters' => $masters,'expenses' => $expenses];
    }
    public static function capture(PDO $pdo, string $runtime): array
    {
        $s = ExpenseRecovery::capture($pdo, $runtime, true);
        $s['format'] = self::FORMAT;
        $s['refundPolicyVersion'] = FinancialCorrections::VERSION;
        if (!self::evidence($s)['matched']) {
            throw new \RuntimeException('REFUND_BACKUP_EVIDENCE_REJECTED');
        }return $s;
    }
    public static function encrypt(array $s, string $publicKey): string
    {
        return ExpenseRecovery::encrypt($s, $publicKey);
    }
    public static function decrypt(string $cipher, string $keyPair): array
    {
        return ExpenseRecovery::decrypt($cipher, $keyPair);
    }
    public static function restoreIsolated(PDO $pdo, array $snapshot, string $runtime): array
    {
        if (($snapshot['format'] ?? '') !== self::FORMAT || ($snapshot['refundPolicyVersion'] ?? '') !== FinancialCorrections::VERSION || !self::evidence($snapshot)['matched']) {
            throw new \RuntimeException('REFUND_BACKUP_MANIFEST_REJECTED');
        }
        $copy = $snapshot;
        $copy['format'] = ExpenseRecovery::FORMAT;
        $r = ExpenseRecovery::restoreIsolated($pdo, $copy, $runtime, true);
        $restored = ['tables' => []];
        foreach (ExpenseRecovery::tables() as $table) {
            $restored['tables'][$table]['rows'] = $pdo->query('SELECT * FROM `'.$table.'`')->fetchAll(PDO::FETCH_ASSOC);
        }
        $e = self::evidence($restored);
        if (!$e['matched']) {
            throw new \RuntimeException('REFUND_RESTORED_EVIDENCE_REJECTED');
        }
        return [...$r,'format' => self::FORMAT,'refundReconciliation' => $e];
    }
}
