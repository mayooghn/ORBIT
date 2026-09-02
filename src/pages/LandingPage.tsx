import React, { useEffect, useRef, useState } from 'react';
import {
  Activity,
  AlertTriangle,
  ArrowDown,
  ArrowRight,
  Compass,
  Database,
  Fuel,
  GitBranch,
  Lock,
  Menu,
  Network,
  Radar,
  ShieldCheck,
  Target,
  X,
  Zap,
} from 'lucide-react';
import { OrbitLogo } from '../components/common/OrbitLogo';

interface LandingPageProps {
  onNavigateToAuth: () => void;
  onNavigateToApp: () => void;
  isAuthenticated: boolean;
}

const NAV_ITEMS = [
  { label: 'Why ORBIT', href: '#why-orbit' },
  { label: 'Capabilities', href: '#capabilities' },
  { label: 'Use Cases', href: '#use-cases' },
  { label: 'Workflow', href: '#workflow' },
  { label: 'Security', href: '#security' },
];

const SIGNALS = [
  { icon: Database, label: 'Source traceability' },
  { icon: Network, label: 'Digital Twin mapping' },
  { icon: GitBranch, label: 'Deterministic scenarios' },
  { icon: ShieldCheck, label: 'Strategic reserve optimization' },
];

const CORE_PILLARS = [
  {
    number: '01',
    step: 'DETECT',
    title: 'Monitor geopolitical events',
    description: 'Monitor geopolitical and supply-chain events from source-backed intelligence.',
    icon: Radar,
  },
  {
    number: '02',
    step: 'UNDERSTAND',
    title: 'Assess risk & exposure',
    description: 'Assess how an event affects crude flows, suppliers, chokepoints, infrastructure, and energy exposure.',
    icon: Activity,
  },
  {
    number: '03',
    step: 'MAP',
    title: 'Trace digital twin impact',
    description: "Trace the impact across ORBIT's digital twin of the energy network.",
    icon: Network,
  },
  {
    number: '04',
    step: 'RESPOND',
    title: 'Test operational responses',
    description: 'Test procurement, scenario, and strategic reserve responses using deterministic operational models.',
    icon: ShieldCheck,
  },
];

const DIFFERENTIATORS = [
  {
    icon: Database,
    title: 'SOURCE-BACKED',
    subtitle: 'Evidence Traceability',
    description: 'Trace the evidence behind an event and its assessment. Every signal is anchored to verified source documents.',
  },
  {
    icon: Network,
    title: 'NETWORK-AWARE',
    subtitle: 'Physical Propagation',
    description: 'Understand how geopolitical events propagate through the energy system from chokepoints to refinery intake.',
  },
  {
    icon: Target,
    title: 'DECISION-READY',
    subtitle: 'Deterministic Models',
    description: 'Evaluate concrete response options through deterministic scenarios and reserve models that respect safety floors.',
  },
];

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
    title: 'Deterministic scenarios',
    description: 'Model alternative supplier capacity, rerouting timelines, and deterministic scenarios.',
  },
  {
    number: '05',
    phase: 'RESPOND',
    icon: ShieldCheck,
    title: 'Reserve decision',
    description: 'Calculate safe SPR release, enforce safety floors, and finalize action plans.',
  },
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

const SCENARIOS = [
  {
    id: 'baseline',
    label: 'BASELINE',
    description: 'Normal supply conditions',
    impact: 'LOW',
    risk: 'LOW',
    feasibility: 'AVAILABLE',
  },
  {
    id: 'chokepoint',
    label: 'CHOKEPOINT DISRUPTION',
    description: 'Maritime transit halt',
    impact: 'HIGH',
    risk: 'HIGH',
    feasibility: 'CONSTRAINED',
  },
  {
    id: 'shortfall',
    label: 'SUPPLY SHORTFALL',
    description: 'Reduced crude availability',
    impact: 'MEDIUM',
    risk: 'MEDIUM',
    feasibility: 'LIMITED',
  },
  {
    id: 'alternative',
    label: 'ALTERNATIVE ROUTE',
    description: 'Rerouting via secondary path',
    impact: 'LOW',
    risk: 'MEDIUM',
    feasibility: 'AVAILABLE',
  },
];

const RESERVE_STATES = [
  { level: 85, label: 'AVAILABLE BUFFER', color: 'var(--accent-emerald)' },
  { level: 60, label: 'SAFE ZONE', color: 'var(--accent-energy)' },
  { level: 30, label: 'MINIMUM FLOOR', color: 'var(--accent-crimson)' },
];

const RESPONSE_OPTIONS = [
  { label: 'OPTION A', title: 'Procurement shift', impact: 'LOW', risk: 'MEDIUM', feasibility: 'AVAILABLE', time: '2-5 days' },
  { label: 'OPTION B', title: 'Route diversion', impact: 'MEDIUM', risk: 'LOW', feasibility: 'AVAILABLE', time: '1-3 days' },
  { label: 'OPTION C', title: 'Reserve drawdown', impact: 'HIGH', risk: 'HIGH', feasibility: 'LIMITED', time: 'Immediate' },
  { label: 'OPTION D', title: 'Combined response', impact: 'LOW', risk: 'LOW', feasibility: 'AVAILABLE', time: '1-5 days' },
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
  { id: 'src', x: 46, y: 130, label: 'SOURCE SIGNALS', sub: 'geopolitical · maritime · market', activeAt: [0] },
  { id: 'event', x: 215, y: 130, label: 'EVENT', sub: 'Strait of Hormuz disruption', activeAt: [0] },
  { id: 'risk', x: 385, y: 130, label: 'RISK ENGINE', sub: 'flow vulnerability · exposure', activeAt: [1] },
  { id: 'twin', x: 545, y: 78, label: 'DIGITAL TWIN', sub: 'ports · refineries · pipelines', activeAt: [2, 3] },
  { id: 'decision', x: 660, y: 130, label: 'DECISION', sub: 'procurement · scenarios · reserves', activeAt: [4, 5] },
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

const STAGE_LABELS = ['DETECTING SIGNALS', 'ANALYZING EXPOSURE', 'MAPPING NETWORK', 'SIMULATING IMPACT', 'PREPARING RESPONSE', 'DECISION READY'] as const;

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
            ORBIT Decision Engine
          </span>
        </div>
        <span className="rounded-md border border-orange-200 bg-orange-50 px-2 py-0.5 font-mono text-[10px] font-medium text-orange-700">
          EXAMPLE WORKFLOW
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
        <text x="20" y="30" className="fill-[var(--text-faint)]" style={{ fontSize: 9, fontFamily: 'ui-monospace, monospace', letterSpacing: '0.18em' }}>INTAKE</text>
        <text x="20" y="236" className="fill-[var(--text-faint)]" style={{ fontSize: 9, fontFamily: 'ui-monospace, monospace', letterSpacing: '0.18em' }}>OUTPUT</text>

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
          <text x="663" y="132" textAnchor="middle" className="fill-[var(--accent-energy)]" style={{ fontSize: 9, fontWeight: 700, letterSpacing: '0.14em' }}>RESPONSE</text>
          <text x="663" y="149" textAnchor="middle" className="fill-[var(--accent-energy)]" style={{ fontSize: 9, fontWeight: 700, letterSpacing: '0.14em' }}>READY</text>
        </g>
      </svg>

      <div className="relative mt-3 flex items-center justify-between border-t border-[var(--border-subtle)] pt-2.5">
        <span className="font-mono text-[10px] uppercase tracking-[0.18em] text-[var(--text-muted)]">
          stage {String(stage + 1).padStart(2, '0')} / {FLOW_STAGES[stage]}
        </span>
        <span className={`font-mono text-[10px] transition-colors duration-400 ${isFinal ? 'text-orange-600' : 'text-orange-500'}`}>
          {isFinal ? 'PIPELINE COMPLETE' : STAGE_LABELS[stage]}
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
  variant?: 'default' | 'left' | 'right' | 'scale';
}> = ({ children, className, delay, variant = 'default' }) => {
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

  const variantClass = variant === 'left' ? 'orbit-reveal-left'
    : variant === 'right' ? 'orbit-reveal-right'
    : variant === 'scale' ? 'orbit-reveal-scale'
    : '';

  return (
    <div
      ref={ref}
      className={`${variantClass || 'orbit-reveal'} ${className || ''}`}
      style={delay ? { '--orbit-reveal-delay': `${delay}ms` } as React.CSSProperties : undefined}
    >
      {children}
    </div>
  );
};

/* ==========================================================================
   INTERACTIVE NETWORK VISUALIZATION
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
          Connected
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
              className="lp-network-node"
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
          <span className="text-xs text-[var(--text-muted)]">Hover a node to inspect</span>
        )}
      </div>
    </div>
  );
};

/* ==========================================================================
   SCENARIO MODELLING VISUALIZATION
   ========================================================================== */
const ScenarioVisualization: React.FC = () => {
  const [selected, setSelected] = useState('baseline');
  const current = SCENARIOS.find((s) => s.id === selected)!;

  return (
    <div className="rounded-2xl border border-[var(--border-subtle)] bg-[var(--bg-card)] p-5">
      <div className="mb-4 flex items-center justify-between border-b border-[var(--border-subtle)] pb-3">
        <span className="text-xs font-semibold uppercase tracking-wider text-[var(--text-muted)]">
          Scenario Modelling
        </span>
        <span className="rounded border border-orange-200 bg-orange-50 px-2 py-0.5 font-mono text-[10px] font-semibold text-orange-700">
          DEMO
        </span>
      </div>

      <div className="mb-4 flex flex-col gap-2">
        {SCENARIOS.map((scenario) => (
          <button
            key={scenario.id}
            type="button"
            onClick={() => setSelected(scenario.id)}
            className={`lp-scenario-select rounded-lg border p-3 text-left ${selected === scenario.id ? 'is-selected border-[var(--accent-energy)] bg-orange-50/60' : 'border-[var(--border-subtle)] bg-[var(--bg-surface)]'}`}
          >
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold uppercase tracking-wider text-[var(--text-primary)]">{scenario.label}</span>
              <span className={`font-mono text-[10px] font-semibold ${scenario.impact === 'HIGH' ? 'text-red-600' : scenario.impact === 'MEDIUM' ? 'text-orange-600' : 'text-emerald-600'}`}>
                {scenario.impact} IMPACT
              </span>
            </div>
            <span className="text-xs text-[var(--text-secondary)]">{scenario.description}</span>
          </button>
        ))}
      </div>

      <div className="grid grid-cols-3 gap-3 border-t border-[var(--border-subtle)] pt-4">
        <div className="text-center">
          <span className="block font-mono text-[11px] uppercase tracking-wider text-[var(--text-faint)]">Risk</span>
          <span className={`block text-sm font-bold ${current.risk === 'HIGH' ? 'text-red-600' : current.risk === 'MEDIUM' ? 'text-orange-600' : 'text-emerald-600'}`}>
            {current.risk}
          </span>
        </div>
        <div className="text-center">
          <span className="block font-mono text-[11px] uppercase tracking-wider text-[var(--text-faint)]">Impact</span>
          <span className={`block text-sm font-bold ${current.impact === 'HIGH' ? 'text-red-600' : current.impact === 'MEDIUM' ? 'text-orange-600' : 'text-emerald-600'}`}>
            {current.impact}
          </span>
        </div>
        <div className="text-center">
          <span className="block font-mono text-[11px] uppercase tracking-wider text-[var(--text-faint)]">Feasibility</span>
          <span className={`block text-sm font-bold ${current.feasibility === 'CONSTRAINED' ? 'text-red-600' : current.feasibility === 'LIMITED' ? 'text-orange-600' : 'text-emerald-600'}`}>
            {current.feasibility}
          </span>
        </div>
      </div>
    </div>
  );
};

/* ==========================================================================
   RESERVE GAUGE VISUALIZATION
   ========================================================================== */
const ReserveGauge: React.FC = () => {
  const [level, setLevel] = useState(85);
  const [reduced, setReduced] = useState(false);

  useEffect(() => {
    const mq = window.matchMedia('(prefers-reduced-motion: reduce)');
    const update = () => setReduced(mq.matches);
    update();
    mq.addEventListener('change', update);
    return () => mq.removeEventListener('change', update);
  }, []);

  useEffect(() => {
    if (reduced) return;
    const t = setInterval(() => {
      setLevel((prev) => {
        if (prev <= 45) return 85;
        return prev - 0.8;
      });
    }, 200);
    return () => clearInterval(t);
  }, [reduced]);

  return (
    <div className="rounded-2xl border border-[var(--border-subtle)] bg-[var(--bg-card)] p-5">
      <div className="mb-4 flex items-center justify-between border-b border-[var(--border-subtle)] pb-3">
        <span className="text-xs font-semibold uppercase tracking-wider text-[var(--text-muted)]">
          Reserve Model
        </span>
        <span className="font-mono text-[10px] text-[var(--text-muted)]">DRAWDOWN SIMULATION</span>
      </div>

      <div className="space-y-3">
        <div className="flex items-center justify-between text-xs">
          <span className="font-semibold text-[var(--text-primary)]">Strategic Reserve Level</span>
          <span className="font-mono font-bold text-[var(--accent-energy)]">{Math.round(level)}%</span>
        </div>

        <div className="relative h-6 overflow-hidden rounded-full bg-[var(--bg-surface)]" style={{ border: '1px solid var(--border-subtle)' }}>
          <div
            className="lp-reserve-bar absolute left-0 top-0 h-full rounded-full"
            style={{
              width: `${level}%`,
              background: level > 60 ? 'var(--accent-emerald)' : level > 30 ? 'var(--accent-energy)' : 'var(--accent-crimson)',
              transition: reduced ? 'none' : 'width 0.3s ease',
            }}
          />
          <div className="absolute left-0 top-0 flex h-full w-full items-center">
            <div className="ml-2 h-3 w-px bg-white/40" style={{ marginLeft: '60%' }} />
            <span className="ml-1 font-mono text-[10px] text-white/70">SAFE</span>
          </div>
        </div>

        <div className="grid grid-cols-3 gap-2 text-center">
          {RESERVE_STATES.map((state) => (
            <div key={state.label} className="rounded border border-[var(--border-subtle)] bg-[var(--bg-surface)] p-2">
              <div className="mx-auto mb-1 h-1 w-8 rounded-full" style={{ background: state.color, opacity: 0.6 }} />
              <span className="block font-mono text-[10px] uppercase tracking-wider text-[var(--text-faint)]">{state.label}</span>
            </div>
          ))}
        </div>

        <div className="rounded-lg border border-[var(--border-subtle)] bg-[var(--bg-surface)] p-3">
          <div className="flex items-center justify-between">
            <div>
              <span className="block text-xs font-bold uppercase tracking-wider text-[var(--accent-energy)]">Current Draw Rate</span>
              <span className="text-xs text-[var(--text-secondary)]">Buffer consumption during disruption</span>
            </div>
            <span className="font-mono text-sm font-bold text-[var(--text-primary)]">{level > 60 ? 'Sustainable' : level > 30 ? 'Monitor' : 'Critical'}</span>
          </div>
        </div>
      </div>
    </div>
  );
};

/* ==========================================================================
   DECISION PANEL PREVIEW
   ========================================================================== */
const DecisionPreview: React.FC = () => {
  const [step, setStep] = useState(0);
  const [reduced, setReduced] = useState(false);

  useEffect(() => {
    const mq = window.matchMedia('(prefers-reduced-motion: reduce)');
    const update = () => setReduced(mq.matches);
    update();
    mq.addEventListener('change', update);
    return () => mq.removeEventListener('change', update);
  }, []);

  useEffect(() => {
    if (reduced) { setStep(5); return; }
    const t = setInterval(() => setStep((s) => (s + 1) % 6), 2000);
    return () => clearInterval(t);
  }, [reduced]);

  const steps = [
    { label: 'EVENT', value: 'Strait of Hormuz disruption detected', active: step >= 0 },
    { label: 'EXPOSURE', value: 'Crude transit: 2.1M bbl/day affected', active: step >= 1 },
    { label: 'IMPACT', value: 'Refinery intake constraint: 14-day window', active: step >= 2 },
    { label: 'SCENARIO', value: 'Chokepoint closure (primary model)', active: step >= 3 },
    { label: 'OPTIONS', value: 'Route diversion + SPR release available', active: step >= 4 },
    { label: 'STATUS', value: 'Decision ready for operator review', active: step >= 5 },
  ];

  return (
    <div className="rounded-2xl border border-[var(--border-subtle)] bg-[var(--bg-card)] p-5 lp-decision-activate">
      <div className="mb-4 flex items-center justify-between border-b border-[var(--border-subtle)] pb-3">
        <div className="flex items-center gap-2">
          <span className="h-2 w-2 rounded-full bg-[var(--accent-energy)] lp-signal-pulse" />
          <span className="text-xs font-semibold uppercase tracking-wider text-[var(--text-primary)]">
            Decision Panel
          </span>
        </div>
        <span className="rounded border border-orange-200 bg-orange-50 px-2 py-0.5 font-mono text-[10px] font-semibold text-orange-700">
          LIVE PREVIEW
        </span>
      </div>

      <div className="space-y-2">
        {steps.map((s, i) => (
          <div
            key={s.label}
            className={`flex items-center justify-between rounded-lg border p-3 transition-all duration-300 ${
              s.active
                ? 'border-orange-200 bg-orange-50/50'
                : 'border-[var(--border-subtle)] bg-[var(--bg-surface)] opacity-40'
            }`}
          >
            <div className="flex items-center gap-3">
              <span className={`font-mono text-[10px] font-bold tracking-wider ${s.active ? 'text-[var(--accent-energy)]' : 'text-[var(--text-faint)]'}`}>
                {s.label}
              </span>
              <span className="text-xs font-semibold text-[var(--text-primary)]">{s.value}</span>
            </div>
            {s.active && i === step && (
              <span className="h-1.5 w-1.5 rounded-full bg-[var(--accent-energy)] lp-signal-pulse" />
            )}
          </div>
        ))}
      </div>
    </div>
  );
};

/* ==========================================================================
   SOURCE TRACEABILITY VISUAL
   ========================================================================== */
const SourceTraceVisual: React.FC = () => {
  const [activeStep, setActiveStep] = useState(-1);
  const ref = useRef<HTMLDivElement>(null);
  const [reduced, setReduced] = useState(false);

  useEffect(() => {
    const mq = window.matchMedia('(prefers-reduced-motion: reduce)');
    const update = () => setReduced(mq.matches);
    update();
    mq.addEventListener('change', update);
    return () => mq.removeEventListener('change', update);
  }, []);

  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    if (reduced) { setActiveStep(4); return; }

    const observer = new IntersectionObserver(
      ([entry]) => {
        if (!entry.isIntersecting) { setActiveStep(-1); return; }
        let step = 0;
        const advance = () => {
          setActiveStep(step);
          step++;
          if (step <= 4) setTimeout(advance, 600);
        };
        advance();
      },
      { threshold: 0.35 },
    );
    observer.observe(el);
    return () => observer.disconnect();
  }, [reduced]);

  const steps = [
    { label: 'SOURCE', sub: 'Verified document', icon: Database },
    { label: 'SIGNAL', sub: 'Intelligence feed', icon: Zap },
    { label: 'EVENT', sub: 'Classified event', icon: AlertTriangle },
    { label: 'ASSESSMENT', sub: 'Risk evaluation', icon: Activity },
    { label: 'DECISION', sub: 'Operational response', icon: Target },
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
              <div className="flex flex-col items-center gap-2">
                <div
                  className={`flex h-10 w-10 items-center justify-center rounded-lg border transition-all duration-300 ${
                    isActive
                      ? 'border-[var(--accent-energy)] bg-orange-50 text-[var(--accent-energy)]'
                      : 'border-[var(--border-subtle)] bg-[var(--bg-surface)] text-[var(--text-faint)]'
                  }`}
                >
                  <Icon className="h-4 w-4" />
                </div>
                <span className={`text-[10px] font-bold uppercase tracking-wider transition-colors duration-300 ${isActive ? 'text-[var(--accent-energy)]' : 'text-[var(--text-faint)]'}`}>
                  {s.label}
                </span>
                <span className="text-[10px] text-[var(--text-muted)]">{s.sub}</span>
              </div>
              {i < steps.length - 1 && (
                <div className="flex-1 px-2">
                  <div
                    className="h-px transition-all duration-500"
                    style={{
                      background: activeStep > i ? 'var(--accent-energy)' : 'var(--border-subtle)',
                      opacity: activeStep > i ? 1 : 0.4,
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
   DATA ROUTING WINDOW
   ========================================================================== */
const ROUTING_STAGES = [
  { label: 'SOURCE SIGNAL', detail: 'Maritime intelligence', status: 'RECEIVED' },
  { label: 'EVENT DETECTED', detail: 'Strait of Hormuz disruption', status: 'ANALYZING' },
  { label: 'RISK ENGINE', detail: 'Flow vulnerability assessment', status: 'PROCESSING' },
  { label: 'DIGITAL TWIN', detail: 'Network impact mapping', status: 'MAPPING' },
  { label: 'ROUTING', detail: 'Digital twin integration', status: 'ROUTING TO MODEL' },
  { label: 'DECISION READY', detail: 'Response options prepared', status: 'COMPLETE' },
] as const;

const DataRoutingWindow: React.FC = () => {
  const [activeStep, setActiveStep] = useState(0);
  const [reduced, setReduced] = useState(false);
  const sectionRef = useRef<HTMLDivElement>(null);
  const isVisible = useRef(false);
  const intervalRef = useRef<number | null>(null);
  const timeoutRef = useRef<number | null>(null);

  useEffect(() => {
    const mq = window.matchMedia('(prefers-reduced-motion: reduce)');
    const update = () => setReduced(mq.matches);
    update();
    mq.addEventListener('change', update);
    return () => mq.removeEventListener('change', update);
  }, []);

  useEffect(() => {
    const el = sectionRef.current;
    if (!el) return;
    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting && !isVisible.current) {
          isVisible.current = true;
          if (!reduced) {
            let step = 0;
            intervalRef.current = window.setInterval(() => {
              step++;
              if (step >= ROUTING_STAGES.length) {
                if (intervalRef.current) window.clearInterval(intervalRef.current);
                timeoutRef.current = window.setTimeout(() => {
                  step = 0;
                  setActiveStep(0);
                  isVisible.current = false;
                }, 3000);
              }
              setActiveStep(step);
            }, 1800);
          }
        }
      },
      { threshold: 0.3 }
    );
    observer.observe(el);
    return () => {
      observer.disconnect();
      if (intervalRef.current) window.clearInterval(intervalRef.current);
      if (timeoutRef.current) window.clearTimeout(timeoutRef.current);
    };
  }, [reduced]);

  return (
    <div ref={sectionRef} className="lp-data-routing" role="img" aria-label="ORBIT data routing pipeline">
      <div className="flex items-center justify-between border-b border-[var(--border-subtle)] px-4 py-2.5">
        <div className="flex items-center gap-2">
          <span className={`inline-block h-2 w-2 rounded-full ${activeStep > 0 ? 'bg-[var(--accent-energy)]' : 'bg-[var(--text-muted)]'}`} style={{ transition: 'background 0.4s ease' }} />
          <span className="text-[11px] font-semibold uppercase tracking-[0.14em] text-[var(--text-primary)]">
            SOURCE SIGNAL
          </span>
        </div>
        <span className={`font-mono text-[10px] transition-colors duration-500 ${activeStep >= ROUTING_STAGES.length - 1 ? 'text-[var(--accent-emerald)]' : 'text-[var(--accent-energy)]'}`}>
          {ROUTING_STAGES[Math.min(activeStep, ROUTING_STAGES.length - 1)].status}
        </span>
      </div>
      {ROUTING_STAGES.map(({ label, detail, status }, i) => {
        const isActive = i === activeStep;
        const isComplete = i < activeStep;
        return (
          <div key={label} className={`lp-routing-row ${isActive ? 'is-active' : ''}`}>
            <span className={`lp-routing-dot ${isActive ? 'is-active' : ''} ${isComplete ? 'is-complete' : ''}`} />
            <div className="flex-1">
              <span className={`text-xs font-semibold ${isActive ? 'text-[var(--accent-energy)]' : isComplete ? 'text-[var(--text-primary)]' : 'text-[var(--text-muted)]'}`} style={{ transition: 'color 0.4s ease' }}>
                {label}
              </span>
              <span className="ml-2 text-xs text-[var(--text-muted)]">{detail}</span>
            </div>
            <span className={`font-mono text-[10px] ${isActive ? 'text-[var(--accent-energy)]' : isComplete ? 'text-[var(--accent-emerald)]' : 'text-[var(--text-faint)]'}`} style={{ transition: 'color 0.4s ease' }}>
              {status}
            </span>
          </div>
        );
      })}
    </div>
  );
};

/* ==========================================================================
   RESPONSE COMPARISON VISUAL
   ========================================================================== */
const ResponseComparison: React.FC = () => {
  const [selected, setSelected] = useState(0);

  return (
    <div className="rounded-2xl border border-[var(--border-subtle)] bg-[var(--bg-card)] p-5">
      <div className="mb-4 flex items-center justify-between border-b border-[var(--border-subtle)] pb-3">
        <span className="text-xs font-semibold uppercase tracking-wider text-[var(--text-muted)]">
          Response Comparison
        </span>
        <span className="font-mono text-[10px] text-[var(--text-muted)]">OPTION ANALYSIS</span>
      </div>

      <div className="space-y-2">
        {RESPONSE_OPTIONS.map((opt, i) => (
          <button
            key={opt.label}
            type="button"
            onClick={() => setSelected(i)}
            className={`w-full rounded-lg border p-3 text-left transition-all duration-300 ${
              selected === i
                ? 'border-[var(--accent-energy)] bg-orange-50/60'
                : 'border-[var(--border-subtle)] bg-[var(--bg-surface)] hover:border-orange-200'
            }`}
          >
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <span className="font-mono text-[10px] font-bold tracking-wider text-[var(--accent-energy)]">{opt.label}</span>
                <span className="text-xs font-semibold text-[var(--text-primary)]">{opt.title}</span>
              </div>
              <span className="font-mono text-[10px] text-[var(--text-muted)]">{opt.time}</span>
            </div>

            {selected === i && (
              <div className="mt-3 grid grid-cols-3 gap-2 border-t border-orange-200 pt-2">
                <div>
                  <span className="block font-mono text-[10px] uppercase text-[var(--text-faint)]">Impact</span>
                  <span className={`block text-xs font-bold ${opt.impact === 'HIGH' ? 'text-red-600' : opt.impact === 'MEDIUM' ? 'text-orange-600' : 'text-emerald-600'}`}>{opt.impact}</span>
                </div>
                <div>
                  <span className="block font-mono text-[10px] uppercase text-[var(--text-faint)]">Risk</span>
                  <span className={`block text-xs font-bold ${opt.risk === 'HIGH' ? 'text-red-600' : opt.risk === 'MEDIUM' ? 'text-orange-600' : 'text-emerald-600'}`}>{opt.risk}</span>
                </div>
                <div>
                  <span className="block font-mono text-[10px] uppercase text-[var(--text-faint)]">Feasibility</span>
                  <span className={`block text-xs font-bold ${opt.feasibility === 'CONSTRAINED' ? 'text-red-600' : opt.feasibility === 'LIMITED' ? 'text-orange-600' : 'text-emerald-600'}`}>{opt.feasibility}</span>
                </div>
              </div>
            )}
          </button>
        ))}
      </div>
    </div>
  );
};

/* ==========================================================================
   MAIN LANDING PAGE
   ========================================================================== */
export const LandingPage: React.FC<LandingPageProps> = ({
  onNavigateToAuth,
  onNavigateToApp,
  isAuthenticated,
}) => {
  const [mobileNavOpen, setMobileNavOpen] = useState(false);
  const [activeItem, setActiveItem] = useState<string>('Why ORBIT');
  const [scrolled, setScrolled] = useState(false);
  const [scrollPct, setScrollPct] = useState(0);
  const [heroStatusIdx, setHeroStatusIdx] = useState(0);
  const isManualScrollRef = useRef<boolean>(false);
  const scrollTimeoutRef = useRef<number | null>(null);

  const primaryAction = isAuthenticated ? onNavigateToApp : onNavigateToAuth;
  const primaryLabel = isAuthenticated ? 'Dashboard' : 'Sign in';

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
        setActiveItem('Why ORBIT');
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

  // Hero status indicator cycling
  useEffect(() => {
    const mq = window.matchMedia('(prefers-reduced-motion: reduce)');
    if (mq.matches) return;
    const t = window.setInterval(() => {
      setHeroStatusIdx((prev) => (prev + 1) % 4);
    }, 2800);
    return () => window.clearInterval(t);
  }, []);

  return (
    <div className="orbit-landing min-h-screen bg-[var(--bg-primary)] text-[var(--text-primary)] selection:bg-orange-500/20">
      {/* Scroll progress indicator */}
      <div className="lp-scroll-progress" style={{ transform: `scaleX(${scrollPct})` }} aria-hidden="true" />

      {/* ============================================================
          NAVBAR
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
            onClick={(e) => scrollToSection(e, 'Why ORBIT', '#top')}
            className="flex items-center gap-2.5"
            aria-label="ORBIT home"
          >
            <OrbitLogo size="md" showWordmark={true} variant="light" />
          </a>

          <nav className="hidden items-center gap-1 lg:flex" aria-label="Landing page navigation">
            {NAV_ITEMS.map((item) => {
              const isActive = activeItem === item.label;
              return (
                <a
                  key={item.label}
                  href={item.href}
                  onClick={(e) => scrollToSection(e, item.label, item.href)}
                  className={`lp-nav-active rounded-md px-3 py-1.5 text-[13px] font-medium transition-all duration-200 ${
                    isActive
                      ? 'lp-nav-active is-active text-[var(--text-primary)]'
                      : 'text-[var(--text-muted)] hover:text-[var(--text-primary)]'
                  }`}
                >
                  {item.label}
                </a>
              );
            })}
          </nav>

          <div className="flex items-center gap-3">
            {!isAuthenticated ? (
              <>
                <button
                  type="button"
                  onClick={primaryAction}
                  className="hidden cursor-pointer rounded-lg border border-transparent px-3.5 py-1.5 text-[13px] font-medium text-[var(--text-secondary)] transition-all duration-200 hover:border-orange-300/80 hover:bg-orange-50 hover:text-orange-600 hover:shadow-sm active:scale-95 active:bg-orange-100 active:border-orange-400 active:text-orange-700 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-orange-500/40 sm:block"
                >
                  Sign in
                </button>
                <button
                  type="button"
                  onClick={onNavigateToAuth}
                  className="lp-btn-sweep hidden rounded-lg bg-[var(--text-primary)] px-4 py-2 text-[13px] font-semibold text-white transition-all duration-200 hover:-translate-y-0.5 hover:opacity-90 sm:inline-flex"
                >
                  Get started
                </button>
              </>
            ) : (
              <button
                type="button"
                onClick={primaryAction}
                className="lp-btn-sweep hidden rounded-lg bg-[var(--accent-energy)] px-4 py-2 text-[13px] font-semibold text-white transition-all duration-200 hover:-translate-y-0.5 hover:opacity-90 sm:inline-flex"
              >
                Dashboard
              </button>
            )}
            <button
              type="button"
              aria-label={mobileNavOpen ? 'Close navigation' : 'Open navigation'}
              aria-expanded={mobileNavOpen}
              onClick={() => setMobileNavOpen((open) => !open)}
              className="rounded-md p-2 text-[var(--text-secondary)] transition-colors hover:text-[var(--text-primary)] lg:hidden"
            >
              {mobileNavOpen ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
            </button>
          </div>
        </div>

        {mobileNavOpen && (
          <nav
            className="border-t border-[var(--border-subtle)] bg-white px-4 py-4 lg:hidden"
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
                  className="rounded-md px-3 py-2.5 text-sm font-medium text-[var(--text-secondary)] transition-colors hover:bg-[var(--bg-surface)] hover:text-[var(--text-primary)]"
                >
                  {item.label}
                </a>
              ))}
              <div className="mt-3 flex flex-col gap-2 border-t border-[var(--border-subtle)] pt-3">
                <button
                  type="button"
                  onClick={() => {
                    setMobileNavOpen(false);
                    primaryAction();
                  }}
                  className="rounded-lg bg-[var(--text-primary)] px-4 py-2.5 text-sm font-semibold text-white"
                >
                  {isAuthenticated ? 'Dashboard' : 'Get started'}
                </button>
              </div>
            </div>
          </nav>
        )}
      </header>

      <main id="top" className="pt-16 scroll-mt-20 relative">
        {/* ============================================================
            HERO
            ============================================================ */}
        <section className="relative overflow-hidden px-4 pb-12 pt-12 sm:px-6 sm:pb-16 sm:pt-16 lg:px-8 lg:pb-20 lg:pt-20">
          <div className="landing-hero-glow lp-parallax absolute left-1/2 top-0 h-[20rem] w-[30rem] -translate-x-1/2 rounded-full opacity-10" aria-hidden="true" />

          <div className="relative mx-auto grid max-w-7xl items-center gap-8 lg:grid-cols-[1.1fr_0.9fr] lg:gap-12">
            <div>
              <div className="mb-6 inline-flex items-center gap-2 rounded-full border border-[var(--border-subtle)] bg-[var(--bg-surface)] px-3 py-1.5">
                <span className="h-1.5 w-1.5 rounded-full bg-[var(--accent-energy)]" aria-hidden="true" />
                <span className="text-[11px] font-semibold uppercase tracking-[0.14em] text-[var(--accent-energy)]">
                  Energy supply-chain intelligence
                </span>
              </div>

              <div className="mb-6 flex flex-wrap gap-2">
                {['ANALYZING SIGNALS', 'ROUTING EVENTS', 'MAPPING EXPOSURE', 'MODEL READY'].map((status, i) => (
                  <div key={status} className={`lp-hero-status ${i <= heroStatusIdx ? 'is-active' : ''}`}>
                    <span className="lp-hero-status-dot" />
                    <span>{status}</span>
                  </div>
                ))}
              </div>

              <h1 className="max-w-2xl text-4xl font-bold leading-[1.08] tracking-[-0.03em] text-[var(--text-primary)] sm:text-5xl lg:text-[3.75rem]">
                <span className="lp-hero-word">From</span>{' '}
                <span className="lp-hero-word">geopolitical</span>{' '}
                <span className="lp-hero-word">events</span>{' '}
                <span className="lp-hero-word">to</span>{' '}
                <span className="lp-hero-word lp-orange-interactive" style={{ color: 'var(--accent-energy)' }}>energy</span>{' '}
                <span className="lp-hero-word">decisions</span>
              </h1>

              <p className="mt-6 max-w-xl text-lg leading-[1.75] text-[var(--text-secondary)] sm:text-xl">
                ORBIT analyzes how global disruptions affect energy supply chains, maps infrastructure
                exposure, and evaluates response options before a crisis becomes an operational problem.
              </p>

              <div className="mt-8 flex flex-col items-stretch gap-3 sm:flex-row sm:items-center">
                <a
                  id="hero-primary-cta"
                  href="#why-orbit"
                  onClick={(e) => scrollToSection(e, 'Why ORBIT', '#why-orbit')}
                  className="lp-btn-sweep inline-flex items-center justify-center gap-2 rounded-lg bg-[var(--text-primary)] px-6 py-3.5 text-base font-semibold text-white transition-all duration-200 hover:-translate-y-0.5 hover:opacity-90 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--accent-energy)] focus-visible:ring-offset-2"
                >
                  <span>Explore ORBIT</span>
                  <ArrowRight className="lp-btn-arrow h-4 w-4" />
                </a>
                <button
                  type="button"
                  onClick={primaryAction}
                  className="lp-btn-sweep inline-flex items-center justify-center gap-2 rounded-lg border border-[var(--border-emphasis)] bg-transparent px-6 py-3.5 text-base font-semibold text-[var(--text-primary)] transition-all duration-200 hover:-translate-y-0.5 hover:border-[var(--accent-energy)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--accent-energy)] focus-visible:ring-offset-2"
                >
                  <Lock className="h-4 w-4 text-[var(--text-muted)]" />
                  <span>Sign in to operator console</span>
                </button>
              </div>

              <div className="mt-8 flex flex-wrap gap-x-6 gap-y-3 border-t border-[var(--border-subtle)] pt-6">
                {SIGNALS.map(({ icon: Icon, label }) => (
                  <div key={label} className="flex items-center gap-2 text-sm font-medium text-[var(--text-muted)]">
                    <Icon className="h-3.5 w-3.5 text-[var(--accent-energy)]" />
                    <span>{label}</span>
                  </div>
                ))}
              </div>
            </div>

            <HeroFlowVisual />
          </div>
        </section>

        {/* ============================================================
            WHY ORBIT — One system from detection to response
            ============================================================ */}
        <Reveal>
          <section
            id="why-orbit"
            className="scroll-mt-24 border-y border-[var(--border-subtle)] bg-[var(--bg-secondary)] px-4 py-12 sm:px-6 lg:px-8 lg:py-16 relative"
          >
            <div className="mx-auto max-w-7xl">
              <div className="max-w-3xl">
                <p className="text-[11px] font-semibold uppercase tracking-[0.2em] text-[var(--accent-energy)]">
                  Why ORBIT
                </p>
                <h2 className="mt-3 text-3xl font-bold tracking-tight text-[var(--text-primary)] sm:text-4xl">
                  One system from event detection to{' '}
                  <span style={{ color: 'var(--accent-energy)' }}>response</span>
                </h2>
                <p className="mt-4 text-lg leading-[1.75] text-[var(--text-secondary)]">
                  ORBIT connects geopolitical intelligence with the physical energy network, allowing
                  operators to understand what changed, where the exposure sits, and what response options
                  are available.
                </p>
              </div>

              <div className="mt-12 grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4 lp-stagger">
                {CORE_PILLARS.map(({ number, step, title, description, icon: Icon }) => (
                  <article
                    key={number}
                    className="lp-card-hover lp-card-border-glow group rounded-xl border border-[var(--border-subtle)] bg-[var(--bg-card)] p-6"
                  >
                    <div className="flex items-center justify-between">
                      <span className="font-mono text-xs font-bold tracking-[0.2em] text-[var(--accent-energy)]">
                        {number} — {step}
                      </span>
                      <div className="lp-card-icon lp-cap-icon-pulse flex h-9 w-9 items-center justify-center rounded-lg border border-orange-100 bg-orange-50 text-[var(--accent-energy)]">
                        <Icon className="h-4 w-4" />
                      </div>
                    </div>
                    <h3 className="mt-5 text-lg font-semibold text-[var(--text-primary)]">{title}</h3>
                    <p className="mt-2 text-sm leading-6 text-[var(--text-secondary)]">{description}</p>
                    <div className="lp-card-signal-line" aria-hidden="true" />
                  </article>
                ))}
              </div>
            </div>
          </section>
        </Reveal>

        {/* ============================================================
            CORE CAPABILITIES — 4 Key Operational Deep-Dives
            ============================================================ */}
        <div id="capabilities" className="scroll-mt-24">
          {/* 1. Digital Twin Network */}
          <Reveal>
            <section className="px-4 py-12 sm:px-6 lg:px-8 lg:py-16 relative border-b border-[var(--border-subtle)]">
              <div className="mx-auto max-w-7xl">
                <div className="grid gap-12 lg:grid-cols-[1.1fr_0.9fr] lg:items-center">
                  <div>
                    <p className="text-[11px] font-semibold uppercase tracking-[0.2em] text-[var(--accent-energy)]">
                      Digital Twin Network
                    </p>
                    <h2 className="mt-3 text-3xl font-bold tracking-tight text-[var(--text-primary)] sm:text-4xl">
                      See the energy network behind the event
                    </h2>
                    <p className="mt-5 text-lg leading-[1.75] text-[var(--text-secondary)]">
                      When a geopolitical disruption occurs, ORBIT does not stop at the headline. Its Digital
                      Twin connects the event to suppliers, trade routes, infrastructure, refineries,
                      chokepoints, and other network dependencies so operators can trace physical propagation.
                    </p>

                    <div className="mt-8 grid grid-cols-2 gap-4">
                      <div className="rounded-lg border border-[var(--border-subtle)] bg-[var(--bg-card)] p-4">
                        <div className="flex items-center gap-2 text-sm font-semibold text-[var(--accent-energy)]">
                          <Fuel className="h-4 w-4" />
                          <span>Supply & Routes</span>
                        </div>
                        <p className="mt-2 text-sm leading-6 text-[var(--text-secondary)]">
                          Tracks crude contracts, tanker origins, and chokepoint transit volumes.
                        </p>
                      </div>
                      <div className="rounded-lg border border-[var(--border-subtle)] bg-[var(--bg-card)] p-4">
                        <div className="flex items-center gap-2 text-sm font-semibold text-[var(--accent-energy)]">
                          <Network className="h-4 w-4" />
                          <span>Physical Assets</span>
                        </div>
                        <p className="mt-2 text-sm leading-6 text-[var(--text-secondary)]">
                          Connects deep-water ports, crude pipelines, and inland refinery clusters.
                        </p>
                      </div>
                    </div>
                  </div>

                  <NetworkVisualization />
                </div>

                <div className="mt-8">
                  <DataRoutingWindow />
                </div>
              </div>
            </section>
          </Reveal>

          {/* 2. Scenario Modelling */}
          <Reveal>
            <section className="bg-[var(--bg-secondary)] px-4 py-12 sm:px-6 lg:px-8 lg:py-16 border-b border-[var(--border-subtle)]">
              <div className="mx-auto max-w-7xl">
                <div className="grid gap-8 lg:grid-cols-[1fr_1fr] lg:items-start">
                  <div>
                    <p className="text-[11px] font-semibold uppercase tracking-[0.2em] text-[var(--accent-energy)]">
                      Scenario Modelling
                    </p>
                    <h2 className="mt-3 text-3xl font-bold tracking-tight text-[var(--text-primary)] sm:text-4xl">
                      Model the disruption before it becomes a{' '}
                      <span style={{ color: 'var(--accent-energy)' }}>crisis</span>
                    </h2>
                    <p className="mt-5 text-lg leading-[1.75] text-[var(--text-secondary)]">
                      ORBIT does not simply say "this event is risky." It helps evaluate
                      "what happens if?" Different assumptions can be tested across deterministic scenarios.
                    </p>

                    <div className="mt-6 space-y-3">
                      {SCENARIOS.map((s) => (
                        <div key={s.id} className="flex items-start gap-3">
                          <div className="mt-1 h-2 w-2 shrink-0 rounded-full bg-[var(--accent-energy)]" />
                          <div>
                            <span className="text-sm font-semibold text-[var(--text-primary)]">{s.label}</span>
                            <span className="ml-2 text-sm text-[var(--text-secondary)]">— {s.description}</span>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>

                  <ScenarioVisualization />
                </div>
              </div>
            </section>
          </Reveal>

          {/* 3. Strategic Reserve Optimization */}
          <Reveal>
            <section className="px-4 py-12 sm:px-6 lg:px-8 lg:py-16 border-b border-[var(--border-subtle)]">
              <div className="mx-auto max-w-7xl">
                <div className="grid gap-8 lg:grid-cols-[1fr_1fr] lg:items-center">
                  <ReserveGauge />

                  <div>
                    <p className="text-[11px] font-semibold uppercase tracking-[0.2em] text-[var(--accent-energy)]">
                      Strategic Reserve Optimization
                    </p>
                    <h2 className="mt-3 text-3xl font-bold tracking-tight text-[var(--text-primary)] sm:text-4xl">
                      Test how much reserve can{' '}
                      <span style={{ color: 'var(--accent-energy)' }}>safely</span> be released
                    </h2>
                    <p className="mt-5 text-lg leading-[1.75] text-[var(--text-secondary)]">
                      ORBIT models strategic petroleum reserve as an operational system. Operators can
                      evaluate disruption scenarios, calculate reserve drawdown requirements, account for
                      alternative procurement, and enforce a minimum reserve floor.
                    </p>
                    <p className="mt-4 text-base leading-[1.75] text-[var(--text-secondary)]">
                      Rather than making speculative draw decisions, teams can test various outage durations,
                      monitor SPR buffer days, and verify replenishment feasibility under real supply constraints.
                    </p>
                  </div>
                </div>
              </div>
            </section>
          </Reveal>

          {/* 4. Executive Decision & Response */}
          <Reveal>
            <section className="bg-[var(--bg-secondary)] px-4 py-12 sm:px-6 lg:px-8 lg:py-16 border-b border-[var(--border-subtle)]">
              <div className="mx-auto max-w-7xl">
                <div className="max-w-3xl">
                  <p className="text-[11px] font-semibold uppercase tracking-[0.2em] text-[var(--accent-energy)]">
                    Executive Decision & Response
                  </p>
                  <h2 className="mt-3 text-3xl font-bold tracking-tight text-[var(--text-primary)] sm:text-4xl">
                    Turn intelligence into a{' '}
                    <span style={{ color: 'var(--accent-energy)' }}>decision-ready</span>{' '}
                    operational picture
                  </h2>
                  <p className="mt-4 text-lg leading-[1.75] text-[var(--text-secondary)]">
                    ORBIT combines source-backed intelligence, network exposure, scenario results,
                    procurement options, and reserve implications into decision-ready operational
                    information for leaders.
                  </p>
                </div>

                <div className="mt-8 grid gap-6 lg:grid-cols-[1fr_1fr]">
                  <DecisionPreview />
                  <ResponseComparison />
                </div>
              </div>
            </section>
          </Reveal>

          {/* Differentiation & Source Traceability Deep-Dive */}
          <Reveal>
            <section className="px-4 py-12 sm:px-6 lg:px-8 lg:py-16 border-b border-[var(--border-subtle)]">
              <div className="mx-auto max-w-7xl">
                <div className="grid gap-8 lg:grid-cols-[1.1fr_0.9fr] lg:items-center">
                  <div>
                    <p className="text-[11px] font-semibold uppercase tracking-[0.2em] text-[var(--accent-energy)]">
                      Evidence & Verification
                    </p>
                    <h2 className="mt-3 text-3xl font-bold tracking-tight text-[var(--text-primary)] sm:text-4xl">
                      Source traceability at every stage
                    </h2>
                    <p className="mt-4 text-base text-[var(--text-secondary)]">
                      Every insight is anchored to verified intelligence feeds, maritime logs, and commodity market data.
                    </p>
                    <div className="mt-6">
                      <SourceTraceVisual />
                    </div>
                  </div>

                  <div className="space-y-4">
                    {DIFFERENTIATORS.map(({ icon: Icon, title, subtitle, description }) => (
                      <div
                        key={title}
                        className="lp-card-hover lp-card-border-glow rounded-xl border border-[var(--border-subtle)] bg-[var(--bg-card)] p-5"
                      >
                        <div className="flex items-center gap-3">
                          <div className="lp-card-icon lp-cap-icon-pulse flex h-9 w-9 items-center justify-center rounded-lg border border-orange-100 bg-orange-50 text-[var(--accent-energy)]">
                            <Icon className="h-4 w-4" />
                          </div>
                          <div>
                            <span className="block font-mono text-xs font-bold tracking-[0.16em] text-[var(--accent-energy)]">
                              {title}
                            </span>
                            <span className="text-xs text-[var(--text-muted)]">{subtitle}</span>
                          </div>
                        </div>
                        <p className="mt-3 text-sm leading-6 text-[var(--text-secondary)]">{description}</p>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            </section>
          </Reveal>
        </div>

        {/* ============================================================
            USE CASES — Real-World Disruption Scenarios
            ============================================================ */}
        <Reveal>
          <section
            id="use-cases"
            className="scroll-mt-24 px-4 py-12 sm:px-6 lg:px-8 lg:py-16 relative border-b border-[var(--border-subtle)]"
          >
            <div className="mx-auto max-w-7xl">
              <div className="max-w-3xl">
                <p className="text-[11px] font-semibold uppercase tracking-[0.2em] text-[var(--accent-energy)]">
                  Operational Use Cases
                </p>
                <h2 className="mt-3 text-3xl font-bold tracking-tight text-[var(--text-primary)] sm:text-4xl">
                  See the decision before making it
                </h2>
                <p className="mt-4 text-lg leading-[1.75] text-[var(--text-secondary)]">
                  Suppose a major geopolitical disruption threatens crude flows through a critical
                  maritime chokepoint. ORBIT lets an operator move from the event itself to a structured
                  response analysis without switching between disconnected tools.
                </p>
              </div>

              <div className="mt-8 grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4 lp-stagger">
                {USE_CASES.map(({ icon: Icon, title, tag, description }) => (
                  <article
                    key={title}
                    className="lp-card-hover lp-card-border-glow rounded-xl border border-[var(--border-subtle)] bg-[var(--bg-card)] p-5"
                  >
                    <div className="flex items-center justify-between">
                      <div className="lp-card-icon lp-cap-icon-pulse flex h-10 w-10 items-center justify-center rounded-lg border border-orange-100 bg-orange-50 text-[var(--accent-energy)]">
                        <Icon className="h-5 w-5" />
                      </div>
                      <span className="font-mono text-[10px] text-[var(--text-muted)]">{tag}</span>
                    </div>
                    <h3 className="mt-5 text-base font-semibold text-[var(--text-primary)]">{title}</h3>
                    <p className="mt-2 text-sm leading-6 text-[var(--text-secondary)]">{description}</p>
                    <div className="lp-card-signal-line" aria-hidden="true" />
                  </article>
                ))}
              </div>
            </div>
          </section>
        </Reveal>

        {/* ============================================================
            WORKFLOW — End-to-End Platform Flow
            ============================================================ */}
        <Reveal>
          <section id="workflow" className="scroll-mt-24 px-4 py-12 sm:px-6 lg:px-8 lg:py-16 relative">
            <div className="mx-auto max-w-7xl">
              <div className="max-w-3xl">
                <p className="text-[11px] font-semibold uppercase tracking-[0.2em] text-[var(--accent-energy)]">
                  End-to-End Workflow
                </p>
                <h2 className="mt-3 text-3xl font-bold tracking-tight text-[var(--text-primary)] sm:text-4xl">
                  From signal to{' '}
                  <span style={{ color: 'var(--accent-energy)' }}>decision</span>
                </h2>
                <p className="mt-3 text-base text-[var(--text-secondary)]">
                  A traceable path from initial geopolitical event detection to operational execution.
                </p>
              </div>

              {/* Connected Non-wrapping Flow */}
              <div className="mt-10 flex flex-col gap-3 lg:flex-row lg:flex-nowrap lg:items-stretch lg:gap-3">
                {WORKFLOW_STEPS.map(({ number, phase, icon: Icon, title, description }, index) => (
                  <React.Fragment key={title}>
                    <article className="lp-card-hover lp-card-border-glow lp-connected-card flex min-w-0 flex-1 flex-col rounded-xl border border-[var(--border-subtle)] bg-[var(--bg-card)] p-5">
                      <div className="flex items-center justify-between">
                        <span className="font-mono text-xs font-semibold tracking-[0.2em] text-[var(--accent-energy)]">
                          {number}
                        </span>
                        <span className="text-[10px] font-mono font-medium text-[var(--text-muted)]">
                          {phase}
                        </span>
                      </div>
                      <div className="lp-card-icon lp-cap-icon-pulse mt-4 flex h-9 w-9 items-center justify-center rounded-lg border border-[var(--border-subtle)] bg-[var(--bg-surface)] text-[var(--accent-energy)]">
                        <Icon className="h-4 w-4" />
                      </div>
                      <h3 className="mt-5 text-base font-semibold text-[var(--text-primary)]">{title}</h3>
                      <p className="mt-2 text-xs leading-5 text-[var(--text-secondary)]">{description}</p>
                      <div className="lp-card-signal-line" aria-hidden="true" />
                    </article>

                    {index < WORKFLOW_STEPS.length - 1 && (
                      <div
                        className="relative flex shrink-0 items-center justify-center text-[var(--accent-energy)] lg:w-4"
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
        </Reveal>

        {/* ============================================================
            SECURITY — Secure Operator Access
            ============================================================ */}
        <Reveal>
          <section id="security" className="scroll-mt-24 border-y border-[var(--border-subtle)] bg-[var(--bg-secondary)] px-4 py-12 sm:px-6 lg:px-8 lg:py-16 relative">
            <div className="mx-auto grid max-w-7xl items-center gap-8 rounded-2xl border border-[var(--border-subtle)] bg-[var(--bg-card)] p-7 sm:p-10 lg:grid-cols-[1fr_auto]">
              <div className="flex gap-4">
                <div className="hidden h-11 w-11 shrink-0 items-center justify-center rounded-lg border border-orange-100 bg-orange-50 text-[var(--accent-energy)] sm:flex">
                  <ShieldCheck className="h-5 w-5" />
                </div>
                <div>
                  <p className="text-[11px] font-semibold uppercase tracking-[0.2em] text-[var(--accent-energy)]">
                    Secure operator access
                  </p>
                  <h2 className="mt-2 text-2xl font-bold tracking-tight text-[var(--text-primary)] sm:text-3xl">
                    Built for accountable operations
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
                className="lp-btn-sweep inline-flex w-full items-center justify-center gap-2 rounded-lg bg-[var(--text-primary)] px-5 py-3 text-sm font-semibold text-white transition-all duration-200 hover:-translate-y-0.5 hover:opacity-90 sm:w-auto"
              >
                <span>{primaryLabel}</span>
                <ArrowRight className="lp-btn-arrow h-4 w-4" />
              </button>
            </div>
          </section>
        </Reveal>

        {/* ============================================================
            RESOURCES
            ============================================================ */}
        <Reveal>
          <section
            id="resources"
            className="scroll-mt-24 px-4 py-10 sm:px-6 lg:px-8"
          >
            <div className="mx-auto flex max-w-7xl flex-col items-start justify-between gap-6 sm:flex-row sm:items-center">
              <div>
                <div className="flex items-center gap-2 text-sm font-semibold text-[var(--text-primary)]">
                  <div className="flex h-5 w-5 items-center justify-center rounded bg-[var(--text-primary)]">
                    <div className="h-2 w-2 rounded-full border border-white">
                      <div className="h-0.5 w-0.5 m-auto mt-[2.5px] rounded-full bg-[var(--accent-energy)]" />
                    </div>
                  </div>
                  <span>ORBIT operating surface</span>
                </div>
                <p className="mt-2 text-sm text-[var(--text-secondary)]">
                  Energy supply-chain intelligence for geopolitical risk, network impact, scenarios,
                  procurement, and strategic reserves.
                </p>
              </div>
              <div className="flex flex-wrap gap-x-5 gap-y-2 text-xs text-[var(--text-muted)]">
                <a
                  href="#capabilities"
                  onClick={(e) => scrollToSection(e, 'Capabilities', '#capabilities')}
                  className="transition-colors hover:text-[var(--accent-energy)]"
                >
                  Capabilities
                </a>
                <a
                  href="#use-cases"
                  onClick={(e) => scrollToSection(e, 'Use Cases', '#use-cases')}
                  className="transition-colors hover:text-[var(--accent-energy)]"
                >
                  Use Cases
                </a>
                <a
                  href="#workflow"
                  onClick={(e) => scrollToSection(e, 'Workflow', '#workflow')}
                  className="transition-colors hover:text-[var(--accent-energy)]"
                >
                  Workflow
                </a>
                <a
                  href="#security"
                  onClick={(e) => scrollToSection(e, 'Security', '#security')}
                  className="transition-colors hover:text-[var(--accent-energy)]"
                >
                  Security
                </a>
              </div>
            </div>
          </section>
        </Reveal>
      </main>

      {/* ============================================================
          FOOTER
          ============================================================ */}
      <footer className="border-t border-[var(--border-subtle)] bg-[var(--bg-secondary)] px-4 py-7 text-sm text-[var(--text-muted)] sm:px-6 lg:px-8">
        <div className="mx-auto flex max-w-7xl flex-col items-start justify-between gap-3 sm:flex-row sm:items-center">
          <div className="flex items-center gap-2">
            <div className="h-2 w-2 rounded-full bg-[var(--accent-energy)]" />
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
