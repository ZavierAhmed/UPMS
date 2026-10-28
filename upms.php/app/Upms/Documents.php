<?php

declare(strict_types=1);

namespace App\Upms;

use Brick\Math\BigInteger;

final class Documents
{
    public const KINDS = ['STOCK_OPENING', 'CLIENT_OPENING', 'VENDOR_OPENING', 'PRODUCTION', 'PURCHASE', 'CHALLAN', 'CHALLAN_RETURN', 'CLIENT_PAYMENT', 'VENDOR_PAYMENT', 'PAYMENT_REVERSAL', 'STOCK_CORRECTION', 'OPENING_CORRECTION', 'EXPENSE'];

    public function __construct(private readonly Database $db, private readonly BusinessRecords $records, private readonly BusinessCommand $commands)
    {
    }

    public static function supported(mixed $kind): void
    {
        if (! in_array($kind, self::KINDS, true)) {
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
        if ($p['kind'] === 'CHALLAN_RETURN') {
            $p = (new ChallanReturns($this->db, $this->records))->prepare($p);
        }
        $subtotal = BigInteger::zero();
        foreach ($p['lines'] as $i => &$line) {
            if ($p['kind'] === 'CHALLAN_RETURN') {
                continue;
            }
            $item = $this->db->one('SELECT * FROM v1_items WHERE id=?', [$line['itemId']]);
            if (! $item) {
                throw new ApiError(400, 'ACTIVE_BOTTLE_REQUIRED');
            }
            if ($control['entry_version'] === 2) {
                try {
                    Exact::integer($line['quantity'], signed: $p['kind'] === 'STOCK_CORRECTION', zero: $p['kind'] === 'STOCK_OPENING');
                } catch (ApiError) {
                    V1Input::field('lines.'.$i.'.quantity', 'Please enter a valid whole-bottle quantity.');
                }
                if ($p['kind'] === 'CHALLAN') {
                    if (! BusinessCommand::truthy($item['selling_price'])) {
                        V1Input::field('lines.'.$i.'.itemId', 'Price not set. Set an approved selling price in Item Management.', 'PRICE_NOT_SET');
                    }
                    $rate = V1Input::cents($line['rate'], 'lines.'.$i.'.rate');
                    if (isset($line['reviewedItemVersion']) && $line['reviewedItemVersion'] !== $item['version']) {
                        V1Input::field('lines.'.$i.'.rate', 'Item details changed. Review current item details and save again.', 'PRICE_CHANGED');
                    }
                    $line['pricingVersion'] = $item['version'];
                    $line['defaultRateSnapshot'] = $item['selling_price'];
                    $line['rateSource'] = $rate->compareTo(V1Input::cents($item['selling_price'], 'lines.'.$i.'.rate')) === 0 ? 'ITEM_DEFAULT' : 'CUSTOM';
                    $subtotal = $subtotal->plus(Exact::integer($line['quantity'])->multipliedBy($rate));
                }
            }
            $line['expectedVersion'] = $item['version'];
            $line['snapshot'] = ['code' => $item['code'], 'description' => $item['description'], 'quality' => $item['quality'], 'colour' => $item['colour'], 'packing' => $item['packing']];
        }
        unset($line);
        if ($control['entry_version'] === 2) {
            $p['entryVersion'] = 2;
            if ($p['kind'] === 'CHALLAN') {
                $p['discountSummary'] = Pricing::discount($subtotal, $p['discountMode'], $p['discountValue'], allowZero: true);
            }
        }
        $p = ReversalIdentity::derive($this->db, $p);
        if ($p['partyId'] && ! in_array($p['kind'], ['CHALLAN_RETURN', 'PAYMENT_REVERSAL'], true)) {
            $party = $this->db->one('SELECT * FROM v1_parties WHERE id=?', [$p['partyId']]);
            if (! $party) {
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
            if (! $old || $old['status'] !== 'DRAFT') {
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

    public function post(array $user, array $control, object $input, string $id): array
    {
        $parsed = V1Input::posting($input);
        $d = $this->db->one('SELECT * FROM v1_documents WHERE id=?', [$id]);
        if (! $d) {
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
        if ($p['kind'] === 'CHALLAN_RETURN') {
            return (new ChallanReturns($this->db, $this->records))->post($user, $d, $p);
        }
        if ($p['kind'] === 'CHALLAN' && ! ($p['time'] === '' || preg_match('/^(?:[01]\d|2[0-3]):[0-5]\d$/D', $p['time']))) {
            V1Input::field('time', 'Choose a valid local time in HH:mm format.', 'INVALID_LOCAL_TIME');
        }
        V1Input::uniqueLines($p['lines']);
        $party = null;
        $total = BigInteger::zero();
        $discount = null;
        if (in_array($p['kind'], ['PURCHASE', 'CHALLAN', 'CLIENT_OPENING', 'VENDOR_OPENING', 'CLIENT_PAYMENT', 'VENDOR_PAYMENT', 'OPENING_CORRECTION'], true)) {
            $party = $this->db->one('SELECT * FROM v1_parties WHERE id=? AND active=1', [$p['partyId']]);
            if (! $party) {
                V1Input::field('partyId', 'Please select an active client or vendor.', 'ACTIVE_PARTY_REQUIRED');
            }
            if ($party['kind'] !== (in_array($p['kind'], ['CHALLAN', 'CLIENT_OPENING', 'CLIENT_PAYMENT'], true) ? 'CLIENT' : ($p['kind'] === 'OPENING_CORRECTION' ? $party['kind'] : 'VENDOR'))) {
                throw new ApiError(400, 'PARTY_KIND_MISMATCH');
            }
            if (isset($p['partySnapshot']) && $party['version'] !== $p['partySnapshot']['version']) {
                throw new ApiError(409, 'PARTY_CHANGED_REVIEW_DRAFT');
            }
        }
        if (in_array($p['kind'], ['PURCHASE', 'CLIENT_PAYMENT', 'VENDOR_PAYMENT'], true)) {
            $reference = mb_strtolower(V1Input::trim($p['reference'] !== '' ? $p['reference'] : $p['chequeReference']));
            if ($reference === '' && $p['kind'] === 'PURCHASE') {
                throw new ApiError(400, 'TRANSACTION_REFERENCE_REQUIRED');
            }
            foreach ($this->db->rows("SELECT payload FROM v1_documents WHERE kind=? AND party_id=? AND status='POSTED'", [$p['kind'], $p['partyId']]) as $row) {
                $old = SimpleV1::payload($row);
                $oldReference = BusinessCommand::truthy($old['reference'] ?? '') ? $old['reference'] : ($old['chequeReference'] ?? '');
                if (($reference !== '' && mb_strtolower(V1Input::trim($oldReference)) === $reference) || (($p['method'] ?? '') === 'CHEQUE_RECEIVED' && BusinessCommand::truthy($p['chequeReference']) && ($old['method'] ?? '') === 'CHEQUE_RECEIVED' && mb_strtolower(V1Input::trim($old['chequeReference'])) === mb_strtolower(V1Input::trim($p['chequeReference'])))) {
                    throw new ApiError(409, 'DUPLICATE_TRANSACTION_REFERENCE');
                }
            }
        }
        if (in_array($p['kind'], ['STOCK_OPENING', 'PRODUCTION', 'PURCHASE', 'CHALLAN', 'STOCK_CORRECTION'], true)) {
            $total = (new StockPosting($this->db, $this->records))->apply($d, $p, $control);
        } elseif ($p['lines']) {
            throw new ApiError(400, 'UNEXPECTED_BOTTLE_LINES');
        }
        if (in_array($p['kind'], ['CLIENT_OPENING', 'VENDOR_OPENING'], true)) {
            if ($party['opening_verified']) {
                throw new ApiError(409, 'DUPLICATE_PARTY_OPENING');
            }
            if (empty($p['direction'])) {
                throw new ApiError(400, 'OPENING_DIRECTION_REQUIRED');
            }
            $total = Exact::cents($p['amount'], zero: true);
            $this->records->insert('v1_party_journal', ['document_id' => $d['id'], 'party_id' => $party['id'], 'debit' => $p['direction'] === 'OWED_TO_COMPANY' ? Exact::money($total) : '0.00', 'credit' => $p['direction'] === 'OWED_BY_COMPANY' ? Exact::money($total) : '0.00', 'particulars' => 'Explicit '.strtolower($party['kind']).' opening']);
            $this->records->update('v1_parties', ['opening_verified' => true], ['id' => $party['id']]);
        } elseif (in_array($p['kind'], ['CHALLAN', 'PURCHASE', 'CLIENT_PAYMENT', 'VENDOR_PAYMENT'], true)) {
            if (! $party['opening_verified']) {
                throw new ApiError(409, 'PARTY_OPENING_UNVERIFIED');
            }
            $opening = $this->db->one("SELECT date FROM v1_documents WHERE party_id=? AND status='POSTED' AND kind IN ('CLIENT_OPENING','VENDOR_OPENING') LIMIT 1", [$party['id']]);
            if (! $opening || $p['date'] < $opening['date']) {
                throw new ApiError(400, 'DATE_PRECEDES_OPENING');
            }
            if ($p['kind'] === 'CHALLAN') {
                if ($control['entry_version'] === 2) {
                    $discount = Pricing::discount($total, $p['discountMode'], $p['discountValue']);
                    if (BusinessCommand::json($p['discountSummary'] ?? null) !== BusinessCommand::json($discount)) {
                        V1Input::field('discountValue', 'Review and save this draft with its current subtotal and discount.', 'DISCOUNT_REVIEW_REQUIRED');
                    }
                    $total = Exact::cents($discount['total']);
                }
                $this->journal($d, $party, Exact::money($total), '0.00', 'Delivery challan sale');
            } elseif ($p['kind'] === 'PURCHASE') {
                $this->journal($d, $party, $p['paidImmediately'] ? Exact::money($total) : '0.00', Exact::money($total), $p['paidImmediately'] ? 'Bottle purchase paid immediately; method reference only' : 'Bottle purchase payable');
                if ($p['paidImmediately'] && (! isset($p['method']) || $p['method'] === 'CHEQUE_RECEIVED' || $p['reference'] === '')) {
                    throw new ApiError(400, 'IMMEDIATE_PAYMENT_METHOD_AND_REFERENCE_REQUIRED');
                }
            }
            if (in_array($p['kind'], ['CLIENT_PAYMENT', 'VENDOR_PAYMENT'], true)) {
                $total = Exact::cents($p['amount']);
                if (empty($p['method']) || ($p['kind'] === 'VENDOR_PAYMENT' && $p['method'] === 'CHEQUE_RECEIVED')) {
                    throw new ApiError(400, 'PAYMENT_METHOD_REQUIRED');
                }
                if ($p['method'] === 'CHEQUE_RECEIVED' && $p['chequeReference'] === '') {
                    throw new ApiError(400, 'CHEQUE_REFERENCE_REQUIRED');
                }
                $this->journal($d, $party, $p['kind'] === 'VENDOR_PAYMENT' ? Exact::money($total) : '0.00', $p['kind'] === 'CLIENT_PAYMENT' ? Exact::money($total) : '0.00', ($p['kind'] === 'CLIENT_PAYMENT' ? 'Amount received · ' : 'Amount paid · ').$p['method']);
            }
        } elseif ($p['kind'] === 'EXPENSE') {
            if ($p['category'] === '' || $p['description'] === '' || $p['payee'] === '' || $p['reference'] === '' || ($p['paymentStatus'] ?? null) !== 'PAID' || ! in_array($p['method'] ?? null, ['CASH', 'BANK_TRANSFER'], true) || $p['partyId'] !== null) {
                throw new ApiError(400, 'PAID_EXPENSE_DETAILS_REQUIRED');
            }
            $total = Exact::cents($p['amount']);
        } elseif ($p['kind'] === 'PAYMENT_REVERSAL') {
            $p = ReversalIdentity::derive($this->db, $p);
            $source = $this->db->one("SELECT * FROM v1_documents WHERE id=? AND status='POSTED'", [$p['correctsId'] ?? null]);
            if (! $source || ! in_array($source['kind'], ['CLIENT_PAYMENT', 'VENDOR_PAYMENT'], true) || $p['date'] < $source['date']) {
                throw new ApiError(400, 'INVALID_PAYMENT_REVERSAL');
            }
            if ($source['kind'] === 'CLIENT_PAYMENT' && (SimpleV1::payload($source)['method'] ?? null) !== 'CHEQUE_RECEIVED') {
                throw new ApiError(400, 'ONLY_CHEQUE_DISHONOUR_SUPPORTED');
            }
            $party = $this->db->one('SELECT * FROM v1_parties WHERE id=?', [$source['party_id']]);
            $total = Exact::cents($source['total']);
            $this->journal($d, $party, $source['kind'] === 'CLIENT_PAYMENT' ? Exact::money($total) : '0.00', $source['kind'] === 'VENDOR_PAYMENT' ? Exact::money($total) : '0.00', 'Traceable payment reversal');
        } elseif ($p['kind'] === 'STOCK_CORRECTION') {
            $source = $this->db->one("SELECT * FROM v1_documents WHERE id=? AND status='POSTED'", [$p['correctsId'] ?? null]);
            if (! $source || ! in_array($source['kind'], ['STOCK_OPENING', 'PRODUCTION', 'STOCK_CORRECTION'], true) || $p['date'] < $source['date']) {
                throw new ApiError(400, 'ONLY_NONFINANCIAL_STOCK_CORRECTION_SUPPORTED');
            }
            $allowed = array_column($this->db->rows('SELECT item_id FROM v1_lines WHERE document_id=?', [$source['id']]), 'item_id');
            foreach ($p['lines'] as $line) {
                if (! in_array($line['itemId'], $allowed, true)) {
                    throw new ApiError(400, 'CORRECTION_ITEM_MISMATCH');
                }
            }
        } elseif ($p['kind'] === 'OPENING_CORRECTION') {
            $source = $this->db->one("SELECT * FROM v1_documents WHERE id=? AND party_id=? AND status='POSTED'", [$p['correctsId'] ?? null, $party['id']]);
            if (! $source || ! in_array($source['kind'], ['CLIENT_OPENING', 'VENDOR_OPENING', 'OPENING_CORRECTION'], true) || empty($p['direction']) || $p['date'] < $source['date']) {
                throw new ApiError(400, 'INVALID_OPENING_CORRECTION');
            }
            if ($this->db->one("SELECT id FROM v1_documents WHERE party_id=? AND status='POSTED' AND kind NOT IN ('CLIENT_OPENING','VENDOR_OPENING','OPENING_CORRECTION') LIMIT 1", [$party['id']])) {
                throw new ApiError(409, 'OPENING_CORRECTION_AFTER_ACTIVITY_BLOCKED');
            }
            $balance = BigInteger::zero();
            foreach ($this->db->rows('SELECT debit,credit FROM v1_party_journal WHERE party_id=?', [$party['id']]) as $row) {
                $balance = $balance->plus(Exact::cents($row['debit'], zero: true))->minus(Exact::cents($row['credit'], zero: true));
            }
            $total = Exact::cents($p['amount'], zero: true);
            $delta = ($p['direction'] === 'OWED_TO_COMPANY' ? $total : $total->negated())->minus($balance);
            $this->journal($d, $party, $delta->isPositive() ? Exact::money($delta) : '0.00', $delta->isNegative() ? Exact::money($delta->negated()) : '0.00', 'Reviewed replacement opening; prior evidence retained');
        }
        $number = in_array($p['kind'], ['CLIENT_PAYMENT', 'VENDOR_PAYMENT'], true) ? SimpleV1::paymentNumber($p['kind'], (string) $d['id']) : null;
        $numbering = [];
        if ($number !== null) {
            $numbering = ['official_number' => $number];
        }
        if ($p['kind'] === 'CHALLAN') {
            $number = SimpleV1::dcNumber($control['next_dc']);
            $numbering = ['official_number' => $number, 'sequence' => $control['next_dc']];
            $this->records->update('v1_control', ['next_dc' => $control['next_dc'] + 1], ['id' => 1]);
        }
        $discountFields = $discount === null ? [] : ['sale_subtotal' => $discount['subtotal'], 'discount_mode' => $discount['mode'], 'discount_value' => $discount['value'], 'discount_amount' => $discount['amount']];
        $this->records->update('v1_documents', ['status' => 'POSTED', 'total' => Exact::money($total), ...($p['kind'] === 'PAYMENT_REVERSAL' ? ['payload' => BusinessCommand::json($p)] : []), ...$discountFields, 'party_id' => $party['id'] ?? null, ...$numbering, 'corrects_id' => $p['correctsId'] ?? null], ['id' => $d['id'], 'version' => $d['version'], 'status' => 'DRAFT']);
        $this->commands->audit($user, 'document.posted', $number ?? (string) $d['id'], $p['reason']);

        return ['id' => (string) $d['id'], 'status' => 'POSTED', 'official_number' => $number, 'total' => Exact::money($total)];
    }

    private function journal(array $document, array $party, string $debit, string $credit, string $particulars): void
    {
        $this->records->insert('v1_party_journal', ['document_id' => $document['id'], 'party_id' => $party['id'], 'debit' => $debit, 'credit' => $credit, 'particulars' => $particulars]);
    }

    public function cancel(array $user, object $input, string $id): array
    {
        $p = V1Input::cancellation($input);
        $d = $this->db->one('SELECT * FROM v1_documents WHERE id=?', [$id]);
        if (! $d || $d['status'] !== 'DRAFT' || $d['version'] !== $p['version']) {
            throw new ApiError(409, 'IMMUTABLE_OR_STALE_DOCUMENT');
        }
        self::supported($d['kind']);
        $this->records->update('v1_documents', ['status' => 'CANCELLED'], ['id' => $id, 'status' => 'DRAFT']);
        $this->commands->audit($user, 'draft.cancelled', $id, $p['reason']);

        return ['id' => $id, 'status' => 'CANCELLED'];
    }
}
