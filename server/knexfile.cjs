/**
 * Knex CLI configuration.
 *
 * The application itself configures Knex in src/db/knex.ts; this file exists so
 * the `knex` CLI can generate and run incremental migration files once the
 * schema needs to evolve on a live database:
 *
 *   npx knex migrate:make add_gift_notes --knexfile server/knexfile.cjs
 *   npx knex migrate:latest --knexfile server/knexfile.cjs
 *   npx knex migrate:rollback --knexfile server/knexfile.cjs
 */
require('dotenv').config();
const path = require('node:path');

const usePg = (process.env.DB_CLIENT ?? 'sqlite') === 'pg';

const base = {
  migrations: {
    directory: path.join(__dirname, 'src/db/migrations'),
    tableName: 'knex_migrations',
  },
};

const sqlite = {
  ...base,
  client: 'better-sqlite3',
  connection: {
    filename: path.resolve(__dirname, process.env.SQLITE_FILE ?? './data/lumera.sqlite'),
  },
  useNullAsDefault: true,
};

const pg = {
  ...base,
  client: 'pg',
  connection: {
    connectionString: process.env.DATABASE_URL,
    ssl: process.env.DATABASE_SSL === 'true' ? { rejectUnauthorized: false } : undefined,
  },
  pool: { min: 0, max: 10 },
};

const active = usePg ? pg : sqlite;

module.exports = {
  development: active,
  production: active,
};
