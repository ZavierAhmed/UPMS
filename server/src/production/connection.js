export const productionMigrations=['202610240001_identity.js','202610240002_simple_v1.js','202610240003_entry.js','202610240004_release.js'];
export async function verifyProductionEndpoint(connection,profile,user){
 const state=await new Promise((resolve,reject)=>connection.query('SELECT DATABASE() n,CURRENT_USER() a,@@port p,@@server_id s,@@innodb_force_recovery r,@@read_only o',(error,rows)=>error?reject(error):resolve(rows[0])));
 if(state.n!==profile.schema||state.a!==user+'@localhost'||Number(state.p)!==profile.port||String(state.s)!==profile.serverId||Number(state.r)!==0||Number(state.o)!==0)throw Error('Production database endpoint mismatch');
}
export async function verifyProductionConnection(connection,profile,expected){
 const query=(sql,args=[])=>new Promise((resolve,reject)=>connection.query(sql,args,(error,rows)=>error?reject(error):resolve(rows)));
 const [state]=await query('SELECT DATABASE() n,CURRENT_USER() a,@@port p,@@server_id s,@@innodb_force_recovery r,@@read_only o');
 if(state.n!==profile.schema||state.a!==profile.user+'@localhost'||Number(state.p)!==profile.port||String(state.s)!==profile.serverId||Number(state.r)!==0||Number(state.o)!==0)throw Error('Production database identity mismatch');
 const rows=await query('SELECT TABLE_NAME n,ENGINE e FROM information_schema.TABLES WHERE TABLE_SCHEMA=DATABASE()');
 const names=[...new Set([...Object.keys(expected),'upms_production_migrations','upms_production_migrations_lock'])].sort();
 if(rows.some(r=>r.e!=='InnoDB')||JSON.stringify(rows.map(r=>r.n).sort())!==JSON.stringify(names))throw Error('Production schema mismatch');
 const history=await query('SELECT name FROM upms_production_migrations ORDER BY id');
 if(JSON.stringify(history.map(r=>r.name))!==JSON.stringify(productionMigrations))throw Error('Production migration history mismatch');
 const [row]=await query('SELECT * FROM production_control WHERE id=1');
 if(!row||row.schema_name!==profile.schema||row.runtime_user!==profile.user||row.instance_id!==profile.instance||row.purpose!==profile.purpose||String(row.server_id)!==profile.serverId)throw Error('Production release metadata mismatch');
 const [operator]=await query('SELECT COUNT(*) n FROM users');
 if(Number(operator.n)!==1)throw Error('Single operator database required');
}
