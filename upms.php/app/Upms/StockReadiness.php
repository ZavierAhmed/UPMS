<?php

declare(strict_types=1);

namespace App\Upms;

/** Read-only guidance; StockPosting remains the transaction-time authority. */
final class StockReadiness
{
    public function __construct(private readonly Database $db)
    {
    }

    public function query(array $input): array
    {
        $date = $input['date'] ?? '';
        $ids = $input['items'] ?? '';
        if (array_diff(array_keys($input), ['date', 'items']) || !is_string($date) || !preg_match('/^\d{4}-\d{2}-\d{2}$/D', $date) || !($parsed = \DateTimeImmutable::createFromFormat('!Y-m-d', $date)) || $parsed->format('Y-m-d') !== $date || !is_string($ids) || !preg_match('/^[1-9]\d*(?:,[1-9]\d*)*$/D', $ids)) {
            throw new ApiError(400, 'INVALID_INPUT');
        }
        $ids = array_values(array_unique(explode(',', $ids)));
        if (count($ids) > 200 || strlen($input['items']) > 4000) {
            throw new ApiError(400, 'INVALID_INPUT');
        }
        $records = [];
        foreach ($ids as $id) {
            $item = $this->db->one('SELECT i.id,i.code,i.description,i.active,i.version,s.verified,s.quantity FROM v1_items i LEFT JOIN v1_stock s ON s.item_id=i.id WHERE i.id=?', [$id]);
            $opening = $this->db->one("SELECT d.id,d.date FROM v1_documents d JOIN v1_stock_journal j ON j.document_id=d.id WHERE j.item_id=? AND d.kind='STOCK_OPENING' AND d.status='POSTED' ORDER BY d.id LIMIT 1", [$id]);
            $status = !$item ? 'UNKNOWN' : (!$item['active'] ? 'INACTIVE' : (!$item['verified'] ? 'MISSING' : (!$opening ? 'INCONSISTENT' : ($opening['date'] > $date ? 'LATER' : 'READY'))));
            $records[] = ['itemId' => $id,'code' => $item['code'] ?? null,'description' => $item['description'] ?? null,'version' => $item['version'] ?? null,'status' => $status,'verified' => (bool)($item['verified'] ?? false),'openingDate' => $opening['date'] ?? null,'openingDocumentId' => isset($opening['id']) ? (string)$opening['id'] : null];
        }
        return ['date' => $date,'ready' => !array_filter($records, fn ($r) => $r['status'] !== 'READY'),'records' => $records];
    }
}
