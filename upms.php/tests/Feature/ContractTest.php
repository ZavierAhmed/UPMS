<?php

declare(strict_types=1);

namespace Tests\Feature;

use App\Upms\Database;
use App\Upms\Identity;
use PHPUnit\Framework\Attributes\DataProvider;
use Tests\TestCase;

final class ContractTest extends TestCase
{
    public static function contracts(): array
    {
        $path = __DIR__.'/../../../tmp/php-runtime/contracts.json';
        if (!is_file($path)) {
            throw new \RuntimeException('Generate isolated fixtures with scripts/php-migration-fixtures.mjs first.');
        }
        $result = [];
        foreach (json_decode(file_get_contents($path))->contracts as $contract) {
            $result[$contract->path] = [(array) $contract];
        }
        return $result;
    }

    #[DataProvider('contracts')]
    public function test_express_json_and_status_contract(array $contract): void
    {
        $db = app(Database::class);
        $identity = app(Identity::class);
        $created = $db->transaction(fn () => $identity->create($identity->user('1')));
        $response = $this->call('GET', config('upms.origin').'/api/v1/management/simple-v1/'.$contract['path'], [], [config('upms.cookie') => $created['token']], [], ['HTTPS' => 'on']);
        self::assertSame($contract['status'], $response->status(), $response->getContent());
        $actual = json_decode($response->getContent());
        if (isset($actual->error)) {
            unset($actual->error->reference);
        }
        self::assertSame(self::canonical($contract['body']), self::canonical($actual));
        $response->assertHeader('Cache-Control', 'no-store, private');
    }

    private static function canonical(mixed $value): mixed
    {
        if (is_object($value)) {
            $properties = get_object_vars($value);
            ksort($properties);
            return ['object', array_map(self::canonical(...), $properties)];
        }
        return is_array($value) ? ['array', array_map(self::canonical(...), $value)] : $value;
    }
}
