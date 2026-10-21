export const categories = ['FINISHED_GOODS','RAW_MATERIAL','COMPONENT','PACKING_MATERIAL'];
const inventory={read:'masters.inventory.read',write:'masters.inventory.write'};
const parties={read:'masters.customers.read',write:'masters.parties.write'};
export const resources = {
  categories:{table:'business_categories',label:'Inventory categories',...inventory,kind:'category'},
  units:{table:'business_units',label:'Measurement units',...inventory,kind:'unit'},
  'bottle-types':{table:'business_bottle_types',label:'Bottle types',...inventory},
  sizes:{table:'business_sizes',label:'Bottle sizes',...inventory},
  qualities:{table:'business_qualities',label:'Bottle qualities',...inventory},
  colours:{table:'business_colours',label:'Bottle colours',...inventory},
  items:{table:'business_items',label:'Inventory items',...inventory,kind:'item'},
  customers:{table:'business_customers',label:'Customers',...parties,kind:'party'},
  vendors:{table:'business_vendors',label:'Vendors',read:'masters.vendors.read',write:'masters.parties.write',kind:'party'},
  'money-accounts':{table:'business_money_accounts',label:'Money accounts',read:'masters.finance.read',write:'masters.finance.write',kind:'money'},
  'expense-categories':{table:'business_expense_categories',label:'Expense categories',read:'masters.finance.read',write:'masters.finance.write'},
  'document-types':{table:'business_document_types',label:'Document numbering',read:'business.configure',write:'business.configure',kind:'documentType'},
};
export const businessPermissions=['masters.inventory.read','masters.inventory.write','masters.customers.read','masters.vendors.read',
  'masters.parties.write','masters.finance.read','masters.finance.write','business.configure','business.approve','business.audit.read'];
export const businessRoleGrants={administrator:businessPermissions,inventory:['masters.inventory.read','masters.inventory.write'],
  sales_dispatch:['masters.inventory.read','masters.customers.read'],accounts:['masters.inventory.read','masters.customers.read','masters.vendors.read','masters.parties.write','masters.finance.read','masters.finance.write']};
const selectInsertUpdate=['SELECT','INSERT','UPDATE'];
export const businessRuntimePrivileges={
  ...Object.fromEntries(Object.values(resources).map(r=>[r.table,selectInsertUpdate])),
  business_guard:['SELECT','UPDATE'],business_customer_ledgers:['SELECT','INSERT'],business_master_history:['SELECT','INSERT'],
  business_documents:selectInsertUpdate,business_document_events:['SELECT','INSERT'],business_document_links:['SELECT','INSERT'],
  business_sequences:selectInsertUpdate,business_number_issues:['SELECT','INSERT'],business_posting_batches:['SELECT','INSERT'],
  business_effect_claims:['SELECT','INSERT'],business_idempotency:['SELECT','INSERT','UPDATE'],business_approvals:selectInsertUpdate,
  business_periods:selectInsertUpdate,business_policy_versions:['SELECT','INSERT'],business_audit_events:['SELECT','INSERT'],
};
