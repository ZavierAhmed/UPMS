<?php

declare(strict_types=1);

namespace Tests\Unit;

use App\Upms\ExpenseRecovery;
use App\Upms\FinancialArchive;
use PHPUnit\Framework\TestCase;

final class FinancialArchiveTest extends TestCase
{
    public function test_unknown_encrypted_version_is_rejected(): void
    {
        $key = sodium_crypto_box_keypair();
        $cipher = ExpenseRecovery::encrypt(['format' => 'UPMS_ISOLATED_FINANCIAL_ARCHIVE_V999'], sodium_crypto_box_publickey($key));
        $this->expectException(\RuntimeException::class);
        FinancialArchive::decrypt($cipher, $key);
    }

    public function test_missing_snapshot_is_rejected(): void
    {
        $key = sodium_crypto_box_keypair();
        $cipher = ExpenseRecovery::encrypt(['format' => FinancialArchive::FORMAT, 'manifest' => ['tables' => 29]], sodium_crypto_box_publickey($key));
        $this->expectException(\RuntimeException::class);
        FinancialArchive::decrypt($cipher, $key);
    }

    public function test_wrong_recipient_cannot_open_archive(): void
    {
        $key = sodium_crypto_box_keypair();
        $cipher = ExpenseRecovery::encrypt(['format' => FinancialArchive::FORMAT], sodium_crypto_box_publickey($key));
        $this->expectException(\RuntimeException::class);
        FinancialArchive::decrypt($cipher, sodium_crypto_box_keypair());
    }
}
