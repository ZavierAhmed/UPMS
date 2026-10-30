<?php

declare(strict_types=1);

namespace App\Upms;

use PDO;

final class CrudRiskApproval
{
    public const RISKS = ['DIRECT_SQL_CAN_FABRICATE_NEW_INSERTS','SHARED_SQL_CAN_CHANGE_ANY_PASSWORD_ROW','MUTABLE_STOCK_COUNTERS_AND_SESSIONS_REMAIN_WRITABLE'];
    public static function digest(): string
    {
        return hash('sha256', json_encode(['policy' => RuntimePrivileges::GODADDY,'guards' => CrudGuards::hash(),'residualRisks' => self::RISKS], JSON_THROW_ON_ERROR));
    }
    public static function verify(PDO $pdo, array $c): void
    {
        $a = json_decode(file_get_contents($c['crudRiskApprovalFile'] ?? ''), true, 32, JSON_THROW_ON_ERROR);
        $g = json_decode(file_get_contents($c['guardEvidenceFile'] ?? ''), true, 32, JSON_THROW_ON_ERROR);
        if (($a['status'] ?? '') !== 'OWNER_APPROVED_GODADDY_CRUD_ACTIVATION' || ($a['riskDigest'] ?? '') !== self::digest() || ($a['reference'] ?? '') !== $c['reference'] || ($a['targetHash'] ?? '') !== MaintenanceApproval::targetHash($c) || ($a['residualRisks'] ?? []) !== self::RISKS
            || ($g['passed'] ?? false) !== true || ($g['guardHash'] ?? '') !== CrudGuards::hash() || ($g['targetHash'] ?? '') !== CleanInitialization::target($pdo) || ($g['triggers'] ?? 0) !== 45) {
            throw new \RuntimeException('EXPLICIT_CRUD_RISK_APPROVAL_REQUIRED');
        }
    }
}
