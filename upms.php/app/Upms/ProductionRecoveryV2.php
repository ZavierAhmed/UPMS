<?php

declare(strict_types=1);

namespace App\Upms;

use PDO;
use RuntimeException;

/** Separate cumulative collector. The original operational backup format is untouched. */
final class ProductionRecoveryV2
{
    public const FORMAT = 'UPMS_PRODUCTION_BACKUP_V2';

    public static function capture(PDO $reader, PDO $definer, array $accounts): array
    {
        $proof = CumulativeInitialization::verifyInstalled($reader,$definer,$accounts);
        $reader->exec('START TRANSACTION WITH CONSISTENT SNAPSHOT, READ ONLY');
        try {
            $tables = [];
            foreach (CumulativeProduction::schema()['tables'] as $name => $ddl) {
                $tables[$name] = ['ddl'=>$ddl,'rows'=>self::readRows($reader,$name)];
            }
            $reader->rollBack();
        } catch (\Throwable $error) {
            if ($reader->inTransaction()) { $reader->rollBack(); }
            throw $error;
        }
        $snapshot = ['format'=>self::FORMAT,'createdUtc'=>gmdate('c'),'proof'=>$proof,
            'tables'=>$tables,'guards'=>CumulativeProduction::schema()['guards']];
        self::validate($snapshot);
        CumulativeInitialization::verifyInstalled($reader,$definer,$accounts);
        return $snapshot;
    }

    public static function validate(array $snapshot): array
    {
        $schema = CumulativeProduction::schema();
        if (($snapshot['format']??'') !== self::FORMAT || ($snapshot['proof']['planHash']??'') !== CumulativeInitialization::hash()
            || array_keys($snapshot['tables']??[]) !== array_keys($schema['tables'])
            || ($snapshot['guards']??null) !== $schema['guards']) {
            throw new RuntimeException('PRODUCTION_BACKUP_V2_MANIFEST_REJECTED');
        }
        foreach ($schema['tables'] as $name=>$ddl) {
            if (($snapshot['tables'][$name]['ddl']??null) !== $ddl
                || !is_array($snapshot['tables'][$name]['rows']??null)) {
                throw new RuntimeException('PRODUCTION_BACKUP_V2_DEFINITION_REJECTED');
            }
        }
        $receipts=$snapshot['tables']['upms_production_migrations']['rows'];
        if (count($receipts)!==1 || $receipts[0]['plan_hash']!==$snapshot['proof']['planHash']
            || $receipts[0]['target_hash']!==$snapshot['proof']['targetHash']
            || !in_array($receipts[0]['state'],[CumulativeProduction::READY,CumulativeProduction::ACTIVE],true)
            || !preg_match('/^[a-f0-9]{40}$/D',$receipts[0]['step'])) {
            throw new RuntimeException('PRODUCTION_BACKUP_V2_INITIALIZATION_REJECTED');
        }
        $extra=$snapshot['tables']['cheque_extra_receipts']['rows'];
        if (count($extra)!==1 || $extra[0]['version']!==ChequeExtras::VERSION || $extra[0]['plan_hash']!==ChequeExtras::hash()) {
            throw new RuntimeException('PRODUCTION_BACKUP_V2_ATTACHMENT_SCHEMA_REJECTED');
        }
        foreach ($snapshot['tables']['cheque_attachments']['rows'] as $attachment) {
            $cipher=base64_decode($attachment['ciphertext'],true);
            if ($cipher===false || strlen($cipher)!==(int)$attachment['bytes']+40
                || !preg_match('/^[a-f0-9]{64}$/D',$attachment['sha256'])) {
                throw new RuntimeException('PRODUCTION_BACKUP_V2_ATTACHMENT_CIPHERTEXT_REJECTED');
            }
        }
        $evidence = ChequeRecovery::evidence($snapshot,true);
        if (!$evidence['matched']) {
            throw new RuntimeException('PRODUCTION_BACKUP_V2_RECONCILIATION_REJECTED');
        }
        return $evidence;
    }

    public static function encrypt(array $snapshot, string $recipient): string
    {
        self::validate($snapshot);
        return ExpenseRecovery::encrypt($snapshot,$recipient);
    }

    public static function decrypt(string $ciphertext, string $keypair): array
    {
        $snapshot = ExpenseRecovery::decrypt($ciphertext,$keypair);
        self::validate($snapshot);
        return $snapshot;
    }

    private static function rows(array $rows): array
    {
        $normalized = array_map(fn($row)=>json_encode(array_map(fn($v)=>$v===null?null:(string)$v,$row),JSON_THROW_ON_ERROR),$rows);
        sort($normalized);
        return $normalized;
    }

    private static function readRows(PDO $pdo, string $table): array
    {
        $statement=$pdo->query('SELECT * FROM `'.$table.'`');
        $rows=$statement->fetchAll(PDO::FETCH_ASSOC);
        // Match the normal application representation on both Linux and Windows.
        for ($column=0;$column<$statement->columnCount();$column++) {
            $meta=$statement->getColumnMeta($column);
            if (($meta['native_type']??'')==='LONGLONG') {
                foreach ($rows as &$row) {
                    if ($row[$meta['name']]!==null) { $row[$meta['name']]=(string)$row[$meta['name']]; }
                }
                unset($row);
            }
        }
        return $rows;
    }

    public static function restoreIsolated(PDO $installer, PDO $definer, array $snapshot, array $accounts): array
    {
        self::validate($snapshot);
        $target = $installer->query('SELECT DATABASE() db,@@datadir data,@@skip_networking offline')->fetch(PDO::FETCH_ASSOC);
        $root = realpath(getenv('HOME').'/.cache/upms-php81-local');
        $data = realpath($target['data']);
        if (PHP_SAPI !== 'cli' || PHP_OS_FAMILY !== 'Linux' || !$root || !$data
            || !str_starts_with($data,$root.'/p42c-') || !(int)$target['offline']
            || !preg_match('/^upms_stage_[0-9]+_restore$/D',$target['db'])
            || $installer->query('SHOW TABLES')->fetchAll()
            || $definer->query('SELECT DATABASE()')->fetchColumn() !== $target['db']) {
            throw new RuntimeException('PRODUCTION_BACKUP_V2_EMPTY_ISOLATED_RESTORE_REQUIRED');
        }
        if (count(array_unique($accounts))!==3) { throw new RuntimeException('CUMULATIVE_DISTINCT_IDENTITIES_REQUIRED'); }
        CumulativeInitialization::verifyGrant($installer,$target['db'],$accounts['installer'],['CREATE','REFERENCES','SELECT','INSERT','UPDATE']);
        CumulativeInitialization::verifyGrant($definer,$target['db'],$accounts['definer'],['SELECT','TRIGGER']);
        $installer->exec('SET FOREIGN_KEY_CHECKS=0');
        try {
            foreach (CumulativeProduction::schema()['tables'] as $ddl) { $installer->exec($ddl); }
            $installer->beginTransaction();
            foreach ($snapshot['tables'] as $name=>$table) {
                $columns = $installer->query('SHOW COLUMNS FROM `'.$name.'`')->fetchAll(PDO::FETCH_COLUMN);
                foreach ($table['rows'] as $row) {
                    if (array_keys($row) !== $columns) { throw new RuntimeException('PRODUCTION_BACKUP_V2_COLUMNS_REJECTED'); }
                    $installer->prepare('INSERT INTO `'.$name.'` (`'.implode('`,`',$columns).'`) VALUES('.
                        implode(',',array_fill(0,count($columns),'?')).')')->execute(array_values($row));
                }
            }
            $installer->commit();
        } catch (\Throwable $error) {
            if ($installer->inTransaction()) { $installer->rollBack(); }
            throw $error;
        } finally {
            $installer->exec('SET FOREIGN_KEY_CHECKS=1');
        }
        foreach ($snapshot['guards'] as $guard) {
            $definer->prepare('SET SESSION sql_mode=?')->execute([$guard['sqlMode']]);
            $body = str_replace('__UPMS_RUNTIME__',explode('@',$accounts['runtime'])[0],$guard['body']);
            $definer->exec('CREATE TRIGGER `'.$guard['name'].'` '.$guard['timing'].' '.$guard['event'].
                ' ON `'.$guard['table'].'` FOR EACH ROW '.$body);
        }
        $proof = CumulativeInitialization::verifyInstalled($installer,$definer,$accounts);
        $copy = $snapshot;
        $count = 0;
        foreach ($snapshot['tables'] as $name=>$table) {
            $rows = self::readRows($installer,$name);
            if (self::rows($rows) !== self::rows($table['rows'])) {
                throw new RuntimeException('PRODUCTION_BACKUP_V2_RESTORED_ROWS_REJECTED');
            }
            $copy['tables'][$name]['rows']=$rows;
            $count += count($rows);
        }
        foreach ($installer->query('SELECT TABLE_NAME,COLUMN_NAME,REFERENCED_TABLE_NAME,REFERENCED_COLUMN_NAME FROM information_schema.KEY_COLUMN_USAGE WHERE TABLE_SCHEMA=DATABASE() AND REFERENCED_TABLE_NAME IS NOT NULL')->fetchAll(PDO::FETCH_ASSOC) as $fk) {
            $sql='SELECT COUNT(*) FROM `'.$fk['TABLE_NAME'].'` a LEFT JOIN `'.$fk['REFERENCED_TABLE_NAME'].'` b ON a.`'.$fk['COLUMN_NAME'].'`=b.`'.$fk['REFERENCED_COLUMN_NAME'].'` WHERE a.`'.$fk['COLUMN_NAME'].'` IS NOT NULL AND b.`'.$fk['REFERENCED_COLUMN_NAME'].'` IS NULL';
            if ((int)$installer->query($sql)->fetchColumn() !== 0) { throw new RuntimeException('PRODUCTION_BACKUP_V2_RESTORED_ORPHAN'); }
        }
        self::validate($copy);
        return ['passed'=>true,'format'=>self::FORMAT,'restoredTables'=>$proof['tables'],'restoredGuards'=>$proof['guards'],
            'rows'=>$count,'allRowsIdentical'=>true,'financialReconciliation'=>true,
            'sourceAccounts'=>$snapshot['proof']['accounts'],'restoreAccounts'=>$accounts,
            'independentOwnerRecoveryVerified'=>false];
    }
}
