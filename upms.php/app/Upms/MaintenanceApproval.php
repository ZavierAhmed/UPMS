<?php

declare(strict_types=1);

namespace App\Upms;

final class MaintenanceApproval
{
    public static function targetHash(array $c): string
    {
        $pin = [];
        foreach (['schema','account','serverId','serverVersion','transport','host','port','socket','socketOwnerUid','serverHostname','privateRoot','publicRoot','managementRoot','origin'] as $key) {
            $pin[$key] = $c[$key] ?? null;
        }
        $pin['caSha256'] = isset($c['caFile']) && is_file($c['caFile']) ? hash_file('sha256', $c['caFile']) : null;
        return hash('sha256', json_encode($pin, JSON_THROW_ON_ERROR));
    }
    public static function read(array $c, string $operation): array
    {
        if (!is_string($c['approvalFile'] ?? null)) {
            throw new \RuntimeException('PRIVATE_APPROVAL_REQUIRED');
        }
        $a = json_decode(file_get_contents($c['approvalFile']), true, 32, JSON_THROW_ON_ERROR);
        if (!preg_match('/^[a-f0-9]{64}$/D', $a['backupSha256'] ?? '') || !preg_match('/^[a-zA-Z0-9_-]{12,64}$/D', $a['restoreReference'] ?? '')) {
            throw new \RuntimeException('VERIFIED_BACKUP_REFERENCE_REQUIRED');
        }
        if (($a['status'] ?? '') !== 'APPROVED_FINAL_CUTOVER' || ($a['operation'] ?? '') !== $operation || ($a['reference'] ?? '') !== $c['reference'] || ($a['targetHash'] ?? '') !== self::targetHash($c) || ($a['planHash'] ?? '') !== CleanInitialization::hash()) {
            throw new \RuntimeException('EXACT_OPERATION_APPROVAL_REQUIRED');
        }
        return $a;
    }
}
