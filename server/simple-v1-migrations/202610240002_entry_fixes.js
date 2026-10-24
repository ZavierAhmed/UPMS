// Additive V1-only extension. Existing rows/payloads/numbers are not rewritten.
export async function up(db){
 if(await db.schema.hasColumn('v1_control','entry_version'))throw Error('Existing/partial V1.2 extension: preserve and review');
 await db.schema.alterTable('v1_items',t=>{t.decimal('selling_price',18,2).nullable();});
 await db.schema.alterTable('v1_control',t=>{t.integer('entry_version').notNullable().defaultTo(2);t.bigInteger('next_item_code').unsigned().notNullable().defaultTo(1);});
 await db.schema.alterTable('v1_documents',t=>{t.decimal('sale_subtotal',18,2).nullable();t.string('discount_mode',12).nullable();t.decimal('discount_value',18,2).nullable();t.decimal('discount_amount',18,2).nullable();});
}
