<?php

declare(strict_types=1);

namespace App\Upms;

/** Offline isolated envelope only; does not change the legacy live secretstream protocol. */
final class FinancialArchive
{
    public const FORMAT = 'UPMS_ISOLATED_FINANCIAL_ARCHIVE_V1';

    private static function manifest(array $snapshot): array
    {
        $tables = array_keys($snapshot['tables'] ?? []);
        sort($tables);
        if (($snapshot['format'] ?? '') !== FinancialRecovery::FORMAT || ($snapshot['refundPolicyVersion'] ?? '') !== FinancialCorrections::VERSION
            || ($snapshot['basePlanHash'] ?? '') !== CleanInitialization::hash() || ($snapshot['moneyPlanHash'] ?? '') !== MoneySchema::hash()
            || ($snapshot['expensePlanHash'] ?? '') !== ExpenseSchema::hash() || $tables !== ExpenseRecovery::tables()
            || count($snapshot['triggerDefinitions'] ?? []) !== 72 || !FinancialRecovery::evidence($snapshot)['matched']) {
            throw new \RuntimeException('ISOLATED_ARCHIVE_MANIFEST_REJECTED');
        }
        return ['tables' => 29, 'guards' => 72, 'refundPolicyVersion' => FinancialCorrections::VERSION,
            'sourceTargetHash' => $snapshot['sourceTargetHash'], 'snapshotSha256' => hash('sha256', BusinessCommand::canonical($snapshot))];
    }

    public static function encrypt(array $snapshot, string $recipient): string
    {
        return ExpenseRecovery::encrypt(['format' => self::FORMAT, 'manifest' => self::manifest($snapshot), 'snapshot' => $snapshot], $recipient);
    }

    public static function decrypt(string $cipher, string $recipient): array
    {
        $archive = ExpenseRecovery::decrypt($cipher, $recipient);
        if (($archive['format'] ?? '') !== self::FORMAT || !is_array($archive['snapshot'] ?? null)
            || BusinessCommand::canonical($archive['manifest'] ?? null) !== BusinessCommand::canonical(self::manifest($archive['snapshot']))) {
            throw new \RuntimeException('ISOLATED_ARCHIVE_VERSION_OR_MANIFEST_REJECTED');
        }
        return $archive['snapshot'];
    }
}
