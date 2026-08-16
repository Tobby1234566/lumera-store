import knexFactory, { type Knex } from 'knex';
import fs from 'node:fs';
import path from 'node:path';
import { config } from '../config.js';

/**
 * Portable database layer.
 *
 * SQLite is the zero-config default so the project runs immediately after
 * `npm install`. Setting DB_CLIENT=pg + DATABASE_URL switches to PostgreSQL
 * with no code changes — all queries are written in portable Knex query
 * builder syntax rather than raw dialect-specific SQL.
 */

function buildConfig(): Knex.Config {
  if (config.db.client === 'pg') {
    return {
      client: 'pg',
      connection: {
        connectionString: config.db.connectionString,
        ssl: config.db.ssl ? { rejectUnauthorized: false } : undefined,
      },
      pool: { min: 0, max: 10 },
    };
  }

  const file = path.resolve(process.cwd(), config.db.sqliteFile);
  fs.mkdirSync(path.dirname(file), { recursive: true });

  return {
    client: 'better-sqlite3',
    connection: { filename: file },
    useNullAsDefault: true,
    pool: {
      min: 0,
      max: 1,
      afterCreate: (conn: any, done: (err?: Error) => void) => {
        conn.pragma('journal_mode = WAL');
        conn.pragma('foreign_keys = ON');
        done();
      },
    },
  };
}

export const db = knexFactory(buildConfig());

/** True when running on PostgreSQL — used for the few dialect-aware helpers. */
export const isPg = config.db.client === 'pg';

/** Portable "now" value that both SQLite and Postgres accept. */
export function now(): string {
  return new Date().toISOString();
}
