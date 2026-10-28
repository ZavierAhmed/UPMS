<?php

declare(strict_types=1);

namespace App\Upms;

use Brick\Math\BigInteger;

/** Runs only inside BusinessCommand's existing identity_guard transaction. */
final class StockPosting
{
    public function __construct(private readonly Database $db, private readonly BusinessRecords $records)
    {
    }

    public static function orderedIds(array $ids): array
    {
        usort($ids, fn ($a, $b) => BigInteger::of((string) $a)->compareTo((string) $b));
        return $ids;
    }

    public function apply(array $document, array $payload, array $control): BigInteger
    {
        $kind = $payload['kind'];
        if (!$payload['lines']) {
            throw new ApiError(400, 'BOTTLE_LINES_REQUIRED');
        }
        if ($kind === 'STOCK_OPENING' && count($payload['lines']) !== 1) {
            throw new ApiError(400, 'ONE_ITEM_OPENING_REQUIRED');
        }
        $total = BigInteger::zero();
        $changes = $lines = [];
        foreach ($payload['lines'] as $index => $line) {
            $item = $this->db->one('SELECT * FROM v1_items WHERE id=? AND active=1', [$line['itemId']]);
            if (!$item) {
                throw new ApiError(400, 'ACTIVE_BOTTLE_REQUIRED');
            }
            if (!empty($line['expectedVersion']) && $item['version'] !== $line['expectedVersion']) {
                throw new ApiError(409, 'BOTTLE_CHANGED_REVIEW_DRAFT');
            }
            $quantity = Exact::integer($line['quantity'], zero: $kind === 'STOCK_OPENING');
            if ($control['entry_version'] === 2 && $kind === 'CHALLAN') {
                if (!BusinessCommand::truthy($item['selling_price'])) {
                    V1Input::field('lines.'.$index.'.itemId', 'Price not set. Set an approved selling price in Item Management before posting.', 'PRICE_NOT_SET');
                }
                if (empty($line['pricingVersion']) || $line['pricingVersion'] !== $item['version'] || V1Input::cents($line['rate'], 'lines.'.$index.'.rate')->compareTo(V1Input::cents($item['selling_price'], 'lines.'.$index.'.rate')) !== 0) {
                    V1Input::field('lines.'.$index.'.rate', 'Price changed. Edit the draft and explicitly refresh pricing.', 'PRICE_CHANGED');
                }
            }
            $rate = in_array($kind, ['PURCHASE', 'CHALLAN'], true) ? Exact::cents($line['rate'], zero: !($control['entry_version'] === 2 && $kind === 'CHALLAN')) : BigInteger::zero();
            $amount = $quantity->multipliedBy($rate);
            $total = $total->plus($amount);
            Exact::money($total);
            $id = (string) $item['id'];
            $delta = $kind === 'CHALLAN' ? $quantity->negated() : $quantity;
            $changes[$id] = ($changes[$id] ?? BigInteger::zero())->plus($delta);
            $lines[] = ['document_id' => $document['id'], 'line_no' => $index + 1, 'item_id' => $item['id'], 'snapshot' => BusinessCommand::json(['description' => $item['description'], 'quality' => $item['quality'], 'colour' => $item['colour'], 'packing' => $item['packing'], 'code' => $item['code']]), 'quantity' => (string) $quantity, 'rate' => Exact::money($rate), 'amount' => Exact::money($amount)];
        }
        foreach (self::orderedIds(array_keys($changes)) as $itemId) {
            $stock = $this->db->one('SELECT * FROM v1_stock WHERE item_id=? FOR UPDATE', [(string) $itemId]);
            if (!$stock) {
                throw new ApiError(409, 'STOCK_PROJECTION_MISSING');
            }
            if ($kind === 'STOCK_OPENING') {
                if ($stock['verified']) {
                    throw new ApiError(409, 'DUPLICATE_STOCK_OPENING');
                }
                $this->records->update('v1_stock', ['verified' => true], ['item_id' => (string) $itemId]);
            } elseif (!$stock['verified']) {
                throw new ApiError(409, 'STOCK_OPENING_UNVERIFIED');
            } else {
                $opening = $this->db->one("SELECT d.date FROM v1_stock_journal j JOIN v1_documents d ON d.id=j.document_id WHERE j.item_id=? AND d.kind='STOCK_OPENING' AND d.status='POSTED' LIMIT 1", [(string) $itemId]);
                if (!$opening || $payload['date'] < $opening['date']) {
                    throw new ApiError(400, 'DATE_PRECEDES_STOCK_OPENING');
                }
            }
            $sum = BigInteger::zero();
            foreach ($this->db->rows('SELECT delta FROM v1_stock_journal WHERE item_id=?', [(string) $itemId]) as $j) {
                $sum = $sum->plus(Exact::integer($j['delta'], signed: true));
            }
            if ($sum->compareTo($stock['quantity']) !== 0) {
                throw new ApiError(409, 'STOCK_RECONCILIATION_REQUIRED');
            }
            $next = Exact::integer($stock['quantity'], zero: true)->plus($changes[$itemId]);
            if ($next->isNegative()) {
                $index = array_search((string) $itemId, array_column($payload['lines'], 'itemId'), true);
                V1Input::field('lines.'.$index.'.quantity', 'Only '.$stock['quantity'].' bottles are available.', 'INSUFFICIENT_STOCK', ['itemId' => (string) $itemId, 'available' => $stock['quantity']]);
            }
            Exact::integer((string) $next, zero: true);
            $this->records->update('v1_stock', ['quantity' => (string) $next], ['item_id' => (string) $itemId]);
            $this->records->insert('v1_stock_journal', ['document_id' => $document['id'], 'item_id' => (string) $itemId, 'delta' => (string) $changes[$itemId]]);
        }
        // Preserve Express's single multi-row INSERT, including ID reservations on failure.
        $this->records->insertMany('v1_lines', $lines);
        return $total;
    }
}
