<?php

declare(strict_types=1);

namespace App\Upms;

final class Schema
{
    // Explicit compatibility map. Never create, migrate, rename or seed these tables.
    public const TABLES = [
        'identity_guard' => ['id'],
        'roles' => ['code', 'name'],
        'permissions' => ['code'],
        'users' => ['id', 'login_key', 'password_hash', 'enabled', 'authorization_version', 'display_name'],
        'user_roles' => ['user_id', 'role_code'],
        'role_permissions' => ['role_code', 'permission_code'],
        'sessions' => ['token_hash', 'user_id', 'data', 'idle_expires', 'absolute_expires', 'revoked'],
        'login_attempts' => ['bucket', 'window_start', 'attempts'],
        'identity_audit_events' => ['id', 'actor_id', 'target_id', 'action', 'correlation', 'details', 'created_at'],
        'v1_control' => ['id', 'operator_id', 'state', 'next_dc', 'entry_version', 'next_item_code', 'cutover_evidence'],
        'v1_items' => ['id', 'code', 'description', 'quality', 'colour', 'packing', 'selling_price', 'active', 'version', 'remarks'],
        'v1_stock' => ['item_id', 'quantity', 'verified'],
        'v1_parties' => ['id', 'kind', 'name', 'phone', 'address', 'remarks', 'active', 'opening_verified', 'version'],
        'v1_documents' => ['id', 'kind', 'date', 'party_id', 'status', 'version', 'payload', 'official_number', 'sequence', 'total', 'corrects_id', 'actor_id', 'created_at', 'sale_subtotal', 'discount_mode', 'discount_value', 'discount_amount'],
        'v1_lines' => ['id', 'document_id', 'line_no', 'item_id', 'snapshot', 'quantity', 'rate', 'amount'],
        'v1_stock_journal' => ['id', 'document_id', 'item_id', 'delta'],
        'v1_party_journal' => ['id', 'document_id', 'party_id', 'debit', 'credit', 'particulars'],
        'v1_audit' => ['id', 'actor_id', 'action', 'reference', 'reason', 'created_at'],
        'v1_commands' => ['key', 'actor_id', 'fingerprint', 'result'],
    ];

    public static function verify(Database $db): void
    {
        foreach (self::TABLES as $table => $columns) {
            $actual = $db->rows('SELECT COLUMN_NAME FROM information_schema.COLUMNS WHERE TABLE_SCHEMA=DATABASE() AND TABLE_NAME=?', [$table]);
            if (array_diff($columns, array_column($actual, 'COLUMN_NAME'))) {
                throw new ApiError(503, 'SCHEMA_INCOMPATIBLE');
            }
            $engine = $db->one('SELECT ENGINE FROM information_schema.TABLES WHERE TABLE_SCHEMA=DATABASE() AND TABLE_NAME=?', [$table]);
            if (($engine['ENGINE'] ?? '') !== 'InnoDB') {
                throw new ApiError(503, 'SCHEMA_INCOMPATIBLE');
            }
        }
        foreach ([['v1_stock', 'quantity', 18, 0], ['v1_documents', 'total', 18, 2], ['v1_party_journal', 'debit', 18, 2], ['v1_party_journal', 'credit', 18, 2]] as [$table, $column, $precision, $scale]) {
            $row = $db->one('SELECT DATA_TYPE, NUMERIC_PRECISION, NUMERIC_SCALE FROM information_schema.COLUMNS WHERE TABLE_SCHEMA=DATABASE() AND TABLE_NAME=? AND COLUMN_NAME=?', [$table, $column]);
            if ($row['DATA_TYPE'] !== 'decimal' || (int) $row['NUMERIC_PRECISION'] !== $precision || (int) $row['NUMERIC_SCALE'] !== $scale) {
                throw new ApiError(503, 'SCHEMA_INCOMPATIBLE');
            }
        }
    }
}
