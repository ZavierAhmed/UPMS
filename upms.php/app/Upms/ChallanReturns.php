<?php

declare(strict_types=1);

namespace App\Upms;

use Brick\Math\BigInteger;

/** Historical net credits; executes inside BusinessCommand's identity-guard transaction. */
final class ChallanReturns
{
    public function __construct(private readonly Database $db, private readonly BusinessRecords $records)
    {
    }

    public static function number(string $id): string
    {
        if (!preg_match('/^[1-9][0-9]{0,19}$/D', $id) || BigInteger::of($id)->compareTo('18446744073709551615') > 0) {
            throw new ApiError(409, 'INVALID_RETURN_IDENTITY');
        }
        return 'DCR-'.str_pad($id, 4, '0', STR_PAD_LEFT);
    }

    public static function credits(array $sourceLines, string $net, array $previous, array $requested): array
    {
        $gross = BigInteger::zero();
        foreach ($sourceLines as $line) {
            $gross = $gross->plus(Exact::cents($line['amount'], zero: true));
        }
        $netCents = Exact::cents($net, zero: true);
        if ($netCents->compareTo($gross) > 0) {
            throw new ApiError(409, 'RETURN_SOURCE_INVALID');
        }
        $prefix = BigInteger::zero();
        $budgets = [];
        foreach ($sourceLines as $line) {
            $before = $prefix;
            $prefix = $prefix->plus(Exact::cents($line['amount'], zero: true));
            $budgets[(string) $line['id']] = $gross->isZero() ? BigInteger::zero() : $netCents->multipliedBy($prefix)->quotient($gross)->minus($netCents->multipliedBy($before)->quotient($gross));
        }
        $result = [];
        foreach ($requested as $index => $line) {
            $source = null;
            foreach ($sourceLines as $candidate) {
                if ((string) $candidate['id'] === ($line['originalLineId'] ?? null) && (string) $candidate['item_id'] === $line['itemId']) {
                    $source = $candidate;
                    break;
                }
            }
            if (!$source) {
                V1Input::field('lines.'.$index.'.itemId', 'Choose a line from the original posted challan.', 'RETURN_LINE_MISMATCH');
            }
            try {
                $quantity = Exact::integer($line['quantity']);
            } catch (ApiError) {
                V1Input::field('lines.'.$index.'.quantity', 'Enter a positive whole bottle quantity.', 'INVALID_BOTTLE_QUANTITY');
            }
            $delivered = Exact::integer($source['quantity']);
            $old = $previous[(string) $source['id']] ?? BigInteger::zero();
            if ($old->plus($quantity)->compareTo($delivered) > 0) {
                V1Input::field('lines.'.$index.'.quantity', 'Only '.$delivered->minus($old).' bottles remain returnable.', 'RETURN_QUANTITY_EXCEEDED');
            }
            $budget = $budgets[(string) $source['id']];
            $credit = $budget->multipliedBy($old->plus($quantity))->quotient($delivered)->minus($budget->multipliedBy($old)->quotient($delivered));
            $result[] = [...$line, 'quantity' => (string) $quantity, 'rate' => $source['rate'], 'snapshot' => json_decode($source['snapshot'], false, flags: JSON_THROW_ON_ERROR), 'credit' => Exact::money($credit)];
        }
        return $result;
    }

    public function prepare(array $payload): array
    {
        if (empty($payload['originalId'])) {
            V1Input::field('originalId', 'Select an original posted delivery challan.', 'RETURN_POSTED_CHALLAN_REQUIRED');
        }
        $source = $this->db->one('SELECT * FROM v1_documents WHERE id=? FOR UPDATE', [$payload['originalId']]);
        if (!$source || $source['kind'] !== 'CHALLAN' || $source['status'] !== 'POSTED') {
            throw new ApiError(400, 'RETURN_POSTED_CHALLAN_REQUIRED');
        }
        $sourceLines = $this->db->rows('SELECT * FROM v1_lines WHERE document_id=? ORDER BY line_no', [$source['id']]);
        $previous = [];
        foreach ($this->db->rows("SELECT * FROM v1_documents WHERE kind='CHALLAN_RETURN' ORDER BY id") as $return) {
            $p = SimpleV1::payload($return);
            if (($p['originalId'] ?? null) !== (string) $source['id'] || $return['status'] !== 'POSTED') {
                continue;
            }
            foreach ($p['lines'] as $line) {
                $id = $line['originalLineId'];
                $previous[$id] = ($previous[$id] ?? BigInteger::zero())->plus($line['quantity']);
            }
        }
        if ($payload['partyId'] !== (string) $source['party_id']) {
            V1Input::field('partyId', 'The return must use the original challan client.', 'RETURN_CLIENT_MISMATCH');
        }
        if ($payload['date'] < $source['date']) {
            V1Input::field('date', 'Return date cannot precede the original challan.', 'RETURN_DATE_INVALID');
        }
        if (strlen(mb_convert_encoding($payload['reason'], 'UTF-16LE', 'UTF-8')) / 2 < 3) {
            V1Input::field('reason', 'Enter a return reason of at least three characters.', 'RETURN_REASON_REQUIRED');
        }
        if (!$payload['lines']) {
            V1Input::field('lines', 'Select at least one returned item.', 'BOTTLE_LINES_REQUIRED');
        }
        $ids = array_map(fn ($line) => $line['originalLineId'] ?? null, $payload['lines']);
        if (count(array_unique($ids, SORT_STRING)) !== count($ids)) {
            throw new ApiError(400, 'RETURN_DUPLICATE_LINE');
        }
        foreach ($payload['lines'] as $index => $line) {
            $original = null;
            foreach ($sourceLines as $candidate) {
                if ((string) $candidate['id'] === ($line['originalLineId'] ?? null)) {
                    $original = $candidate;
                    break;
                }
            }
            if (!$original || Exact::cents($line['rate'], zero: true)->compareTo(Exact::cents($original['rate'], zero: true)) !== 0) {
                V1Input::field('lines.'.$index.'.rate', 'The original posted rate is required.', 'RETURN_RATE_IMMUTABLE');
            }
        }
        $lines = self::credits($sourceLines, $source['total'], $previous, $payload['lines']);
        $total = BigInteger::zero();
        foreach ($lines as $line) {
            $total = $total->plus(Exact::cents($line['credit'], zero: true));
        }
        return [...$payload, 'lines' => $lines, 'originalReference' => $source['official_number'], 'originalDate' => $source['date'], 'partySnapshot' => SimpleV1::payload($source)['partySnapshot'], 'returnCredit' => Exact::money($total)];
    }

    public function post(array $user, array $document, array $payload): array
    {
        $payload = $this->prepare($payload);
        $lines = $payload['lines'];
        usort($lines, fn ($a, $b) => BigInteger::of($a['itemId'])->compareTo($b['itemId']));
        foreach ($lines as $line) {
            $stock = $this->db->one('SELECT * FROM v1_stock WHERE item_id=? FOR UPDATE', [$line['itemId']]);
            if (!$stock || !$stock['verified']) {
                throw new ApiError(409, 'STOCK_OPENING_UNVERIFIED');
            }
            $sum = BigInteger::zero();
            foreach ($this->db->rows('SELECT delta FROM v1_stock_journal WHERE item_id=?', [$line['itemId']]) as $journal) {
                $sum = $sum->plus($journal['delta']);
            }
            if ($sum->compareTo($stock['quantity']) !== 0) {
                throw new ApiError(409, 'STOCK_RECONCILIATION_REQUIRED');
            }
            $next = Exact::integer((string) BigInteger::of($stock['quantity'])->plus($line['quantity']), zero: true);
            $this->records->update('v1_stock', ['quantity' => (string) $next], ['item_id' => $line['itemId']]);
            $this->records->insert('v1_stock_journal', ['document_id' => $document['id'], 'item_id' => $line['itemId'], 'delta' => $line['quantity']]);
        }
        $rows = [];
        foreach ($payload['lines'] as $index => $line) {
            $rows[] = ['document_id' => $document['id'], 'line_no' => $index + 1, 'item_id' => $line['itemId'], 'snapshot' => BusinessCommand::json($line['snapshot']), 'quantity' => $line['quantity'], 'rate' => $line['rate'], 'amount' => $line['credit']];
        }
        $this->records->insertMany('v1_lines', $rows);
        $this->records->insert('v1_party_journal', ['document_id' => $document['id'], 'party_id' => $payload['partyId'], 'debit' => '0.00', 'credit' => $payload['returnCredit'], 'particulars' => 'DELIVERY CHALLAN RETURN · '.$payload['originalReference']]);
        $number = self::number((string) $document['id']);
        $this->records->update('v1_documents', ['status' => 'POSTED', 'official_number' => $number, 'total' => $payload['returnCredit'], 'payload' => BusinessCommand::json($payload)], ['id' => $document['id'], 'status' => 'DRAFT', 'version' => $document['version']]);
        $this->records->insert('v1_audit', ['actor_id' => $user['id'], 'action' => 'document.posted', 'reference' => $number, 'reason' => $payload['reason'], 'created_at' => BusinessCommand::timestamp()]);
        return ['id' => (string) $document['id'], 'status' => 'POSTED', 'official_number' => $number, 'total' => $payload['returnCredit']];
    }
}
