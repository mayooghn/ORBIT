import React, { useEffect, useRef } from 'react';

// Representative continent outlines in [lat, lon] coordinates (degrees)
const CONTINENT_PATHS: [number, number][][] = [
  // Eurasia coastline
  [
    [70, 25], [68, 45], [65, 60], [68, 75], [72, 105], [70, 130], [60, 140],
    [55, 135], [45, 132], [38, 128], [35, 120], [30, 122], [22, 114], [15, 108],
    [10, 105], [1, 104], [6, 100], [13, 100], [22, 92], [21, 88], [13, 80],
    [8, 77], [15, 73], [22, 69], [25, 62], [25, 57], [30, 48], [27, 50],
    [24, 55], [23, 58], [17, 54], [12, 44], [15, 40], [28, 33], [31, 32],
    [32, 35], [37, 36], [41, 29], [38, 24], [40, 18], [44, 12], [38, 0],
    [36, -5], [43, -9], [48, -4], [52, 2], [54, 8], [58, 12], [62, 18], [70, 25]
  ],
  // Africa
  [
    [36, -5], [37, 10], [32, 25], [31, 32], [28, 34], [15, 40], [12, 44],
    [11, 51], [2, 45], [-5, 39], [-15, 40], [-26, 33], [-34, 18], [-33, 26],
    [-28, 15], [-18, 12], [-5, 12], [4, 9], [5, 2], [4, -7], [10, -14],
    [15, -17], [22, -16], [30, -10], [36, -5]
  ],
  // India Subcontinent detailed focus
  [
    [25, 68], [23, 68.5], [21.5, 69.5], [20.5, 72.8], [19, 72.8], [15.5, 73.8],
    [12.8, 74.8], [9.9, 76.2], [8.1, 77.5], [9.3, 79.1], [11.9, 79.8], [13.1, 80.3],
    [16.7, 82.2], [17.7, 83.3], [19.8, 85.8], [21.5, 87.0], [22.2, 88.5], [22.5, 89.5]
  ],
  // Arabian Peninsula focus
  [
    [30, 35], [28, 34], [25, 37], [20, 40], [15, 42], [12.6, 43.5], [12.8, 45.0],
    [14.5, 49.0], [16.5, 53.5], [22.5, 59.8], [26.0, 56.5], [24.0, 54.0], [25.0, 50.5],
    [29.0, 48.0], [30.0, 47.5]
  ],
  // Southeast Asia Islands (Sumatra / Java / Borneo)
  [
    [5, 96], [-5, 105], [-8, 114], [-7, 108], [-3, 102], [2, 98], [5, 96]
  ],
  // Japan / East Asia Islands
  [
    [45, 142], [41, 140], [35, 136], [33, 131], [35, 139], [40, 141], [45, 142]
  ],
  // Americas (East Coast & South America for global depth)
  [
    [55, -60], [45, -65], [35, -75], [25, -80], [18, -90], [10, -75],
    [5, -52], [-5, -35], [-23, -42], [-35, -55], [-54, -68], [-40, -73],
    [-20, -70], [-5, -80], [8, -78], [15, -85], [22, -97], [29, -94],
    [30, -85], [40, -74], [48, -65], [55, -60]
  ],
  // Australia
  [
    [-12, 130], [-15, 136], [-12, 142], [-20, 148], [-28, 153], [-38, 145],
    [-35, 137], [-32, 125], [-35, 116], [-22, 114], [-16, 122], [-12, 130]
  ]
];

interface NetworkNode {
  id: string;
  name: string;
  code: string;
  lat: number;
  lon: number;
  type: 'hub' | 'chokepoint' | 'destination' | 'origin';
  color: string;
  radius: number;
}

interface TradeRoute {
  id: string;
  from: string;
  to: string;
  fromCoords: [number, number];
  toCoords: [number, number];
  color: string;
  isPrimary?: boolean;
  pulseSpeed?: number;
  particlesCount?: number;
}

const NODES: NetworkNode[] = [
  // Middle East / Gulf Hubs
  { id: 'hormuz', name: 'Strait of Hormuz', code: 'HORMUZ', lat: 26.5, lon: 56.3, type: 'chokepoint', color: '#f97316', radius: 5.5 },
  { id: 'rastanura', name: 'Ras Tanura Terminal', code: 'RAS TANURA', lat: 26.7, lon: 50.1, type: 'origin', color: '#f97316', radius: 4.5 },
  { id: 'fujairah', name: 'Fujairah Hub', code: 'FUJAIRAH', lat: 25.1, lon: 56.3, type: 'hub', color: '#fb923c', radius: 4 },
  { id: 'yanbu', name: 'Red Sea / Yanbu', code: 'YANBU', lat: 24.0, lon: 38.0, type: 'hub', color: '#f97316', radius: 3.5 },
  
  // Chokepoints
  { id: 'mandel', name: 'Bab el-Mandeb', code: 'BAB EL-MANDEB', lat: 12.6, lon: 43.3, type: 'chokepoint', color: '#ea580c', radius: 4.5 },
  { id: 'suez', name: 'Suez Canal', code: 'SUEZ CANAL', lat: 29.9, lon: 32.5, type: 'chokepoint', color: '#38bdf8', radius: 4 },
  { id: 'malacca', name: 'Malacca Strait', code: 'MALACCA', lat: 2.5, lon: 101.5, type: 'chokepoint', color: '#06b6d4', radius: 5 },

  // India Energy Terminals & Refineries
  { id: 'jamnagar', name: 'Jamnagar Mega Refinery', code: 'JAMNAGAR', lat: 22.4, lon: 69.8, type: 'destination', color: '#f97316', radius: 6 },
  { id: 'mumbai', name: 'Mumbai / JNPT', code: 'MUMBAI', lat: 18.9, lon: 72.8, type: 'destination', color: '#38bdf8', radius: 5 },
  { id: 'mangalore', name: 'Mangalore SPR', code: 'MANGALORE', lat: 12.9, lon: 74.8, type: 'destination', color: '#fb923c', radius: 4 },
  { id: 'vizag', name: 'Visakhapatnam Term', code: 'VIZAG', lat: 17.7, lon: 83.3, type: 'destination', color: '#06b6d4', radius: 4 },

  // Asia / Europe / Global Hubs
  { id: 'singapore', name: 'Singapore Bunker Hub', code: 'SINGAPORE', lat: 1.3, lon: 103.8, type: 'hub', color: '#06b6d4', radius: 5 },
  { id: 'ningbo', name: 'East Asia / Ningbo', code: 'NINGBO', lat: 29.9, lon: 121.6, type: 'destination', color: '#38bdf8', radius: 4 },
  { id: 'tokyo', name: 'Tokyo Bay Term', code: 'TOKYO', lat: 35.5, lon: 139.8, type: 'destination', color: '#94a3b8', radius: 3.5 },
  { id: 'rotterdam', name: 'Rotterdam Gateway', code: 'ROTTERDAM', lat: 51.9, lon: 4.5, type: 'destination', color: '#38bdf8', radius: 5 },
  { id: 'bonny', name: 'West Africa / Bonny', code: 'BONNY', lat: 4.4, lon: 7.1, type: 'origin', color: '#94a3b8', radius: 3.5 }
];

const ROUTES: TradeRoute[] = [
  // Primary Middle East -> India corridor (Heavy Flow)
  {
    id: 'hormuz-jamnagar',
    from: 'hormuz',
    to: 'jamnagar',
    fromCoords: [26.5, 56.3],
    toCoords: [22.4, 69.8],
    color: '#f97316',
    isPrimary: true,
    pulseSpeed: 1.4,
    particlesCount: 3
  },
  {
    id: 'fujairah-mumbai',
    from: 'fujairah',
    to: 'mumbai',
    fromCoords: [25.1, 56.3],
    toCoords: [18.9, 72.8],
    color: '#f97316',
    isPrimary: true,
    pulseSpeed: 1.2,
    particlesCount: 3
  },
  {
    id: 'rastanura-hormuz',
    from: 'rastanura',
    to: 'hormuz',
    fromCoords: [26.7, 50.1],
    toCoords: [26.5, 56.3],
    color: '#f97316',
    isPrimary: true,
    pulseSpeed: 1.6,
    particlesCount: 2
  },
  // Middle East -> Europe via Red Sea / Suez
  {
    id: 'hormuz-mandeb',
    from: 'hormuz',
    to: 'mandel',
    fromCoords: [26.5, 56.3],
    toCoords: [12.6, 43.3],
    color: '#fb923c',
    pulseSpeed: 1.0,
    particlesCount: 2
  },
  {
    id: 'mandeb-suez',
    from: 'mandel',
    to: 'suez',
    fromCoords: [12.6, 43.3],
    toCoords: [29.9, 32.5],
    color: '#38bdf8',
    pulseSpeed: 1.1,
    particlesCount: 2
  },
  {
    id: 'suez-rotterdam',
    from: 'suez',
    to: 'rotterdam',
    fromCoords: [29.9, 32.5],
    toCoords: [51.9, 4.5],
    color: '#38bdf8',
    pulseSpeed: 0.9,
    particlesCount: 3
  },
  // Middle East -> East Asia via Malacca
  {
    id: 'hormuz-malacca',
    from: 'hormuz',
    to: 'malacca',
    fromCoords: [26.5, 56.3],
    toCoords: [2.5, 101.5],
    color: '#f97316',
    pulseSpeed: 1.1,
    particlesCount: 3
  },
  {
    id: 'malacca-singapore',
    from: 'malacca',
    to: 'singapore',
    fromCoords: [2.5, 101.5],
    toCoords: [1.3, 103.8],
    color: '#06b6d4',
    pulseSpeed: 1.3,
    particlesCount: 2
  },
  {
    id: 'singapore-ningbo',
    from: 'singapore',
    to: 'ningbo',
    fromCoords: [1.3, 103.8],
    toCoords: [29.9, 121.6],
    color: '#06b6d4',
    pulseSpeed: 0.9,
    particlesCount: 2
  },
  {
    id: 'ningbo-tokyo',
    from: 'ningbo',
    to: 'tokyo',
    fromCoords: [29.9, 121.6],
    toCoords: [35.5, 139.8],
    color: '#94a3b8',
    pulseSpeed: 0.8,
    particlesCount: 1
  },
  // Southeast Asia -> India
  {
    id: 'singapore-vizag',
    from: 'singapore',
    to: 'vizag',
    fromCoords: [1.3, 103.8],
    toCoords: [17.7, 83.3],
    color: '#06b6d4',
    pulseSpeed: 1.0,
    particlesCount: 2
  },
  // West Africa -> India
  {
    id: 'bonny-mumbai',
    from: 'bonny',
    to: 'mumbai',
    fromCoords: [4.4, 7.1],
    toCoords: [18.9, 72.8],
    color: '#38bdf8',
    pulseSpeed: 0.7,
    particlesCount: 2
  }
];

export const EnergyNetworkGlobe: React.FC = () => {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const ctx = canvas.getContext('2d', { alpha: true });
    if (!ctx) return;

    let animationFrameId: number;
    let width = 0;
    let height = 0;
    let radius = 0;
    let centerX = 0;
    let centerY = 0;

    // Rotation state
    // Starts centered over Middle East / Indian Ocean (~65°E, ~20°N)
    let rotation = 1.15; // longitude rotation in radians
    const pitch = 0.35; // pitch tilt in radians (~20 degrees)
    let lastTime = performance.now();

    // Event propagation wave timer
    let eventTimer = 0;

    const resize = () => {
      if (!canvas) return;
      const rect = canvas.parentElement?.getBoundingClientRect() || canvas.getBoundingClientRect();
      const dpr = Math.min(window.devicePixelRatio || 1, 2);
      
      width = rect.width || window.innerWidth;
      height = rect.height || window.innerHeight;
      
      canvas.width = Math.round(width * dpr);
      canvas.height = Math.round(height * dpr);
      
      ctx.resetTransform?.();
      ctx.scale(dpr, dpr);

      // Large majestic sphere that extends well beyond any centered modal
      const minDim = Math.min(width, height);
      radius = Math.max(minDim * 0.58, 380);
      centerX = width * 0.5;
      centerY = height * 0.5;
    };

    resize();
    const resizeObserver = new ResizeObserver(resize);
    if (canvas.parentElement) {
      resizeObserver.observe(canvas.parentElement);
    } else {
      resizeObserver.observe(canvas);
    }
    window.addEventListener('resize', resize);

    // 3D coordinate converter with pitch and yaw
    const project = (
      latDeg: number,
      lonDeg: number,
      altitudeMultiplier = 1
    ): { x: number; y: number; z: number; visible: boolean } => {
      const latRad = (latDeg * Math.PI) / 180;
      const lonRad = (lonDeg * Math.PI) / 180 + rotation;

      // Base 3D Cartesian coordinates
      const x0 = Math.cos(latRad) * Math.sin(lonRad);
      const y0 = -Math.sin(latRad);
      const z0 = Math.cos(latRad) * Math.cos(lonRad);

      // Pitch rotation around X axis
      const cosPitch = Math.cos(pitch);
      const sinPitch = Math.sin(pitch);

      const x = x0;
      const y = y0 * cosPitch - z0 * sinPitch;
      const z = y0 * sinPitch + z0 * cosPitch;

      const r = radius * altitudeMultiplier;
      const screenX = centerX + x * r;
      const screenY = centerY + y * r;

      return {
        x: screenX,
        y: screenY,
        z,
        visible: z > -0.12
      };
    };

    // Render loop
    const render = (time: number) => {
      const dt = Math.min((time - lastTime) / 1000, 0.1);
      lastTime = time;

      // Smooth continuous rotation (~48 seconds per full revolution)
      rotation += dt * (Math.PI * 2) / 48;
      if (rotation > Math.PI * 2) rotation -= Math.PI * 2;

      eventTimer += dt;
      // Periodic event pulse cycle every 6.5 seconds
      const eventCycle = (eventTimer % 6.5) / 6.5; // 0..1
      const isEventActive = eventCycle < 0.65;
      const eventProgress = isEventActive ? eventCycle / 0.65 : 0;

      ctx.clearRect(0, 0, width, height);

      // 1. Ambient Glow & Starfield background points
      const bgGlow = ctx.createRadialGradient(
        centerX,
        centerY,
        radius * 0.1,
        centerX,
        centerY,
        radius * 1.4
      );
      bgGlow.addColorStop(0, 'rgba(249, 115, 22, 0.09)');
      bgGlow.addColorStop(0.35, 'rgba(6, 182, 212, 0.05)');
      bgGlow.addColorStop(0.7, 'rgba(15, 23, 42, 0.25)');
      bgGlow.addColorStop(1, 'rgba(0, 0, 0, 0)');

      ctx.fillStyle = bgGlow;
      ctx.beginPath();
      ctx.arc(centerX, centerY, radius * 1.4, 0, Math.PI * 2);
      ctx.fill();

      // Ambient Orbital Ring 1 (Tactical Equator Track)
      ctx.save();
      ctx.beginPath();
      ctx.ellipse(centerX, centerY, radius * 1.18, radius * 0.42, 0.22, 0, Math.PI * 2);
      ctx.strokeStyle = 'rgba(249, 115, 22, 0.18)';
      ctx.lineWidth = 1;
      ctx.setLineDash([4, 12]);
      ctx.stroke();
      ctx.setLineDash([]);
      ctx.restore();

      // Ambient Orbital Ring 2 (Polar Monitoring Orbit)
      ctx.save();
      ctx.beginPath();
      ctx.ellipse(centerX, centerY, radius * 1.28, radius * 0.52, -0.45, 0, Math.PI * 2);
      ctx.strokeStyle = 'rgba(6, 182, 212, 0.15)';
      ctx.lineWidth = 1;
      ctx.setLineDash([2, 8]);
      ctx.stroke();
      ctx.setLineDash([]);
      ctx.restore();

      // 2. Globe Body Circle (Dark Technical Canvas with Depth)
      const bodyGrad = ctx.createRadialGradient(
        centerX - radius * 0.35,
        centerY - radius * 0.35,
        radius * 0.05,
        centerX,
        centerY,
        radius
      );
      bodyGrad.addColorStop(0, '#1c1c1c');
      bodyGrad.addColorStop(0.6, '#0f0f0f');
      bodyGrad.addColorStop(0.95, '#060606');
      bodyGrad.addColorStop(1, '#000000');

      ctx.save();
      ctx.beginPath();
      ctx.arc(centerX, centerY, radius, 0, Math.PI * 2);
      ctx.fillStyle = bodyGrad;
      ctx.fill();
      ctx.lineWidth = 1.5;
      ctx.strokeStyle = 'rgba(249, 115, 22, 0.25)';
      ctx.stroke();

      // Clip inside globe for graticules and continents
      ctx.clip();

      // 3. Graticule Lines (Latitude & Longitude Grid)
      ctx.lineWidth = 0.9;
      ctx.strokeStyle = 'rgba(148, 163, 184, 0.12)';

      // Parallels (Latitudes)
      for (let lat = -60; lat <= 60; lat += 20) {
        ctx.beginPath();
        let first = true;
        for (let lon = -180; lon <= 180; lon += 4) {
          const pt = project(lat, lon);
          if (pt.z > 0.02) {
            if (first) {
              ctx.moveTo(pt.x, pt.y);
              first = false;
            } else {
              ctx.lineTo(pt.x, pt.y);
            }
          } else {
            first = true;
          }
        }
        ctx.stroke();
      }

      // Meridians (Longitudes)
      for (let lon = -180; lon < 180; lon += 20) {
        ctx.beginPath();
        let first = true;
        for (let lat = -80; lat <= 80; lat += 4) {
          const pt = project(lat, lon);
          if (pt.z > 0.02) {
            if (first) {
              ctx.moveTo(pt.x, pt.y);
              first = false;
            } else {
              ctx.lineTo(pt.x, pt.y);
            }
          } else {
            first = true;
          }
        }
        ctx.stroke();
      }

      // 4. Continent Outlines (High Contrast Technical Vector Coastlines)
      for (const path of CONTINENT_PATHS) {
        ctx.beginPath();
        let drawing = false;
        for (let i = 0; i < path.length; i++) {
          const [lat, lon] = path[i];
          const pt = project(lat, lon);
          if (pt.z > 0.01) {
            if (!drawing) {
              ctx.moveTo(pt.x, pt.y);
              drawing = true;
            } else {
              ctx.lineTo(pt.x, pt.y);
            }
          } else {
            drawing = false;
          }
        }
        ctx.strokeStyle = 'rgba(226, 232, 240, 0.42)';
        ctx.lineWidth = 1.4;
        ctx.stroke();
      }

      // India Subcontinent Glow Highlight Fill
      const indiaPts = CONTINENT_PATHS[2].map(([lat, lon]) => project(lat, lon));
      if (indiaPts.every(p => p.z > 0.05)) {
        ctx.beginPath();
        indiaPts.forEach((p, idx) => {
          if (idx === 0) ctx.moveTo(p.x, p.y);
          else ctx.lineTo(p.x, p.y);
        });
        ctx.closePath();
        ctx.fillStyle = 'rgba(249, 115, 22, 0.12)';
        ctx.fill();
        ctx.strokeStyle = 'rgba(249, 115, 22, 0.6)';
        ctx.lineWidth = 1.6;
        ctx.stroke();
      }

      ctx.restore(); // Exit globe clipping for elevated 3D arcs and orbital labels

      // 5. Atmospheric Outer Glowing Rim
      ctx.beginPath();
      ctx.arc(centerX, centerY, radius, 0, Math.PI * 2);
      ctx.strokeStyle = 'rgba(249, 115, 22, 0.4)';
      ctx.lineWidth = 2;
      ctx.stroke();

      // Outer delicate radar tick circle
      ctx.beginPath();
      ctx.arc(centerX, centerY, radius + 12, 0, Math.PI * 2);
      ctx.strokeStyle = 'rgba(6, 182, 212, 0.2)';
      ctx.lineWidth = 1;
      ctx.setLineDash([3, 10]);
      ctx.stroke();
      ctx.setLineDash([]);

      // 6. 3D Trade Route Arcs (Elevated Great-circle Corridors with Traveling Photons)
      ROUTES.forEach(route => {
        const [lat1, lon1] = route.fromCoords;
        const [lat2, lon2] = route.toCoords;

        const steps = 36;
        const points: { x: number; y: number; z: number; visible: boolean }[] = [];

        // SLERP on unit sphere
        const phi1 = (lat1 * Math.PI) / 180;
        const lambda1 = (lon1 * Math.PI) / 180;
        const phi2 = (lat2 * Math.PI) / 180;
        const lambda2 = (lon2 * Math.PI) / 180;

        const p1 = [Math.cos(phi1) * Math.sin(lambda1), -Math.sin(phi1), Math.cos(phi1) * Math.cos(lambda1)];
        const p2 = [Math.cos(phi2) * Math.sin(lambda2), -Math.sin(phi2), Math.cos(phi2) * Math.cos(lambda2)];

        const dot = Math.max(-1, Math.min(1, p1[0] * p2[0] + p1[1] * p2[1] + p1[2] * p2[2]));
        const omega = Math.acos(dot);
        const sinOmega = Math.sin(omega);

        for (let i = 0; i <= steps; i++) {
          const t = i / steps;
          let ptLat = lat1;
          let ptLon = lon1;

          if (sinOmega > 0.001) {
            const w1 = Math.sin((1 - t) * omega) / sinOmega;
            const w2 = Math.sin(t * omega) / sinOmega;
            const x = w1 * p1[0] + w2 * p2[0];
            const y = w1 * p1[1] + w2 * p2[1];
            const z = w1 * p1[2] + w2 * p2[2];

            ptLat = (-Math.asin(Math.max(-1, Math.min(1, y))) * 180) / Math.PI;
            ptLon = (Math.atan2(x, z) * 180) / Math.PI;
          } else {
            ptLat = lat1 + (lat2 - lat1) * t;
            ptLon = lon1 + (lon2 - lon1) * t;
          }

          // Arcs arch outward in 3D
          const elevation = 1 + 0.08 * Math.sin(Math.PI * t);
          points.push(project(ptLat, ptLon, elevation));
        }

        // Draw Base Route Arc Line
        ctx.beginPath();
        let hasDrawn = false;
        for (let i = 0; i < points.length; i++) {
          const pt = points[i];
          if (pt.z > -0.05) {
            if (!hasDrawn) {
              ctx.moveTo(pt.x, pt.y);
              hasDrawn = true;
            } else {
              ctx.lineTo(pt.x, pt.y);
            }
          } else {
            hasDrawn = false;
          }
        }

        const avgZ = points.reduce((acc, p) => acc + p.z, 0) / points.length;
        if (avgZ > -0.15) {
          const depthAlpha = Math.max(0.2, Math.min(1.0, (avgZ + 0.15) / 0.8));
          
          const isHormuzPrimary = route.id === 'hormuz-jamnagar' || route.id === 'fujairah-mumbai';
          let highlightBoost = 1;
          if (isHormuzPrimary && isEventActive) {
            highlightBoost = 1 + 0.7 * Math.sin(eventProgress * Math.PI);
          }

          // Glowing underlay
          ctx.save();
          ctx.strokeStyle = route.isPrimary
            ? `rgba(249, 115, 22, ${0.75 * depthAlpha * highlightBoost})`
            : route.color === '#06b6d4'
            ? `rgba(6, 182, 212, ${0.65 * depthAlpha})`
            : `rgba(56, 189, 248, ${0.55 * depthAlpha})`;
          ctx.lineWidth = route.isPrimary ? 2.4 : 1.6;
          ctx.shadowColor = route.isPrimary ? '#f97316' : '#06b6d4';
          ctx.shadowBlur = route.isPrimary ? 8 : 4;
          ctx.stroke();
          ctx.restore();

          // Multiple animated moving energy photons traveling along routes
          const count = route.particlesCount || 2;
          for (let pIdx = 0; pIdx < count; pIdx++) {
            const staggered = (time * 0.0008 * (route.pulseSpeed || 1) + (pIdx / count)) % 1;
            const pulseIndex = Math.floor(staggered * (points.length - 1));
            const pulsePt = points[pulseIndex];

            if (pulsePt && pulsePt.z > 0.02) {
              const pAlpha = Math.min(1, (pulsePt.z + 0.1) / 0.7);
              
              // Outer glow
              ctx.beginPath();
              ctx.arc(pulsePt.x, pulsePt.y, route.isPrimary ? 6 : 4, 0, Math.PI * 2);
              ctx.fillStyle = route.isPrimary
                ? `rgba(249, 115, 22, ${0.4 * pAlpha})`
                : `rgba(6, 182, 212, ${0.35 * pAlpha})`;
              ctx.fill();

              // Bright core
              ctx.beginPath();
              ctx.arc(pulsePt.x, pulsePt.y, route.isPrimary ? 3.2 : 2.2, 0, Math.PI * 2);
              ctx.fillStyle = '#ffffff';
              ctx.fill();
            }
          }
        }
      });

      // 7. Live Geopolitical Shockwave & Energy Packet Corridor (Hormuz -> Jamnagar/Mumbai)
      if (isEventActive) {
        const eventOrigin = project(26.5, 56.3, 1.05);
        const eventDest = project(22.4, 69.8, 1.05);

        if (eventOrigin.z > 0) {
          // Multiple expanding ripple rings at Hormuz
          for (let ring = 1; ring <= 3; ring++) {
            const rOffset = ((eventProgress * 2.5) + (ring * 0.3)) % 1;
            const rippleRadius = 6 + 32 * rOffset;
            const rippleAlpha = Math.max(0, 1 - rOffset) * Math.min(1, (eventOrigin.z + 0.1));

            ctx.beginPath();
            ctx.arc(eventOrigin.x, eventOrigin.y, rippleRadius, 0, Math.PI * 2);
            ctx.strokeStyle = `rgba(249, 115, 22, ${0.85 * rippleAlpha})`;
            ctx.lineWidth = 1.5;
            ctx.stroke();
          }

          // Shockwave center core
          ctx.beginPath();
          ctx.arc(eventOrigin.x, eventOrigin.y, 6, 0, Math.PI * 2);
          ctx.fillStyle = '#f97316';
          ctx.shadowColor = '#f97316';
          ctx.shadowBlur = 12;
          ctx.fill();
          ctx.shadowBlur = 0;
        }

        // Fast high-intensity disruption comet traveling to India
        const t = eventProgress;
        const cometLat = 26.5 + (22.4 - 26.5) * t;
        const cometLon = 56.3 + (69.8 - 56.3) * t;
        const cometElev = 1 + 0.09 * Math.sin(Math.PI * t);
        const cometPt = project(cometLat, cometLon, cometElev);

        if (cometPt.z > 0.02) {
          // Trail behind comet
          for (let trail = 1; trail <= 5; trail++) {
            const trailT = Math.max(0, t - trail * 0.04);
            const tLat = 26.5 + (22.4 - 26.5) * trailT;
            const tLon = 56.3 + (69.8 - 56.3) * trailT;
            const tPt = project(tLat, tLon, 1 + 0.09 * Math.sin(Math.PI * trailT));
            if (tPt.z > 0.02) {
              ctx.beginPath();
              ctx.arc(tPt.x, tPt.y, 4 - trail * 0.6, 0, Math.PI * 2);
              ctx.fillStyle = `rgba(249, 115, 22, ${0.7 - trail * 0.12})`;
              ctx.fill();
            }
          }

          // Main comet head
          ctx.beginPath();
          ctx.arc(cometPt.x, cometPt.y, 5, 0, Math.PI * 2);
          ctx.fillStyle = '#ffffff';
          ctx.shadowColor = '#f97316';
          ctx.shadowBlur = 16;
          ctx.fill();
          ctx.shadowBlur = 0;
        }

        // Arrival pulse at India terminal
        if (t > 0.65 && eventDest.z > 0) {
          const destPulseAlpha = Math.sin(((t - 0.65) / 0.35) * Math.PI);
          ctx.beginPath();
          ctx.arc(eventDest.x, eventDest.y, 8 + 16 * destPulseAlpha, 0, Math.PI * 2);
          ctx.strokeStyle = `rgba(249, 115, 22, ${0.9 * destPulseAlpha})`;
          ctx.lineWidth = 2;
          ctx.stroke();
        }
      }

      // 8. Strategic Network Nodes & 3D Radar Callouts
      NODES.forEach(node => {
        const pt = project(node.lat, node.lon, 1.04);
        if (pt.z > 0.05) {
          const depthAlpha = Math.min(1, Math.max(0.3, (pt.z + 0.1) / 0.75));
          const baseRadius = node.radius || 4;

          // Pulsing radar ring
          const isPulsing = node.id === 'hormuz' || node.id === 'jamnagar' || node.id === 'mumbai' || node.id === 'malacca';
          const pulse = (time * 0.0025 + node.lat) % 1;

          if (isPulsing) {
            ctx.beginPath();
            ctx.arc(pt.x, pt.y, baseRadius + 14 * pulse, 0, Math.PI * 2);
            ctx.strokeStyle = node.color === '#f97316'
              ? `rgba(249, 115, 22, ${0.7 * (1 - pulse) * depthAlpha})`
              : `rgba(6, 182, 212, ${0.6 * (1 - pulse) * depthAlpha})`;
            ctx.lineWidth = 1.2;
            ctx.stroke();
          }

          // Outer halo
          ctx.beginPath();
          ctx.arc(pt.x, pt.y, baseRadius * 2, 0, Math.PI * 2);
          ctx.fillStyle = node.color === '#f97316'
            ? `rgba(249, 115, 22, ${0.35 * depthAlpha})`
            : `rgba(6, 182, 212, ${0.3 * depthAlpha})`;
          ctx.fill();

          // Core node
          ctx.beginPath();
          ctx.arc(pt.x, pt.y, baseRadius, 0, Math.PI * 2);
          ctx.fillStyle = node.color;
          ctx.shadowColor = node.color;
          ctx.shadowBlur = 8;
          ctx.fill();
          ctx.shadowBlur = 0;

          // Inner white center
          ctx.beginPath();
          ctx.arc(pt.x, pt.y, Math.max(1.5, baseRadius * 0.4), 0, Math.PI * 2);
          ctx.fillStyle = '#ffffff';
          ctx.fill();

          // Alphanumeric Technical Node Label
          if (pt.z > 0.35) {
            ctx.save();
            ctx.font = '9px "JetBrains Mono", Menlo, monospace';
            ctx.fillStyle = `rgba(255, 255, 255, ${0.85 * depthAlpha})`;
            ctx.fillText(node.code, pt.x + baseRadius + 4, pt.y + 3);
            ctx.restore();
          }
        }
      });

      animationFrameId = requestAnimationFrame(render);
    };

    animationFrameId = requestAnimationFrame(render);

    return () => {
      cancelAnimationFrame(animationFrameId);
      resizeObserver.disconnect();
      window.removeEventListener('resize', resize);
    };
  }, []);

  return (
    <div className="absolute inset-0 w-full h-full pointer-events-none select-none overflow-hidden">
      <canvas
        ref={canvasRef}
        className="w-full h-full block"
        aria-hidden="true"
      />
    </div>
  );
};

