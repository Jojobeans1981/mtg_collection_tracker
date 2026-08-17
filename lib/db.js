import { Pool } from 'pg';

const connectionString =
  process.env.POSTGRES_URL ||
  process.env.DATABASE_URL ||
  process.env.POSTGRES_URL_NON_POOLING;

let pool = null;
let initialized = false;

function getPool() {
  if (!connectionString) return null;
  if (!pool) {
    pool = new Pool({
      connectionString,
      ssl: connectionString.includes('localhost') ? false : { rejectUnauthorized: false }
    });
  }
  return pool;
}

export function dbConfigured() {
  return Boolean(connectionString);
}

async function ensureSchema(p) {
  if (initialized) return;
  await p.query(`
    CREATE TABLE IF NOT EXISTS users (
      id SERIAL PRIMARY KEY,
      email TEXT UNIQUE NOT NULL,
      display_name TEXT NOT NULL,
      password_hash TEXT NOT NULL,
      created_at TIMESTAMPTZ NOT NULL DEFAULT now()
    );
  `);
  await p.query(`
    CREATE TABLE IF NOT EXISTS collection_items (
      id SERIAL PRIMARY KEY,
      user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
      scryfall_id TEXT NOT NULL,
      card_name TEXT NOT NULL,
      set_code TEXT,
      collector_number TEXT,
      foil BOOLEAN NOT NULL DEFAULT false,
      condition TEXT NOT NULL DEFAULT 'Near Mint',
      quantity INTEGER NOT NULL DEFAULT 1,
      image_url TEXT,
      created_at TIMESTAMPTZ NOT NULL DEFAULT now()
    );
  `);
  await p.query(`
    CREATE INDEX IF NOT EXISTS idx_collection_user ON collection_items(user_id);
  `);
  initialized = true;
}

export async function query(text, params) {
  const p = getPool();
  if (!p) {
    const err = new Error('DB_NOT_CONFIGURED');
    err.code = 'DB_NOT_CONFIGURED';
    throw err;
  }
  await ensureSchema(p);
  return p.query(text, params);
}
