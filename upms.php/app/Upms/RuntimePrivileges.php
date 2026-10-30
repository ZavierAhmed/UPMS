<?php

declare(strict_types=1);

namespace App\Upms;

use PDO;

final class RuntimePrivileges
{
    public const STRICT = 'strict_scoped';
    public const GODADDY = 'godaddy_database_crud';
    public static function expected(string $policy, string $schema): array
    {
        if (!preg_match('/^[a-zA-Z0-9_]+$/D', $schema)) {
            throw new \RuntimeException('PRIVILEGE_SCHEMA_REJECTED');
        }
        $escaped = str_replace(['_','%'], ['\\_','\\%'], $schema);
        if ($policy === self::GODADDY) {
            if ($schema !== 'upms_v1') {
                throw new \RuntimeException('CRUD_TARGET_REJECTED');
            }
            return array_map(fn ($p) => 'SCHEMA|'.$escaped.'|||'.$p, ['DELETE','INSERT','SELECT','UPDATE']);
        }
        if ($policy !== self::STRICT) {
            throw new \RuntimeException('PRIVILEGE_POLICY_REJECTED');
        }
        $r = json_decode(file_get_contents(dirname(__DIR__, 2).'/resources/runtime-privileges.json'), true, 32, JSON_THROW_ON_ERROR);
        $expected = ['SCHEMA|'.$escaped.'|||SELECT'];
        foreach (['insert','delete'] as $verb) {
            foreach ($r[$verb] as $t) {
                $expected[] = 'TABLE|'.$schema.'|'.$t.'||'.strtoupper($verb);
            }
        }
        foreach (['sessions','login_attempts'] as $t) {
            $expected[] = 'TABLE|'.$schema.'|'.$t.'||UPDATE';
        }
        foreach ($r['updateColumns'] as $t => $cols) {
            foreach ($cols as $col) {
                $expected[] = 'COLUMN|'.$schema.'|'.$t.'|'.$col.'|UPDATE';
            }
        }
        sort($expected);
        return $expected;
    }
    public static function compare(string $policy, string $schema, string $account, string $authenticated, array $actual, bool $directGrantsOnly = true): array
    {
        $expected = self::expected($policy, $schema);
        sort($actual);
        sort($expected);
        $missing = array_values(array_diff($expected, $actual));
        $unexpected = array_values(array_diff($actual, $expected));
        $identity = $account === $authenticated && ($policy !== self::GODADDY || $authenticated === 'upms_runtime84@localhost');
        return ['passed' => $identity && $directGrantsOnly && !$missing && !$unexpected && count($actual) === count($expected),'policy' => $policy,'account' => $authenticated,'identityMatched' => $identity,'directGrantsOnly' => $directGrantsOnly,'expectedPrivileges' => count($expected),'actualPrivileges' => count($actual),'missing' => $missing,'unexpected' => $unexpected];
    }
    public static function verify(PDO $pdo, array $c, ?string $policy = null): array
    {
        $policy ??= $c['privilegePolicy'] ?? self::STRICT;
        $account = $pdo->query('SELECT CURRENT_USER()')->fetchColumn();
        $grantee = "'".str_replace('@', "'@'", $account)."'";
        $actual = [];
        foreach (['USER','SCHEMA','TABLE','COLUMN'] as $scope) {
            $q = $pdo->prepare('SELECT * FROM information_schema.'.$scope.'_PRIVILEGES WHERE GRANTEE=?');
            $q->execute([$grantee]);
            foreach ($q->fetchAll(PDO::FETCH_ASSOC) as $r) {
                if ($scope === 'USER' && $r['PRIVILEGE_TYPE'] === 'USAGE' && $r['IS_GRANTABLE'] === 'NO') {
                    continue;
                }
                $actual[] = $scope.'|'.($r['TABLE_SCHEMA'] ?? '').'|'.($r['TABLE_NAME'] ?? '').'|'.($r['COLUMN_NAME'] ?? '').'|'.$r['PRIVILEGE_TYPE'].($r['IS_GRANTABLE'] === 'YES' ? '|GRANTABLE' : '');
            }
        }
        // Reject role/proxy grants even if metadata shows only direct privileges.
        $direct = true;
        foreach ($pdo->query('SHOW GRANTS')->fetchAll(PDO::FETCH_COLUMN) as $grant) {
            if (!preg_match('/^GRANT [A-Z_, ()`a-z0-9]+ ON (?:\*\.\*|`[^`]+`\.(?:\*|`[^`]+`)) TO /D', $grant) || str_contains($grant, 'WITH GRANT OPTION') || str_starts_with($grant, 'GRANT PROXY')) {
                $direct = false;
            }
        }
        return self::compare($policy, $c['schema'], $c['account'], $account, $actual, $direct);
    }
}
