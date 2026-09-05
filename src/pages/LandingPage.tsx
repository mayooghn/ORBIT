import React, { useEffect, useRef, useState } from 'react';
import {
  Activity,
  ArrowDown,
  ArrowRight,
  Bot,
  CheckCircle2,
  Database,
  Globe2,
  Lock,
  Menu,
  MessageSquare,
  Network,
  Radio,
  ShieldCheck,
  Target,
  Workflow,
  X,
  Zap,
} from 'lucide-react';
import { OrbitLogo } from '../components/common/OrbitLogo';
import { OrbitLandingBackground } from '../components/landing/OrbitLandingBackground';

interface LandingPageProps {
  onNavigateToAuth: () => void;
  onNavigateToApp: () => void;
  isAuthenticated: boolean;
}

const NAV_ITEMS = [
  { label: 'The Problem', href: '#problem' },
  { label: 'What is ORBIT', href: '#what-is-orbit' },
  { label: 'Risk Intelligence', href: '#risk-intelligence' },
  { label: 'Digital Twin', href: '#digital-twin' },
  { label: 'Reserves', href: '#reserves' },
  { label: 'Orchestrator', href: '#orchestrator' },
  { label: 'Why ORBIT', href: '#why-orbit' },
];

const HERO_TAGS = [
  'GLOBAL EVENTS',
  'RISK INTELLIGENCE',
  'DIGITAL TWIN',
  'STRATEGIC RESERVES',
];

const NETWORK_NODES = [
  { id: 'supplier-a', label: 'SUPPLIER A', type: 'supplier', x: 80, y: 60, desc: 'Crude supplier', status: 'Connected' },
  { id: 'supplier-b', label: 'SUPPLIER B', type: 'supplier', x: 80, y: 150, desc: 'LNG supplier', status: 'Exposed' },
  { id: 'port-1', label: 'PORT', type: 'port', x: 220, y: 105, desc: 'Deep-water terminal', status: 'Active' },
  { id: 'refinery', label: 'REFINERY', type: 'refinery', x: 380, y: 60, desc: 'Crude processing', status: 'Operational' },
  { id: 'pipeline', label: 'PIPELINE', type: 'pipeline', x: 380, y: 150, desc: 'Transport corridor', status: 'Flowing' },
  { id: 'chokepoint', label: 'CHOKEPOINT', type: 'chokepoint', x: 520, y: 105, desc: 'Strait transit', status: 'Monitored' },
  { id: 'demand', label: 'DEMAND', type: 'demand', x: 660, y: 105, desc: 'End-user intake', status: 'Served' },
];

const NETWORK_EDGES = [
  { from: 'supplier-a', to: 'port-1' },
  { from: 'supplier-b', to: 'port-1' },
  { from: 'port-1', to: 'refinery' },
  { from: 'port-1', to: 'pipeline' },
  { from: 'refinery', to: 'chokepoint' },
  { from: 'pipeline', to: 'chokepoint' },
  { from: 'chokepoint', to: 'demand' },
];

/* ==========================================================================
   SIGNATURE ANIMATION — ORBIT Intelligence Flow
   ========================================================================== */
const FLOW_STAGES = ['DETECT', 'ANALYZE', 'MAP', 'SIMULATE', 'RESPOND', 'DONE'] as const;

interface FlowNodeDef {
  id: string;
  x: number;
  y: number;
  label: string;
  sub: string;
  activeAt: number[];
}

const FLOW_NODES: FlowNodeDef[] = [
  { id: 'src', x: 46, y: 130, label: 'WORLD EVENTS', sub: 'global signals & news', activeAt: [0] },
  { id: 'event', x: 215, y: 130, label: 'RISK EVALUATION', sub: 'energy supply impact', activeAt: [0, 1] },
  { id: 'risk', x: 385, y: 130, label: 'NETWORK MAP', sub: 'ports · refineries · routes', activeAt: [1, 2] },
  { id: 'twin', x: 545, y: 78, label: 'RESERVE CHECK', sub: 'safe emergency buffer', activeAt: [2, 3] },
  { id: 'decision', x: 660, y: 130, label: 'ACTION', sub: 'decision-ready picture', activeAt: [4, 5] },
];

interface FlowPathDef {
  id: string;
  d: string;
  activeAt: number[];
}

const FLOW_PATHS: FlowPathDef[] = [
  { id: 'p-src-event', d: 'M 74 90 C 120 90, 150 130, 187 130 M 74 130 L 187 130 M 74 170 C 120 170, 150 130, 187 130', activeAt: [0] },
  { id: 'p-event-risk', d: 'M 243 130 L 357 130', activeAt: [1] },
  { id: 'p-risk-twin', d: 'M 413 118 C 460 118, 478 78, 517 78', activeAt: [2, 3] },
  { id: 'p-risk-decision', d: 'M 413 142 C 500 142, 540 130, 632 130', activeAt: [4] },
];

const STAGE_LABELS = [
  'DETECTING SIGNALS',
  'ANALYZING EXPOSURE',
  'MAPPING NETWORK',
  'CHECKING RESERVES',
  'CONNECTING SYSTEMS',
  'DECISION READY',
] as const;

const HeroFlowVisual: React.FC = () => {
  const [stage, setStage] = useState(0);
  const [reduced, setReduced] = useState(false);

  useEffect(() => {
    const mq = window.matchMedia('(prefers-reduced-motion: reduce)');
    const update = () => setReduced(mq.matches);
    update();
    mq.addEventListener('change', update);
    return () => mq.removeEventListener('change', update);
  }, []);

  useEffect(() => {
    if (reduced) {
      setStage(FLOW_STAGES.length - 1);
      return;
    }
    const t = window.setInterval(() => setStage((s) => (s + 1) % FLOW_STAGES.length), 2400);
    return () => window.clearInterval(t);
  }, [reduced]);

  const isActiveNode = (n: FlowNodeDef) => n.activeAt.includes(stage);
  const isActivePath = (p: FlowPathDef) => p.activeAt.includes(stage);
  const isFinal = stage === FLOW_STAGES.length - 1;

  return (
    <div
      className="relative overflow-hidden rounded-2xl border border-[var(--border-subtle)] bg-[var(--bg-card)] p-4 sm:p-5"
      role="img"
      aria-label={`ORBIT intelligence flow — stage ${FLOW_STAGES[stage]}`}
      style={{ boxShadow: '0 1px 0 rgba(0,0,0,0.04), 0 8px 30px -12px rgba(0,0,0,0.10)' }}
    >
      <div className="lp-stage-sheen pointer-events-none absolute inset-0" aria-hidden="true" />

      <div className="relative mb-3.5 flex items-center justify-between border-b border-[var(--border-subtle)] pb-3">
        <div className="flex items-center gap-2">
          <span className="lp-node-pulse inline-block h-2 w-2 rounded-full bg-[var(--accent-energy)]" aria-hidden="true" />
          <span className="text-[11px] font-semibold uppercase tracking-[0.16em] text-[var(--text-primary)]">
            ORBIT Intelligence Engine
          </span>
        </div>
        <span className="rounded border border-orange-200 bg-orange-50 px-2 py-0.5 font-mono text-[10px] font-semibold text-orange-700">
          AUTOMATED FLOW
        </span>
      </div>

      <svg viewBox="0 0 720 260" className="relative block w-full" aria-hidden="true">
        <defs>
          <linearGradient id="lp-flow-grad" x1="0" y1="0" x2="1" y2="0">
            <stop offset="0%" stopColor="#fb923c" />
            <stop offset="100%" stopColor="#f97316" />
          </linearGradient>
        </defs>

        <line x1="20" y1="40" x2="700" y2="40" stroke="var(--border-subtle)" strokeWidth="1" />
        <line x1="20" y1="220" x2="700" y2="220" stroke="var(--border-subtle)" strokeWidth="1" />
        <text x="20" y="30" className="fill-[var(--text-faint)]" style={{ fontSize: 9, fontFamily: 'ui-monospace, monospace', letterSpacing: '0.18em' }}>GLOBAL EVENTS</text>
        <text x="20" y="236" className="fill-[var(--text-faint)]" style={{ fontSize: 9, fontFamily: 'ui-monospace, monospace', letterSpacing: '0.18em' }}>ENERGY DECISIONS</text>

        {FLOW_PATHS.map((p) => {
          const active = isActivePath(p);
          return (
            <path
              key={p.id}
              id={p.id}
              d={p.d}
              className="lp-flow-path"
              fill="none"
              stroke={active ? 'url(#lp-flow-grad)' : 'var(--border-emphasis)'}
              strokeWidth={active ? 1.6 : 1}
              strokeLinecap="round"
              opacity={active ? 1 : 0.35}
              style={{ transition: 'opacity 400ms ease, stroke-width 400ms ease' }}
            />
          );
        })}

        {!reduced && FLOW_PATHS.map((p, i) => (
          <circle key={`pkt-${p.id}`} r="2.5" fill="var(--accent-energy)" opacity="0">
            <animateMotion
              dur={`${2.5 + i * 0.5}s`}
              repeatCount="indefinite"
              begin={`${i * 1.2}s`}
            >
              <mpath xlinkHref={`#${p.id}`} />
            </animateMotion>
            <animate
              attributeName="opacity"
              values="0;0.85;0.85;0"
              dur={`${2.5 + i * 0.5}s`}
              repeatCount="indefinite"
              begin={`${i * 1.2}s`}
            />
          </circle>
        ))}

        {FLOW_NODES.map((n) => {
          const active = isActiveNode(n);
          const r = active ? 7 : 5;
          return (
            <g key={n.id} style={{ transition: 'opacity 400ms ease' }} opacity={active ? 1 : 0.4}>
              {active && (
                <>
                  <circle cx={n.x} cy={n.y} r={8} className="lp-node-pulse" fill="var(--accent-energy)" opacity="0.12" />
                  <circle cx={n.x} cy={n.y} r={7} fill="none" stroke="var(--accent-energy)" strokeWidth="0.8" opacity="0.25">
                    <animate attributeName="r" from="7" to="14" dur="2s" repeatCount="indefinite" />
                    <animate attributeName="opacity" from="0.25" to="0" dur="2s" repeatCount="indefinite" />
                  </circle>
                </>
              )}
              <circle cx={n.x} cy={n.y} r={r} fill={active ? 'var(--accent-energy)' : 'var(--bg-card)'} stroke="var(--accent-energy)" strokeWidth={active ? 1.5 : 1} />
              <text x={n.x} y={n.y - 26} textAnchor="middle" className="fill-[var(--text-primary)]" style={{ fontSize: 10, fontWeight: 600, fontFamily: 'ui-sans-serif, system-ui, sans-serif', letterSpacing: '0.04em' }}>{n.label}</text>
              <text x={n.x} y={n.y + 36} textAnchor="middle" className="fill-[var(--text-faint)]" style={{ fontSize: 8.5, fontFamily: 'ui-monospace, monospace', letterSpacing: '0.06em' }}>{n.sub}</text>
            </g>
          );
        })}

        <g style={{ transition: 'opacity 500ms ease' }} opacity={isFinal ? 1 : 0} className="lp-output-pulse">
          <rect x="636" y="100" width="54" height="60" rx="8" fill="var(--accent-energy)" opacity="0.10" />
          <text x="663" y="132" textAnchor="middle" className="fill-[var(--accent-energy)]" style={{ fontSize: 9, fontWeight: 700, letterSpacing: '0.14em' }}>DECISION</text>
          <text x="663" y="149" textAnchor="middle" className="fill-[var(--accent-energy)]" style={{ fontSize: 9, fontWeight: 700, letterSpacing: '0.14em' }}>READY</text>
        </g>
      </svg>

      <div className="relative mt-3 flex items-center justify-between border-t border-[var(--border-subtle)] pt-2.5">
        <span className="font-mono text-[10px] uppercase tracking-[0.18em] text-[var(--text-muted)]">
          stage {String(stage + 1).padStart(2, '0')} / {FLOW_STAGES[stage]}
        </span>
        <span className={`font-mono text-[10px] transition-colors duration-400 ${isFinal ? 'text-orange-600' : 'text-orange-500'}`}>
          {isFinal ? 'ONE CONNECTED PICTURE' : STAGE_LABELS[stage]}
        </span>
      </div>
    </div>
  );
};

/* ==========================================================================
   SCROLL REVEAL
   ========================================================================== */
const Reveal: React.FC<{
  children: React.ReactNode;
  className?: string;
  delay?: number;
}> = ({ children, className, delay }) => {
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const el = ref.current;
    if (!el) return;

    const mq = window.matchMedia('(prefers-reduced-motion: reduce)');
    if (mq.matches) {
      el.classList.add('is-revealed');
      return;
    }

    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) {
          el.classList.add('is-revealed');
          observer.unobserve(el);
        }
      },
      { threshold: 0.1 },
    );
    observer.observe(el);
    return () => observer.disconnect();
  }, []);

  return (
    <div
      ref={ref}
      className={`orbit-reveal ${className || ''}`}
      style={delay ? { '--orbit-reveal-delay': `${delay}ms` } as React.CSSProperties : undefined}
    >
      {children}
    </div>
  );
};

/* ==========================================================================
   INTERACTIVE NETWORK VISUALIZATION (DIGITAL TWIN)
   ========================================================================== */
const NetworkVisualization: React.FC = () => {
  const [hoveredNode, setHoveredNode] = useState<string | null>(null);
  const [reduced, setReduced] = useState(false);

  useEffect(() => {
    const mq = window.matchMedia('(prefers-reduced-motion: reduce)');
    const update = () => setReduced(mq.matches);
    update();
    mq.addEventListener('change', update);
    return () => mq.removeEventListener('change', update);
  }, []);

  const getNodePos = (id: string) => NETWORK_NODES.find((n) => n.id === id);

  const isConnectedTo = (nodeId: string) => {
    return NETWORK_EDGES.some(
      (e) => (e.from === nodeId || e.to === nodeId) &&
        (e.from === hoveredNode || e.to === hoveredNode)
    );
  };

  return (
    <div className="relative rounded-2xl border border-[var(--border-subtle)] bg-[var(--bg-card)] p-5">
      <div className="mb-4 flex items-center justify-between border-b border-[var(--border-subtle)] pb-3">
        <span className="text-xs font-semibold uppercase tracking-wider text-[var(--text-muted)]">
          Digital Twin Network
        </span>
        <span className="flex items-center gap-1.5 text-[11px] font-medium text-emerald-600">
          <span className="h-1.5 w-1.5 rounded-full bg-emerald-500" />
          Interactive Network Model
        </span>
      </div>

      <svg viewBox="0 0 740 210" className="w-full" aria-label="Interactive energy network visualization">
        {NETWORK_EDGES.map((edge, i) => {
          const from = getNodePos(edge.from);
          const to = getNodePos(edge.to);
          if (!from || !to) return null;
          const isActive = hoveredNode && (edge.from === hoveredNode || edge.to === hoveredNode);
          return (
            <line
              key={`edge-${i}`}
              x1={from.x} y1={from.y}
              x2={to.x} y2={to.y}
              stroke={isActive ? 'var(--accent-energy)' : 'var(--border-subtle)'}
              strokeWidth={isActive ? 2 : 1}
              opacity={isActive ? 1 : 0.5}
              style={{ transition: 'all 0.3s ease' }}
            />
          );
        })}

        {!reduced && NETWORK_EDGES.slice(0, 3).map((edge, i) => {
          const from = getNodePos(edge.from);
          const to = getNodePos(edge.to);
          if (!from || !to) return null;
          return (
            <circle key={`signal-${i}`} r="2" fill="var(--accent-energy)" opacity="0">
              <animateMotion
                dur={`${3 + i}s`}
                repeatCount="indefinite"
                begin={`${i * 1.5}s`}
                path={`M ${from.x} ${from.y} L ${to.x} ${to.y}`}
              />
              <animate attributeName="opacity" values="0;0.7;0.7;0" dur={`${3 + i}s`} repeatCount="indefinite" begin={`${i * 1.5}s`} />
            </circle>
          );
        })}

        {NETWORK_NODES.map((node) => {
          const isHovered = hoveredNode === node.id;
          const isConnected = hoveredNode ? isConnectedTo(node.id) : false;
          const dimmed = hoveredNode && !isHovered && !isConnected;
          const color = isHovered ? 'var(--accent-energy)' : 'var(--border-emphasis)';

          return (
            <g
              key={node.id}
              className="lp-network-node cursor-pointer"
              onMouseEnter={() => setHoveredNode(node.id)}
              onMouseLeave={() => setHoveredNode(null)}
              style={{ opacity: dimmed ? 0.35 : 1, transition: 'opacity 0.3s ease' }}
            >
              {isHovered && (
                <circle cx={node.x} cy={node.y} r={10} fill="var(--accent-energy)" opacity="0.08" className="lp-signal-pulse" />
              )}
              <circle cx={node.x} cy={node.y} r={isHovered ? 7 : 5} fill={isHovered ? 'var(--accent-energy)' : 'var(--bg-card)'} stroke={color} strokeWidth={isHovered ? 1.5 : 1} style={{ transition: 'all 0.3s ease' }} />
              <text x={node.x} y={node.y - 14} textAnchor="middle" className="fill-[var(--text-primary)]" style={{ fontSize: 9, fontWeight: 600, letterSpacing: '0.06em', transition: 'all 0.3s ease' }}>{node.label}</text>
            </g>
          );
        })}
      </svg>

      <div className={`lp-network-info mt-3 rounded-lg border border-[var(--border-subtle)] bg-[var(--bg-surface)] p-3 ${hoveredNode ? 'is-visible' : ''}`}>
        {hoveredNode ? (
          <div className="flex items-center justify-between">
            <div>
              <span className="block text-xs font-bold uppercase tracking-wider text-[var(--accent-energy)]">
                {NETWORK_NODES.find((n) => n.id === hoveredNode)?.label}
              </span>
              <span className="text-xs text-[var(--text-secondary)]">
                {NETWORK_NODES.find((n) => n.id === hoveredNode)?.desc}
              </span>
            </div>
            <span className="font-mono text-[10px] uppercase tracking-wider text-[var(--text-muted)]">
              {NETWORK_NODES.find((n) => n.id === hoveredNode)?.status}
            </span>
          </div>
        ) : (
          <span className="text-xs text-[var(--text-muted)]">Hover any node to trace connection pathways across the network</span>
        )}
      </div>
    </div>
  );
};

/* ==========================================================================
   CONCEPTUAL STRATEGIC RESERVE MODEL (NO MOCK PERCENTAGES)
   ========================================================================== */
const ConceptualReserveVisual: React.FC = () => {
  return (
    <div className="rounded-2xl border border-[var(--border-subtle)] bg-[var(--bg-card)] p-5">
      <div className="mb-4 flex items-center justify-between border-b border-[var(--border-subtle)] pb-3">
        <span className="text-xs font-semibold uppercase tracking-wider text-[var(--text-muted)]">
          Strategic Reserve Strategy
        </span>
        <span className="font-mono text-[10px] text-[var(--text-muted)]">SAFETY BOUNDARY ENFORCED</span>
      </div>

      <div className="space-y-4">
        {/* Conceptual 3-tier safety layers */}
        <div className="space-y-2">
          <div className="flex items-center justify-between text-xs">
            <span className="font-semibold text-[var(--text-primary)]">Reserve Operating Bounds</span>
            <span className="font-mono text-[11px] font-bold text-emerald-600">Protected</span>
          </div>

          <div className="relative h-8 overflow-hidden rounded-lg border border-[var(--border-subtle)] bg-[var(--bg-surface)] flex">
            <div className="h-full bg-emerald-500/20 border-r border-emerald-500/30 flex items-center justify-center px-2 text-[10px] font-mono font-bold text-emerald-700" style={{ width: '45%' }}>
              AVAILABLE BUFFER
            </div>
            <div className="h-full bg-amber-500/20 border-r border-amber-500/30 flex items-center justify-center px-2 text-[10px] font-mono font-bold text-amber-700" style={{ width: '30%' }}>
              DISRUPTION CONTINGENCY
            </div>
            <div className="h-full bg-rose-500/20 flex items-center justify-center px-2 text-[10px] font-mono font-bold text-rose-700" style={{ width: '25%' }}>
              PROTECTED SAFETY FLOOR
            </div>
          </div>
        </div>

        {/* 3 Core Conceptual Pillars */}
        <div className="grid grid-cols-3 gap-2 text-center pt-1">
          <div className="rounded-lg border border-[var(--border-subtle)] bg-[var(--bg-surface)] p-2.5">
            <span className="font-mono text-[10px] font-bold uppercase tracking-wider text-[var(--accent-energy)]">01 / CURRENT</span>
            <p className="mt-1 text-xs font-semibold text-[var(--text-primary)]">Current Reserve</p>
            <p className="mt-0.5 text-[10px] text-[var(--text-muted)]">Available stockpile</p>
          </div>
          <div className="rounded-lg border border-[var(--border-subtle)] bg-[var(--bg-surface)] p-2.5">
            <span className="font-mono text-[10px] font-bold uppercase tracking-wider text-amber-600">02 / IMPACT</span>
            <p className="mt-1 text-xs font-semibold text-[var(--text-primary)]">Disruption</p>
            <p className="mt-0.5 text-[10px] text-[var(--text-muted)]">Shortfall demands</p>
          </div>
          <div className="rounded-lg border border-[var(--border-subtle)] bg-[var(--bg-surface)] p-2.5">
            <span className="font-mono text-[10px] font-bold uppercase tracking-wider text-emerald-600">03 / ACTION</span>
            <p className="mt-1 text-xs font-semibold text-[var(--text-primary)]">Reserve Strategy</p>
            <p className="mt-0.5 text-[10px] text-[var(--text-muted)]">Safe release limits</p>
          </div>
        </div>

        <div className="rounded-lg border border-orange-200 bg-orange-50/60 p-3">
          <div className="flex items-center gap-2 text-xs font-semibold text-[var(--text-primary)]">
            <ShieldCheck className="h-4 w-4 text-[var(--accent-energy)] shrink-0" />
            <span>Safety Rule: Required reserve safety level is never breached.</span>
          </div>
        </div>
      </div>
    </div>
  );
};

/* ==========================================================================
   SOURCE TRACEABILITY VISUAL (WHY ORBIT)
   ========================================================================== */
const SourceTraceVisual: React.FC = () => {
  const [activeStep, setActiveStep] = useState(4);
  const ref = useRef<HTMLDivElement>(null);

  const steps = [
    { label: 'REAL EVENT', sub: 'Verified source news', icon: Database },
    { label: 'SIGNAL', sub: 'Intelligence intake', icon: Zap },
    { label: 'ENERGY RISK', sub: 'Impact evaluated', icon: Activity },
    { label: 'NETWORK TRACE', sub: 'Assets mapped', icon: Network },
    { label: 'ACTION', sub: 'Decision ready', icon: Target },
  ];

  return (
    <div ref={ref} className="rounded-2xl border border-[var(--border-subtle)] bg-[var(--bg-card)] p-5">
      <div className="mb-4 flex items-center justify-between border-b border-[var(--border-subtle)] pb-3">
        <span className="text-xs font-semibold uppercase tracking-wider text-[var(--text-muted)]">
          Source Traceability
        </span>
        <span className="font-mono text-[10px] text-[var(--text-muted)]">EVIDENCE CHAIN</span>
      </div>

      <div className="flex items-center justify-between">
        {steps.map((s, i) => {
          const Icon = s.icon;
          const isActive = activeStep >= i;
          return (
            <React.Fragment key={s.label}>
              <div className="flex flex-col items-center gap-1.5">
                <div
                  className={`flex h-9 w-9 items-center justify-center rounded-lg border transition-all duration-300 ${
                    isActive
                      ? 'border-[var(--accent-energy)] bg-orange-50 text-[var(--accent-energy)]'
                      : 'border-[var(--border-subtle)] bg-[var(--bg-surface)] text-[var(--text-faint)]'
                  }`}
                >
                  <Icon className="h-4 w-4" />
                </div>
                <span className={`text-[9px] font-bold uppercase tracking-wider ${isActive ? 'text-[var(--accent-energy)]' : 'text-[var(--text-faint)]'}`}>
                  {s.label}
                </span>
                <span className="text-[9px] text-[var(--text-muted)] hidden sm:block">{s.sub}</span>
              </div>
              {i < steps.length - 1 && (
                <div className="flex-1 px-1 sm:px-2">
                  <div
                    className="h-px transition-all duration-500"
                    style={{
                      background: 'var(--accent-energy)',
                      opacity: 0.6,
                    }}
                  />
                </div>
              )}
            </React.Fragment>
          );
        })}
      </div>
    </div>
  );
};

/* ==========================================================================
   MAIN LANDING PAGE COMPONENT
   ========================================================================== */
export const LandingPage: React.FC<LandingPageProps> = ({
  onNavigateToAuth,
  onNavigateToApp,
  isAuthenticated,
}) => {
  const [mobileNavOpen, setMobileNavOpen] = useState(false);
  const [activeItem, setActiveItem] = useState<string>('The Problem');
  const [scrolled, setScrolled] = useState(false);
  const [scrollPct, setScrollPct] = useState(0);
  const isManualScrollRef = useRef<boolean>(false);
  const scrollTimeoutRef = useRef<number | null>(null);

  const primaryAction = isAuthenticated ? onNavigateToApp : onNavigateToAuth;

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
      setScrolled(window.scrollY > 20);

      const docHeight = document.documentElement.scrollHeight - window.innerHeight;
      setScrollPct(docHeight > 0 ? Math.min(window.scrollY / docHeight, 1) : 0);

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
        setActiveItem('The Problem');
        return;
      }

      const current = sections.find(
        (s) => s.top <= headerOffset + 40 && s.bottom >= headerOffset - 40,
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
    <div className="orbit-landing relative min-h-screen bg-[var(--bg-primary)] text-[var(--text-primary)] selection:bg-orange-500/20">
      {/* Reference-style Continuous Animated Grid Background */}
      <OrbitLandingBackground />

      {/* Scroll progress indicator */}
      <div className="lp-scroll-progress" style={{ transform: `scaleX(${scrollPct})` }} aria-hidden="true" />

      {/* ============================================================
          NAVIGATION
          ============================================================ */}
      <header
        className={`fixed top-0 left-0 right-0 z-50 transition-all duration-300 ${
          scrolled
            ? 'border-b border-[var(--border-subtle)] bg-white/95 backdrop-blur-xl shadow-[0_1px_3px_rgba(0,0,0,0.04)]'
            : 'bg-white/0'
        }`}
      >
        <div className="mx-auto flex h-16 max-w-7xl items-center justify-between px-4 sm:px-6 lg:px-8">
          <a
            href="#top"
            onClick={(e) => scrollToSection(e, 'The Problem', '#top')}
            className="flex items-center gap-2.5"
            aria-label="ORBIT home"
          >
            <OrbitLogo size="md" showWordmark={true} variant="light" />
          </a>

          <nav className="hidden items-center gap-1 xl:flex" aria-label="Landing page navigation">
            {NAV_ITEMS.map((item) => {
              const isActive = activeItem === item.label;
              return (
                <a
                  key={item.label}
                  href={item.href}
                  onClick={(e) => scrollToSection(e, item.label, item.href)}
                  className={`lp-nav-active rounded-md px-3 py-1.5 text-xs font-medium transition-all duration-200 ${
                    isActive
                      ? 'is-active text-[var(--text-primary)] font-semibold'
                      : 'text-[var(--text-muted)] hover:text-[var(--text-primary)]'
                  }`}
                >
                  {item.label}
                </a>
              );
            })}
          </nav>

          <div className="flex items-center gap-3">
            <button
              id="landing-header-signin-button"
              type="button"
              onClick={primaryAction}
              className="lp-btn-sweep hidden rounded-lg bg-[var(--accent-energy)] px-4 py-2 text-xs font-semibold text-white transition-all duration-200 hover:-translate-y-0.5 hover:opacity-90 sm:inline-flex"
            >
              Sign In
            </button>
            <button
              id="landing-header-mobile-toggle"
              type="button"
              aria-label={mobileNavOpen ? 'Close navigation' : 'Open navigation'}
              aria-expanded={mobileNavOpen}
              onClick={() => setMobileNavOpen((open) => !open)}
              className="rounded-md p-2 text-[var(--text-secondary)] transition-colors hover:text-[var(--text-primary)] xl:hidden"
            >
              {mobileNavOpen ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
            </button>
          </div>
        </div>

        {mobileNavOpen && (
          <nav
            className="border-t border-[var(--border-subtle)] bg-white px-4 py-4 xl:hidden"
            aria-label="Mobile landing page navigation"
          >
            <div className="mx-auto flex max-w-7xl flex-col gap-1">
              {NAV_ITEMS.map((item) => (
                <a
                  key={item.label}
                  href={item.href}
                  onClick={(e) => {
                    scrollToSection(e, item.label, item.href);
                    setMobileNavOpen(false);
                  }}
                  className="rounded-md px-3 py-2 text-sm font-medium text-[var(--text-secondary)] transition-colors hover:bg-[var(--bg-surface)] hover:text-[var(--text-primary)]"
                >
                  {item.label}
                </a>
              ))}
              <div className="mt-3 border-t border-[var(--border-subtle)] pt-3">
                <button
                  id="landing-mobile-signin-button"
                  type="button"
                  onClick={() => {
                    setMobileNavOpen(false);
                    primaryAction();
                  }}
                  className="w-full rounded-lg bg-[var(--accent-energy)] px-4 py-2.5 text-sm font-semibold text-white"
                >
                  Sign In
                </button>
              </div>
            </div>
          </nav>
        )}
      </header>

      <main id="top" className="relative z-10 pt-16 scroll-mt-20">
        {/* ============================================================
            1. HERO
            ============================================================ */}
        <section className="relative overflow-hidden px-4 pb-12 pt-10 sm:px-6 sm:pb-16 sm:pt-14 lg:px-8 lg:pb-16 lg:pt-16">
          <div className="landing-hero-glow lp-parallax absolute left-1/2 top-0 h-[20rem] w-[30rem] -translate-x-1/2 rounded-full opacity-10" aria-hidden="true" />

          <div className="relative mx-auto grid max-w-7xl items-center gap-8 lg:grid-cols-[1.1fr_0.9fr] lg:gap-12">
            <div>
              <div className="mb-5 inline-flex items-center gap-2 rounded-full border border-[var(--border-subtle)] bg-[var(--bg-surface)] px-3.5 py-1.5 shadow-sm">
                <span className="h-1.5 w-1.5 rounded-full bg-[var(--accent-energy)]" aria-hidden="true" />
                <span className="text-[11px] font-semibold uppercase tracking-[0.16em] text-[var(--accent-energy)]">
                  ENERGY SUPPLY-CHAIN INTELLIGENCE
                </span>
              </div>

              <h1 className="max-w-2xl text-4xl font-bold leading-[1.08] tracking-[-0.03em] text-[var(--text-primary)] sm:text-5xl lg:text-[3.5rem]">
                <span className="lp-hero-word">FROM</span>{' '}
                <span className="lp-hero-word">GLOBAL</span>{' '}
                <span className="lp-hero-word">EVENTS</span><br />
                <span className="lp-hero-word">TO</span>{' '}
                <span className="lp-hero-word">ENERGY</span>{' '}
                <span className="lp-hero-word lp-orange-interactive" style={{ color: 'var(--accent-energy)' }}>DECISIONS.</span>
              </h1>

              <p className="mt-5 max-w-xl text-base sm:text-lg leading-[1.7] text-[var(--text-secondary)]">
                ORBIT monitors real-world events, understands how they can affect oil supply, evaluates strategic reserves, and brings the full picture together in one system.
              </p>

              {/* Four Hero Tags */}
              <div className="mt-6 flex flex-wrap gap-2">
                {HERO_TAGS.map((tag) => (
                  <span
                    key={tag}
                    className="rounded-md border border-[var(--border-subtle)] bg-[var(--bg-surface)] px-2.5 py-1 font-mono text-[11px] font-semibold text-[var(--text-primary)]"
                  >
                    {tag}
                  </span>
                ))}
              </div>

              {/* Buttons */}
              <div className="mt-8 flex flex-col items-stretch gap-3 sm:flex-row sm:items-center">
                <a
                  id="hero-primary-cta"
                  href="#problem"
                  onClick={(e) => scrollToSection(e, 'The Problem', '#problem')}
                  className="lp-btn-sweep inline-flex items-center justify-center gap-2 rounded-lg bg-[var(--text-primary)] px-6 py-3 text-sm font-semibold text-white transition-all duration-200 hover:-translate-y-0.5 hover:opacity-90 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--accent-energy)] focus-visible:ring-offset-2"
                >
                  <span>EXPLORE ORBIT</span>
                  <ArrowRight className="lp-btn-arrow h-4 w-4" />
                </a>
                <button
                  type="button"
                  onClick={primaryAction}
                  className="lp-btn-sweep inline-flex items-center justify-center gap-2 rounded-lg border border-[var(--border-emphasis)] bg-transparent px-6 py-3 text-sm font-semibold text-[var(--text-primary)] transition-all duration-200 hover:-translate-y-0.5 hover:border-[var(--accent-energy)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--accent-energy)] focus-visible:ring-offset-2"
                >
                  <Lock className="h-4 w-4 text-[var(--text-muted)]" />
                  <span>OPEN COMMAND CENTER</span>
                </button>
              </div>
            </div>

            <HeroFlowVisual />
          </div>
        </section>

        {/* ============================================================
            2. THE PROBLEM
            ============================================================ */}
        <Reveal>
          <section
            id="problem"
            className="scroll-mt-24 border-y border-[var(--border-subtle)] bg-[var(--bg-secondary)] px-4 py-14 sm:px-6 lg:px-8 lg:py-16 relative"
          >
            <div className="mx-auto max-w-4xl text-center">
              <h2 className="text-2xl font-bold tracking-tight text-[var(--text-primary)] sm:text-3xl lg:text-4xl">
                GLOBAL EVENTS CAN DISRUPT ENERGY SUPPLY.
              </h2>

              <p className="mt-4 text-base sm:text-lg leading-relaxed text-[var(--text-secondary)] max-w-2xl mx-auto">
                A conflict, attack, sanction, blocked shipping route, or damaged facility can disrupt oil supply far away from where the event happens.
              </p>

              <div className="mt-8 grid gap-4 sm:grid-cols-2 text-left">
                <div className="rounded-xl border border-[var(--border-subtle)] bg-[var(--bg-card)] p-5">
                  <span className="font-mono text-[11px] uppercase tracking-wider text-[var(--text-muted)]">THE HEADLINE QUESTION</span>
                  <p className="mt-1 text-base font-bold text-[var(--text-primary)]">
                    "What happened?"
                  </p>
                  <p className="mt-1 text-xs text-[var(--text-muted)]">News reports provide raw information, but no operational answer.</p>
                </div>

                <div className="rounded-xl border border-orange-200 bg-orange-50/70 p-5">
                  <span className="font-mono text-[11px] uppercase tracking-wider text-[var(--accent-energy)] font-bold">THE DIFFICULT QUESTION</span>
                  <p className="mt-1 text-base font-bold text-[var(--text-primary)]">
                    "What does it mean for our energy supply?"
                  </p>
                  <p className="mt-1 text-xs text-[var(--text-secondary)]">Connecting the event to supply, refineries, and reserves.</p>
                </div>
              </div>

              <div className="mt-6 inline-flex items-center gap-2 rounded-full border border-orange-200 bg-orange-50 px-4 py-1.5">
                <div className="h-1.5 w-1.5 rounded-full bg-[var(--accent-energy)] lp-signal-pulse" />
                <span className="text-xs font-bold text-[var(--text-primary)]">
                  THE SOLUTION: ORBIT
                </span>
              </div>
            </div>
          </section>
        </Reveal>

        {/* ============================================================
            3. WHAT IS ORBIT?
            ============================================================ */}
        <Reveal>
          <section
            id="what-is-orbit"
            className="scroll-mt-24 px-4 py-14 sm:px-6 lg:px-8 lg:py-16 relative border-b border-[var(--border-subtle)]"
          >
            <div className="mx-auto max-w-7xl">
              <div className="max-w-3xl">
                <h2 className="text-2xl font-bold tracking-tight text-[var(--text-primary)] sm:text-3xl lg:text-4xl">
                  ONE SYSTEM TO UNDERSTAND AN ENERGY CRISIS.
                </h2>
                <p className="mt-4 text-base sm:text-lg leading-relaxed text-[var(--text-secondary)]">
                  ORBIT is an energy intelligence platform that connects global events, energy risk, network impact, and strategic reserves into one clear picture.
                </p>
              </div>

              {/* Simple Flow: GLOBAL EVENTS → RISK → ENERGY NETWORK → RESERVES → DECISION */}
              <div className="mt-8 rounded-2xl border border-[var(--border-subtle)] bg-[var(--bg-card)] p-5 sm:p-6">
                <div className="flex flex-col items-stretch gap-2 sm:flex-row sm:items-center sm:justify-between">
                  {[
                    { step: 'GLOBAL EVENTS', icon: Globe2 },
                    { step: 'RISK', icon: Activity },
                    { step: 'ENERGY NETWORK', icon: Network },
                    { step: 'RESERVES', icon: ShieldCheck },
                    { step: 'DECISION', icon: Target },
                  ].map((item, idx) => (
                    <React.Fragment key={item.step}>
                      <div className="flex flex-1 items-center gap-3 rounded-lg border border-[var(--border-subtle)] bg-[var(--bg-surface)] p-3 sm:flex-col sm:text-center">
                        <div className="flex h-7 w-7 items-center justify-center rounded bg-orange-50 text-[var(--accent-energy)] border border-orange-100">
                          <item.icon className="h-3.5 w-3.5" />
                        </div>
                        <span className="font-mono text-xs font-bold tracking-wider text-[var(--text-primary)]">
                          {item.step}
                        </span>
                      </div>
                      {idx < 4 && (
                        <div className="flex items-center justify-center py-1 sm:py-0 text-[var(--accent-energy)]" aria-hidden="true">
                          <ArrowDown className="h-3.5 w-3.5 sm:hidden" />
                          <ArrowRight className="hidden h-3.5 w-3.5 sm:block" />
                        </div>
                      )}
                    </React.Fragment>
                  ))}
                </div>
              </div>
            </div>
          </section>
        </Reveal>

        {/* ============================================================
            4. GEOPOLITICAL RISK INTELLIGENCE
            ============================================================ */}
        <Reveal>
          <section
            id="risk-intelligence"
            className="scroll-mt-24 bg-[var(--bg-secondary)] px-4 py-14 sm:px-6 lg:px-8 lg:py-16 border-b border-[var(--border-subtle)]"
          >
            <div className="mx-auto max-w-7xl">
              <div className="grid gap-8 lg:grid-cols-2 lg:items-center">
                <div>
                  <span className="font-mono text-xs font-bold uppercase tracking-wider text-[var(--accent-energy)]">
                    RISK INTELLIGENCE
                  </span>
                  <h2 className="mt-2 text-2xl font-bold tracking-tight text-[var(--text-primary)] sm:text-3xl lg:text-4xl">
                    ORBIT FINDS THE ENERGY RISK.
                  </h2>
                  <p className="mt-4 text-base leading-relaxed text-[var(--text-secondary)]">
                    ORBIT's Geopolitical Risk Agent analyzes real-world news and identifies events that could affect oil and energy supply.
                  </p>

                  <div className="mt-6 rounded-xl border border-orange-200 bg-orange-50/60 p-4">
                    <span className="font-mono text-xs font-bold uppercase tracking-wider text-[var(--accent-energy)]">
                      REAL NEWS → ENERGY RISK
                    </span>
                    <p className="mt-1 text-sm text-[var(--text-secondary)]">
                      Filters through global reporting to extract concrete energy impacts without manual parsing.
                    </p>
                  </div>
                </div>

                {/* Conversational Assistant Mention */}
                <div className="rounded-2xl border border-[var(--border-subtle)] bg-[var(--bg-card)] p-6">
                  <div className="flex items-center gap-2 border-b border-[var(--border-subtle)] pb-3">
                    <Bot className="h-4 w-4 text-[var(--accent-energy)]" />
                    <span className="text-xs font-bold uppercase tracking-wider text-[var(--text-primary)]">
                      Conversational Assistant: Ask ORBIT
                    </span>
                  </div>

                  <p className="mt-3 text-sm leading-relaxed text-[var(--text-secondary)]">
                    Users can ask ORBIT questions about current risks, affected supply, network impact, and reserves.
                  </p>

                  <div className="mt-4 space-y-2">
                    <div className="rounded-lg border border-[var(--border-subtle)] bg-[var(--bg-surface)] p-2.5 text-xs text-[var(--text-primary)]">
                      <MessageSquare className="inline h-3.5 w-3.5 text-[var(--accent-energy)] mr-2" />
                      "Which supply routes are currently exposed?"
                    </div>
                    <div className="rounded-lg border border-[var(--border-subtle)] bg-[var(--bg-surface)] p-2.5 text-xs text-[var(--text-primary)]">
                      <MessageSquare className="inline h-3.5 w-3.5 text-[var(--accent-energy)] mr-2" />
                      "What is our reserve position if the disruption continues?"
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </section>
        </Reveal>

        {/* ============================================================
            5. DIGITAL TWIN
            ============================================================ */}
        <Reveal>
          <section
            id="digital-twin"
            className="scroll-mt-24 px-4 py-14 sm:px-6 lg:px-8 lg:py-16 border-b border-[var(--border-subtle)]"
          >
            <div className="mx-auto max-w-7xl">
              <div className="grid gap-8 lg:grid-cols-[1fr_1fr] lg:items-center">
                <div>
                  <span className="font-mono text-xs font-bold uppercase tracking-wider text-[var(--accent-energy)]">
                    NETWORK MAPPING
                  </span>
                  <h2 className="mt-2 text-2xl font-bold tracking-tight text-[var(--text-primary)] sm:text-3xl lg:text-4xl">
                    ORBIT SHOWS WHERE THE IMPACT GOES.
                  </h2>

                  <p className="mt-4 text-base leading-relaxed text-[var(--text-secondary)]">
                    The Digital Twin is a digital copy of the energy network.
                  </p>

                  <div className="mt-3 inline-flex flex-wrap items-center gap-2 rounded-lg border border-[var(--border-subtle)] bg-[var(--bg-surface)] px-3 py-1.5 font-mono text-xs font-bold text-[var(--text-primary)]">
                    <span>SUPPLIERS</span>
                    <span className="text-[var(--accent-energy)]">→</span>
                    <span>ROUTES</span>
                    <span className="text-[var(--accent-energy)]">→</span>
                    <span>PORTS</span>
                    <span className="text-[var(--accent-energy)]">→</span>
                    <span>REFINERIES</span>
                  </div>

                  <p className="mt-4 text-sm text-[var(--text-secondary)] leading-relaxed">
                    When an event occurs, ORBIT traces which parts of the network may be affected.
                  </p>

                  <div className="mt-5 border-l-2 border-[var(--accent-energy)] pl-3">
                    <p className="font-mono text-sm font-bold uppercase tracking-wider text-[var(--text-primary)]">
                      DON'T JUST READ THE HEADLINE.<br />
                      SEE ITS IMPACT.
                    </p>
                  </div>
                </div>

                <NetworkVisualization />
              </div>
            </div>
          </section>
        </Reveal>

        {/* ============================================================
            6. STRATEGIC RESERVES
            ============================================================ */}
        <Reveal>
          <section
            id="reserves"
            className="scroll-mt-24 bg-[var(--bg-secondary)] px-4 py-14 sm:px-6 lg:px-8 lg:py-16 border-b border-[var(--border-subtle)]"
          >
            <div className="mx-auto max-w-7xl">
              <div className="grid gap-8 lg:grid-cols-2 lg:items-center">
                <ConceptualReserveVisual />

                <div>
                  <span className="font-mono text-xs font-bold uppercase tracking-wider text-[var(--accent-energy)]">
                    STRATEGIC RESERVES
                  </span>
                  <h2 className="mt-2 text-2xl font-bold tracking-tight text-[var(--text-primary)] sm:text-3xl lg:text-4xl">
                    ORBIT SHOWS WHAT CAN BE DONE ABOUT IT.
                  </h2>

                  <p className="mt-4 text-base leading-relaxed text-[var(--text-secondary)]">
                    ORBIT combines the current reserve position with the disruption to help determine how reserves can be used while protecting the required safety level.
                  </p>

                  <div className="mt-5 flex flex-wrap items-center gap-2 rounded-lg border border-[var(--border-subtle)] bg-[var(--bg-card)] p-3 font-mono text-xs font-bold text-[var(--text-primary)]">
                    <span>CURRENT RESERVE</span>
                    <span className="text-[var(--accent-energy)]">→</span>
                    <span>DISRUPTION</span>
                    <span className="text-[var(--accent-energy)]">→</span>
                    <span className="text-emerald-700">RESERVE STRATEGY</span>
                  </div>

                  <p className="mt-4 text-xs text-[var(--text-muted)]">
                    Enforces dynamic safety floors to prevent over-release while ensuring strategic resilience.
                  </p>
                </div>
              </div>
            </div>
          </section>
        </Reveal>

        {/* ============================================================
            7. ORCHESTRATOR
            ============================================================ */}
        <Reveal>
          <section
            id="orchestrator"
            className="scroll-mt-24 px-4 py-14 sm:px-6 lg:px-8 lg:py-16 border-b border-[var(--border-subtle)]"
          >
            <div className="mx-auto max-w-7xl">
              <div className="max-w-3xl">
                <div className="inline-flex items-center gap-2 rounded-full border border-orange-200 bg-orange-50 px-3 py-1 text-xs font-semibold uppercase tracking-wider text-[var(--accent-energy)]">
                  <Workflow className="h-3.5 w-3.5" />
                  <span>ORBIT ORCHESTRATOR</span>
                </div>

                <h2 className="mt-2 text-2xl font-bold tracking-tight text-[var(--text-primary)] sm:text-3xl lg:text-4xl">
                  ORBIT CONNECTS EVERYTHING AUTOMATICALLY.
                </h2>

                <p className="mt-4 text-base leading-relaxed text-[var(--text-secondary)]">
                  When a new event is detected, ORBIT automatically connects the different intelligence and analysis stages instead of requiring someone to move information between systems manually.
                </p>
              </div>

              {/* NEWS → RISK → DIGITAL TWIN → RESERVES → ASSESSMENT → COMMAND OVERVIEW */}
              <div className="mt-8 rounded-2xl border border-[var(--border-subtle)] bg-[var(--bg-card)] p-5 sm:p-6">
                <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-2.5 items-center">
                  {[
                    { label: 'NEWS', sub: 'Event intake' },
                    { label: 'RISK', sub: 'Impact scoring' },
                    { label: 'DIGITAL TWIN', sub: 'Asset tracing' },
                    { label: 'RESERVES', sub: 'Buffer evaluation' },
                    { label: 'ASSESSMENT', sub: 'Synthesis' },
                    { label: 'COMMAND OVERVIEW', sub: 'Decision ready' },
                  ].map((step, idx) => (
                    <div
                      key={step.label}
                      className="lp-card-hover rounded-xl border border-[var(--border-subtle)] bg-[var(--bg-surface)] p-3.5 text-center flex flex-col justify-center"
                    >
                      <span className="font-mono text-[10px] font-bold text-[var(--accent-energy)]">0{idx + 1}</span>
                      <span className="mt-1 text-xs font-bold text-[var(--text-primary)]">{step.label}</span>
                      <span className="mt-0.5 text-[10px] text-[var(--text-muted)]">{step.sub}</span>
                    </div>
                  ))}
                </div>

                <p className="mt-4 text-center font-mono text-xs font-bold text-[var(--accent-energy)]">
                  AUTOMATED HAND-OFF ACROSS ALL PIPELINE STAGES
                </p>
              </div>
            </div>
          </section>
        </Reveal>

        {/* ============================================================
            8. WHY ORBIT
            ============================================================ */}
        <Reveal>
          <section
            id="why-orbit"
            className="scroll-mt-24 bg-[var(--bg-secondary)] px-4 py-14 sm:px-6 lg:px-8 lg:py-16 border-b border-[var(--border-subtle)]"
          >
            <div className="mx-auto max-w-7xl">
              <div className="max-w-3xl">
                <span className="font-mono text-xs font-bold uppercase tracking-wider text-[var(--accent-energy)]">
                  WHY ORBIT
                </span>
                <h2 className="mt-2 text-2xl font-bold tracking-tight text-[var(--text-primary)] sm:text-3xl lg:text-4xl">
                  INTELLIGENCE THAT LEADS TO ACTION.
                </h2>
              </div>

              {/* Four Short Points */}
              <div className="mt-8 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
                <div className="lp-card-hover rounded-xl border border-[var(--border-subtle)] bg-[var(--bg-card)] p-5">
                  <span className="font-mono text-xs font-bold tracking-wider text-[var(--accent-energy)]">
                    SOURCE-BACKED
                  </span>
                  <p className="mt-2 text-sm text-[var(--text-secondary)]">
                    Understand where information comes from.
                  </p>
                </div>

                <div className="lp-card-hover rounded-xl border border-[var(--border-subtle)] bg-[var(--bg-card)] p-5">
                  <span className="font-mono text-xs font-bold tracking-wider text-[var(--accent-energy)]">
                    NETWORK-AWARE
                  </span>
                  <p className="mt-2 text-sm text-[var(--text-secondary)]">
                    See how disruptions can spread.
                  </p>
                </div>

                <div className="lp-card-hover rounded-xl border border-[var(--border-subtle)] bg-[var(--bg-card)] p-5">
                  <span className="font-mono text-xs font-bold tracking-wider text-[var(--accent-energy)]">
                    RESERVE-AWARE
                  </span>
                  <p className="mt-2 text-sm text-[var(--text-secondary)]">
                    Understand the available response.
                  </p>
                </div>

                <div className="lp-card-hover rounded-xl border border-[var(--border-subtle)] bg-[var(--bg-card)] p-5">
                  <span className="font-mono text-xs font-bold tracking-wider text-[var(--accent-energy)]">
                    AUTOMATED
                  </span>
                  <p className="mt-2 text-sm text-[var(--text-secondary)]">
                    Connect the analysis without manual intervention.
                  </p>
                </div>
              </div>

              <div className="mt-6">
                <SourceTraceVisual />
              </div>
            </div>
          </section>
        </Reveal>

        {/* ============================================================
            9. FINAL CTA
            ============================================================ */}
        <Reveal>
          <section className="scroll-mt-24 px-4 py-16 sm:px-6 lg:px-8 lg:py-20 relative">
            <div className="mx-auto max-w-4xl text-center">
              <div className="rounded-3xl border border-[var(--border-subtle)] bg-[var(--bg-card)] p-8 sm:p-12 lg:p-14 shadow-lg relative overflow-hidden">
                <div className="landing-hero-glow absolute inset-0 opacity-20 pointer-events-none" aria-hidden="true" />

                <h2 className="text-3xl font-bold tracking-tight text-[var(--text-primary)] sm:text-4xl lg:text-5xl leading-tight">
                  FROM GLOBAL EVENTS<br />
                  <span style={{ color: 'var(--accent-energy)' }}>TO ENERGY DECISIONS.</span>
                </h2>

                <p className="mt-4 max-w-xl mx-auto text-base text-[var(--text-secondary)]">
                  ORBIT turns global events into a clear picture of risk, impact, reserves, and response.
                </p>

                <div className="mt-8 flex justify-center">
                  <button
                    type="button"
                    onClick={primaryAction}
                    className="lp-btn-sweep inline-flex items-center gap-2 rounded-xl bg-[var(--accent-energy)] px-8 py-3.5 text-base font-bold text-white transition-all duration-200 hover:-translate-y-0.5 hover:opacity-95 shadow-md focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--accent-energy)] focus-visible:ring-offset-2"
                  >
                    <span>ENTER ORBIT</span>
                    <ArrowRight className="h-5 w-5" />
                  </button>
                </div>
              </div>
            </div>
          </section>
        </Reveal>
      </main>

      {/* ============================================================
          FOOTER
          ============================================================ */}
      <footer className="border-t border-[var(--border-subtle)] bg-[var(--bg-secondary)] px-4 py-6 text-sm text-[var(--text-muted)] sm:px-6 lg:px-8 relative z-10">
        <div className="mx-auto flex max-w-7xl flex-col items-start justify-between gap-4 sm:flex-row sm:items-center">
          <div className="flex items-center gap-2.5">
            <div className="h-2 w-2 rounded-full bg-[var(--accent-energy)]" />
            <span className="font-bold text-[var(--text-primary)]">ORBIT</span>
            <span className="text-xs sm:text-sm">
              Energy supply-chain intelligence from global events to energy decisions.
            </span>
          </div>
          <span className="font-mono text-xs">SOURCE-BACKED · SAFETY-AWARE · AUTOMATED</span>
        </div>
      </footer>
    </div>
  );
};
