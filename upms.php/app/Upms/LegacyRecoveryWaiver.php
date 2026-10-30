<?php

declare(strict_types=1);

namespace App\Upms;

/** Retired dummy database restore waiver; never production recovery or activation. */
final class LegacyRecoveryWaiver
{
    public static function valid(array $c, ?string $operation = null): bool
    {
        $operations = ['one-time-sql-import-finalization' => 'finalize-clean-sql-import', 'one-time-production-maintenance' => 'provision-clean-administrators'];
        $w = $c['legacyRecoveryWaiver'] ?? null;
        return ($c['schema'] ?? null) === 'upms_v1'
            && ($c['backupRestoreVerified'] ?? null) === false
            && isset($operations[$c['mode'] ?? ''])
            && ($operation === null || $operations[$c['mode']] === $operation)
            && is_array($w)
            && ($w['status'] ?? null) === 'OWNER_APPROVED_LEGACY_RECOVERY_WAIVER'
            && ($w['retiredSchema'] ?? null) === 'upms'
            && ($w['productionSchema'] ?? null) === 'upms_v1'
            && ($w['reference'] ?? null) === ($c['reference'] ?? null)
            && ($w['legacyExportReportedByOwner'] ?? null) === 'upms.sql'
            && ($w['legacyRestoreVerified'] ?? null) === false
            && ($w['productionRecoveryVerified'] ?? null) === false
            && ($w['activationAuthorized'] ?? null) === false
            && ($w['ownerApprovalSource'] ?? null) === 'PHP-8.4 owner request: retire dummy upms and finalize clean upms_v1'
            && is_string($w['reason'] ?? null) && strlen(trim($w['reason'])) >= 30;
    }
}
