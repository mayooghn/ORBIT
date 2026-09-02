import React, { useEffect, useState, useRef } from 'react';
import { StatusBadge } from '../components/common/StatusBadge';
import { getModuleServiceStatus } from '../services/moduleServices';
import {
  Activity,
  Bot,
  Cpu,
  Database,
  Globe,
  Network,
  ShieldCheck,
  Radar,
  AlertTriangle,
  ArrowUpRight,
  Zap,
  TrendingUp,
  Lock,
} from 'lucide-react';

interface DashboardPageProps {
  onNavigate: (path: string) => void;
}

/* ==========================================================================
   DASHBOARD BACKGROUND — Grid, radar, signal waves
   ========================================================================== */
const DashboardBackground: React.FC = () => {
  const [reduced, setReduced] = useState(false);

  useEffect(() => {
    const mq = window.matchMedia('(prefers-reduced-motion: reduce)');
    const update = () => setReduced(mq.matches);
    update();
    mq.addEventListener('change', update);
    return () => mq.removeEventListener('change', update);
  }, []);

  return (
    <>
      {/* Grid */}
      <div className="db-grid" aria-hidden="true" />

      {/* Scan line */}
      {!reduced && <div className="db-scan-line" aria-hidden="true" />}

      {/* Radar */}
      <div className="db-radar" aria-hidden="true">
        <div className="db-radar-ring" style={{ width: '100%', height: '100%' }} />
        <div className="db-radar-ring" style={{ width: '70%', height: '70%' }} />
        <div className="db-radar-ring" style={{ width: '40%', height: '40%' }} />
        {!reduced && <div className="db-radar-sweep" />}
      </div>

      {/* Signal waves */}
      <svg className="db-signal-wave" style={{ position: 'fixed', inset: 0, width: '100%', height: '100%' }} viewBox="0 0 1200 800" preserveAspectRatio="xMidYMid slice" aria-hidden="true">
        <path d="M -20 200 Q 200 180, 400 210 T 800 190 T 1220 205" />
        <path d="M -20 350 Q 300 330, 600 360 T 1220 345" className="db-wave-accent" />
        <path d="M -20 500 Q 250 480, 500 510 T 1220 495" />
        <path d="M -20 650 Q 350 630, 700 660 T 1220 645" className="db-wave-accent" style={{ animationDelay: '5s' }} />
        {!reduced && (
          <>
            <path d="M -20 200 Q 200 180, 400 210 T 800 190 T 1220 205" className="db-wave-highlight" />
            <path d="M -20 500 Q 250 480, 500 510 T 1220 495" className="db-wave-highlight" style={{ animationDelay: '4s', animationDuration: '12s' }} />
          </>
        )}
      </svg>
    </>
  );
};

/* ==========================================================================
   DASHBOARD GLOBE — Refined network visualization
   ========================================================================== */
const DASHBOARD_NODES = [
  { id: 'hormuz', label: 'HORMUZ', x: 58, y: 42, type: 'chokepoint' as const, size: 1.4 },
  { id: 'ras_tanura', label: 'RAS TANURA', x: 55, y: 40, type: 'refinery' as const, size: 1.1 },
  { id: 'jamnagar', label: 'JAMNAGAR', x: 63, y: 44, type: 'refinery' as const, size: 1.2 },
  { id: 'singapore', label: 'SINGAPORE', x: 72, y: 52, type: 'hub' as const, size: 1.3 },
  { id: 'rotterdam', label: 'ROTTERDAM', x: 47, y: 32, type: 'port' as const, size: 1.1 },
  { id: 'huizhou', label: 'HUIZHOU', x: 74, y: 44, type: 'port' as const, size: 1.0 },
  { id: 'mumbai', label: 'MUMBAI', x: 62, y: 46, type: 'hub' as const, size: 1.2 },
  { id: 'fujairah', label: 'FUJAIRAH', x: 57, y: 43, type: 'port' as const, size: 1.1 },
];

const DASHBOARD_ROUTES = [
  { from: 'hormuz', to: 'jamnagar', active: true },
  { from: 'hormuz', to: 'singapore', active: true },
  { from: 'ras_tanura', to: 'mumbai', active: false },
  { from: 'rotterdam', to: 'hormuz', active: false },
  { from: 'fujairah', to: 'singapore', active: true },
  { from: 'jamnagar', to: 'huizhou', active: false },
  { from: 'mumbai', to: 'singapore', active: false },
];

const DashboardGlobe: React.FC = () => {
  const [reduced, setReduced] = useState(false);
  const [activeRoute, setActiveRoute] = useState(0);
  const [hoveredNode, setHoveredNode] = useState<string | null>(null);

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
      setActiveRoute((prev) => (prev + 1) % DASHBOARD_ROUTES.length);
    }, 3500);
    return () => clearInterval(t);
  }, [reduced]);

  const getNode = (id: string) => DASHBOARD_NODES.find((n) => n.id === id)!;

  const isNodeActive = (nodeId: string) => {
    return DASHBOARD_ROUTES.some(
      (r, i) => i === activeRoute && r.active && (r.from === nodeId || r.to === nodeId)
    );
  };

  const isConnectedToHovered = (nodeId: string) => {
    if (!hoveredNode) return false;
    return DASHBOARD_ROUTES.some(
      (r) => (r.from === hoveredNode && r.to === nodeId) || (r.to === hoveredNode && r.from === nodeId)
    );
  };

  return (
    <div className="db-globe-container">
      {/* Orbital rings */}
      <div className="db-globe-ring" style={{ width: '98%', height: '98%' }} />
      <div className="db-globe-ring db-globe-ring-accent" style={{ width: '80%', height: '80%' }} />
      <div className="db-globe-ring" style={{ width: '60%', height: '60%' }} />

      {/* Globe SVG */}
      <svg viewBox="0 0 100 100" className="w-full h-full" role="img" aria-label="Energy supply chain network visualization showing global trade routes and infrastructure nodes">
        <defs>
          <radialGradient id="db-globe-glow" cx="50%" cy="50%" r="50%">
            <stop offset="0%" stopColor="rgba(249,115,22,0.06)" />
            <stop offset="100%" stopColor="transparent" />
          </radialGradient>
          <radialGradient id="db-globe-core" cx="50%" cy="50%" r="50%">
            <stop offset="0%" stopColor="rgba(255,255,255,0.02)" />
            <stop offset="100%" stopColor="transparent" />
          </radialGradient>
        </defs>

        {/* Globe background glow */}
        <circle cx="50" cy="50" r="40" fill="url(#db-globe-glow)" />
        <circle cx="50" cy="50" r="38" fill="url(#db-globe-core)" />

        {/* Subtle internal grid for depth */}
        <g opacity="0.03">
          {Array.from({ length: 9 }, (_, i) => (
            <line key={`ig-h${i}`} x1="12" y1={14 + i * 8.5} x2="88" y2={14 + i * 8.5} stroke="white" strokeWidth="0.15" />
          ))}
          {Array.from({ length: 9 }, (_, i) => (
            <line key={`ig-v${i}`} x1={14 + i * 8.5} y1="12" x2={14 + i * 8.5} y2="88" stroke="white" strokeWidth="0.15" />
          ))}
        </g>

        {/* Latitude lines — subtle curved mesh */}
        {[28, 36, 44, 50, 56, 64, 72].map((y) => {
          const distFromCenter = Math.abs(y - 50);
          const rx = 38 * Math.cos((distFromCenter / 38) * (Math.PI / 2));
          return (
            <ellipse
              key={`lat-${y}`}
              cx="50" cy={y}
              rx={rx}
              ry={3.5}
              fill="none"
              stroke="rgba(255,255,255,0.025)"
              strokeWidth="0.25"
            />
          );
        })}

        {/* Longitude lines — meridian curves */}
        {[0, 24, 48, 72, 96, 120, 144].map((angle) => (
          <ellipse
            key={`lon-${angle}`}
            cx="50" cy="50"
            rx={38 * Math.cos((angle * Math.PI) / 180)}
            ry={38}
            fill="none"
            stroke="rgba(255,255,255,0.02)"
            strokeWidth="0.2"
            transform={`rotate(${angle * 0.08} 50 50)`}
          />
        ))}

        {/* Rotating dashed orbit */}
        {!reduced && (
          <g className="db-globe-rotate" style={{ transformOrigin: '50px 50px' }}>
            <circle cx="50" cy="50" r="37" fill="none" stroke="rgba(255,255,255,0.03)" strokeWidth="0.25" strokeDasharray="2 14" />
          </g>
        )}

        {/* Routes */}
        {DASHBOARD_ROUTES.map((route, i) => {
          const from = getNode(route.from);
          const to = getNode(route.to);
          const isActive = i === activeRoute && route.active;
          const isHovered = hoveredNode === route.from || hoveredNode === route.to;
          const showRoute = isActive || isHovered;
          return (
            <line
              key={`${route.from}-${route.to}`}
              x1={from.x} y1={from.y}
              x2={to.x} y2={to.y}
              stroke={showRoute ? 'rgba(249,115,22,0.35)' : 'rgba(255,255,255,0.04)'}
              strokeWidth={showRoute ? 0.5 : 0.2}
              strokeLinecap="round"
              style={{ transition: 'stroke 0.5s ease, stroke-width 0.5s ease' }}
            />
          );
        })}

        {/* Signal packets on active routes */}
        {!reduced && DASHBOARD_ROUTES.map((route, i) => {
          if (i !== activeRoute || !route.active) return null;
          const from = getNode(route.from);
          const to = getNode(route.to);
          return (
            <g key={`signal-${route.from}-${route.to}`}>
              {/* Signal trail */}
              <circle r="0.6" fill="#f97316" opacity="0.25">
                <animateMotion dur="2.8s" repeatCount="indefinite" path={`M ${from.x} ${from.y} L ${to.x} ${to.y}`} />
              </circle>
              {/* Signal head */}
              <circle r="0.9" fill="#f97316" opacity="0.9">
                <animateMotion dur="2.8s" repeatCount="indefinite" path={`M ${from.x} ${from.y} L ${to.x} ${to.y}`} />
                <animate attributeName="opacity" values="0.9;0.5;0.9" dur="1.2s" repeatCount="indefinite" />
              </circle>
            </g>
          );
        })}

        {/* Nodes */}
        {DASHBOARD_NODES.map((node) => {
          const isActive = isNodeActive(node.id);
          const isHovered = hoveredNode === node.id;
          const isConnected = isConnectedToHovered(node.id);
          const nodeColor = node.type === 'chokepoint' ? '#f97316' : node.type === 'refinery' ? '#fb923c' : 'rgba(255,255,255,0.5)';
          const showDetail = isActive || isHovered || isConnected;
          return (
            <g
              key={node.id}
              onMouseEnter={() => setHoveredNode(node.id)}
              onMouseLeave={() => setHoveredNode(null)}
              style={{ cursor: 'pointer' }}
            >
              {/* Node glow */}
              {showDetail && (
                <circle
                  cx={node.x} cy={node.y}
                  r={node.size * 4}
                  fill={nodeColor}
                  opacity={isHovered ? 0.12 : 0.06}
                  style={{ transition: 'opacity 0.3s ease' }}
                />
              )}
              {/* Node body */}
              <circle
                cx={node.x} cy={node.y}
                r={showDetail ? node.size * 1.5 : node.size}
                fill={showDetail ? nodeColor : 'rgba(255,255,255,0.25)'}
                stroke={isHovered ? 'rgba(255,255,255,0.4)' : 'none'}
                strokeWidth={isHovered ? 0.3 : 0}
                style={{ transition: 'all 0.4s ease' }}
              />
              {/* Node pulse ring */}
              {isActive && !reduced && (
                <circle
                  cx={node.x} cy={node.y}
                  r={node.size * 1.4}
                  fill="none"
                  stroke={nodeColor}
                  strokeWidth="0.2"
                  opacity="0.4"
                >
                  <animate attributeName="r" from={`${node.size * 1.4}`} to={`${node.size * 4}`} dur="2.5s" repeatCount="indefinite" />
                  <animate attributeName="opacity" from="0.4" to="0" dur="2.5s" repeatCount="indefinite" />
                </circle>
              )}
              {/* Node label */}
              <text
                x={node.x} y={node.y - 3.5}
                textAnchor="middle"
                fill={showDetail ? 'rgba(255,255,255,0.8)' : 'rgba(255,255,255,0.18)'}
                style={{ fontSize: '2.4px', fontFamily: 'ui-monospace, monospace', letterSpacing: '0.1em', transition: 'fill 0.4s ease', fontWeight: showDetail ? 600 : 400 }}
              >
                {node.label}
              </text>
            </g>
          );
        })}
      </svg>
    </div>
  );
};

/* ==========================================================================
   DASHBOARD STATUS STRIP — Compact operational bar
   ========================================================================== */
const DashboardStatusStrip: React.FC = () => {
  const [time, setTime] = useState(new Date());

  useEffect(() => {
    const t = setInterval(() => setTime(new Date()), 1000);
    return () => clearInterval(t);
  }, []);

  const utc = time.toISOString().slice(0, 19).replace('T', ' ') + ' UTC';

  return (
    <div className="db-operational-strip">
      <div className="db-operational-strip-item is-active">
        <span className="db-status-dot db-status-dot-operative" />
        <span>SYSTEM OPERATIONAL</span>
      </div>
      <div className="db-operational-strip-item is-active">
        <span className="db-status-dot db-status-dot-operative" />
        <span>NETWORK STABLE</span>
      </div>
      <div className="db-operational-strip-item">
        <Activity className="w-3 h-3 text-[#555]" />
        <span>28 SIGNALS</span>
      </div>
      <div className="db-operational-strip-item">
        <Database className="w-3 h-3 text-[#555]" />
        <span>45 ASSETS</span>
      </div>
      <div className="db-operational-strip-item">
        <AlertTriangle className="w-3 h-3 text-amber-500/60" />
        <span>2 ELEVATED</span>
      </div>
      <div className="db-operational-strip-item ml-auto">
        <span className="text-[#444]">{utc}</span>
      </div>
    </div>
  );
};

/* ==========================================================================
   MAIN DASHBOARD PAGE
   ========================================================================== */
export const DashboardPage: React.FC<DashboardPageProps> = ({ onNavigate }) => {
  const corridor = getModuleServiceStatus('corridor');
  const reserve = getModuleServiceStatus('reserve');
  const assistant = getModuleServiceStatus('assistant');

  return (
    <div className="dashboard-root">
      <DashboardBackground />

      <div className="relative z-10 space-y-4">
        {/* Top status strip */}
        <DashboardStatusStrip />

        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div>
            <div className="flex items-center gap-2.5">
              <h1 className="text-xl sm:text-2xl font-bold tracking-tight text-[#EDEDED]">
                Command Center
              </h1>
              <StatusBadge level="NOT_CONNECTED" label="STANDBY" size="sm" />
            </div>
            <p className="text-xs text-[#666] mt-1">
              Global energy intelligence — live network monitoring
            </p>
          </div>
          <div className="flex items-center gap-2">
            <button className="db-card px-3 py-1.5 text-[11px] font-mono text-[#888] hover:text-[#ccc] flex items-center gap-1.5 cursor-pointer">
              <Lock className="w-3 h-3" />
              <span>SECURE ACCESS</span>
            </button>
          </div>
        </div>

        {/* Main hero: Globe + Metrics */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-4">
          {/* Left: Core metrics */}
          <div className="lg:col-span-3 space-y-3">
            {/* Reserve Cover */}
            <div className="db-card p-3">
              <div className="flex items-center justify-between mb-1.5">
                <span className="db-section-label">Reserve Cover</span>
                <Database className="w-3 h-3 text-amber-400/50" />
              </div>
              <div className="flex items-baseline gap-1.5">
                <span className="text-2xl font-bold text-[#EDEDED] db-metric-value">—</span>
                <span className="text-[11px] text-[#555] font-mono">days</span>
              </div>
              <div className="mt-2 flex items-center gap-1.5 text-[11px] text-[#555] font-mono">
                <div className="w-1.5 h-1.5 rounded-full bg-amber-500/50" />
                <span>Awaiting telemetry</span>
              </div>
            </div>

            {/* Active Events */}
            <div className="db-card p-3">
              <div className="flex items-center justify-between mb-1.5">
                <span className="db-section-label">Active Events</span>
                <Activity className="w-3 h-3 text-amber-400/50" />
              </div>
              <div className="flex items-baseline gap-1.5">
                <span className="text-2xl font-bold text-[#EDEDED] db-metric-value">0</span>
                <span className="text-[11px] text-[#555] font-mono">events</span>
              </div>
              <div className="mt-2 flex items-center gap-1.5 text-[11px] text-[#555] font-mono">
                <div className="w-1.5 h-1.5 rounded-full bg-emerald-500/50" />
                <span>No verified events</span>
              </div>
            </div>

            {/* Risk Level */}
            <div className="db-card p-3">
              <div className="flex items-center justify-between mb-1.5">
                <span className="db-section-label">Risk Level</span>
                <TrendingUp className="w-3 h-3 text-emerald-400/50" />
              </div>
              <div className="flex items-baseline gap-1.5">
                <span className="text-lg font-bold text-emerald-400/80 db-metric-value">LOW</span>
              </div>
              <div className="mt-2 flex items-center gap-1.5 text-[11px] text-[#555] font-mono">
                <div className="w-1.5 h-1.5 rounded-full bg-emerald-500/50" />
                <span>Within normal parameters</span>
              </div>
            </div>
          </div>

          {/* Center: Globe visualization */}
          <div className="lg:col-span-6 flex items-center justify-center">
            <DashboardGlobe />
          </div>

          {/* Right: Status and quick access */}
          <div className="lg:col-span-3 space-y-3">
            {/* System Status */}
            <div className="db-card p-3">
              <div className="flex items-center gap-1.5 mb-2">
                <Cpu className="w-3 h-3 text-orange-400/60" />
                <span className="text-[11px] font-semibold text-[#999] font-mono uppercase tracking-wider">System Status</span>
              </div>
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-1.5">
                    <span className="db-status-dot db-status-dot-operative" style={{ width: 4, height: 4 }} />
                    <span className="text-[11px] text-[#777] font-mono">Foundation</span>
                  </div>
                  <span className="text-[11px] text-emerald-400/70 font-mono">READY</span>
                </div>
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-1.5">
                    <span className="db-status-dot db-status-dot-operative" style={{ width: 4, height: 4 }} />
                    <span className="text-[11px] text-[#777] font-mono">Authentication</span>
                  </div>
                  <span className="text-[11px] text-emerald-400/70 font-mono">READY</span>
                </div>
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-1.5">
                    <span className="db-status-dot db-status-dot-alert" style={{ width: 4, height: 4 }} />
                    <span className="text-[11px] text-[#777] font-mono">Operational data</span>
                  </div>
                  <span className="text-[11px] text-orange-400/70 font-mono">OFFLINE</span>
                </div>
              </div>
            </div>

            {/* Network Status */}
            <div className="db-card p-3">
              <div className="flex items-center gap-1.5 mb-2">
                <Network className="w-3 h-3 text-orange-400/60" />
                <span className="text-[11px] font-semibold text-[#999] font-mono uppercase tracking-wider">Network</span>
              </div>
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <span className="text-[11px] text-[#777] font-mono">Corridors</span>
                  <span className="text-[11px] text-orange-400/70 font-mono">NOT CONNECTED</span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-[11px] text-[#777] font-mono">Topology</span>
                  <span className="text-[11px] text-orange-400/70 font-mono">NOT CONNECTED</span>
                </div>
              </div>
            </div>

            {/* Security */}
            <div className="db-card p-3">
              <div className="flex items-center gap-1.5 mb-2">
                <ShieldCheck className="w-3 h-3 text-orange-400/60" />
                <span className="text-[11px] font-semibold text-[#999] font-mono uppercase tracking-wider">Security</span>
              </div>
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <span className="text-[11px] text-[#777] font-mono">Access</span>
                  <span className="text-[11px] text-emerald-400/70 font-mono">SECURE</span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-[11px] text-[#777] font-mono">Session</span>
                  <span className="text-[11px] text-emerald-400/70 font-mono">ACTIVE</span>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Operational Modules */}
        <div>
          <div className="flex items-center gap-2 mb-2.5">
            <Radar className="w-3.5 h-3.5 text-orange-400/50" />
            <span className="db-section-label">Operational Modules</span>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            {[
              { label: 'Digital Twin Network', desc: corridor.message, path: '/app/network', icon: Network, status: corridor.status },
              { label: 'Reserve Management', desc: reserve.message, path: '/app/reserves', icon: Database, status: reserve.status },
              { label: 'Geopolitical Risk Agent', desc: assistant.message, path: '/app/assistant', icon: Bot, status: assistant.status },
            ].map(({ label, desc, path, icon: Icon, status }) => (
              <button
                key={label}
                type="button"
                onClick={() => onNavigate(path)}
                className="db-module-card text-left"
              >
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <Icon className="w-3.5 h-3.5 text-orange-400/50" />
                    <span className="text-[11px] font-semibold text-[#ccc] font-mono">{label}</span>
                  </div>
                  <ArrowUpRight className="w-3 h-3 text-[#444] group-hover:text-[#888] transition-colors" />
                </div>
                <p className="text-[11px] text-[#555] leading-relaxed mt-1">{desc}</p>
                <div className="mt-2 flex items-center gap-1.5">
                  <span className="db-status-dot db-status-dot-alert" style={{ width: 4, height: 4 }} />
                  <span className="text-[11px] text-orange-400/60 font-mono">NOT CONNECTED</span>
                </div>
              </button>
            ))}
          </div>
        </div>

        {/* Intelligence Summary */}
        <div className="db-card p-4">
          <div className="flex items-center gap-2 mb-3">
            <Zap className="w-3.5 h-3.5 text-orange-400/60" />
            <span className="text-[11px] font-semibold text-[#999] font-mono uppercase tracking-wider">Intelligence Summary</span>
          </div>
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
            <div className="text-center">
              <div className="text-xl font-bold text-[#EDEDED] db-metric-value">0</div>
              <div className="text-[11px] text-[#555] font-mono mt-0.5">Active Disruptions</div>
            </div>
            <div className="text-center">
              <div className="text-xl font-bold text-[#EDEDED] db-metric-value">0</div>
              <div className="text-[11px] text-[#555] font-mono mt-0.5">Risk Alerts</div>
            </div>
            <div className="text-center">
              <div className="text-xl font-bold text-[#EDEDED] db-metric-value">—</div>
              <div className="text-[11px] text-[#555] font-mono mt-0.5">Reserve Status</div>
            </div>
            <div className="text-center">
              <div className="text-xl font-bold text-[#EDEDED] db-metric-value">0</div>
              <div className="text-[11px] text-[#555] font-mono mt-0.5">Scenarios Run</div>
            </div>
          </div>
        </div>

        {/* Footer note */}
        <div className="text-center text-[11px] text-[#333] font-mono pb-2">
          ORBIT — Global Energy Intelligence Platform
        </div>
      </div>
    </div>
  );
};
