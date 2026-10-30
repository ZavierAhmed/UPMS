<?php

declare(strict_types=1);

namespace Tests\Unit;

use App\Upms\{ApiError, CleanInitialization, LegacyRecoveryWaiver, MaintenanceApproval, ProductionProfile};
use PHPUnit\Framework\TestCase;

final class LegacyRecoveryWaiverTest extends TestCase
{
    private function profile(): array
    {
        return ['mode' => 'one-time-sql-import-finalization','schema' => 'upms_v1','reference' => 'php84_owner_go_live','backupRestoreVerified' => false,'legacyRecoveryWaiver' => [
            'status' => 'OWNER_APPROVED_LEGACY_RECOVERY_WAIVER','retiredSchema' => 'upms','productionSchema' => 'upms_v1','reference' => 'php84_owner_go_live',
            'legacyExportReportedByOwner' => 'upms.sql','legacyRestoreVerified' => false,'productionRecoveryVerified' => false,'activationAuthorized' => false,
            'ownerApprovalSource' => 'PHP-8.4 owner request: retire dummy upms and finalize clean upms_v1',
            'reason' => 'Owner retires historical dummy data and accepts that its exported archive has no verified restore.'
        ]];
    }
    public function test_waiver_is_narrow_and_never_activation_or_runtime(): void
    {
        $c = $this->profile();
        $this->assertTrue(LegacyRecoveryWaiver::valid($c, 'finalize-clean-sql-import'));
        foreach (['approved-production-runtime','reviewed-clean-activation','one-time-clean-initialization','read-only-transport-verification'] as $mode) {
            $bad = $c;
            $bad['mode'] = $mode;
            $this->assertFalse(LegacyRecoveryWaiver::valid($bad));
            $bad += ['enabled' => true,'hostingVerified' => true];
            try {
                ProductionProfile::validate($bad, $mode);
                $this->fail('Waiver enabled another mode');
            } catch (ApiError $e) {
                $this->assertSame('PRODUCTION_PROFILE_DISABLED', $e->apiCode);
            }
        }
        foreach (['schema' => 'upms','reference' => 'different_reference','backupRestoreVerified' => true] as $key => $value) {
            $bad = $c;
            $bad[$key] = $value;
            $this->assertFalse(LegacyRecoveryWaiver::valid($bad));
        }
        foreach (['productionRecoveryVerified' => true,'activationAuthorized' => true,'legacyRestoreVerified' => true,'retiredSchema' => 'another','reason' => ''] as $key => $value) {
            $bad = $c;
            $bad['legacyRecoveryWaiver'][$key] = $value;
            $this->assertFalse(LegacyRecoveryWaiver::valid($bad));
        }
        $this->assertFalse(LegacyRecoveryWaiver::valid($c, 'provision-clean-administrators'));
    }
    public function test_approval_binds_waiver_and_rejects_invented_restore_evidence(): void
    {
        $c = $this->profile();
        $file = tempnam(sys_get_temp_dir(), 'waiver-');
        $c['approvalFile'] = $file;
        $a = ['status' => 'APPROVED_FINAL_CUTOVER','operation' => 'finalize-clean-sql-import','reference' => $c['reference'],'targetHash' => MaintenanceApproval::targetHash($c),'planHash' => CleanInitialization::hash(),'legacyRecoveryWaiver' => $c['legacyRecoveryWaiver']];
        try {
            file_put_contents($file, json_encode($a));
            $this->assertSame($a, MaintenanceApproval::read($c, 'finalize-clean-sql-import'));
            foreach (['legacyRecoveryWaiver' => null,'backupSha256' => str_repeat('a', 64),'restoreReference' => 'invented_restore'] as $key => $value) {
                $bad = $a;
                $bad[$key] = $value;
                file_put_contents($file, json_encode($bad));
                try {
                    MaintenanceApproval::read($c, 'finalize-clean-sql-import');
                    $this->fail('Unbound waiver accepted');
                } catch (\RuntimeException $e) {
                    $this->assertSame('EXACT_LEGACY_RECOVERY_WAIVER_REQUIRED', $e->getMessage());
                }
            }
        } finally {
            unlink($file);
        }
    }
}
