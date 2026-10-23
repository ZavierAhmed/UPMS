export const creditPermissions=['credits.read','credits.create','credits.submit','credits.approve','credits.post','credits.reconcile.read','credits.configure'];
export const creditRoleGrants={administrator:creditPermissions,accounts:['credits.read','credits.create','credits.submit','credits.reconcile.read'],sales_dispatch:['credits.read','credits.create','credits.submit'],inventory:[]};
const append=['SELECT','INSERT'];
export const creditRuntimePrivileges={credit_policies:append,credit_documents:append,credit_claims:append,credit_posts:append,customer_credit_journal:append};
export const creditType='C27_CREDIT_NOTE';
