import { db } from './knex.js';
import { createSchema } from './schema.js';
import { config } from '../config.js';

async function main() {
  console.log(`[migrate] target: ${config.db.client}`);

  await createSchema(db);

  // Upgrade existing admin_users tables created by older versions.
  const hasAdminUsers = await db.schema.hasTable('admin_users');

  if (hasAdminUsers) {
    const columns = await db('admin_users').columnInfo();

    if (!columns.updated_at) {
      console.log('[migrate] adding admin_users.updated_at');

      await db.schema.alterTable('admin_users', (table) => {
        table.timestamp('updated_at').nullable();
      });

      await db('admin_users').update({
        updated_at: new Date().toISOString(),
      });

      console.log('[migrate] admin_users.updated_at added');
    }
  }

  console.log('[migrate] schema is up to date');
  await db.destroy();
}

main().catch(async (err) => {
  console.error('[migrate] failed:', err);
  await db.destroy();
  process.exit(1);
});