import { NextResponse } from 'next/server';
import { getSession } from '../../../../lib/auth';
import { query } from '../../../../lib/db';

export async function PATCH(req, { params }) {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: 'Not signed in.' }, { status: 401 });

  const body = await req.json();
  const fields = [];
  const values = [];
  let i = 1;

  if (body.quantity !== undefined) {
    fields.push(`quantity = $${i++}`);
    values.push(Math.max(1, Number(body.quantity) || 1));
  }
  if (body.condition !== undefined) {
    fields.push(`condition = $${i++}`);
    values.push(body.condition);
  }
  if (body.foil !== undefined) {
    fields.push(`foil = $${i++}`);
    values.push(Boolean(body.foil));
  }
  if (!fields.length) return NextResponse.json({ error: 'Nothing to update.' }, { status: 400 });

  values.push(params.id, session.userId);
  await query(
    `UPDATE collection_items SET ${fields.join(', ')} WHERE id = $${i++} AND user_id = $${i}`,
    values
  );
  return NextResponse.json({ ok: true });
}

export async function DELETE(req, { params }) {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: 'Not signed in.' }, { status: 401 });

  await query('DELETE FROM collection_items WHERE id = $1 AND user_id = $2', [params.id, session.userId]);
  return NextResponse.json({ ok: true });
}
