<?php

declare(strict_types=1);

namespace Tests\Unit;

use App\Upms\ApiError;
use App\Upms\V1Input;
use PHPUnit\Framework\TestCase;

final class ExpenseInputTest extends TestCase
{
    public function test_expense_and_report_validation_match_node_defaults_types_and_errors(): void
    {
        foreach (json_decode(file_get_contents(__DIR__.'/../php6-input-fixtures.json'), false, flags: JSON_THROW_ON_ERROR) as $fixture) {
            try {
                $actual = $fixture->operation === 'filters'
                    ? V1Input::reportFilters(array_filter((array) $fixture->input, fn ($v) => $v !== ''))
                    : V1Input::document($fixture->input);
                self::assertTrue(property_exists($fixture, 'result'));
                self::assertEquals($fixture->result, (object) $actual);
            } catch (ApiError $error) {
                self::assertSame('INVALID_INPUT', $error->apiCode);
                self::assertSame((array) $fixture->fields, $error->fieldErrors);
            }
        }
    }
}
