import {writeFile} from 'node:fs/promises';
import {paymentNumber} from '../server/src/simple-v1/exact.js';
const vectors=[];
for(const kind of ['CLIENT_PAYMENT','VENDOR_PAYMENT','CHALLAN'])for(const id of ['1','9','0009','10001','9007199254740993','18446744073709551615','0','-1','1.5','18446744073709551616','000000000000000000001']){try{vectors.push({kind,id,result:paymentNumber(kind,id)});}catch(e){vectors.push({kind,id,error:{status:e.status,code:e.code}});}}
await writeFile('upms.php/tests/php5-number-fixtures.json',JSON.stringify(vectors,null,2)+'\n');console.log(JSON.stringify({vectors:vectors.length}));
