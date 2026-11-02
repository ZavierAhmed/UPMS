<?php

declare(strict_types=1);

namespace App\Upms;

/** Versioned document adapter. No separate command, transaction, schema or historic backfill. */
final class MoneyDocuments
{
    public const VERSION = 'p32b1';

    public function __construct(private readonly Database $db)
    {
    }

    public static function required(array $p): bool
    {
        return in_array($p['kind'], ['CLIENT_PAYMENT', 'VENDOR_PAYMENT', 'EXPENSE'], true)
            || ($p['kind'] === 'PURCHASE' && ($p['paidImmediately'] ?? false));
    }

    public static function validate(array $p): void
    {
        if (($p['method'] ?? '') === 'CHEQUE_RECEIVED' || $p['kind'] === 'PAYMENT_REVERSAL') {
            V1Input::field('method', 'Cheque receipts and payment reversals are unavailable with Money Accounts enabled. The cheque lifecycle requires P3.2C.', 'MONEY_CHEQUE_PENDING');
        }
        if (self::required($p)) {
            if (!in_array($p['method'] ?? '', ['CASH', 'BANK_TRANSFER'], true)) {
                V1Input::field('method', 'Choose cash or bank transfer.');
            }
            if (!is_string($p['moneyAccountId'] ?? null) || !preg_match('/^[1-9][0-9]{0,19}$/D', $p['moneyAccountId'])) {
                V1Input::field('moneyAccountId', 'Choose the verified account receiving or paying this money.', 'MONEY_ACCOUNT_REQUIRED');
            }
        } elseif (isset($p['moneyAccountId'])) {
            V1Input::field('moneyAccountId', 'This document has no immediate money effect. Do not select an account.');
        }
    }

    public function prepare(array $p): array
    {
        if (!config('upms.money_accounts_enabled', false)) {
            return $p;
        }
        self::validate($p);
        if (self::required($p)) {
            MoneySchema::ready($this->db);
            $p['moneyIntegrationVersion'] = self::VERSION; // Server-owned immutable snapshot marker.
            $this->account($p);
        }
        return $p;
    }

    public function account(array $p): array
    {
        $a = $this->db->one('SELECT * FROM money_accounts WHERE id=?', [$p['moneyAccountId']]);
        if (!$a || $a['type'] !== (($p['method'] ?? '') === 'CASH' ? 'CASH_HOLDER' : 'BANK')) {
            V1Input::field('moneyAccountId', 'Choose a cash holder for Cash or a bank account for Bank transfer. Cheque custody is not spendable.', 'MONEY_ACCOUNT_METHOD_MISMATCH');
        }
        return $a;
    }

    public function beforePost(array $p, string $id): void
    {
        if (!config('upms.money_accounts_enabled', false)) {
            if (isset($p['moneyIntegrationVersion']) || isset($p['moneyAccountId'])) {
                throw new ApiError(409, 'MONEY_FEATURE_REQUIRED', publicMessage: 'This draft requires Money Accounts. Enable the reviewed integration or edit it in the appropriate mode.');
            }
            return;
        }
        self::validate($p);
        if (!self::required($p)) {
            return;
        }
        MoneySchema::ready($this->db);
        if (($p['moneyIntegrationVersion'] ?? '') !== self::VERSION) {
            V1Input::field('moneyAccountId', 'Edit and save this draft with a verified money account before posting.', 'MONEY_DRAFT_REVIEW_REQUIRED');
        }
        $this->account($p);
        $r = (new MoneyAccounts($this->db))->reconciliation();
        if (!$r['matched'] || !(new Reconciliation($this->db))->run()['matched']) {
            throw new ApiError(409, 'MONEY_RECONCILIATION_REQUIRED', publicMessage: 'Money and document evidence do not reconcile. No document was posted.');
        }
        // Manual evidence cannot later be claimed again by a document using the same reference.
        foreach ([$p['reference'] ?? '', in_array($p['kind'], ['CLIENT_PAYMENT','VENDOR_PAYMENT'], true) ? SimpleV1::paymentNumber($p['kind'], $id) : '', 'UPMS-DOC:'.$id] as $reference) {
            if ($reference !== '' && $this->db->one("SELECT id FROM money_batches WHERE source_type='EXTERNAL' AND source_key=?", [MoneyAccounts::sourceKey($reference)])) {
                throw new ApiError(409, 'MONEY_MANUAL_SOURCE_CONFLICT', publicMessage: 'This reference already has an external money effect. Review its evidence before posting; no automatic adjustment is allowed.');
            }
        }
    }

    /** Called only by Documents, inside its BusinessCommand transaction, before final POSTED transition. */
    public function post(array $d, array $p, string $amount, array $user): ?array
    {
        if (!config('upms.money_accounts_enabled', false) || !self::required($p)) {
            return null;
        }
        return (new MoneyAccounts($this->db))->postDocument($d, $p, $amount, $user);
    }

    /** Compare immutable canonical claims to posted version-marked sources, in both directions. */
    public static function reconcile(array $documents, array $batches, array $accounts, array $audits = []): array
    {
        $docs = [];
        $claims = [];
        $findings = [];
        $linked = 0;
        $historic = 0;
        foreach ($documents as $d) {
            $docs[(string)$d['id']] = $d;
        }
        $types = array_column($accounts, 'type', 'id');
        foreach ($batches as $b) {
            if ($b['source_type'] !== 'DOCUMENT') {
                continue;
            }
            $id = preg_match('/^UPMS-DOC:([1-9][0-9]*)$/D', $b['source_ref'], $m) ? $m[1] : '';
            $claims[$id][] = $b;
            $d = $docs[$id] ?? null;
            $p = $d ? SimpleV1::payload($d) : [];
            $credit = ($d['kind'] ?? '') === 'CLIENT_PAYMENT';
            $account = $p['moneyAccountId'] ?? '';
            $posting = array_values(array_filter($audits, fn ($e) => $e['reference'] === (string)($d['official_number'] ?? $id)));
            $poster = count($posting) === 1 ? (string)$posting[0]['actor_id'] : null;
            if (!$d || $d['status'] !== 'POSTED' || ($p['moneyIntegrationVersion'] ?? '') !== self::VERSION || !self::required($p)
                || !in_array($p['method'] ?? '', ['CASH', 'BANK_TRANSFER'], true)
                || ($types[$account] ?? '') !== (($p['method'] ?? '') === 'CASH' ? 'CASH_HOLDER' : 'BANK')
                || $b['source_key'] !== MoneyAccounts::sourceKey($id) || $b['date'] !== $d['date'] || $b['amount'] !== $d['total']
                || (string)$b['actor_id'] !== $poster || $b['kind'] !== ($credit ? 'SOURCE_CREDIT' : 'SOURCE_DEBIT')
                || ($credit ? ((string)$b['to_account_id'] !== $account || $b['from_account_id'] !== null) : ((string)$b['from_account_id'] !== $account || $b['to_account_id'] !== null))) {
                $findings[] = ['code' => 'DOCUMENT_MONEY_EFFECT_MISMATCH', 'documentId' => $id, 'batchId' => (string)$b['id']];
            }
        }
        foreach ($documents as $d) {
            $p = SimpleV1::payload($d);
            if ($d['status'] !== 'POSTED' || !self::required($p)) {
                continue;
            }
            if (!isset($p['moneyIntegrationVersion'])) {
                $historic++;
                continue;
            }
            if ($p['moneyIntegrationVersion'] !== self::VERSION || count($claims[(string)$d['id']] ?? []) !== 1) {
                $findings[] = ['code' => 'DOCUMENT_MONEY_CLAIM_REQUIRED', 'documentId' => (string)$d['id']];
            } else {
                $linked++;
            }
        }
        return ['matched' => !$findings, 'findings' => $findings, 'linkedDocuments' => $linked, 'historicalUnlinkedDocuments' => $historic,
            'coverage' => 'Only p32b1-marked posted documents require canonical money effects. Historical documents are not backfilled.'];
    }
}
