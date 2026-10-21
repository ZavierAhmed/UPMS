// Historical seed snapshot: future permissions require a new additive migration,
// never edits to this migration or imports from a changing runtime catalogue.
const categories=['FINISHED_GOODS','RAW_MATERIAL','COMPONENT','PACKING_MATERIAL'];
const businessPermissions=['masters.inventory.read','masters.inventory.write','masters.customers.read','masters.vendors.read',
  'masters.parties.write','masters.finance.read','masters.finance.write','business.configure','business.approve','business.audit.read'];
const businessRoleGrants={administrator:businessPermissions,inventory:['masters.inventory.read','masters.inventory.write'],
  sales_dispatch:['masters.inventory.read','masters.customers.read'],accounts:['masters.inventory.read','masters.customers.read','masters.vendors.read','masters.parties.write','masters.finance.read','masters.finance.write']};
export const config={transaction:false};
export async function up(db){
  const create=(name,define)=>db.schema.createTable(name,t=>{t.engine('InnoDB');t.charset('utf8mb4');t.collate('utf8mb4_unicode_ci');define(t);});
  const user=(t,name)=>t.bigInteger(name).unsigned().notNullable().references('id').inTable('users');
  const common=t=>{t.bigIncrements('id');t.string('code',64).notNullable().unique();t.string('name',150).notNullable();t.boolean('active').notNullable().defaultTo(true);t.integer('version').unsigned().notNullable().defaultTo(1);user(t,'created_by');user(t,'updated_by');t.dateTime('created_at',{precision:6}).notNullable();t.dateTime('updated_at',{precision:6}).notNullable();};
  // Catalogue rows intentionally have no invented creator or imported historical data.
  await create('business_categories',t=>{t.string('code',32).primary();t.string('name',150).notNullable();t.boolean('active').notNullable().defaultTo(true);t.integer('version').unsigned().notNullable().defaultTo(1);});
  await db('business_categories').insert(categories.map(code=>({code,name:code.toLowerCase().replaceAll('_',' ')})));
  for(const name of ['business_units','business_bottle_types','business_sizes','business_qualities','business_colours','business_customers','business_vendors','business_money_accounts','business_expense_categories','business_document_types']){
    await create(name,t=>{
      common(t);
      if(name==='business_units')t.specificType('scale','TINYINT UNSIGNED').notNullable();
      if(['business_customers','business_vendors'].includes(name)){t.string('contact_name',150).nullable();t.string('email',254).nullable();t.string('phone',64).nullable();t.string('address',1000).nullable();t.string('remarks',1000).nullable();}
      if(name==='business_money_accounts'){t.enu('account_type',['CASH','BANK','CASH_HOLDER','CHEQUE_HOLDING','CHEQUE_CLEARING']).notNullable();t.string('bank_name',150).nullable();t.string('account_reference',150).nullable();t.string('holder',150).nullable();t.string('remarks',1000).nullable();}
      if(name==='business_document_types'){t.string('prefix',12).nullable();t.boolean('prefix_approved').notNullable().defaultTo(false);}
    });
  }
  await db.raw('ALTER TABLE business_units ADD CONSTRAINT business_unit_scale CHECK (scale BETWEEN 0 AND 6)');
  await create('business_items',t=>{
    common(t);t.string('category_code',32).notNullable().references('code').inTable('business_categories');
    t.bigInteger('unit_id').unsigned().notNullable().references('id').inTable('business_units');
    for(const [column,table] of [['bottle_type_id','business_bottle_types'],['size_id','business_sizes'],['quality_id','business_qualities'],['colour_id','business_colours']])t.bigInteger(column).unsigned().nullable().references('id').inTable(table);
    t.unique(['bottle_type_id','size_id','quality_id','colour_id'],'business_canonical_variant');t.unique(['id','unit_id'],'business_item_unit_identity');
  });
  await db.raw("ALTER TABLE business_items ADD CONSTRAINT business_item_category CHECK ((category_code='FINISHED_GOODS' AND bottle_type_id IS NOT NULL AND size_id IS NOT NULL AND quality_id IS NOT NULL AND colour_id IS NOT NULL) OR (category_code IN ('RAW_MATERIAL','COMPONENT','PACKING_MATERIAL') AND bottle_type_id IS NULL AND size_id IS NULL AND quality_id IS NULL AND colour_id IS NULL))");
  await create('business_customer_ledgers',t=>{t.bigInteger('customer_id').unsigned().notNullable().references('id').inTable('business_customers');t.enu('ledger_class',['GST','NON_GST']).notNullable();t.primary(['customer_id','ledger_class']);});
  await create('business_guard',t=>t.integer('id').primary());await db('business_guard').insert({id:1});
  await create('business_master_history',t=>{t.bigIncrements('id');t.string('resource',64).notNullable();t.string('record_key',64).notNullable();t.integer('version').unsigned().notNullable();user(t,'actor_id');t.text('snapshot').notNullable();t.dateTime('created_at',{precision:6}).notNullable();t.unique(['resource','record_key','version'],'business_master_revision');});
  await create('business_documents',t=>{t.bigIncrements('id');t.bigInteger('type_id').unsigned().notNullable().references('id').inTable('business_document_types');t.integer('version').unsigned().notNullable().defaultTo(1);t.enu('status',['DRAFT','SUBMITTED','APPROVED','REJECTED','POSTED']).notNullable().defaultTo('DRAFT');t.date('business_date').notNullable();user(t,'created_by');t.text('payload').notNullable();t.string('payload_hash',64).notNullable();t.dateTime('created_at',{precision:6}).notNullable();t.dateTime('updated_at',{precision:6}).notNullable();});
  await create('business_document_events',t=>{t.bigIncrements('id');t.bigInteger('document_id').unsigned().notNullable().references('id').inTable('business_documents');t.integer('version').unsigned().notNullable();t.string('event',32).notNullable();user(t,'actor_id');t.string('reason',500).notNullable();t.dateTime('created_at',{precision:6}).notNullable();});
  await create('business_document_links',t=>{t.bigInteger('document_id').unsigned().notNullable().references('id').inTable('business_documents');t.bigInteger('original_id').unsigned().notNullable().references('id').inTable('business_documents');t.string('relation',32).notNullable();t.primary(['document_id','original_id','relation']);});
  await create('business_sequences',t=>{t.bigInteger('type_id').unsigned().notNullable().references('id').inTable('business_document_types');t.integer('calendar_year').unsigned().notNullable();t.bigInteger('last_value').unsigned().notNullable().defaultTo(0);t.primary(['type_id','calendar_year']);});
  await create('business_number_issues',t=>{t.bigInteger('document_id').unsigned().primary().references('id').inTable('business_documents');t.bigInteger('type_id').unsigned().notNullable().references('id').inTable('business_document_types');t.integer('calendar_year').unsigned().notNullable();t.bigInteger('serial').unsigned().notNullable();t.string('official_number',64).notNullable().unique();t.dateTime('issued_at',{precision:6}).notNullable();t.unique(['type_id','calendar_year','serial'],'business_issued_serial');});
  await create('business_posting_batches',t=>{t.bigIncrements('id');t.bigInteger('document_id').unsigned().notNullable().references('id').inTable('business_documents');t.integer('document_version').unsigned().notNullable();t.string('action',64).notNullable();t.dateTime('created_at',{precision:6}).notNullable();t.unique(['document_id','document_version','action'],'business_source_batch');});
  await create('business_effect_claims',t=>{t.bigIncrements('id');t.bigInteger('batch_id').unsigned().notNullable().references('id').inTable('business_posting_batches');t.string('effect_key',128).notNullable();t.unique(['batch_id','effect_key'],'business_source_effect');});
  await create('business_idempotency',t=>{t.bigIncrements('id');user(t,'actor_id');t.string('operation',64).notNullable();t.string('command_key',128).notNullable();t.string('payload_hash',64).notNullable();t.enu('status',['PENDING','COMPLETED']).notNullable();t.text('result').nullable();t.dateTime('created_at',{precision:6}).notNullable();t.unique(['actor_id','operation','command_key'],'business_command_owner');});
  await create('business_approvals',t=>{t.bigIncrements('id');t.bigInteger('document_id').unsigned().notNullable().references('id').inTable('business_documents');t.integer('document_version').unsigned().notNullable();t.string('payload_hash',64).notNullable();t.enu('decision',['APPROVED','REJECTED']).notNullable();user(t,'approver_id');t.string('justification',500).notNullable();t.boolean('valid').notNullable().defaultTo(true);t.dateTime('decided_at',{precision:6}).notNullable();});
  await create('business_periods',t=>{t.bigIncrements('id');t.string('name',150).notNullable();t.date('start_date').notNullable();t.date('end_date').notNullable();t.enu('status',['OPEN','CLOSED']).notNullable();t.integer('version').unsigned().notNullable().defaultTo(1);user(t,'updated_by');t.dateTime('updated_at',{precision:6}).notNullable();});
  await db.raw('ALTER TABLE business_periods ADD CONSTRAINT business_period_dates CHECK (start_date <= end_date)');
  await create('business_policy_versions',t=>{t.bigIncrements('id');t.string('status',16).notNullable();t.date('proposed_cutoff').nullable();t.string('numbering_rule',32).notNullable();t.string('reason',500).notNullable();user(t,'actor_id');t.dateTime('created_at',{precision:6}).notNullable();});
  await create('business_audit_events',t=>{t.bigIncrements('id');user(t,'actor_id');t.string('action',64).notNullable();t.string('resource',64).notNullable();t.string('record_key',64).notNullable();t.integer('version').unsigned().nullable();t.text('details').notNullable();t.dateTime('created_at',{precision:6}).notNullable();});
  await db.transaction(async trx=>{
    await trx('permissions').insert(businessPermissions.map(code=>({code})));
    await trx('role_permissions').insert(Object.entries(businessRoleGrants).flatMap(([role_code,grants])=>grants.map(permission_code=>({role_code,permission_code}))));
  });
}
export async function down(){throw new Error('Destructive business rollback disabled; use reviewed forward migration or coordinated recovery.');}
