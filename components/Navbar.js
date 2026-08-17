'use client';

import Link from 'next/link';
import { useAuth } from './AuthProvider';

export default function Navbar() {
  const { user, loading, logout } = useAuth();

  return (
    <header className="glass-strong sticky top-0 z-20 border-b border-white/10">
      <div className="mx-auto flex max-w-5xl items-center justify-between px-4 py-3">
        <Link href="/" className="font-serif text-2xl font-black tracking-wide">
          <span className="foil-text">MTG Vault</span>
        </Link>
        <nav className="flex items-center gap-5 text-sm font-medium text-ink/80">
          <Link href="/" className="transition hover:text-cyan hover:drop-shadow-[0_0_8px_rgba(45,216,255,0.8)]">
            Search
          </Link>
          {!loading && user && (
            <Link href="/collection" className="transition hover:text-cyan hover:drop-shadow-[0_0_8px_rgba(45,216,255,0.8)]">
              My Collection
            </Link>
          )}
          {!loading && !user && (
            <>
              <Link href="/login" className="transition hover:text-cyan">
                Log in
              </Link>
              <Link
                href="/register"
                className="rounded-full bg-gradient-to-r from-ember to-forest px-4 py-1.5 font-semibold text-parchment shadow-glow-ember transition hover:scale-105 hover:shadow-glow"
              >
                Sign up free
              </Link>
            </>
          )}
          {!loading && user && (
            <button onClick={logout} className="text-ink/50 transition hover:text-ember">
              Log out
            </button>
          )}
        </nav>
      </div>
    </header>
  );
}
