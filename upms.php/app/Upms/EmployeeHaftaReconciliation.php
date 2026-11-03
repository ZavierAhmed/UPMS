<?php

declare(strict_types=1);

namespace App\Upms;

use Brick\Math\BigInteger as N;

/** Offline evaluator: consumes immutable rows, never queries or repairs a database. */
final class EmployeeHaftaReconciliation
{
    public static function commands(array $data): array
    {
        $findings = [];
        $claims = [];
        $production = [];
        foreach ($data['v1_commands'] ?? [] as $c) {
            try {
                $r = json_decode($c['result'], false, 512, JSON_THROW_ON_ERROR);
                if (isset($r->employeeHaftaVersion)) {
                    if (!EmployeeHafta::validReceipt($r, (string)$c['actor_id'], $data)) {
                        throw new \RuntimeException();
                    }$claims[$r->entryType.'|'.$r->id] = ($claims[$r->entryType.'|'.$r->id] ?? 0) + 1;
                } elseif (($r->status ?? '') === 'POSTED' && isset($r->id) && property_exists($r, 'official_number') && property_exists($r, 'total')) {
                    $production[(string)$r->id][] = [$r,(string)$c['actor_id']];
                }
            } catch (\Throwable) {
                $findings[] = ['code' => 'LABOR_COMMAND_INVALID','id' => $c['key']];
            }
        }
        foreach (['labor_openings' => 'OPENING','labor_payments' => 'PAYMENT'] as $table => $type) {
            foreach ($data[$table] as $r) {
                if (($claims[$type.'|'.$r['id']] ?? 0) !== 1) {
                    $findings[] = ['code' => 'LABOR_COMMAND_MISSING_OR_DUPLICATE','id' => $type.'|'.$r['id']];
                }
            }
        }
        $docs = array_column($data['v1_documents'], null, 'id');
        $seen = [];
        foreach ($data['labor_earnings'] as $e) {
            $id = (string)$e['document_id'];
            if (isset($seen[$id])) {
                continue;
            }$seen[$id] = true;
            $matches = $production[$id] ?? [];
            $d = $docs[$id] ?? null;
            $valid = false;
            if (count($matches) === 1 && $d) {
                [$r,$actor] = $matches[0];
                $expected = (object)['id' => $id,'status' => 'POSTED','official_number' => $d['official_number'],'total' => $d['total']];
                $valid = BusinessCommand::canonical($r) === BusinessCommand::canonical($expected) && $actor === (string)$e['actor_id'];
            }if (!$valid) {
                $findings[] = ['code' => 'LABOR_PRODUCTION_COMMAND_MISSING','id' => $id];
            }
        }
        return ['matched' => !$findings,'findings' => $findings];
    }
    public static function run(array $data): array
    {
        $findings = [];
        $events = [];
        $expected = [];
        $entries = [];
        $claims = [];
        $docs = array_column($data['v1_documents'], 'payload', 'id');
        $docRows = array_column($data['v1_documents'], null, 'id');
        $lines = array_column($data['v1_lines'], null, 'id');
        $accounts = array_column($data['money_accounts'], null, 'id');
        $batches = array_column($data['money_batches'], null, 'id');
        $fail = static function ($code, $id) use (&$findings) {
            $findings[] = ['code' => $code,'id' => (string)$id];
        };
        $hist = [];
        foreach ($data['expense_master_audit'] as $r) {
            if ($r['entity'] === 'EMPLOYEE') {
                $hist[(string)$r['entity_id'].'|'.$r['version']] = json_decode($r['snapshot'], true, 32, JSON_THROW_ON_ERROR);
            }
        }
        $snapshot = static function ($r) use ($hist) {
            $s = json_decode($r['employee_snapshot'], true, 32, JSON_THROW_ON_ERROR);
            $old = $hist[(string)$r['employee_id'].'|'.($s['version'] ?? '')] ?? null;
            return $old && BusinessCommand::canonical((object)$s) === BusinessCommand::canonical((object)$old) && ($s['active'] ?? false) === true;
        };
        foreach ($docRows as $id => $d) {
            $p = SimpleV1::payload($d);
            if ($d['kind'] !== 'PRODUCTION' || $d['status'] !== 'POSTED' || ($p['laborAllocation'] ?? '') !== 'ASSIGNED') {
                continue;
            }
            try {
                if (($p['laborVersion'] ?? '') !== EmployeeHafta::VERSION) {
                    throw new \RuntimeException();
                }
                $rates = EmployeeHafta::rates($p['lines']);
                if ($rates['total'] !== $p['laborTotal'] || $rates['lines'] !== $p['lines']) {
                    throw new \RuntimeException();
                }
                foreach ($lines as $line) {
                    if ((string)$line['document_id'] === (string)$id) {
                        $expected[(string)$line['id']] = [$d,$p,$line];
                    }
                }
                if (count(array_filter($lines, fn ($l) => (string)$l['document_id'] === (string)$id)) !== count($p['lines'])) {
                    throw new \RuntimeException();
                }
            } catch (\Throwable) {
                $fail('LABOR_PRODUCTION_CLAIM_INVALID', $id);
            }
        }
        $open = [];
        foreach ($data['labor_openings'] as $r) {
            try {
                Exact::cents($r['amount'], zero:true);
                if (isset($open[(string)$r['employee_id']]) || !$snapshot($r) || mb_strlen(trim($r['reason'])) < 3 || trim($r['reference']) === '') {
                    throw new \RuntimeException();
                }$open[(string)$r['employee_id']] = $r;
                $events[(string)$r['employee_id']][] = ['date' => $r['date'],'order' => 0,'delta' => Exact::cents($r['amount'], zero:true)];
            } catch (\Throwable) {
                $fail('LABOR_OPENING_INVALID', $r['id']);
            }
            $entries['OPENING|'.$r['id']] = $r;
        }
        $seen = [];
        foreach ($data['labor_earnings'] as $r) {
            try {
                $id = (string)$r['line_id'];
                if (isset($seen[$id]) || !isset($expected[$id]) || !$snapshot($r)) {
                    throw new \RuntimeException();
                }$seen[$id] = true;
                [$d,$p,$l] = $expected[$id];
                $line = $p['lines'][$l['line_no'] - 1];
                $audit = array_values(array_filter($data['v1_audit'], fn ($a) => $a['action'] === 'document.posted' && $a['reference'] === (string)$d['id']));
                if (count($audit) !== 1 || (string)$r['actor_id'] !== (string)$audit[0]['actor_id'] || $r['created_at'] !== $audit[0]['created_at'] || (string)$r['document_id'] !== (string)$d['id'] || (string)$r['employee_id'] !== $p['productionEmployeeId'] || $r['employee_snapshot'] !== BusinessCommand::json($p['productionEmployeeSnapshot']) || (string)$r['item_id'] !== (string)$l['item_id'] || $r['item_snapshot'] !== $l['snapshot'] || $r['date'] !== $d['date'] || $r['quantity'] !== $l['quantity'] || $r['labor_rate'] !== $line['laborRate'] || $r['amount'] !== Exact::money(Exact::integer($r['quantity'])->multipliedBy(Exact::cents($r['labor_rate'], zero:true)))) {
                    throw new \RuntimeException();
                }
                $o = $open[(string)$r['employee_id']] ?? null;
                if ($o && $r['date'] < $o['date']) {
                    throw new \RuntimeException();
                }
                $events[(string)$r['employee_id']][] = ['date' => $r['date'],'order' => 1,'delta' => Exact::cents($r['amount'], zero:true)];
            } catch (\Throwable) {
                $fail('LABOR_EARNING_SOURCE_MISMATCH', $r['id']);
            }
            $entries['EARNING|'.$r['id']] = $r;
        }
        foreach ($expected as $id => $r) {
            if (!isset($seen[$id])) {
                $fail('LABOR_EARNING_MISSING', $id);
            }
        }
        $refs = [];
        foreach ($data['labor_payments'] as $r) {
            try {
                $b = $batches[$r['money_batch_id']] ?? null;
                $a = $accounts[$r['money_account_id']] ?? null;
                $o = $open[(string)$r['employee_id']] ?? null;
                $ref = (string)$r['employee_id'].'|'.$r['reference_key'];
                if (isset($refs[$ref]) || !$snapshot($r) || !$b || !$a || !$o || $r['date'] < $o['date'] || $r['reference_key'] !== MoneyAccounts::sourceKey($r['reference']) || trim($r['reference']) === '' || mb_strlen(trim($r['reason'])) < 3 || $b['kind'] !== 'SOURCE_DEBIT' || $b['source_type'] !== 'EXTERNAL' || $b['source_ref'] !== 'UPMS-LABOR:'.$r['id'] || $b['source_key'] !== MoneyAccounts::sourceKey($b['source_ref']) || (string)$b['from_account_id'] !== (string)$r['money_account_id'] || $b['to_account_id'] !== null || $b['amount'] !== $r['amount'] || $b['date'] !== $r['date'] || (string)$b['actor_id'] !== (string)$r['actor_id'] || $b['created_at'] !== $r['created_at'] || $b['reason'] !== $r['reason'] || $a['type'] !== ($r['method'] === 'CASH' ? 'CASH_HOLDER' : ($r['method'] === 'BANK_TRANSFER' ? 'BANK' : '')) || isset($claims[(string)$b['id']])) {
                    throw new \RuntimeException();
                }
                $refs[$ref] = true;
                $claims[(string)$b['id']] = true;
                $events[(string)$r['employee_id']][] = ['date' => $r['date'],'order' => 2,'delta' => Exact::cents($r['amount'])->negated()];
            } catch (\Throwable) {
                $fail('LABOR_PAYMENT_SOURCE_MISMATCH', $r['id']);
            }
            $entries['PAYMENT|'.$r['id']] = $r;
        }
        foreach ($data['money_batches'] as $b) {
            if (str_starts_with(strtolower($b['source_ref']), 'upms-labor:') && !isset($claims[(string)$b['id']])) {
                $fail('LABOR_ORPHAN_MONEY_CLAIM', $b['id']);
            }if ($b['corrects_id'] !== null && isset($claims[(string)$b['corrects_id']])) {
                $fail('LABOR_UNAPPROVED_PAYMENT_REVERSAL', $b['id']);
            }
        }
        $audits = [];
        foreach ($data['labor_audit'] as $a) {
            $key = $a['entry_type'].'|'.$a['entry_id'];
            $r = $entries[$key] ?? null;
            if (!$r || isset($audits[$key]) || $a['payload_hash'] !== EmployeeHafta::rowHash($r) || (string)$a['employee_id'] !== (string)$r['employee_id'] || (string)$a['actor_id'] !== (string)$r['actor_id'] || $a['created_at'] !== $r['created_at']) {
                $fail('LABOR_AUDIT_MISMATCH', $a['id']);
            }$audits[$key] = true;
        }
        foreach ($entries as $key => $r) {
            if (!isset($audits[$key])) {
                $fail('LABOR_AUDIT_MISSING', $key);
            }
        }
        $balances = [];
        foreach ($events as $id => $rows) {
            usort($rows, fn ($a, $b) => strcmp($a['date'], $b['date']) ?: $a['order'] <=> $b['order']);
            $balance = N::zero();
            foreach ($rows as $r) {
                $balance = $balance->plus($r['delta']);
                if ($balance->isNegative()) {
                    $fail('LABOR_NEGATIVE_PAYABLE', $id);
                }
            }$balances[(string)$id] = isset($open[(string)$id]) ? Exact::money($balance) : null;
        }
        return ['matched' => !$findings,'findings' => $findings,'balances' => $balances,'earnings' => count($data['labor_earnings']),'payments' => count($data['labor_payments']),'openings' => count($data['labor_openings']),'authenticityVerified' => false,'coverage' => 'Canonical source/snapshot/arithmetic/audit consistency; not proof of physical funds or protection against fabricated consistent SQL inserts.'];
    }
}
