export const returnPermissions=['returns.read','returns.request.create','returns.request.post','returns.receive','returns.inspect','returns.disposition.request','returns.disposition.approve','returns.disposition.post','returns.reconcile.read','returns.configure'];
export const returnRoleGrants={administrator:returnPermissions,sales_dispatch:['returns.read','returns.request.create','returns.request.post'],inventory:['returns.read','returns.receive','returns.inspect','returns.disposition.request','returns.reconcile.read'],accounts:['returns.read']};
const append=['SELECT','INSERT'];
export const returnRuntimePrivileges={return_policies:append,return_documents:append,return_lines:append,return_allowances:[...append,'UPDATE'],return_receipts:append,return_receipt_balances:[...append,'UPDATE'],return_dispositions:append,return_stock_movements:append};
export const returnTypes={REQUEST:'R27_REQUEST',RECEIPT:'R27_RECEIPT',INSPECTION:'R27_INSPECTION'};
export const returnMovementCodes=['CUSTOMER_RETURN_RECEIVED','RETURN_RELEASE_TO_AVAILABLE','RETURN_MARK_DAMAGED'];
