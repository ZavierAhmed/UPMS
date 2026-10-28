import assert from 'node:assert/strict';
import {randomUUID} from 'node:crypto';

// Runs after the accepted PHP-6/7.1 suite, against its independent disposable pair.
export async function editablePricingProbes({same,post,draft,tables,databases,snapshot,date,ref,appDriver,raceKeys}){
 const prefix='/api/v1/management/simple-v1/';
 const read=(name,path)=>same('PHP76 '+name,'GET',prefix+path);
 const itemBody={description:'PHP76 manual bottle',quality:'A',colour:'Graphite',packing:'12',sellingPrice:'50.00'};
 const item=await same('PHP76 item','POST',prefix+'items',itemBody),other=await same('PHP76 other item','POST',prefix+'items',{...itemBody,description:'PHP76 second bottle',sellingPrice:'10.01'});
 const clients=[];for(const name of ['A','B']){const p=await same('PHP76 client '+name,'POST',prefix+'parties',{kind:'CLIENT',name:'PHP76 '+name});clients.push(p);await post('PHP76 client opening '+name,{kind:'CLIENT_OPENING',partyId:p.id,amount:'0',direction:'OWED_TO_COMPANY'});}
 for(const i of [item,other])await post('PHP76 stock opening',{kind:'STOCK_OPENING',lines:[{itemId:i.id,quantity:'500'}]});
 const originalItems=await databases[1]('v1_items').whereIn('id',[item.id,other.id]).orderBy('id');
 const body=(rate,party=clients[0].id,quantity='100')=>({kind:'CHALLAN',partyId:party,lines:[{itemId:item.id,quantity,rate}]});
 const defaults=await post('PHP76 default 50',body('50.00',clients[0].id,'1'));assert.equal(defaults.total,'50.00');
 const low=await post('PHP76 A rate45',body('45.00'));assert.equal(low.total,'4500.00');
 const high=await post('PHP76 B rate55',body('55.00',clients[1].id));assert.equal(high.total,'5500.00');
 assert.equal((await read('quantity-based stock deduction','items')).records.find(i=>i.id===item.id).quantity,'299');
 const detail=await read('chosen rate saved','documents/'+low.id);assert.equal(detail.payload.lines[0].defaultRateSnapshot,'50.00');assert.equal(detail.payload.lines[0].rateSource,'CUSTOM');assert.equal(detail.lines[0].rate,'45.00');
 assert.equal((await read('A ledger','ledgers/'+clients[0].id)).closing,'4550.00');assert.equal((await read('B ledger','ledgers/'+clients[1].id)).closing,'5500.00');
 const multiple=await post('PHP76 multiple overrides',{...body('40.00',clients[0].id,'2'),lines:[{itemId:item.id,quantity:'2',rate:'40.00'},{itemId:other.id,quantity:'3',rate:'7.77'}]});assert.equal(multiple.total,'103.31');
 const fixed=await post('PHP76 fixed discount',{...body('45.00',clients[0].id,'2'),discountMode:'FIXED',discountValue:'0.01'});assert.equal(fixed.total,'89.99');
 const percent=await post('PHP76 percent discount',{...body('45.00',clients[0].id,'2'),discountMode:'PERCENT',discountValue:'12.50'});assert.equal(percent.total,'78.75');
 const d=await draft('PHP76 draft retain',body('44.44',clients[0].id,'2'));assert.equal((await read('reload custom draft','documents/'+d.id)).payload.lines[0].rate,'44.44');
 await same('PHP76 edit retains custom','PATCH',prefix+'documents/'+d.id,{date,...body('44.44',clients[1].id,'3'),version:1});assert.equal((await read('edit custom review','documents/'+d.id)).payload.lines[0].rate,'44.44');
 await same('PHP76 explicit default reset','PATCH',prefix+'documents/'+d.id,{date,...body('50.00',clients[1].id,'3'),version:2});assert.equal((await read('reset source','documents/'+d.id)).payload.lines[0].rateSource,'ITEM_DEFAULT');
 for(const rate of ['0','-1','1.234','1e2','NaN','10000000000000','9999999999999.99']){const before=await snapshot(databases[1]);const invalid=await draft('PHP76 invalid '+rate,body(rate,clients[0].id,rate==='9999999999999.99'?'999999999999999':'1'));assert.ok(invalid.error);assert.deepEqual(await snapshot(databases[1]),before);}
 const invalidType=await draft('PHP76 numeric rate',body(45));assert.equal(invalidType.error.code,'INVALID_INPUT');
 assert.deepEqual(await databases[1]('v1_items').whereIn('id',[item.id,other.id]).orderBy('id'),originalItems);
 const forged=body('45.00',clients[0].id,'1');Object.assign(forged.lines[0],{reviewedItemVersion:1,pricingVersion:999,expectedVersion:999,defaultRateSnapshot:'1.00',rateSource:'ITEM_DEFAULT'});const authoritative=await draft('PHP76 ignores forged derived context',forged),stored=(await read('server-derived context','documents/'+authoritative.id)).payload.lines[0];assert.equal(stored.pricingVersion,1);assert.equal(stored.expectedVersion,1);assert.equal(stored.defaultRateSnapshot,'50.00');assert.equal(stored.rateSource,'CUSTOM');
 const stale=await draft('PHP76 stale custom',body('43.21',clients[0].id,'2'));
 await same('PHP76 default changed','PATCH',prefix+'items/'+item.id,{...itemBody,sellingPrice:'60.00',version:1});
 const beforeStale=await snapshot(databases[1]);assert.ok((await same('PHP76 stale post rejected','POST',prefix+'documents/'+stale.id+'/post',{version:1})).error);assert.deepEqual(await snapshot(databases[1]),beforeStale);
 assert.equal((await read('stale custom preserved','documents/'+stale.id)).payload.lines[0].rate,'43.21');
 const review={date,...body('43.21',clients[0].id,'2'),version:1};review.lines[0].reviewedItemVersion=1;assert.equal((await same('PHP76 stale client review rejected','PATCH',prefix+'documents/'+stale.id,review)).error.code,'PRICE_CHANGED');
 review.lines[0].reviewedItemVersion=2;await same('PHP76 explicit rereview custom','PATCH',prefix+'documents/'+stale.id,review);assert.equal((await same('PHP76 post retained custom','POST',prefix+'documents/'+stale.id+'/post',{version:2})).total,'86.42');
 assert.deepEqual((await read('historical sale unchanged','documents/'+low.id)).lines,detail.lines);
 const source=await read('historical return source','documents/'+low.id);let credited=0n;for(const quantity of ['1','33','66']){const returned=await post('PHP76 partial/full historical '+quantity,{kind:'CHALLAN_RETURN',partyId:clients[0].id,originalId:low.id,reason:'Accepted synthetic manual-rate return',lines:[{itemId:item.id,originalLineId:source.lines[0].id,quantity,rate:'45.00'}]});credited+=BigInt(returned.total.replace('.',''));}assert.equal(credited,450000n);
 const centsSale=await post('PHP76 final cent custom',{...body('0.02',clients[0].id,'3'),discountMode:'FIXED',discountValue:'0.01'}),centSource=await read('cent return source','documents/'+centsSale.id);let cents=0n;for(let i=0;i<3;i++){const r=await post('PHP76 cumulative discounted cent '+i,{kind:'CHALLAN_RETURN',partyId:clients[0].id,originalId:centsSale.id,reason:'Accepted final-cent return',lines:[{itemId:item.id,originalLineId:centSource.lines[0].id,quantity:'1',rate:'0.02'}]});cents+=BigInt(r.total.replace('.',''));}assert.equal(cents,5n);
 const insufficient=await draft('PHP76 oversell custom',body('1.23',clients[0].id,'999999'));const stable=await snapshot(databases[1]);assert.equal((await same('PHP76 oversell reject','POST',prefix+'documents/'+insufficient.id+'/post',{version:1})).error.code,'INSUFFICIENT_STOCK');assert.deepEqual(await snapshot(databases[1]),stable);
 const replayBody={date,...body('42.42',clients[0].id,'1')},key=randomUUID(),saved=await same('PHP76 key custom draft','POST',prefix+'documents',replayBody,{key});assert.deepEqual(await same('PHP76 identical key replay','POST',prefix+'documents',replayBody,{key}),saved);assert.equal((await same('PHP76 changed rate same key','POST',prefix+'documents',{...replayBody,lines:[{...replayBody.lines[0],rate:'42.43'}]},{key})).error.code,'IDEMPOTENCY_CONFLICT');
 const racing=await draft('PHP76 concurrent custom',body('33.33',clients[1].id,'2')),keys=[randomUUID(),randomUUID()];keys.forEach(k=>raceKeys.add(k));const beforeRace=(await read('stock before custom race','items')).records.find(i=>i.id===item.id).quantity;
 for(const outcomes of await Promise.all([ref,appDriver].map(driver=>Promise.all(keys.map(key=>driver.call('POST',prefix+'documents/'+racing.id+'/post',{version:1},{key}))))))assert.deepEqual(outcomes.map(r=>r.status).sort(),[200,409]);
 assert.equal((await read('stock after custom race','items')).records.find(i=>i.id===item.id).quantity,(BigInt(beforeRace)-2n).toString());await tables('PHP76 concurrent custom posting exactly once');
 const legacy=await draft('PHP76 prior-policy compatible draft',body('60.00',clients[0].id,'1'));for(const db of databases){const row=await db('v1_documents').where({id:legacy.id}).first(),p=JSON.parse(row.payload);delete p.lines[0].defaultRateSnapshot;delete p.lines[0].rateSource;await db('v1_documents').where({id:legacy.id}).update({payload:JSON.stringify(p)});}assert.equal((await same('PHP76 legacy current version posts','POST',prefix+'documents/'+legacy.id+'/post',{version:1})).total,'60.00');assert.equal((await read('legacy provenance not invented','documents/'+legacy.id)).payload.lines[0].rateSource,undefined);
 assert.equal((await read('final reconciliation','reconciliation')).matched,true);await tables('PHP76 exact custom pricing payloads lines journals audit commands');
 return {itemId:item.id,clientId:clients[0].id};
}
