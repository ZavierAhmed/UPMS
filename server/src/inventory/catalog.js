export const conditions=['AVAILABLE','QUARANTINED','DAMAGED'];
export const kinds=['PRODUCTION','CONSUMPTION','COUNT','CORRECTION'];
export const typeCodes={PRODUCTION:'INV_PRODUCTION',CONSUMPTION:'INV_CONSUMPTION',COUNT:'INV_ADJUSTMENT',CORRECTION:'INV_CORRECTION'};
export const inventoryPermissions=['inventory.read','inventory.drafts.create','inventory.production.post','inventory.consumption.post','inventory.counts.record','inventory.adjustments.request','inventory.corrections.request','inventory.adjustments.approve','inventory.corrections.approve','inventory.adjustments.post','inventory.corrections.post','inventory.configure','inventory.activate'];
export const inventoryRoleGrants={administrator:inventoryPermissions,inventory:inventoryPermissions.slice(0,7),sales_dispatch:['inventory.read'],accounts:[]};
export const inventoryRuntimePrivileges={inventory_tracking:['SELECT','INSERT','UPDATE'],inventory_balances:['SELECT','INSERT','UPDATE'],inventory_documents:['SELECT','INSERT','UPDATE'],inventory_lines:['SELECT','INSERT'],inventory_movements:['SELECT','INSERT'],inventory_policy_acceptances:['SELECT','INSERT']};
