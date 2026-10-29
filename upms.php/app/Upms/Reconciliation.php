<?php

declare(strict_types=1);

namespace App\Upms;

use Brick\Math\BigInteger as N;

/** Read-only port of server/src/simple-v1/reconcile.js. No repair or posting path. */
final class Reconciliation
{
    public function __construct(private readonly Database $db)
    {
    }

    private static function evidenceString(mixed $value): string
    {
        if (is_object($value)) {
            return '[object Object]';
        }
        if (is_array($value)) {
            return implode(',', array_map(fn ($v) => $v === null ? '' : self::evidenceString($v), $value));
        }

        return is_string($value) ? $value : BusinessCommand::json($value);
    }

    private static function cents(mixed $s, bool $zero = true): N
    {
        // The reference exact utility applies String(value), even to corrupt JSON.
        // This is serialization only; all arithmetic still uses integer cents.
        return Exact::cents(self::evidenceString($s), zero: $zero);
    }

    private static function same(mixed $a, mixed $b): bool
    {
        // JSON object key ordering is immaterial; values and array order are not.
        return self::canonical($a) === self::canonical($b);
    }

    private static function canonical(mixed $value): string
    {
        if (is_array($value)) {
            if (! array_is_list($value)) {
                ksort($value);
            }

            return json_encode(array_map(self::canonical(...), $value), JSON_THROW_ON_ERROR);
        }

        return json_encode($value, JSON_THROW_ON_ERROR);
    }

    public static function discount(N $subtotal, string $mode, string $value): array
    {
        $n = self::cents($value);
        $reduction = N::zero();
        if ($mode === 'NONE' && ! $n->isZero()) {
            throw new ApiError(400, 'INVALID_INPUT');
        } elseif ($mode === 'FIXED') {
            if ($n->compareTo($subtotal) > 0) {
                throw new ApiError(400, 'INVALID_INPUT');
            }
            $reduction = $n;
        } elseif ($mode === 'PERCENT') {
            if ($n->compareTo(10000) > 0) {
                throw new ApiError(400, 'INVALID_INPUT');
            }
            $reduction = $subtotal->multipliedBy($n)->plus(5000)->quotient(10000);
        } elseif ($mode !== 'NONE') {
            throw new ApiError(400, 'INVALID_INPUT');
        }
        $final = $subtotal->minus($reduction);
        if ($final->compareTo(0) <= 0) {
            throw new ApiError(400, 'ZERO_TOTAL_BLOCKED');
        }

        return ['mode' => $mode, 'value' => Exact::money($n), 'subtotal' => Exact::money($subtotal), 'amount' => Exact::money($reduction), 'total' => Exact::money($final)];
    }

    public static function returnCredits(array $sourceLines, string $net, array $previous, array $requested): array
    {
        $gross = N::zero();
        foreach ($sourceLines as $l) {
            $gross = $gross->plus(self::cents($l['amount']));
        }
        $netCents = self::cents($net);
        if ($netCents->compareTo($gross) > 0) {
            throw new ApiError(409, 'RETURN_SOURCE_INVALID');
        }
        $prefix = N::zero();
        $budgets = [];
        foreach ($sourceLines as $l) {
            $before = $prefix;
            $prefix = $prefix->plus(self::cents($l['amount']));
            $budgets[(string) $l['id']] = $gross->isZero() ? N::zero() : $netCents->multipliedBy($prefix)->quotient($gross)->minus($netCents->multipliedBy($before)->quotient($gross));
        }
        $computed = [];
        foreach ($requested as $l) {
            $source = null;
            foreach ($sourceLines as $s) {
                if ((string) $s['id'] === $l['originalLineId'] && (string) $s['item_id'] === $l['itemId']) {
                    $source = $s;
                    break;
                }
            }
            if (! $source || ! preg_match('/^\d{1,15}$/D', $l['quantity']) || N::of($l['quantity'])->compareTo(0) <= 0) {
                throw new ApiError(400, 'RETURN_LINE_MISMATCH');
            }
            $q = N::of($l['quantity']);
            $delivered = Exact::integer($source['quantity']);
            $old = $previous[(string) $source['id']] ?? N::zero();
            if ($old->plus($q)->compareTo($delivered) > 0) {
                throw new ApiError(400, 'RETURN_QUANTITY_EXCEEDED');
            }
            $budget = $budgets[(string) $source['id']];
            $credit = $budget->multipliedBy($old->plus($q))->quotient($delivered)->minus($budget->multipliedBy($old)->quotient($delivered));
            $computed[] = [...$l, 'quantity' => (string) $q, 'rate' => $source['rate'], 'snapshot' => json_decode($source['snapshot'], true, 512, JSON_THROW_ON_ERROR), 'credit' => Exact::money($credit)];
        }

        return $computed;
    }

    public function run(): array
    {
        $mismatches = [];
        $docs = $this->db->rows('SELECT * FROM v1_documents ORDER BY id');
        $lines = $this->db->rows('SELECT * FROM v1_lines');
        $stock = $this->db->rows('SELECT * FROM v1_stock');
        $movements = $this->db->rows('SELECT * FROM v1_stock_journal');
        $journal = $this->db->rows('SELECT * FROM v1_party_journal');
        $audit = $this->db->rows('SELECT * FROM v1_audit');
        $integrity = Integrity::inspect($docs, $this->db->rows('SELECT * FROM v1_commands ORDER BY `key`'), $this->db->rows('SELECT id FROM users'), $this->db->rows('SELECT id,code FROM v1_items'), $this->db->rows('SELECT id FROM v1_parties'), $audit);
        $integrityFindings = $integrity['findings'];
        foreach ($integrityFindings as $f) {
            if ($f['severity'] === 'error') {
                $mismatches[] = 'Integrity '.$f['code'].' '.$f['entity'].'/'.$f['id'].' '.$f['field'];
            }
        }
        $partyBalances = [];
        foreach ($stock as $s) {
            $expected = N::zero();
            foreach ($movements as $j) {
                if ((string) $j['item_id'] === (string) $s['item_id']) {
                    $expected = $expected->plus(Exact::integer($j['delta'], signed: true));
                }
            }
            if ($expected->compareTo($s['quantity']) !== 0 || $expected->isNegative()) {
                $mismatches[] = 'Stock projection '.$s['item_id'];
            }
        }
        foreach ($docs as $d) {
            if (isset($integrity['invalid'][(string) $d['id']])) {
                continue;
            }
            $p = SimpleV1::payload($d);
            $byDoc = fn ($r) => (string) $r['document_id'] === (string) $d['id'];
            $ls = array_values(array_filter($lines, $byDoc));
            $ss = array_values(array_filter($movements, $byDoc));
            $js = array_values(array_filter($journal, $byDoc));
            if ($d['status'] !== 'POSTED') {
                if ($ls || $ss || $js || $d['official_number']) {
                    $mismatches[] = 'Unposted effects '.$d['id'];
                }

                continue;
            }
            $debit = $credit = $total = N::zero();
            $expectedStock = [];
            try {
                if (in_array($d['kind'], ['STOCK_OPENING', 'PRODUCTION', 'PURCHASE', 'CHALLAN', 'STOCK_CORRECTION'], true)) {
                    if (count($ls) !== count($p['lines'])) {
                        $mismatches[] = 'Line count '.$d['id'];
                    }
                    foreach ($p['lines'] as $i => $l) {
                        $quantity = Exact::integer($l['quantity'], signed: $d['kind'] === 'STOCK_CORRECTION', zero: $d['kind'] === 'STOCK_OPENING');
                        $rate = in_array($d['kind'], ['CHALLAN', 'PURCHASE'], true) ? self::cents($l['rate']) : N::zero();
                        $amount = $quantity->multipliedBy($rate);
                        $total = $total->plus($amount);
                        $expectedStock[$l['itemId']] = ($expectedStock[$l['itemId']] ?? N::zero())->plus($d['kind'] === 'CHALLAN' ? $quantity->negated() : $quantity);
                        $saved = null;
                        foreach ($ls as $row) {
                            if ($row['line_no'] === $i + 1) {
                                $saved = $row;
                                break;
                            }
                        }
                        if (! $saved || (string) $saved['item_id'] !== $l['itemId'] || $saved['quantity'] !== (string) $quantity || $saved['rate'] !== Exact::money($rate) || $saved['amount'] !== Exact::money($amount) || (isset($l['snapshot']) && ! self::same(json_decode($saved['snapshot'], true), $l['snapshot']))) {
                            $mismatches[] = 'Immutable line '.$d['id'].'/'.($i + 1);
                        }
                    }
                    $bad = count($ss) !== count($expectedStock);
                    foreach ($ss as $j) {
                        if (! isset($expectedStock[$j['item_id']]) || $expectedStock[$j['item_id']]->compareTo($j['delta']) !== 0) {
                            $bad = true;
                        }
                    }
                    if ($bad) {
                        $mismatches[] = 'Stock source '.$d['id'];
                    }
                } elseif ($d['kind'] === 'CHALLAN_RETURN') {
                    try {
                        $source = null;
                        foreach ($docs as $s) {
                            if ((string) $s['id'] === $p['originalId'] && $s['kind'] === 'CHALLAN' && $s['status'] === 'POSTED') {
                                $source = $s;
                            }
                        }
                        if (! $source || (string) $source['party_id'] !== (string) $d['party_id'] || $p['date'] < $source['date']) {
                            throw new \RuntimeException('source');
                        }
                        $previous = [];
                        foreach ($docs as $earlier) {
                            if ($earlier['kind'] !== 'CHALLAN_RETURN' || $earlier['status'] !== 'POSTED') {
                                continue;
                            }
                            $before = false;
                            foreach ($journal as $j) {
                                if ((string) $j['document_id'] === (string) $earlier['id'] && isset($js[0]) && N::of($j['id'])->compareTo($js[0]['id']) < 0) {
                                    $before = true;
                                }
                            }
                            if ($before) {
                                $prior = SimpleV1::payload($earlier);
                                if ($prior['originalId'] === $p['originalId']) {
                                    foreach ($prior['lines'] as $l) {
                                        $previous[$l['originalLineId']] = ($previous[$l['originalLineId']] ?? N::zero())->plus($l['quantity']);
                                    }
                                }
                            }
                        }
                        $sourceLines = array_values(array_filter($lines, fn ($l) => (string) $l['document_id'] === $p['originalId']));
                        usort($sourceLines, fn ($a, $b) => $a['line_no'] <=> $b['line_no']);
                        $computed = self::returnCredits($sourceLines, $source['total'], $previous, $p['lines']);
                        foreach ($computed as $l) {
                            $total = $total->plus(self::cents($l['credit']));
                        }
                        $credit = $total;
                        if ($d['official_number'] !== 'DCR-'.str_pad((string) $d['id'], 4, '0', STR_PAD_LEFT) || count($ls) !== count($computed) || count($ss) !== count($computed) || $p['returnCredit'] !== Exact::money($total)) {
                            throw new \RuntimeException('identity');
                        }
                        foreach ($computed as $i => $l) {
                            $saved = null;
                            $movement = null;
                            foreach ($ls as $s) {
                                if ($s['line_no'] === $i + 1) {
                                    $saved = $s;
                                }
                            }
                            foreach ($ss as $s) {
                                if ((string) $s['item_id'] === $l['itemId']) {
                                    $movement = $s;
                                }
                            }
                            if (! $saved || (string) $saved['item_id'] !== $l['itemId'] || $saved['quantity'] !== $l['quantity'] || $saved['rate'] !== $l['rate'] || $saved['amount'] !== $l['credit'] || ! self::same(json_decode($saved['snapshot'], true), $l['snapshot']) || ! $movement || $movement['delta'] !== $l['quantity']) {
                                throw new \RuntimeException('effects');
                            }
                            $previous[$l['originalLineId']] = ($previous[$l['originalLineId']] ?? N::zero())->plus($l['quantity']);
                        }
                    } catch (\Throwable) {
                        $mismatches[] = 'Return evidence '.$d['id'];
                    }
                } elseif ($ss || $ls) {
                    $mismatches[] = 'Unexpected stock effects '.$d['id'];
                }
                if (in_array($d['kind'], ['CLIENT_OPENING', 'VENDOR_OPENING'], true)) {
                    $total = self::cents($p['amount']);
                    if ($p['direction'] === 'OWED_TO_COMPANY') {
                        $debit = $total;
                    } else {
                        $credit = $total;
                    }
                } elseif ($d['kind'] === 'CHALLAN') {
                    if (($p['entryVersion'] ?? null) === 2) {
                        try {
                            $computed = self::discount($total, $p['discountMode'], $p['discountValue']);
                            if (! self::same($computed, $p['discountSummary']) || $d['sale_subtotal'] !== $computed['subtotal'] || $d['discount_mode'] !== $computed['mode'] || $d['discount_value'] !== $computed['value'] || $d['discount_amount'] !== $computed['amount']) {
                                $mismatches[] = 'Discount evidence '.$d['id'];
                            }
                            $total = self::cents($computed['total']);
                        } catch (\Throwable) {
                            $mismatches[] = 'Invalid discount '.$d['id'];
                        }
                    }
                    $debit = $total;
                    if ($d['official_number'] !== SimpleV1::dcNumber($d['sequence'])) {
                        $mismatches[] = 'Number '.$d['id'];
                    }
                } elseif ($d['kind'] === 'PURCHASE') {
                    $credit = $total;
                    if ($p['paidImmediately'] ?? false) {
                        $debit = $total;
                    }
                } elseif (in_array($d['kind'], ['CLIENT_PAYMENT', 'VENDOR_PAYMENT'], true)) {
                    $total = self::cents(json_decode($d['payload'], false, flags: JSON_THROW_ON_ERROR)->amount ?? null, zero: false);
                    if ($d['kind'] === 'CLIENT_PAYMENT') {
                        $credit = $total;
                    } else {
                        $debit = $total;
                    }
                } elseif ($d['kind'] === 'EXPENSE') {
                    $total = self::cents(json_decode($d['payload'], false, flags: JSON_THROW_ON_ERROR)->amount ?? null, zero: false);
                    if (($p['paymentStatus'] ?? null) !== 'PAID' || ! BusinessCommand::truthy($p['category'] ?? null) || ! BusinessCommand::truthy($p['description'] ?? null) || ! BusinessCommand::truthy($p['payee'] ?? null) || ! BusinessCommand::truthy($p['reference'] ?? null) || ! in_array($p['method'] ?? '', ['CASH', 'BANK_TRANSFER'], true) || $d['party_id']) {
                        $mismatches[] = 'Paid expense evidence '.$d['id'];
                    }
                } elseif ($d['kind'] === 'PAYMENT_REVERSAL') {
                    $source = null;
                    foreach ($docs as $x) {
                        if ((string) $x['id'] === $p['correctsId'] && $x['status'] === 'POSTED') {
                            $source = $x;
                        }
                    }
                    if (! $source) {
                        $mismatches[] = 'Missing reversal source '.$d['id'];
                    } else {
                        $total = Exact::cents($source['total']);
                        if ($source['kind'] === 'CLIENT_PAYMENT') {
                            $debit = $total;
                        } else {
                            $credit = $total;
                        }
                    }
                } elseif ($d['kind'] === 'OPENING_CORRECTION') {
                    $total = self::cents($p['amount']);
                    $desired = $p['direction'] === 'OWED_TO_COMPANY' ? $total : $total->negated();
                    $delta = $desired->minus($partyBalances[$d['party_id']] ?? N::zero());
                    if ($delta->isPositive()) {
                        $debit = $delta;
                    } else {
                        $credit = $delta->negated();
                    }
                }
                if (in_array($d['kind'], ['CLIENT_PAYMENT', 'VENDOR_PAYMENT'], true) && $d['official_number'] && $d['official_number'] !== ($d['kind'] === 'CLIENT_PAYMENT' ? 'CR-' : 'VP-').str_pad((string) $d['id'], 4, '0', STR_PAD_LEFT)) {
                    $mismatches[] = 'Payment identity '.$d['id'];
                }
                if ($d['total'] !== Exact::money($total)) {
                    $mismatches[] = 'Document total '.$d['id'];
                }
                if ($d['party_id']) {
                    if (count($js) !== 1 || $js[0]['debit'] !== Exact::money($debit) || $js[0]['credit'] !== Exact::money($credit) || (string) $js[0]['party_id'] !== (string) $d['party_id']) {
                        $mismatches[] = 'Ledger source '.$d['id'];
                    }
                    $partyBalances[$d['party_id']] = ($partyBalances[$d['party_id']] ?? N::zero())->plus($debit)->minus($credit);
                } elseif ($js) {
                    $mismatches[] = 'Unexpected party effects '.$d['id'];
                }
                $found = false;
                foreach ($audit as $a) {
                    if ($a['action'] === 'document.posted' && $a['reference'] === ($d['official_number'] ?: (string) $d['id'])) {
                        $found = true;
                    }
                }
                if (! $found) {
                    $mismatches[] = 'Missing audit '.$d['id'];
                }
            } catch (\Throwable) {
                $integrityFindings[] = ['code' => 'DOCUMENT_CALCULATION_INVALID', 'entity' => 'document', 'id' => (string) $d['id'], 'field' => 'payload', 'message' => 'Saved evidence cannot be evaluated under the exact calculation policy.', 'severity' => 'error'];
                $mismatches[] = 'Integrity DOCUMENT_CALCULATION_INVALID document/'.$d['id'].' payload';
            }
        }

        return ['matched' => ! $mismatches, 'mismatches' => $mismatches, 'repairPerformed' => false, 'documents' => count(array_filter($docs, fn ($d) => $d['status'] === 'POSTED')), 'sourceLines' => count($lines), 'stockEntries' => count($movements), 'ledgerEntries' => count($journal), 'integrityFindings' => $integrityFindings, 'reviewRequired' => (bool) array_filter($integrityFindings, fn ($f) => $f['severity'] === 'warning'), 'authenticityVerified' => false];
    }
}
