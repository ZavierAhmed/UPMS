export const expensePermissions=['expenses.read', 'expenses.create', 'expenses.record', 'expenses.pay', 'expenses.categories.read', 'expenses.categories.manage', 'expenses.approve', 'expenses.correct.request', 'expenses.correct.approve', 'expenses.correct.post', 'expenses.reconcile.read', 'expenses.configure'];
export const expenseRoleGrants={administrator:expensePermissions,accounts:['expenses.read', 'expenses.create', 'expenses.record', 'expenses.pay', 'expenses.categories.read', 'expenses.correct.request', 'expenses.reconcile.read'],sales_dispatch:[],inventory:[]};
const append=['SELECT','INSERT'],mutable=['SELECT','INSERT','UPDATE'];
export const expenseRuntimePrivileges={expense_categories:mutable,expense_policies:append,expense_documents:append,expense_lines:append,expense_obligations:append,expense_balances:mutable,expense_payments:append,expense_reference_claims:append};
export const expenseTypes={EXPENSE:'E27_EXPENSE',PAYMENT:'E27_PAYMENT',CORRECTION:'E27_CORRECTION'};
