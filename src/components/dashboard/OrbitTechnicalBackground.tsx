import React from 'react';

/**
 * OrbitTechnicalBackground
 * Continuous animated architectural technical grid system for ORBIT Command Overview.
 *
 * Inspired by advanced AI / data-infrastructure visual systems (Firecrawl style),
 * tailored to ORBIT's dark energy-intelligence aesthetic.
 *
 * Visual decoration only:
 * - NO mock data
 * - NO fake metrics
 * - NO fake telemetry
 * - Purely CSS/SVG based, hardware-accelerated, lightweight, accessible
 */
export const OrbitTechnicalBackground: React.FC = () => {
  return (
    <div
      aria-hidden="true"
      className="orbit-tech-bg pointer-events-none select-none"
    >
      {/* 1. Deep Atmospheric Vignette & Gradients */}
      <div className="absolute inset-0 bg-radial-gradient from-transparent via-[#000000]/60 to-[#000000] z-0" />
      <div
        className="absolute top-0 left-1/2 -translate-x-1/2 w-full max-w-7xl h-[480px] opacity-40 z-0"
        style={{
          background:
            'radial-gradient(ellipse 70% 35% at 50% 0%, rgba(249, 115, 22, 0.04) 0%, rgba(255, 255, 255, 0.01) 40%, transparent 80%)',
        }}
      />
      <div
        className="absolute bottom-0 left-1/2 -translate-x-1/2 w-full max-w-7xl h-[600px] opacity-30 z-0"
        style={{
          background:
            'radial-gradient(ellipse 80% 40% at 50% 100%, rgba(249, 115, 22, 0.02) 0%, transparent 70%)',
        }}
      />

      {/* 2. Continuous Full-Page Repeating Technical Architectural Grid */}
      <svg
        className="absolute inset-0 h-full w-full opacity-60 z-0"
        xmlns="http://www.w3.org/2000/svg"
      >
        <defs>
          {/* Primary architectural grid pattern with rounded rectangular cells */}
          <pattern
            id="orbit-tech-grid-pattern"
            width="88"
            height="88"
            patternUnits="userSpaceOnUse"
          >
            {/* Rounded rectangular grid cell */}
            <rect
              x="6"
              y="6"
              width="76"
              height="76"
              rx="8"
              ry="8"
              fill="none"
              stroke="rgba(255, 255, 255, 0.03)"
              strokeWidth="1"
            />
            {/* Corner intersection crosshairs */}
            <path
              d="M 0 4 L 0 -4 M -4 0 L 4 0"
              stroke="rgba(255, 255, 255, 0.065)"
              strokeWidth="1"
            />
            {/* Micro center coordinate dot */}
            <circle
              cx="44"
              cy="44"
              r="1"
              fill="rgba(255, 255, 255, 0.04)"
            />
          </pattern>
        </defs>
        <rect
          width="100%"
          height="100%"
          fill="url(#orbit-tech-grid-pattern)"
        />
      </svg>

      {/* 3. Asymmetrical Architectural Feature Blocks (Varied cell sizes with subtle breathing) */}
      <div className="absolute inset-0 mx-auto max-w-7xl h-full z-0">
        {/* Block 1: Top-Right zone (behind Executive Header / live state) */}
        <div className="orbit-tech-cell-pulse-1 absolute top-4 right-4 sm:right-8 w-64 sm:w-80 h-32 rounded-xl border border-white/[0.045] bg-white/[0.004] hidden sm:block">
          <div className="absolute top-2 left-2.5 font-mono text-[9px] text-white/20 tracking-wider">
            [ + ]
          </div>
          <div className="absolute top-2 right-2.5 font-mono text-[8px] text-white/15 tracking-widest uppercase">
            SYS // 01
          </div>
          <div className="absolute bottom-2 right-2.5 flex items-center gap-1 opacity-20">
            <span className="w-1 h-1 rounded-full bg-white/40" />
            <span className="w-1 h-1 rounded-full bg-white/20" />
            <span className="w-1 h-1 rounded-full bg-white/10" />
          </div>
        </div>

        {/* Block 2: Top-Left zone (behind Card 1 & 2) */}
        <div className="orbit-tech-cell-pulse-2 absolute top-44 left-2 sm:left-6 w-56 sm:w-72 h-44 rounded-xl border border-white/[0.035] bg-white/[0.003] hidden lg:block">
          <div className="absolute top-2 left-2 flex gap-1 opacity-20">
            <div className="grid grid-cols-3 gap-0.5">
              {[...Array(9)].map((_, i) => (
                <div key={i} className="w-0.5 h-0.5 rounded-full bg-white" />
              ))}
            </div>
          </div>
          <div className="absolute bottom-2 left-2.5 font-mono text-[8px] text-white/15 tracking-wider">
            GRID // CORRIDOR
          </div>
        </div>

        {/* Block 3: Mid-Right zone (behind What Is Happening / Why It Matters) */}
        <div className="orbit-tech-cell-pulse-3 absolute top-[28%] right-2 sm:right-12 w-72 sm:w-96 h-56 rounded-xl border border-white/[0.04] bg-white/[0.004] hidden md:block">
          <div className="absolute top-2 right-2.5 font-mono text-[9px] text-white/20">
            ┌ &nbsp;&nbsp;&nbsp;&nbsp; ┐
          </div>
          <div className="absolute bottom-2 right-2.5 font-mono text-[9px] text-white/20">
            └ &nbsp;&nbsp;&nbsp;&nbsp; ┘
          </div>
          <div className="absolute top-3 left-3 font-mono text-[8px] text-white/15 tracking-widest">
            MATRIX // A-4
          </div>
          {/* Subtle micro horizontal hashes */}
          <div className="absolute bottom-3 left-3 flex gap-0.5 opacity-20">
            <div className="w-2 h-0.5 bg-white" />
            <div className="w-1 h-0.5 bg-white/50" />
            <div className="w-3 h-0.5 bg-white/70" />
          </div>
        </div>

        {/* Block 4: Mid-Left zone (behind Impact Footprint) */}
        <div className="orbit-tech-cell-pulse-1 absolute top-[45%] left-4 sm:left-10 w-60 sm:w-80 h-48 rounded-xl border border-white/[0.035] bg-white/[0.003] hidden lg:block">
          <div className="absolute top-2.5 left-3 font-mono text-[8px] text-white/20 tracking-wider">
            [ NODE // 08 ]
          </div>
          <div className="absolute bottom-2.5 right-3 flex items-center gap-1 opacity-25 font-mono text-[8px] text-white">
            ::
          </div>
        </div>

        {/* Block 5: Lower-Right zone (behind Strategic Reserves & Recommendation) */}
        <div className="orbit-tech-cell-pulse-2 absolute top-[62%] right-6 sm:right-16 w-64 sm:w-84 h-52 rounded-xl border border-white/[0.04] bg-white/[0.004] hidden md:block">
          <div className="absolute top-2.5 right-3 font-mono text-[9px] text-white/20">
            +
          </div>
          <div className="absolute top-2.5 left-3 font-mono text-[8px] text-white/15 tracking-wider">
            RESERVE // GEO
          </div>
          <div className="absolute bottom-2.5 left-3 flex gap-1 opacity-20">
            <div className="w-1 h-1 bg-white" />
            <div className="w-1 h-1 bg-white" />
            <div className="w-1 h-1 bg-white/40" />
          </div>
        </div>

        {/* Block 6: Bottom zone (behind Top Current Global Oil Risks table) */}
        <div className="orbit-tech-cell-pulse-3 absolute top-[82%] left-1/2 -translate-x-1/2 w-[90%] max-w-4xl h-44 rounded-xl border border-white/[0.03] bg-white/[0.003] hidden sm:block">
          <div className="absolute top-2 left-3 font-mono text-[8px] text-white/20 tracking-widest uppercase">
            FEED // ARCHIVE
          </div>
          <div className="absolute top-2 right-3 font-mono text-[9px] text-white/20">
            [ + ]
          </div>
          <div className="absolute bottom-2 right-3 font-mono text-[8px] text-white/15">
            00 // 100
          </div>
        </div>
      </div>

      {/* 4. Subtle Technical Signal Nodes (Slow, elegant glints at grid intersections) */}
      <div className="absolute inset-0 mx-auto max-w-7xl h-full z-0">
        <div className="orbit-tech-node-glint-1 absolute top-[18%] left-[24%] w-1.5 h-1.5 rounded-full bg-white/40 shadow-[0_0_6px_rgba(255,255,255,0.4)]" />
        <div className="orbit-tech-node-glint-2 absolute top-[36%] right-[32%] w-1 h-1 rounded-full bg-white/50" />
        <div className="orbit-tech-node-glint-3 absolute top-[55%] left-[18%] w-1 h-1 rounded-full bg-white/40" />
        <div className="orbit-tech-node-glint-1 absolute top-[72%] right-[15%] w-1.5 h-1.5 rounded-full bg-white/40" />
        <div className="orbit-tech-node-glint-2 absolute top-[90%] left-[45%] w-1 h-1 rounded-full bg-white/30" />
      </div>

      {/* 5. Occasional ORBIT-Orange Signal Pulse Beacon (Subtle, slow 20s+ cycle) */}
      <div className="absolute inset-0 mx-auto max-w-7xl h-full z-0">
        {/* Beacon 1: Near Top-Right Header/Metrics */}
        <div className="absolute top-[8%] right-[12%] sm:right-[18%] flex items-center justify-center">
          <div className="orbit-tech-beacon-ring-1 absolute w-6 h-6 rounded-full border border-orange-500/40" />
          <div className="orbit-tech-beacon-1 w-2 h-2 rounded-full bg-orange-500 shadow-[0_0_8px_rgba(249,115,22,0.8)]" />
        </div>

        {/* Beacon 2: Near Mid-Left Impact Footprint */}
        <div className="absolute top-[46%] left-[6%] sm:left-[12%] flex items-center justify-center hidden sm:flex">
          <div className="orbit-tech-beacon-ring-2 absolute w-6 h-6 rounded-full border border-orange-500/35" />
          <div className="orbit-tech-beacon-2 w-1.5 h-1.5 rounded-full bg-orange-500 shadow-[0_0_8px_rgba(249,115,22,0.7)]" />
        </div>

        {/* Beacon 3: Near Lower-Right Strategic Posture / Risks */}
        <div className="absolute top-[76%] right-[8%] sm:right-[16%] flex items-center justify-center">
          <div className="orbit-tech-beacon-ring-3 absolute w-6 h-6 rounded-full border border-orange-500/40" />
          <div className="orbit-tech-beacon-3 w-2 h-2 rounded-full bg-orange-500 shadow-[0_0_8px_rgba(249,115,22,0.8)]" />
        </div>
      </div>

      {/* 6. Continuous Faint Data Traces (Gentle light lines drifting along grid lines) */}
      <div className="absolute inset-0 mx-auto max-w-7xl h-full z-0 overflow-hidden">
        {/* Horizontal Trace 1 (Top area) */}
        <div className="absolute top-[22%] left-0 w-full h-[1px]">
          <div
            className="orbit-tech-trace-h-1 h-[1px] w-48 sm:w-64"
            style={{
              background:
                'linear-gradient(90deg, transparent 0%, rgba(255,255,255,0.05) 30%, rgba(249,115,22,0.25) 50%, rgba(255,255,255,0.05) 70%, transparent 100%)',
            }}
          />
        </div>

        {/* Horizontal Trace 2 (Mid-lower area) */}
        <div className="absolute top-[68%] left-0 w-full h-[1px] hidden sm:block">
          <div
            className="orbit-tech-trace-h-2 h-[1px] w-36 sm:w-56"
            style={{
              background:
                'linear-gradient(90deg, transparent 0%, rgba(255,255,255,0.06) 40%, rgba(249,115,22,0.2) 50%, rgba(255,255,255,0.06) 60%, transparent 100%)',
            }}
          />
        </div>

        {/* Vertical Trace 1 (Right corridor) */}
        <div className="absolute top-0 right-[20%] sm:right-[26%] w-[1px] h-full hidden md:block">
          <div
            className="orbit-tech-trace-v-1 w-[1px] h-32 sm:h-44"
            style={{
              background:
                'linear-gradient(180deg, transparent 0%, rgba(255,255,255,0.08) 50%, transparent 100%)',
            }}
          />
        </div>
      </div>
    </div>
  );
};
