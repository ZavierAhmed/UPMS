// Separate, explicit deployment identities. Never reinterpret a legacy/demo database as live.
export function productionProfile(env=process.env){
 if(env.UPMS_SIMPLE_V1!=='production-v1')return null;
 const staging=env.UPMS_PRODUCTION_PURPOSE==='synthetic-staging';
 const schema=staging?'upms_test_production_20261024_01':'upms_live_v1';
 const user=staging?'upms_runtime_test_production_01':'upms_runtime_production';
 const origin=staging?'https://localhost:7448':'https://app.unique-plastic.com';
 if(env.NODE_ENV!=='production'||!['synthetic-staging','production'].includes(env.UPMS_PRODUCTION_PURPOSE)||env.DB_NAME!==schema||env.DB_CONFIRM_NAME!==schema||env.MANAGEMENT_ORIGIN!==origin||!['127.0.0.1','localhost','::1'].includes(env.DB_HOST)||env.UPMS_SIMPLE_V1_SYNTHETIC||env.MANAGEMENT_LOCAL_HTTP==='true')throw Error('Production deployment identity mismatch');
 if(!Number.isInteger(Number(env.DB_PORT))||Number(env.DB_PORT)<1||Number(env.DB_PORT)>65535||staging&&String(env.DB_PORT)!=='3311'||!staging&&String(env.DB_PORT)==='3309')throw Error('Production deployment endpoint mismatch');
 if(!/^[1-9][0-9]*$/.test(env.UPMS_EXPECTED_SERVER_ID||'')||! /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(env.UPMS_PRODUCTION_INSTANCE||''))throw Error('Explicit server and instance identities required');
 if(env.IDENTITY_DB_PURPOSE==='runtime'&&env.DB_USER!==user)throw Error('Production runtime identity mismatch');
 return {staging,schema,user,origin,port:Number(env.DB_PORT),instance:env.UPMS_PRODUCTION_INSTANCE,serverId:env.UPMS_EXPECTED_SERVER_ID,purpose:env.UPMS_PRODUCTION_PURPOSE,posting:staging?env.UPMS_PRODUCTION_POSTING==='synthetic-reviewed':env.UPMS_PRODUCTION_POSTING==='owner-approved'};
}
