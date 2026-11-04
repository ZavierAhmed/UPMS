<?php

declare(strict_types=1);

namespace App\Upms;

use Brick\Math\BigInteger as N;

final class EmployeeHafta
{
    public const VERSION = 'uath1-v1';
    public function __construct(private readonly Database $db)
    {
    }
    public static function permit(array $user, string $permission): void
    {
        if (!in_array($permission, $user['permissions'], true)) {
            throw new ApiError(403, 'ACCESS_DENIED');
        }
    }
    public static function rowHash(array $row): string
    {
        return hash('sha256', BusinessCommand::canonical((object)array_map(fn ($v) => $v === null ? null : (string)$v, $row)));
    }
    public static function receipt(array $row, string $type, ?array $batch = null): array
    {
        return ['id' => (string)$row['id'],'status' => 'POSTED','employeeHaftaVersion' => self::VERSION,'entryType' => $type,'entryHash' => self::rowHash($row),...($type === 'PAYMENT' ? ['amount' => $row['amount'],'moneyMovement' => (object)MoneyAccounts::receipt($batch)] : [])];
    }
    public static function validReceipt(object $receipt, string $actor, array $data): bool
    {
        if (($receipt->employeeHaftaVersion ?? '') !== self::VERSION || !is_string($receipt->id ?? null) || !in_array($receipt->entryType ?? '', ['OPENING','PAYMENT'], true)) {
            return false;
        }
        $table = $receipt->entryType === 'OPENING' ? 'labor_openings' : 'labor_payments';
        $rows = array_values(array_filter($data[$table] ?? [], fn ($r) => (string)$r['id'] === $receipt->id));
        if (count($rows) !== 1 || (string)$rows[0]['actor_id'] !== $actor) {
            return false;
        }$batch = null;
        if ($receipt->entryType === 'PAYMENT') {
            $matches = array_values(array_filter($data['money_batches'] ?? [], fn ($b) => (string)$b['id'] === (string)$rows[0]['money_batch_id']));
            if (count($matches) !== 1) {
                return false;
            }$batch = $matches[0];
        }
        return BusinessCommand::canonical($receipt) === BusinessCommand::canonical((object)self::receipt($rows[0], $receipt->entryType, $batch));
    }
    private function employee(string $id, string $field = 'employeeId'): array
    {
        $e = $this->db->one('SELECT * FROM employees WHERE id=? AND active=1', [$id]);
        if (!$e) {
            V1Input::field($field, 'Choose an active employee.', 'LABOR_ACTIVE_EMPLOYEE_REQUIRED');
        }
        return $e;
    }
    public static function rates(array $lines): array
    {
        if (!$lines) {
            V1Input::field('lines', 'Add at least one production item.');
        }
        $total = N::zero();
        foreach ($lines as $i => &$line) {
            $q = Exact::integer($line['quantity']);
            if (!isset($line['laborRate']) || $line['laborRate'] === '') {
                V1Input::field("lines.$i.laborRate", 'Enter an agreed labor rate, including a deliberate confirmed zero.');
            }
            $rate = V1Input::cents($line['laborRate'], "lines.$i.laborRate", true);
            if ($rate->isZero() && ($line['laborZeroConfirmed'] ?? false) !== true) {
                V1Input::field("lines.$i.laborRate", 'Confirm that this zero labor rate is deliberate.', 'LABOR_ZERO_CONFIRMATION_REQUIRED');
            }
            $line['laborRate'] = Exact::money($rate);
            $line['laborAmount'] = Exact::money($q->multipliedBy($rate));
            $total = $total->plus($q->multipliedBy($rate));
        }unset($line);
        return ['lines' => $lines,'total' => Exact::money($total)];
    }
    public function prepare(array $p, array $user): array
    {
        $has = isset($p['productionEmployeeId']) || array_filter($p['lines'], fn ($l) => isset($l['laborRate']) || isset($l['laborZeroConfirmed']));
        if ($p['kind'] !== 'PRODUCTION') {
            if ($has) {
                V1Input::field('productionEmployeeId', 'Labor allocation belongs only to Production Stock In.');
            }return $p;
        }
        if (!config('upms.employee_hafta_enabled', false)) {
            if ($has) {
                throw new ApiError(503, 'EMPLOYEE_HAFTA_DISABLED');
            }return $p;
        }
        EmployeeHaftaSchema::ready($this->db);
        self::permit($user, 'employee_labor.record');
        $p['laborVersion'] = self::VERSION;
        if (empty($p['productionEmployeeId'])) {
            if ($has) {
                V1Input::field('productionEmployeeId', 'Assign an employee before entering labor rates.');
            }
            $p['laborAllocation'] = 'UNALLOCATED';
            return $p;
        }
        $e = $this->employee($p['productionEmployeeId'], 'productionEmployeeId');
        $r = self::rates($p['lines']);
        $p['productionEmployeeSnapshot'] = ExpenseMasters::snapshot($e, 'EMPLOYEE');
        $p['laborAllocation'] = 'ASSIGNED';
        $p['laborTotal'] = $r['total'];
        $p['lines'] = $r['lines'];
        return $p;
    }
    public function beforePost(array $p, array $user): void
    {
        if ($p['kind'] !== 'PRODUCTION') {
            return;
        }
        if (!config('upms.employee_hafta_enabled', false)) {
            if (isset($p['laborVersion'])) {
                throw new ApiError(409, 'LABOR_FEATURE_REQUIRED');
            }return;
        }
        EmployeeHaftaSchema::ready($this->db);
        self::permit($user, 'employee_labor.record');
        if (!isset($p['laborVersion'])) {
            return;
        } // Existing history/drafts never acquire invented wages.
        if ($p['laborVersion'] !== self::VERSION) {
            throw new ApiError(409, 'LABOR_VERSION_REVIEW_REQUIRED');
        }
        if (($p['laborAllocation'] ?? '') === 'UNALLOCATED' && empty($p['productionEmployeeId'])) {
            return;
        }
        $employee = $this->employee($p['productionEmployeeId'] ?? '', 'productionEmployeeId');
        if (BusinessCommand::canonical((object)ExpenseMasters::snapshot($employee, 'EMPLOYEE')) !== BusinessCommand::canonical((object)($p['productionEmployeeSnapshot'] ?? []))) {
            throw new ApiError(409, 'LABOR_EMPLOYEE_CHANGED_REVIEW_DRAFT', publicMessage:'Employee details changed. Review and save the production draft again.');
        }
        $r = self::rates($p['lines']);
        if ($r['total'] !== ($p['laborTotal'] ?? '') || $r['lines'] !== $p['lines']) {
            throw new ApiError(409, 'LABOR_RATE_REVIEW_REQUIRED');
        }
        $opening = $this->db->one('SELECT * FROM labor_openings WHERE employee_id=?', [$employee['id']]);
        if ($opening && $p['date'] < $opening['date']) {
            throw new ApiError(409, 'LABOR_DATE_PRECEDES_OPENING');
        }
        $this->requireReconciled();
    }
    private function insert(string $table, array $row): string
    {
        if (!in_array($table, ['labor_earnings','labor_openings','labor_payments','labor_audit'], true) || !$this->db->pdo()->inTransaction()) {
            throw new \LogicException('LABOR_TRANSACTION_REQUIRED');
        }
        $this->db->execute('INSERT INTO `'.$table.'` (`'.implode('`,`', array_keys($row)).'`) VALUES('.implode(',', array_fill(0, count($row), '?')).')', array_values($row));
        return $this->db->pdo()->lastInsertId();
    }
    private function audit(string $table, string $id, string $type): void
    {
        $r = $this->db->one('SELECT * FROM `'.$table.'` WHERE id=?', [$id]);
        $this->insert('labor_audit', ['entry_type' => $type,'entry_id' => $id,'employee_id' => $r['employee_id'],'payload_hash' => self::rowHash($r),'actor_id' => $r['actor_id'],'created_at' => $r['created_at']]);
    }
    public function posted(array $d, array $p, array $user): void
    {
        if ($p['kind'] !== 'PRODUCTION' || ($p['laborAllocation'] ?? '') !== 'ASSIGNED') {
            return;
        }
        $audit = $this->db->one("SELECT * FROM v1_audit WHERE action='document.posted' AND reference=? ORDER BY id DESC LIMIT 1", [(string)$d['id']]);
        foreach ($this->db->rows('SELECT * FROM v1_lines WHERE document_id=? ORDER BY line_no', [$d['id']]) as $l) {
            $rate = $p['lines'][$l['line_no'] - 1]['laborRate'];
            $id = $this->insert('labor_earnings', ['document_id' => $d['id'],'line_id' => $l['id'],'employee_id' => $p['productionEmployeeId'],'employee_snapshot' => BusinessCommand::json($p['productionEmployeeSnapshot']),'item_id' => $l['item_id'],'item_snapshot' => $l['snapshot'],'date' => $p['date'],'quantity' => $l['quantity'],'labor_rate' => $rate,'amount' => Exact::money(Exact::integer($l['quantity'])->multipliedBy(Exact::cents($rate, zero:true))),'actor_id' => $user['id'],'created_at' => $audit['created_at']]);
            $this->audit('labor_earnings', $id, 'EARNING');
        }
        $this->requireReconciled();
    }
    private static function input(object $input, array $fields): array
    {
        $allowed = [...$fields,'approved'];
        if (array_diff(array_keys(get_object_vars($input)), $allowed) || ($input->approved ?? false) !== true) {
            throw new ApiError(400, 'LABOR_AUTHORIZED_CONFIRMATION_REQUIRED');
        }
        $p = [];
        foreach ($fields as $field) {
            if (!is_string($input->$field ?? null)) {
                V1Input::field($field, 'Complete this field.');
            }$p[$field] = V1Input::trim($input->$field);
        }
        V1Input::reportFilters(['from' => $p['date']]);
        if ($p['date'] > SimpleV1::today()) { throw new ApiError(400, 'FUTURE_DATE_NOT_ALLOWED'); }
        if (!preg_match('/^[1-9][0-9]*$/D', $p['employeeId'])) { V1Input::field('employeeId', 'Select an employee.'); }
        if (mb_strlen($p['reason']) < 3 || mb_strlen($p['reason']) > 500) { V1Input::field('reason', 'Enter reviewed evidence between 3 and 500 characters.'); }
        if (mb_strlen($p['reference']) < 1 || mb_strlen($p['reference']) > 150) { V1Input::field('reference', 'Enter an opening or payment reference up to 150 characters.'); }
        return $p;
    }
    public static function openingDetail(array $row, bool $verified): array
    {
        return ['employeeName' => json_decode($row['employee_snapshot'], true, 32, JSON_THROW_ON_ERROR)['name'],'id' => (string)$row['id'],'employeeId' => (string)$row['employee_id'],'date' => $row['date'],'amount' => $row['amount'],'reference' => $row['reference'],'reason' => $row['reason'],'createdAt' => $row['created_at'],'verified' => $verified,'immutable' => true];
    }
    public static function periodCoverage(?array $opening, bool $reconciled, string $from, string $to): string
    {
        if (!$reconciled || !$opening || $opening['date'] > $to) { return 'UNVERIFIED'; }
        return $opening['date'] <= $from ? 'FULL' : 'PARTIAL';
    }
    public function opening(object $input, array $user): array
    {
        self::permit($user, 'employee_labor.opening');
        $this->requireReconciled();
        $p = self::input($input, ['employeeId','date','amount','reference','reason']);
        $e = $this->employee($p['employeeId']);
        $existing = $this->db->one('SELECT * FROM labor_openings WHERE employee_id=?', [$e['id']]);
        if ($existing) {
            throw new ApiError(409, 'LABOR_OPENING_ALREADY_VERIFIED', publicMessage:'Employee labor opening already verified.', details:['opening' => self::openingDetail($existing, true)]);
        }
        if ($this->db->one('SELECT id FROM labor_earnings WHERE employee_id=? AND date<?', [$e['id'],$p['date']])) {
            throw new ApiError(409, 'LABOR_OPENING_PRECEDES_HISTORY_REQUIRED', fieldErrors:['date' => 'Choose a coverage date on or before the earliest recorded production earning.'], publicMessage:'Opening coverage cannot begin after existing labor earnings.');
        }
        $id = $this->insert('labor_openings', ['employee_id' => $e['id'],'employee_snapshot' => BusinessCommand::json(ExpenseMasters::snapshot($e, 'EMPLOYEE')),'date' => $p['date'],'amount' => Exact::money(Exact::cents($p['amount'], zero:true)),'reference' => $p['reference'],'reason' => $p['reason'],'actor_id' => $user['id'],'created_at' => BusinessCommand::timestamp()]);
        $this->audit('labor_openings', $id, 'OPENING');
        $this->requireReconciled();
        return self::receipt($this->db->one('SELECT * FROM labor_openings WHERE id=?', [$id]), 'OPENING');
    }
    public function pay(object $input, array $user): array
    {
        self::permit($user, 'employee_labor.pay');
        self::permit($user, 'money.accounts.view');
        $this->requireReconciled();
        $p = self::input($input, ['employeeId','date','amount','moneyAccountId','method','reference','reason']);
        $e = $this->employee($p['employeeId']);
        $amount = Exact::cents($p['amount']);
        $account = $this->db->one('SELECT * FROM money_accounts WHERE id=?', [$p['moneyAccountId']]);
        if (!in_array($p['method'], ['CASH','BANK_TRANSFER'], true) || !$account || $account['type'] !== ($p['method'] === 'CASH' ? 'CASH_HOLDER' : 'BANK')) {
            V1Input::field('moneyAccountId', 'Choose a matching cash holder or bank account.');
        }
        $opening = $this->db->one('SELECT * FROM labor_openings WHERE employee_id=?', [$e['id']]);
        if (!$opening || $p['date'] < $opening['date']) {
            throw new ApiError(409, 'LABOR_OPENING_UNVERIFIED', publicMessage:'Verify an evidenced employee opening before paying. Missing history is not a zero opening.');
        }
        $balance = Exact::cents($opening['amount'], zero:true);
        $latest = $opening['date'];
        foreach (['labor_earnings' => 1,'labor_payments' => -1,...(LaborExtensionSchema::enabled() ? ['labor_expense_allocations' => -1] : [])] as $table => $sign) {
            foreach ($this->db->rows('SELECT date,amount FROM `'.$table.'` WHERE employee_id=?', [$e['id']]) as $row) {
                $balance = $balance->plus(Exact::cents($row['amount'], zero:true)->multipliedBy($sign));
                $latest = max($latest, $row['date']);
            }
        }
        if ($p['date'] < $latest) {
            throw new ApiError(409, 'LABOR_PAYMENT_BACKDATE_NOT_ALLOWED', publicMessage:'This employee has later labor or payment history. Backdated settlements need a separately reviewed policy.');
        }
        if ($amount->compareTo($balance) > 0) {
            throw new ApiError(409, 'LABOR_PAYMENT_EXCEEDS_PAYABLE', publicMessage:'Payment exceeds the verified employee payable. Advances are not enabled.');
        }
        $key = MoneyAccounts::sourceKey($p['reference']);
        if ($this->db->one('SELECT id FROM labor_payments WHERE employee_id=? AND reference_key=?', [$e['id'],$key])) {
            throw new ApiError(409, 'LABOR_DUPLICATE_PAYMENT_REFERENCE');
        }
        // A server-generated source claim links one immutable settlement to one canonical money batch.
        $hex = bin2hex(random_bytes(16));
        $id = substr($hex, 0, 8).'-'.substr($hex, 8, 4).'-'.substr($hex, 12, 4).'-'.substr($hex, 16, 4).'-'.substr($hex, 20);
        $money = (new MoneyAccounts($this->db))->postLabor($id, $p, $user);
        $batch = $this->db->one('SELECT * FROM money_batches WHERE id=?', [$money['id']]);
        $this->insert('labor_payments', ['id' => $id,'employee_id' => $e['id'],'employee_snapshot' => BusinessCommand::json(ExpenseMasters::snapshot($e, 'EMPLOYEE')),'date' => $p['date'],'amount' => Exact::money($amount),'money_account_id' => $p['moneyAccountId'],'money_batch_id' => $money['id'],'method' => $p['method'],'reference' => $p['reference'],'reference_key' => $key,'reason' => $p['reason'],'actor_id' => $user['id'],'created_at' => $batch['created_at']]);
        $this->audit('labor_payments', $id, 'PAYMENT');
        $this->requireReconciled();
        return self::receipt($this->db->one('SELECT * FROM labor_payments WHERE id=?', [$id]), 'PAYMENT', $batch);
    }
    public function data(): array
    {
        $data = [];
        foreach (['labor_openings','labor_earnings','labor_payments','labor_audit','v1_documents','v1_lines','v1_audit','v1_commands','v1_items','v1_parties','users','expense_master_audit','money_batches','money_accounts',...(LaborExtensionSchema::enabled() ? ['labor_extension_receipts','labor_expense_allocations','stock_initializations','labor_extension_audit','money_movements','money_audit','v1_stock_journal'] : [])] as $table) {
            $data[$table] = $this->db->rows('SELECT * FROM `'.$table.'`');
        }
        return $data;
    }
    public function requireReconciled(): void
    {
        $data = $this->data();
        if (!EmployeeHaftaReconciliation::run($data)['matched'] || (LaborExtensionSchema::enabled() && !LaborExtensionReconciliation::run($data)['matched'])) {
            throw new ApiError(409, 'LABOR_RECONCILIATION_REQUIRED');
        }
    }
    public function report(array $input): array
    {
        if (array_diff(array_keys($input), ['from','to','employeeId'])) {
            throw new ApiError(400, 'LABOR_INVALID_FILTER');
        }
        $filters = V1Input::reportFilters(array_filter(array_intersect_key($input, array_flip(['from','to'])), fn ($v) => $v !== ''));
        $monday = (new \DateTimeImmutable(SimpleV1::today(), new \DateTimeZone('Asia/Karachi')))->modify('monday this week');
        $from = $filters['from'] ?? $monday->format('Y-m-d');
        $to = $filters['to'] ?? $monday->modify('+6 days')->format('Y-m-d');
        if ($from > $to || (!empty($input['employeeId']) && !preg_match('/^[1-9][0-9]*$/D', $input['employeeId']))) {
            throw new ApiError(400, 'LABOR_INVALID_FILTER');
        }
        $data = $this->data();
        $proof = EmployeeHaftaReconciliation::run($data);
        if (LaborExtensionSchema::enabled()) { $proof['extension'] = LaborExtensionReconciliation::run($data, true); $proof['matched'] = $proof['matched'] && $proof['extension']['matched']; }
        $blocks = [];
        foreach ($this->db->rows('SELECT * FROM employees ORDER BY id') as $e) {
            $id = (string)$e['id'];
            if (!empty($input['employeeId']) && $input['employeeId'] !== $id) {
                continue;
            }
            $opening = array_values(array_filter($data['labor_openings'], fn ($r) => (string)$r['employee_id'] === $id))[0] ?? null;
            $before = $closing = $opening ? Exact::cents($opening['amount'], zero:true) : N::zero();
            $earned = $paid = $directPaid = $allocatedPaid = N::zero();
            $records = [];
            $names = [];
            foreach (['labor_earnings' => 'EARNING','labor_payments' => 'PAYMENT',...(LaborExtensionSchema::enabled() ? ['labor_expense_allocations' => 'EXPENSE_ALLOCATION'] : [])] as $table => $type) {
                foreach ($data[$table] as $r) {
                    if ((string)$r['employee_id'] !== $id) {
                        continue;
                    }$n = Exact::cents($r['amount'], zero:true);
                    $signed = $type === 'EARNING' ? $n : $n->negated();
                    if ($r['date'] < $from) {
                        $before = $before->plus($signed);
                    }if ($r['date'] <= $to) {
                        $closing = $closing->plus($signed);
                    }
                    if ($r['date'] < $from || $r['date'] > $to) {
                        continue;
                    }$snap = json_decode($r['employee_snapshot'], true, 32, JSON_THROW_ON_ERROR);
                    $names[$snap['name']] = true;
                    if ($type === 'EARNING') {
                        $earned = $earned->plus($n);
                    } else {
                        $paid = $paid->plus($n);
                        if ($type === 'PAYMENT') { $directPaid = $directPaid->plus($n); } else { $allocatedPaid = $allocatedPaid->plus($n); }
                    }
                    $item = $type === 'EARNING' ? json_decode($r['item_snapshot'], true, 32, JSON_THROW_ON_ERROR) : null;
                    $records[] = ['id' => (string)$r['id'],'type' => $type,'date' => $r['date'],'description' => $item['description'] ?? ($type === 'EXPENSE_ALLOCATION' ? 'Existing expense applied to Hafta (no new cash)' : 'Hafta payment'),'employeeName' => $snap['name'],'quantity' => $r['quantity'] ?? '','laborRate' => $r['labor_rate'] ?? '','earned' => $type === 'EARNING' ? $r['amount'] : '','paid' => $type !== 'EARNING' ? $r['amount'] : '','documentId' => isset($r['document_id']) ? (string)$r['document_id'] : (isset($r['expense_id']) ? (string)$r['expense_id'] : null),'paymentId' => $type === 'PAYMENT' ? $r['id'] : null,'reference' => $r['reference'] ?? 'Production '.$r['document_id']];
                }
            }
            usort($records, fn ($a, $b) => strcmp($a['date'], $b['date']) ?: strcmp($a['type'], $b['type']) ?: strcmp($a['id'], $b['id']));
            if (!$names) {
                $names[$opening ? json_decode($opening['employee_snapshot'], true)['name'] : $e['name']] = true;
            }
            $coverageState = self::periodCoverage($opening, $proof['matched'], $from, $to);
            $blocks[] = ['coverageState' => $coverageState,'closingVerified' => $coverageState !== 'UNVERIFIED','closingAsOf' => $coverageState !== 'UNVERIFIED' ? $to : null,'existingOpening' => $opening ? self::openingDetail($opening, $proof['matched']) : null,'employeeId' => $id,'names' => array_keys($names),'currentName' => $e['name'],'active' => (bool)$e['active'],'verified' => $proof['matched'] && $opening !== null && $from >= $opening['date'],'opening' => $proof['matched'] && $opening && $from >= $opening['date'] ? Exact::money($before) : null,'earned' => Exact::money($earned),'paid' => Exact::money($paid),...(LaborExtensionSchema::enabled() ? ['directPaid' => Exact::money($directPaid),'allocatedPaid' => Exact::money($allocatedPaid)] : []),'closing' => $proof['matched'] && $opening && $to >= $opening['date'] ? Exact::money($closing) : null,'coverageDate' => $opening['date'] ?? null,'records' => $records];
        }
        $sum = static function ($key) use ($blocks) {
            if (!$blocks && in_array($key, ['opening','closing'], true)) { return null; }
            $n = N::zero();
            foreach ($blocks as $b) {
                if ($b[$key] === null) {
                    return null;
                }$n = $n->plus(Exact::cents($b[$key], signed:true, zero:true));
            }return Exact::money($n);
        };
        $expenses = (new ExpenseReports($this->db))->generate(['from' => $from,'to' => $to,...(!empty($input['employeeId']) ? ['employeeId' => $input['employeeId']] : [])]);
        $associated = array_map(fn ($r) => array_intersect_key($r, array_flip(['documentId','employeeId','employeeName','date','description','amount','reference'])), array_values(array_filter($expenses['records'], fn ($r) => $r['employeeId'] !== null && (!isset($r['laborAllocationId']) || $r['classificationDate'] > $to))));
        $unallocated = array_values(array_filter($data['v1_documents'], fn ($d) => $d['kind'] === 'PRODUCTION' && $d['status'] === 'POSTED' && $d['date'] >= $from && $d['date'] <= $to && (SimpleV1::payload($d)['laborAllocation'] ?? '') !== 'ASSIGNED'));
        $coverageStates = array_column($blocks, 'coverageState');
        $overallCoverage = !$blocks || in_array('UNVERIFIED', $coverageStates, true) ? 'UNVERIFIED' : (in_array('PARTIAL', $coverageStates, true) ? 'PARTIAL' : 'FULL');
        return ['coverageState' => $overallCoverage,'closingAsOf' => $sum('closing') !== null && $blocks ? $to : null,'title' => 'Employee Hafta','from' => $from,'to' => $to,'currency' => 'PKR','blocks' => $blocks,'totals' => ['opening' => $sum('opening'),'earned' => $sum('earned'),'paid' => $sum('paid'),...(LaborExtensionSchema::enabled() ? ['directPaid' => $sum('directPaid'),'allocatedPaid' => $sum('allocatedPaid')] : []),'closing' => $sum('closing')],'businessExpenses' => $associated,'businessExpensePolicy' => LaborExtensionSchema::enabled() ? 'Ordinary employee-associated business expenses are not deducted. Only explicitly approved existing-payment allocations reduce Hafta; original cash movements remain unchanged.' : 'Employee-associated business expenses — Not deducted from labor balance. Historical wage reclassification is not enabled.','unallocatedProductions' => array_map(fn ($d) => ['id' => (string)$d['id'],'date' => $d['date'],'label' => 'Labor not allocated'], $unallocated),'coverage' => 'Balances require explicit evidenced employee openings. Historical unallocated production is not assumed to have zero labor. No advances or automatic expense reclassification.','reconciliation' => $proof];
    }
}
