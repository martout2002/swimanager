import { drizzle, type PostgresJsDatabase } from 'drizzle-orm/postgres-js';
import postgres from 'postgres';
import * as schema from './schema';

type Db = PostgresJsDatabase<typeof schema>;

const globalForDb = globalThis as unknown as {
  __sql?: ReturnType<typeof postgres>;
  __db?: Db;
};

function connect(): Db {
  const connectionString = process.env.DATABASE_URL;
  if (!connectionString) {
    throw new Error(
      'DATABASE_URL is not set. Copy .env.example to .env (locally) or add it in Vercel project settings.',
    );
  }

  const client =
    globalForDb.__sql ??
    postgres(connectionString, {
      // Supabase's transaction pooler does not support prepared statements.
      prepare: false,
      max: 1,
      idle_timeout: 20,
    });

  globalForDb.__sql = client;
  return drizzle(client, { schema });
}

/**
 * Lazily connects on first query so `next build` can import route modules
 * without a database being reachable.
 */
export const db = new Proxy({} as Db, {
  get(_target, prop, receiver) {
    globalForDb.__db ??= connect();
    const value = Reflect.get(globalForDb.__db as object, prop, receiver);
    return typeof value === 'function' ? value.bind(globalForDb.__db) : value;
  },
});

export { schema };
