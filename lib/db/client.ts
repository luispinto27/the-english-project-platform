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

export const db = drizzle(neon(requireDatabaseUrl()), { schema });

export function createDbClient(databaseUrl: string) {
  return drizzle(neon(databaseUrl), { schema });
}
