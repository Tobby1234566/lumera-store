import { db } from './knex.js';
import { dropSchema, createSchema } from './schema.js';

/** Destroys and recreates every table. Development convenience only. */
async function main() {
  await dropSchema(db);
  await createSchema(db);
  console.log('[reset] database reset complete — run `npm run db:seed` to repopulate');
  await db.destroy();
}

main().catch(async (err) => {
  console.error('[reset] failed:', err);
  await db.destroy();
  process.exit(1);
});
