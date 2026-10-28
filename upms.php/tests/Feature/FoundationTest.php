<?php

declare(strict_types=1);

namespace Tests\Feature;

use Tests\TestCase;

final class FoundationTest extends TestCase
{
    public function test_disabled_foundation_serves_liveness_and_fails_readiness_without_connecting(): void
    {
        config(['upms.enabled' => false, 'upms.host' => 'unreachable.invalid', 'upms.database' => 'upms']);
        $this->get('/healthz')->assertOk()->assertExactJson(['status' => 'ok']);
        $this->get('/readyz')->assertStatus(503)->assertExactJson(['status' => 'unavailable']);
    }
}
