import { NextResponse } from 'next/server';
import { query, dbConfigured } from '../../../lib/db';

// Visit /api/setup once after connecting a Postgres database to verify the
// connection and create tables. Safe to call repeatedly (idempotent).
export async function GET() {
  if (!dbConfigured()) {
    return NextResponse.json(
      { ok: false, message: 'No database connected yet. Add a Postgres storage integration in Vercel, then redeploy.' },
      { status: 200 }
    );
  }
  try {
    await query('SELECT 1');
    return NextResponse.json({ ok: true, message: 'Database connected and schema ready.' });
  } catch (err) {
    return NextResponse.json({ ok: false, message: String(err.message || err) }, { status: 500 });
  }
}
