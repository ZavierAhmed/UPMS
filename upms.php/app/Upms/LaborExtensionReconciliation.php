<?php

declare(strict_types=1);

namespace App\Upms;

/** Read-only consistency evidence, never authority to repair or infer missing history. */
final class LaborExtensionReconciliation
{
    public static function run(array $data, bool $strictCommands = false): array
    {
        $findings = [];
        $fail = static function (string $code, mixed $id) use (&$findings): void {
            $findings[] = ['code' => $code, 'id' => (string)$id];
        };
        $entries = [];
        $docs = array_column($data['v1_documents'] ?? [], null, 'id');
        $claims = [];
        foreach ($data['labor_expense_allocations'] ?? [] as $r) {
            $entries['EXPENSE_ALLOCATION|'.$r['id']] = $r;
            try {
                $s = LaborExpenseAllocation::source((string)$r['expense_id'], $data, (string)$r['id']);
                $d = $s['document']; $b = $s['batch']; $m = $s['movement'];
                $opening = array_values(array_filter($data['labor_openings'], fn ($o) => (string)$o['employee_id'] === (string)$r['employee_id']));
                if (count($opening) !== 1 || $opening[0]['date'] > $d['date'] || $r['date'] < $d['date'] || $r['date'] > SimpleV1::today()
                    || $r['source_date'] !== $d['date'] || $r['amount'] !== $d['total']
                    || (string)$r['employee_id'] !== (string)$s['payload']['employeeSnapshot']['id']
                    || $r['employee_snapshot'] !== BusinessCommand::json($s['payload']['employeeSnapshot'])
                    || $r['reference'] !== $s['payload']['reference'] || mb_strlen(V1Input::trim($r['reason'])) < 10
                    || (string)$r['source_batch_id'] !== (string)$b['id'] || (string)$r['source_movement_id'] !== (string)$m['id']
                    || $r['source_hash'] !== EmployeeHafta::rowHash($d) || $r['batch_hash'] !== EmployeeHafta::rowHash($b)
                    || $r['movement_hash'] !== EmployeeHafta::rowHash($m)) {
                    throw new \RuntimeException();
                }
                foreach (['expense_id','source_batch_id','source_movement_id'] as $field) {
                    $key = $field.'|'.$r[$field];
                    if (isset($claims[$key])) { throw new \RuntimeException(); }
                    $claims[$key] = true;
                }
                foreach (['labor_earnings','labor_payments','labor_expense_allocations'] as $table) {
                    foreach ($data[$table] ?? [] as $prior) {
                        if ((string)$prior['employee_id'] === (string)$r['employee_id'] && $prior['created_at'] <= $r['created_at'] && $prior['date'] > $r['date']) { throw new \RuntimeException(); }
                    }
                }
            } catch (\Throwable) { $fail('H1C_ALLOCATION_SOURCE_MISMATCH', $r['id']); }
        }
        $items = []; $openings = [];
        foreach ($data['stock_initializations'] ?? [] as $r) {
            $entries['STOCK_INITIALIZATION|'.$r['id']] = $r;
            try {
                $p = $docs[$r['production_document_id']] ?? null;
                $o = $docs[$r['opening_document_id']] ?? null;
                $pl = array_values(array_filter($data['v1_lines'], fn ($l) => (string)$l['document_id'] === (string)$r['production_document_id'] && (string)$l['item_id'] === (string)$r['item_id']));
                $ol = array_values(array_filter($data['v1_lines'], fn ($l) => (string)$l['document_id'] === (string)$r['opening_document_id']));
                $journal = array_values(array_filter($data['v1_stock_journal'], fn ($j) => (string)$j['item_id'] === (string)$r['item_id']));
                usort($journal, fn ($a,$b) => \Brick\Math\BigInteger::of($a['id'])->compareTo($b['id']));
                if (!$p || !$o || $p['status'] !== 'POSTED' || $p['kind'] !== 'PRODUCTION' || $o['status'] !== 'POSTED' || $o['kind'] !== 'STOCK_OPENING'
                    || (string)$r['approved'] !== '1' || \Brick\Math\BigInteger::of($o['id'])->compareTo($p['id']) <= 0 || isset($items[$r['item_id']]) || isset($openings[$o['id']])
                    || $r['opening_date'] !== $o['date'] || $r['production_date'] !== $p['date'] || $o['date'] > $p['date']
                    || $r['opening_hash'] !== EmployeeHafta::rowHash($o) || $r['production_hash'] !== EmployeeHafta::rowHash($p)
                    || count($pl) !== 1 || count($ol) !== 1 || (string)$ol[0]['item_id'] !== (string)$r['item_id'] || $ol[0]['quantity'] !== '0'
                    || count($journal) < 2 || (string)$journal[0]['document_id'] !== (string)$o['id'] || $journal[0]['delta'] !== '0'
                    || (string)$journal[1]['document_id'] !== (string)$p['id'] || $journal[1]['delta'] !== $pl[0]['quantity']) {
                    throw new \RuntimeException();
                }
                foreach ([$o,$p] as $d) {
                    $a = array_values(array_filter($data['v1_audit'], fn ($a) => $a['action'] === 'document.posted' && $a['reference'] === ($d['official_number'] ?: (string)$d['id'])));
                    if (count($a) !== 1 || (string)$a[0]['actor_id'] !== (string)$r['actor_id']) { throw new \RuntimeException(); }
                }
                $items[$r['item_id']] = true; $openings[$o['id']] = true;
            } catch (\Throwable) { $fail('H1C_INITIAL_STOCK_SOURCE_MISMATCH', $r['id']); }
        }
        $audits = [];
        foreach ($data['labor_extension_audit'] ?? [] as $a) {
            $key = $a['entry_type'].'|'.$a['entry_id']; $r = $entries[$key] ?? null;
            if (!$r || isset($audits[$key]) || $a['payload_hash'] !== EmployeeHafta::rowHash($r) || (string)$a['actor_id'] !== (string)$r['actor_id'] || $a['created_at'] !== $r['created_at']) {
                $fail('H1C_AUDIT_MISMATCH', $a['id']);
            }
            $audits[$key] = true;
        }
        foreach ($entries as $key => $r) { if (!isset($audits[$key])) { $fail('H1C_AUDIT_MISSING', $key); } }
        if ($strictCommands) {
            $covered = [];
            foreach ($data['v1_commands'] ?? [] as $c) {
                try {
                    $r = json_decode($c['result'], false, 512, JSON_THROW_ON_ERROR);
                    if (!property_exists($r, 'laborExtensionVersion')) { continue; }
                    if (!LaborExtensionReceipts::valid($r, (string)$c['actor_id'], $data)) { throw new \RuntimeException(); }
                    $keys = $r->operation === 'EXPENSE_ALLOCATION' ? ['EXPENSE_ALLOCATION|'.$r->id] : array_map(fn ($i) => 'STOCK_INITIALIZATION|'.$i->id, $r->initializations);
                    foreach ($keys as $key) { $covered[$key] = ($covered[$key] ?? 0) + 1; }
                } catch (\Throwable) { $fail('H1C_COMMAND_INVALID', $c['key']); }
            }
            foreach ($entries as $key => $r) { if (($covered[$key] ?? 0) !== 1) { $fail('H1C_COMMAND_MISSING_OR_DUPLICATE', $key); } }
        }
        return ['matched' => !$findings, 'findings' => $findings, 'allocations' => count($data['labor_expense_allocations'] ?? []), 'initializations' => count($data['stock_initializations'] ?? []), 'authenticityVerified' => false];
    }
}
