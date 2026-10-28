import assert from 'node:assert/strict';
import {randomUUID} from 'node:crypto';

// Replace prior milestone's obsolete pending-kind boundary with real expense parity.
export async function expenseScopeRegression({same,prefix,date,snapshot,databases,checks}){
 const body={kind:'EXPENSE',date,category:'Synthetic regression',description:'Paid-only migrated expense',payee:'Synthetic test payee',reference:'PHP6-REGRESSION',amount:'1.23',paymentStatus:'PAID',method:'CASH'};
 const before=await snapshot(databases[1]),d=await same('converted expense draft','POST',prefix+'documents',{kind:'EXPENSE',date});
 await same('incomplete expense posting rejected','POST',prefix+'documents/'+d.id+'/post',{version:1});await same('edit converted expense','PATCH',prefix+'documents/'+d.id,{...body,version:1});
 const key=randomUUID();await same('post converted expense','POST',prefix+'documents/'+d.id+'/post',{version:2},{key});await same('replay converted expense','POST',prefix+'documents/'+d.id+'/post',{version:2},{key});await same('posted expense immutable','PATCH',prefix+'documents/'+d.id,{...body,version:2});
 const cancelled=await same('expense cancellation draft','POST',prefix+'documents',body);await same('cancel migrated expense','POST',prefix+'documents/'+cancelled.id+'/cancel',{version:1,reason:'Synthetic reviewed cancellation'});await same('cancelled expense cannot post','POST',prefix+'documents/'+cancelled.id+'/post',{version:1});
 const after=await snapshot(databases[1]);for(const table of ['v1_stock','v1_stock_journal','v1_party_journal','v1_lines','v1_control'])assert.deepEqual(after[table],before[table]);checks.push({name:'converted expense lifecycle replaces prior pending boundary',stockAndLedgerUnchanged:true});
}
