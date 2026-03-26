'use client';

import dynamic from 'next/dynamic';
import { Suspense } from 'react';
import { WaitlistForm } from '@/components/WaitlistForm';
import { GlowCard } from '@/components/GlowCard';
import { TypeWriter } from '@/components/TypeWriter';

const ParticleField = dynamic(
  () => import('@/components/ParticleField').then((m) => m.ParticleField),
  { ssr: false, loading: () => null }
);

export default function HomePage() {
  return (
    <main className="min-h-screen bg-vouch-bg text-vouch-text overflow-hidden">
      {/* 3D Particle background */}
      <div className="fixed inset-0 z-0">
        <ParticleField />
      </div>

      {/* Radial glow overlays */}
      <div className="fixed inset-0 pointer-events-none z-[1]" style={{
        background: 'radial-gradient(ellipse at 50% 0%, rgba(22, 163, 74, 0.06) 0%, transparent 60%)',
      }} />
      <div className="fixed inset-0 pointer-events-none z-[1]" style={{
        background: 'radial-gradient(circle at 20% 80%, rgba(217, 119, 6, 0.03) 0%, transparent 40%)',
      }} />

      {/* Nav */}
      <nav className="relative z-10 flex items-center justify-between px-8 py-5 max-w-6xl mx-auto backdrop-blur-sm">
        <div className="flex items-center gap-2">
          <div className="relative">
            <div className="w-2 h-2 rounded-full bg-vouch-green" />
            <div className="absolute inset-0 w-2 h-2 rounded-full bg-vouch-green animate-ping opacity-40" />
          </div>
          <span className="font-mono text-sm tracking-tight font-bold">vouch</span>
        </div>
        <div className="flex items-center gap-6">
          <a href="#how" className="text-vouch-muted text-xs hover:text-vouch-text transition-colors duration-300">How it works</a>
          <a href="#code" className="text-vouch-muted text-xs hover:text-vouch-text transition-colors duration-300">Code</a>
          <a
            href="https://github.com/fluentflier/vouch"
            target="_blank"
            rel="noopener noreferrer"
            className="flex items-center gap-1.5 text-vouch-muted text-xs hover:text-vouch-text transition-all duration-300 border border-vouch-line hover:border-vouch-green/30 rounded-full px-3 py-1.5 hover:shadow-[0_0_15px_rgba(22,163,74,0.1)]"
          >
            <svg width="14" height="14" viewBox="0 0 16 16" fill="currentColor">
              <path d="M8 0C3.58 0 0 3.58 0 8c0 3.54 2.29 6.53 5.47 7.59.4.07.55-.17.55-.38 0-.19-.01-.82-.01-1.49-2.01.37-2.53-.49-2.69-.94-.09-.23-.48-.94-.82-1.13-.28-.15-.68-.52-.01-.53.63-.01 1.08.58 1.23.82.72 1.21 1.87.87 2.33.66.07-.52.28-.87.51-1.07-1.78-.2-3.64-.89-3.64-3.95 0-.87.31-1.59.82-2.15-.08-.2-.36-1.02.08-2.12 0 0 .67-.21 2.2.82.64-.18 1.32-.27 2-.27.68 0 1.36.09 2 .27 1.53-1.04 2.2-.82 2.2-.82.44 1.1.16 1.92.08 2.12.51.56.82 1.27.82 2.15 0 3.07-1.87 3.75-3.65 3.95.29.25.54.73.54 1.48 0 1.07-.01 1.93-.01 2.2 0 .21.15.46.55.38A8.013 8.013 0 0016 8c0-4.42-3.58-8-8-8z"/>
            </svg>
            GitHub
          </a>
        </div>
      </nav>

      {/* Hero */}
      <section className="relative z-10 flex flex-col items-center pt-32 pb-28 px-6">
        {/* Badge */}
        <div
          className="mb-8 px-4 py-1.5 border border-vouch-line/50 rounded-full text-xs text-vouch-muted backdrop-blur-sm"
          style={{ animation: 'fade-in 0.6s ease-out' }}
        >
          <span className="text-vouch-green">Open source</span> &middot; Runtime safety for AI agents
        </div>

        {/* Title with gradient */}
        <h1
          className="font-mono text-7xl md:text-9xl font-bold tracking-tighter mb-4"
          style={{
            animation: 'fade-in 1s ease-out',
            background: 'linear-gradient(180deg, #EDEDEA 0%, rgba(237,237,234,0.4) 100%)',
            WebkitBackgroundClip: 'text',
            WebkitTextFillColor: 'transparent',
            textShadow: '0 0 80px rgba(22, 163, 74, 0.15)',
          }}
        >
          vouch
        </h1>

        <p
          className="text-xl md:text-2xl text-vouch-muted max-w-2xl text-center leading-relaxed mt-2 mb-2"
          style={{ animation: 'fade-in 1s ease-out 0.2s both' }}
        >
          The safety layer for{' '}
          <TypeWriter
            words={['AI agents', 'LLM tools', 'autonomous systems', 'code assistants']}
            className="text-vouch-green font-mono"
          />
        </p>
        <p
          className="text-sm text-vouch-muted max-w-lg text-center leading-relaxed mb-14"
          style={{ animation: 'fade-in 1s ease-out 0.4s both', opacity: 0.5 }}
        >
          Scan code for secrets. Enforce policies at runtime. Watch files in real-time. Works with any AI coding tool.
        </p>

        {/* CTA buttons */}
        <div style={{ animation: 'fade-in 1s ease-out 0.5s both' }} className="flex gap-3 mb-4">
          <a
            href="/demo"
            className="bg-vouch-green text-white font-mono text-sm px-6 py-2.5 rounded-lg hover:opacity-90 transition-opacity"
          >
            Try the scanner
          </a>
          <a
            href="https://github.com/fluentflier/vouch"
            target="_blank"
            rel="noopener noreferrer"
            className="border border-vouch-line text-vouch-text font-mono text-sm px-6 py-2.5 rounded-lg hover:border-vouch-green/30 transition-all"
          >
            View on GitHub
          </a>
        </div>

        {/* Waitlist */}
        <div style={{ animation: 'fade-in 1s ease-out 0.6s both' }}>
          <WaitlistForm />
        </div>

        {/* Terminal preview with 3D tilt */}
        <div
          className="mt-20 w-full max-w-2xl group"
          style={{
            animation: 'fade-in 1s ease-out 0.8s both',
            perspective: '1200px',
          }}
        >
          <div
            className="bg-[#0C0C0C]/90 border border-vouch-line/50 rounded-2xl overflow-hidden backdrop-blur-md transition-transform duration-700 group-hover:scale-[1.02]"
            style={{
              boxShadow: '0 0 80px rgba(22, 163, 74, 0.05), 0 30px 60px rgba(0,0,0,0.5)',
              transform: 'rotateX(2deg)',
            }}
          >
            <div className="flex items-center gap-1.5 px-4 py-3 border-b border-vouch-line/30">
              <div className="w-2.5 h-2.5 rounded-full bg-[#FF5F57]" />
              <div className="w-2.5 h-2.5 rounded-full bg-[#FEBC2E]" />
              <div className="w-2.5 h-2.5 rounded-full bg-[#28C840]" />
              <span className="ml-3 text-[10px] text-vouch-muted font-mono">vouch.protect()</span>
            </div>
            <pre className="p-6 text-xs font-mono leading-relaxed overflow-x-auto">
<span className="text-[#555]">{'// One function. Every agent action.'}</span>{'\n'}
<span className="text-[#C792EA]">const</span> result = <span className="text-[#C792EA]">await</span> vouch.<span className="text-vouch-green">protect</span>({'{'}
  actionType: <span className="text-[#C3E88D]">&apos;send_email&apos;</span>,
  context: {'{'} confidence: <span className="text-vouch-amber">0.88</span> {'}'},
{'}'}, () =&gt; emailClient.send(to, body));{'\n'}
<span className="text-[#555]">{'// Verdicts:'}</span>{'\n'}
<span className="text-vouch-green">{'  PASS    '}</span><span className="text-[#555]">12ms  action_safety  - execute immediately</span>{'\n'}
<span className="text-vouch-amber">{'  CONFIRM '}</span><span className="text-[#555]">Review before sending: &apos;send_email&apos;</span>{'\n'}
<span className="text-vouch-red">{'  BLOCK   '}</span><span className="text-[#555]">Destructive action, cannot execute.</span>
            </pre>
          </div>
        </div>
      </section>

      {/* Stats with glow */}
      <section className="relative z-10 border-t border-b border-vouch-line/30 backdrop-blur-sm">
        <div className="max-w-5xl mx-auto px-8 py-14 grid grid-cols-2 md:grid-cols-4 gap-8 text-center">
          {[
            { value: '10+', label: 'Security scanners', color: '#16A34A' },
            { value: '<2s', label: 'Full repo scan', color: '#D97706' },
            { value: 'MCP', label: 'AI tool integration', color: '#EDEDEA' },
            { value: '0', label: 'Data sent anywhere', color: '#DC2626' },
          ].map((stat, i) => (
            <div
              key={stat.label}
              className="group cursor-default"
              style={{ animation: `fade-in 0.6s ease-out ${0.1 * i}s both` }}
            >
              <div
                className="font-mono text-3xl font-bold transition-all duration-500 group-hover:scale-110"
                style={{
                  color: stat.color,
                  textShadow: `0 0 30px ${stat.color}30`,
                }}
              >
                {stat.value}
              </div>
              <div className="text-vouch-muted text-xs mt-1.5 group-hover:text-vouch-text transition-colors duration-300">
                {stat.label}
              </div>
            </div>
          ))}
        </div>
      </section>

      {/* How it works */}
      <section id="how" className="relative z-10 max-w-5xl mx-auto px-8 py-28">
        <h2
          className="text-3xl font-medium mb-4 text-center"
          style={{
            background: 'linear-gradient(180deg, #EDEDEA 0%, #888 100%)',
            WebkitBackgroundClip: 'text',
            WebkitTextFillColor: 'transparent',
          }}
        >
          Three steps to verified agents
        </h2>
        <p className="text-vouch-muted text-sm text-center mb-16 max-w-md mx-auto">
          Clone, scan, protect. Works with any AI coding tool.
        </p>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
          {[
            {
              num: '01',
              color: '#16A34A',
              title: 'Scan your code',
              desc: '`vouch scan` finds secrets, PII, injection patterns, and unsafe code. AI-aware: catches patterns only AI-generated code produces.',
              icon: (
                <svg width="36" height="36" viewBox="0 0 36 36" fill="none" className="mb-5">
                  <rect x="4" y="4" width="28" height="28" rx="6" stroke="#16A34A" strokeWidth="1.5" opacity="0.5"/>
                  <path d="M11 13h14M11 18h9M11 23h11" stroke="#16A34A" strokeWidth="1.5" strokeLinecap="round"/>
                </svg>
              ),
            },
            {
              num: '02',
              color: '#D97706',
              title: 'Watch in real-time',
              desc: '`vouch watch` monitors every file save. Live dashboard shows pass rate, recent events, and alerts. Pre-commit hooks block bad commits.',
              icon: (
                <svg width="36" height="36" viewBox="0 0 36 36" fill="none" className="mb-5">
                  <path d="M18 4L32 11v9c0 7-6 12-14 16C10 32 4 27 4 20v-9L18 4z" stroke="#D97706" strokeWidth="1.5" opacity="0.5"/>
                  <path d="M13 18l4 4 6-7" stroke="#D97706" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                </svg>
              ),
            },
            {
              num: '03',
              color: '#DC2626',
              title: 'Integrate with AI tools',
              desc: 'MCP server lets Claude Code and Cursor check security BEFORE writing code. GitHub Action blocks PRs with critical findings.',
              icon: (
                <svg width="36" height="36" viewBox="0 0 36 36" fill="none" className="mb-5">
                  <circle cx="18" cy="18" r="13" stroke="#DC2626" strokeWidth="1.5" opacity="0.5"/>
                  <path d="M18 9v9l6 3" stroke="#DC2626" strokeWidth="1.5" strokeLinecap="round"/>
                </svg>
              ),
            },
          ].map((step, i) => (
            <GlowCard key={step.num} glowColor={step.color} className="h-full">
              <div className="p-7" style={{ animation: `fade-in 0.6s ease-out ${0.15 * i}s both` }}>
                {step.icon}
                <div className="font-mono text-xs mb-3 tracking-wider" style={{ color: step.color }}>{step.num}</div>
                <h3 className="text-base font-medium mb-3">{step.title}</h3>
                <p className="text-vouch-muted text-xs leading-relaxed">{step.desc}</p>
              </div>
            </GlowCard>
          ))}
        </div>
      </section>

      {/* Code example */}
      <section id="code" className="relative z-10 max-w-3xl mx-auto px-8 py-20">
        <h2
          className="text-3xl font-medium mb-3 text-center"
          style={{
            background: 'linear-gradient(180deg, #EDEDEA 0%, #888 100%)',
            WebkitBackgroundClip: 'text',
            WebkitTextFillColor: 'transparent',
          }}
        >
          Policy in 10 lines
        </h2>
        <p className="text-vouch-muted text-sm text-center mb-10">
          Simple YAML. No DSL to learn. No SDK lock-in.
        </p>
        <GlowCard>
          <div className="rounded-xl overflow-hidden">
            <div className="flex items-center px-4 py-3 border-b border-vouch-line/30 bg-[#0C0C0C]">
              <div className="flex gap-4 text-[10px] font-mono">
                <span className="text-vouch-green border-b border-vouch-green pb-2">vouch.policy.yaml</span>
                <span className="text-vouch-muted pb-2 cursor-default">vouch.config.yaml</span>
              </div>
            </div>
            <pre className="p-6 text-xs font-mono leading-relaxed bg-[#080808]">
<span className="text-vouch-green">agent</span><span className="text-vouch-muted">:</span> my-agent{'\n'}
<span className="text-vouch-green">version</span><span className="text-vouch-muted">:</span> <span className="text-[#C3E88D]">&quot;1.0&quot;</span>{'\n'}
{'\n'}
<span className="text-vouch-green">rules</span><span className="text-vouch-muted">:</span>{'\n'}
{'  '}<span className="text-vouch-muted">-</span> <span className="text-vouch-amber">name</span><span className="text-vouch-muted">:</span> no_production_writes{'\n'}
{'    '}<span className="text-vouch-amber">verdict</span><span className="text-vouch-muted">:</span> <span className="text-vouch-red">BLOCK</span>{'\n'}
{'    '}<span className="text-vouch-amber">message</span><span className="text-vouch-muted">:</span> <span className="text-[#C3E88D]">&quot;Production writes need a deployment.&quot;</span>{'\n'}
{'    '}<span className="text-vouch-amber">trigger</span><span className="text-vouch-muted">:</span>{'\n'}
{'      '}actionContains<span className="text-vouch-muted">:</span> [<span className="text-[#C3E88D]">&quot;prod&quot;</span>, <span className="text-[#C3E88D]">&quot;production&quot;</span>]{'\n'}
{'\n'}
{'  '}<span className="text-vouch-muted">-</span> <span className="text-vouch-amber">name</span><span className="text-vouch-muted">:</span> confirm_sends{'\n'}
{'    '}<span className="text-vouch-amber">verdict</span><span className="text-vouch-muted">:</span> <span className="text-vouch-amber">CONFIRM</span>{'\n'}
{'    '}<span className="text-vouch-amber">message</span><span className="text-vouch-muted">:</span> <span className="text-[#C3E88D]">&quot;Review before sending.&quot;</span>{'\n'}
{'    '}<span className="text-vouch-amber">trigger</span><span className="text-vouch-muted">:</span>{'\n'}
{'      '}actionStartsWith<span className="text-vouch-muted">:</span> [<span className="text-[#C3E88D]">&quot;send_&quot;</span>, <span className="text-[#C3E88D]">&quot;post_&quot;</span>]
            </pre>
          </div>
        </GlowCard>
      </section>

      {/* Bottom CTA */}
      <section className="relative z-10 py-28 text-center border-t border-vouch-line/30">
        <h2
          className="text-4xl font-medium mb-4"
          style={{
            background: 'linear-gradient(180deg, #EDEDEA 0%, #888 100%)',
            WebkitBackgroundClip: 'text',
            WebkitTextFillColor: 'transparent',
          }}
        >
          Ship agents users can trust.
        </h2>
        <p className="text-vouch-muted text-sm mb-12 max-w-md mx-auto">
          Building internally first. Open access coming soon.
        </p>
        <div className="flex justify-center">
          <WaitlistForm />
        </div>
        <div className="mt-10">
          <a
            href="https://github.com/fluentflier/vouch"
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center gap-2 text-vouch-muted text-xs hover:text-vouch-green transition-colors duration-300"
          >
            <svg width="14" height="14" viewBox="0 0 16 16" fill="currentColor">
              <path d="M8 0C3.58 0 0 3.58 0 8c0 3.54 2.29 6.53 5.47 7.59.4.07.55-.17.55-.38 0-.19-.01-.82-.01-1.49-2.01.37-2.53-.49-2.69-.94-.09-.23-.48-.94-.82-1.13-.28-.15-.68-.52-.01-.53.63-.01 1.08.58 1.23.82.72 1.21 1.87.87 2.33.66.07-.52.28-.87.51-1.07-1.78-.2-3.64-.89-3.64-3.95 0-.87.31-1.59.82-2.15-.08-.2-.36-1.02.08-2.12 0 0 .67-.21 2.2.82.64-.18 1.32-.27 2-.27.68 0 1.36.09 2 .27 1.53-1.04 2.2-.82 2.2-.82.44 1.1.16 1.92.08 2.12.51.56.82 1.27.82 2.15 0 3.07-1.87 3.75-3.65 3.95.29.25.54.73.54 1.48 0 1.07-.01 1.93-.01 2.2 0 .21.15.46.55.38A8.013 8.013 0 0016 8c0-4.42-3.58-8-8-8z"/>
            </svg>
            View source on GitHub
          </a>
        </div>
      </section>

      {/* Footer */}
      <footer className="relative z-10 border-t border-vouch-line/20 py-8 text-center backdrop-blur-sm">
        <div className="flex items-center justify-center gap-6 text-[11px] text-vouch-muted">
          <span>Built with Jac</span>
          <span style={{ opacity: 0.15 }}>|</span>
          <span>Open source, MIT</span>
          <span style={{ opacity: 0.15 }}>|</span>
          <span>No user data stored</span>
        </div>
      </footer>
    </main>
  );
}
