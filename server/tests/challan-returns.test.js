import test from 'node:test';
import assert from 'node:assert/strict';
import {returnCredits,returnNumber} from '../src/simple-v1/challan-returns.js';
import {documentInput} from '../src/simple-v1/service.js';
import {databaseConfig} from '../src/identity/config.js';
import {transactionRegister} from '../src/simple-v1/register.js';
const lines=[{id:'1',item_id:'10',quantity:'3',rate:'0.01',amount:'0.03',snapshot:'{"code":"ITM-1"}'},{id:'2',item_id:'11',quantity:'2',rate:'0.01',amount:'0.02',snapshot:'{"code":"ITM-2"}'}];
const request=(id,itemId,quantity)=>({originalLineId:id,itemId,quantity});
test('discount allocation telescopes across selected lines and every partial return partition',()=>{
 for(let net=0;net<=5;net++){
  const previous=new Map();let total=0n;
  for(const [id,itemId,count]of [['2','11',2],['1','10',3]])for(let i=0;i<count;i++){
   const [r]=returnCredits(lines,'0.0'+net,previous,[request(id,itemId,'1')]);total+=BigInt(r.credit.replace('.',''));previous.set(id,BigInt(i+1));
  }assert.equal(total,BigInt(net));
 }
});
test('positive quantities, original line and item identity, remaining limit and malformed sources',()=>{
 for(const quantity of ['0','-1','1.2','4'])assert.throws(()=>returnCredits(lines,'0.04',new Map(),[request('1','10',quantity)]));
 assert.throws(()=>returnCredits(lines,'0.04',new Map([['1',2n]]),[request('1','10','2')]));
 for(const r of [request('1','11','1'),request('3','10','1')])assert.throws(()=>returnCredits(lines,'0.04',new Map(),[r]));
 assert.throws(()=>returnCredits(lines,'0.06',new Map(),[request('1','10','1')]));
});
test('DCR identities use never-reused shared document IDs without a DC counter change',()=>{assert.equal(returnNumber('123'),'DCR-0123');assert.equal(returnNumber('10001'),'DCR-10001');});
test('strict return input rejects client-controlled credit or snapshot',()=>{
 const p={kind:'CHALLAN_RETURN',originalId:'1',date:'2026-10-26',partyId:'2',reason:'Accepted resalable bottles',lines:[{itemId:'10',originalLineId:'1',quantity:'1',rate:'0.01'}]};
 assert.equal(documentInput.safeParse(p).success,true);assert.equal(documentInput.safeParse({...p,returnCredit:'999'}).success,false);
});
test('cPanel remains fail closed without approved connectivity and TLS evidence',()=>{
 assert.throws(()=>databaseConfig({UPMS_DATABASE_PROFILE:'godaddy-cpanel',DB_HOST:'localhost'}),{code:'GODADDY_COMPATIBILITY_BLOCKED'});
});
test('return register retains original DC, separate credit and net sales including paid clients',()=>{
 const r=transactionRegister([{id:'3',kind:'CHALLAN_RETURN',status:'POSTED',date:'2026-10-26',official_number:'DCR-0003',party_id:'2',total:'0.04',payload:{originalReference:'DC-0001',lines:[{quantity:'5'}]}}],[{id:'2',name:'Synthetic',kind:'CLIENT',opening_verified:true}],[{party_id:'2',date:'2026-10-26',debit:'0.00',credit:'0.04'}],{reference:'DC-0001'});
 assert.equal(r.records[0].type,'DELIVERY CHALLAN RETURN');assert.equal(r.records[0].originalReference,'DC-0001');assert.equal(r.totals.returnCredits,'0.04');assert.equal(r.totals.netSales,'-0.04');assert.equal(r.clientReceivables,'0.00');
});

test('leading-zero quantities normalize before immutable posting evidence is stored',()=>{assert.equal(returnCredits(lines,'0.04',new Map(),[request('1','10','01')])[0].quantity,'1');});
