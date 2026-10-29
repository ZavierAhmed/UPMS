import assert from 'node:assert/strict';
import test from 'node:test';
import {permittedOperator} from './operators.js';
const control={operator_id:'1'},policy={schema:'fixture',users:{admin:'1',haris:'2'}};
test('designated operator policy preserves legacy and requires exact named identities',()=>{
 assert.equal(permittedOperator({id:'1',username:'legacy'},control,null,'fixture'),true);
 for(const [username,id]of Object.entries(policy.users))assert.equal(permittedOperator({username,id},control,policy,'fixture'),true);
 assert.equal(permittedOperator({username:'renamed',id:'2'},control,policy,'fixture'),false);
 assert.equal(permittedOperator({username:'third',id:'3'},control,policy,'fixture'),false);
});
test('policy rejects schema confusion, duplicate IDs, malformed data and unexpected keys',()=>{
 for(const invalid of ['{',[],{...policy,schema:'wrong'},{...policy,users:{admin:'1',haris:'1'}},{...policy,users:{admin:1,haris:'2'}},{...policy,extra:true},{...policy,users:{admin:'1',haris:'2',third:'3'}}])assert.throws(()=>permittedOperator({username:'admin',id:'1'},control,invalid,'fixture'));
 assert.throws(()=>permittedOperator({username:'admin',id:'1'},{operator_id:'3'},policy,'fixture'));
});
