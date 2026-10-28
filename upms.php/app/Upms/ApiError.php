<?php

declare(strict_types=1);

namespace App\Upms;

final class ApiError extends \RuntimeException
{
    public function __construct(public readonly int $status, public readonly string $apiCode, public readonly ?array $fieldErrors = null, public readonly ?string $publicMessage = null, public readonly bool $entry = true)
    {
        parent::__construct($apiCode);
    }
}
