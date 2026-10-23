import {query} from '../identity/database.js';
import {IdentityError} from '../identity/passwords.js';
import {exact,decimal,maxQuantity} from './quantity.js';
export const stockKey=row=>`${row.item_id}:${row.stock_condition}`;
const fail=code=>{throw new IdentityError(409,code);};
// Caller already owns the identity/business guards in coordinate(). Shared by
// inventory and purchasing; no nested transaction and no relaxed lock order.
export async function lockStockPlans(trx,plans){
  const balances=new Map();
  for(const plan of [...plans].sort((a,b)=>BigInt(a.item_id)===BigInt(b.item_id)?a.stock_condition.localeCompare(b.stock_condition):BigInt(a.item_id)<BigInt(b.item_id)?-1:1)){
    const balance=await query(trx('inventory_balances').where({item_id:plan.item_id,stock_condition:plan.stock_condition}).forUpdate().first());
    if(!balance)fail('INITIAL_STATE_UNVERIFIED');const next=exact(balance.quantity)+plan.delta;
    if(next<0n)fail('INSUFFICIENT_AVAILABLE_STOCK');if(next>maxQuantity)fail('QUANTITY_OVERFLOW');balances.set(stockKey(plan),balance);
  }return balances;
}
export async function advanceStockBalance(trx,balance,delta,lastMovementId=null){
  const next=exact(balance.quantity)+delta;if(next<0n)fail('INSUFFICIENT_AVAILABLE_STOCK');if(next>maxQuantity)fail('QUANTITY_OVERFLOW');
  const version=(BigInt(balance.version)+1n).toString();
  const changed=await query(trx('inventory_balances').where({item_id:balance.item_id,stock_condition:balance.stock_condition,version:balance.version,quantity:balance.quantity}).update({quantity:decimal(next),version,last_movement_id:lastMovementId,updated_at:new Date()}));
  if(changed!==1)fail('STALE_STOCK_BALANCE');Object.assign(balance,{quantity:decimal(next),version});
  await query(trx('inventory_tracking').where({item_id:balance.item_id}).update({state:'HISTORY'}));
}
export async function stockReconciliation(trx){
  const balances=await query(trx('inventory_balances')),old=await query(trx('inventory_movements').select('item_id','stock_condition').sum('delta as total').groupBy('item_id','stock_condition')),receipts=await query(trx('purchase_stock_movements').select('item_id','stock_condition').sum('delta as total').groupBy('item_id','stock_condition'));
  const dispatch=await query(trx('sales_stock_movements').select('item_id','stock_condition').sum('delta as total').groupBy('item_id','stock_condition'));
  const returns=await query(trx('return_stock_movements').select('item_id','stock_condition').sum('delta as total').groupBy('item_id','stock_condition'));
  const totals=new Map();for(const row of [...old,...receipts,...dispatch,...returns])totals.set(stockKey(row),(totals.get(stockKey(row))||0n)+exact(row.total,6,{signed:true}));
  const mismatches=[];for(const row of balances){if(exact(row.quantity)!==(totals.get(stockKey(row))||0n))mismatches.push({itemId:String(row.item_id),condition:row.stock_condition,balance:row.quantity,journal:decimal(totals.get(stockKey(row))||0n)});totals.delete(stockKey(row));}
  for(const [key,total]of totals)if(total!==0n)mismatches.push({key,balance:null,journal:decimal(total)});
  return {matched:mismatches.length===0,balances:balances.length,mismatches,repairPerformed:false};
}
