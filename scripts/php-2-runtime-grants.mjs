// No schema changes. Only call against a separately confirmed synthetic schema.
import assert from 'node:assert/strict';
export async function grantPhp2(admin,database,user,password){
 assert.match(database,/^upms_test_php_2_[a-z0-9_]+$/);assert.match(user,/^php2_[a-z0-9_]+$/);
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
 for(const [table,columns]of Object.entries(updates))await admin.raw('GRANT UPDATE ('+columns.map(c=>'`'+c+'`').join(',')+') ON ??.?? TO ?@?',[database,table,user,'127.0.0.1']);
}
