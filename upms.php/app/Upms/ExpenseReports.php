<?php

declare(strict_types=1);

namespace App\Upms;

use Brick\Math\BigInteger as N;

final class ExpenseReports
{
    public function __construct(private readonly Database $db)
    {
    }
    public static function summarize(array $records): array
    {
        $overall = N::zero();
        $categories = [];
        $employees = [];
        $dates = [];
        foreach ($records as $r) {
            $n = Exact::cents($r['amount'], signed:true);
            $overall = $overall->plus($n);
            foreach ([['category',$r['categoryId'] ?? 'legacy',$r['categoryName']],['employee',$r['employeeId'] ?? 'none',$r['employeeName'] ?? 'No associated employee'],['date',$r['date'],$r['date']]] as [$type,$key,$name]) {
                if ($type === 'category') {
                    $groups = &$categories;
                } elseif ($type === 'employee') {
                    $groups = &$employees;
                } else {
                    $groups = &$dates;
                }
                if (!isset($groups[$key])) {
                    $groups[$key] = ['identity' => (string)$key,'names' => [],'total' => N::zero(),'records' => []];
                }
                if (!in_array($name, $groups[$key]['names'], true)) {
                    $groups[$key]['names'][] = $name;
                }$groups[$key]['total'] = $groups[$key]['total']->plus($n);
                $groups[$key]['records'][] = $r;
                unset($groups);
            }
        }
        $convert = static function ($groups) {
            ksort($groups, SORT_NATURAL);
            return array_values(array_map(fn ($g) => [...$g,'total' => Exact::money($g['total'])], $groups));
        };
        return ['overall' => Exact::money($overall),'categoryGroups' => $convert($categories),'employeeGroups' => $convert($employees),'dateGroups' => $convert($dates),'count' => count($records)];
    }
    public function generate(array $input): array
    {
        $allowed = ['from','to','categoryId','employeeId',...(config('upms.money_accounts_enabled', false) ? ['moneyAccountId'] : [])];
        if (array_diff(array_keys($input), $allowed)) {
            throw new ApiError(400, 'INVALID_EXPENSE_FILTER');
        }
        $filters = V1Input::reportFilters(array_filter(array_intersect_key($input, array_flip(['from','to'])), fn ($v) => $v !== ''));
        if (isset($filters['from'],$filters['to']) && $filters['from'] > $filters['to']) {
            V1Input::field('from', 'From date must not follow To date.');
        }
        $directory = (new ExpenseMasters($this->db))->directory();
        if (!(new Reconciliation($this->db))->run()['matched']) {
            throw new ApiError(409, 'EXPENSE_FINANCIAL_RECONCILIATION_REQUIRED', publicMessage:'Posted financial evidence does not reconcile. No expense totals were published.');
        }
        foreach (['categoryId' => ['categories','legacy'],'employeeId' => ['employees','none']] as $field => [$list,$special]) {
            if (!empty($input[$field]) && $input[$field] !== $special && !array_filter($directory[$list], fn ($a) => $a['id'] === $input[$field])) {
                V1Input::field($field, 'Choose an existing reporting identity.');
            }
        }
        $money = [];
        if (config('upms.money_accounts_enabled', false)) {
            MoneySchema::ready($this->db);
            $overview = (new MoneyAccounts($this->db))->overview();
            if (!$overview['reconciliation']['matched']) {
                throw new ApiError(409, 'MONEY_RECONCILIATION_REQUIRED');
            }$money = $overview['accounts'];
            if (!empty($input['moneyAccountId']) && !array_filter($money, fn ($a) => $a['id'] === $input['moneyAccountId'])) {
                V1Input::field('moneyAccountId', 'Choose an existing paying account.');
            }
        }
        $documents = $this->db->rows("SELECT * FROM v1_documents WHERE (kind='EXPENSE' OR (kind='FINANCIAL_REFUND' AND JSON_UNQUOTE(JSON_EXTRACT(payload,'$.originalKind'))='EXPENSE')) AND status='POSTED' ORDER BY date,id");
        $evidence = ExpenseMasters::documents($documents, $this->db->rows('SELECT * FROM expense_master_audit ORDER BY id'));
        if (!$evidence['matched']) {
            throw new ApiError(409, 'EXPENSE_DOCUMENT_SNAPSHOT_REQUIRED', publicMessage:'Expense snapshots do not reconcile. No report totals were published.');
        }
        $claims = [];
        if ($money) {
            foreach ($this->db->rows("SELECT * FROM money_batches WHERE source_type='DOCUMENT'") as $b) {
                $claims[substr($b['source_ref'], 9)] = $b;
            }
        }
        $allocations = LaborExtensionSchema::enabled() ? array_column($this->db->rows('SELECT * FROM labor_expense_allocations'), null, 'expense_id') : [];
        $records = [];
        $reportDocuments = [];
        foreach ($documents as $d) {
            $a = $allocations[$d['id']] ?? null;
            $reportDocuments[] = [$d, $a, false];
            if ($a) { $adjustment = $d; $adjustment['date'] = $a['date']; $reportDocuments[] = [$adjustment, $a, true]; }
        }
        foreach ($reportDocuments as [$d,$allocation,$adjustment]) {
            $p = SimpleV1::payload($d);
            $mapped = isset($p['expenseMasterVersion']);
            $category = $mapped ? $p['categorySnapshot'] : null;
            $employee = $mapped ? ($p['employeeSnapshot'] ?? null) : null;
            $claim = $claims[(string)$d['id']] ?? null;
            $account = $claim ? ($claim['from_account_id'] ?? $claim['to_account_id']) : null;
            if ((isset($filters['from']) && $d['date'] < $filters['from']) || (isset($filters['to']) && $d['date'] > $filters['to']) || (!empty($input['categoryId']) && $input['categoryId'] !== ($category['id'] ?? 'legacy')) || (!empty($input['employeeId']) && $input['employeeId'] !== ($employee['id'] ?? 'none')) || (!empty($input['moneyAccountId']) && $input['moneyAccountId'] !== $account)) {
                continue;
            }
            $records[] = [...($allocation ? ['laborAllocationId' => (string)$allocation['id'],'classificationDate' => $allocation['date'],'rowKey' => ($adjustment ? 'allocation-' : 'expense-').$d['id'],'classification' => $adjustment ? 'HAFTA_NONCASH_CLASSIFICATION' : 'ORIGINAL_CASH_APPLIED_TO_HAFTA'] : []),'documentId' => (string)$d['id'],'reference' => $p['reference'],'date' => $d['date'],'categoryId' => $category['id'] ?? null,'categoryName' => $category['name'] ?? 'Legacy / unmapped','legacyCategory' => $mapped ? null : $p['category'],'employeeId' => $employee['id'] ?? null,'employeeName' => $employee['name'] ?? null,'description' => ($adjustment ? 'Noncash Hafta classification: ' : '').$p['description'],'payee' => $p['payee'],'amount' => ($adjustment || $d['kind'] === FinancialCorrections::KIND) ? '-'.$d['total'] : $d['total'],...($d['kind'] === FinancialCorrections::KIND ? ['kind' => FinancialCorrections::KIND,'originalDocumentId' => $p['originalId']] : []),'method' => $p['method'],'moneyAccountId' => $account,'moneyAccountName' => array_values(array_filter($money, fn ($a) => $a['id'] === $account))[0]['name'] ?? null];
        }
        usort($records, fn ($a,$b) => strcmp($a['date'],$b['date']) ?: strcmp($a['rowKey'] ?? $a['documentId'],$b['rowKey'] ?? $b['documentId']));
        $refundCount = count(array_filter($records, fn ($r) => ($r['kind'] ?? '') === FinancialCorrections::KIND));
        return [...($refundCount ? ['refundsCount' => $refundCount,'expenseCoverage' => 'Signed rows: original paid expenses positive; evidenced full refunds negative. Originals remain visible.'] : []),'company' => 'Unique Plastic Industry','currency' => 'PKR','filters' => $input,'records' => $records,...self::summarize($records),...(LaborExtensionSchema::enabled() ? ['classificationPolicy' => 'Original expense remains positive on its original date. Approved Hafta allocations add a signed negative noncash classification adjustment on the selected effective date. They do not represent refunds or new cash movements.'] : []), 'coverage' => 'Posted paid business expenses only. Legacy categories are unmapped; historical names are retained. This is not payroll or a profit-and-loss report.','snapshotReconciliation' => $evidence,'draftsExcluded' => (int)$this->db->one("SELECT COUNT(*) n FROM v1_documents WHERE kind='EXPENSE' AND status='DRAFT'")['n']];
    }
}
