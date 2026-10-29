<?php

declare(strict_types=1);

namespace App\Upms;

use Brick\Math\BigInteger;

/** Read-only evidence checks; retained hashes cannot authenticate missing inputs. */
final class Integrity
{
    private static function id(mixed $v): bool
    {
        return is_string($v) && preg_match('/^[1-9]\d{0,19}$/D', $v) && BigInteger::of($v)->compareTo('18446744073709551615') <= 0;
    }

    private static function date(mixed $v): bool
    {
        return is_string($v) && preg_match('/^(?!0000)(\d{4})-(\d{2})-(\d{2})$/D', $v, $m) && checkdate((int) $m[2], (int) $m[3], (int) $m[1]);
    }

    public static function inspect(array $docs, array $commands, array $users, array $items, array $parties, array $audit = []): array
    {
        $findings = $invalid = $receipts = $keys = [];
        $add = function ($code, $entity, $id, $field, $message, $severity = 'error') use (&$findings, &$invalid): void {
            $findings[] = ['code' => $code, 'entity' => $entity, 'id' => (string) $id, 'field' => $field, 'message' => $message, 'severity' => $severity];
            if ($entity === 'document' && $severity === 'error') {
                $invalid[(string) $id] = true;
            }
        };
        foreach ($docs as $d) {
            try {
                $p = json_decode($d['payload'], false, 512, JSON_THROW_ON_ERROR);
                if (! $p instanceof \stdClass) {
                    throw new \RuntimeException();
                }
            } catch (\Throwable) {
                $add('DOCUMENT_PAYLOAD_INVALID', 'document', $d['id'], 'payload', 'Saved payload must be a JSON object.');

                continue;
            }
            if ($d['status'] !== 'POSTED') {
                continue;
            }
            if (in_array($d['kind'], ['STOCK_OPENING', 'PRODUCTION', 'PURCHASE', 'CHALLAN', 'STOCK_CORRECTION', 'CHALLAN_RETURN'], true) && (! is_array($p->lines ?? null) || array_filter($p->lines, fn ($line) => ! ($line instanceof \stdClass)))) {
                $add('DOCUMENT_LINES_INVALID', 'document', $d['id'], 'payload.lines', 'Posted line evidence must be an array of objects.');
            }
            if (! self::date($d['date']) || ! self::date($p->date ?? null)) {
                $add('DOCUMENT_DATE_INVALID', 'document', $d['id'], 'date', 'SQL and payload dates must be real YYYY-MM-DD dates.');
            } elseif ($d['date'] !== $p->date) {
                $add('DOCUMENT_DATE_MISMATCH', 'document', $d['id'], 'date', 'SQL date differs from saved payload date.');
            } elseif ($d['date'] > SimpleV1::today()) {
                $add('FUTURE_POSTED_DATE_REVIEW', 'document', $d['id'], 'date', 'Future posted date requires import/provenance review; no date was changed.', 'warning');
            }
            if ($d['kind'] === 'EXPENSE' && (! property_exists($p, 'partyId') || $p->partyId !== null)) {
                $add('EXPENSE_PARTY_EVIDENCE', 'document', $d['id'], 'payload.partyId', 'Paid expenses require an explicit null payload party identity.');
            }
            if ($d['kind'] === 'EXPENSE' && isset($p->partySnapshot)) {
                $add('EXPENSE_PARTY_EVIDENCE', 'document', $d['id'], 'payload.partySnapshot', 'Paid expenses cannot retain a client or vendor snapshot.');
            }
            $amount = function ($value, $field, $zero = true, $derived = false) use ($d, $add): void {
                if (! is_string($value)) {
                    $add('AMOUNT_REPRESENTATION_INVALID', 'document', $d['id'], $field, 'Persisted financial amounts must be strings.');

                    return;
                }
                try {
                    if ($derived) {
                        if (! preg_match('/^(?:0|[1-9]\d{0,13})\.\d{2}$/D', $value)) {
                            throw new \RuntimeException();
                        }
                    } else {
                        Exact::cents($value, zero: $zero);
                    }
                } catch (\Throwable) {
                    $add('AMOUNT_VALUE_INVALID', 'document', $d['id'], $field, 'Persisted amount is outside the accepted exact-decimal policy.');
                }
            };
            if (in_array($d['kind'], ['CLIENT_OPENING', 'VENDOR_OPENING', 'OPENING_CORRECTION', 'CLIENT_PAYMENT', 'VENDOR_PAYMENT', 'EXPENSE'], true)) {
                $amount($p->amount ?? null, 'payload.amount', ! in_array($d['kind'], ['CLIENT_PAYMENT', 'VENDOR_PAYMENT', 'EXPENSE'], true));
            } elseif (property_exists($p, 'amount') && ! is_string($p->amount)) {
                $add('AMOUNT_REPRESENTATION_INVALID', 'document', $d['id'], 'payload.amount', 'Persisted financial amounts must be strings.');
            }
            if (! in_array($d['kind'], ['PURCHASE', 'CHALLAN', 'CHALLAN_RETURN'], true) && is_array($p->lines ?? null)) {
                foreach ($p->lines as $i => $line) {
                    if ($line instanceof \stdClass && property_exists($line, 'rate') && ! is_string($line->rate)) {
                        $add('AMOUNT_REPRESENTATION_INVALID', 'document', $d['id'], "payload.lines.{$i}.rate", 'Persisted financial amounts must be strings.');
                    }
                }
            }
            if (in_array($d['kind'], ['PURCHASE', 'CHALLAN', 'CHALLAN_RETURN'], true) && is_array($p->lines ?? null)) {
                foreach ($p->lines as $i => $line) {
                    $amount($line->rate ?? null, "payload.lines.{$i}.rate");
                    if ($d['kind'] === 'CHALLAN_RETURN') {
                        $amount($line->credit ?? null, "payload.lines.{$i}.credit");
                    }
                }
            }
            if ($d['kind'] === 'CHALLAN_RETURN') {
                $amount($p->returnCredit ?? null, 'payload.returnCredit');
            }
            if ($d['kind'] === 'CHALLAN' && ($p->entryVersion ?? null) === 2) {
                $amount($p->discountValue ?? null, 'payload.discountValue');
                foreach (['value', 'subtotal', 'amount', 'total'] as $field) {
                    $amount($p->discountSummary->$field ?? null, 'payload.discountSummary.'.$field, true, true);
                }
            }
            if ($d['kind'] === 'PAYMENT_REVERSAL') {
                $source = null;
                foreach ($docs as $x) {
                    if ((string) $x['id'] === ($p->correctsId ?? null) && $x['status'] === 'POSTED' && in_array($x['kind'], ['CLIENT_PAYMENT', 'VENDOR_PAYMENT'], true)) {
                        $source = $x;
                    }
                }
                if (! $source || (string) $d['party_id'] !== (string) $source['party_id'] || (string) $d['corrects_id'] !== (string) $source['id'] || (isset($p->partyId) && $p->partyId !== (string) $source['party_id']) || (isset($p->partySnapshot) && (! ($p->partySnapshot instanceof \stdClass) || ($p->partySnapshot->id ?? null) !== (string) $source['party_id']))) {
                    $add('REVERSAL_SNAPSHOT_IDENTITY', 'document', $d['id'], 'payload.partySnapshot', 'Reversal snapshot and posted party must identify the original payment party.');
                }
            }
        }
        foreach ($commands as $c) {
            $key = (string) $c['key'];
            $folded = strtolower($key);
            if (! preg_match('/^(?:[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}|00000000-0000-0000-0000-000000000000|ffffffff-ffff-ffff-ffff-ffffffffffff)$/iD', $key) || isset($keys[$folded])) {
                $add('COMMAND_KEY_INVALID', 'command', $key, 'key', 'Command key must be a unique supported UUID.');
            }
            $keys[$folded] = true;
            if (! is_string($c['fingerprint']) || ! preg_match('/^[a-f0-9]{64}$/D', $c['fingerprint'])) {
                $add('COMMAND_FINGERPRINT_FORMAT', 'command', $key, 'fingerprint', 'Fingerprint must be a lowercase 64-character SHA256 representation; authenticity is not verified.');
            }
            if (! self::id((string) $c['actor_id']) || ! array_filter($users, fn ($u) => (string) $u['id'] === (string) $c['actor_id'])) {
                $add('COMMAND_ACTOR_MISSING', 'command', $key, 'actor_id', 'Command actor must identify retained user evidence.');
            }
            try {
                $r = json_decode($c['result'], false, 512, JSON_THROW_ON_ERROR);
                if (! $r instanceof \stdClass || ! self::id($r->id ?? null)) {
                    throw new \RuntimeException();
                }
            } catch (\Throwable) {
                $add('COMMAND_RESULT_INVALID', 'command', $key, 'result', 'Saved command result must be an object with a canonical string id.');

                continue;
            }
            $names = array_keys(get_object_vars($r));
            sort($names);
            $names = implode(',', $names);
            $d = null;
            foreach ($docs as $x) {
                if ((string) $x['id'] === $r->id) {
                    $d = $x;
                }
            }
            if (($r->status ?? null) === 'POSTED') {
                if ($names !== 'id,official_number,status,total' || ! is_string($r->total) || ! preg_match('/^(?:0|[1-9]\d{0,15})\.\d{2}$/D', $r->total) || ! ($r->official_number === null || is_string($r->official_number))) {
                    $add('COMMAND_RESULT_INVALID', 'command', $key, 'result', 'Posted receipt must retain id, POSTED status, official_number and exact string total.');

                    continue;
                }
                if (! $d || $d['status'] !== 'POSTED' || $d['total'] !== $r->total || $d['official_number'] !== $r->official_number) {
                    $add('COMMAND_RESULT_DOCUMENT', 'command', $key, 'result', 'Posted receipt differs from its immutable document evidence.');
                } else {
                    $receipts[$r->id] = true;
                    if (array_filter($audit, fn ($a) => $a['action'] === 'document.posted' && $a['reference'] === ($d['official_number'] ?: (string) $d['id']) && (string) $a['actor_id'] !== (string) $c['actor_id'])) {
                        $add('COMMAND_ACTOR_EVIDENCE', 'command', $key, 'actor_id', 'Posted command actor contradicts retained posting audit evidence.');
                    }
                }
            } elseif (($r->status ?? null) === 'CANCELLED') {
                if ($names !== 'id,status' || ! $d || $d['status'] !== 'CANCELLED') {
                    $add('COMMAND_RESULT_DOCUMENT', 'command', $key, 'result', 'Cancellation receipt must identify a cancelled document.');
                }
            } elseif ($names === 'code,id') {
                if (! is_string($r->code) || ! array_filter($items, fn ($i) => (string) $i['id'] === $r->id && $i['code'] === $r->code)) {
                    $add('COMMAND_RESULT_REFERENCE', 'command', $key, 'result', 'Item receipt must identify the retained immutable item code.');
                }
            } elseif ($names !== 'id') {
                $add('COMMAND_RESULT_INVALID', 'command', $key, 'result', 'Saved result does not match a supported command receipt shape.');
            } elseif (! array_filter([...$docs, ...$items, ...$parties], fn ($x) => (string) $x['id'] === $r->id)) {
                $add('COMMAND_RESULT_REFERENCE', 'command', $key, 'result.id', 'Id-only receipt has no possible retained document, item or party.');
            }
        }
        foreach ($docs as $d) {
            if ($d['status'] === 'POSTED' && ! isset($receipts[(string) $d['id']])) {
                $add('COMMAND_COVERAGE_UNVERIFIABLE', 'document', $d['id'], 'commands', 'No matching post receipt is retained; historical/import provenance requires review.', 'warning');
            }
        }

        return ['findings' => $findings, 'invalid' => $invalid];
    }
}
