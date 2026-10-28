import assert from 'node:assert/strict';
import {writeFile} from 'node:fs/promises';
import {returnCredits,returnNumber} from '../server/src/simple-v1/challan-returns.js';
const source=[{id:'1',item_id:'10',quantity:'3',rate:'0.01',amount:'0.03',snapshot:'{"code":"ITM-0010"}'},{id:'2',item_id:'2',quantity:'2',rate:'0.01',amount:'0.02',snapshot:'{"code":"ITM-0002"}'}],vectors=[],sources=[];
function compositions(n){if(!n)return[[]];return Array.from({length:n},(_,i)=>i+1).flatMap(first=>compositions(n-first).map(rest=>[first,...rest]));}
function capture(lines,net,previous,requested){let sourceIndex=sources.indexOf(lines);if(sourceIndex<0){sourceIndex=sources.length;sources.push(lines);}const input={sourceIndex,net,previous:Object.fromEntries([...previous].map(([k,v])=>[k,v.toString()])),requested};try{const result=returnCredits(lines,net,previous,requested);vectors.push({...input,result});return result;}catch(e){vectors.push({...input,error:{status:e.status,code:e.code,message:e.publicMessage??null,fields:e.fieldErrors??null}});return null;}}
let partitions=0;
for(let cents=0;cents<=5;cents++)for(const a of compositions(3))for(const b of compositions(2))for(const order of [[0,1],[1,0]]){
 const previous=new Map();let total=0n;for(const index of order)for(const count of index===0?a:b){const l=source[index],r=capture(source,'0.0'+cents,previous,[{originalLineId:l.id,itemId:l.item_id,quantity:String(count),rate:l.rate}]);total+=BigInt(r[0].credit.replace('.',''));previous.set(l.id,(previous.get(l.id)||0n)+BigInt(count));}assert.equal(total,BigInt(cents));partitions++;
}
const large=[{...source[0],quantity:'999999999999999',rate:'0.01',amount:'4503599627370.49'},{...source[1],quantity:'999999999999998',rate:'0.01',amount:'4503599627370.50'}];
capture(large,'9007199254740.98',new Map([['1',999999999999998n]]),[{originalLineId:'1',itemId:'10',quantity:'1',rate:'0.01'}]);
for(const quantity of ['0','-1','1.2','4','1000000000000000','01'])capture(source,'0.04',new Map(),[{originalLineId:'1',itemId:'10',quantity,rate:'0.01'}]);
capture(source,'0.04',new Map(),[{originalLineId:'1',itemId:'2',quantity:'1'}]);capture(source,'0.06',new Map(),[{originalLineId:'1',itemId:'10',quantity:'1'}]);
capture([{...source[0],amount:'0.00'}],'0.00',new Map(),[{originalLineId:'1',itemId:'10',quantity:'1'}]);
const numbers=['1','123','10001','9007199254740993','18446744073709551615','0','01','-1','18446744073709551616','100000000000000000000'].map(id=>{try{return{id,result:returnNumber(id)};}catch(e){return{id,error:{status:e.status,code:e.code}};}});
await writeFile('upms.php/tests/php4-return-fixtures.json',JSON.stringify({partitions,sources,vectors,numbers},null,2)+'\n');console.log(JSON.stringify({partitions,vectors:vectors.length,numbers:numbers.length}));
