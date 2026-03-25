'use client';

import { useState } from 'react';

export function WaitlistForm(): React.ReactElement {
  const [email, setEmail] = useState('');
  const [status, setStatus] = useState<'idle' | 'loading' | 'success' | 'error'>('idle');

  async function handleSubmit(e: React.FormEvent): Promise<void> {
    e.preventDefault();
    if (!email.trim()) return;

    setStatus('loading');
    try {
      const res = await fetch('/api/waitlist', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: email.trim() }),
      });

      if (res.ok) {
        setStatus('success');
        setEmail('');
      } else {
        setStatus('error');
      }
    } catch {
      setStatus('error');
    }
  }

  if (status === 'success') {
    return (
      <div className="flex items-center gap-2 text-vouch-green text-sm font-mono">
        <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
          <path d="M4 8l3 3 5-6" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
        </svg>
        You&apos;re on the list. We&apos;ll be in touch.
      </div>
    );
  }

  return (
    <form onSubmit={handleSubmit} className="flex gap-3 items-center">
      <label className="sr-only" htmlFor="waitlist-email">Email</label>
      <input
        id="waitlist-email"
        type="email"
        value={email}
        onChange={(e) => setEmail(e.target.value)}
        placeholder="you@company.com"
        required
        className="bg-vouch-line border border-vouch-line text-vouch-text font-mono text-sm px-4 py-2.5 rounded-lg w-72 focus:outline-none focus:border-vouch-green placeholder:text-[#555]"
      />
      <button
        type="submit"
        disabled={status === 'loading'}
        className="bg-vouch-green text-white font-mono text-sm px-5 py-2.5 rounded-lg hover:opacity-90 transition-opacity disabled:opacity-50"
      >
        {status === 'loading' ? '...' : 'Join waitlist'}
      </button>
      {status === 'error' && (
        <span className="text-vouch-red text-xs">Something went wrong. Try again.</span>
      )}
    </form>
  );
}
