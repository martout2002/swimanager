/**
 * Applies sql/schema.sql to DATABASE_URL. Idempotent, but it DROPS the v1 tables —
 * so it refuses to run against a non-local database unless you pass --force.
 * Usage: bun run db:push
 */
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import postgres from 'postgres';

function isLocal(url: string): boolean {
  try {
    const host = new URL(url).hostname;
    return host === 'localhost' || host === '127.0.0.1' || host === '::1' || host === 'db';
  } catch {
    return false;
  }
}

async function main() {

  const url = process.env.DATABASE_URL;
  if (!url) {
    console.error('DATABASE_URL is not set. Copy .env.example to .env and fill it in.');
    process.exit(1);
  }

  if (!isLocal(url) && !process.argv.includes('--force')) {
    console.error(
      `Refusing to apply the schema to a remote database (${new URL(url).hostname}).\n` +
        'It drops the v1 tables. Re-run with --force if that is what you want.',
    );
    process.exit(1);
  }

  const ddl = readFileSync(resolve(process.cwd(), 'sql/schema.sql'), 'utf8');
  const sql = postgres(url, { prepare: false, max: 1 });

  try {
    await sql`SET statement_timeout = '60s'`;
    await sql.unsafe(ddl);
    console.log('Schema applied.');
  } catch (err) {
    console.error('Failed to apply schema:', err);
    process.exitCode = 1;
  } finally {
    await sql.end();
  }
}

main();
