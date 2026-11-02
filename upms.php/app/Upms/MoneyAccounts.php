<?php

declare(strict_types=1);

namespace App\Upms;

use Brick\Math\BigInteger as N;

/** Independent money ledger. Never posts to a party, stock, sales or expense journal. */
final class MoneyAccounts
{
    public function __construct(private readonly Database $db)
    {
    }
    private static function fail(string $code, string $message, int $status = 409): never
    {
        throw new ApiError($status, $code, publicMessage:$message, entry:false);
    }
    private static function balanceCents(string $value): N
    {
        if (!preg_match('/^-?[0-9]{1,14}\.[0-9]{2}$/D', $value)) {
            throw new \LogicException('NONCANONICAL_MONEY_BALANCE');
        }return N::of(str_replace('.', '', $value));
    }
    private static function validId(string $id): bool
    {
        return strlen($id) <= 20 && (bool)preg_match('/^[1-9][0-9]*$/D', $id) && N::of($id)->compareTo('18446744073709551615') <= 0;
    }
    public static function sourceKey(string $reference): string
    {
        return hash('sha256', mb_strtolower(V1Input::trim($reference)));
    }
    public static function legs(array $b): array
    {
        $amount = Exact::cents($b['amount'], zero:true);
        $rows = [];
        if ($b['from_account_id'] !== null) {
            $rows[(string)$b['from_account_id']] = Exact::money($amount->negated());
        }
        if ($b['to_account_id'] !== null) {
            $rows[(string)$b['to_account_id']] = Exact::money($amount);
        }
        ksort($rows, SORT_NATURAL);
        return $rows;
    }
    private static function batchHash(array $b): string
    {
        return hash('sha256', BusinessCommand::canonical((object)$b));
    }
    private function data(): array
    {
        return [$this->db->rows('SELECT * FROM money_accounts ORDER BY id'),$this->db->rows('SELECT * FROM money_batches ORDER BY id'),$this->db->rows('SELECT * FROM money_movements ORDER BY id'),$this->db->rows('SELECT * FROM money_audit ORDER BY id')];
    }
    public function reconciliation(): array
    {
        return self::reconcile(...$this->data());
    }
    public static function reconcile(array $accounts, array $batches, array $movements, array $audits): array
    {
        $a = [];
        $bs = [];
        $ms = [];
        $as = [];
        $balances = [];
        $open = [];
        $last = [];
        $findings = [];
        foreach ($accounts as $r) {
            $a[(string)$r['id']] = $r;
            $balances[(string)$r['id']] = N::zero();
        }
        foreach ($batches as $b) {
            $bs[(string)$b['id']] = $b;
        }
        foreach ($movements as $m) {
            $ms[(string)$m['batch_id']][] = $m;
            if (!isset($bs[(string)$m['batch_id']])) {
                $findings[] = ['code' => 'ORPHAN_MOVEMENT','id' => (string)$m['id']];
            }
        }
        foreach ($audits as $audit) {
            $as[(string)$audit['batch_id']][] = $audit;
            if (!isset($bs[(string)$audit['batch_id']])) {
                $findings[] = ['code' => 'ORPHAN_AUDIT','id' => (string)$audit['id']];
            }
        }
        foreach ($batches as $b) {
            $id = (string)$b['id'];
            $sourceType = match ($b['kind']) {
                'OPENING' => 'OPENING','TRANSFER' => 'TRANSFER','SOURCE_CREDIT','SOURCE_DEBIT' => 'EXTERNAL','REVERSAL' => 'REVERSAL',default => ''
            };
            $sourceIdentity = $b['kind'] === 'OPENING' ? (string)$b['opening_account_id'] : ($b['kind'] === 'REVERSAL' ? (string)$b['corrects_id'] : $b['source_ref']);
            if ($b['source_type'] !== $sourceType || $b['source_key'] !== self::sourceKey($sourceIdentity)) {
                $findings[] = ['code' => 'SOURCE_REFERENCE_MISMATCH','id' => $id];
            }
            $expected = self::legs($b);
            $actual = [];
            $before = [];
            $after = [];
            foreach ($ms[$id] ?? [] as $m) {
                if (isset($actual[(string)$m['account_id']])) {
                    $findings[] = ['code' => 'DUPLICATE_LEG','id' => $id];
                }$actual[(string)$m['account_id']] = $m['delta'];
            }
            ksort($actual, SORT_NATURAL);
            if ($actual !== $expected) {
                $findings[] = ['code' => 'SOURCE_EFFECT_MISMATCH','id' => $id];
            }
            if ($b['kind'] === 'REVERSAL') {
                $original = $bs[(string)$b['corrects_id']] ?? null;
                if (!$original || !in_array($original['kind'], ['TRANSFER','SOURCE_CREDIT','SOURCE_DEBIT'], true) || $original['amount'] !== $b['amount'] || $original['from_account_id'] !== $b['to_account_id'] || $original['to_account_id'] !== $b['from_account_id'] || $b['date'] < $original['date'] || N::of($id)->compareTo($original['id']) <= 0) {
                    $findings[] = ['code' => 'CORRECTION_LINK_MISMATCH','id' => $id];
                }
            }
            foreach ($expected as $account => $delta) {
                if (!isset($a[$account])) {
                    $findings[] = ['code' => 'UNKNOWN_ACCOUNT','id' => $id];
                    continue;
                }
                $before[$account] = isset($open[$account]) ? Exact::money($balances[$account]) : null;
                if (isset($last[$account]) && $b['date'] < $last[$account]) {
                    $findings[] = ['code' => 'BACKDATED_MOVEMENT','id' => $id];
                }
                $last[$account] = $b['date'];
                if ($b['kind'] === 'OPENING') {
                    if (isset($open[$account]) || $b['from_account_id'] !== null || (string)$b['opening_account_id'] !== (string)$account) {
                        $findings[] = ['code' => 'OPENING_MISMATCH','id' => $id];
                    }
                    $open[$account] = $b['date'];
                } elseif (!isset($open[$account])) {
                    $findings[] = ['code' => 'OPENING_REQUIRED','id' => $id];
                }
                if ($a[$account]['type'] === 'CHEQUE_CUSTODY' && $b['kind'] !== 'OPENING') {
                    $findings[] = ['code' => 'NONSPENDABLE_CUSTODY_EFFECT','id' => $id];
                }
                // Verified balances sum recorded immutable movements; source legs are checked separately.
                $balances[$account] = $balances[$account]->plus(Exact::cents($actual[$account] ?? '0.00', signed:true, zero:true));
                if ($balances[$account]->isNegative()) {
                    $findings[] = ['code' => 'NEGATIVE_HOLDING','id' => $id];
                }
                $after[$account] = Exact::money($balances[$account]);
            }
            $audit = $as[$id] ?? [];
            $e = count($audit) === 1 ? json_decode($audit[0]['evidence'], true, 32, JSON_THROW_ON_ERROR) : [];
            if (count($audit) !== 1 || ($e['batchHash'] ?? '') !== self::batchHash($b) || BusinessCommand::canonical((object)($e['before'] ?? [])) !== BusinessCommand::canonical((object)$before) || BusinessCommand::canonical((object)($e['after'] ?? [])) !== BusinessCommand::canonical((object)$after) || ($e['approvedBy'] ?? '') !== (string)$b['actor_id'] || ($audit[0]['action'] ?? '') !== 'money.posted.'.$b['kind'] || ($audit[0]['actor_id'] ?? '') !== $b['actor_id'] || ($audit[0]['reason'] ?? '') !== $b['reason'] || ($audit[0]['created_at'] ?? '') !== $b['created_at']) {
                $findings[] = ['code' => 'AUDIT_EVIDENCE_MISMATCH','id' => $id];
            }
        }
        return ['matched' => !$findings,'findings' => $findings,'balances' => array_map(fn ($n) => Exact::money($n), $balances),'openings' => $open,'batches' => count($batches),'movements' => count($movements),'sourceCoverage' => 'Money batches only; historic V1 payments and expenses are not linked or backfilled.','authenticity' => 'Shape and arithmetic consistency, not proof of physical funds or protection against fabricated SQL inserts.'];
    }
    public function overview(): array
    {
        [$accounts,$batches,$movements,$audits] = $this->data();
        $r = self::reconcile($accounts, $batches, $movements, $audits);
        return ['currency' => 'PKR','accounts' => array_map(fn ($a) => [...$a,'id' => (string)$a['id'],'spendable' => $a['type'] !== 'CHEQUE_CUSTODY','verified' => $r['matched'] && isset($r['openings'][(string)$a['id']]),'balance' => $r['matched'] && isset($r['openings'][(string)$a['id']]) ? $r['balances'][(string)$a['id']] : null,'openingDate' => $r['openings'][(string)$a['id']] ?? null], $accounts),'batches' => array_reverse(array_map(fn ($b) => [...$b,'reference' => 'MA-'.str_pad((string)$b['id'], 6, '0', STR_PAD_LEFT)], $batches)),'reconciliation' => $r,'policy' => 'Cash and bank balances are separate. Cheque custody is not spendable. All openings require explicit evidence; no historic payment backfill.','operations' => ['opening' => true,'transfer' => true,'externalSource' => true,'reversal' => true]];
    }
    public function statement(string $id, array $input): array
    {
        if (!self::validId($id) || array_diff(array_keys($input), ['from','to'])) {
            self::fail('INVALID_STATEMENT', 'Choose a valid account and date range.', 400);
        }
        $f = V1Input::reportFilters(array_filter($input, fn ($v) => $v !== ''));
        if (isset($f['from'],$f['to']) && $f['from'] > $f['to']) {
            self::fail('INVALID_STATEMENT_RANGE', 'From must not follow To.', 400);
        }
        [$accounts,$batches,$movements,$audits] = $this->data();
        $r = self::reconcile($accounts, $batches, $movements, $audits);
        $a = null;
        foreach ($accounts as $account) {
            if ((string)$account['id'] === $id) {
                $a = $account;
            }
        }
        if (!$a) {
            self::fail('MONEY_ACCOUNT_NOT_FOUND', 'Account not found.', 404);
        }
        usort($batches, fn ($a, $b) => strcmp($a['date'], $b['date']) ?: N::of($a['id'])->compareTo($b['id']));
        $prior = $sum = $change = N::zero();
        $journal = [];
        foreach ($movements as $movement) {
            if ((string)$movement['account_id'] === $id) {
                $journal[(string)$movement['batch_id']] = $movement;
            }
        }
        $rows = [];
        $opened = false;
        $openingAtStart = false;
        foreach ($batches as $b) {
            $movement = $journal[(string)$b['id']] ?? null;
            if (!$movement || (!empty($f['to']) && $b['date'] > $f['to'])) {
                continue;
            }
            $delta = Exact::cents($movement['delta'], signed:true, zero:true);
            $sum = $sum->plus($delta);
            if ($b['kind'] === 'OPENING') {
                $opened = true;
            }
            if (!empty($f['from']) && $b['date'] < $f['from']) {
                $prior = $prior->plus($delta);
                $openingAtStart = $opened;
                continue;
            }
            $change = $change->plus($delta);
            $rows[] = ['id' => (string)$b['id'],'movementId' => (string)$movement['id'],'reference' => 'MA-'.str_pad((string)$b['id'], 6, '0', STR_PAD_LEFT),'date' => $b['date'],'kind' => $b['kind'],'sourceReference' => $b['source_ref'],'correctsId' => $b['corrects_id'],'reason' => $b['reason'],'actorId' => (string)$b['actor_id'],'createdUtc' => $b['created_at'],'delta' => $movement['delta'],'balance' => $r['matched'] && $opened ? Exact::money($sum) : null];
        }
        return ['account' => $a,'from' => $f['from'] ?? '','to' => $f['to'] ?? '','currency' => 'PKR','opening' => $r['matched'] && $openingAtStart ? Exact::money($prior) : null,'movement' => Exact::money($change),'closing' => $r['matched'] && $opened ? Exact::money($sum) : null,'verified' => $r['matched'] && $opened,'records' => $rows,'reconciliationMatched' => $r['matched'],'coverage' => 'An explicit opening starts verified coverage on its recorded date. Earlier holdings are unknown. Transfers do not affect party ledgers, revenue or expenses.'];
    }
    private static function input(object $input, array $fields): array
    {
        if (array_diff(array_keys(get_object_vars($input)), [...$fields,'date','reason','approved'])) {
            self::fail('MONEY_UNSUPPORTED_FIELD', 'Unsupported money-entry field. No deficit override is available.', 400);
        }
        if (($input->approved ?? null) !== true) {
            self::fail('MONEY_APPROVAL_REQUIRED', 'An authorized administrator must explicitly verify this entry.', 400);
        }
        $p = [];
        foreach ([...$fields,'date','reason'] as $key) {
            if (!property_exists($input, $key) || !is_string($input->$key)) {
                self::fail('MONEY_INPUT_REQUIRED', 'Complete all money-entry fields.', 400);
            }$p[$key] = V1Input::trim($input->$key);
        }
        V1Input::reportFilters(['from' => $p['date']]);
        if ($p['date'] > SimpleV1::today() || mb_strlen($p['reason']) < 3 || mb_strlen($p['reason']) > 500) {
            self::fail('MONEY_EVIDENCE_REQUIRED', 'Use a current/past business date and a justification of 3–500 characters.', 400);
        }
        if (isset($p['reference']) && (mb_strlen($p['reference']) < 1 || mb_strlen($p['reference']) > 150)) {
            self::fail('MONEY_SOURCE_REQUIRED', 'Enter a source document reference of up to 150 characters.', 400);
        }
        return $p;
    }
    public function post(string $operation, object $input, array $user): array
    {
        $fields = match($operation) {
            'opening' => ['accountId','amount','reference'],'transfer' => ['fromAccountId','toAccountId','amount','reference'],'source' => ['accountId','direction','amount','reference'],'reversal' => ['batchId'],default => throw new ApiError(404, 'NOT_FOUND')
        };
        $p = self::input($input, $fields);
        $kind = '';
        $from = $to = $opening = $corrects = null;
        if ($operation === 'opening') {
            $kind = 'OPENING';
            $to = $opening = $p['accountId'];
            $sourceType = 'OPENING';
            $sourceKey = self::sourceKey($to);
        } elseif ($operation === 'transfer') {
            $kind = 'TRANSFER';
            $from = $p['fromAccountId'];
            $to = $p['toAccountId'];
            $sourceType = 'TRANSFER';
            $sourceKey = self::sourceKey($p['reference']);
        } elseif ($operation === 'source') {
            if (!in_array($p['direction'], ['IN','OUT'], true)) {
                self::fail('MONEY_DIRECTION_REQUIRED', 'Choose money in or money out.', 400);
            }
            $kind = $p['direction'] === 'IN' ? 'SOURCE_CREDIT' : 'SOURCE_DEBIT';
            if ($p['direction'] === 'IN') {
                $to = $p['accountId'];
            } else {
                $from = $p['accountId'];
            }$sourceType = 'EXTERNAL';
            $sourceKey = self::sourceKey($p['reference']);
            if ($this->db->one("SELECT id FROM v1_documents WHERE status='POSTED' AND (official_number=? OR JSON_UNQUOTE(JSON_EXTRACT(payload,'$.reference'))=? OR JSON_UNQUOTE(JSON_EXTRACT(payload,'$.chequeReference'))=?) LIMIT 1", [$p['reference'],$p['reference'],$p['reference']])) {
                self::fail('MONEY_LEGACY_LINK_PENDING', 'This reference belongs to an existing UPMS document. Account linking is not available yet; do not re-enter it as external money.');
            }
        } else {
            if (!self::validId($p['batchId'])) {
                self::fail('INVALID_MONEY_BATCH', 'Choose an original movement.', 400);
            }
            $original = $this->db->one('SELECT * FROM money_batches WHERE id=?', [$p['batchId']]);
            if (!$original || !in_array($original['kind'], ['TRANSFER','SOURCE_CREDIT','SOURCE_DEBIT'], true) || $p['date'] < $original['date']) {
                self::fail('MONEY_REVERSAL_NOT_ALLOWED', 'Only an original transfer or external movement can be reversed on or after its date. Opening corrections require a separate reviewed policy.');
            }
            $kind = 'REVERSAL';
            $from = $original['to_account_id'];
            $to = $original['from_account_id'];
            $corrects = (string)$original['id'];
            $p['amount'] = $original['amount'];
            $p['reference'] = 'Reversal of MA-'.str_pad($corrects, 6, '0', STR_PAD_LEFT);
            $sourceType = 'REVERSAL';
            $sourceKey = self::sourceKey($corrects);
        }
        $amount = Exact::money(Exact::cents($p['amount'], zero:$kind === 'OPENING'));
        $ids = array_values(array_filter([$from,$to], fn ($id) => $id !== null));
        foreach ($ids as $id) {
            if (!self::validId((string)$id)) {
                self::fail('MONEY_ACCOUNT_REQUIRED', 'Select valid account identities.', 400);
            }
        }
        if ($from !== null && $to !== null && (string)$from === (string)$to) {
            self::fail('MONEY_DISTINCT_ACCOUNTS', 'Choose two different accounts.', 400);
        }
        $locked = $this->db->rows('SELECT * FROM money_accounts WHERE id IN('.implode(',', array_fill(0, count($ids), '?')).') ORDER BY id FOR UPDATE', $ids);
        if (count($locked) !== count($ids)) {
            self::fail('MONEY_ACCOUNT_NOT_FOUND', 'A selected account no longer exists.', 404);
        }
        $r = $this->reconciliation();
        if (!$r['matched']) {
            self::fail('MONEY_RECONCILIATION_REQUIRED', 'Money history does not reconcile. No entry was posted; investigate the evidence.');
        }
        if ($this->db->one('SELECT id FROM money_batches WHERE source_type=? AND source_key=?', [$sourceType,$sourceKey])) {
            self::fail('MONEY_DUPLICATE_SOURCE', 'This source/opening/transfer/reversal is already recorded. Use the existing reference.');
        }
        $before = [];
        $after = [];
        foreach ($locked as $a) {
            $id = (string)$a['id'];
            $before[$id] = isset($r['openings'][$id]) ? $r['balances'][$id] : null;
            if ($kind !== 'OPENING' && (!isset($r['openings'][$id]) || $a['type'] === 'CHEQUE_CUSTODY')) {
                self::fail('MONEY_NOT_SPENDABLE_OR_UNVERIFIED', 'Verify the cash/bank opening first. Cheque custody cannot fund or receive ordinary movements.');
            }
            $latest = $this->db->one('SELECT MAX(b.date) AS date FROM money_batches b JOIN money_movements m ON m.batch_id=b.id WHERE m.account_id=?', [$id]);
            if (($latest['date'] ?? null) !== null && $p['date'] < $latest['date']) {
                self::fail('MONEY_BACKDATE_NOT_ALLOWED', 'This account has later posted movements. Choose a date on or after its latest movement.');
            }
            if ($from !== null && (string)$from === $id && self::balanceCents($r['balances'][$id])->compareTo(Exact::cents($amount, zero:true)) < 0) {
                self::fail('MONEY_INSUFFICIENT_FUNDS', 'The source account has insufficient verified funds. No administrator deficit override is available.');
            }
        }
        $now = BusinessCommand::timestamp();
        $this->db->execute('INSERT INTO money_batches(kind,date,source_type,source_key,source_ref,from_account_id,to_account_id,opening_account_id,amount,corrects_id,actor_id,reason,created_at) VALUES(?,?,?,?,?,?,?,?,?,?,?,?,?)', [$kind,$p['date'],$sourceType,$sourceKey,$p['reference'],$from,$to,$opening,$amount,$corrects,$user['id'],$p['reason'],$now]);
        $id = $this->db->pdo()->lastInsertId();
        $batch = $this->db->one('SELECT * FROM money_batches WHERE id=?', [$id]);
        foreach (self::legs($batch) as $account => $delta) {
            $this->db->execute('INSERT INTO money_movements(batch_id,account_id,delta) VALUES(?,?,?)', [$id,(string)$account,$delta]);
            $after[$account] = Exact::money(self::balanceCents($r['balances'][$account])->plus(Exact::cents($delta, signed:true, zero:true)));
        }
        ksort($before, SORT_NATURAL);
        ksort($after, SORT_NATURAL);
        $e = ['batchHash' => self::batchHash($batch),'approvedBy' => $user['id'],'approval' => 'Designated administrator self-approval with justification','before' => $before,'after' => $after];
        $this->db->execute('INSERT INTO money_audit(batch_id,actor_id,action,reason,evidence,created_at) VALUES(?,?,?,?,?,?)', [$id,$user['id'],'money.posted.'.$kind,$p['reason'],BusinessCommand::json((object)$e),$now]);
        if (!$this->reconciliation()['matched']) {
            self::fail('MONEY_POSTING_RECONCILIATION_FAILED', 'Posting did not reconcile and was rolled back.');
        }
        return ['id' => $id,'reference' => 'MA-'.str_pad($id, 6, '0', STR_PAD_LEFT),'kind' => $kind,'amount' => $amount,'status' => 'POSTED','correctsId' => $corrects];
    }
}
