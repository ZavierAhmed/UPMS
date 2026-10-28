// Reuses the existing owner-approved development endpoint solely for inspection.
// This is not imported by PHP, test provisioning, or deployment/startup code.
import mysql from 'mysql2/promise';
import {readFile,writeFile,mkdir} from 'node:fs/promises';
import {parseEnv} from 'node:util';
import {remoteTarget,remoteEngine,safeError} from '../server/src/development/remote.js';
let c;
try{
 const env=parseEnv(await readFile('.env.remote-development.local','utf8'));
 const target=remoteTarget(env);
 c=await mysql.createConnection({...target,password:env.DB_PASSWORD,connectTimeout:3000,multipleStatements:false,dateStrings:true,supportBigNumbers:true,bigNumberStrings:true});
 // Even a future accidental mutation in this script must be rejected by MariaDB.
 await c.query('START TRANSACTION READ ONLY');
 const read=async(sql,args=[])=>{if(!/^(SELECT|SHOW)\b/i.test(sql)||/\b(outfile|dumpfile|load_file)\b/i.test(sql))throw Error('READ_ONLY_REQUIRED');return(await c.execute({sql,timeout:5000},args))[0];};
 const identity=(await read('SELECT VERSION() AS version,DATABASE() AS schema_name,@@port AS port,@@server_id AS server_id,@@session.tx_read_only AS session_default_read_only'))[0];
 remoteEngine(identity.version);
 if(identity.schema_name!==target.database||Number(identity.port)!==3306)throw Error('REMOTE_SCHEMA_REJECTED');
 const tables=await read('SELECT TABLE_NAME AS name,ENGINE AS engine FROM information_schema.TABLES WHERE TABLE_SCHEMA=DATABASE() ORDER BY TABLE_NAME');
 const columns=await read('SELECT TABLE_NAME AS table_name,COLUMN_NAME AS column_name,COLUMN_TYPE AS column_type,IS_NULLABLE AS nullable_value FROM information_schema.COLUMNS WHERE TABLE_SCHEMA=DATABASE() ORDER BY TABLE_NAME,ORDINAL_POSITION');
 const history=await read('SELECT step,name FROM upms_remote_initialization ORDER BY step');
 const admins=await read("SELECT u.id,u.enabled,u.authorization_version,(u.password_hash LIKE '$argon2id$%') AS argon2id FROM users u JOIN user_roles r ON r.user_id=u.id WHERE r.role_code='administrator' ORDER BY u.id");
 const control=await read('SELECT id,version,operator_id,state,next_dc,entry_version,next_item_code FROM v1_control WHERE id=1');
 const counts={};for(const name of ['users','v1_items','v1_parties','v1_documents','v1_stock_journal','v1_party_journal','v1_commands'])counts[name]=(await read('SELECT COUNT(*) AS n FROM `'+name+'`'))[0].n;
 const result={checkedAt:new Date().toISOString(),identity,transport:'existing approved plaintext development exception; not production approval',serverEnforcedReadOnly:true,tables,columns,history,administrators:admins,control,counts,operationalWrites:false};
 await c.query('ROLLBACK');
 await mkdir('tmp/php-runtime',{recursive:true});await writeFile('tmp/php-runtime/owner-readonly.json',JSON.stringify(result,null,2));
 console.log(JSON.stringify({...result,columns:columns.length,tables:tables.length},null,2));
}catch(error){console.error(JSON.stringify(safeError(error)));process.exitCode=1;}finally{c?.destroy();}
