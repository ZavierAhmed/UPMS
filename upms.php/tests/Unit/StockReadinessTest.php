<?php

declare(strict_types=1);

namespace Tests\Unit;

use App\Upms\{ApiError,Database,StockReadiness};
use PHPUnit\Framework\Attributes\DataProvider;
use PHPUnit\Framework\TestCase;

final class StockReadinessTest extends TestCase
{
    public static function invalidQueries(): array
    {
        return [[['date' => '2026-02-30','items' => '1']], [['date' => '2026-11-03','items' => '1 OR 1=1']], [['date' => '2026-11-03','items' => '0']], [['date' => '2026-11-03','items' => '1','unexpected' => 'yes']], [['date' => ['2026-11-03'],'items' => '1']], [['date' => '2026-11-03','items' => implode(',', range(1, 201))]]];
    }

    #[DataProvider('invalidQueries')]
    public function test_invalid_guidance_queries_are_rejected_before_database_access(array $query): void
    {
        try {
            (new StockReadiness(new Database()))->query($query);
            self::fail('Invalid guidance input accepted');
        } catch (ApiError $e) {
            self::assertSame('INVALID_INPUT', $e->apiCode);
            self::assertSame(400, $e->status);
        }
    }
}
