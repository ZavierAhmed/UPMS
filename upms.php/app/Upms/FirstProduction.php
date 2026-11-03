<?php

declare(strict_types=1);

namespace App\Upms;

final class FirstProduction
{
    public function __construct(private readonly Database $db,private readonly Documents $documents) {}
    public function initialize(array $d,array $p,array $user,array $control,mixed $input): array
    {
        LaborExtensionSchema::ready($this->db);EmployeeHafta::permit($user,'stock.initial_opening.confirm');
        if ($p['kind']!=='PRODUCTION'||!is_array($input)||!$input||count($input)>count($p['lines'])) { throw new ApiError(400,'FIRST_PRODUCTION_INPUT_REQUIRED'); }
        $allowed=array_column($p['lines'],'itemId');$seen=[];$checked=[];
        foreach($input as $entry) {
            if (!$entry instanceof \stdClass||array_diff(array_keys(get_object_vars($entry)),['itemId','date','confirmed'])||!is_string($entry->itemId??null)||!in_array($entry->itemId,$allowed,true)||isset($seen[$entry->itemId])||($entry->confirmed??false)!==true||!is_string($entry->date??null)) { throw new ApiError(400,'FIRST_PRODUCTION_EXPLICIT_CONFIRMATION_REQUIRED'); }
            V1Input::reportFilters(['from'=>$entry->date]);
            if ($entry->date>$p['date']||$entry->date>SimpleV1::today()) { throw new ApiError(400,'INITIAL_OPENING_DATE_AFTER_PRODUCTION'); }
            $item=$this->db->one('SELECT i.*,s.quantity,s.verified FROM v1_items i JOIN v1_stock s ON s.item_id=i.id WHERE i.id=? FOR UPDATE',[$entry->itemId]);
            if (!$item||!$item['active']||$item['verified']||Exact::integer($item['quantity'],signed:true,zero:true)->compareTo(0)!==0||$this->db->one('SELECT id FROM v1_stock_journal WHERE item_id=? LIMIT 1',[$entry->itemId])||$this->db->one("SELECT l.id FROM v1_lines l JOIN v1_documents d ON d.id=l.document_id WHERE l.item_id=? AND d.status='POSTED' LIMIT 1",[$entry->itemId])||$this->db->one('SELECT id FROM stock_initializations WHERE item_id=?',[$entry->itemId])) {
                throw new ApiError(409,'INITIAL_STOCK_HISTORY_EXISTS',publicMessage:($item['code']??'Item '.$entry->itemId).': initial zero opening is unavailable. Stock history, an opening or an inconsistent projection already exists. Use the reviewed existing/manual workflow.');
            }
            $seen[$entry->itemId]=true;$checked[]=[$entry,$item];
        }
        // Check every selected item before the first write. Global command/control and stock locks remain held.
        $created=[];
        foreach($checked as [$entry,$item]) {
            $opening=$this->documents->draft($user,$control,(object)['kind'=>'STOCK_OPENING','date'=>$entry->date,'reference'=>'First production '.$d['id'].' / '.$item['code'],'reason'=>'Explicit confirmation: no stock existed before '.$p['date'].'. Selected opening date '.$entry->date.'.','lines'=>[(object)['itemId'=>$entry->itemId,'quantity'=>'0','rate'=>'0']]],null);
            $this->documents->post($user,$control,(object)['version'=>1],$opening['id']);
            $created[]=['itemId'=>$entry->itemId,'openingId'=>$opening['id'],'openingDate'=>$entry->date];
        }return $created;
    }
    public function complete(array $d,array $p,array $user,array $created): array
    {
        $rows=[];$production=$this->db->one('SELECT * FROM v1_documents WHERE id=?',[$d['id']]);
        foreach($created as $entry){$opening=$this->db->one('SELECT * FROM v1_documents WHERE id=?',[$entry['openingId']]);$id=LaborExtensionReceipts::insert($this->db,'stock_initializations',['item_id'=>$entry['itemId'],'production_document_id'=>$d['id'],'opening_document_id'=>$opening['id'],'opening_date'=>$entry['openingDate'],'production_date'=>$p['date'],'opening_hash'=>EmployeeHafta::rowHash($opening),'production_hash'=>EmployeeHafta::rowHash($production),'approved'=>1,'actor_id'=>$user['id'],'created_at'=>BusinessCommand::timestamp()]);$rows[]=LaborExtensionReceipts::audit($this->db,'stock_initializations',$id,'STOCK_INITIALIZATION');}
        $data=(new EmployeeHafta($this->db))->data();
        if (!LaborExtensionReconciliation::run($data)['matched']) { throw new ApiError(409,'INITIAL_STOCK_RECONCILIATION_FAILED'); }
        return LaborExtensionReceipts::first($production,$rows,$data);
    }
}
