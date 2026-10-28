<?php

declare(strict_types=1);

namespace App\Upms;

use Brick\Math\BigInteger;

final class MasterData
{
    public function __construct(private readonly Database $db, private readonly BusinessRecords $records, private readonly BusinessCommand $commands)
    {
    }

    public function saveItem(array $user, array $control, object $input, ?string $id): array
    {
        $p = V1Input::item($input);
        $version = $p['version'] ?? null;
        $reason = $p['reason'];
        $editing = $id !== null;
        $record = $p;
        unset($record['version'], $record['reason'], $record['sellingPrice']);
        if ($control['entry_version'] === 2) {
            $price = $p['sellingPrice'] ?? null;
            $record['selling_price'] = $price === null || $price === '' ? null : V1Input::price($price, 'sellingPrice');
            if ($id === null && isset($p['code'])) {
                V1Input::field('code', 'Item codes are generated automatically.', 'ITEM_CODE_READ_ONLY');
            }
        } elseif (!isset($p['code']) || $p['code'] === '') {
            V1Input::field('code', 'Item code is required for this preserved V1 setup.');
        }
        if ($id !== null) {
            $old = $this->db->one('SELECT * FROM v1_items WHERE id=?', [$id]);
            if (!$old || $old['version'] !== $version) {
                throw new ApiError(409, 'STALE_RECORD');
            }
            if (isset($p['code']) && $old['code'] !== $p['code']) {
                V1Input::field('code', 'A saved item code cannot be changed.', 'ITEM_CODE_IMMUTABLE');
            }
            $code = $old['code'];
            unset($record['code']); // SQL grants cannot change saved identity.
            $this->records->update('v1_items', [...$record, 'version' => $version + 1], ['id' => $id]);
        } else {
            if ($control['entry_version'] === 2) {
                $next = BigInteger::of($control['next_item_code']);
                do {
                    if ($next->compareTo('999999999999') > 0) {
                        throw new ApiError(409, 'ITEM_CODE_EXHAUSTED');
                    }
                    $record['code'] = 'ITM-'.str_pad((string) $next, 4, '0', STR_PAD_LEFT);
                    $next = $next->plus(1);
                } while ($this->db->one('SELECT id FROM v1_items WHERE code=?', [$record['code']]));
                $this->records->update('v1_control', ['next_item_code' => (string) $next], ['id' => 1]);
            }
            $code = $record['code'];
            $id = $this->records->insert('v1_items', [...$record, 'version' => 1]);
            $this->records->insert('v1_stock', ['item_id' => $id, 'quantity' => '0', 'verified' => false]);
        }
        $this->commands->audit($user, 'item.saved', $id, 'Item '.($editing ? 'updated' : 'created').'; version '.($version ?? 0).' -> '.($version ? $version + 1 : 1).($reason !== '' ? '; operator note: '.$reason : ''));
        return ['id' => $id, 'code' => $code];
    }

    public function saveParty(array $user, object $input, ?string $id): array
    {
        $p = V1Input::party($input);
        $version = $p['version'] ?? null;
        $reason = $p['reason'];
        $record = $p;
        unset($record['version'], $record['reason']);
        $editing = $id !== null;
        if ($editing) {
            $old = $this->db->one('SELECT * FROM v1_parties WHERE id=?', [$id]);
            if (!$old || $old['version'] !== $version) {
                throw new ApiError(409, 'STALE_RECORD');
            }
            if ($old['kind'] !== $p['kind']) {
                throw new ApiError(400, 'PARTY_KIND_IMMUTABLE');
            }
            unset($record['kind']);
            $this->records->update('v1_parties', [...$record, 'version' => $version + 1], ['id' => $id]);
        } else {
            $id = $this->records->insert('v1_parties', [...$record, 'version' => 1, 'opening_verified' => false]);
        }
        $this->commands->audit($user, 'party.saved', $id, 'Party '.($editing ? 'updated' : 'created').'; version '.($version ?? 0).' → '.($version ? $version + 1 : 1).($reason !== '' ? '; operator note: '.$reason : ''));
        return ['id' => $id];
    }
}
