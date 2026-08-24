import React, { useState } from 'react';
import {
  Activity,
  ArrowDown,
  ArrowRight,
  Boxes,
  Database,
  Eye,
  GitBranch,
  Globe2,
  Lock,
  Menu,
  Network,
  Radar,
  Route,
  ScanLine,
  ShieldCheck,
  Target,
  X,
} from 'lucide-react';

interface LandingPageProps {
  onNavigateToAuth: () => void;
  onNavigateToApp: () => void;
  isAuthenticated: boolean;
}

const FEATURES = [
  { icon: Radar, number: '01', title: 'Monitor geopolitical pressure', description: 'Follow source-linked events across crude, shipping lanes, chokepoints, sanctions, pipelines, and refineries.' },
  { icon: Activity, number: '02', title: 'Turn events into risk', description: 'Translate event detail into clear supply-chain relevance, risk levels, and operator-ready context.' },
  { icon: Network, number: '03', title: 'See infrastructure impact', description: 'Connect geopolitical developments to affected supply-chain assets and connections across the energy network.' },
  { icon: Target, number: '04', title: 'Act with confidence', description: 'Explore deterministic scenarios, procurement options, and strategic reserve responses from one operational view.' },
];

const SIGNALS = [
  { icon: Database, label: 'Source traceability' },
  { icon: ScanLine, label: 'Risk clarity' },
  { icon: GitBranch, label: 'Infrastructure impact' },
  { icon: ShieldCheck, label: 'Operator confidence' },
];

const PRINCIPLES = [
  { icon: Database, title: 'Source-backed', description: 'Keep source references and data provenance close to the intelligence they support.' },
  { icon: Target, title: 'Relevant by design', description: 'Focus attention on energy supply-chain relevance instead of undifferentiated headlines.' },
  { icon: Eye, title: 'Actionable insight', description: 'Move from event understanding to network impact, scenarios, and response options.' },
  { icon: ShieldCheck, title: 'Accountable operations', description: 'Make the reasoning, assumptions, and operational data behind an assessment visible.' },
];

const WORKFLOW = [
  { number: '01', icon: Radar, title: 'Detect', description: 'Geopolitical signals and source-backed events' },
  { number: '02', icon: Activity, title: 'Understand', description: 'Risk and supply-chain relevance' },
  { number: '03', icon: Network, title: 'Map', description: 'Digital Twin infrastructure impact' },
  { number: '04', icon: Route, title: 'Respond', description: 'Scenario, procurement, and reserve intelligence' },
];

const NAV_ITEMS = [
  { label: 'Why ORBIT', href: '#why-orbit' },
  { label: 'Capabilities', href: '#capabilities' },
  { label: 'Use Cases', href: '#capabilities' },
  { label: 'Platform', href: '#workflow' },
  { label: 'Security', href: '#security' },
  { label: 'Resources', href: '#resources' },
];

const NetworkVisual: React.FC = () => (
  <div className="landing-network-visual relative min-h-[430px] overflow-hidden rounded-2xl border border-[var(--border-subtle)] bg-[var(--bg-card)] shadow-2xl shadow-slate-950/10" aria-label="Illustration of event, risk, and supply-chain relationships">
    <div className="landing-network-grid absolute inset-0 opacity-70" />
    <div className="absolute left-5 top-5 flex items-center gap-2 text-[10px] font-semibold uppercase tracking-[0.2em] text-[var(--text-muted)]">
      <span className="h-2 w-2 rounded-full bg-emerald-500 shadow-[0_0_12px_rgba(16,185,129,0.7)]" />
      Intelligence graph
    </div>

    <svg className="absolute inset-0 h-full w-full" viewBox="0 0 620 500" fill="none" aria-hidden="true">
      <defs>
        <linearGradient id="orbit-line" x1="0" y1="0" x2="1" y2="1">
          <stop offset="0" stopColor="#f97316" stopOpacity="0.85" />
          <stop offset="1" stopColor="#64748b" stopOpacity="0.18" />
        </linearGradient>
        <radialGradient id="orbit-glow">
          <stop offset="0" stopColor="#f97316" stopOpacity="0.34" />
          <stop offset="1" stopColor="#f97316" stopOpacity="0" />
        </radialGradient>
      </defs>
      <circle cx="325" cy="255" r="120" fill="url(#orbit-glow)" />
      <path d="M112 150 C185 155 215 190 286 238" stroke="url(#orbit-line)" strokeWidth="1.5" strokeDasharray="5 7" />
      <path d="M286 238 C350 214 395 155 480 136" stroke="url(#orbit-line)" strokeWidth="1.5" strokeDasharray="5 7" />
      <path d="M286 238 C350 270 388 326 464 365" stroke="url(#orbit-line)" strokeWidth="1.5" strokeDasharray="5 7" />
      <path d="M286 238 C248 294 203 334 136 374" stroke="url(#orbit-line)" strokeWidth="1.5" strokeDasharray="5 7" />
      <path d="M286 238 C287 302 298 352 321 421" stroke="url(#orbit-line)" strokeWidth="1.5" strokeDasharray="5 7" />
      <circle cx="112" cy="150" r="5" fill="#f97316" />
      <circle cx="480" cy="136" r="5" fill="#f59e0b" />
      <circle cx="464" cy="365" r="5" fill="#10b981" />
      <circle cx="136" cy="374" r="5" fill="#94a3b8" />
      <circle cx="321" cy="421" r="5" fill="#38bdf8" />
      <circle cx="286" cy="238" r="11" fill="#f97316" fillOpacity="0.16" stroke="#f97316" strokeWidth="2" />
      <circle cx="286" cy="238" r="4" fill="#fb923c" />
    </svg>

    <div className="absolute left-5 top-24 w-44 rounded-xl border border-orange-500/25 bg-[var(--bg-secondary)]/95 p-3 shadow-xl backdrop-blur-md">
      <div className="flex items-center gap-2 text-[10px] font-semibold uppercase tracking-wider text-orange-500"><Globe2 className="h-3.5 w-3.5" /> Event signal</div>
      <p className="mt-2 text-sm font-semibold text-[var(--text-primary)]">Maritime disruption</p>
      <p className="mt-1 text-[11px] leading-relaxed text-[var(--text-secondary)]">Source-linked geopolitical development</p>
    </div>

    <div className="absolute right-5 top-24 w-40 rounded-xl border border-amber-500/25 bg-[var(--bg-secondary)]/95 p-3 shadow-xl backdrop-blur-md">
      <div className="flex items-center justify-between text-[10px] font-semibold uppercase tracking-wider text-amber-500"><span>Risk view</span><span className="h-2.5 w-2.5 animate-pulse rounded-full bg-amber-400" /></div>
      <p className="mt-2 text-sm font-semibold text-[var(--text-primary)]">Supply-chain exposure</p>
      <div className="mt-2 h-1.5 overflow-hidden rounded-full bg-[var(--bg-subtle)]"><div className="h-full w-3/4 rounded-full bg-gradient-to-r from-amber-500 to-orange-500" /></div>
    </div>

    <div className="absolute bottom-6 left-1/2 w-56 -translate-x-1/2 rounded-xl border border-emerald-500/25 bg-[var(--bg-secondary)]/95 p-3 shadow-xl backdrop-blur-md">
      <div className="flex items-center gap-2 text-[10px] font-semibold uppercase tracking-wider text-emerald-500"><Network className="h-3.5 w-3.5" /> Infrastructure impact</div>
      <div className="mt-3 flex items-end gap-2">
        <div className="h-7 w-7 rounded-md border border-emerald-500/30 bg-emerald-500/10" />
        <div className="h-11 w-7 rounded-md border border-orange-500/30 bg-orange-500/10" />
        <div className="h-9 w-7 rounded-md border border-sky-500/30 bg-sky-500/10" />
        <span className="ml-auto text-[11px] text-[var(--text-secondary)]">Assets connected</span>
      </div>
    </div>
  </div>
);

export const LandingPage: React.FC<LandingPageProps> = ({ onNavigateToAuth, onNavigateToApp, isAuthenticated }) => {
  const [mobileNavOpen, setMobileNavOpen] = useState(false);
  const primaryAction = isAuthenticated ? onNavigateToApp : onNavigateToAuth;
  const primaryLabel = isAuthenticated ? 'Open Command Overview' : 'Access ORBIT';

  return (
    <div className="landing-page min-h-screen overflow-x-hidden bg-[var(--bg-primary)] text-[var(--text-primary)] selection:bg-orange-500/30">
      <header className="sticky top-0 z-50 border-b border-[var(--border-subtle)] bg-[var(--bg-secondary)]/90 backdrop-blur-xl">
        <div className="mx-auto flex h-[4.5rem] max-w-7xl items-center justify-between gap-4 px-4 sm:px-6 lg:px-8">
          <a href="#top" className="flex items-center gap-3" aria-label="ORBIT home">
            <div className="flex h-9 w-9 items-center justify-center rounded-md bg-orange-500 shadow-lg shadow-orange-500/20" aria-hidden="true"><div className="flex h-5 w-5 items-center justify-center rounded-full border-2 border-white"><div className="h-1.5 w-1.5 rounded-full bg-white" /></div></div>
            <div><span className="block text-xl font-bold tracking-tight">ORBIT</span><span className="hidden text-[9px] font-semibold uppercase tracking-[0.2em] text-[var(--text-muted)] sm:block">Energy intelligence</span></div>
          </a>

          <nav className="hidden items-center gap-5 lg:flex" aria-label="Landing page navigation">
            {NAV_ITEMS.map((item) => <a key={item.label} href={item.href} className="text-xs font-medium text-[var(--text-secondary)] transition-colors hover:text-[var(--text-primary)]">{item.label}</a>)}
          </nav>

          <div className="flex items-center gap-2 sm:gap-3">
            <button id="landing-signin-button" onClick={primaryAction} type="button" className="hidden items-center gap-2 rounded-md bg-orange-500 px-4 py-2.5 text-xs font-semibold text-white shadow-lg shadow-orange-500/15 transition-all hover:bg-orange-600 hover:shadow-orange-500/25 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-orange-500/70 focus-visible:ring-offset-2 focus-visible:ring-offset-[var(--bg-primary)] sm:inline-flex"><span>{isAuthenticated ? 'COMMAND OVERVIEW' : 'SIGN IN TO ORBIT'}</span><ArrowRight className="h-3.5 w-3.5" /></button>
            <button type="button" aria-label={mobileNavOpen ? 'Close navigation' : 'Open navigation'} aria-expanded={mobileNavOpen} onClick={() => setMobileNavOpen((open) => !open)} className="rounded-md border border-[var(--border-subtle)] p-2 text-[var(--text-secondary)] transition-colors hover:border-orange-500/40 hover:text-[var(--text-primary)] lg:hidden">{mobileNavOpen ? <X className="h-4 w-4" /> : <Menu className="h-4 w-4" />}</button>
          </div>
        </div>

        {mobileNavOpen && <nav className="border-t border-[var(--border-subtle)] bg-[var(--bg-secondary)] px-4 py-3 lg:hidden" aria-label="Mobile landing page navigation"><div className="mx-auto flex max-w-7xl flex-col gap-1">{NAV_ITEMS.map((item) => <a key={item.label} href={item.href} onClick={() => setMobileNavOpen(false)} className="rounded-md px-3 py-2.5 text-sm font-medium text-[var(--text-secondary)] hover:bg-[var(--bg-card-hover)] hover:text-[var(--text-primary)]">{item.label}</a>)}<button type="button" onClick={() => { setMobileNavOpen(false); primaryAction(); }} className="mt-2 inline-flex items-center justify-center gap-2 rounded-md bg-orange-500 px-4 py-2.5 text-sm font-semibold text-white">{primaryLabel} <ArrowRight className="h-4 w-4" /></button></div></nav>}
      </header>

      <main id="top">
        <section className="relative overflow-hidden px-4 pb-16 pt-14 sm:px-6 sm:pb-24 sm:pt-20 lg:px-8 lg:pb-28 lg:pt-24">
          <div className="landing-hero-glow absolute left-1/2 top-0 h-[34rem] w-[52rem] -translate-x-1/2 rounded-full opacity-50" />
          <div className="relative mx-auto grid max-w-7xl items-center gap-12 lg:grid-cols-[0.92fr_1.08fr] lg:gap-16">
            <div>
              <div className="mb-6 inline-flex items-center gap-2 rounded-full border border-orange-500/30 bg-orange-500/10 px-3 py-1.5 text-[10px] font-semibold uppercase tracking-[0.16em] text-orange-600 dark:text-orange-300"><span className="h-1.5 w-1.5 rounded-full bg-orange-500" />Energy supply-chain intelligence</div>
              <h1 className="max-w-2xl text-4xl font-bold leading-[1.05] tracking-[-0.04em] sm:text-6xl lg:text-[4.35rem]">See the event.<br /><span className="landing-gradient-text">Understand the risk.</span></h1>
              <p className="mt-6 max-w-xl text-base leading-8 text-[var(--text-secondary)] sm:text-lg">ORBIT turns geopolitical developments into traceable energy supply-chain risk assessments and infrastructure impact insights.</p>
              <div className="mt-8 flex flex-col items-stretch gap-3 sm:flex-row sm:items-center">
                <button id="hero-primary-cta" onClick={primaryAction} type="button" className="inline-flex items-center justify-center gap-2 rounded-md bg-orange-500 px-6 py-3.5 text-sm font-semibold text-white shadow-xl shadow-orange-500/20 transition-all hover:-translate-y-0.5 hover:bg-orange-600 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-orange-500/70 focus-visible:ring-offset-2 focus-visible:ring-offset-[var(--bg-primary)]"><span>{primaryLabel}</span><ArrowRight className="h-4 w-4" /></button>
                <button type="button" onClick={primaryAction} className="inline-flex items-center justify-center gap-2 rounded-md border border-[var(--border-emphasis)] bg-[var(--bg-card)] px-5 py-3.5 text-sm font-semibold text-[var(--text-primary)] transition-all hover:-translate-y-0.5 hover:border-orange-500/50 hover:bg-[var(--bg-card-hover)]"><Lock className="h-4 w-4 text-emerald-500" />Secure operator access</button>
              </div>
              <div className="mt-8 flex flex-wrap gap-x-5 gap-y-3 border-t border-[var(--border-subtle)] pt-5">{SIGNALS.map(({ icon: Icon, label }) => <div key={label} className="flex items-center gap-2 text-xs font-medium text-[var(--text-secondary)]"><Icon className="h-3.5 w-3.5 text-orange-500" />{label}</div>)}</div>
            </div>
            <NetworkVisual />
          </div>
        </section>

        <section id="capabilities" className="border-y border-[var(--border-subtle)] bg-[var(--bg-surface)] px-4 py-16 sm:px-6 lg:px-8 lg:py-20"><div className="mx-auto max-w-7xl"><div className="flex flex-col justify-between gap-5 sm:flex-row sm:items-end"><div className="max-w-2xl"><p className="text-[10px] font-semibold uppercase tracking-[0.2em] text-orange-600 dark:text-orange-300">Operational clarity</p><h2 className="mt-3 text-3xl font-bold tracking-tight sm:text-4xl">From signal to response, in context.</h2></div><p className="max-w-md text-sm leading-7 text-[var(--text-secondary)] sm:text-right">A focused operating surface for understanding how geopolitical pressure can touch the energy network.</p></div><div className="mt-10 grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">{FEATURES.map(({ icon: Icon, number, title, description }) => <article key={title} className="landing-card group rounded-xl border border-[var(--border-subtle)] bg-[var(--bg-card)] p-5 transition-all hover:-translate-y-1 hover:border-orange-500/40 hover:shadow-xl hover:shadow-orange-950/10 sm:p-6"><div className="flex items-center justify-between"><div className="flex h-10 w-10 items-center justify-center rounded-lg border border-orange-500/20 bg-orange-500/10 text-orange-600 dark:text-orange-300"><Icon className="h-5 w-5" /></div><span className="font-mono text-[10px] tracking-[0.2em] text-[var(--text-muted)]">{number}</span></div><h3 className="mt-6 text-base font-semibold leading-snug">{title}</h3><p className="mt-2 text-sm leading-6 text-[var(--text-secondary)]">{description}</p></article>)}</div></div></section>

        <section id="why-orbit" className="px-4 py-16 sm:px-6 lg:px-8 lg:py-24"><div className="mx-auto grid max-w-7xl gap-12 lg:grid-cols-[0.8fr_1.2fr] lg:gap-20"><div><p className="text-[10px] font-semibold uppercase tracking-[0.2em] text-orange-600 dark:text-orange-300">Why ORBIT</p><h2 className="mt-3 text-3xl font-bold tracking-tight sm:text-4xl">From global events to operational advantage.</h2><p className="mt-5 max-w-lg text-base leading-8 text-[var(--text-secondary)]">ORBIT brings the evidence, relevance, and network context of an assessment into one place—so an operator can see what changed and why it matters.</p><a href="#workflow" className="mt-7 inline-flex items-center gap-2 text-sm font-semibold text-orange-600 transition-colors hover:text-orange-500 dark:text-orange-300">Explore the operating model <ArrowRight className="h-4 w-4" /></a></div><div className="grid gap-3 sm:grid-cols-2">{PRINCIPLES.map(({ icon: Icon, title, description }) => <div key={title} className="rounded-xl border border-[var(--border-subtle)] bg-[var(--bg-card)] p-5"><Icon className="h-5 w-5 text-orange-500" /><h3 className="mt-5 text-base font-semibold">{title}</h3><p className="mt-2 text-sm leading-6 text-[var(--text-secondary)]">{description}</p></div>)}</div></div></section>

        <section id="workflow" className="border-y border-[var(--border-subtle)] bg-[var(--bg-surface)] px-4 py-16 sm:px-6 lg:px-8 lg:py-20">
          <div className="mx-auto max-w-7xl">
            <div className="max-w-2xl">
              <p className="text-[10px] font-semibold uppercase tracking-[0.2em] text-orange-600 dark:text-orange-300">How ORBIT works</p>
              <h2 className="mt-3 text-3xl font-bold tracking-tight sm:text-4xl">A traceable path from signal to decision.</h2>
            </div>

            <div className="mt-12 flex flex-col gap-3 lg:flex-row lg:flex-nowrap lg:items-stretch lg:gap-3">
              {WORKFLOW.map(({ number, icon: Icon, title, description }, index) => (
                <React.Fragment key={title}>
                  <article className="flex min-w-0 flex-1 flex-col rounded-xl border border-[var(--border-subtle)] bg-[var(--bg-card)] p-5">
                    <div className="flex items-center justify-between">
                      <span className="font-mono text-xs font-semibold tracking-[0.2em] text-orange-500">{number}</span>
                      <Icon className="h-5 w-5 text-[var(--text-secondary)]" aria-hidden="true" />
                    </div>
                    <h3 className="mt-8 text-lg font-semibold">{title}</h3>
                    <p className="mt-2 text-sm leading-6 text-[var(--text-secondary)]">{description}</p>
                  </article>

                  {index < WORKFLOW.length - 1 && (
                    <div className="flex shrink-0 items-center justify-center text-orange-500 lg:w-5" aria-hidden="true">
                      <ArrowDown className="h-4 w-4 lg:hidden" />
                      <ArrowRight className="hidden h-4 w-4 lg:block" />
                    </div>
                  )}
                </React.Fragment>
              ))}
            </div>
          </div>
        </section>

        <section id="security" className="px-4 py-16 sm:px-6 lg:px-8 lg:py-20"><div className="mx-auto grid max-w-7xl items-center gap-8 rounded-2xl border border-[var(--border-subtle)] bg-[var(--bg-card)] p-7 sm:p-10 lg:grid-cols-[1fr_auto]"><div className="flex gap-4"><div className="hidden h-11 w-11 shrink-0 items-center justify-center rounded-lg border border-emerald-500/20 bg-emerald-500/10 text-emerald-600 dark:text-emerald-300 sm:flex"><ShieldCheck className="h-5 w-5" /></div><div><p className="text-[10px] font-semibold uppercase tracking-[0.2em] text-emerald-600 dark:text-emerald-300">Secure operator access</p><h2 className="mt-2 text-2xl font-bold tracking-tight sm:text-3xl">Built for accountable operations.</h2><p className="mt-3 max-w-2xl text-sm leading-7 text-[var(--text-secondary)]">Sign in to work with ORBIT's source-backed intelligence, Digital Twin context, deterministic scenarios, and operational response tools.</p></div></div><button type="button" onClick={primaryAction} className="inline-flex w-full items-center justify-center gap-2 rounded-md bg-orange-500 px-5 py-3 text-sm font-semibold text-white transition-colors hover:bg-orange-600 sm:w-auto">{primaryLabel} <ArrowRight className="h-4 w-4" /></button></div></section>

        <section id="resources" className="border-t border-[var(--border-subtle)] bg-[var(--bg-secondary)] px-4 py-10 sm:px-6 lg:px-8"><div className="mx-auto flex max-w-7xl flex-col items-start justify-between gap-6 sm:flex-row sm:items-center"><div><div className="flex items-center gap-2 text-sm font-semibold"><Boxes className="h-4 w-4 text-orange-500" /> ORBIT operating surface</div><p className="mt-2 text-sm text-[var(--text-secondary)]">Event intelligence, network context, scenarios, procurement, and reserves.</p></div><div className="flex flex-wrap gap-x-5 gap-y-2 text-xs text-[var(--text-secondary)]"><a href="#capabilities" className="hover:text-[var(--text-primary)]">Capabilities</a><a href="#workflow" className="hover:text-[var(--text-primary)]">Platform</a><a href="#security" className="hover:text-[var(--text-primary)]">Security</a></div></div></section>
      </main>

      <footer className="border-t border-[var(--border-subtle)] bg-[var(--bg-surface)] px-4 py-7 text-sm text-[var(--text-muted)] sm:px-6 lg:px-8"><div className="mx-auto flex max-w-7xl flex-col items-start justify-between gap-3 sm:flex-row sm:items-center"><div className="flex items-center gap-2"><div className="h-2 w-2 rounded-full bg-orange-500" /><span className="font-semibold text-[var(--text-primary)]">ORBIT</span><span>Energy supply-chain intelligence</span></div><span>Source-backed insight · Secure operator access</span></div></footer>
    </div>
  );
};
