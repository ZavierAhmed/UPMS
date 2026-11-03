<?php

declare(strict_types=1);

namespace App\Upms;

/** Optional company-wide custom identity in immutable canonical JSON; official DC sequence is independent. */
final class ChallanNumbers
{
    /** Presentation only: never persist this value over the immutable official identity. */
    public static function display(array $d): string
    {
        $p = is_string($d['payload'] ?? null) ? SimpleV1::payload($d) : (array) ($d['payload'] ?? []);
        if (($d['kind'] ?? '') === 'CHALLAN' && ($p['customChallanNumber'] ?? '') !== '') {
            return self::normalize($p['customChallanNumber']);
        }
        return ($d['official_number'] ?? '') ?: (($d['status'] ?? 'DRAFT') === 'DRAFT' ? 'Draft ' : 'Entry ').($d['id'] ?? $d['document_id'] ?? '');
    }

    public static function presentation(Database $db, array $d): array
    {
        $p = is_string($d['payload'] ?? null) ? SimpleV1::payload($d) : (array) ($d['payload'] ?? []);
        if ($d['kind'] === 'CHALLAN' && ($p['customChallanNumber'] ?? '') !== '') {
            return ['displayNumber' => self::display($d)];
        }
        if ($d['kind'] === 'CHALLAN_RETURN') {
            $source = $db->one("SELECT * FROM v1_documents WHERE id=? AND kind='CHALLAN'", [$p['originalId']]);
            if ($source && self::display($source) !== ($p['originalReference'] ?? '')) {
                return ['originalDisplayNumber' => self::display($source)];
            }
        }
        return [];
    }

    public static function normalize(string $value): string
    {
        $value = strtoupper(V1Input::trim($value));
        if ($value !== '' && (strlen($value) > 40 || !preg_match('#^[A-Z0-9]+(?:[-/][A-Z0-9]+)*$#D', $value) || preg_match('/^(?:DC|CR|VP|RF)[-\/]/D', $value))) {
            V1Input::field('customChallanNumber', 'Use up to 40 ASCII letters/digits, separated by single hyphens or slashes. Internal DC/CR/VP/RF prefixes are reserved.', 'CUSTOM_CHALLAN_NUMBER_INVALID');
        }
        return $value;
    }

    public static function prepare(array $p): array
    {
        if (!array_key_exists('customChallanNumber', $p)) {
            return $p;
        }
        if ($p['kind'] !== 'CHALLAN') {
            V1Input::field('customChallanNumber', 'Custom numbers belong only to delivery challans. Supplier references are separate.');
        }
        $p['customChallanNumber'] = self::normalize($p['customChallanNumber']);
        return $p;
    }

    public static function beforePost(Database $db, array $p): void
    {
        if ($p['kind'] !== 'CHALLAN' || ($p['customChallanNumber'] ?? '') === '') {
            return;
        }
        $number = self::normalize($p['customChallanNumber']);
        // BusinessCommand already serializes all authorized postings under identity_guard lock.
        foreach ($db->rows("SELECT official_number,payload FROM v1_documents WHERE kind='CHALLAN' AND status='POSTED'") as $row) {
            $old = SimpleV1::payload($row)['customChallanNumber'] ?? '';
            if (($old !== '' && self::normalize($old) === $number) || strtoupper(V1Input::trim($row['official_number'] ?? '')) === $number) {
                throw new ApiError(409, 'DUPLICATE_CUSTOM_CHALLAN_NUMBER', publicMessage:'This custom challan number is already finalized. Choose another number.');
            }
        }
    }

    public static function reconcile(array $documents): array
    {
        $seen = [];
        $findings = [];
        foreach ($documents as $d) {
            if ($d['status'] !== 'POSTED') {
                continue;
            }
            $p = SimpleV1::payload($d);
            $value = $p['customChallanNumber'] ?? '';
            if ($value === '') {
                continue;
            }
            try {
                $number = self::normalize($value);
                if ($d['kind'] !== 'CHALLAN' || $number !== $value || isset($seen[$number])) {
                    throw new \RuntimeException();
                }
                $seen[$number] = true;
            } catch (\Throwable) {
                $findings[] = ['code' => 'CUSTOM_CHALLAN_NUMBER_MISMATCH', 'documentId' => (string)$d['id']];
            }
        }
        return ['matched' => !$findings, 'findings' => $findings];
    }
}
