import { drizzle } from 'drizzle-orm/neon-http';
import { neon } from '@neondatabase/serverless';
import * as schema from './schema';

function requireDatabaseUrl(): string {
  const url = process.env.DATABASE_URL;
  if (!url) {
    throw new Error('DATABASE_URL is not set. Copy .env.example to .env.local and fill it in.');
  }
  return url;
}

type DbClient = ReturnType<typeof drizzle<typeof schema>>;

let _db: DbClient | undefined;
function getDb(): DbClient {
  if (!_db) {
    _db = drizzle(neon(requireDatabaseUrl()), { schema });
  }
  return _db;
}

export const db: DbClient = new Proxy({} as DbClient, {
  get(_target, prop, receiver) {
    return Reflect.get(getDb(), prop, receiver);
  },
});

export function createDbClient(databaseUrl: string) {
  return drizzle(neon(databaseUrl), { schema });
}
