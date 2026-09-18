import { drizzle, type PostgresJsDatabase } from 'drizzle-orm/postgres-js';
import postgres from 'postgres';
import * as schema from './schema';

type Db = PostgresJsDatabase<typeof schema>;

const globalForDb = globalThis as unknown as {
  __swm_sql?: ReturnType<typeof postgres>;
  __swm_db?: Db;
};

function createDb(): Db {
  if (globalForDb.__swm_db) return globalForDb.__swm_db;

  const connectionString = process.env.DATABASE_URL;
  if (!connectionString) {
    throw new Error(
      'DATABASE_URL is not set. Copy .env.example to .env (locally) or add it in Vercel project settings.',
    );
  }

  const sql = postgres(connectionString, {
    // Supabase's transaction pooler does not support prepared statements.
    prepare: false,
    idle_timeout: 20,
  });

  globalForDb.__swm_sql = sql;
  globalForDb.__swm_db = drizzle(sql, { schema });
  return globalForDb.__swm_db;
}

/**
 * Lazily connects on first property access so `next build` can import route modules
 * without a database being reachable.
 */
export const db = new Proxy({} as Db, {
  get(_target, prop, receiver) {
    const real = createDb();
    const value = Reflect.get(real as object, prop, receiver);
    return typeof value === 'function' ? value.bind(real) : value;
  },
});

export { schema };
