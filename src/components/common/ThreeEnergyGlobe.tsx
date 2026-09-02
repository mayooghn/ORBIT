import React, { useEffect, useRef, useState } from 'react';
import * as THREE from 'three';

// -------------------------------------------------------------
// Continental Geo-Polygons for Point-Cloud Sampling (360° Global Coverage)
// -------------------------------------------------------------
const CONTINENT_POLYS: [number, number][][] = [
  // Eurasia
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
  // India Subcontinent
  [
    [32, 75], [28, 70], [25, 68], [23, 68.5], [21.5, 69.5], [20.5, 72.8], [19, 72.8],
    [15.5, 73.8], [12.8, 74.8], [9.9, 76.2], [8.1, 77.5], [9.3, 79.1], [11.9, 79.8],
    [13.1, 80.3], [16.7, 82.2], [17.7, 83.3], [19.8, 85.8], [21.5, 87.0], [22.2, 88.5],
    [26, 89], [28, 80], [32, 75]
  ],
  // North America & Mexico
  [
    [71, -165], [72, -135], [68, -95], [60, -75], [58, -60], [48, -53], [44, -64],
    [41, -70], [30, -81], [25, -80], [25, -82], [30, -88], [29, -95], [26, -97],
    [21, -97], [18, -92], [15, -88], [14, -92], [18, -105], [24, -110], [32, -117],
    [38, -124], [48, -125], [54, -133], [60, -145], [66, -168], [71, -165]
  ],
  // Central America
  [
    [15, -88], [12, -86], [9, -83], [8, -78], [9, -79], [13, -84], [15, -88]
  ],
  // South America
  [
    [12, -72], [10, -62], [6, -52], [0, -48], [-5, -35], [-12, -37], [-23, -42],
    [-30, -50], [-38, -57], [-46, -65], [-54, -68], [-52, -75], [-40, -73],
    [-25, -70], [-15, -75], [-5, -80], [4, -77], [10, -75], [12, -72]
  ],
  // Australia & New Zealand
  [
    [-12, 130], [-15, 136], [-12, 142], [-20, 148], [-28, 153], [-38, 145],
    [-35, 137], [-32, 125], [-35, 116], [-22, 114], [-16, 122], [-12, 130]
  ],
  // Japan Archipelagos
  [
    [45, 141], [43, 145], [40, 141], [35, 140], [33, 135], [31, 130], [34, 131],
    [37, 137], [41, 140], [45, 141]
  ],
  // British Isles & Scandinavia
  [
    [58, -6], [55, -2], [51, 1], [50, -5], [54, -5], [58, -6]
  ],
  // Southeast Asia Islands (Indonesia / Philippines)
  [
    [18, 120], [14, 121], [8, 124], [6, 116], [-3, 114], [-7, 110], [-6, 106],
    [2, 100], [5, 96], [6, 102], [14, 108], [18, 120]
  ]
];

function isPointInPolygon(point: [number, number], vs: [number, number][]): boolean {
  const x = point[1]; // lon
  const y = point[0]; // lat
  let inside = false;
  for (let i = 0, j = vs.length - 1; i < vs.length; j = i++) {
    const xi = vs[i][1], yi = vs[i][0];
    const xj = vs[j][1], yj = vs[j][0];
    const intersect = ((yi > y) !== (yj > y)) && (x < (xj - xi) * (y - yi) / (yj - yi) + xi);
    if (intersect) inside = !inside;
  }
  return inside;
}

// Convert Lat/Lon (degrees) to 3D Vector3
export function latLonToVector3(lat: number, lon: number, radius: number): THREE.Vector3 {
  const phi = (90 - lat) * (Math.PI / 180);
  const theta = (lon + 180) * (Math.PI / 180);

  const x = -(radius * Math.sin(phi) * Math.cos(theta));
  const z = radius * Math.sin(phi) * Math.sin(theta);
  const y = radius * Math.cos(phi);

  return new THREE.Vector3(x, y, z);
}

export interface StrategicNode {
  id: string;
  name: string;
  code: string;
  type: 'chokepoint' | 'refinery' | 'origin' | 'hub' | 'spr';
  lat: number;
  lon: number;
  capacity?: string;
  color: string;
}

export interface SupplyRoute {
  id: string;
  name: string;
  from: string;
  to: string;
  fromCoords: [number, number];
  toCoords: [number, number];
  color: string;
  flowMbpd: string;
  isPrimary?: boolean;
}

// Helper to create clean, borderless text label sprites floating beside each dot
function createNodeLabelSprite(node: StrategicNode): THREE.Sprite {
  const canvas = document.createElement('canvas');
  canvas.width = 300;
  canvas.height = 70;
  const ctx = canvas.getContext('2d')!;

  // Transparent background - No boxes or borders
  ctx.clearRect(0, 0, canvas.width, canvas.height);

  // Soft dark drop-shadow for crisp legibility against dark globe & ocean points
  ctx.shadowColor = 'rgba(0, 0, 0, 0.95)';
  ctx.shadowBlur = 6;
  ctx.shadowOffsetX = 0;
  ctx.shadowOffsetY = 1;

  // Primary Facility Name Text
  ctx.font = 'bold 22px "JetBrains Mono", ui-monospace, SFMono-Regular, monospace';
  ctx.fillStyle = '#ffffff';
  ctx.fillText(node.code, 10, 28);

  // Facility Type Subtitle
  ctx.font = '600 13px "JetBrains Mono", ui-monospace, SFMono-Regular, monospace';
  ctx.fillStyle = node.color;
  const typeLabel = node.type === 'chokepoint' ? 'CHOKEPOINT' :
    node.type === 'refinery' ? 'REFINERY' :
    node.type === 'spr' ? 'SPR VAULT' :
    node.type === 'origin' ? 'TERMINAL' : 'ENERGY HUB';
  ctx.fillText(typeLabel, 10, 48);

  const texture = new THREE.CanvasTexture(canvas);
  texture.minFilter = THREE.LinearFilter;
  const spriteMat = new THREE.SpriteMaterial({
    map: texture,
    transparent: true,
    depthWrite: false
  });
  const sprite = new THREE.Sprite(spriteMat);
  sprite.scale.set(0.36, 0.084, 1);
  return sprite;
}

export const STRATEGIC_NODES: StrategicNode[] = [
  // ==========================================
  // Middle East & Indian Ocean
  // ==========================================
  { id: 'hormuz', name: 'Strait of Hormuz', code: 'HORMUZ', type: 'chokepoint', lat: 26.5, lon: 56.3, capacity: '21.0 Mb/d', color: '#f97316' },
  { id: 'mandeb', name: 'Bab el-Mandeb', code: 'BAB EL-MANDEB', type: 'chokepoint', lat: 12.6, lon: 43.3, capacity: '7.1 Mb/d', color: '#ea580c' },
  { id: 'rastanura', name: 'Ras Tanura Terminal', code: 'RAS TANURA', type: 'origin', lat: 26.7, lon: 50.1, capacity: '6.5 Mb/d export', color: '#f97316' },
  { id: 'fujairah', name: 'Fujairah Bunkering Hub', code: 'FUJAIRAH', type: 'hub', lat: 25.1, lon: 56.3, capacity: '70M bbl storage', color: '#fb923c' },
  { id: 'yanbu', name: 'Yanbu Red Sea Terminal', code: 'YANBU', type: 'origin', lat: 24.0, lon: 38.0, capacity: '5.0 Mb/d pipeline', color: '#f97316' },
  { id: 'jamnagar', name: 'Jamnagar Mega Refinery', code: 'JAMNAGAR', type: 'refinery', lat: 22.4, lon: 69.8, capacity: '1.24 Mb/d (World Max)', color: '#f97316' },
  { id: 'mumbai', name: 'Mumbai / JNPT Cluster', code: 'MUMBAI', type: 'refinery', lat: 18.9, lon: 72.8, capacity: '0.62 Mb/d refining', color: '#38bdf8' },
  { id: 'mangalore', name: 'Mangalore SPR Facility', code: 'MANGALORE SPR', type: 'spr', lat: 12.9, lon: 74.8, capacity: '1.5 MMT Vault', color: '#fb923c' },
  { id: 'vizag', name: 'Visakhapatnam SPR / Port', code: 'VIZAG SPR', type: 'spr', lat: 17.7, lon: 83.3, capacity: '1.33 MMT Vault', color: '#06b6d4' },

  // ==========================================
  // East Asia & Pacific
  // ==========================================
  { id: 'malacca', name: 'Malacca Strait', code: 'MALACCA', type: 'chokepoint', lat: 2.5, lon: 101.5, capacity: '16.0 Mb/d to Asia', color: '#06b6d4' },
  { id: 'singapore', name: 'Singapore Energy Hub', code: 'SINGAPORE', type: 'hub', lat: 1.3, lon: 103.8, capacity: 'Global Jurong Complex', color: '#06b6d4' },
  { id: 'ningbo', name: 'Ningbo-Zhoushan Port', code: 'NINGBO', type: 'hub', lat: 29.9, lon: 121.6, capacity: 'Supertanker Hub', color: '#38bdf8' },
  { id: 'tokyo', name: 'Tokyo Bay Complex', code: 'TOKYO BAY', type: 'refinery', lat: 35.5, lon: 139.8, capacity: '3.2 Mb/d refining', color: '#38bdf8' },
  { id: 'ulsan', name: 'Ulsan Mega Refining Hub', code: 'ULSAN', type: 'refinery', lat: 35.5, lon: 129.3, capacity: '0.84 Mb/d complex', color: '#06b6d4' },
  { id: 'nwshelf', name: 'North West Shelf LNG', code: 'NW SHELF LNG', type: 'origin', lat: -20.5, lon: 116.8, capacity: '16.9 Mt/a LNG', color: '#fb923c' },
  { id: 'sydney', name: 'Sydney Pacific Gateway', code: 'SYDNEY', type: 'hub', lat: -33.8, lon: 151.2, capacity: 'Pacific fuel portal', color: '#38bdf8' },
  { id: 'hawaii', name: 'Honolulu Mid-Pacific', code: 'HAWAII HUB', type: 'hub', lat: 21.3, lon: -157.8, capacity: 'Pacific transit node', color: '#38bdf8' },

  // ==========================================
  // Americas (Western Hemisphere)
  // ==========================================
  { id: 'panama', name: 'Panama Canal', code: 'PANAMA CANAL', type: 'chokepoint', lat: 9.1, lon: -79.7, capacity: 'Neopanamax LNG/LPG', color: '#f97316' },
  { id: 'houston', name: 'Houston Refining Complex', code: 'HOUSTON HUB', type: 'refinery', lat: 29.8, lon: -95.4, capacity: '2.8 Mb/d refining', color: '#f97316' },
  { id: 'cushing', name: 'Cushing WTI Hub & SPR', code: 'CUSHING SPR', type: 'spr', lat: 35.9, lon: -96.8, capacity: '90M bbl WTI Vault', color: '#fb923c' },
  { id: 'loop', name: 'Louisiana Offshore Port', code: 'LOOP TERMINAL', type: 'origin', lat: 28.8, lon: -90.0, capacity: 'Deepwater VLCC port', color: '#38bdf8' },
  { id: 'corpus', name: 'Corpus Christi Export', code: 'CORPUS CHRISTI', type: 'hub', lat: 27.8, lon: -97.4, capacity: '2.2 Mb/d crude export', color: '#06b6d4' },
  { id: 'valdez', name: 'Valdez Alaska Terminal', code: 'VALDEZ TAPS', type: 'origin', lat: 61.1, lon: -146.3, capacity: '0.5 Mb/d North Slope', color: '#38bdf8' },
  { id: 'calgary', name: 'Calgary Oil Sands Hub', code: 'CALGARY HUB', type: 'origin', lat: 51.0, lon: -114.1, capacity: '3.8 Mb/d heavy crude', color: '#94a3b8' },
  { id: 'bayarea', name: 'Richmond / SF Bay', code: 'SF REFINERY', type: 'refinery', lat: 37.8, lon: -122.3, capacity: '0.75 Mb/d fuels', color: '#38bdf8' },
  { id: 'maracaibo', name: 'Maracaibo Basin', code: 'MARACAIBO', type: 'origin', lat: 10.6, lon: -71.6, capacity: 'Heavy crude reserve', color: '#ea580c' },
  { id: 'santos', name: 'Santos Pre-Salt Basin', code: 'SANTOS BASIN', type: 'origin', lat: -24.0, lon: -46.3, capacity: '2.4 Mb/d deepwater', color: '#f97316' },

  // ==========================================
  // Europe, Atlantic & Africa
  // ==========================================
  { id: 'suez', name: 'Suez Canal', code: 'SUEZ CANAL', type: 'chokepoint', lat: 29.9, lon: 32.5, capacity: '5.5 Mb/d crude & LNG', color: '#38bdf8' },
  { id: 'gibraltar', name: 'Strait of Gibraltar', code: 'GIBRALTAR', type: 'chokepoint', lat: 36.1, lon: -5.3, capacity: '4.2 Mb/d Atlantic-Med', color: '#38bdf8' },
  { id: 'rotterdam', name: 'Rotterdam Gateway', code: 'ROTTERDAM', type: 'hub', lat: 51.9, lon: 4.5, capacity: 'ARA Refining Center', color: '#38bdf8' },
  { id: 'northsea', name: 'North Sea Brent Field', code: 'NORTH SEA', type: 'origin', lat: 58.0, lon: 1.5, capacity: '1.4 Mb/d light crude', color: '#38bdf8' },
  { id: 'bonny', name: 'Bonny Terminal (Nigeria)', code: 'BONNY SWEET', type: 'origin', lat: 4.4, lon: 7.1, capacity: '1.2 Mb/d light sweet', color: '#94a3b8' },
  { id: 'cape', name: 'Cape of Good Hope', code: 'CAPE ROUTE', type: 'chokepoint', lat: -34.4, lon: 18.5, capacity: 'Supertanker corridor', color: '#ea580c' }
];

export const SUPPLY_ROUTES: SupplyRoute[] = [
  // Middle East -> India Critical Corridors
  {
    id: 'hormuz-jamnagar',
    name: 'Ras Tanura / Hormuz → Jamnagar Refinery',
    from: 'hormuz',
    to: 'jamnagar',
    fromCoords: [26.5, 56.3],
    toCoords: [22.4, 69.8],
    color: '#f97316',
    flowMbpd: '1.8 Mb/d direct crude flow',
    isPrimary: true
  },
  {
    id: 'fujairah-mumbai',
    name: 'Fujairah Gulf Hub → Mumbai Refineries',
    from: 'fujairah',
    to: 'mumbai',
    fromCoords: [25.1, 56.3],
    toCoords: [18.9, 72.8],
    color: '#f97316',
    flowMbpd: '1.4 Mb/d tanker corridor',
    isPrimary: true
  },
  {
    id: 'rastanura-hormuz',
    name: 'Ras Tanura Loading → Strait of Hormuz',
    from: 'rastanura',
    to: 'hormuz',
    fromCoords: [26.7, 50.1],
    toCoords: [26.5, 56.3],
    color: '#fb923c',
    flowMbpd: '4.5 Mb/d export stream',
    isPrimary: true
  },
  {
    id: 'fujairah-mangalore',
    name: 'Fujairah Hub → Mangalore SPR Cavern',
    from: 'fujairah',
    to: 'mangalore',
    fromCoords: [25.1, 56.3],
    toCoords: [12.9, 74.8],
    color: '#fb923c',
    flowMbpd: '0.8 Mb/d strategic reserve feed',
    isPrimary: true
  },
  // Red Sea / Europe Corridor
  {
    id: 'yanbu-mandeb',
    name: 'Yanbu Red Sea → Bab el-Mandeb',
    from: 'yanbu',
    to: 'mandeb',
    fromCoords: [24.0, 38.0],
    toCoords: [12.6, 43.3],
    color: '#ea580c',
    flowMbpd: '2.2 Mb/d southbound stream'
  },
  {
    id: 'mandeb-suez',
    name: 'Bab el-Mandeb → Suez Canal',
    from: 'mandeb',
    to: 'suez',
    fromCoords: [12.6, 43.3],
    toCoords: [29.9, 32.5],
    color: '#38bdf8',
    flowMbpd: '5.5 Mb/d trans-Suez maritime'
  },
  {
    id: 'suez-rotterdam',
    name: 'Suez Canal → Rotterdam Hub',
    from: 'suez',
    to: 'rotterdam',
    fromCoords: [29.9, 32.5],
    toCoords: [51.9, 4.5],
    color: '#38bdf8',
    flowMbpd: '3.1 Mb/d Med-Atlantic transit'
  },
  {
    id: 'rotterdam-gibraltar',
    name: 'Rotterdam → Gibraltar Gateway',
    from: 'rotterdam',
    to: 'gibraltar',
    fromCoords: [51.9, 4.5],
    toCoords: [36.1, -5.3],
    color: '#38bdf8',
    flowMbpd: '1.9 Mb/d Atlantic stream'
  },
  {
    id: 'northsea-rotterdam',
    name: 'North Sea Brent → Rotterdam ARA',
    from: 'northsea',
    to: 'rotterdam',
    fromCoords: [58.0, 1.5],
    toCoords: [51.9, 4.5],
    color: '#38bdf8',
    flowMbpd: '1.2 Mb/d short-haul crude'
  },

  // Malacca / East Asia / Pacific Corridors
  {
    id: 'hormuz-malacca',
    name: 'Strait of Hormuz → Malacca Strait',
    from: 'hormuz',
    to: 'malacca',
    fromCoords: [26.5, 56.3],
    toCoords: [2.5, 101.5],
    color: '#f97316',
    flowMbpd: '14.2 Mb/d Far East transit'
  },
  {
    id: 'malacca-singapore',
    name: 'Malacca Strait → Singapore Hub',
    from: 'malacca',
    to: 'singapore',
    fromCoords: [2.5, 101.5],
    toCoords: [1.3, 103.8],
    color: '#06b6d4',
    flowMbpd: '6.0 Mb/d refining intake'
  },
  {
    id: 'singapore-ningbo',
    name: 'Singapore → Ningbo-Zhoushan',
    from: 'singapore',
    to: 'ningbo',
    fromCoords: [1.3, 103.8],
    toCoords: [29.9, 121.6],
    color: '#06b6d4',
    flowMbpd: '8.4 Mb/d East Asia crude'
  },
  {
    id: 'singapore-ulsan',
    name: 'Singapore → Ulsan Refinery',
    from: 'singapore',
    to: 'ulsan',
    fromCoords: [1.3, 103.8],
    toCoords: [35.5, 129.3],
    color: '#06b6d4',
    flowMbpd: '2.1 Mb/d Korean stream'
  },
  {
    id: 'singapore-tokyo',
    name: 'Singapore → Tokyo Bay',
    from: 'singapore',
    to: 'tokyo',
    fromCoords: [1.3, 103.8],
    toCoords: [35.5, 139.8],
    color: '#38bdf8',
    flowMbpd: '3.4 Mb/d Japan crude feed'
  },
  {
    id: 'nwshelf-tokyo',
    name: 'NW Shelf Australia → Tokyo LNG',
    from: 'nwshelf',
    to: 'tokyo',
    fromCoords: [-20.5, 116.8],
    toCoords: [35.5, 139.8],
    color: '#fb923c',
    flowMbpd: '1.1 Mb/d equivalent LNG'
  },
  {
    id: 'singapore-sydney',
    name: 'Singapore → Sydney Gateway',
    from: 'singapore',
    to: 'sydney',
    fromCoords: [1.3, 103.8],
    toCoords: [-33.8, 151.2],
    color: '#06b6d4',
    flowMbpd: '0.8 Mb/d clean products'
  },

  // Americas (Western Hemisphere) Routes
  {
    id: 'cushing-houston',
    name: 'Cushing Pipeline Hub → Houston Gulf Complex',
    from: 'cushing',
    to: 'houston',
    fromCoords: [35.9, -96.8],
    toCoords: [29.8, -95.4],
    color: '#fb923c',
    flowMbpd: '2.5 Mb/d domestic pipeline feed',
    isPrimary: true
  },
  {
    id: 'houston-loop',
    name: 'Houston → Louisiana Offshore Port (LOOP)',
    from: 'houston',
    to: 'loop',
    fromCoords: [29.8, -95.4],
    toCoords: [28.8, -90.0],
    color: '#f97316',
    flowMbpd: '1.8 Mb/d VLCC loading'
  },
  {
    id: 'corpus-panama',
    name: 'Corpus Christi → Panama Canal',
    from: 'corpus',
    to: 'panama',
    fromCoords: [27.8, -97.4],
    toCoords: [9.1, -79.7],
    color: '#06b6d4',
    flowMbpd: '1.6 Mb/d Pacific-bound LNG'
  },
  {
    id: 'panama-hawaii',
    name: 'Panama Canal → Hawaii Transit',
    from: 'panama',
    to: 'hawaii',
    fromCoords: [9.1, -79.7],
    toCoords: [21.3, -157.8],
    color: '#38bdf8',
    flowMbpd: '1.2 Mb/d trans-Pacific route'
  },
  {
    id: 'hawaii-tokyo',
    name: 'Hawaii Hub → Tokyo Bay',
    from: 'hawaii',
    to: 'tokyo',
    fromCoords: [21.3, -157.8],
    toCoords: [35.5, 139.8],
    color: '#38bdf8',
    flowMbpd: '1.0 Mb/d mid-ocean stream'
  },
  {
    id: 'valdez-bayarea',
    name: 'Valdez Alaska → San Francisco Refineries',
    from: 'valdez',
    to: 'bayarea',
    fromCoords: [61.1, -146.3],
    toCoords: [37.8, -122.3],
    color: '#38bdf8',
    flowMbpd: '0.45 Mb/d ANS tanker run'
  },
  {
    id: 'calgary-cushing',
    name: 'Calgary Sands → Cushing Storage Hub',
    from: 'calgary',
    to: 'cushing',
    fromCoords: [51.0, -114.1],
    toCoords: [35.9, -96.8],
    color: '#94a3b8',
    flowMbpd: '1.7 Mb/d heavy crude pipeline'
  },
  {
    id: 'maracaibo-houston',
    name: 'Maracaibo → Houston Gulf Coast',
    from: 'maracaibo',
    to: 'houston',
    fromCoords: [10.6, -71.6],
    toCoords: [29.8, -95.4],
    color: '#ea580c',
    flowMbpd: '0.5 Mb/d Caribbean stream'
  },
  {
    id: 'santos-rotterdam',
    name: 'Santos Basin Brazil → Rotterdam Hub',
    from: 'santos',
    to: 'rotterdam',
    fromCoords: [-24.0, -46.3],
    toCoords: [51.9, 4.5],
    color: '#f97316',
    flowMbpd: '0.9 Mb/d trans-Atlantic crude'
  },
  {
    id: 'houston-rotterdam',
    name: 'Houston Hub → Rotterdam Gateway',
    from: 'houston',
    to: 'rotterdam',
    fromCoords: [29.8, -95.4],
    toCoords: [51.9, 4.5],
    color: '#38bdf8',
    flowMbpd: '1.4 Mb/d WTI export stream'
  },
  {
    id: 'bonny-houston',
    name: 'Bonny Terminal → US Gulf Coast',
    from: 'bonny',
    to: 'houston',
    fromCoords: [4.4, 7.1],
    toCoords: [29.8, -95.4],
    color: '#38bdf8',
    flowMbpd: '0.6 Mb/d sweet crude flow'
  },
  {
    id: 'cape-mumbai',
    name: 'Cape of Good Hope → Mumbai Refineries',
    from: 'cape',
    to: 'mumbai',
    fromCoords: [-34.4, 18.5],
    toCoords: [18.9, 72.8],
    color: '#ea580c',
    flowMbpd: '1.1 Mb/d Cape reroute stream'
  }
];

interface ThreeEnergyGlobeProps {
  onSelectTheater?: (theater: string) => void;
  activeTheater?: string;
}

export const ThreeEnergyGlobe: React.FC<ThreeEnergyGlobeProps> = ({
  onSelectTheater: _onSelectTheater,
  activeTheater: _activeTheater
}) => {
  const containerRef = useRef<HTMLDivElement | null>(null);
  const [hoveredNode, setHoveredNode] = useState<StrategicNode | null>(null);
  const [selectedTheater, setSelectedTheater] = useState<string>('middle-east');

  useEffect(() => {
    const container = containerRef.current;
    if (!container) return;

    // Scene, Camera, Renderer
    const scene = new THREE.Scene();
    const camera = new THREE.PerspectiveCamera(
      36,
      container.clientWidth / container.clientHeight,
      0.1,
      1000
    );
    // Pull camera back to make globe fill ~70-80% of left panel
    camera.position.set(0, 0.15, 5.5);
    camera.lookAt(0, 0, 0);

    const renderer = new THREE.WebGLRenderer({
      antialias: true,
      alpha: true,
      powerPreference: 'high-performance'
    });
    renderer.setSize(container.clientWidth, container.clientHeight);
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    renderer.setClearColor(0x000000, 0);
    container.appendChild(renderer.domElement);

    const GLOBE_RADIUS = 2.0;
    const globeGroup = new THREE.Group();
    // Default initial rotation centered on Persian Gulf & Indian Ocean (lat 22, lon 65)
    globeGroup.rotation.y = THREE.MathUtils.degToRad(205);
    globeGroup.rotation.x = THREE.MathUtils.degToRad(18);
    scene.add(globeGroup);

    // -------------------------------------------------------------
    // 1. Dark Technical Globe Inner Core
    // -------------------------------------------------------------
    const coreGeo = new THREE.SphereGeometry(GLOBE_RADIUS * 0.99, 64, 64);
    const coreMat = new THREE.MeshBasicMaterial({
      color: 0x07090e,
      transparent: true,
      opacity: 0.95
    });
    const coreSphere = new THREE.Mesh(coreGeo, coreMat);
    globeGroup.add(coreSphere);

    // -------------------------------------------------------------
    // 2. Graticule Latitude / Longitude Rings
    // -------------------------------------------------------------
    const graticuleGroup = new THREE.Group();
    // Parallels
    for (let lat = -70; lat <= 70; lat += 20) {
      const radius = GLOBE_RADIUS * Math.cos(THREE.MathUtils.degToRad(lat));
      const y = GLOBE_RADIUS * Math.sin(THREE.MathUtils.degToRad(lat));
      const circleGeo = new THREE.BufferGeometry();
      const points: THREE.Vector3[] = [];
      for (let i = 0; i <= 64; i++) {
        const theta = (i / 64) * Math.PI * 2;
        points.push(new THREE.Vector3(radius * Math.cos(theta), y, radius * Math.sin(theta)));
      }
      circleGeo.setFromPoints(points);
      const line = new THREE.Line(
        circleGeo,
        new THREE.LineBasicMaterial({ color: 0x223044, transparent: true, opacity: lat === 0 ? 0.35 : 0.15 })
      );
      graticuleGroup.add(line);
    }
    // Meridians
    for (let lon = 0; lon < 360; lon += 30) {
      const circleGeo = new THREE.BufferGeometry();
      const points: THREE.Vector3[] = [];
      const theta = THREE.MathUtils.degToRad(lon);
      for (let i = 0; i <= 64; i++) {
        const phi = (i / 64) * Math.PI * 2;
        const x = -GLOBE_RADIUS * Math.sin(phi) * Math.cos(theta);
        const y = GLOBE_RADIUS * Math.cos(phi);
        const z = GLOBE_RADIUS * Math.sin(phi) * Math.sin(theta);
        points.push(new THREE.Vector3(x, y, z));
      }
      circleGeo.setFromPoints(points);
      const line = new THREE.Line(
        circleGeo,
        new THREE.LineBasicMaterial({ color: 0x223044, transparent: true, opacity: 0.15 })
      );
      graticuleGroup.add(line);
    }
    globeGroup.add(graticuleGroup);

    // -------------------------------------------------------------
    // 3. Point-Cloud Continents (High Density 360° Global Matrix)
    // -------------------------------------------------------------
    const pointPositions: number[] = [];
    const pointColors: number[] = [];

    // Dense Fibonacci Sphere Sampling for 360° Globe
    const numPoints = 15000;
    const orangeColor = new THREE.Color('#f97316');
    const amberColor = new THREE.Color('#fb923c');
    const cyanColor = new THREE.Color('#38bdf8');
    const landColor = new THREE.Color('#94a3b8');
    const dimOceanColor = new THREE.Color('#1e293b');
    const brightLandColor = new THREE.Color('#cbd5e1');

    for (let i = 0; i < numPoints; i++) {
      const y = 1 - (i / (numPoints - 1)) * 2; // -1 to 1
      const radiusAtY = Math.sqrt(1 - y * y);
      const phi = i * Math.PI * (3 - Math.sqrt(5)); // Golden ratio

      const x = Math.cos(phi) * radiusAtY;
      const z = Math.sin(phi) * radiusAtY;

      // Calculate Lat / Lon
      const lat = (Math.asin(y) * 180) / Math.PI;
      let lon = (Math.atan2(z, -x) * 180) / Math.PI - 180;
      if (lon < -180) lon += 360;

      // Test against continent polygons
      let isLand = false;
      let isPrimaryEnergyZone = false;
      let isAmericasOrEastAsia = false;

      for (let pIdx = 0; pIdx < CONTINENT_POLYS.length; pIdx++) {
        const poly = CONTINENT_POLYS[pIdx];
        if (isPointInPolygon([lat, lon], poly)) {
          isLand = true;
          if (pIdx === 2) {
            // India
            isPrimaryEnergyZone = true;
          } else if (pIdx === 3 || pIdx === 5 || pIdx === 7) {
            // North America, South America, Japan
            isAmericasOrEastAsia = true;
          }
          break;
        }
      }

      if (isLand) {
        const v = latLonToVector3(lat, lon, GLOBE_RADIUS * 1.002);
        pointPositions.push(v.x, v.y, v.z);
        if (isPrimaryEnergyZone) {
          pointColors.push(orangeColor.r, orangeColor.g, orangeColor.b);
        } else if (isAmericasOrEastAsia) {
          pointColors.push(cyanColor.r, cyanColor.g, cyanColor.b);
        } else {
          // Vary land point brightness based on random factor
          const brightness = 0.7 + Math.random() * 0.3;
          pointColors.push(
            landColor.r * brightness,
            landColor.g * brightness,
            landColor.b * brightness
          );
        }
      } else if (Math.random() < 0.15) {
        // Ocean points with reduced density for cleaner look
        const v = latLonToVector3(lat, lon, GLOBE_RADIUS * 1.0);
        pointPositions.push(v.x, v.y, v.z);
        pointColors.push(dimOceanColor.r, dimOceanColor.g, dimOceanColor.b);
      }
    }

    const pointsGeo = new THREE.BufferGeometry();
    pointsGeo.setAttribute('position', new THREE.Float32BufferAttribute(pointPositions, 3));
    pointsGeo.setAttribute('color', new THREE.Float32BufferAttribute(pointColors, 3));

    const pointsMat = new THREE.PointsMaterial({
      size: 0.032,
      vertexColors: true,
      transparent: true,
      opacity: 0.92,
      sizeAttenuation: true
    });
    const landPointsMesh = new THREE.Points(pointsGeo, pointsMat);
    globeGroup.add(landPointsMesh);

    // -------------------------------------------------------------
    // 4. 3D Supply Routes Arcs with Flowing Photon Particles
    // -------------------------------------------------------------
    const routeCurves: { curve: THREE.QuadraticBezierCurve3; color: string; speed: number }[] = [];
    const particlePositions: number[] = [];
    const particleColors: number[] = [];
    const particleProgress: { routeIdx: number; t: number; speed: number }[] = [];

    SUPPLY_ROUTES.forEach((route, rIdx) => {
      const vFrom = latLonToVector3(route.fromCoords[0], route.fromCoords[1], GLOBE_RADIUS * 1.01);
      const vTo = latLonToVector3(route.toCoords[0], route.toCoords[1], GLOBE_RADIUS * 1.01);

      // Great-circle midpoint elevated outward
      const mid = new THREE.Vector3().addVectors(vFrom, vTo);
      if (mid.lengthSq() < 0.01) {
        // Points are almost antipodal; pick an arbitrary perpendicular vector
        mid.set(-vFrom.y, vFrom.x, vFrom.z);
      }
      mid.normalize();
      const distance = vFrom.distanceTo(vTo);
      const elevation = GLOBE_RADIUS * (1.06 + Math.min(0.25, distance * 0.12));
      mid.multiplyScalar(elevation);

      const curve = new THREE.QuadraticBezierCurve3(vFrom, mid, vTo);
      routeCurves.push({
        curve,
        color: route.color,
        speed: route.isPrimary ? 0.35 : 0.25
      });

      // Draw route arc line
      const points = curve.getPoints(35);
      const lineGeo = new THREE.BufferGeometry().setFromPoints(points);
      const color = new THREE.Color(route.color);
      const lineMat = new THREE.LineBasicMaterial({
        color: color,
        transparent: true,
        opacity: route.isPrimary ? 0.85 : 0.55,
        linewidth: 2
      });
      const line = new THREE.Line(lineGeo, lineMat);
      globeGroup.add(line);

      // Initialize moving particles along this curve
      const particleCount = route.isPrimary ? 4 : 2;
      for (let p = 0; p < particleCount; p++) {
        const initialT = (p / particleCount);
        const pt = curve.getPoint(initialT);
        particlePositions.push(pt.x, pt.y, pt.z);
        particleColors.push(color.r, color.g, color.b);
        particleProgress.push({
          routeIdx: rIdx,
          t: initialT,
          speed: (route.isPrimary ? 0.28 : 0.18) * (0.9 + Math.random() * 0.2)
        });
      }
    });

    const particlesGeo = new THREE.BufferGeometry();
    particlesGeo.setAttribute('position', new THREE.Float32BufferAttribute(particlePositions, 3));
    particlesGeo.setAttribute('color', new THREE.Float32BufferAttribute(particleColors, 3));

    const particlesMat = new THREE.PointsMaterial({
      size: 0.065,
      vertexColors: true,
      transparent: true,
      opacity: 1.0,
      blending: THREE.AdditiveBlending
    });
    const flowingParticles = new THREE.Points(particlesGeo, particlesMat);
    globeGroup.add(flowingParticles);

    // -------------------------------------------------------------
    // 5. Strategic 3D Nodes (Markers, Radar Rings & Inline Name Labels)
    // -------------------------------------------------------------
    const nodeMeshes: {
      mesh: THREE.Mesh;
      ring: THREE.Mesh;
      sprite: THREE.Sprite;
      localPos: THREE.Vector3;
      node: StrategicNode;
    }[] = [];
    const nodeGroup = new THREE.Group();

    STRATEGIC_NODES.forEach((node) => {
      const pos = latLonToVector3(node.lat, node.lon, GLOBE_RADIUS * 1.015);
      // Position label directly beside the dot on the surface
      const labelPos = latLonToVector3(node.lat + 0.6, node.lon + 1.2, GLOBE_RADIUS * 1.025);
      const color = new THREE.Color(node.color);

      // Core Marker Sphere
      const sphereGeo = new THREE.SphereGeometry(0.028, 16, 16);
      const sphereMat = new THREE.MeshBasicMaterial({ color: color });
      const marker = new THREE.Mesh(sphereGeo, sphereMat);
      marker.position.copy(pos);
      nodeGroup.add(marker);

      // Refined Pulsing Radar Ring around node
      const ringGeo = new THREE.RingGeometry(0.02, 0.035, 32);
      const ringMat = new THREE.MeshBasicMaterial({
        color: color,
        side: THREE.DoubleSide,
        transparent: true,
        opacity: 0.7
      });
      const ring = new THREE.Mesh(ringGeo, ringMat);
      ring.position.copy(pos);
      ring.lookAt(new THREE.Vector3(0, 0, 0));
      nodeGroup.add(ring);

      // Clean, unboxed text label floating right near the dot
      const sprite = createNodeLabelSprite(node);
      sprite.position.copy(labelPos);
      nodeGroup.add(sprite);

      nodeMeshes.push({
        mesh: marker,
        ring,
        sprite,
        localPos: pos.clone(),
        node
      });
    });
    globeGroup.add(nodeGroup);

    // -------------------------------------------------------------
    // Outer Atmospheric Glow Rim - Enhanced
    // -------------------------------------------------------------
    const atmosGeo = new THREE.SphereGeometry(GLOBE_RADIUS * 1.18, 48, 48);
    const atmosMat = new THREE.MeshBasicMaterial({
      color: 0xf97316,
      transparent: true,
      opacity: 0.05,
      side: THREE.BackSide
    });
    const atmos = new THREE.Mesh(atmosGeo, atmosMat);
    scene.add(atmos);

    // Inner subtle glow for depth
    const innerGlowGeo = new THREE.SphereGeometry(GLOBE_RADIUS * 1.02, 32, 32);
    const innerGlowMat = new THREE.MeshBasicMaterial({
      color: 0x1e293b,
      transparent: true,
      opacity: 0.1,
      side: THREE.BackSide
    });
    const innerGlow = new THREE.Mesh(innerGlowGeo, innerGlowMat);
    globeGroup.add(innerGlow);

    // Subtle cyan atmospheric rim for depth
    const rimGeo = new THREE.SphereGeometry(GLOBE_RADIUS * 1.08, 48, 48);
    const rimMat = new THREE.MeshBasicMaterial({
      color: 0x38bdf8,
      transparent: true,
      opacity: 0.02,
      side: THREE.BackSide
    });
    const rim = new THREE.Mesh(rimGeo, rimMat);
    scene.add(rim);

    // Subtle latitude rings floating around globe
    const orbitalRingGroup = new THREE.Group();
    for (let i = 0; i < 3; i++) {
      const radius = GLOBE_RADIUS * (1.25 + i * 0.15);
      const ringGeo = new THREE.RingGeometry(radius - 0.003, radius + 0.003, 128);
      const ringMat = new THREE.MeshBasicMaterial({
        color: i === 1 ? 0x38bdf8 : 0x94a3b8,
        transparent: true,
        opacity: 0.04 - i * 0.01,
        side: THREE.DoubleSide
      });
      const ring = new THREE.Mesh(ringGeo, ringMat);
      ring.rotation.x = Math.PI / 2 + (i - 1) * 0.3;
      ring.rotation.z = i * 0.2;
      orbitalRingGroup.add(ring);
    }
    scene.add(orbitalRingGroup);

    // -------------------------------------------------------------
    // Mouse Interaction (Click & Drag Rotation + Parallax)
    // -------------------------------------------------------------
    let isDragging = false;
    let prevMouseX = 0;
    let prevMouseY = 0;
    let autoRotate = true;
    let targetRotationY = globeGroup.rotation.y;
    let targetRotationX = globeGroup.rotation.x;
    let parallaxX = 0;
    let parallaxY = 0;
    let targetParallaxX = 0;
    let targetParallaxY = 0;

    const onMouseDown = (e: MouseEvent) => {
      isDragging = true;
      autoRotate = false;
      prevMouseX = e.clientX;
      prevMouseY = e.clientY;
    };

    const onMouseMove = (e: MouseEvent) => {
      // Parallax effect (subtle, non-drag)
      if (!isDragging && container) {
        const rect = container.getBoundingClientRect();
        const centerX = rect.left + rect.width / 2;
        const centerY = rect.top + rect.height / 2;
        targetParallaxX = ((e.clientX - centerX) / rect.width) * 0.15;
        targetParallaxY = ((e.clientY - centerY) / rect.height) * 0.1;
      }
      
      if (!isDragging) return;
      const deltaX = e.clientX - prevMouseX;
      const deltaY = e.clientY - prevMouseY;
      prevMouseX = e.clientX;
      prevMouseY = e.clientY;

      targetRotationY += deltaX * 0.005;
      targetRotationX += deltaY * 0.005;
      targetRotationX = Math.max(-0.8, Math.min(0.8, targetRotationX));
    };

    const onMouseUp = () => {
      isDragging = false;
      setTimeout(() => {
        autoRotate = true;
      }, 4000);
    };

    const dom = renderer.domElement;
    dom.addEventListener('mousedown', onMouseDown);
    window.addEventListener('mousemove', onMouseMove);
    window.addEventListener('mouseup', onMouseUp);

    // Touch support for mobile / tablets
    const onTouchStart = (e: TouchEvent) => {
      if (e.touches.length === 1) {
        isDragging = true;
        autoRotate = false;
        prevMouseX = e.touches[0].clientX;
        prevMouseY = e.touches[0].clientY;
      }
    };
    const onTouchMove = (e: TouchEvent) => {
      if (isDragging && e.touches.length === 1) {
        const deltaX = e.touches[0].clientX - prevMouseX;
        const deltaY = e.touches[0].clientY - prevMouseY;
        prevMouseX = e.touches[0].clientX;
        prevMouseY = e.touches[0].clientY;

        targetRotationY += deltaX * 0.005;
        targetRotationX += deltaY * 0.005;
        targetRotationX = Math.max(-0.8, Math.min(0.8, targetRotationX));
      }
    };
    const onTouchEnd = () => {
      isDragging = false;
      setTimeout(() => {
        autoRotate = true;
      }, 4000);
    };
    dom.addEventListener('touchstart', onTouchStart, { passive: true });
    window.addEventListener('touchmove', onTouchMove, { passive: true });
    window.addEventListener('touchend', onTouchEnd);

    // -------------------------------------------------------------
    // Resize Handler
    // -------------------------------------------------------------
    const handleResize = () => {
      if (!container) return;
      const width = container.clientWidth;
      const height = container.clientHeight;
      camera.aspect = width / height;
      camera.updateProjectionMatrix();
      renderer.setSize(width, height);
    };
    const resizeObserver = new ResizeObserver(handleResize);
    resizeObserver.observe(container);
    window.addEventListener('resize', handleResize);

    // -------------------------------------------------------------
    // Animation Loop
    // -------------------------------------------------------------
    let animationFrameId: number;
    let clock = new THREE.Clock();

    const animate = () => {
      animationFrameId = requestAnimationFrame(animate);
      const delta = clock.getDelta();
      const elapsed = clock.getElapsedTime();

      // Smooth rotation - slow and steady
      if (autoRotate) {
        targetRotationY += delta * 0.04;
      }
      globeGroup.rotation.y += (targetRotationY - globeGroup.rotation.y) * 0.08;
      globeGroup.rotation.x += (targetRotationX - globeGroup.rotation.x) * 0.08;

      // Subtle parallax effect
      parallaxX += (targetParallaxX - parallaxX) * 0.05;
      parallaxY += (targetParallaxY - parallaxY) * 0.05;
      globeGroup.position.x = parallaxX;
      globeGroup.position.y = parallaxY;

      // Animate flowing energy photons along Great Circle supply routes
      const posAttr = flowingParticles.geometry.getAttribute('position') as THREE.BufferAttribute;
      const positions = posAttr.array as Float32Array;

      for (let i = 0; i < particleProgress.length; i++) {
        const item = particleProgress[i];
        item.t = (item.t + delta * item.speed) % 1.0;
        const curve = routeCurves[item.routeIdx].curve;
        const pt = curve.getPoint(item.t);
        positions[i * 3] = pt.x;
        positions[i * 3 + 1] = pt.y;
        positions[i * 3 + 2] = pt.z;
      }
      posAttr.needsUpdate = true;

      // Animate node radar pulsing rings & Camera-Facing HUD billboard name labels
      const worldPos = new THREE.Vector3();
      const cameraDir = camera.position.clone().normalize();

      nodeMeshes.forEach(({ ring, sprite, mesh }, idx) => {
        // Radar ring expansion
        const pulse = ((elapsed * 1.6 + idx * 0.35) % 1.0);
        const scale = 1 + pulse * 1.5;
        ring.scale.set(scale, scale, scale);
        const ringMat = ring.material as THREE.MeshBasicMaterial;
        ringMat.opacity = (1 - pulse) * 0.75;

        // Calculate if node is facing towards camera or behind sphere
        mesh.getWorldPosition(worldPos);
        const nodeNorm = worldPos.clone().normalize();
        const facingDot = nodeNorm.dot(cameraDir);

        if (facingDot > 0.05) {
          // Node is on the front visible hemisphere
          sprite.visible = true;
          const opacity = Math.min(1.0, Math.pow(facingDot, 1.4) * 1.2);
          const spriteMat = sprite.material as THREE.SpriteMaterial;
          spriteMat.opacity = opacity;
        } else {
          // Node is rotated to the far dark side of the globe
          sprite.visible = false;
        }
      });

      renderer.render(scene, camera);
    };

    animate();

    return () => {
      cancelAnimationFrame(animationFrameId);
      resizeObserver.disconnect();
      window.removeEventListener('resize', handleResize);
      dom.removeEventListener('mousedown', onMouseDown);
      window.removeEventListener('mousemove', onMouseMove);
      window.removeEventListener('mouseup', onMouseUp);
      dom.removeEventListener('touchstart', onTouchStart);
      window.removeEventListener('touchmove', onTouchMove);
      window.removeEventListener('touchend', onTouchEnd);
      if (container.contains(renderer.domElement)) {
        container.removeChild(renderer.domElement);
      }
      renderer.dispose();
    };
  }, []);

  return (
    <div className="relative w-full h-full select-none overflow-hidden">
      {/* 3D WebGL Canvas Container */}
      <div
        ref={containerRef}
        className="absolute inset-0 z-0 cursor-grab active:cursor-grabbing flex items-center justify-center"
      />
    </div>
  );
};
