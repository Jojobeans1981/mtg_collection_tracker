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

  const { email, password, displayName } = await req.json();
  if (!email || !password || password.length < 8) {
    return NextResponse.json(
      { error: 'Email and a password of at least 8 characters are required.' },
      { status: 400 }
    );
  }

  const normalizedEmail = String(email).toLowerCase().trim();
  const existing = await query('SELECT id FROM users WHERE email = $1', [normalizedEmail]);
  if (existing.rowCount > 0) {
    return NextResponse.json({ error: 'An account with that email already exists.' }, { status: 409 });
  }

  const hash = await bcrypt.hash(password, 10);
  const name = displayName?.trim() || normalizedEmail.split('@')[0];
  const result = await query(
    'INSERT INTO users (email, display_name, password_hash) VALUES ($1, $2, $3) RETURNING id, email, display_name',
    [normalizedEmail, name, hash]
  );
  const user = result.rows[0];
  await createSession(user.id, user.email);

  return NextResponse.json({ user: { id: user.id, email: user.email, displayName: user.display_name } });
}
