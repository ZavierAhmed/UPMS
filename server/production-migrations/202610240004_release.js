export async function up(db){
 await db.schema.createTable('production_control',t=>{
  t.engine('InnoDB');t.charset('utf8mb4');t.integer('id').primary();
  t.string('instance_id',36).notNullable();t.string('schema_name',64).notNullable();t.string('runtime_user',64).notNullable();t.bigInteger('server_id').unsigned().notNullable();t.string('purpose',32).notNullable();
  t.bigInteger('operator_id').unsigned().notNullable().references('id').inTable('users');t.string('phase',16).notNullable();t.string('cutoff_date',10).notNullable();t.string('review_reference',250).notNullable();t.string('opening_fingerprint',64).nullable();t.string('backup_fingerprint',64).nullable();
 });
}
export async function down(){throw Error('Destructive rollback disabled');}
