<?php

declare(strict_types=1);

namespace App\Upms;

/** SQL identifiers are checked against the explicit existing-schema map. */
final class BusinessRecords
{
    public function __construct(private readonly Database $db)
    {
    }

    private function columns(string $table, array $names): string
    {
        if (!str_starts_with($table, 'v1_') || !isset(Schema::TABLES[$table]) || array_diff($names, Schema::TABLES[$table])) {
            throw new \LogicException('Unknown business mapping');
        }
        return implode(',', array_map(fn ($key) => '`'.$key.'`', $names));
    }

    public function insert(string $table, array $record): string
    {
        $columns = $this->columns($table, array_keys($record));
        $this->db->execute('INSERT INTO `'.$table.'` ('.$columns.') VALUES ('.implode(',', array_fill(0, count($record), '?')).')', array_values($record));
        return $this->db->pdo()->lastInsertId();
    }

    public function update(string $table, array $record, array $where): void
    {
        if (!$record || !$where) {
            throw new \LogicException('Explicit update fields and predicate required');
        }
        $this->columns($table, [...array_keys($record), ...array_keys($where)]);
        $assignments = implode(',', array_map(fn ($key) => '`'.$key.'`=?', array_keys($record)));
        $predicate = implode(' AND ', array_map(fn ($key) => '`'.$key.'`=?', array_keys($where)));
        $this->db->execute('UPDATE `'.$table.'` SET '.$assignments.' WHERE '.$predicate, [...array_values($record), ...array_values($where)]);
    }
}
