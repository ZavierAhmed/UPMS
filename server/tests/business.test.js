import test from 'node:test';
import assert from 'node:assert/strict';
import { validateQuantity,masterInput } from '../src/business/validation.js';
import { payloadHash,canonical } from '../src/business/transactions.js';
import { approvalPolicy,pakistanDate } from '../src/business/documents.js';
import { businessRoleGrants,businessRuntimePrivileges } from '../src/business/catalog.js';
test('unit quantities reject excess precision without rounding or floating point',()=>{
  assert.equal(validateQuantity('12',0),'12');assert.equal(validateQuantity('0.125',3),'0.125');
  for(const [value,scale]of [['1.0',0],['1.234',2],['-1',0],['1e3',0],[1.5,2],['123456789012345',6]])assert.throws(()=>validateQuantity(value,scale));
});
test('canonical command payloads are order-independent and reject floating point',()=>{
  assert.equal(payloadHash({b:2,a:'1.20'}),payloadHash({a:'1.20',b:2}));assert.notEqual(payloadHash({a:'1.2'}),payloadHash({a:'1.20'}));
  assert.throws(()=>canonical({money:1.2}));
});
test('staff cannot self-approve even if explicitly delegated approval permission',()=>{
  const staff={id:'1',roles:['accounts'],permissions:['business.approve']};
  assert.throws(()=>approvalPolicy(staff,'1','Synthetic reason'),e=>e.code==='STAFF_SELF_APPROVAL_FORBIDDEN');
  approvalPolicy(staff,'2','Synthetic reason');
  const admin={...staff,roles:['administrator']};assert.throws(()=>approvalPolicy(admin,'1',''),e=>e.code==='JUSTIFICATION_REQUIRED');approvalPolicy(admin,'1','Justified self approval');
  assert.throws(()=>approvalPolicy({...admin,permissions:[]},'2','Reason'),e=>e.code==='ACCESS_DENIED');
});
test('numbering calendar boundary uses Pakistan time rather than UTC year',()=>{
  assert.equal(pakistanDate(new Date('2026-12-31T18:59:59Z')),'2026-12-31');assert.equal(pakistanDate(new Date('2026-12-31T19:00:00Z')),'2027-01-01');
});
test('department defaults separate inventory, financial masters and approval authority',()=>{
  for(const role of ['inventory','sales_dispatch','accounts'])assert.ok(!businessRoleGrants[role].includes('business.approve'));
  assert.ok(!businessRoleGrants.inventory.includes('masters.finance.read'));assert.ok(!businessRoleGrants.sales_dispatch.includes('masters.vendors.read'));
  for(const grants of Object.values(businessRuntimePrivileges))assert.ok(!grants.includes('DELETE'));
});
test('master inputs normalize codes and reject automatic balances or variant packing',()=>{
  assert.equal(masterInput('customers').parse({code:' customer_1 ',name:'Customer',active:true,reason:'Synthetic fixture'}).code,'CUSTOMER_1');
  assert.throws(()=>masterInput('customers').parse({code:'C',name:'Customer',active:true,reason:'Synthetic fixture',balance:'0.00'}));
  assert.throws(()=>masterInput('units').parse({code:'U',name:'Unit',active:true,reason:'Synthetic fixture',scale:7}));
  assert.throws(()=>masterInput('items').parse({code:'I',name:'Item',active:true,reason:'Synthetic fixture',category_code:'FINISHED_GOODS',unit_id:'1',packing:'12 pack'}));
});
