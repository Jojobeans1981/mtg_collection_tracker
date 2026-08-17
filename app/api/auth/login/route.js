import { NextResponse } from 'next/server';
import bcrypt from 'bcryptjs';
import { query, dbConfigured } from '../../../../lib/db';
import { createSession } from '../../../../lib/auth';

export async function POST(req) {
  if (!dbConfigured()) {
    return NextResponse.json(
      { error: 'Accounts are not set up yet — the site owner needs to connect a database.' },
      { status: 503 }
    );
  }

  const { email, password } = await req.json();
  if (!email || !password) {
    return NextResponse.json({ error: 'Email and password are required.' }, { status: 400 });
  }

  const normalizedEmail = String(email).toLowerCase().trim();
  const result = await query(
    'SELECT id, email, display_name, password_hash FROM users WHERE email = $1',
    [normalizedEmail]
  );
  const user = result.rows[0];
  if (!user) {
    return NextResponse.json({ error: 'Invalid email or password.' }, { status: 401 });
  }

  const ok = await bcrypt.compare(password, user.password_hash);
  if (!ok) {
    return NextResponse.json({ error: 'Invalid email or password.' }, { status: 401 });
  }

  await createSession(user.id, user.email);
  return NextResponse.json({ user: { id: user.id, email: user.email, displayName: user.display_name } });
}
