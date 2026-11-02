<?php

declare(strict_types=1);

namespace App\Upms;

final class ExpenseMasters
{
    public function __construct(private readonly Database $db)
    {
    }
    public static function name(string $name): string
    {
        return preg_replace('/\s+/u', ' ', V1Input::trim($name));
    }
    public static function key(string $name): string
    {
        return hash('sha256', mb_strtolower(self::name($name)));
    }
    public static function snapshot(array $row, string $entity): array
    {
        return ['id' => (string)$row['id'],'name' => $row['name'],'version' => (int)$row['version'],'active' => (bool)$row['active'],...($entity === 'CATEGORY' ? ['employeeBased' => (bool)$row['employee_based']] : ['designation' => $row['designation'],'phone' => $row['phone'],'notes' => $row['notes']]),'actorId' => (string)$row['actor_id'],'createdUtc' => $row['created_at'],'updatedUtc' => $row['updated_at']];
    }
    public static function display(array $row, string $entity): array
    {
        return ['id' => (string)$row['id'],'name' => $row['name'],'version' => (int)$row['version'],...($entity === 'CATEGORY' ? ['employeeBased' => (bool)$row['employee_based']] : [])];
    }
    public function rows(): array
    {
        return [$this->db->rows('SELECT * FROM expense_categories ORDER BY id'),$this->db->rows('SELECT * FROM employees ORDER BY id'),$this->db->rows('SELECT * FROM expense_master_audit ORDER BY id')];
    }
    public static function validSnapshot(array $s, string $entity): bool
    {
        $fields = ['id','name','version','active','actorId','createdUtc','updatedUtc',...($entity === 'CATEGORY' ? ['employeeBased'] : ['designation','phone','notes'])];
        if (count($s) !== count($fields) || array_diff(array_keys($s), $fields) || !is_string($s['id'] ?? null) || !preg_match('/^[1-9][0-9]{0,19}$/D', $s['id']) || !is_string($s['actorId'] ?? null) || !preg_match('/^[1-9][0-9]{0,19}$/D', $s['actorId']) || !is_int($s['version'] ?? null) || $s['version'] < 1 || !is_bool($s['active'] ?? null) || !is_string($s['name'] ?? null) || mb_strlen($s['name']) < 1 || mb_strlen($s['name']) > 150 || self::name($s['name']) !== $s['name']) {
            return false;
        }
        foreach (['createdUtc','updatedUtc'] as $time) {
            if (!is_string($s[$time] ?? null) || !preg_match('/^[0-9]{4}-[0-9]{2}-[0-9]{2} [0-9]{2}:[0-9]{2}:[0-9]{2}\.[0-9]{6}$/D', $s[$time])) {
                return false;
            }
        }
        if ($entity === 'CATEGORY') {
            return is_bool($s['employeeBased'] ?? null);
        }
        foreach (['designation' => 150,'phone' => 64,'notes' => 1000] as $key => $limit) {
            if (!is_string($s[$key] ?? null) || mb_strlen($s[$key]) > $limit) {
                return false;
            }
        }
        return $entity === 'EMPLOYEE';
    }
    public static function reconcile(array $categories, array $employees, array $audit): array
    {
        $masters = [];
        $versions = [];
        $findings = [];
        foreach (['CATEGORY' => $categories,'EMPLOYEE' => $employees] as $entity => $rows) {
            foreach ($rows as $row) {
                $masters[$entity.':'.$row['id']] = $row;
                if ($row['name_key'] !== self::key($row['name'])) {
                    $findings[] = ['code' => 'MASTER_NAME_KEY','entity' => $entity,'id' => (string)$row['id']];
                }
            }
        }
        foreach ($audit as $a) {
            $key = $a['entity'].':'.$a['entity_id'];
            $versions[$key][] = $a;
        }
        foreach ($versions as $key => $events) {
            $master = $masters[$key] ?? null;
            $previous = null;
            foreach ($events as $i => $event) {
                $snapshot = json_decode($event['snapshot'], true, 32, JSON_THROW_ON_ERROR);
                if (!self::validSnapshot($snapshot, $event['entity']) || !$master || (int)$event['version'] !== $i + 1 || ($snapshot['version'] ?? 0) !== $i + 1 || ($snapshot['id'] ?? '') !== (string)$event['entity_id'] || ($snapshot['actorId'] ?? '') !== (string)$event['actor_id'] || ($snapshot['updatedUtc'] ?? '') !== $event['created_at'] || $event['action'] !== ($i === 0 ? 'CREATE' : 'UPDATE') || ($previous && ($snapshot['createdUtc'] !== $previous['createdUtc'] || $snapshot['updatedUtc'] < $previous['updatedUtc']))) {
                    $findings[] = ['code' => 'MASTER_HISTORY_CHAIN','identity' => $key];
                }
                $previous = $snapshot;
            }
            if (!$master || BusinessCommand::canonical((object)$previous) !== BusinessCommand::canonical((object)self::snapshot($master, explode(':', $key)[0]))) {
                $findings[] = ['code' => 'MASTER_HISTORY_CURRENT','identity' => $key];
            }
        }
        foreach ($masters as $key => $row) {
            if (!isset($versions[$key])) {
                $findings[] = ['code' => 'MASTER_HISTORY_MISSING','identity' => $key];
            }
        }
        return ['matched' => !$findings,'findings' => $findings,'categories' => count($categories),'employees' => count($employees),'historyEvents' => count($audit)];
    }
    public function directory(): array
    {
        [$c,$e,$a] = $this->rows();
        $r = self::reconcile($c, $e, $a);
        if (!$r['matched']) {
            throw new ApiError(409, 'EXPENSE_MASTER_HISTORY_REQUIRED', publicMessage:'Expense master history does not reconcile. No repair was performed.');
        }
        return ['categories' => array_map(fn ($v) => self::snapshot($v, 'CATEGORY'), $c),'employees' => array_map(fn ($v) => self::snapshot($v, 'EMPLOYEE'), $e),'reconciliation' => $r];
    }
    public function save(string $entity, ?string $id, object $input, array $user): array
    {
        $this->directory();
        $table = $entity === 'CATEGORY' ? 'expense_categories' : 'employees';
        $allowed = $entity === 'CATEGORY' ? ['name','employeeBased','active','version'] : ['name','designation','phone','notes','active','version'];
        if (array_diff(array_keys(get_object_vars($input)), $allowed)) {
            V1Input::field('form', 'Unsupported master fields.');
        }
        if (!is_string($input->name ?? null) || mb_strlen(self::name($input->name)) < 1 || mb_strlen(self::name($input->name)) > 150) {
            V1Input::field('name', 'Enter a name of 1–150 characters.');
        }
        $name = self::name($input->name);
        $key = self::key($name);
        if (isset($input->active) && !is_bool($input->active)) {
            V1Input::field('active', 'Choose active or inactive.');
        }
        if ($entity === 'CATEGORY' && isset($input->employeeBased) && !is_bool($input->employeeBased)) {
            V1Input::field('employeeBased', 'Choose whether an employee is required.');
        }
        $old = $id ? $this->db->one('SELECT * FROM '.$table.' WHERE id=? FOR UPDATE', [$id]) : null;
        if ($id && (!$old || !is_int($input->version ?? null) || $old['version'] !== $input->version)) {
            throw new ApiError(409, 'EXPENSE_MASTER_STALE', publicMessage:'This entry changed. Refresh and review before saving.');
        }
        if (!$id && property_exists($input, 'version')) {
            V1Input::field('version', 'New entries do not accept a version.');
        }
        $duplicate = $this->db->one('SELECT id FROM '.$table.' WHERE name_key=?', [$key]);
        if ($duplicate && (!$id || (string)$duplicate['id'] !== $id)) {
            V1Input::field('name', 'This name already exists, including inactive entries. Use or review the existing record.', 'EXPENSE_MASTER_DUPLICATE');
        }
        $now = BusinessCommand::timestamp();
        $fields = ['name' => $name,'name_key' => $key,'active' => $input->active ?? (bool)($old['active'] ?? true),'version' => $old ? $old['version'] + 1 : 1,'actor_id' => $user['id'],'updated_at' => $now];
        if ($entity === 'CATEGORY') {
            $fields['employee_based'] = $input->employeeBased ?? (bool)($old['employee_based'] ?? false);
        } else {
            foreach (['designation' => 150,'phone' => 64,'notes' => 1000] as $field => $limit) {
                $v = $input->$field ?? ($old[$field] ?? '');
                if (!is_string($v) || mb_strlen(V1Input::trim($v)) > $limit) {
                    V1Input::field($field, 'This optional detail is too long or invalid.');
                }$fields[$field] = V1Input::trim($v);
            }
        }
        // Identifiers come only from the two fixed master schemas above; never extend the V1 mutation allowlist.
        if ($old) {
            $this->db->execute('UPDATE '.$table.' SET '.implode(',', array_map(fn ($key) => '`'.$key.'`=?', array_keys($fields))).' WHERE id=? AND version=?', [...array_values($fields),$id,$old['version']]);
        } else {
            $fields['created_at'] = $now;
            $this->db->execute('INSERT INTO '.$table.' (`'.implode('`,`', array_keys($fields)).'`) VALUES('.implode(',', array_fill(0, count($fields), '?')).')', array_values($fields));
            $id = $this->db->pdo()->lastInsertId();
        }
        $row = $this->db->one('SELECT * FROM '.$table.' WHERE id=?', [$id]);
        $snapshot = self::snapshot($row, $entity);
        $this->db->execute('INSERT INTO expense_master_audit(entity,entity_id,version,actor_id,action,snapshot,created_at) VALUES(?,?,?,?,?,?,?)', [$entity,$id,$row['version'],$user['id'],$old ? 'UPDATE' : 'CREATE',BusinessCommand::json($snapshot),$now]);
        $this->directory();
        return ['id' => (string)$id,'expenseMaster' => $entity,'version' => $row['version'],'record' => $snapshot];
    }
    public function prepare(array $p): array
    {
        if ($p['kind'] !== 'EXPENSE' || !config('upms.expense_masters_enabled', false)) {
            return $p;
        }
        ExpenseSchema::ready($this->db);
        $this->directory();
        if (($p['expensePurpose'] ?? '') !== 'BUSINESS_EXPENSE') {
            V1Input::field('expensePurpose', 'Only business expenses are supported. Advances and loans require separate accounting.');
        }
        $category = $this->db->one('SELECT * FROM expense_categories WHERE id=?', [$p['categoryId'] ?? null]);
        if (!$category || !$category['active']) {
            V1Input::field('categoryId', 'Choose an active expense category.', 'EXPENSE_CATEGORY_REQUIRED');
        }
        $employee = null;
        if ($category['employee_based']) {
            $employee = $this->db->one('SELECT * FROM employees WHERE id=?', [$p['employeeId'] ?? null]);
            if (!$employee || !$employee['active']) {
                V1Input::field('employeeId', 'Choose an active employee for this category.', 'EXPENSE_EMPLOYEE_REQUIRED');
            }
            if (($p['businessExpenseConfirmed'] ?? false) !== true) {
                V1Input::field('businessExpenseConfirmed', 'Confirm this is a business expense associated with an employee, not an advance or loan.', 'EMPLOYEE_EXPENSE_CONFIRMATION_REQUIRED');
            }
        } elseif (isset($p['employeeId'])) {
            V1Input::field('employeeId', 'This category does not require an employee. Clear the employee association.');
        }
        $p['category'] = $category['name'];
        $p['categorySnapshot'] = self::display($category, 'CATEGORY');
        $p['employeeSnapshot'] = $employee ? self::display($employee, 'EMPLOYEE') : null;
        if ($employee) {
            $p['payee'] = $employee['name'];
            $p['employeePayeeVersion'] = 'uat1';
        }
        $p['expenseMasterVersion'] = 'p32b2';
        return $p;
    }
    public function beforePost(array $p): void
    {
        if ($p['kind'] !== 'EXPENSE') {
            return;
        }
        if (!config('upms.expense_masters_enabled', false)) {
            if (isset($p['expenseMasterVersion'])) {
                throw new ApiError(409, 'EXPENSE_FEATURE_REQUIRED', publicMessage:'This draft requires the reviewed expense-master feature.');
            }return;
        }
        $current = $this->prepare($p);
        if (isset($p['employeePayeeVersion']) && (($p['employeePayeeVersion'] !== 'uat1') || !$current['employeeSnapshot'] || $p['payee'] !== $current['payee'])) {
            V1Input::field('employeeId', 'Employee payee changed. Review and save the expense again.', 'EXPENSE_PAYEE_REVIEW_REQUIRED');
        }
        foreach (['expenseMasterVersion','category','categorySnapshot','employeeSnapshot'] as $key) {
            if (BusinessCommand::canonical($current[$key]) !== BusinessCommand::canonical($p[$key] ?? null)) {
                V1Input::field('categoryId', 'Category or employee details changed. Edit, review and save this draft again.', 'EXPENSE_MASTER_REVIEW_REQUIRED');
            }
        }
    }
    public static function documents(array $documents, array $audit): array
    {
        $history = [];
        $findings = [];
        $mapped = 0;
        $legacy = 0;
        foreach ($audit as $a) {
            $history[$a['entity'].':'.$a['entity_id'].':'.$a['version']] = json_decode($a['snapshot'], true, 32, JSON_THROW_ON_ERROR);
        }
        foreach ($documents as $d) {
            if ($d['kind'] !== 'EXPENSE' || $d['status'] !== 'POSTED') {
                continue;
            }$p = SimpleV1::payload($d);
            if (!isset($p['expenseMasterVersion'])) {
                $legacy++;
                continue;
            }$mapped++;
            $category = $p['categorySnapshot'] ?? [];
            $employee = $p['employeeSnapshot'] ?? null;
            if (isset($p['employeePayeeVersion']) && ($p['employeePayeeVersion'] !== 'uat1' || !$employee || ($p['payee'] ?? '') !== ($employee['name'] ?? null))) {
                $findings[] = ['code' => 'EXPENSE_PAYEE_SNAPSHOT','documentId' => (string)$d['id']];
            }
            $check = function ($snapshot, $entity) use ($history) {
                $h = $history[$entity.':'.($snapshot['id'] ?? '').':'.($snapshot['version'] ?? '')] ?? null;
                if (!$h) {
                    return false;
                }$display = ['id' => $h['id'],'name' => $h['name'],'version' => $h['version'],...($entity === 'CATEGORY' ? ['employeeBased' => $h['employeeBased']] : [])];
                return BusinessCommand::canonical((object)$display) === BusinessCommand::canonical((object)$snapshot);
            };
            if (($p['expensePurpose'] ?? '') !== 'BUSINESS_EXPENSE' || $p['expenseMasterVersion'] !== 'p32b2' || !$check($category, 'CATEGORY') || ($p['categoryId'] ?? '') !== ($category['id'] ?? null) || ($p['category'] ?? '') !== ($category['name'] ?? null) || (($category['employeeBased'] ?? false) ? (!$employee || !$check($employee, 'EMPLOYEE') || ($p['employeeId'] ?? '') !== $employee['id'] || ($p['businessExpenseConfirmed'] ?? false) !== true) : ($employee !== null || isset($p['employeeId'])))) {
                $findings[] = ['code' => 'EXPENSE_DOCUMENT_SNAPSHOT','documentId' => (string)$d['id']];
            }
        }
        return ['matched' => !$findings,'findings' => $findings,'mappedExpenses' => $mapped,'legacyUnmappedExpenses' => $legacy];
    }
}
