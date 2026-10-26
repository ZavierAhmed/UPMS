import assert from 'node:assert/strict';
import {createDatabase} from '../src/identity/database.js';
import {simpleV1Service} from '../src/simple-v1/service.js';
assert.match(process.env.DB_NAME,/^upms_test_dcr_20261026_0[1-6]$/);
const db=createDatabase();
try{
 const s=await db('sessions').whereNotNull('user_id').where({revoked:false}).orderBy('idle_expires','desc').first();
 const result=await simpleV1Service(db).post({userId:String(s.user_id),authVersion:1,recordHash:s.token_hash},process.env.UPMS_DCR_REPLAY_KEY,process.env.UPMS_DCR_REPLAY_ID,{version:1});
 console.info(JSON.stringify(result));
}finally{await db.destroy();}
