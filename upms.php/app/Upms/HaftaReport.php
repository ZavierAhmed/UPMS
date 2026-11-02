<?php

declare(strict_types=1);

namespace App\Upms;

use Brick\Math\BigInteger as N;

/** Read-only report over posted evidence. No catalog price or mutable stock is used. */
final class HaftaReport
{
    public function __construct(private readonly Database $db)
    {
    }

    public static function filters(array $input): array
    {
        if (array_diff(array_keys($input), ['from', 'to', 'parties'])) {
            throw new ApiError(400, 'INVALID_REPORT_FILTER', publicMessage: 'Unsupported Hafta filter. Refresh the report and try again.', entry: false);
        }
        $today = new \DateTimeImmutable(SimpleV1::today());
        $monday = $today->modify('-'.((int) $today->format('N') - 1).' days');
        try {
            $dates = V1Input::reportFilters(['from' => $input['from'] ?? $monday->format('Y-m-d'), 'to' => $input['to'] ?? $monday->modify('+6 days')->format('Y-m-d')]);
        } catch (ApiError) {
            throw new ApiError(400, 'INVALID_REPORT_DATES', publicMessage: 'Choose valid From and To business dates.', entry: false);
        }
        if ($dates['from'] > $dates['to'] || (new \DateTimeImmutable($dates['from']))->diff(new \DateTimeImmutable($dates['to']))->days > 366) {
            throw new ApiError(400, 'INVALID_REPORT_RANGE', publicMessage: 'From must not follow To. Select a date span of no more than 366 days.', entry: false);
        }
        $ids = $input['parties'] ?? '';
        if (!is_string($ids) || ($ids !== '' && !preg_match('/^[1-9][0-9]*(?:,[1-9][0-9]*){0,99}$/D', $ids))) {
            throw new ApiError(400, 'INVALID_REPORT_PARTIES', publicMessage: 'Select up to 100 valid clients, or choose All clients.', entry: false);
        }
        return [...$dates, 'parties' => $ids === '' ? [] : array_values(array_unique(explode(',', $ids)))];
    }

    public function generate(array $input): array
    {
        $f = self::filters($input);
        // Existing runtime SELECT coverage; no schema, permission or guard changes.
        $parties = $this->db->rows("SELECT * FROM v1_parties WHERE kind='CLIENT' ORDER BY name,id");
        if (array_diff($f['parties'], array_map('strval', array_column($parties, 'id')))) {
            throw new ApiError(400, 'REPORT_CLIENT_REQUIRED', publicMessage: 'One or more selected clients no longer exist or are vendors. Review the selection.', entry: false);
        }
        $parties = array_values(array_filter($parties, fn ($p) => !$f['parties'] || in_array((string) $p['id'], $f['parties'], true)));
        $docs = $this->db->rows("SELECT * FROM v1_documents WHERE status='POSTED' AND date<=? ORDER BY date,id", [$f['to']]);
        $lines = $this->db->rows("SELECT l.* FROM v1_lines l JOIN v1_documents d ON d.id=l.document_id WHERE d.status='POSTED' AND d.date>=? AND d.date<=? ORDER BY d.date,d.id,l.line_no", [$f['from'], $f['to']]);
        $journal = $this->db->rows("SELECT j.* FROM v1_party_journal j JOIN v1_documents d ON d.id=j.document_id WHERE d.status='POSTED' AND d.date<=? ORDER BY d.date,d.id,j.id", [$f['to']]);
        return self::assemble($f, $parties, $docs, $lines, $journal);
    }

    /** Pure reducer shared by isolated tests; all monetary arithmetic is integer cents. */
    public static function assemble(array $f, array $parties, array $documents, array $lines, array $journal): array
    {
        $docs = [];
        foreach ($documents as $d) {
            if ($d['status'] === 'POSTED' && $d['date'] <= $f['to']) {
                $d['payload'] = is_string($d['payload']) ? SimpleV1::payload($d) : $d['payload'];
                $docs[(string) $d['id']] = $d;
            }
        }
        uasort($docs, fn ($a, $b) => strcmp($a['date'], $b['date']) ?: N::of($a['id'])->compareTo($b['id']));
        usort($lines, fn ($a, $b) => N::of($a['document_id'])->compareTo($b['document_id']) ?: $a['line_no'] <=> $b['line_no']);
        $blocks = [];
        foreach ($parties as $party) {
            if ($party['kind'] !== 'CLIENT') {
                continue;
            }
            $opening = $movement = $gross = $discount = $returns = $receipts = $reversals = $openingEntries = N::zero();
            $verified = false;
            $rows = [];
            $warnings = [];
            foreach ($docs as $d) {
                if ((string) $d['party_id'] !== (string) $party['id']) {
                    continue;
                }
                $p = $d['payload'];
                // PHP V1 has no tax classification field. Refuse future classified data
                // rather than silently combining it with today's unclassified records.
                foreach (['classification', 'gstClassification', 'taxClassification'] as $key) {
                    if (isset($p[$key]) && $p[$key] !== '') {
                        throw new ApiError(409, 'HAFTA_CLASSIFICATION_REVIEW_REQUIRED');
                    }
                }
                if ($d['kind'] === 'CLIENT_OPENING' && $d['date'] < $f['from']) {
                    $hasOpeningJournal = count(array_filter($journal, fn ($j) => (string) $j['document_id'] === (string) $d['id'] && (string) $j['party_id'] === (string) $party['id'])) === 1;
                    $verified = (bool) $party['opening_verified'] && $hasOpeningJournal;
                }
                if ($d['date'] < $f['from']) {
                    continue;
                }
                $amount = Exact::cents($d['total'], zero: true);
                $reference = $d['official_number'] ?: 'Entry '.$d['id'];
                if (in_array($d['kind'], ['CHALLAN', 'CHALLAN_RETURN'], true)) {
                    $sum = N::zero();
                    foreach ($lines as $l) {
                        if ((string) $l['document_id'] !== (string) $d['id']) {
                            continue;
                        }
                        $snapshot = is_string($l['snapshot']) ? json_decode($l['snapshot'], true, 32, JSON_THROW_ON_ERROR) : $l['snapshot'];
                        $lineAmount = Exact::cents($l['amount'], zero: true);
                        if ($d['kind'] === 'CHALLAN' && !N::of($l['quantity'])->multipliedBy(Exact::cents($l['rate'], zero: true))->isEqualTo($lineAmount)) {
                            throw new ApiError(409, 'HAFTA_LINE_EVIDENCE_MISMATCH');
                        }
                        $sum = $sum->plus($lineAmount);
                        $rows[] = ['date' => $d['date'], 'kind' => $d['kind'], 'reference' => $reference, 'description' => $snapshot['description'] ?? 'Snapshot name missing', 'attributes' => implode(' / ', array_filter([$snapshot['quality'] ?? '', $snapshot['colour'] ?? '', $snapshot['packing'] ?? ''], fn ($s) => $s !== '')), 'quantity' => (string) $l['quantity'], 'rate' => $l['rate'], 'amount' => $l['amount']];
                    }
                    if ($d['kind'] === 'CHALLAN') {
                        $reduction = isset($p['discountSummary']) ? Exact::cents($p['discountSummary']['amount'], zero: true) : N::zero();
                        if (!$sum->minus($reduction)->isEqualTo($amount)) {
                            throw new ApiError(409, 'HAFTA_TOTAL_EVIDENCE_MISMATCH');
                        }
                        $gross = $gross->plus($sum);
                        $discount = $discount->plus($reduction);
                        if (!$reduction->isZero()) {
                            $rows[] = ['date' => $d['date'], 'kind' => 'DISCOUNT', 'reference' => $reference, 'description' => 'Recorded bill discount', 'quantity' => '', 'rate' => '', 'amount' => Exact::money($reduction)];
                        }
                    } else {
                        if (!$sum->isEqualTo($amount)) {
                            throw new ApiError(409, 'HAFTA_RETURN_EVIDENCE_MISMATCH');
                        }
                        $returns = $returns->plus($amount);
                    }
                } elseif ($d['kind'] === 'CLIENT_PAYMENT') {
                    $receipts = $receipts->plus($amount);
                    $rows[] = ['date' => $d['date'], 'kind' => $d['kind'], 'reference' => $reference, 'description' => 'Client receipt · '.($p['method'] ?? '').' (not classified as advance)', 'quantity' => '', 'rate' => '', 'amount' => $d['total']];
                } elseif ($d['kind'] === 'PAYMENT_REVERSAL') {
                    $reversals = $reversals->plus($amount);
                    $rows[] = ['date' => $d['date'], 'kind' => $d['kind'], 'reference' => $reference, 'description' => 'Receipt reversal', 'quantity' => '', 'rate' => '', 'amount' => $d['total']];
                }
            }
            foreach ($journal as $j) {
                $d = $docs[(string) $j['document_id']] ?? null;
                if (!$d || (string) $j['party_id'] !== (string) $party['id']) {
                    continue;
                }
                if ((string) $d['party_id'] !== (string) $party['id']) {
                    throw new ApiError(409, 'HAFTA_JOURNAL_EVIDENCE_MISMATCH');
                }
                $delta = Exact::cents($j['debit'], zero: true)->minus(Exact::cents($j['credit'], zero: true));
                if ($d['date'] < $f['from']) {
                    $opening = $opening->plus($delta);
                } else {
                    $movement = $movement->plus($delta);
                    if (in_array($d['kind'], ['CLIENT_OPENING', 'OPENING_CORRECTION'], true)) {
                        $openingEntries = $openingEntries->plus($delta);
                    }
                }
            }
            if (!$movement->isEqualTo($gross->minus($discount)->minus($returns)->minus($receipts)->plus($reversals)->plus($openingEntries))) {
                throw new ApiError(409, 'HAFTA_JOURNAL_EVIDENCE_MISMATCH');
            }
            if (!$verified) {
                $warnings[] = 'Opening balance is unverified at the start of this range. BALANCE is unavailable; recorded movements are not a complete balance.';
            }
            $blocks[] = ['partyId' => (string) $party['id'], 'partyName' => $party['name'], 'partyKind' => 'CLIENT', 'classification' => 'Not separately recorded in PHP V1', 'rows' => $rows, 'openingVerified' => $verified, 'opening' => $verified ? Exact::money($opening) : null, 'recordedPriorMovement' => Exact::money($opening), 'grossSales' => Exact::money($gross), 'discounts' => Exact::money($discount), 'returns' => Exact::money($returns), 'total' => Exact::money($gross->minus($discount)->minus($returns)), 'receipts' => Exact::money($receipts), 'receiptReversals' => Exact::money($reversals), 'openingEntries' => Exact::money($openingEntries), 'advance' => null, 'colorAndDieChange' => null, 'movement' => Exact::money($movement), 'balance' => $verified ? Exact::money($opening->plus($movement)) : null, 'warnings' => $warnings];
        }
        return ['company' => 'Unique Plastic Industry', 'currency' => 'PKR', 'timezone' => 'Asia/Karachi', 'from' => $f['from'], 'to' => $f['to'], 'blocks' => $blocks, 'sourceLimitations' => ['No dedicated color/die charge or advance allocation exists in PHP V1. Ordinary receipts are shown separately.', 'No separately recorded GST/non-GST classification exists in PHP V1. Clients and vendors are never combined.']];
    }
}
