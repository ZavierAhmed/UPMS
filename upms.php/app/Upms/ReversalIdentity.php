<?php

declare(strict_types=1);

namespace App\Upms;

final class ReversalIdentity
{
    public static function derive(Database $db, array $p): array
    {
        if ($p['kind'] !== 'PAYMENT_REVERSAL') {
            return $p;
        }
        $source = isset($p['correctsId']) ? $db->one("SELECT * FROM v1_documents WHERE id=? AND status='POSTED'", [$p['correctsId']]) : null;
        unset($p['partySnapshot']);
        $p['partyId'] = null;
        if (! $source || ! in_array($source['kind'], ['CLIENT_PAYMENT', 'VENDOR_PAYMENT'], true)) {
            return $p;
        }
        $party = $db->one('SELECT * FROM v1_parties WHERE id=?', [$source['party_id']]);
        if (! $party) {
            return $p;
        }
        $old = json_decode($source['payload'], true, 512, JSON_THROW_ON_ERROR)['partySnapshot'] ?? null;
        $p['partyId'] = (string) $source['party_id'];
        $p['partySnapshot'] = is_array($old) && ($old['id'] ?? null) === $p['partyId'] ? $old : ['id' => $p['partyId'], 'name' => $party['name'], 'address' => $party['address'], 'kind' => $party['kind'], 'version' => $party['version']];

        return $p;
    }
}
