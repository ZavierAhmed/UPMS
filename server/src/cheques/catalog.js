export const chequePermissions=['cheques.read','cheques.receive','cheques.deposit','cheques.clear','cheques.dishonour.request','cheques.dishonour.approve','cheques.dishonour.post','cheques.reconcile.read','cheques.configure'];
export const chequeRoleGrants={administrator:chequePermissions,accounts:chequePermissions.filter(p=>!['cheques.dishonour.approve','cheques.dishonour.post','cheques.configure'].includes(p)),sales_dispatch:[],inventory:[]};
const append=['SELECT','INSERT'];
export const chequeRuntimePrivileges={cheque_policies:append,customer_cheques:append,cheque_states:[...append,'UPDATE'],cheque_events:append,cheque_dishonour_requests:append,cheque_credit_reversals:append,cheque_allocation_reversals:append};
export const chequeTypes={DEPOSIT:'C26B_DEPOSIT',CLEAR:'C26B_CLEAR',DISHONOUR:'C26B_DISHONOUR'};
