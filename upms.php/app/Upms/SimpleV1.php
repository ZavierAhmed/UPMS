<?php

declare(strict_types=1);

namespace App\Upms;

use Brick\Math\BigInteger as IntMath;

final class SimpleV1
{
    public const EVENTS = [
        'CHALLAN_RETURN' => ['DELIVERY CHALLAN RETURN', 'Client credit / stock returned'],
        'STOCK_OPENING' => ['Stock opening', 'Opening balance'],
        'PRODUCTION' => ['Production stock in', 'Inventory-only movement'],
        'PURCHASE' => ['Bottle purchase', 'Financial obligation'],
        'CHALLAN' => ['Delivery challan sale', 'Sales revenue / receivable'],
        'CLIENT_OPENING' => ['Client opening', 'Opening balance'], 'VENDOR_OPENING' => ['Vendor opening', 'Opening balance'],
        'CLIENT_PAYMENT' => ['Client receipt', 'Payment received'], 'VENDOR_PAYMENT' => ['Vendor payment', 'Payment made'],
        'PAYMENT_REVERSAL' => ['Payment reversal', 'Correction / reversal'], 'STOCK_CORRECTION' => ['Stock correction', 'Inventory-only correction'],
        'OPENING_CORRECTION' => ['Opening correction', 'Correction / reversal'], 'EXPENSE' => ['Business expense paid', 'Expense recorded and paid'],
    ];

    public function __construct(private readonly Database $db)
    {
    }

    public static function payload(array $row): array
    {
        return json_decode($row['payload'], true, 512, JSON_THROW_ON_ERROR);
    }

    public static function today(): string
    {
        return (new \DateTimeImmutable('now', new \DateTimeZone('Asia/Karachi')))->format('Y-m-d');
    }

    public static function dcNumber(int $sequence): string
    {
        if ($sequence < 1 || $sequence > 10999) {
            throw new ApiError(409, 'DC_ROLLOVER_REQUIRES_OWNER_DECISION');
        }
        return $sequence <= 1000 ? 'DC-'.str_pad((string) $sequence, 4, '0', STR_PAD_LEFT) : 'DC-A'.str_pad((string) ($sequence - 1000), 4, '0', STR_PAD_LEFT);
    }

    public static function paymentNumber(string $kind, string $id): string
    {
        $prefix = ['CLIENT_PAYMENT' => 'CR', 'VENDOR_PAYMENT' => 'VP'][$kind] ?? null;
        if (!$prefix || !preg_match('/^\d{1,20}$/D', $id) || IntMath::of($id)->compareTo(1) < 0 || IntMath::of($id)->compareTo('18446744073709551615') > 0) {
            throw new ApiError(409, 'INVALID_PAYMENT_IDENTITY');
        }
        return $prefix.'-'.str_pad((string) IntMath::of($id), 4, '0', STR_PAD_LEFT);
    }

    public function state(array $control, array $user): array
    {
        return ['mode' => 'SIMPLE_V1', 'deploymentPurpose' => 'legacy-synthetic', 'interfaceVersion' => $control['entry_version'] === 2 ? 'simple-v1.2' : 'simple-v1.1',
            'operator' => $user['displayName'], 'company' => 'Unique Plastic Industry', 'currency' => 'PKR', 'unit' => 'bottles', 'state' => $control['state'],
            'nextChallan' => $control['next_dc'] <= 10999 ? self::dcNumber($control['next_dc']) : 'Rollover blocked', 'cutoverEvidence' => $control['cutover_evidence'],
            'paymentPolicy' => 'Account-level payments. Official CR/VP references are assigned on posting; external cash/bank references are optional. Cheque identification is required. No cash/bank account balance is managed.'];
    }

    public function items(): array
    {
        return $this->db->rows('SELECT i.*,s.quantity,s.verified FROM v1_items i JOIN v1_stock s ON s.item_id=i.id ORDER BY i.code');
    }

    public function parties(mixed $kind): array
    {
        if (!in_array($kind, ['CLIENT', 'VENDOR'], true)) {
            throw new ApiError(400, 'INVALID_PARTY_KIND');
        }
        return $this->db->rows('SELECT * FROM v1_parties WHERE kind=? ORDER BY name', [$kind]);
    }

    public function documents(mixed $kind = null): array
    {
        if ($kind && (!is_string($kind) || !isset(self::EVENTS[$kind]))) {
            throw new ApiError(400, 'INVALID_DOCUMENT_KIND');
        }
        $rows = $kind ? $this->db->rows('SELECT * FROM v1_documents WHERE kind=? ORDER BY id DESC', [$kind]) : $this->db->rows('SELECT * FROM v1_documents ORDER BY id DESC');
        return array_map(fn ($d) => [...$d, 'id' => (string) $d['id'], 'party_id' => $d['party_id'] ? (string) $d['party_id'] : null, 'payload' => self::payload($d)], $rows);
    }

    public function detail(string $id): array
    {
        $d = $this->db->one('SELECT * FROM v1_documents WHERE id=?', [$id]);
        if (!$d) {
            throw new ApiError(404, 'NOT_FOUND');
        }
        $p = self::payload($d);
        $party = $d['party_id'] ? $this->db->one('SELECT * FROM v1_parties WHERE id=?', [$d['party_id']]) : null;
        $reversal = $this->db->one("SELECT id FROM v1_documents WHERE corrects_id=? AND kind='PAYMENT_REVERSAL' AND status='POSTED' LIMIT 1", [$id]);
        $extra = [];
        if ($d['kind'] === 'CHALLAN' && $d['status'] === 'POSTED') {
            $returns = array_values(array_filter($this->documents('CHALLAN_RETURN'), fn ($r) => ($r['payload']['originalId'] ?? null) === $id));
            usort($returns, fn ($a, $b) => IntMath::of($a['id'])->compareTo($b['id']));
            $previous = [];
            $credit = IntMath::zero();
            foreach ($returns as $r) {
                if ($r['status'] !== 'POSTED') {
                    continue;
                }
                $credit = $credit->plus(Exact::cents($r['total'], zero: true));
                foreach ($r['payload']['lines'] as $line) {
                    $key = $line['originalLineId'];
                    $previous[$key] = ($previous[$key] ?? IntMath::zero())->plus($line['quantity']);
                }
            }
            $returnable = array_map(function ($line) use ($previous) {
                $old = $previous[(string) $line['id']] ?? IntMath::zero();
                return [...$line, 'id' => (string) $line['id'], 'item_id' => (string) $line['item_id'], 'snapshot' => json_decode($line['snapshot'], false, 512, JSON_THROW_ON_ERROR), 'returned' => (string) $old, 'remaining' => (string) IntMath::of($line['quantity'])->minus($old)];
            }, $this->db->rows('SELECT * FROM v1_lines WHERE document_id=? ORDER BY line_no', [$id]));
            $extra = ['returns' => $returns, 'returnableLines' => $returnable, 'returnCredit' => Exact::money($credit)];
        }
        $lines = $d['status'] === 'DRAFT' ? array_map(function ($l, $i) {
            $amount = $l['credit'] ?? (preg_match('/^\d+$/D', $l['quantity']) && preg_match('/^\d+(?:\.\d{1,2})?$/D', $l['rate']) ? Exact::money(IntMath::of($l['quantity'])->multipliedBy(Exact::cents($l['rate'], zero: true))) : 'Review invalid line');
            return ['line_no' => $i + 1, 'snapshot' => (object) ($l['snapshot'] ?? []), 'quantity' => $l['quantity'], 'rate' => $l['rate'], 'amount' => $amount];
        }, $p['lines'], array_keys($p['lines'])) : array_map(fn ($l) => [...$l, 'snapshot' => json_decode($l['snapshot'], false, 512, JSON_THROW_ON_ERROR)], $this->db->rows('SELECT * FROM v1_lines WHERE document_id=? ORDER BY line_no', [$id]));
        return [...$d, 'id' => $id, 'party_id' => $d['party_id'] ? (string) $d['party_id'] : null, 'payload' => json_decode($d['payload'], false, 512, JSON_THROW_ON_ERROR), ...$extra,
            'party' => isset($p['partySnapshot']) ? (object) $p['partySnapshot'] : $party, 'openingVerified' => (bool) ($party['opening_verified'] ?? false), 'reversalId' => $reversal ? (string) $reversal['id'] : null,
            'lines' => $lines, 'history' => $this->db->rows('SELECT * FROM v1_audit WHERE reference=? OR reference=? ORDER BY id', [$id, $d['official_number'] ?: $id])];
    }

    public function movements(): array
    {
        return $this->db->rows('SELECT j.*,d.date,d.kind,d.official_number,d.payload,i.code,i.description FROM v1_stock_journal j JOIN v1_documents d ON d.id=j.document_id JOIN v1_items i ON i.id=j.item_id ORDER BY d.date,j.id');
    }

    private static function dates(array $f): void
    {
        foreach (['from', 'to'] as $key) {
            if (!empty($f[$key])) {
                $s = $f[$key];
                $date = is_string($s) ? \DateTimeImmutable::createFromFormat('!Y-m-d', $s) : false;
                if (!$date || $date->format('Y-m-d') !== $s) {
                    throw new ApiError(400, 'INVALID_INPUT');
                }
            }
        }
        if (!empty($f['from']) && !empty($f['to']) && $f['from'] > $f['to']) {
            throw new ApiError(400, 'INVALID_DATE_RANGE');
        }
    }

    public function ledger(string $id, array $f): array
    {
        $party = $this->db->one('SELECT * FROM v1_parties WHERE id=?', [$id]);
        if (!$party) {
            throw new ApiError(404, 'NOT_FOUND');
        }
        self::dates($f);
        $rows = $this->db->rows('SELECT j.*,d.date,d.official_number,d.kind,d.payload FROM v1_party_journal j JOIN v1_documents d ON d.id=j.document_id WHERE j.party_id=? ORDER BY d.date,j.id', [$id]);
        $balance = $brought = $debit = $credit = IntMath::zero();
        $records = [];
        foreach ($rows as $r) {
            $dr = Exact::cents($r['debit'], zero: true);
            $cr = Exact::cents($r['credit'], zero: true);
            $balance = $balance->plus($dr)->minus($cr);
            if (!empty($f['from']) && $r['date'] < $f['from']) {
                $brought = $balance;
                continue;
            }
            if (!empty($f['to']) && $r['date'] > $f['to']) {
                continue;
            }
            $debit = $debit->plus($dr);
            $credit = $credit->plus($cr);
            $p = self::payload($r);
            $reference = $r['official_number'] ?: ($p['reference'] ?: 'Entry '.$r['document_id']);
            $entry = ['date' => $r['date'], 'particulars' => $r['particulars'], 'reference' => $reference, 'originalReference' => $p['originalReference'] ?? '', 'externalReference' => $p['reference'] ?? '', 'chequeReference' => $p['chequeReference'] ?? '', 'debit' => $r['debit'], 'credit' => $r['credit'], 'balance' => Exact::money($balance), 'documentId' => (string) $r['document_id']];
            if (empty($f['reference']) || str_contains(mb_strtolower(implode(' ', [$entry['reference'], $entry['originalReference'], $entry['externalReference'], $entry['chequeReference']])), mb_strtolower((string) $f['reference']))) {
                $records[] = $entry;
            }
        }
        return ['party' => $party, 'verified' => (bool) $party['opening_verified'], 'convention' => 'Debit: owed to company / company advance. Credit: owed by company / client advance. Vendor payments debit and reduce a payable credit balance.',
            'opening' => Exact::money($brought), 'debit' => Exact::money($debit), 'credit' => Exact::money($credit), 'closing' => Exact::money($brought->plus($debit)->minus($credit)), 'records' => $records,
            'referenceFiltered' => !empty($f['reference']), 'totalsCoverage' => 'Whole selected date range; reference search hides rows without restarting balances.'];
    }

    public function overview(): array
    {
        $docs = $this->db->rows("SELECT * FROM v1_documents WHERE status='POSTED'");
        $stock = $this->db->rows('SELECT i.id,i.code,i.description,i.active,s.quantity,s.verified FROM v1_items i JOIN v1_stock s ON s.item_id=i.id');
        $journals = $this->db->rows('SELECT j.*,p.kind FROM v1_party_journal j JOIN v1_parties p ON p.id=j.party_id');
        $clients = $vendors = $bottles = $sales = IntMath::zero();
        $hasStock = false;
        $active = $challans = 0;
        foreach ($stock as $s) {
            if ($s['active']) {
                $active++;
                if ($s['verified']) {
                    $hasStock = true;
                    $bottles = $bottles->plus($s['quantity']);
                }
            }
        }
        foreach ($journals as $j) {
            $delta = Exact::cents($j['debit'], zero: true)->minus(Exact::cents($j['credit'], zero: true));
            if ($j['kind'] === 'CLIENT') {
                $clients = $clients->plus($delta);
            } else {
                $vendors = $vendors->minus($delta);
            }
        }
        foreach ($docs as $d) {
            if ($d['kind'] === 'CHALLAN' && $d['date'] === self::today()) {
                $challans++;
                $sales = $sales->plus(Exact::cents($d['total'], zero: true));
            }
        }
        return ['availableBottles' => $hasStock ? (string) $bottles : null, 'activeItems' => $active, 'stock' => $stock, 'todayChallans' => $challans, 'todaySales' => Exact::money($sales), 'clientNetReceivable' => Exact::money($clients), 'vendorNetPayable' => Exact::money($vendors), 'unverifiedParties' => (int) $this->db->one('SELECT COUNT(*) AS n FROM v1_parties WHERE opening_verified=0')['n']];
    }

    public function register(array $f): array
    {
        $f = array_filter($f, fn ($v) => $v !== '');
        if (array_diff(array_keys($f), ['from', 'to', 'type', 'party', 'reference'])) {
            throw new ApiError(400, 'INVALID_INPUT', ['form' => 'Some submitted fields are not supported. Refresh this page and try again.']);
        }
        self::dates($f);
        if (isset($f['type']) && (!is_string($f['type']) || !isset(self::EVENTS[$f['type']]))) {
            throw new ApiError(400, 'INVALID_INPUT');
        }
        foreach (['party', 'reference'] as $key) {
            if (isset($f[$key])) {
                if (!is_string($f[$key]) || mb_strlen(trim($f[$key])) > 150) {
                    throw new ApiError(400, 'INVALID_INPUT');
                }
                $f[$key] = trim($f[$key]);
            }
        }
        $parties = $this->db->rows('SELECT * FROM v1_parties');
        $journals = $this->db->rows('SELECT j.*,d.date FROM v1_party_journal j JOIN v1_documents d ON d.id=j.document_id');
        $records = [];
        $totals = array_fill_keys(['sales', 'returnCredits', 'netSales', 'purchases', 'clientReceipts', 'vendorPayments', 'expensesRecorded', 'expensesPaid'], IntMath::zero());
        $production = IntMath::zero();
        foreach ($this->db->rows("SELECT * FROM v1_documents WHERE status='POSTED' ORDER BY date,id") as $d) {
            $p = self::payload($d);
            $party = $p['partySnapshot']['name'] ?? null;
            if ($party === null) {
                foreach ($parties as $v) {
                    if ((string) $v['id'] === (string) $d['party_id']) {
                        $party = $v['name'];
                        break;
                    }
                }
            }
            $party ??= $p['payee'] ?? '';
            [$type, $effect] = self::EVENTS[$d['kind']] ?? ['Unknown event', 'Review required'];
            $quantity = IntMath::zero();
            foreach ($p['lines'] ?? [] as $line) {
                $quantity = $quantity->plus($line['quantity']);
            }
            $r = ['id' => (string) $d['id'], 'date' => $d['date'], 'reference' => $d['official_number'] ?: (($p['reference'] ?? '') ?: 'Entry '.$d['id']), 'originalReference' => $p['originalReference'] ?? '', 'externalReference' => $p['reference'] ?? '', 'chequeReference' => $p['chequeReference'] ?? '', 'kind' => $d['kind'], 'type' => $type, 'party' => $party, 'partyId' => $d['party_id'] ? (string) $d['party_id'] : '', 'particulars' => $d['kind'] === 'CHALLAN_RETURN' ? $type.' / '.$p['originalReference'] : (($p['description'] ?? '') ?: (($p['remarks'] ?? '') ?: $type)), 'amount' => $d['total'], 'effect' => $d['kind'] === 'PURCHASE' && ($p['paidImmediately'] ?? false) ? 'Purchase recorded and paid' : $effect, 'method' => $d['kind'] === 'PURCHASE' && !($p['paidImmediately'] ?? false) ? '' : ($p['method'] ?? ''), 'quantity' => (string) $quantity];
            if ((!empty($f['from']) && $r['date'] < $f['from']) || (!empty($f['to']) && $r['date'] > $f['to']) || (!empty($f['type']) && $r['kind'] !== $f['type']) || (!empty($f['party']) && !str_contains(mb_strtolower($r['party']), mb_strtolower($f['party'])))) {
                continue;
            }
            if (!empty($f['reference']) && !str_contains(mb_strtolower(implode(' ', [$r['reference'], $r['originalReference'], $r['externalReference'], $r['chequeReference']])), mb_strtolower($f['reference']))) {
                continue;
            }
            $records[] = $r;
            $n = Exact::cents($r['amount'], zero: true);
            $keys = match ($r['kind']) {
                'CHALLAN' => ['sales', 'netSales'], 'CHALLAN_RETURN' => ['returnCredits'], 'PURCHASE' => ($p['paidImmediately'] ?? false) ? ['purchases', 'vendorPayments'] : ['purchases'],
                'CLIENT_PAYMENT' => ['clientReceipts'], 'VENDOR_PAYMENT' => ['vendorPayments'], 'EXPENSE' => ['expensesRecorded', 'expensesPaid'], default => [],
            };
            foreach ($keys as $key) {
                $totals[$key] = $totals[$key]->plus($n);
            }
            if ($r['kind'] === 'CHALLAN_RETURN') {
                $totals['netSales'] = $totals['netSales']->minus($n);
            }
            if ($r['kind'] === 'PRODUCTION') {
                $production = $production->plus($quantity);
            }
        }
        $balances = [];
        foreach ($journals as $j) {
            if (!empty($f['to']) && $j['date'] > $f['to']) {
                continue;
            }
            $balances[$j['party_id']] = ($balances[$j['party_id']] ?? IntMath::zero())->plus(Exact::cents($j['debit'], zero: true))->minus(Exact::cents($j['credit'], zero: true));
        }
        $receivables = $payables = IntMath::zero();
        $unverified = 0;
        foreach ($parties as $p) {
            if (!$p['opening_verified']) {
                $unverified++;
                continue;
            }
            $n = $balances[$p['id']] ?? IntMath::zero();
            if ($p['kind'] === 'CLIENT' && $n->isPositive()) {
                $receivables = $receivables->plus($n);
            }
            if ($p['kind'] === 'VENDOR' && $n->isNegative()) {
                $payables = $payables->minus($n);
            }
        }
        return ['records' => $records, 'totals' => array_map(Exact::money(...), $totals), 'clientReceivables' => Exact::money($receivables), 'vendorPayables' => Exact::money($payables), 'productionBottles' => (string) $production, 'balanceCoverage' => 'Verified party balances as of To date (or present), across all parties; advances excluded. Event totals follow all filters.', 'unverifiedParties' => $unverified];
    }

    public function reconciliation(): array
    {
        return (new Reconciliation($this->db))->run();
    }
}
