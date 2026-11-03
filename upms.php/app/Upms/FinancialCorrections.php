<?php

declare(strict_types=1);

namespace App\Upms;

use Brick\Math\BigInteger as N;

/** Record evidenced full refunds only. Never repair an entry by inventing a money movement. */
final class FinancialCorrections
{
    public const KIND = 'FINANCIAL_REFUND';
    public const VERSION = 'p32b3-full-same-account-v1';
    public const TYPE = 'ACTUAL_FULL_REFUND';
    public function __construct(private readonly Database $db)
    {
    }
    public static function hash(array $row): string
    {
        return hash('sha256', BusinessCommand::canonical((object)array_map(fn ($v) => $v === null ? null : (string)$v, $row)));
    }
    public static function number(string $id): string
    {
        return 'RF-'.str_pad($id, 4, '0', STR_PAD_LEFT);
    }
    public static function incoming(array $p): bool
    {
        return ($p['originalKind'] ?? '') !== 'CLIENT_PAYMENT';
    }
    public static function policy(string $kind, string $scenario = self::TYPE): array
    {
        $reason = match(true) {
            $scenario !== self::TYPE => 'This is not an evidenced full refund. Incorrect entries, duplicate entry without returned funds, category/employee changes, partial or cross-account corrections require a separate reviewed policy. No money movement was created.',
            $kind === 'PURCHASE' => 'Purchase corrections are blocked. Available stock, consumed/sold goods, supplier return evidence, vendor credit versus actual refund and exact historical rates need a complete approved workflow.',
            !in_array($kind, ['CLIENT_PAYMENT','VENDOR_PAYMENT','EXPENSE'], true) => 'Only an original integrated cash/bank customer payment, vendor payment or paid expense can receive a full refund. Cheques and corrections of corrections are unsupported.',
            default => ''
        };
        return ['eligible' => $reason === '','code' => $reason === '' ? 'ACTUAL_FULL_REFUND' : 'CORRECTION_POLICY_REQUIRED','reason' => $reason];
    }
    public static function ready(Database $db): void
    {
        if (!config('upms.financial_refunds_enabled', false)) {
            throw new ApiError(503, 'FINANCIAL_REFUNDS_DISABLED', publicMessage:'Financial refunds are not enabled.', entry:false);
        }
        if (!config('upms.money_accounts_enabled', false) || !config('upms.expense_masters_enabled', false)) {
            throw new ApiError(503, 'REFUND_INTEGRATION_REQUIRED', publicMessage:'Refunds require the reviewed money and expense integrations.', entry:false);
        }
        MoneySchema::ready($db);
        ExpenseSchema::ready($db);
        if ($db->pdo()->query('SELECT DATABASE()')->fetchColumn() === 'upms_v1') {
            try {
                $path = (string)config('upms.refund_release_approval');
                $a = json_decode(file_get_contents($path), true, 32, JSON_THROW_ON_ERROR);
                $guard = (string)config('upms.expense_guard_evidence');
                if (($a['status'] ?? '') !== 'OWNER_APPROVED_REFUND_RELEASE' || ($a['refundPolicyVersion'] ?? '') !== self::VERSION || ($a['targetHash'] ?? '') !== CleanInitialization::target($db->pdo()) || ($a['guardEvidenceSha256'] ?? '') !== hash_file('sha256', $guard) || ($a['recoveryFormat'] ?? '') !== FinancialRecovery::FORMAT || ($a['recoveryVerified'] ?? false) !== true) {
                    throw new \RuntimeException();
                }
            } catch (\Throwable) {
                throw new ApiError(503, 'REFUND_PRODUCTION_APPROVAL_REQUIRED', entry:false);
            }
        }
    }
    public function review(string $id, string $scenario = self::TYPE): array
    {
        if (!preg_match('/^[1-9][0-9]{0,19}$/D', $id)) {
            throw new ApiError(400, 'INVALID_INPUT');
        }
        $source = $this->db->one('SELECT * FROM v1_documents WHERE id=?', [$id]);
        if (!$source) {
            throw new ApiError(404, 'NOT_FOUND');
        }
        $p = SimpleV1::payload($source);
        $policy = self::policy($source['kind'], $scenario);
        $batch = $this->db->one("SELECT * FROM money_batches WHERE source_type='DOCUMENT' AND source_key=?", [MoneyAccounts::sourceKey($id)]);
        $old = $this->db->one("SELECT id FROM v1_documents WHERE corrects_id=? AND status='POSTED'", [$id]);
        $reason = $policy['reason'];
        if (LaborExtensionSchema::enabled() && $this->db->one('SELECT id FROM labor_expense_allocations WHERE expense_id=?', [$id])) {
            $reason = 'This original expense is allocated to Hafta. Refunding it requires a separately reviewed labor correction policy; the original cash movement is retained.';
        }
        if ($reason === '') {
            if ($source['status'] !== 'POSTED' || ($p['moneyIntegrationVersion'] ?? '') !== MoneyDocuments::VERSION || !$batch || !in_array($p['method'] ?? '', ['CASH','BANK_TRANSFER'], true)) {
                $reason = 'This source has no verified integrated cash/bank effect. Historical/unlinked and cheque entries cannot be refunded by inference.';
            } elseif ($source['kind'] === 'EXPENSE' && (($p['expenseMasterVersion'] ?? '') !== 'p32b2' || ($p['expensePurpose'] ?? '') !== 'BUSINESS_EXPENSE')) {
                $reason = 'An expense refund requires the retained category/employee business-expense snapshots. No legacy mapping is inferred.';
            } elseif ($old) {
                $reason = 'This source already has a posted correction. A second or partial refund is not allowed.';
            }
        }
        $party = $source['party_id'] ? $this->db->one('SELECT * FROM v1_parties WHERE id=?', [$source['party_id']]) : null;
        if ($reason === '' && $source['kind'] !== 'EXPENSE' && (!$party || !$party['active'] || !$party['opening_verified'])) {
            $reason = 'The original party must still be active with a verified opening. Review its status before recording a refund.';
        }
        $overview = (new MoneyAccounts($this->db))->overview();
        $account = array_values(array_filter($overview['accounts'], fn ($a) => $a['id'] === ($p['moneyAccountId'] ?? '')))[0] ?? null;
        if ($reason === '' && (!$overview['reconciliation']['matched'] || !(new Reconciliation($this->db))->run()['matched'])) {
            $reason = 'Financial/source evidence does not reconcile. Investigate it; no repair or refund was performed.';
        }
        if ($reason === '' && (!$account || !$account['verified'] || !$account['spendable'])) {
            $reason = 'The original money account is unavailable or unverified. No alternate refund account is permitted.';
        }
        $incoming = $source['kind'] !== 'CLIENT_PAYMENT';
        $remaining = null;
        $sufficient = false;
        if ($account && $account['balance'] !== null) {
            $cents = N::of(str_replace('.', '', $account['balance']));
            $amount = Exact::cents($source['total'], zero:true);
            $sufficient = $incoming || $cents->compareTo($amount) >= 0;
            $remaining = Exact::money($incoming ? $cents->plus($amount) : $cents->minus($amount));
        }
        return ['eligible' => $reason === '','canPost' => $reason === '' && $sufficient,'blockedReason' => $reason,'code' => $reason === '' ? 'ACTUAL_FULL_REFUND' : 'CORRECTION_POLICY_REQUIRED','policyVersion' => self::VERSION,'originalId' => (string)$source['id'],'originalKind' => $source['kind'],'originalVersion' => $source['version'],'originalReference' => $source['official_number'] ?: 'Expense '.$source['id'],'originalAmount' => $source['total'],'originalDate' => $source['date'],'party' => $p['partySnapshot']['name'] ?? $p['payee'] ?? '','sourceMoneyBatchId' => $batch ? (string)$batch['id'] : null,'account' => $account,'moneyDirection' => $incoming ? 'IN' : 'OUT','expectedBalance' => $remaining,'sufficientFunds' => $sufficient,'partyEffect' => match($source['kind']) {
            'CLIENT_PAYMENT' => 'Debit the original client; restore its receivable by the full refund amount.','VENDOR_PAYMENT' => 'Credit the original vendor; restore the company payable by the full returned amount.',default => 'Offset the original expense in the same historical category/employee; no party or stock entry.'
        },'correctionId' => $old ? (string)$old['id'] : null,'datePolicy' => 'Current Pakistan business date only. No partial, backdated or cross-account refund.','today' => SimpleV1::today()];
    }
    private static function input(object $input): array
    {
        $fields = ['originalId','originalVersion','sourceMoneyBatchId','date','type','actualFundsReturned','reason','evidence','reference'];
        if (array_diff(array_keys(get_object_vars($input)), $fields)) {
            throw new ApiError(409, 'CORRECTION_POLICY_REQUIRED', publicMessage:'Amounts, accounts, partial allocations and snapshots cannot be overridden. Only an evidenced full refund to the original account is supported.');
        }
        $p = get_object_vars($input);
        if (($p['type'] ?? '') !== self::TYPE) {
            throw new ApiError(409, 'CORRECTION_POLICY_REQUIRED', publicMessage:self::policy('CLIENT_PAYMENT', (string)($p['type'] ?? ''))['reason']);
        }
        foreach (['originalId','sourceMoneyBatchId'] as $key) {
            if (!is_string($p[$key] ?? null) || !preg_match('/^[1-9][0-9]{0,19}$/D', $p[$key])) {
                V1Input::field($key, 'Review the original document and account movement.');
            }
        }
        if (!is_int($p['originalVersion'] ?? null) || $p['originalVersion'] < 1) {
            V1Input::field('originalVersion', 'Review the current original version.');
        }
        if (($p['actualFundsReturned'] ?? false) !== true) {
            V1Input::field('actualFundsReturned', 'Confirm that the full amount was actually returned through the original account. An incorrect entry without returned funds is not a refund.', 'REFUND_EVIDENCE_REQUIRED');
        }
        foreach (['reason' => [3,500],'evidence' => [10,500],'reference' => [1,150]] as $key => [$min,$max]) {
            if (!is_string($p[$key] ?? null) || mb_strlen(V1Input::trim($p[$key])) < $min || mb_strlen(V1Input::trim($p[$key])) > $max) {
                V1Input::field($key, 'Enter the required reason, refund evidence and unique reference.', 'REFUND_EVIDENCE_REQUIRED');
            }$p[$key] = V1Input::trim($p[$key]);
        }
        if (($p['date'] ?? '') !== SimpleV1::today()) {
            V1Input::field('date', 'Record this refund on the current Pakistan business date. Older/future dates require a separate policy.', 'REFUND_DATE_POLICY');
        }
        return $p;
    }
    private function reference(string $reference, ?string $id = null): void
    {
        $key = MoneyAccounts::sourceKey($reference);
        if ($this->db->one("SELECT id FROM money_batches WHERE source_type='EXTERNAL' AND source_key=?", [$key])) {
            throw new ApiError(409, 'MONEY_MANUAL_SOURCE_CONFLICT');
        }
        foreach ($this->db->rows("SELECT id,payload FROM v1_documents WHERE kind=? AND status='POSTED'", [self::KIND]) as $d) {
            if (MoneyAccounts::sourceKey(SimpleV1::payload($d)['reference']) === $key) {
                throw new ApiError(409, 'DUPLICATE_REFUND_REFERENCE');
            }
        }
        if ($id && $this->db->one("SELECT id FROM money_batches WHERE source_type='EXTERNAL' AND source_key=?", [MoneyAccounts::sourceKey(self::number($id))])) {
            throw new ApiError(409, 'MONEY_MANUAL_SOURCE_CONFLICT');
        }
    }
    public function draft(object $input, array $user, BusinessCommand $commands): array
    {
        $raw = self::input($input);
        $r = $this->review($raw['originalId']);
        if (!$r['eligible']) {
            throw new ApiError(409, 'CORRECTION_POLICY_REQUIRED', publicMessage:$r['blockedReason']);
        }
        if ($r['originalVersion'] !== $raw['originalVersion'] || $r['sourceMoneyBatchId'] !== $raw['sourceMoneyBatchId']) {
            throw new ApiError(409, 'REFUND_SOURCE_STALE');
        }
        $this->reference($raw['reference']);
        $source = $this->db->one('SELECT * FROM v1_documents WHERE id=?', [$raw['originalId']]);
        $batch = $this->db->one('SELECT * FROM money_batches WHERE id=?', [$raw['sourceMoneyBatchId']]);
        $p = [...SimpleV1::payload($source),'kind' => self::KIND,'date' => $raw['date'],'lines' => [],'amount' => $source['total'],'originalId' => $raw['originalId'],'correctsId' => $raw['originalId'],'originalKind' => $source['kind'],'originalReference' => $r['originalReference'],'originalExternalReference' => SimpleV1::payload($source)['reference'] ?? '','sourceVersion' => $source['version'],'sourceHash' => self::hash($source),'sourceMoneyBatchId' => (string)$batch['id'],'sourceMoneyHash' => self::hash($batch),'refundPolicyVersion' => self::VERSION,'refundType' => self::TYPE,'actualFundsReturned' => true,'recordedBusinessDate' => $raw['date'],'reason' => $raw['reason'],'refundEvidence' => $raw['evidence'],'reference' => $raw['reference']];
        $records = new BusinessRecords($this->db);
        $id = $records->insert('v1_documents', ['kind' => self::KIND,'date' => $p['date'],'party_id' => $source['party_id'],'status' => 'DRAFT','version' => 1,'payload' => BusinessCommand::json($p),'actor_id' => $user['id'],'created_at' => BusinessCommand::timestamp()]);
        $commands->audit($user, 'refund.draft.saved', $id, $p['reason']);
        return ['id' => $id];
    }
    public function post(string $id, object $input, array $user, BusinessCommand $commands): array
    {
        if (array_keys(get_object_vars($input)) !== ['version'] || !is_int($input->version)) {
            throw new ApiError(400, 'INVALID_INPUT');
        }
        $d = $this->db->one('SELECT * FROM v1_documents WHERE id=? FOR UPDATE', [$id]);
        if (!$d || $d['kind'] !== self::KIND || $d['status'] !== 'DRAFT' || $d['version'] !== $input->version) {
            throw new ApiError(409, 'IMMUTABLE_OR_STALE_REFUND');
        }
        $p = SimpleV1::payload($d);
        if ($p['date'] !== SimpleV1::today()) {
            throw new ApiError(409, 'REFUND_DATE_POLICY', publicMessage:'This draft date is stale. Cancel it and prepare a fresh refund after verifying the actual funds again.');
        }
        $r = $this->review($p['originalId']);
        if (!$r['eligible']) {
            throw new ApiError(409, 'CORRECTION_POLICY_REQUIRED', publicMessage:$r['blockedReason']);
        }
        $source = $this->db->one('SELECT * FROM v1_documents WHERE id=?', [$p['originalId']]);
        $batch = $this->db->one('SELECT * FROM money_batches WHERE id=?', [$p['sourceMoneyBatchId']]);
        if (!$batch || $p['sourceHash'] !== self::hash($source) || $p['sourceMoneyHash'] !== self::hash($batch) || $p['sourceVersion'] !== $source['version']) {
            throw new ApiError(409, 'REFUND_SOURCE_STALE');
        }
        if (!$r['sufficientFunds']) {
            throw new ApiError(409, 'MONEY_INSUFFICIENT_FUNDS', publicMessage:'The original account has insufficient verified funds for this customer refund. No deficit or alternate account is allowed.');
        }
        $this->reference($p['reference'], $id);
        (new MoneyDocuments($this->db))->beforePost($p, $id);
        $records = new BusinessRecords($this->db);
        if ($p['originalKind'] !== 'EXPENSE') {
            $records->insert('v1_party_journal', ['document_id' => $id,'party_id' => $source['party_id'],'debit' => $p['originalKind'] === 'CLIENT_PAYMENT' ? $p['amount'] : '0.00','credit' => $p['originalKind'] === 'VENDOR_PAYMENT' ? $p['amount'] : '0.00','particulars' => 'Evidenced full '.strtolower($p['originalKind']).' refund']);
        }
        $money = (new MoneyAccounts($this->db))->postDocument($d, $p, $p['amount'], $user);
        $number = self::number($id);
        $records->update('v1_documents', ['status' => 'POSTED','total' => $p['amount'],'official_number' => $number,'corrects_id' => $p['originalId']], ['id' => $id,'version' => $d['version'],'status' => 'DRAFT']);
        $commands->audit($user, 'document.posted', $number, $p['reason']);
        if (!(new MoneyAccounts($this->db))->reconciliation()['matched'] || !self::reconcile($this->db->rows('SELECT * FROM v1_documents'), $this->db->rows('SELECT * FROM money_batches'), $this->db->rows('SELECT * FROM v1_party_journal'), $this->db->rows('SELECT * FROM v1_lines'), $this->db->rows('SELECT * FROM v1_stock_journal'))['matched']) {
            throw new ApiError(409, 'REFUND_RECONCILIATION_FAILED');
        }
        return ['id' => $id,'status' => 'POSTED','official_number' => $number,'total' => $p['amount'],'moneyMovement' => $money];
    }
    public function cancel(string $id, object $input, array $user, BusinessCommand $commands): array
    {
        $p = V1Input::cancellation($input);
        $d = $this->db->one('SELECT * FROM v1_documents WHERE id=?', [$id]);
        if (!$d || $d['kind'] !== self::KIND || $d['status'] !== 'DRAFT' || $d['version'] !== $p['version']) {
            throw new ApiError(409, 'IMMUTABLE_OR_STALE_REFUND');
        }
        (new BusinessRecords($this->db))->update('v1_documents', ['status' => 'CANCELLED'], ['id' => $id,'status' => 'DRAFT']);
        $commands->audit($user, 'refund.draft.cancelled', $id, $p['reason']);
        return ['id' => $id,'status' => 'CANCELLED'];
    }
    private static function leg(array $b, string $id, ?string $from, ?string $to, string $amount, string $date, string $kind): bool
    {
        return ($b['source_type'] ?? '') === 'DOCUMENT' && ($b['source_ref'] ?? '') === 'UPMS-DOC:'.$id && ($b['source_key'] ?? '') === MoneyAccounts::sourceKey($id) && ($b['kind'] ?? '') === $kind && ($b['amount'] ?? '') === $amount && ($b['date'] ?? '') === $date && (($b['from_account_id'] ?? null) === null ? null : (string)$b['from_account_id']) === $from && (($b['to_account_id'] ?? null) === null ? null : (string)$b['to_account_id']) === $to;
    }
    /** Source-level checks also run in money reconciliation and isolated recovery. */
    public static function sources(array $documents, array $batches): array
    {
        $docs = [];
        $claims = [];
        $seen = [];
        $findings = [];
        $count = 0;
        foreach ($documents as $d) {
            $docs[(string)$d['id']] = $d;
        }foreach ($batches as $b) {
            if ($b['source_type'] === 'DOCUMENT') {
                $claims[$b['source_ref']] = $b;
            }
        }
        foreach ($documents as $d) {
            if ($d['kind'] !== self::KIND || $d['status'] !== 'POSTED') {
                continue;
            }$count++;
            $p = SimpleV1::payload($d);
            $id = (string)$d['id'];
            $s = $docs[$p['originalId'] ?? ''] ?? null;
            $sp = $s ? SimpleV1::payload($s) : [];
            $b = $claims['UPMS-DOC:'.($p['originalId'] ?? '')] ?? null;
            $effect = $claims['UPMS-DOC:'.$id] ?? null;
            $ok = $s && $s['status'] === 'POSTED' && self::policy($s['kind'])['eligible'] && $b && $effect && ($sp['moneyIntegrationVersion'] ?? '') === MoneyDocuments::VERSION && in_array($sp['method'] ?? '', ['CASH','BANK_TRANSFER'], true) && ($p['refundPolicyVersion'] ?? '') === self::VERSION && ($p['refundType'] ?? '') === self::TYPE && ($p['actualFundsReturned'] ?? false) === true && mb_strlen(V1Input::trim($p['refundEvidence'] ?? '')) >= 10 && mb_strlen(V1Input::trim($p['reason'] ?? '')) >= 3 && ($p['sourceHash'] ?? '') === self::hash($s) && ($p['sourceMoneyHash'] ?? '') === self::hash($b) && ($p['sourceMoneyBatchId'] ?? '') === (string)$b['id'] && ($p['sourceVersion'] ?? 0) === (int)$s['version'] && ($p['originalKind'] ?? '') === $s['kind'] && ($p['correctsId'] ?? '') === (string)$s['id'] && (string)$d['corrects_id'] === (string)$s['id'] && $d['total'] === $s['total'] && ($p['amount'] ?? '') === $s['total'] && $d['party_id'] === $s['party_id'] && ($p['moneyAccountId'] ?? '') === ($sp['moneyAccountId'] ?? null) && ($p['method'] ?? '') === ($sp['method'] ?? null) && $d['official_number'] === self::number($id) && $d['date'] >= $s['date'] && $d['date'] === ($p['date'] ?? '') && $d['date'] === ($p['recordedBusinessDate'] ?? '') && ($p['lines'] ?? null) === [];
            if ($s && $b && $effect) {
                $account = $sp['moneyAccountId'] ?? '';
                $received = $s['kind'] === 'CLIENT_PAYMENT';
                $from = $received ? null : $account;
                $to = $received ? $account : null;
                if (!self::leg($b, (string)$s['id'], $from, $to, $s['total'], $s['date'], $received ? 'SOURCE_CREDIT' : 'SOURCE_DEBIT') || !self::leg($effect, $id, $to, $from, $s['total'], $d['date'], $received ? 'SOURCE_DEBIT' : 'SOURCE_CREDIT')) {
                    $ok = false;
                }
            }
            if ($effect) {
                try {
                    $postedDay = (new \DateTimeImmutable($effect['created_at'], new \DateTimeZone('UTC')))->setTimezone(new \DateTimeZone('Asia/Karachi'))->format('Y-m-d');
                    if ($postedDay !== $d['date']) {
                        $ok = false;
                    }
                } catch (\Throwable) {
                    $ok = false;
                }
            }
            foreach (['partySnapshot','category','categoryId','categorySnapshot','employeeId','employeeSnapshot','businessExpenseConfirmed','expensePurpose','expenseMasterVersion','employeePayeeVersion','payee','description'] as $field) {
                if (BusinessCommand::canonical($p[$field] ?? null) !== BusinessCommand::canonical($sp[$field] ?? null)) {
                    $ok = false;
                }
            }
            if ($s && $s['kind'] === 'EXPENSE' && (($sp['expenseMasterVersion'] ?? '') !== 'p32b2' || ($sp['expensePurpose'] ?? '') !== 'BUSINESS_EXPENSE')) {
                $ok = false;
            }
            $key = (string)($p['originalId'] ?? '');
            if (isset($seen[$key])) {
                $ok = false;
            }$seen[$key] = true;
            if (!$ok) {
                $findings[] = ['code' => 'REFUND_SOURCE_EFFECT_MISMATCH','documentId' => $id];
            }
        }
        return ['matched' => !$findings,'findings' => $findings,'postedRefunds' => $count,'policyVersion' => self::VERSION,'authenticity' => 'Operator attestation and consistency evidence, not proof that physical funds moved or protection against fabricated SQL inserts.'];
    }
    public static function reconcile(array $documents, array $batches, array $journals, array $lines, array $stock): array
    {
        $r = self::sources($documents, $batches);
        $findings = $r['findings'];
        foreach ($documents as $d) {
            if ($d['kind'] !== self::KIND || $d['status'] !== 'POSTED') {
                continue;
            }$p = SimpleV1::payload($d);
            $id = (string)$d['id'];
            $js = array_values(array_filter($journals, fn ($j) => (string)$j['document_id'] === $id));
            $expected = $p['originalKind'] === 'EXPENSE' ? [] : [['party_id' => (string)$d['party_id'],'debit' => $p['originalKind'] === 'CLIENT_PAYMENT' ? $d['total'] : '0.00','credit' => $p['originalKind'] === 'VENDOR_PAYMENT' ? $d['total'] : '0.00']];
            $actual = array_map(fn ($j) => ['party_id' => (string)$j['party_id'],'debit' => $j['debit'],'credit' => $j['credit']], $js);
            if ($actual !== $expected || array_filter([...$lines,...$stock], fn ($row) => (string)$row['document_id'] === $id)) {
                $findings[] = ['code' => 'REFUND_JOURNAL_STOCK_MISMATCH','documentId' => $id];
            }
        }
        return [...$r,'matched' => !$findings,'findings' => $findings];
    }
}
