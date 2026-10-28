import {writeFile} from 'node:fs/promises';
import {z} from 'zod';
import {documentInput} from '../server/src/simple-v1/service.js';
import {entryErrorResponse} from '../server/src/simple-v1/errors.js';
// Exact register schema from service.js, reusing its exported date/kind schemas.
const text=z.string().trim().max(150),filters=z.object({from:documentInput.shape.date.optional(),to:documentInput.shape.date.optional(),type:documentInput.shape.kind.optional(),party:text.optional(),reference:text.optional()}).strict();
const expense={kind:'EXPENSE',date:'2020-01-03',category:'Utilities',description:'Synthetic test',payee:'Synthetic payee',reference:'EXP-1',amount:'12.34',paymentStatus:'PAID',method:'CASH'};
const inputs=[{}, {from:'',extra:''},{from:'0'},{from:'2020-02-30'},{type:'EXPENSE'},{type:'INVALID'},{party:'0'},{reference:'0'},{party:'\u00a0power\u00a0'},{reference:'x'.repeat(151)},{party:['x']},{extra:'x'}].map(input=>({operation:'filters',input}));
for(const patch of [{},{paymentStatus:'UNPAID'},{paymentStatus:undefined},{method:'CHEQUE_RECEIVED'},{method:'CARD'},{amount:'0'},{amount:12},{category:'x'.repeat(100)},{category:'x'.repeat(101)},{description:'x'.repeat(500)},{description:'x'.repeat(501)},{payee:'x'.repeat(151)},{reference:'x'.repeat(151)},{remarks:'x'.repeat(1001)},{category:'\u00a0 \u00a0'},{extra:true},{date:'2020-02-29'},{date:'2020-02-30'}])inputs.push({operation:'expense',input:JSON.parse(JSON.stringify({...expense,...patch}))});
const vectors=inputs.map(({operation,input})=>{const parsed=(operation==='filters'?filters:documentInput).safeParse(operation==='filters'?Object.fromEntries(Object.entries(input).filter(([,v])=>v!=='')):input);return{operation,input,...(parsed.success?{result:parsed.data}:{fields:entryErrorResponse(parsed.error,'test').fieldErrors})};});
await writeFile('upms.php/tests/php6-input-fixtures.json',JSON.stringify(vectors,null,2)+'\n');console.log(JSON.stringify({vectors:vectors.length}));
