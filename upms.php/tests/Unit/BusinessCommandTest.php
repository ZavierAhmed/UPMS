<?php

declare(strict_types=1);

namespace Tests\Unit;

use App\Upms\ApiError;
use App\Upms\BusinessCommand;
use PHPUnit\Framework\Attributes\DataProvider;
use PHPUnit\Framework\TestCase;

final class BusinessCommandTest extends TestCase
{
    public static function nodeVectors(): array
    {
        $cases = [];
        foreach (json_decode(file_get_contents(__DIR__.'/../fixtures/php2-canonical.json'), true) as $fixture) {
            $cases[$fixture['name']] = [$fixture];
        }
        return $cases;
    }

    #[DataProvider('nodeVectors')]
    public function test_canonical_bytes_and_sha256_match_express(array $fixture): void
    {
        $value = json_decode($fixture['raw'], false, 512, JSON_THROW_ON_ERROR);
        if (isset($fixture['error'])) {
            try {
                BusinessCommand::canonical($value);
                self::fail('Unsafe numeric metadata accepted');
            } catch (ApiError $error) {
                self::assertSame($fixture['error'], $error->apiCode);
            }
        } else {
            $canonical = BusinessCommand::canonical($value);
            self::assertSame($fixture['canonical'], $canonical);
            self::assertSame($fixture['fingerprint'], hash('sha256', $canonical));
        }
    }
}
