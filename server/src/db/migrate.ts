import { db } from './knex.js';
import { createSchema } from './schema.js';
import { config } from '../config.js';

/**
 * Applies the schema. Safe to run repeatedly — every table is created only if
 * it does not already exist, so this doubles as the deploy-time migration step.
 */
async function main() {
  console.log(`[migrate] target: ${config.db.client}`);
  await createSchema(db);
  console.log('[migrate] schema is up to date');
  await db.destroy();
}

main().catch(async (err) => {
  console.error('[migrate] failed:', err);
  await db.destroy();
  process.exit(1);
});
