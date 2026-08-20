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

  // Merge any duplicate rows left over from before adding was upsert-based
  // (same user + printing + foil + condition, added more than once) into a
  // single row with the summed quantity, so the unique index below can be
  // created without failing on existing dupes. No-op once there are none.
  await p.query(`
    WITH ranked AS (
      SELECT id,
             ROW_NUMBER() OVER (PARTITION BY user_id, scryfall_id, foil, condition ORDER BY id) AS rn,
             SUM(quantity) OVER (PARTITION BY user_id, scryfall_id, foil, condition) AS total_qty
      FROM collection_items
    )
    UPDATE collection_items ci SET quantity = ranked.total_qty
    FROM ranked WHERE ci.id = ranked.id AND ranked.rn = 1;

    WITH ranked AS (
      SELECT id,
             ROW_NUMBER() OVER (PARTITION BY user_id, scryfall_id, foil, condition ORDER BY id) AS rn
      FROM collection_items
    )
    DELETE FROM collection_items ci USING ranked WHERE ci.id = ranked.id AND ranked.rn > 1;
  `);

  // Same printing + foil + condition for the same user is now one row —
  // adding a card you already have increases its quantity instead of
  // creating a duplicate entry.
  await p.query(`
    CREATE UNIQUE INDEX IF NOT EXISTS uniq_collection_item
    ON collection_items(user_id, scryfall_id, foil, condition);
  `);

  // One row per user per day — the collection's two headline totals at the
  // time the collection page was last loaded that day. Powers the value
  // history chart. Re-loading the page the same day just updates today's
  // row rather than adding a duplicate.
  await p.query(`
    CREATE TABLE IF NOT EXISTS collection_value_snapshots (
      user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
      captured_at DATE NOT NULL,
      sell_total NUMERIC NOT NULL,
      retail_total NUMERIC NOT NULL,
      PRIMARY KEY (user_id, captured_at)
    );
  `);

  // One row per card per day — the first price seen that day for a given
  // printing. Powers "biggest movers": compare a card's oldest snapshot in
  // a window against today's. Left as the FIRST sample of the day (not
  // overwritten) so movers aren't jittered by Card Kingdom's cache
  // refreshing mid-day.
  await p.query(`
    CREATE TABLE IF NOT EXISTS price_snapshots (
      scryfall_id TEXT NOT NULL,
      captured_at DATE NOT NULL,
      card_name TEXT NOT NULL,
      buy_price NUMERIC,
      retail_price NUMERIC,
      PRIMARY KEY (scryfall_id, captured_at)
    );
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
