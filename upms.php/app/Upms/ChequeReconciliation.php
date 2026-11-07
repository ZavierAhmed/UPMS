<?php
declare(strict_types=1);
namespace App\Upms;

/** Pure, bidirectional evidence checks shared by runtime and independent recovery. */
final class ChequeReconciliation
{
    /** Rebuild the receivable source footprint for instrument customers in ID order.
     * This also checks opening/journal coverage during an offline recovery, rather
     * than trusting a surviving opening document whose journal was lost. */
    private static function partySources(array $d,array $instruments,callable $add): void
    {
        $clients=array_fill_keys(array_map(static fn($c)=>(string)$c['client_id'],$instruments),true);$balances=[];
        $docs=$d['v1_documents']??[];usort($docs,static fn($a,$b)=>\Brick\Math\BigInteger::of((string)$a['id'])->compareTo((string)$b['id']));
        $seen=[];$byId=array_column($docs,null,'id');
        foreach($docs as $doc) {
            $client=(string)($doc['party_id']??'');if(!isset($clients[$client])||$doc['status']!=='POSTED') { continue; }
            try {
                $p=SimpleV1::payload($doc);$total=Exact::cents($doc['total'],zero:true);$debit=$credit=\Brick\Math\BigInteger::zero();$before=$balances[$client]??\Brick\Math\BigInteger::zero();
                switch($doc['kind']) {
                    case 'CLIENT_OPENING':
                        if(Exact::money(Exact::cents($p['amount'],zero:true))!==$doc['total']) { throw new \RuntimeException(); }
                        if($p['direction']==='OWED_TO_COMPANY') { $debit=$total; }elseif($p['direction']==='OWED_BY_COMPANY') { $credit=$total; }else { throw new \RuntimeException(); }break;
                    case 'CHALLAN': $debit=$total;break;
                    case 'CHALLAN_RETURN': $credit=$total;break;
                    case 'CLIENT_PAYMENT':
                        $credit=$total;if(Exact::money(Exact::cents($p['amount']))!==$doc['total']) { throw new \RuntimeException(); }
                        if(($p['method']??'')==='CHEQUE_CLEARED'&&$before->compareTo($total)<0) { $add('CHEQUE_RECEIVABLE_SOURCE_INSUFFICIENT',$doc['id']); }break;
                    case 'PAYMENT_REVERSAL':
                        if(($byId[$p['correctsId']]['kind']??'')!=='CLIENT_PAYMENT') { throw new \RuntimeException(); }$debit=$total;break;
                    case 'FINANCIAL_REFUND':
                        if(($byId[$p['originalId']]['kind']??'')!=='CLIENT_PAYMENT') { throw new \RuntimeException(); }$debit=$total;break;
                    case 'OPENING_CORRECTION':
                        $desired=Exact::cents($p['amount'],zero:true);if($p['direction']==='OWED_BY_COMPANY') { $desired=$desired->negated(); }elseif($p['direction']!=='OWED_TO_COMPANY') { throw new \RuntimeException(); }
                        $delta=$desired->minus($before);if($delta->isNegative()) { $credit=$delta->negated(); }else { $debit=$delta; }break;
                    default: throw new \RuntimeException();
                }
                $js=array_values(array_filter($d['v1_party_journal']??[],static fn($j)=>(string)$j['document_id']===(string)$doc['id']));
                if(count($js)!==1||(string)$js[0]['party_id']!==$client||$js[0]['debit']!==Exact::money($debit)||$js[0]['credit']!==Exact::money($credit)) { throw new \RuntimeException(); }
                $seen[(string)$js[0]['id']]=true;$balances[$client]=$before->plus($debit)->minus($credit);
            }catch(\Throwable) { $add('CHEQUE_CLIENT_JOURNAL_SOURCE_INVALID',$doc['id']); }
        }
        foreach($d['v1_party_journal']??[] as $j) { if(isset($clients[(string)$j['party_id']])&&!isset($seen[(string)$j['id']])) { $add('CHEQUE_ORPHAN_CLIENT_JOURNAL',$j['id']); } }
    }
    public static function run(array $d, bool $decryptAttachments = true): array
    {
        $errors=[];$add=static function($code,$id='') use(&$errors) { $errors[]=['code'=>$code,'id'=>(string)$id]; };
        $index=static function($rows) { $out=[];foreach($rows as $r) { $out[(string)$r['id']]=$r; }return $out; };
        $instruments=$index($d['cheque_instruments']??[]);$events=$index($d['cheque_events']??[]);$docs=$index($d['v1_documents']??[]);$batches=$index($d['money_batches']??[]);$movements=$index($d['money_movements']??[]);$issuers=$index($d['cheque_issuing_banks']??[]);$parties=$index($d['v1_parties']??[]);$users=$index($d['users']??[]);$accounts=$index($d['money_accounts']??[]);
        self::partySources($d,$instruments,$add);
        $identities=[];$references=[];$seenEvents=[];$seenClaims=[];$seenDocuments=[];$seenBatches=[];$seenMovements=[];$receipts=[];
        foreach($d['v1_commands']??[] as $command) {
            try { $r=json_decode($command['result'],false,512,JSON_THROW_ON_ERROR);if(isset($r->chequeVersion)) { if(!Cheques::validReceipt($r,(string)$command['actor_id'],$d)||isset($receipts[$r->eventId])) { $add('CHEQUE_COMMAND_INVALID',$command['key']); }else { $receipts[$r->eventId]=$r; } } }catch(\Throwable) { $add('CHEQUE_COMMAND_JSON_INVALID',$command['key']); }
        }
        $claims=[];foreach($d['cheque_clearances']??[] as $c) { $claims[(string)$c['cheque_id']][]=$c; }
        foreach($instruments as $id=>$c) {
            $key=$c['issuing_bank_id'].'|'.$c['drawer_account_key'].'|'.$c['number'];
            $snapshot=json_decode($c['client_snapshot'],true);
            if(isset($identities[$key])||isset($references[$c['reference']])||!preg_match('/^[1-9][0-9]{0,29}$/D',$c['number'])||!preg_match('/^[A-Z0-9]{6,34}$/D',$c['drawer_account_key'])||!isset($issuers[$c['issuing_bank_id']],$parties[$c['client_id']],$users[$c['actor_id']])||($snapshot['id']??'')!==(string)$c['client_id']||!isset($snapshot['name'],$snapshot['address'],$snapshot['version'])) { $add('CHEQUE_IDENTITY_INVALID',$id); }
            $identities[$key]=true;$references[$c['reference']]=true;
            try { Exact::cents($c['amount']); }catch(\Throwable) { $add('CHEQUE_AMOUNT_INVALID',$id); }
            $chain=array_values(array_filter($events,fn($e)=>(string)$e['cheque_id']===(string)$id));usort($chain,fn($a,$b)=>(int)$a['ordinal']<=>(int)$b['ordinal']);
            $prev=null;$prevHash=str_repeat('0',64);$ordinal=0;
            foreach($chain as $e) {
                $seenEvents[(string)$e['id']]=true;$ordinal++;$hash=hash('sha256',Cheques::hash($c).Cheques::hash($e));
                $allowed=['RECEIVED'=>[null],'DEPOSITED'=>['RECEIVED'],'CLEARED'=>['DEPOSITED'],'DISHONOURED'=>['DEPOSITED'],'RETURNED'=>['RECEIVED','DEPOSITED','DISHONOURED'],'CANCELLED'=>['RECEIVED']];
                $a=array_values(array_filter($d['cheque_audit']??[],fn($a)=>(string)$a['event_id']===(string)$e['id']));
                if(!isset($allowed[$e['type']])||!in_array($prev['type']??null,$allowed[$e['type']]??[],true)||(int)$e['ordinal']!==$ordinal||$e['previous_hash']!==$prevHash||$e['date']<($prev['date']??$c['received_date'])||mb_strlen(trim($e['reference']))<3||mb_strlen(trim($e['reason']))<10||($e['type']!=='RECEIVED'&&mb_strlen(trim($e['evidence']))<10)||($ordinal===1&&($e['date']!==$c['received_date']||(string)$e['actor_id']!==(string)$c['actor_id']))||!isset($users[$e['actor_id']])||count($a)!==1||$a[0]['payload_hash']!==$hash||(string)$a[0]['actor_id']!==(string)$e['actor_id']||$a[0]['created_at']!==$e['created_at']||!isset($receipts[(string)$e['id']])) { $add('CHEQUE_EVENT_CHAIN_INVALID',$e['id']); }
                if(in_array($e['type'],['DEPOSITED','CLEARED','DISHONOURED'],true)) {
                    $opening=array_filter($batches,fn($b)=>$b['kind']==='OPENING'&&(string)$b['to_account_id']===(string)$e['bank_id']&&$b['date']<=$e['date']);
                    if(($accounts[$e['bank_id']]['type']??'')!=='BANK'||count($opening)!==1||($e['type']!=='DEPOSITED'&&(string)$e['bank_id']!==(string)($prev['bank_id']??''))) { $add('CHEQUE_BANK_COVERAGE_INVALID',$e['id']); }
                }elseif($e['bank_id']!==null) { $add('CHEQUE_UNEXPECTED_BANK',$e['id']); }
                if($e['type']==='CLEARED') {
                    $openings=array_filter($docs,fn($x)=>$x['kind']==='CLIENT_OPENING'&&$x['status']==='POSTED'&&(string)$x['party_id']===(string)$c['client_id']&&$x['date']<=$e['date']);
                    if(count($openings)!==1) { $add('CHEQUE_PARTY_COVERAGE_INVALID',$e['id']); }
                    if(array_filter($chain,fn($x)=>(int)$x['ordinal']<(int)$e['ordinal']&&(string)$x['actor_id']===(string)$e['actor_id'])&&mb_strlen(trim($e['self_approval_reason']))<10) { $add('CHEQUE_SELF_APPROVAL_EVIDENCE_REQUIRED',$e['id']); }
                    $cs=$claims[$id]??[];$claim=count($cs)===1?$cs[0]:null;$doc=$docs[$e['document_id']]??null;$batch=$batches[$e['batch_id']]??null;$move=$claim?($movements[$claim['movement_id']]??null):null;$p=$doc?SimpleV1::payload($doc):[];
                    $journal=$doc?array_values(array_filter($d['v1_party_journal']??[],fn($j)=>(string)$j['document_id']===(string)$doc['id'])):[];
                    if(!$claim||!$doc||!$batch||!$move||$doc['kind']!=='CLIENT_PAYMENT'||$doc['status']!=='POSTED'||!MoneyDocuments::cheque($p)||($p['chequeSource']['id']??'')!==(string)$id||($p['chequeSource']['depositEventId']??'')!==(string)($prev['id']??'')||($p['moneyAccountId']??'')!==(string)$e['bank_id']||$doc['total']!==$c['amount']||(string)$doc['party_id']!==(string)$c['client_id']||$doc['date']!==$e['date']||$e['date']<$c['cheque_date']||$batch['source_type']!=='DOCUMENT'||$batch['source_ref']!=='UPMS-DOC:'.$doc['id']||$batch['kind']!=='SOURCE_CREDIT'||$batch['amount']!==$c['amount']||(string)$batch['to_account_id']!==(string)$e['bank_id']||$batch['date']!==$e['date']||(string)$batch['actor_id']!==(string)$e['actor_id']||(string)$move['batch_id']!==(string)$batch['id']||(string)$move['account_id']!==(string)$e['bank_id']||$move['delta']!==$c['amount']||count($journal)!==1||$journal[0]['debit']!=='0.00'||$journal[0]['credit']!==$c['amount']||(string)$journal[0]['party_id']!==(string)$c['client_id']) { $add('CHEQUE_FINANCIAL_SOURCE_MISMATCH',$e['id']); }
                    if($claim&&$doc&&$batch&&$move) {
                        foreach(['event_id'=>$e['id'],'document_id'=>$doc['id'],'batch_id'=>$batch['id'],'movement_id'=>$move['id'],'actor_id'=>$e['actor_id'],'created_at'=>$e['created_at'],'instrument_hash'=>Cheques::hash($c),'event_hash'=>$hash,'document_hash'=>Cheques::hash($doc),'batch_hash'=>Cheques::hash($batch),'movement_hash'=>Cheques::hash($move)] as $field=>$value) { if((string)$claim[$field]!== (string)$value) { $add('CHEQUE_CLAIM_HASH_INVALID',$claim['id']); } }
                        if(isset($seenDocuments[$doc['id']])||isset($seenBatches[$batch['id']])||isset($seenMovements[$move['id']])) { $add('CHEQUE_DUPLICATE_EFFECT',$e['id']); }
                        $seenClaims[$claim['id']]=true;$seenDocuments[$doc['id']]=true;$seenBatches[$batch['id']]=true;$seenMovements[$move['id']]=true;
                    }
                }elseif($e['document_id']!==null||$e['batch_id']!==null) { $add('CHEQUE_UNCLEARED_FINANCIAL_LINK',$e['id']); }
                $prev=$e;$prevHash=$hash;
            }
            if(!$chain||(($prev['type']??'')!=='CLEARED'&&isset($claims[$id]))) { $add('CHEQUE_STATE_CLAIM_MISMATCH',$id); }
        }
        foreach($events as $e) { if(!isset($seenEvents[$e['id']])) { $add('CHEQUE_ORPHAN_EVENT',$e['id']); } }
        foreach($d['cheque_audit']??[] as $a) { if(!isset($events[$a['event_id']])) { $add('CHEQUE_ORPHAN_AUDIT',$a['id']); } }
        foreach($d['cheque_clearances']??[] as $c) { if(!isset($seenClaims[$c['id']])) { $add('CHEQUE_ORPHAN_CLAIM',$c['id']); } }
        foreach($docs as $doc) { $p=SimpleV1::payload($doc);if(($p['method']??'')==='CHEQUE_CLEARED'&&!isset($seenDocuments[$doc['id']])) { $add('CHEQUE_UNCLAIMED_PAYMENT',$doc['id']); } }
        foreach($batches as $b) { if($b['source_type']==='EXTERNAL'&&(str_starts_with(strtolower($b['source_ref']),'upms-cheque:')||isset($references[strtoupper(V1Input::trim($b['source_ref']))]))) { $add('CHEQUE_NONCANONICAL_BANK_EFFECT',$b['id']); } }
        foreach($d['cheque_bank_creations']??[] as $bank) {
            $issuer=$issuers[$bank['id']]??null;
            if(!$issuer||$issuer['name']!==$bank['name']||$issuer['code']!==$bank['code']||!isset($receipts['bank:'.$bank['id']])) { $add('CHEQUE_DIRECTORY_EVIDENCE_INVALID',$bank['id']); }
        }
        $fileCounts=[];
        foreach($d['cheque_attachments']??[] as $file) {
            $event=$events[$file['event_id']]??null;
            $fileCounts[$file['event_id']]=($fileCounts[$file['event_id']]??0)+1;
            if(!$event||(string)$event['cheque_id']!==(string)$file['cheque_id']||(string)$event['actor_id']!==(string)$file['actor_id']||!in_array($event['type'],['RECEIVED','DEPOSITED','CLEARED'],true)||$fileCounts[$file['event_id']]>2) { $add('CHEQUE_ATTACHMENT_LINK_INVALID',$file['id']); }
            if ($decryptAttachments) {
                try { ChequeExtras::decrypt($file); } catch(\Throwable) { $add('CHEQUE_ATTACHMENT_INTEGRITY_INVALID',$file['id']); }
            }
        }
        return ['matched'=>!$errors,'findings'=>$errors,'instruments'=>count($instruments),'events'=>count($events),'cleared'=>count($seenClaims),'policy'=>'No recognition until complete bank clearance; pending custody is not spendable money'];
    }
}
