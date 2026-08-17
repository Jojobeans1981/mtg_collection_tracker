'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { useAuth } from '../../components/AuthProvider';

export default function LoginPage() {
  const router = useRouter();
  const { refresh } = useAuth();
  const [form, setForm] = useState({ email: '', password: '' });
  const [error, setError] = useState(null);
  const [busy, setBusy] = useState(false);

  async function submit(e) {
    e.preventDefault();
    setBusy(true);
    setError(null);
    const res = await fetch('/api/auth/login', {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify(form)
    });
    const data = await res.json();
    setBusy(false);
    if (!res.ok) {
      setError(data.error || 'Something went wrong.');
      return;
    }
    await refresh();
    router.push('/collection');
  }

  return (
    <div className="glass card-shadow mx-auto max-w-sm rounded-2xl p-6">
      <h1 className="mb-5 font-serif text-2xl font-black">
        <span className="foil-text">Log in</span>
      </h1>
      <form onSubmit={submit} className="space-y-3">
        <input
          type="email"
          required
          placeholder="Email"
          className="w-full rounded-lg border border-white/15 bg-white/5 px-3 py-2 text-parchment placeholder:text-ink/40 focus:outline-none focus:ring-2 focus:ring-cyan"
          value={form.email}
          onChange={(e) => setForm({ ...form, email: e.target.value })}
        />
        <input
          type="password"
          required
          placeholder="Password"
          className="w-full rounded-lg border border-white/15 bg-white/5 px-3 py-2 text-parchment placeholder:text-ink/40 focus:outline-none focus:ring-2 focus:ring-cyan"
          value={form.password}
          onChange={(e) => setForm({ ...form, password: e.target.value })}
        />
        {error && <p className="text-sm text-ember">{error}</p>}
        <button
          disabled={busy}
          className="w-full rounded-full bg-gradient-to-r from-forest to-cyan py-2 font-semibold text-parchment transition hover:scale-[1.02] hover:shadow-glow disabled:opacity-60"
        >
          {busy ? 'Logging in…' : 'Log in'}
        </button>
      </form>
      <p className="mt-4 text-sm text-ink/60">
        No account?{' '}
        <Link href="/register" className="text-gold hover:text-cyan">
          Sign up free
        </Link>
      </p>
    </div>
  );
}
