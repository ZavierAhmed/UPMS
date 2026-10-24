export const v1Privileges=Object.freeze({
 v1_control:['SELECT','UPDATE'],v1_items:['SELECT','INSERT','UPDATE'],v1_parties:['SELECT','INSERT','UPDATE'],v1_stock:['SELECT','INSERT','UPDATE'],
 v1_documents:['SELECT','INSERT','UPDATE'],v1_lines:['SELECT','INSERT'],v1_stock_journal:['SELECT','INSERT'],v1_party_journal:['SELECT','INSERT'],v1_audit:['SELECT','INSERT'],v1_commands:['SELECT','INSERT']
});
export function syntheticV1(env=process.env){return env.UPMS_SIMPLE_V1==='synthetic-v1'&&(/^upms_test_simplev1_(?:demo_)?20261024_0[1-6]$/.test(env.DB_NAME||'')||/^upms_test_simplev11_20261024_0[1-4]$/.test(env.DB_NAME||'')||env.DB_NAME==='upms_test_simplev11_demo_20261024_01')&&String(env.DB_PORT)==='3309';}
