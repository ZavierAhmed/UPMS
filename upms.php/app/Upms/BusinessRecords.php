<?php

declare(strict_types=1);

namespace App\Upms;

/** SQL identifiers are checked against the explicit existing-schema map. */
final class BusinessRecords
{
    public function __construct(private readonly Database $db)
    {
    }

    public static function permit(string $table, array $columns, string $operation): void
    {
        $p = json_decode(file_get_contents(dirname(__DIR__, 2).'/resources/runtime-privileges.json'), true, 32, JSON_THROW_ON_ERROR);
        $allowed = $operation === 'insert' ? in_array($table, $p['insert'], true) && !in_array('id', $columns, true)
            : ($operation === 'update' && isset($p['updateColumns'][$table]) && !array_diff($columns, $p['updateColumns'][$table]));
        if (!str_starts_with($table, 'v1_') || !$allowed) {
            throw new \LogicException('Protected business mutation');
        }
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
        self::permit($table, array_keys($record), 'insert');
        $columns = $this->columns($table, array_keys($record));
        $this->db->execute('INSERT INTO `'.$table.'` ('.$columns.') VALUES ('.implode(',', array_fill(0, count($record), '?')).')', array_values($record));
        return $this->db->pdo()->lastInsertId();
    }

    public function update(string $table, array $record, array $where): void
    {
        self::permit($table, array_keys($record), 'update');
        if (!$record || !$where) {
            throw new \LogicException('Explicit update fields and predicate required');
        }
        $this->columns($table, [...array_keys($record), ...array_keys($where)]);
        $assignments = implode(',', array_map(fn ($key) => '`'.$key.'`=?', array_keys($record)));
        $predicate = implode(' AND ', array_map(fn ($key) => '`'.$key.'`=?', array_keys($where)));
        $this->db->execute('UPDATE `'.$table.'` SET '.$assignments.' WHERE '.$predicate, [...array_values($record), ...array_values($where)]);
    }

    public function insertMany(string $table, array $records): void
    {
        if (!$records) {
            return;
        }
        $keys = array_keys($records[0]);
        self::permit($table, $keys, 'insert');
        $columns = $this->columns($table, $keys);
        $bindings = [];
        foreach ($records as $record) {
            if (array_keys($record) !== $keys) {
                throw new \LogicException('Consistent insert mapping required');
            }
            array_push($bindings, ...array_values($record));
        }
        $group = '('.implode(',', array_fill(0, count($keys), '?')).')';
        $this->db->execute('INSERT INTO `'.$table.'` ('.$columns.') VALUES '.implode(',', array_fill(0, count($records), $group)), $bindings);
    }
}
