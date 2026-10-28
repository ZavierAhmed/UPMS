// No schema changes. Only call against a separately confirmed synthetic schema.
import assert from 'node:assert/strict';
export async function grantPhp2(admin,database,user,password){
 return grantRuntime(admin,database,user,password,2);
}
export async function grantPhp3(admin,database,user,password){
 return grantRuntime(admin,database,user,password,3);
}
export async function grantPhp4(admin,database,user,password){
 return grantRuntime(admin,database,user,password,4);
}
async function grantRuntime(admin,database,user,password,milestone){
 assert.match(database,new RegExp('^upms_test_php_'+milestone+'_[a-z0-9_]+$'));assert.match(user,new RegExp('^php'+milestone+'_[a-z0-9_]+$'));
 await admin.raw('CREATE USER ?@? IDENTIFIED BY ?',[user,'127.0.0.1',password]);
 for(const table of ['identity_guard','users','roles','permissions','user_roles','role_permissions','v1_control','v1_items','v1_stock','v1_parties','v1_documents','v1_lines','v1_stock_journal','v1_party_journal','v1_audit','v1_commands'])await admin.raw('GRANT SELECT ON ??.?? TO ?@?',[database,table,user,'127.0.0.1']);
 for(const table of ['sessions','login_attempts'])await admin.raw('GRANT SELECT,INSERT,UPDATE,DELETE ON ??.?? TO ?@?',[database,table,user,'127.0.0.1']);
 for(const table of ['v1_items','v1_stock','v1_parties','v1_documents','v1_lines','v1_stock_journal','v1_party_journal','v1_audit','v1_commands','identity_audit_events'])await admin.raw('GRANT INSERT ON ??.?? TO ?@?',[database,table,user,'127.0.0.1']);
 await admin.raw('GRANT SELECT ON ??.identity_audit_events TO ?@?',[database,user,'127.0.0.1']);
 const updates={
  users:['password_hash','authorization_version','updated_at'],
  v1_control:['next_item_code'],
  v1_items:['description','quality','colour','packing','remarks','active','version','selling_price'],
  v1_parties:['name','phone','address','remarks','active','version','opening_verified'],
  v1_stock:['quantity','verified'],
  v1_documents:['kind','date','party_id','status','version','payload','total','corrects_id'],
 };
 if(milestone>=3){updates.v1_control.push('next_dc');updates.v1_documents.push('official_number','sequence','sale_subtotal','discount_mode','discount_value','discount_amount');}
 for(const [table,columns]of Object.entries(updates))await admin.raw('GRANT UPDATE ('+columns.map(c=>'`'+c+'`').join(',')+') ON ??.?? TO ?@?',[database,table,user,'127.0.0.1']);
}
