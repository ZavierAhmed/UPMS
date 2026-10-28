import assert from 'node:assert/strict';
import {today} from '../server/src/simple-v1/exact.js';

export async function integrityProbes({corrupt,db}){
 const docs=await db('v1_documents').where({status:'POSTED'}).orderBy('id'),expense=docs.find(d=>d.kind==='EXPENSE');
 async function check(name,table,id,patch,expected,code){const r=await corrupt('PHP71 '+name,table,id,patch,expected);if(code)assert.ok(r.integrityFindings.some(f=>f.code===code),name+JSON.stringify(r));assert.equal(r.authenticityVerified,false);return r;}
 const payload=(patch)=>row=>({payload:JSON.stringify({...JSON.parse(row.payload),...patch})});
 await check('legitimate explicit null party','v1_documents',expense.id,payload({partyId:null}),'valid');
 await check('legitimate null expense snapshot','v1_documents',expense.id,payload({partySnapshot:null}),'valid');
 await check('incompatible expense snapshot','v1_documents',expense.id,payload({partySnapshot:{id:'1'}}),'mismatch','EXPENSE_PARTY_EVIDENCE');
 for(const partyId of ['',false,0,[],{},'999999'])await check('invalid expense party '+JSON.stringify(partyId),'v1_documents',expense.id,payload({partyId}),'mismatch','EXPENSE_PARTY_EVIDENCE');
 await check('missing expense party','v1_documents',expense.id,row=>{const p=JSON.parse(row.payload);delete p.partyId;return{payload:JSON.stringify(p)};},'mismatch','EXPENSE_PARTY_EVIDENCE');
 for(const kind of new Set(docs.map(d=>d.kind))){const d=docs.find(d=>d.kind===kind);await check(kind+' payload/SQL date mismatch','v1_documents',d.id,payload({date:'1901-01-01'}),'mismatch','DOCUMENT_DATE_MISMATCH');}
 for(const date of ['2023-02-29','not-a-date',123,null])await check('invalid payload date '+date,'v1_documents',expense.id,payload({date}),'mismatch','DOCUMENT_DATE_INVALID');
 for(const date of ['1900-01-01','2024-02-29',today()])await check('legitimate date '+date,'v1_documents',expense.id,row=>({date,payload:JSON.stringify({...JSON.parse(row.payload),date})}),'valid');
 await check('consistent future import needs review','v1_documents',expense.id,row=>({date:'2099-01-01',payload:JSON.stringify({...JSON.parse(row.payload),date:'2099-01-01'})}),'review','FUTURE_POSTED_DATE_REVIEW');
 for(const value of [12.34,null,false,[],{},'1e3','1.001','-1'])await check('invalid amount '+JSON.stringify(value),'v1_documents',expense.id,payload({amount:value}),'mismatch',typeof value==='string'?'AMOUNT_VALUE_INVALID':'AMOUNT_REPRESENTATION_INVALID');
 for(const kind of ['CLIENT_OPENING','VENDOR_OPENING','OPENING_CORRECTION','CLIENT_PAYMENT','VENDOR_PAYMENT']){const d=docs.find(d=>d.kind===kind);await check(kind+' numeric amount','v1_documents',d.id,payload({amount:12.34}),'mismatch','AMOUNT_REPRESENTATION_INVALID');}
 for(const kind of ['STOCK_OPENING','PRODUCTION','PURCHASE','CHALLAN','CHALLAN_RETURN','PAYMENT_REVERSAL','STOCK_CORRECTION']){const d=docs.find(d=>d.kind===kind);await check(kind+' numeric amount metadata','v1_documents',d.id,payload({amount:12.34}),'mismatch','AMOUNT_REPRESENTATION_INVALID');}
 for(const kind of ['PURCHASE','CHALLAN','CHALLAN_RETURN']){const d=docs.find(d=>d.kind===kind);await check(kind+' numeric rate','v1_documents',d.id,row=>{const p=JSON.parse(row.payload);p.lines[0].rate=12.34;return{payload:JSON.stringify(p)};},'mismatch','AMOUNT_REPRESENTATION_INVALID');}
 for(const kind of ['STOCK_OPENING','PRODUCTION','PURCHASE','CHALLAN','STOCK_CORRECTION','CHALLAN_RETURN']){const d=docs.find(d=>d.kind===kind);await check(kind+' object cannot masquerade as line array','v1_documents',d.id,row=>{const p=JSON.parse(row.payload);p.lines={...p.lines};return{payload:JSON.stringify(p)};},'mismatch','DOCUMENT_LINES_INVALID');}
 const returned=docs.find(d=>d.kind==='CHALLAN_RETURN');for(const field of ['returnCredit','lineCredit'])await check('numeric '+field,'v1_documents',returned.id,row=>{const p=JSON.parse(row.payload);if(field==='returnCredit')p.returnCredit=12.34;else p.lines[0].credit=12.34;return{payload:JSON.stringify(p)};},'mismatch','AMOUNT_REPRESENTATION_INVALID');
 const challan=docs.find(d=>d.kind==='CHALLAN'&&JSON.parse(d.payload).entryVersion===2);
 for(const field of ['discountValue','value','subtotal','amount','total'])await check('numeric discount '+field,'v1_documents',challan.id,row=>{const p=JSON.parse(row.payload);if(field==='discountValue')p.discountValue=1;else p.discountSummary[field]=1;return{payload:JSON.stringify(p)};},'mismatch','AMOUNT_REPRESENTATION_INVALID');
 const legacy=docs.find(d=>d.kind==='CHALLAN'&&d.total===d.sale_subtotal);
 assert.ok(legacy,'Undiscounted historical compatibility fixture');await check('historical pre-entry-version challan','v1_documents',legacy.id,row=>{const p=JSON.parse(row.payload);delete p.entryVersion;delete p.discountSummary;return{payload:JSON.stringify(p),sale_subtotal:null,discount_mode:null,discount_value:null,discount_amount:null};},'valid');
 for(const bad of ['{','[]','null'])await check('malformed document '+bad,'v1_documents',expense.id,{payload:bad},'mismatch','DOCUMENT_PAYLOAD_INVALID');
 const commands=await db('v1_commands').orderBy('key'),command=commands.find(c=>JSON.parse(c.result).status==='POSTED'&&JSON.parse(c.result).id===String(expense.id));assert.ok(command);
 for(const fingerprint of ['x'.repeat(64),'abc','A'.repeat(64)])await check('bad fingerprint '+fingerprint.slice(0,4),'v1_commands',command.key,{fingerprint},'mismatch','COMMAND_FINGERPRINT_FORMAT');
 await check('well-formed hash is NOT authenticated','v1_commands',command.key,{fingerprint:'0'.repeat(64)},'valid');
 await check('malformed key','v1_commands',command.key,{key:'invalid-command-key'},'mismatch','COMMAND_KEY_INVALID');
 await check('missing actor','v1_commands',command.key,{actor_id:'999999999'},'mismatch','COMMAND_ACTOR_MISSING');
 await check('retained actor contradicts posting audit','v1_commands',command.key,{actor_id:'3'},'mismatch','COMMAND_ACTOR_EVIDENCE');
 for(const result of ['{','[]','null',JSON.stringify({id:12}),JSON.stringify({id:'01'}),JSON.stringify({id:'99999999999999999'})])await check('invalid command result '+result,'v1_commands',command.key,{result},'mismatch',result.includes('999999')?'COMMAND_RESULT_REFERENCE':'COMMAND_RESULT_INVALID');
 for(const patch of [{total:12.34},{total:'0.01'},{official_number:'WRONG'},{status:'DRAFT'},{extra:'unexpected'}])await check('post receipt '+Object.keys(patch)[0],'v1_commands',command.key,{result:JSON.stringify({...JSON.parse(command.result),...patch})},'mismatch',('total'in patch&&typeof patch.total==='string')||'official_number'in patch?'COMMAND_RESULT_DOCUMENT':'COMMAND_RESULT_INVALID');
 await check('missing unambiguous post receipt is legacy-unverifiable','v1_commands',command.key,{result:JSON.stringify({id:String(expense.id)})},'review','COMMAND_COVERAGE_UNVERIFIABLE');
 const reversal=docs.find(d=>d.kind==='PAYMENT_REVERSAL');await check('historic contradictory reversal snapshot','v1_documents',reversal.id,payload({partySnapshot:{id:'999999999',name:'Unrelated synthetic party'}}),'mismatch','REVERSAL_SNAPSHOT_IDENTITY');
 await check('historic reversal without snapshot remains compatible','v1_documents',reversal.id,row=>{const p=JSON.parse(row.payload);p.partyId=null;delete p.partySnapshot;return{payload:JSON.stringify(p)};},'valid');
 await check('historic reversal contradictory hint without snapshot','v1_documents',reversal.id,row=>{const p=JSON.parse(row.payload);p.partyId='999999999';delete p.partySnapshot;return{payload:JSON.stringify(p)};},'mismatch','REVERSAL_SNAPSHOT_IDENTITY');
}
