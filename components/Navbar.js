'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { Suspense } from 'react';
import { useAuth } from './AuthProvider';
import SearchBox from './SearchBox';

export default function Navbar() {
  const { user, loading, logout } = useAuth();
  const pathname = usePathname();
  // The home page has its own full-size search box (hero on empty state,
  // above results otherwise) — skip the compact nav one there so it isn't
  // duplicated; every other page gets it since they had no way to search
  // at all before.
  const showNavSearch = pathname !== '/';

  return (
    <header className="glass-strong sticky top-0 z-20 border-b border-white/10">
      <div className="mx-auto flex max-w-5xl flex-wrap items-center justify-between gap-3 px-4 py-3">
        <Link href="/" className="shrink-0 font-serif text-2xl font-black tracking-wide">
          <span className="foil-text">MTG Vault</span>
        </Link>
        {showNavSearch && (
          <div className="order-3 w-full sm:order-none sm:w-64 md:w-80">
            <Suspense fallback={null}>
              <SearchBox compact />
            </Suspense>
          </div>
        )}
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
