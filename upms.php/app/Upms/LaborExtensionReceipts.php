<?php

declare(strict_types=1);

namespace App\Upms;

final class LaborExtensionReceipts
{
    public static function allocation(array $row): array
    {
        return ['id'=>(string)$row['id'],'status'=>'POSTED','laborExtensionVersion'=>LaborExtensionSchema::VERSION,'operation'=>'EXPENSE_ALLOCATION','entryHash'=>EmployeeHafta::rowHash($row)];
    }
    public static function posted(array $doc): object { return (object)['id'=>(string)$doc['id'],'status'=>'POSTED','official_number'=>$doc['official_number'],'total'=>$doc['total']]; }
    public static function first(array $production,array $initializations,array $data): array
    {
        $docs=array_column($data['v1_documents'],null,'id');
        return ['id'=>(string)$production['id'],'status'=>'POSTED','laborExtensionVersion'=>LaborExtensionSchema::VERSION,'operation'=>'FIRST_PRODUCTION','production'=>self::posted($production),'initializations'=>array_map(fn($r)=>(object)['id'=>(string)$r['id'],'entryHash'=>EmployeeHafta::rowHash($r),'opening'=>self::posted($docs[$r['opening_document_id']])],$initializations)];
    }
    public static function valid(object $r,string $actor,array $data): bool
    {
        try {
            if (($r->laborExtensionVersion??'')!==LaborExtensionSchema::VERSION) { return false; }
            if (($r->operation??'')==='EXPENSE_ALLOCATION') {
                $rows=array_values(array_filter($data['labor_expense_allocations']??[],fn($x)=>(string)$x['id']===($r->id??'')));
                return count($rows)===1&&(string)$rows[0]['actor_id']===$actor&&BusinessCommand::canonical($r)===BusinessCommand::canonical((object)self::allocation($rows[0]));
            }
            if (($r->operation??'')!=='FIRST_PRODUCTION') { return false; }
            $docs=array_column($data['v1_documents']??[],null,'id');$d=$docs[$r->id??'']??null;
            if (!$d||$d['kind']!=='PRODUCTION'||$d['status']!=='POSTED') { return false; }
            $rows=array_values(array_filter($data['stock_initializations']??[],fn($x)=>(string)$x['production_document_id']===(string)$d['id']));
            if (!$rows||array_filter($rows,fn($x)=>(string)$x['actor_id']!==$actor)) { return false; }
            usort($rows,fn($a,$b)=>(int)$a['id']<=>(int)$b['id']);
            $expected=self::first($d,$rows,$data);
            if (BusinessCommand::canonical($r)!==BusinessCommand::canonical((object)$expected)) { return false; }
            foreach ([$d,...array_map(fn($x)=>$docs[$x['opening_document_id']]??null,$rows)] as $doc) {
                if (!$doc||$doc['status']!=='POSTED'||!array_filter($data['v1_audit']??[],fn($a)=>$a['action']==='document.posted'&&$a['reference']===($doc['official_number']?:(string)$doc['id'])&&(string)$a['actor_id']===$actor)) { return false; }
            }return true;
        }catch(\Throwable){return false;}
    }
    public static function insert(Database $db,string $table,array $row): string
    {
        if (!in_array($table,['labor_expense_allocations','stock_initializations','labor_extension_audit'],true)||!$db->pdo()->inTransaction()) { throw new \LogicException('H1C_TRANSACTION_REQUIRED'); }
        $db->execute('INSERT INTO `'.$table.'` (`'.implode('`,`',array_keys($row)).'`) VALUES('.implode(',',array_fill(0,count($row),'?')).')',array_values($row));return $db->pdo()->lastInsertId();
    }
    public static function audit(Database $db,string $table,string $id,string $type): array
    {
        $row=$db->one('SELECT * FROM `'.$table.'` WHERE id=?',[$id]);
        self::insert($db,'labor_extension_audit',['entry_type'=>$type,'entry_id'=>$id,'payload_hash'=>EmployeeHafta::rowHash($row),'actor_id'=>$row['actor_id'],'created_at'=>$row['created_at']]);return $row;
    }
}
