import React, { useEffect, useRef, useState } from 'react';
import {
  Activity,
  AlertTriangle,
  ArrowDown,
  ArrowRight,
  BarChart3,
  Boxes,
  ChevronRight,
  Compass,
  Database,
  Fuel,
  GitBranch,
  Globe2,
  Lock,
  Menu,
  Network,
  Radar,
  ShieldCheck,
  Target,
  X,
} from 'lucide-react';

interface LandingPageProps {
  onNavigateToAuth: () => void;
  onNavigateToApp: () => void;
  isAuthenticated: boolean;
}

const NAV_ITEMS = [
  { label: 'Why ORBIT', href: '#why-orbit' },
  { label: 'Capabilities', href: '#capabilities' },
  { label: 'Use Cases', href: '#use-cases' },
  { label: 'Platform', href: '#workflow' },
  { label: 'Security', href: '#security' },
  { label: 'Resources', href: '#resources' },
];

const SIGNALS = [
  { icon: Database, label: 'Source traceability' },
  { icon: Network, label: 'Digital Twin mapping' },
  { icon: GitBranch, label: 'deterministic scenarios' },
  { icon: ShieldCheck, label: 'Strategic reserve optimization' },
];

// Section 2: What ORBIT actually does (4 cards)
const CORE_PILLARS = [
  {
    number: '01',
    step: 'DETECT',
    title: 'Monitor geopolitical events',
    description: 'Monitor geopolitical and supply-chain events from source-backed intelligence.',
    icon: Radar,
    badgeColor: 'border-orange-500/20 bg-orange-500/10 text-orange-400',
  },
  {
    number: '02',
    step: 'UNDERSTAND',
    title: 'Assess risk & exposure',
    description: 'Assess how an event affects crude flows, suppliers, chokepoints, infrastructure, and energy exposure.',
    icon: Activity,
    badgeColor: 'border-amber-500/20 bg-amber-500/10 text-amber-400',
  },
  {
    number: '03',
    step: 'MAP',
    title: 'Trace digital twin impact',
    description: "Trace the impact across ORBIT's digital twin of the energy network.",
    icon: Network,
    badgeColor: 'border-cyan-500/20 bg-cyan-500/10 text-cyan-400',
  },
  {
    number: '04',
    step: 'RESPOND',
    title: 'Test operational responses',
    description: 'Test procurement, scenario, and strategic reserve responses using deterministic operational models.',
    icon: ShieldCheck,
    badgeColor: 'border-emerald-500/20 bg-emerald-500/10 text-emerald-400',
  },
];

// Section 3: The 6 Core Capabilities
const CAPABILITIES = [
  {
    icon: Radar,
    title: 'Geopolitical Risk Intelligence',
    description: 'Turns geopolitical developments into structured, traceable energy-supply risk assessments with source provenance.',
  },
  {
    icon: Network,
    title: 'Digital Twin Network',
    description: 'Maps suppliers, ports, refineries, pipelines, chokepoints, and other energy infrastructure to understand network exposure.',
  },
  {
    icon: GitBranch,
    title: 'Scenario Modelling',
    description: 'Simulates disruptions and tests how different operational assumptions affect the energy system under stress.',
  },
  {
    icon: Compass,
    title: 'Procurement Intelligence',
    description: 'Evaluates alternative supplier capacity, import routes, and emergency procurement options during supply disruptions.',
  },
  {
    icon: ShieldCheck,
    title: 'Strategic Reserve Optimization',
    description: 'Models strategic petroleum reserve drawdown and replenishment while strictly enforcing a minimum safety reserve floor.',
  },
  {
    icon: BarChart3,
    title: 'Executive Response',
    description: 'Brings source-backed intelligence, exposure metrics, and action plans together into an operational decision view for leaders.',
  },
];

// Section 6: What Makes ORBIT Different (3 cards)
const DIFFERENTIATORS = [
  {
    icon: Database,
    title: 'SOURCE-BACKED',
    subtitle: 'Evidence Traceability',
    description: 'Trace the evidence behind an event and its assessment. Every signal is anchored to verified source documents rather than ungrounded assumptions.',
  },
  {
    icon: Network,
    title: 'NETWORK-AWARE',
    subtitle: 'Physical Propagation',
    description: 'Understand how geopolitical events propagate through the energy system. Connect maritime disruptions directly to refinery intake and pipeline throughput.',
  },
  {
    icon: Target,
    title: 'DECISION-READY',
    subtitle: 'Deterministic Models',
    description: 'Evaluate concrete response options through scenarios, procurement, and reserve models that respect physical constraints and reserve floors.',
  },
];

// Section 8: Applied Use Cases
const USE_CASES = [
  {
    icon: Fuel,
    title: 'Maritime Chokepoints',
    tag: 'Flow Disruption',
    description: 'Track flow disruption risks and tanker rerouting across Hormuz, Bab el-Mandeb, and Malacca corridors.',
  },
  {
    icon: Compass,
    title: 'Pipeline Disruptions',
    tag: 'Transit Outage',
    description: 'Model compression outages, gas transit bottlenecks, and alternative intake terminal capacity.',
  },
  {
    icon: ShieldCheck,
    title: 'Strategic Petroleum Reserves',
    tag: 'SPR Optimization',
    description: 'Evaluate SPR buffer days, drawdown requirements, safety reserve floors, and emergency replenishment timelines.',
  },
  {
    icon: GitBranch,
    title: 'Trade Reconfiguration',
    tag: 'Supply Shift',
    description: 'Assess origin shifts, alternative supplier capacity, and contract supply alternatives during supply cutoffs.',
  },
];

// Section 7: 5-step Platform Workflow
const WORKFLOW_STEPS = [
  {
    number: '01',
    phase: 'DETECT',
    icon: Radar,
    title: 'Geopolitical event',
    description: 'Ingest and verify source-backed geopolitical signals and chokepoint alerts.',
  },
  {
    number: '02',
    phase: 'ANALYZE',
    icon: Activity,
    title: 'Risk & relevance',
    description: 'Quantify energy supply-chain relevance, flow vulnerability, and risk severity.',
  },
  {
    number: '03',
    phase: 'MAP',
    icon: Network,
    title: 'Digital Twin infrastructure impact',
    description: 'Trace Digital Twin infrastructure impact across ports, refineries, and pipelines.',
  },
  {
    number: '04',
    phase: 'SIMULATE',
    icon: GitBranch,
    title: 'Scenario options',
    description: 'Model alternative supplier capacity, rerouting timelines, and shortfall gaps.',
  },
  {
    number: '05',
    phase: 'RESPOND',
    icon: ShieldCheck,
    title: 'Reserve decision',
    description: 'Calculate safe SPR release, enforce safety floors, and finalize action plans.',
  },
];

// Hero visual: Concrete workflow simulation
const HeroWorkflowVisual: React.FC = () => (
  <div
    className="relative overflow-hidden rounded-2xl border border-[var(--border-subtle)] bg-[var(--bg-card)] p-5 shadow-2xl shadow-slate-950/20 sm:p-6"
    aria-label="ORBIT Decision Support Workflow"
  >
    <div className="landing-network-grid absolute inset-0 opacity-40" />

    {/* Header bar */}
    <div className="relative mb-5 flex items-center justify-between border-b border-[var(--border-subtle)] pb-3.5">
      <div className="flex items-center gap-2">
        <span className="h-2 w-2 rounded-full bg-orange-500 shadow-[0_0_10px_rgba(249,115,22,0.8)]" />
        <span className="text-[11px] font-semibold uppercase tracking-[0.16em] text-[var(--text-primary)]">
          ORBIT Decision Engine
        </span>
      </div>
      <span className="rounded border border-orange-500/30 bg-orange-500/10 px-2 py-0.5 text-[10px] font-mono font-medium text-orange-400">
        EXAMPLE WORKFLOW
      </span>
    </div>

    {/* Vertical step sequence */}
    <div className="relative flex flex-col gap-3">
      {/* Step 1: Geopolitical event */}
      <div className="group rounded-xl border border-orange-500/30 bg-[var(--bg-surface)] p-3.5 transition-all">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2 text-[10px] font-semibold uppercase tracking-wider text-orange-400">
            <Globe2 className="h-3.5 w-3.5" />
            <span>Geopolitical Event</span>
          </div>
          <span className="text-[10px] font-mono text-[var(--text-muted)]">01 / DETECT</span>
        </div>
        <p className="mt-1.5 text-sm font-semibold text-[var(--text-primary)]">
          "Strait of Hormuz disruption"
        </p>
        <p className="mt-0.5 text-[11px] text-[var(--text-secondary)]">
          Source-backed maritime security alert & tanker transit restriction
        </p>
      </div>

      {/* In-flow connector */}
      <div className="flex items-center justify-center text-orange-500" aria-hidden="true">
        <ArrowDown className="h-4 w-4" />
      </div>

      {/* Step 2: Risk analysis */}
      <div className="rounded-xl border border-amber-500/30 bg-[var(--bg-surface)] p-3.5">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2 text-[10px] font-semibold uppercase tracking-wider text-amber-400">
            <Activity className="h-3.5 w-3.5" />
            <span>Risk Analysis</span>
          </div>
          <span className="rounded bg-rose-500/15 px-1.5 py-0.5 font-mono text-[9px] font-bold text-rose-400 border border-rose-500/30">
            CRUDE EXPOSURE: HIGH
          </span>
        </div>
        <p className="mt-1.5 text-sm font-semibold text-[var(--text-primary)]">
          Supply shortfall: ~1.8M bbl/d at risk
        </p>
        <p className="mt-0.5 text-[11px] text-[var(--text-secondary)]">
          Evaluates import dependence, affected shipping lanes, and supplier shares
        </p>
      </div>

      {/* In-flow connector */}
      <div className="flex items-center justify-center text-orange-500" aria-hidden="true">
        <ArrowDown className="h-4 w-4" />
      </div>

      {/* Step 3: Digital Twin */}
      <div className="rounded-xl border border-cyan-500/30 bg-[var(--bg-surface)] p-3.5">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2 text-[10px] font-semibold uppercase tracking-wider text-cyan-400">
            <Network className="h-3.5 w-3.5" />
            <span>Digital Twin Mapping</span>
          </div>
          <span className="text-[10px] font-mono text-[var(--text-muted)]">03 / MAP</span>
        </div>
        <p className="mt-1.5 text-sm font-semibold text-[var(--text-primary)]">
          Refineries • ports • pipelines • suppliers
        </p>
        <p className="mt-0.5 text-[11px] text-[var(--text-secondary)]">
          Maps West Coast receiving ports, coastal refineries, and connected crude trunklines
        </p>
      </div>

      {/* In-flow connector */}
      <div className="flex items-center justify-center text-orange-500" aria-hidden="true">
        <ArrowDown className="h-4 w-4" />
      </div>

      {/* Step 4: Response */}
      <div className="rounded-xl border border-emerald-500/30 bg-[var(--bg-surface)] p-3.5">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2 text-[10px] font-semibold uppercase tracking-wider text-emerald-400">
            <ShieldCheck className="h-3.5 w-3.5" />
            <span>Deterministic Response</span>
          </div>
          <span className="text-[10px] font-mono text-emerald-400">04 / RESPOND</span>
        </div>
        <p className="mt-1.5 text-sm font-semibold text-[var(--text-primary)]">
          Alternative procurement + reserve strategy
        </p>
        <p className="mt-0.5 text-[11px] text-[var(--text-secondary)]">
          Reroute non-Hormuz spot contracts + optimize safe SPR drawdown floor
        </p>
      </div>
    </div>
  </div>
);

export const LandingPage: React.FC<LandingPageProps> = ({
  onNavigateToAuth,
  onNavigateToApp,
  isAuthenticated,
}) => {
  const [mobileNavOpen, setMobileNavOpen] = useState(false);
  const [activeItem, setActiveItem] = useState<string>('Why ORBIT');
  const isManualScrollRef = useRef<boolean>(false);
  const scrollTimeoutRef = useRef<number | null>(null);

  const primaryAction = isAuthenticated ? onNavigateToApp : onNavigateToAuth;
  const primaryLabel = 'Sign in';

  const scrollToSection = (e: React.MouseEvent<HTMLAnchorElement>, label: string, href: string) => {
    e.preventDefault();
    setActiveItem(label);
    isManualScrollRef.current = true;
    if (scrollTimeoutRef.current) {
      window.clearTimeout(scrollTimeoutRef.current);
    }
    scrollTimeoutRef.current = window.setTimeout(() => {
      isManualScrollRef.current = false;
    }, 900);

    const targetId = href.replace('#', '');
    const element = document.getElementById(targetId);
    if (element) {
      const headerHeight = 72;
      const elementTop = element.getBoundingClientRect().top + window.scrollY;
      window.scrollTo({
        top: Math.max(0, elementTop - headerHeight),
        behavior: 'smooth',
      });
    }
  };

  useEffect(() => {
    const handleScroll = () => {
      if (isManualScrollRef.current) return;

      const headerOffset = 120;
      const sections = NAV_ITEMS.map((item) => {
        const id = item.href.replace('#', '');
        const el = document.getElementById(id);
        if (!el) return null;
        const rect = el.getBoundingClientRect();
        return {
          label: item.label,
          top: rect.top,
          bottom: rect.bottom,
        };
      }).filter(Boolean) as { label: string; top: number; bottom: number }[];

      if (window.scrollY < 250) {
        setActiveItem('Why ORBIT');
        return;
      }

      const current = sections.find(
        (s) => s.top <= headerOffset + 40 && s.bottom >= headerOffset - 40
      );
      if (current) {
        setActiveItem(current.label);
      }
    };

    window.addEventListener('scroll', handleScroll, { passive: true });
    return () => {
      window.removeEventListener('scroll', handleScroll);
      if (scrollTimeoutRef.current) window.clearTimeout(scrollTimeoutRef.current);
    };
  }, []);

  return (
    <div className="landing-page min-h-screen bg-[var(--bg-primary)] text-[var(--text-primary)] selection:bg-orange-500/30">
      {/* Sticky top navigation */}
      <header className="fixed top-0 left-0 right-0 z-50 border-b border-[var(--border-subtle)] bg-[#0d0d0d]/95 shadow-md backdrop-blur-xl">
        <div className="mx-auto flex h-[4.5rem] max-w-7xl items-center justify-between gap-4 px-4 sm:px-6 lg:px-8">
          <a
            href="#top"
            onClick={(e) => scrollToSection(e, 'Why ORBIT', '#top')}
            className="flex items-center gap-3"
            aria-label="ORBIT home"
          >
            <div
              className="flex h-9 w-9 items-center justify-center rounded-md bg-orange-500 shadow-lg shadow-orange-500/20"
              aria-hidden="true"
            >
              <div className="flex h-5 w-5 items-center justify-center rounded-full border-2 border-white">
                <div className="h-1.5 w-1.5 rounded-full bg-white" />
              </div>
            </div>
            <div>
              <span className="block text-xl font-bold tracking-tight">ORBIT</span>
              <span className="hidden text-[9px] font-semibold uppercase tracking-[0.2em] text-[var(--text-muted)] sm:block">
                Energy intelligence
              </span>
            </div>
          </a>

          <nav className="hidden items-center gap-1.5 lg:flex" aria-label="Landing page navigation">
            {NAV_ITEMS.map((item) => {
              const isActive = activeItem === item.label;
              return (
                <a
                  key={item.label}
                  href={item.href}
                  onClick={(e) => scrollToSection(e, item.label, item.href)}
                  className={`rounded-md px-3.5 py-1.5 text-sm font-semibold transition-all duration-150 ${
                    isActive
                      ? 'bg-neutral-800/90 text-white shadow-sm ring-1 ring-neutral-700/60'
                      : 'text-neutral-300 hover:bg-neutral-800/40 hover:text-white'
                  }`}
                >
                  {item.label}
                </a>
              );
            })}
          </nav>

          <div className="flex items-center gap-2 sm:gap-3">
            <button
              id="landing-signin-button"
              onClick={primaryAction}
              type="button"
              className="hidden items-center gap-2 rounded-md bg-orange-500 px-4 py-2.5 text-xs font-semibold text-white shadow-lg shadow-orange-500/15 transition-all hover:bg-orange-600 hover:shadow-orange-500/25 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-orange-500/70 focus-visible:ring-offset-2 focus-visible:ring-offset-[var(--bg-primary)] sm:inline-flex"
            >
              <span>SIGN IN</span>
              <ArrowRight className="h-3.5 w-3.5" />
            </button>
            <button
              type="button"
              aria-label={mobileNavOpen ? 'Close navigation' : 'Open navigation'}
              aria-expanded={mobileNavOpen}
              onClick={() => setMobileNavOpen((open) => !open)}
              className="rounded-md border border-[var(--border-subtle)] p-2 text-[var(--text-secondary)] transition-colors hover:border-orange-500/40 hover:text-[var(--text-primary)] lg:hidden"
            >
              {mobileNavOpen ? <X className="h-4 w-4" /> : <Menu className="h-4 w-4" />}
            </button>
          </div>
        </div>

        {mobileNavOpen && (
          <nav
            className="border-t border-[var(--border-subtle)] bg-[var(--bg-secondary)] px-4 py-3 lg:hidden"
            aria-label="Mobile landing page navigation"
          >
            <div className="mx-auto flex max-w-7xl flex-col gap-1">
              {NAV_ITEMS.map((item) => {
                const isActive = activeItem === item.label;
                return (
                  <a
                    key={item.label}
                    href={item.href}
                    onClick={(e) => {
                      scrollToSection(e, item.label, item.href);
                      setMobileNavOpen(false);
                    }}
                    className={`rounded-md px-3 py-2.5 text-sm font-semibold transition-all ${
                      isActive
                        ? 'bg-neutral-800 text-white'
                        : 'text-neutral-300 hover:bg-neutral-800/50 hover:text-white'
                    }`}
                  >
                    {item.label}
                  </a>
                );
              })}
              <button
                type="button"
                onClick={() => {
                  setMobileNavOpen(false);
                  primaryAction();
                }}
                className="mt-2 inline-flex items-center justify-center gap-2 rounded-md bg-orange-500 px-4 py-2.5 text-sm font-semibold text-white"
              >
                {primaryLabel} <ArrowRight className="h-4 w-4" />
              </button>
            </div>
          </nav>
        )}
      </header>

      <main id="top" className="pt-[4.5rem] scroll-mt-20">
        {/* ==================================================
            SECTION 1 — HERO
            ================================================== */}
        <section className="relative overflow-hidden px-4 pb-16 pt-12 sm:px-6 sm:pb-24 sm:pt-16 lg:px-8 lg:pb-24 lg:pt-20">
          <div className="landing-hero-glow absolute left-1/2 top-0 h-[34rem] w-[52rem] -translate-x-1/2 rounded-full opacity-50" />
          <div className="relative mx-auto grid max-w-7xl items-center gap-12 lg:grid-cols-[1fr_1fr] lg:gap-14">
            <div>
              <div className="mb-5 inline-flex items-center gap-2 rounded-full border border-orange-500/30 bg-orange-500/10 px-3 py-1.5 text-[10px] font-semibold uppercase tracking-[0.16em] text-orange-600 dark:text-orange-300">
                <span className="h-1.5 w-1.5 rounded-full bg-orange-500" />
                Energy supply-chain intelligence & decision support
              </div>
              <h1 className="max-w-2xl text-4xl font-bold leading-[1.08] tracking-[-0.03em] sm:text-5xl lg:text-[3.75rem]">
                From geopolitical events to{' '}
                <span className="landing-gradient-text">energy decisions.</span>
              </h1>
              <p className="mt-5 max-w-xl text-base leading-8 text-[var(--text-secondary)] sm:text-lg">
                ORBIT analyzes how global disruptions can affect India's energy supply chain, maps the
                infrastructure and supply exposure, and evaluates response options before a crisis becomes
                an operational problem.
              </p>

              {/* CTAs */}
              <div className="mt-8 flex flex-col items-stretch gap-3 sm:flex-row sm:items-center">
                <a
                  id="hero-primary-cta"
                  href="#why-orbit"
                  onClick={(e) => scrollToSection(e, 'Why ORBIT', '#why-orbit')}
                  className="inline-flex items-center justify-center gap-2 rounded-md bg-orange-500 px-6 py-3.5 text-sm font-semibold text-white shadow-xl shadow-orange-500/20 transition-all hover:-translate-y-0.5 hover:bg-orange-600 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-orange-500/70 focus-visible:ring-offset-2 focus-visible:ring-offset-[var(--bg-primary)]"
                >
                  <span>Explore ORBIT</span>
                  <ArrowRight className="h-4 w-4" />
                </a>
                <button
                  type="button"
                  onClick={primaryAction}
                  className="inline-flex items-center justify-center gap-2 rounded-md border border-[var(--border-emphasis)] bg-[var(--bg-card)] px-5 py-3.5 text-sm font-semibold text-[var(--text-primary)] transition-all hover:-translate-y-0.5 hover:border-orange-500/50 hover:bg-[var(--bg-card-hover)]"
                >
                  <Lock className="h-4 w-4 text-emerald-500" />
                  <span>Sign in to operator console</span>
                </button>
              </div>

              {/* Core signals */}
              <div className="mt-8 flex flex-wrap gap-x-5 gap-y-3 border-t border-[var(--border-subtle)] pt-5">
                {SIGNALS.map(({ icon: Icon, label }) => (
                  <div
                    key={label}
                    className="flex items-center gap-2 text-xs font-medium text-[var(--text-secondary)]"
                  >
                    <Icon className="h-3.5 w-3.5 text-orange-500" />
                    <span>{label}</span>
                  </div>
                ))}
              </div>
            </div>

            {/* Compact workflow simulation */}
            <HeroWorkflowVisual />
          </div>
        </section>

        {/* ==================================================
            SECTION 2 — WHAT ORBIT ACTUALLY DOES (#why-orbit)
            ================================================== */}
        <section id="why-orbit" className="scroll-mt-24 border-y border-[var(--border-subtle)] bg-[var(--bg-surface)] px-4 py-16 sm:px-6 lg:px-8 lg:py-24">
          <div className="mx-auto max-w-7xl">
            <div className="max-w-3xl">
              <p className="text-[10px] font-semibold uppercase tracking-[0.2em] text-orange-600 dark:text-orange-300">
                Why ORBIT
              </p>
              <h2 className="mt-3 text-3xl font-bold tracking-tight sm:text-4xl">
                One system from event detection to response.
              </h2>
              <p className="mt-4 text-base leading-8 text-[var(--text-secondary)] sm:text-lg">
                ORBIT connects geopolitical intelligence with the physical energy network, allowing
                operators to understand what changed, where the exposure sits, and what response options
                are available.
              </p>
            </div>

            {/* 4 Core Pillars: 01 DETECT, 02 UNDERSTAND, 03 MAP, 04 RESPOND */}
            <div className="mt-12 grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
              {CORE_PILLARS.map(({ number, step, title, description, icon: Icon, badgeColor }) => (
                <article
                  key={number}
                  className="group rounded-xl border border-[var(--border-subtle)] bg-[var(--bg-card)] p-6 transition-all hover:border-orange-500/40 hover:shadow-xl hover:shadow-orange-950/10"
                >
                  <div className="flex items-center justify-between">
                    <span className="font-mono text-xs font-bold tracking-[0.2em] text-orange-500">
                      {number} — {step}
                    </span>
                    <div className={`flex h-9 w-9 items-center justify-center rounded-lg border ${badgeColor}`}>
                      <Icon className="h-4 w-4" />
                    </div>
                  </div>
                  <h3 className="mt-5 text-lg font-semibold text-[var(--text-primary)]">{title}</h3>
                  <p className="mt-2 text-sm leading-6 text-[var(--text-secondary)]">{description}</p>
                </article>
              ))}
            </div>
          </div>
        </section>

        {/* ==================================================
            SECTION 3 — SHOW THE ACTUAL ORBIT CAPABILITIES (#capabilities)
            ================================================== */}
        <section id="capabilities" className="scroll-mt-24 px-4 py-16 sm:px-6 lg:px-8 lg:py-24">
          <div className="mx-auto max-w-7xl">
            <div className="flex flex-col justify-between gap-5 sm:flex-row sm:items-end">
              <div className="max-w-2xl">
                <p className="text-[10px] font-semibold uppercase tracking-[0.2em] text-orange-600 dark:text-orange-300">
                  Platform capabilities
                </p>
                <h2 className="mt-3 text-3xl font-bold tracking-tight sm:text-4xl">
                  Built for the decisions that matter during an energy disruption.
                </h2>
              </div>
              <p className="max-w-md text-sm leading-7 text-[var(--text-secondary)] sm:text-right">
                Six integrated intelligence layers designed to transform complex geopolitical signals into
                accountable operational decisions.
              </p>
            </div>

            {/* 6 Capabilities Cards */}
            <div className="mt-12 grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-3">
              {CAPABILITIES.map(({ icon: Icon, title, description }) => (
                <article
                  key={title}
                  className="rounded-xl border border-[var(--border-subtle)] bg-[var(--bg-card)] p-6 transition-all hover:border-orange-500/40"
                >
                  <div className="flex h-11 w-11 items-center justify-center rounded-lg border border-orange-500/20 bg-orange-500/10 text-orange-600 dark:text-orange-400">
                    <Icon className="h-5 w-5" />
                  </div>
                  <h3 className="mt-5 text-base font-semibold text-[var(--text-primary)]">{title}</h3>
                  <p className="mt-2.5 text-sm leading-6 text-[var(--text-secondary)]">{description}</p>
                </article>
              ))}
            </div>
          </div>
        </section>

        {/* ==================================================
            SECTION 4 — MAKE THE DIGITAL TWIN UNDERSTANDABLE
            ================================================== */}
        <section className="scroll-mt-24 border-y border-[var(--border-subtle)] bg-[var(--bg-surface)] px-4 py-16 sm:px-6 lg:px-8 lg:py-24">
          <div className="mx-auto max-w-7xl">
            <div className="grid gap-12 lg:grid-cols-[1.1fr_0.9fr] lg:items-center">
              <div>
                <p className="text-[10px] font-semibold uppercase tracking-[0.2em] text-orange-600 dark:text-orange-300">
                  Network context
                </p>
                <h2 className="mt-3 text-3xl font-bold tracking-tight sm:text-4xl">
                  See the energy network behind the event.
                </h2>
                <p className="mt-5 text-base leading-8 text-[var(--text-secondary)]">
                  When a geopolitical disruption occurs, ORBIT does not stop at the headline. Its Digital
                  Twin connects the event to suppliers, trade routes, infrastructure, refineries,
                  chokepoints, and other network dependencies so operators can see where the disruption can
                  propagate.
                </p>

                <div className="mt-8 grid grid-cols-2 gap-4">
                  <div className="rounded-lg border border-[var(--border-subtle)] bg-[var(--bg-card)] p-4">
                    <div className="flex items-center gap-2 text-xs font-semibold text-orange-400">
                      <Fuel className="h-4 w-4" />
                      <span>Supply & Routes</span>
                    </div>
                    <p className="mt-2 text-xs leading-5 text-[var(--text-secondary)]">
                      Tracks crude contracts, tanker origins, and chokepoint transit volumes.
                    </p>
                  </div>
                  <div className="rounded-lg border border-[var(--border-subtle)] bg-[var(--bg-card)] p-4">
                    <div className="flex items-center gap-2 text-xs font-semibold text-cyan-400">
                      <Network className="h-4 w-4" />
                      <span>Physical Assets</span>
                    </div>
                    <p className="mt-2 text-xs leading-5 text-[var(--text-secondary)]">
                      Connects deep-water ports, crude pipelines, and inland refinery clusters.
                    </p>
                  </div>
                </div>
              </div>

              {/* Digital Twin Propagation Flow Diagram */}
              <div className="rounded-2xl border border-[var(--border-subtle)] bg-[var(--bg-card)] p-6 shadow-xl">
                <div className="mb-4 flex items-center justify-between border-b border-[var(--border-subtle)] pb-3">
                  <span className="text-xs font-semibold uppercase tracking-wider text-[var(--text-muted)]">
                    Propagation Architecture
                  </span>
                  <span className="flex items-center gap-1.5 text-[11px] font-medium text-emerald-400">
                    <span className="h-1.5 w-1.5 rounded-full bg-emerald-400" />
                    Connected
                  </span>
                </div>

                <div className="flex flex-col gap-2.5">
                  <div className="flex items-center justify-between rounded-lg border border-orange-500/30 bg-[var(--bg-surface)] p-3">
                    <div className="flex items-center gap-3">
                      <Globe2 className="h-4 w-4 text-orange-400" />
                      <div>
                        <span className="block text-xs font-bold uppercase tracking-wider text-orange-400">
                          EVENT
                        </span>
                        <span className="text-xs font-semibold text-[var(--text-primary)]">
                          Strait of Hormuz disruption
                        </span>
                      </div>
                    </div>
                    <span className="font-mono text-[10px] text-[var(--text-muted)]">Signal</span>
                  </div>

                  <div className="flex justify-center text-orange-500/70">
                    <ArrowDown className="h-3.5 w-3.5" />
                  </div>

                  <div className="flex items-center justify-between rounded-lg border border-amber-500/30 bg-[var(--bg-surface)] p-3">
                    <div className="flex items-center gap-3">
                      <Compass className="h-4 w-4 text-amber-400" />
                      <div>
                        <span className="block text-xs font-bold uppercase tracking-wider text-amber-400">
                          SUPPLIERS / TRADE
                        </span>
                        <span className="text-xs font-semibold text-[var(--text-primary)]">
                          Crude import exposure
                        </span>
                      </div>
                    </div>
                    <span className="font-mono text-[10px] text-[var(--text-muted)]">Origins</span>
                  </div>

                  <div className="flex justify-center text-orange-500/70">
                    <ArrowDown className="h-3.5 w-3.5" />
                  </div>

                  <div className="flex items-center justify-between rounded-lg border border-cyan-500/30 bg-[var(--bg-surface)] p-3">
                    <div className="flex items-center gap-3">
                      <Network className="h-4 w-4 text-cyan-400" />
                      <div>
                        <span className="block text-xs font-bold uppercase tracking-wider text-cyan-400">
                          INFRASTRUCTURE
                        </span>
                        <span className="text-xs font-semibold text-[var(--text-primary)]">
                          Ports • refineries • pipelines
                        </span>
                      </div>
                    </div>
                    <span className="font-mono text-[10px] text-[var(--text-muted)]">Assets</span>
                  </div>

                  <div className="flex justify-center text-orange-500/70">
                    <ArrowDown className="h-3.5 w-3.5" />
                  </div>

                  <div className="flex items-center justify-between rounded-lg border border-rose-500/30 bg-[var(--bg-surface)] p-3">
                    <div className="flex items-center gap-3">
                      <AlertTriangle className="h-4 w-4 text-rose-400" />
                      <div>
                        <span className="block text-xs font-bold uppercase tracking-wider text-rose-400">
                          IMPACT
                        </span>
                        <span className="text-xs font-semibold text-[var(--text-primary)]">
                          Supply-chain exposure
                        </span>
                      </div>
                    </div>
                    <span className="font-mono text-[10px] text-[var(--text-muted)]">Deficit</span>
                  </div>

                  <div className="flex justify-center text-orange-500/70">
                    <ArrowDown className="h-3.5 w-3.5" />
                  </div>

                  <div className="flex items-center justify-between rounded-lg border border-emerald-500/30 bg-[var(--bg-surface)] p-3">
                    <div className="flex items-center gap-3">
                      <ShieldCheck className="h-4 w-4 text-emerald-400" />
                      <div>
                        <span className="block text-xs font-bold uppercase tracking-wider text-emerald-400">
                          RESPONSE
                        </span>
                        <span className="text-xs font-semibold text-[var(--text-primary)]">
                          Procurement • scenarios • reserves
                        </span>
                      </div>
                    </div>
                    <span className="font-mono text-[10px] text-[var(--text-muted)]">Action</span>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* ==================================================
            SECTION 5 — SHOW THE STRATEGIC RESERVE FEATURE
            ================================================== */}
        <section className="scroll-mt-24 px-4 py-16 sm:px-6 lg:px-8 lg:py-24">
          <div className="mx-auto max-w-7xl">
            <div className="grid gap-12 lg:grid-cols-[1fr_1fr] lg:items-center">
              {/* Strategic reserve conceptual flow */}
              <div className="rounded-2xl border border-[var(--border-subtle)] bg-[var(--bg-card)] p-6 shadow-xl">
                <div className="mb-4 flex items-center justify-between border-b border-[var(--border-subtle)] pb-3">
                  <span className="text-xs font-semibold uppercase tracking-wider text-[var(--text-muted)]">
                    Strategic Reserve Evaluation Model
                  </span>
                  <span className="rounded bg-emerald-500/10 px-2 py-0.5 text-[10px] font-mono font-semibold text-emerald-400 border border-emerald-500/20">
                    DETERMINISTIC
                  </span>
                </div>

                <div className="space-y-3">
                  <div className="rounded-lg border border-rose-500/20 bg-[var(--bg-surface)] p-3">
                    <div className="flex items-center justify-between text-xs font-semibold">
                      <span className="text-rose-400">01. DISRUPTION</span>
                      <span className="text-[var(--text-muted)]">Gross Demand Gap</span>
                    </div>
                    <p className="mt-1 text-sm font-semibold text-[var(--text-primary)]">Supply shortfall</p>
                    <p className="text-xs text-[var(--text-secondary)]">Volume cut off by chokepoint transit halt</p>
                  </div>

                  <div className="flex justify-center text-orange-500/70">
                    <ArrowDown className="h-3 w-3" />
                  </div>

                  <div className="rounded-lg border border-cyan-500/20 bg-[var(--bg-surface)] p-3">
                    <div className="flex items-center justify-between text-xs font-semibold">
                      <span className="text-cyan-400">02. ALTERNATIVE PROCUREMENT</span>
                      <span className="text-[var(--text-muted)]">Spot & Diversion</span>
                    </div>
                    <p className="mt-1 text-sm font-semibold text-[var(--text-primary)]">Available replacement supply</p>
                    <p className="text-xs text-[var(--text-secondary)]">Replacement crude from unaffected trade partners</p>
                  </div>

                  <div className="flex justify-center text-orange-500/70">
                    <ArrowDown className="h-3 w-3" />
                  </div>

                  <div className="rounded-lg border border-amber-500/20 bg-[var(--bg-surface)] p-3">
                    <div className="flex items-center justify-between text-xs font-semibold">
                      <span className="text-amber-400">03. RESERVE DRAWDOWN</span>
                      <span className="text-[var(--text-muted)]">Required Rate</span>
                    </div>
                    <p className="mt-1 text-sm font-semibold text-[var(--text-primary)]">How much reserve is required?</p>
                    <p className="text-xs text-[var(--text-secondary)]">Calculates net daily buffer draw over disruption window</p>
                  </div>

                  <div className="flex justify-center text-orange-500/70">
                    <ArrowDown className="h-3 w-3" />
                  </div>

                  <div className="rounded-lg border border-emerald-500/20 bg-[var(--bg-surface)] p-3">
                    <div className="flex items-center justify-between text-xs font-semibold">
                      <span className="text-emerald-400">04. SAFETY FLOOR</span>
                      <span className="text-[var(--text-muted)]">Constraint</span>
                    </div>
                    <p className="mt-1 text-sm font-semibold text-[var(--text-primary)]">Never breach the minimum reserve</p>
                    <p className="text-xs text-[var(--text-secondary)]">Preserves critical national defense and baseline buffer capacity</p>
                  </div>

                  <div className="flex justify-center text-orange-500/70">
                    <ArrowDown className="h-3 w-3" />
                  </div>

                  <div className="rounded-lg border border-orange-500/30 bg-orange-500/10 p-3">
                    <div className="flex items-center justify-between text-xs font-semibold">
                      <span className="text-orange-400">05. RESULT</span>
                      <span className="text-orange-400">Output Decision</span>
                    </div>
                    <p className="mt-1 text-sm font-semibold text-[var(--text-primary)]">Safe release / shortfall / replenishment requirement</p>
                    <p className="text-xs text-[var(--text-secondary)]">Defines exact release volume and required post-crisis restocking timeline</p>
                  </div>
                </div>
              </div>

              <div>
                <p className="text-[10px] font-semibold uppercase tracking-[0.2em] text-orange-600 dark:text-orange-300">
                  Strategic Reserve Intelligence
                </p>
                <h2 className="mt-3 text-3xl font-bold tracking-tight sm:text-4xl">
                  Test how much reserve can safely be released.
                </h2>
                <p className="mt-5 text-base leading-8 text-[var(--text-secondary)]">
                  ORBIT models India's strategic petroleum reserve as an operational system. Operators can
                  evaluate disruption scenarios, calculate reserve drawdown requirements, account for
                  alternative procurement, and enforce a minimum reserve floor.
                </p>
                <p className="mt-4 text-base leading-8 text-[var(--text-secondary)]">
                  Rather than making speculative draw decisions, teams can test various outage durations,
                  monitor SPR buffer days, and verify replenishment feasibility under real supply constraints.
                </p>
              </div>
            </div>
          </div>
        </section>

        {/* ==================================================
            SECTION 6 — EXPLAIN WHAT MAKES ORBIT DIFFERENT
            ================================================== */}
        <section className="scroll-mt-24 border-y border-[var(--border-subtle)] bg-[var(--bg-surface)] px-4 py-16 sm:px-6 lg:px-8 lg:py-24">
          <div className="mx-auto max-w-7xl">
            <div className="max-w-3xl">
              <p className="text-[10px] font-semibold uppercase tracking-[0.2em] text-orange-600 dark:text-orange-300">
                Core differentiation
              </p>
              <h2 className="mt-3 text-3xl font-bold tracking-tight sm:text-4xl">
                Not just intelligence. A path to action.
              </h2>
              <p className="mt-4 text-base leading-8 text-[var(--text-secondary)] sm:text-lg">
                ORBIT combines source-backed intelligence with deterministic operational models. Instead
                of stopping at "this event is risky," ORBIT helps answer "what does it affect, how severe
                is the exposure, and what can we do about it?"
              </p>
            </div>

            <div className="mt-12 grid grid-cols-1 gap-6 md:grid-cols-3">
              {DIFFERENTIATORS.map(({ icon: Icon, title, subtitle, description }) => (
                <div
                  key={title}
                  className="rounded-xl border border-[var(--border-subtle)] bg-[var(--bg-card)] p-6 transition-all hover:border-orange-500/40"
                >
                  <div className="flex items-center gap-3">
                    <div className="flex h-10 w-10 items-center justify-center rounded-lg border border-orange-500/20 bg-orange-500/10 text-orange-400">
                      <Icon className="h-5 w-5" />
                    </div>
                    <div>
                      <span className="block font-mono text-xs font-bold tracking-[0.16em] text-orange-500">
                        {title}
                      </span>
                      <span className="text-xs text-[var(--text-muted)]">{subtitle}</span>
                    </div>
                  </div>
                  <p className="mt-5 text-sm leading-6 text-[var(--text-secondary)]">{description}</p>
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* ==================================================
            SECTION 7 — USE CASES / DECISION WALKTHROUGH (#use-cases)
            ================================================== */}
        <section id="use-cases" className="scroll-mt-24 px-4 py-16 sm:px-6 lg:px-8 lg:py-24">
          <div className="mx-auto max-w-7xl">
            <div className="max-w-3xl">
              <p className="text-[10px] font-semibold uppercase tracking-[0.2em] text-orange-600 dark:text-orange-300">
                Operational decisions
              </p>
              <h2 className="mt-3 text-3xl font-bold tracking-tight sm:text-4xl">
                See the decision before making it.
              </h2>
              <p className="mt-4 text-base leading-8 text-[var(--text-secondary)]">
                Suppose a major geopolitical disruption threatens crude flows through a critical
                maritime chokepoint. ORBIT lets an operator move from the event itself to a structured
                response analysis without switching between disconnected tools.
              </p>
            </div>

            {/* Decision Walkthrough Pipeline Strip */}
            <div className="mt-10 overflow-x-auto pb-4">
              <div className="flex min-w-[720px] items-center justify-between rounded-xl border border-[var(--border-subtle)] bg-[var(--bg-card)] p-4">
                <div className="text-center">
                  <span className="block font-mono text-[10px] uppercase text-orange-400">STEP 1</span>
                  <span className="text-xs font-bold text-[var(--text-primary)]">EVENT</span>
                </div>
                <ChevronRight className="h-4 w-4 text-[var(--text-muted)]" />
                <div className="text-center">
                  <span className="block font-mono text-[10px] uppercase text-amber-400">STEP 2</span>
                  <span className="text-xs font-bold text-[var(--text-primary)]">RISK</span>
                </div>
                <ChevronRight className="h-4 w-4 text-[var(--text-muted)]" />
                <div className="text-center">
                  <span className="block font-mono text-[10px] uppercase text-cyan-400">STEP 3</span>
                  <span className="text-xs font-bold text-[var(--text-primary)]">NETWORK IMPACT</span>
                </div>
                <ChevronRight className="h-4 w-4 text-[var(--text-muted)]" />
                <div className="text-center">
                  <span className="block font-mono text-[10px] uppercase text-rose-400">STEP 4</span>
                  <span className="text-xs font-bold text-[var(--text-primary)]">SUPPLY GAP</span>
                </div>
                <ChevronRight className="h-4 w-4 text-[var(--text-muted)]" />
                <div className="text-center">
                  <span className="block font-mono text-[10px] uppercase text-sky-400">STEP 5</span>
                  <span className="text-xs font-bold text-[var(--text-primary)]">ALTERNATIVE PROCUREMENT</span>
                </div>
                <ChevronRight className="h-4 w-4 text-[var(--text-muted)]" />
                <div className="text-center">
                  <span className="block font-mono text-[10px] uppercase text-emerald-400">STEP 6</span>
                  <span className="text-xs font-bold text-[var(--text-primary)]">RESERVE RESPONSE</span>
                </div>
              </div>
            </div>

            {/* 4 Use Case Cards */}
            <div className="mt-8 grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
              {USE_CASES.map(({ icon: Icon, title, tag, description }) => (
                <article
                  key={title}
                  className="rounded-xl border border-[var(--border-subtle)] bg-[var(--bg-card)] p-5 transition-all hover:border-orange-500/40"
                >
                  <div className="flex items-center justify-between">
                    <div className="flex h-10 w-10 items-center justify-center rounded-lg border border-orange-500/20 bg-orange-500/10 text-orange-400">
                      <Icon className="h-5 w-5" />
                    </div>
                    <span className="font-mono text-[10px] text-[var(--text-muted)]">{tag}</span>
                  </div>
                  <h3 className="mt-5 text-base font-semibold text-[var(--text-primary)]">{title}</h3>
                  <p className="mt-2 text-sm leading-6 text-[var(--text-secondary)]">{description}</p>
                </article>
              ))}
            </div>
          </div>
        </section>

        {/* ==================================================
            SECTION 8 — SHOW THE END-TO-END ORBIT FLOW (#workflow)
            ================================================== */}
        <section id="workflow" className="scroll-mt-24 border-y border-[var(--border-subtle)] bg-[var(--bg-surface)] px-4 py-16 sm:px-6 lg:px-8 lg:py-24">
          <div className="mx-auto max-w-7xl">
            <div className="max-w-2xl">
              <p className="text-[10px] font-semibold uppercase tracking-[0.2em] text-orange-600 dark:text-orange-300">
                End-to-end platform workflow
              </p>
              <h2 className="mt-3 text-3xl font-bold tracking-tight sm:text-4xl">
                From signal to decision.
              </h2>
              <p className="mt-3 text-base text-[var(--text-secondary)]">
                A traceable path from initial geopolitical event detection to operational execution.
              </p>
            </div>

            {/* In-flow non-wrapping horizontal layout on desktop with in-flow arrow connectors */}
            <div className="mt-12 flex flex-col gap-3 lg:flex-row lg:flex-nowrap lg:items-stretch lg:gap-3">
              {WORKFLOW_STEPS.map(({ number, phase, icon: Icon, title, description }, index) => (
                <React.Fragment key={title}>
                  <article className="flex min-w-0 flex-1 flex-col rounded-xl border border-[var(--border-subtle)] bg-[var(--bg-card)] p-5">
                    <div className="flex items-center justify-between">
                      <span className="font-mono text-xs font-semibold tracking-[0.2em] text-orange-500">
                        {number}
                      </span>
                      <span className="text-[10px] font-mono font-medium text-[var(--text-muted)]">
                        {phase}
                      </span>
                    </div>
                    <div className="mt-4 flex h-9 w-9 items-center justify-center rounded-lg border border-[var(--border-subtle)] bg-[var(--bg-surface)] text-orange-400">
                      <Icon className="h-4 w-4" />
                    </div>
                    <h3 className="mt-5 text-base font-semibold text-[var(--text-primary)]">{title}</h3>
                    <p className="mt-2 text-xs leading-5 text-[var(--text-secondary)]">{description}</p>
                  </article>

                  {index < WORKFLOW_STEPS.length - 1 && (
                    <div
                      className="flex shrink-0 items-center justify-center text-orange-500 lg:w-4"
                      aria-hidden="true"
                    >
                      <ArrowDown className="h-4 w-4 lg:hidden" />
                      <ArrowRight className="hidden h-4 w-4 lg:block" />
                    </div>
                  )}
                </React.Fragment>
              ))}
            </div>
          </div>
        </section>

        {/* ==================================================
            SECTION 9 — SECURITY (#security)
            ================================================== */}
        <section id="security" className="scroll-mt-24 px-4 py-16 sm:px-6 lg:px-8 lg:py-24">
          <div className="mx-auto grid max-w-7xl items-center gap-8 rounded-2xl border border-[var(--border-subtle)] bg-[var(--bg-card)] p-7 sm:p-10 lg:grid-cols-[1fr_auto]">
            <div className="flex gap-4">
              <div className="hidden h-11 w-11 shrink-0 items-center justify-center rounded-lg border border-emerald-500/20 bg-emerald-500/10 text-emerald-600 dark:text-emerald-300 sm:flex">
                <ShieldCheck className="h-5 w-5" />
              </div>
              <div>
                <p className="text-[10px] font-semibold uppercase tracking-[0.2em] text-emerald-600 dark:text-emerald-300">
                  Secure operator access
                </p>
                <h2 className="mt-2 text-2xl font-bold tracking-tight sm:text-3xl">
                  Built for accountable operations.
                </h2>
                <p className="mt-3 max-w-2xl text-sm leading-7 text-[var(--text-secondary)]">
                  Sign in to work with ORBIT's source-backed intelligence, Digital Twin context,
                  deterministic scenarios, and operational response tools.
                </p>
              </div>
            </div>
            <button
              type="button"
              onClick={primaryAction}
              className="inline-flex w-full items-center justify-center gap-2 rounded-md bg-orange-500 px-5 py-3 text-sm font-semibold text-white transition-colors hover:bg-orange-600 sm:w-auto"
            >
              <span>{primaryLabel}</span>
              <ArrowRight className="h-4 w-4" />
            </button>
          </div>
        </section>

        {/* ==================================================
            SECTION 10 — RESOURCES (#resources)
            ================================================== */}
        <section id="resources" className="scroll-mt-24 border-t border-[var(--border-subtle)] bg-[var(--bg-secondary)] px-4 py-10 sm:px-6 lg:px-8">
          <div className="mx-auto flex max-w-7xl flex-col items-start justify-between gap-6 sm:flex-row sm:items-center">
            <div>
              <div className="flex items-center gap-2 text-sm font-semibold">
                <Boxes className="h-4 w-4 text-orange-500" />
                <span>ORBIT operating surface</span>
              </div>
              <p className="mt-2 text-sm text-[var(--text-secondary)]">
                Energy supply-chain intelligence for geopolitical risk, network impact, scenarios,
                procurement, and strategic reserves.
              </p>
            </div>
            <div className="flex flex-wrap gap-x-5 gap-y-2 text-xs text-[var(--text-secondary)]">
              <a
                href="#capabilities"
                onClick={(e) => scrollToSection(e, 'Capabilities', '#capabilities')}
                className="hover:text-[var(--text-primary)]"
              >
                Capabilities
              </a>
              <a
                href="#use-cases"
                onClick={(e) => scrollToSection(e, 'Use Cases', '#use-cases')}
                className="hover:text-[var(--text-primary)]"
              >
                Use Cases
              </a>
              <a
                href="#workflow"
                onClick={(e) => scrollToSection(e, 'Platform', '#workflow')}
                className="hover:text-[var(--text-primary)]"
              >
                Platform
              </a>
              <a
                href="#security"
                onClick={(e) => scrollToSection(e, 'Security', '#security')}
                className="hover:text-[var(--text-primary)]"
              >
                Security
              </a>
            </div>
          </div>
        </section>
      </main>

      {/* Footer */}
      <footer className="border-t border-[var(--border-subtle)] bg-[var(--bg-surface)] px-4 py-7 text-sm text-[var(--text-muted)] sm:px-6 lg:px-8">
        <div className="mx-auto flex max-w-7xl flex-col items-start justify-between gap-3 sm:flex-row sm:items-center">
          <div className="flex items-center gap-2">
            <div className="h-2 w-2 rounded-full bg-orange-500" />
            <span className="font-semibold text-[var(--text-primary)]">ORBIT</span>
            <span>
              Energy supply-chain intelligence for geopolitical risk, network impact, scenarios,
              procurement, and strategic reserves.
            </span>
          </div>
          <span>Source-backed insight · Secure operator access</span>
        </div>
      </footer>
    </div>
  );
};
