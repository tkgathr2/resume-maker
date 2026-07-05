import { Pool } from 'pg';
import { env } from './env';

// Single shared pool across hot-reloads / serverless invocations.
declare global {
  // eslint-disable-next-line no-var
  var __resumeMakerPool: Pool | undefined;
  // eslint-disable-next-line no-var
  var __resumeMakerSchemaReady: Promise<void> | undefined;
}

function getPool(): Pool {
  if (!global.__resumeMakerPool) {
    const connectionString = env.databaseUrl;
    if (!connectionString) {
      throw new Error('DATABASE_URL is not configured');
    }
    global.__resumeMakerPool = new Pool({
      connectionString,
      // Railway managed Postgres requires SSL; disable strict cert check.
      ssl: connectionString.includes('localhost')
        ? undefined
        : { rejectUnauthorized: false },
      max: 3,
      idleTimeoutMillis: 10000,
      connectionTimeoutMillis: 5000,
    });
  }
  return global.__resumeMakerPool;
}

const SCHEMA_SQL = `
CREATE EXTENSION IF NOT EXISTS pgcrypto;

CREATE TABLE IF NOT EXISTS users (
  id            uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  google_sub    text UNIQUE NOT NULL,
  email         text NOT NULL,
  name          text NOT NULL,
  picture       text NULL,
  created_at    timestamptz NOT NULL DEFAULT now(),
  updated_at    timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS resumes (
  id            uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id       uuid NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  full_name     text NOT NULL,
  email         text NULL,
  phone         text NULL,
  summary       text NULL,
  experience    text NULL,
  education     text NULL,
  skills        text NULL,
  drive_file_id text NULL,
  drive_link    text NULL,
  created_at    timestamptz NOT NULL DEFAULT now(),
  updated_at    timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS resumes_user_idx ON resumes(user_id, created_at DESC);
`;

// Ensures schema exists exactly once per process.
export function ensureSchema(): Promise<void> {
  if (!global.__resumeMakerSchemaReady) {
    global.__resumeMakerSchemaReady = getPool()
      .query(SCHEMA_SQL)
      .then(() => undefined)
      .catch((err) => {
        // Reset so a later request can retry.
        global.__resumeMakerSchemaReady = undefined;
        throw err;
      });
  }
  return global.__resumeMakerSchemaReady;
}

export async function query<T = any>(
  text: string,
  params: any[] = []
): Promise<{ rows: T[] }> {
  await ensureSchema();
  const res = await getPool().query(text, params);
  return { rows: res.rows as T[] };
}
