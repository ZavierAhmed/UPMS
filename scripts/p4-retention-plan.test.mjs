import {test} from 'node:test';
import assert from 'node:assert/strict';
import {retentionSelection} from './p4-retention-plan.mjs';
test('approved retention never authorizes deletion, and holds/pre-existing archives remain protected',()=>{
 const now=Date.UTC(2026,10,5,12,30),old=now-500*86400000;
 const data=[{name:'old',created:old},{name:'held',created:old+1},{name:'latest',created:now},{name:'same-hour',created:now-1000}];
 const chosen=retentionSelection(data,now,old+1,new Set(['held']));
 assert.equal(chosen.find(a=>a.name==='old').retain,true);assert.equal(chosen.find(a=>a.name==='held').retain,true);assert.equal(chosen.find(a=>a.name==='latest').retain,true);assert.equal(chosen.find(a=>a.name==='same-hour').retain,false);assert.ok(chosen.every(a=>a.deletionAuthorized===false));
});
test('daily, weekly and monthly tiers retain representative recovery points',()=>{
 const now=Date.UTC(2026,10,5),entries=[3,3.1,40,40.1,150,150.1].map((days,i)=>({name:String(i),created:now-days*86400000}));
 const result=retentionSelection(entries,now,0);assert.equal(result.filter(a=>a.retain).length,3);assert.ok(result.every(a=>a.deletionAuthorized===false));
});
