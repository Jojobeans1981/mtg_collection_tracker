import { NextResponse } from 'next/server';
import { getSession } from '../../../../lib/auth';
import { query, dbConfigured } from '../../../../lib/db';

export async function GET() {
  const session = await getSession();
  if (!session || !dbConfigured()) return NextResponse.json({ user: null });

  const result = await query('SELECT id, email, display_name FROM users WHERE id = $1', [session.userId]);
  const user = result.rows[0];
  if (!user) return NextResponse.json({ user: null });

  return NextResponse.json({ user: { id: user.id, email: user.email, displayName: user.display_name } });
}
