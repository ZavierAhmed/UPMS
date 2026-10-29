<?php

declare(strict_types=1);

return [
    // Default synthetic profile; verified private production configuration is separate.
    'enabled' => env('UPMS_ENABLED', false),
    'production_profile' => env('UPMS_PRODUCTION_PROFILE'),
    'host' => env('UPMS_DB_HOST'),
    'port' => env('UPMS_DB_PORT'),
    'database' => env('UPMS_DB_DATABASE'),
    'username' => env('UPMS_DB_USERNAME'),
    'password' => env('UPMS_DB_PASSWORD'),
    'origin' => env('UPMS_ORIGIN'),
    // Explicit schema-bound admin/haris ID map; absent retains the legacy single-operator policy.
    'designated_operators' => env('UPMS_DESIGNATED_OPERATORS'),
    'cookie' => '__Host-upms-php',
    'idle_ms' => 1800000,
    'absolute_ms' => 28800000,
    'dummy_hash' => '$argon2id$v=19$m=19456,p=1,t=2$wGV+C5duz5NqF4bPOntXjQ$RmxgNx8dmbUtvgrGuCIQroKIxwwSmx78Eh6tiZ5VuZA',
];
