import {spawn} from 'node:child_process';
export async function canonicalFixture({php,args,connection,schema,directory}){
 const input={...connection,schema,reference:'synthetic_canonical_'+Date.now(),receipt:directory+'/'+schema+'.receipt',action:'initialize'};
 return new Promise((done,reject)=>{const p=spawn(php,[...args,'upms.php/tests/Support/clean-fixture.php'],{windowsHide:true});let out='';p.stdout.on('data',b=>out+=b);p.on('error',reject);p.on('close',code=>{try{const r=JSON.parse(out);if(code||!r.ok)throw Error('Canonical synthetic initialization rejected: '+(r.error||'unknown'));done(r);}catch(e){reject(e);}});p.stdin.end(JSON.stringify(input));});
}
