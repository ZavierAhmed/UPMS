<?php

declare(strict_types=1);

namespace App\Upms;

use Brick\Math\BigInteger;

final class Openings
{
    public const KINDS = ['STOCK_OPENING', 'CLIENT_OPENING', 'VENDOR_OPENING'];

    public function __construct(private readonly Database $db, private readonly BusinessRecords $records, private readonly BusinessCommand $commands)
    {
    }

    public static function supported(mixed $kind): void
    {
        if (!in_array($kind, self::KINDS, true)) {
            throw new ApiError(501, 'PHP_WRITE_MODULE_PENDING_REVIEW');
        }
    }

    public function scope(object $input, ?string $id): void
    {
        if (isset($input->kind) && is_string($input->kind) && isset(SimpleV1::EVENTS[$input->kind])) {
            self::supported($input->kind);
        }
        if ($id !== null) {
            $stored = $this->db->one('SELECT kind FROM v1_documents WHERE id=?', [$id]);
            if ($stored) {
                self::supported($stored['kind']);
            }
        }
    }

    public function draft(array $user, array $control, object $input, ?string $id): array
    {
        // Version is intentionally outside documentInput, just as in Express.
        $version = $input->version ?? null;
        if (is_float($version) && floor($version) === $version && abs($version) <= 9007199254740991) {
            $version = (int) $version;
        }
        $raw = clone $input;
        unset($raw->version);
        $p = V1Input::document($raw);
        self::supported($p['kind']);
        V1Input::uniqueLines($p['lines']);
        foreach ($p['lines'] as $i => &$line) {
            $item = $this->db->one('SELECT * FROM v1_items WHERE id=?', [$line['itemId']]);
            if (!$item) {
                throw new ApiError(400, 'ACTIVE_BOTTLE_REQUIRED');
            }
            if ($control['entry_version'] === 2) {
                try {
                    Exact::integer($line['quantity'], zero: $p['kind'] === 'STOCK_OPENING');
                } catch (ApiError) {
                    V1Input::field('lines.'.$i.'.quantity', 'Please enter a valid whole-bottle quantity.');
                }
            }
            $line['expectedVersion'] = $item['version'];
            $line['snapshot'] = ['code' => $item['code'], 'description' => $item['description'], 'quality' => $item['quality'], 'colour' => $item['colour'], 'packing' => $item['packing']];
        }
        unset($line);
        if ($control['entry_version'] === 2) {
            $p['entryVersion'] = 2;
        }
        if ($p['partyId']) {
            $party = $this->db->one('SELECT * FROM v1_parties WHERE id=?', [$p['partyId']]);
            if (!$party) {
                V1Input::field('partyId', 'Please select an active client or vendor.', 'ACTIVE_PARTY_REQUIRED');
            }
            $p['partySnapshot'] = ['id' => (string) $party['id'], 'name' => $party['name'], 'address' => $party['address'], 'kind' => $party['kind'], 'version' => $party['version']];
        }
        if ($p['date'] > SimpleV1::today()) {
            throw new ApiError(400, 'FUTURE_DATE_NOT_ALLOWED');
        }
        $editing = $id !== null;
        if ($editing) {
            $old = $this->db->one('SELECT * FROM v1_documents WHERE id=?', [$id]);
            if (!$old || $old['status'] !== 'DRAFT') {
                throw new ApiError(409, 'IMMUTABLE_DOCUMENT');
            }
            self::supported($old['kind']); // Never convert a stored later-milestone draft.
            if ($old['version'] !== $version) {
                throw new ApiError(409, 'STALE_DOCUMENT');
            }
            $this->records->update('v1_documents', ['kind' => $p['kind'], 'date' => $p['date'], 'party_id' => $p['partyId'], 'payload' => BusinessCommand::json($p), 'version' => $version + 1], ['id' => $id, 'status' => 'DRAFT']);
        } else {
            $id = $this->records->insert('v1_documents', ['kind' => $p['kind'], 'date' => $p['date'], 'party_id' => $p['partyId'], 'status' => 'DRAFT', 'version' => 1, 'payload' => BusinessCommand::json($p), 'actor_id' => $user['id'], 'created_at' => BusinessCommand::timestamp()]);
        }
        $truthy = BusinessCommand::truthy($version);
        $before = self::jsString($truthy ? $version : 0);
        $after = $truthy ? (is_string($version) ? $version.'1' : (is_int($version) || is_float($version) || is_bool($version) ? self::jsString($version + 1) : self::jsString($version).'1')) : '1';
        $this->commands->audit($user, 'draft.saved', $id, 'Draft saved; version '.$before.' → '.$after.($p['reason'] !== '' ? '; operator note: '.$p['reason'] : ''));
        return ['id' => $id];
    }

    private static function jsString(mixed $value): string
    {
        return match (true) {
            $value === true => 'true', $value === false => 'false', $value === null => 'null',
            is_object($value) => '[object Object]', is_array($value) => implode(',', array_map(fn ($v) => $v === null ? '' : self::jsString($v), $value)),
            default => (string) $value,
        };
    }

    public function post(array $user, object $input, string $id): array
    {
        $parsed = V1Input::posting($input);
        $d = $this->db->one('SELECT * FROM v1_documents WHERE id=?', [$id]);
        if (!$d) {
            throw new ApiError(404, 'NOT_FOUND');
        }
        if ($d['version'] !== $parsed['version']) {
            throw new ApiError(409, 'STALE_DOCUMENT');
        }
        self::supported($d['kind']);
        if ($d['status'] !== 'DRAFT') {
            throw new ApiError(409, 'IMMUTABLE_DOCUMENT');
        }
        $p = SimpleV1::payload($d);
        if ($p['date'] > SimpleV1::today()) {
            throw new ApiError(400, 'FUTURE_DATE_NOT_ALLOWED');
        }
        V1Input::uniqueLines($p['lines']);
        $party = null;
        $total = BigInteger::zero();
        if ($p['kind'] === 'STOCK_OPENING') {
            if (!$p['lines']) {
                throw new ApiError(400, 'BOTTLE_LINES_REQUIRED');
            }
            if (count($p['lines']) !== 1) {
                throw new ApiError(400, 'ONE_ITEM_OPENING_REQUIRED');
            }
            $line = $p['lines'][0];
            $item = $this->db->one('SELECT * FROM v1_items WHERE id=? AND active=1', [$line['itemId']]);
            if (!$item) {
                throw new ApiError(400, 'ACTIVE_BOTTLE_REQUIRED');
            }
            if (!empty($line['expectedVersion']) && $item['version'] !== $line['expectedVersion']) {
                throw new ApiError(409, 'BOTTLE_CHANGED_REVIEW_DRAFT');
            }
            $quantity = Exact::integer($line['quantity'], zero: true);
            $stock = $this->db->one('SELECT * FROM v1_stock WHERE item_id=? FOR UPDATE', [$item['id']]);
            if (!$stock) {
                throw new ApiError(409, 'STOCK_PROJECTION_MISSING');
            }
            if ($stock['verified']) {
                throw new ApiError(409, 'DUPLICATE_STOCK_OPENING');
            }
            $this->records->update('v1_stock', ['verified' => true], ['item_id' => $item['id']]);
            $sum = BigInteger::zero();
            foreach ($this->db->rows('SELECT delta FROM v1_stock_journal WHERE item_id=?', [$item['id']]) as $j) {
                $sum = $sum->plus(Exact::integer($j['delta'], signed: true));
            }
            if ($sum->compareTo($stock['quantity']) !== 0) {
                throw new ApiError(409, 'STOCK_RECONCILIATION_REQUIRED');
            }
            $next = Exact::integer($stock['quantity'], zero: true)->plus($quantity);
            Exact::integer((string) $next, zero: true);
            $this->records->update('v1_stock', ['quantity' => (string) $next], ['item_id' => $item['id']]);
            $this->records->insert('v1_stock_journal', ['document_id' => $d['id'], 'item_id' => $item['id'], 'delta' => (string) $quantity]);
            $this->records->insert('v1_lines', ['document_id' => $d['id'], 'line_no' => 1, 'item_id' => $item['id'], 'snapshot' => BusinessCommand::json(['description' => $item['description'], 'quality' => $item['quality'], 'colour' => $item['colour'], 'packing' => $item['packing'], 'code' => $item['code']]), 'quantity' => (string) $quantity, 'rate' => '0.00', 'amount' => '0.00']);
        } else {
            $party = $this->db->one('SELECT * FROM v1_parties WHERE id=? AND active=1', [$p['partyId']]);
            if (!$party) {
                V1Input::field('partyId', 'Please select an active client or vendor.', 'ACTIVE_PARTY_REQUIRED');
            }
            if ($party['kind'] !== ($p['kind'] === 'CLIENT_OPENING' ? 'CLIENT' : 'VENDOR')) {
                throw new ApiError(400, 'PARTY_KIND_MISMATCH');
            }
            if (isset($p['partySnapshot']) && $party['version'] !== $p['partySnapshot']['version']) {
                throw new ApiError(409, 'PARTY_CHANGED_REVIEW_DRAFT');
            }
            if ($p['lines']) {
                throw new ApiError(400, 'UNEXPECTED_BOTTLE_LINES');
            }
            if ($party['opening_verified']) {
                throw new ApiError(409, 'DUPLICATE_PARTY_OPENING');
            }
            if (empty($p['direction'])) {
                throw new ApiError(400, 'OPENING_DIRECTION_REQUIRED');
            }
            $total = Exact::cents($p['amount'], zero: true);
            $this->records->insert('v1_party_journal', ['document_id' => $d['id'], 'party_id' => $party['id'], 'debit' => $p['direction'] === 'OWED_TO_COMPANY' ? Exact::money($total) : '0.00', 'credit' => $p['direction'] === 'OWED_BY_COMPANY' ? Exact::money($total) : '0.00', 'particulars' => 'Explicit '.strtolower($party['kind']).' opening']);
            $this->records->update('v1_parties', ['opening_verified' => true], ['id' => $party['id']]);
        }
        $this->records->update('v1_documents', ['status' => 'POSTED', 'total' => Exact::money($total), 'party_id' => $party['id'] ?? null, 'corrects_id' => $p['correctsId'] ?? null], ['id' => $d['id'], 'version' => $d['version'], 'status' => 'DRAFT']);
        $this->commands->audit($user, 'document.posted', (string) $d['id'], $p['reason']);
        return ['id' => (string) $d['id'], 'status' => 'POSTED', 'official_number' => null, 'total' => Exact::money($total)];
    }
}
