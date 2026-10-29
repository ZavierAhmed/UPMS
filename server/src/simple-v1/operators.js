import {fail} from './exact.js';
export function permittedOperator(user,control,policy,schema){
 if(policy===null||policy===undefined||policy==='')return String(control?.operator_id)===user.id;
 if(typeof policy==='string'){try{policy=JSON.parse(policy);}catch{fail('V1_OPERATOR_POLICY_REJECTED',503);}}
 const users=policy?.users;
 if(!policy||typeof policy!=='object'||Array.isArray(policy)||Object.keys(policy).sort().join(',')!=='schema,users'||policy.schema!==schema||!users||Array.isArray(users)||Object.keys(users).sort().join(',')!=='admin,haris'||!Object.values(users).every(v=>typeof v==='string'&&/^[1-9][0-9]*$/.test(v))||users.admin===users.haris||!Object.values(users).includes(String(control?.operator_id)))fail('V1_OPERATOR_POLICY_REJECTED',503);
 return Object.hasOwn(users,user.username)&&users[user.username]===user.id;
}
