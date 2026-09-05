import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import type { Map as LeafletMap } from 'leaflet';
import {
  Activity,
  AlertTriangle,
  CircleDot,
  Crosshair,
  Eye,
  EyeOff,
  Info,
  Network,
  RefreshCw,
  RotateCcw,
  Layers,
  ChevronDown,
  ChevronUp,
  Search,
  X,
  Compass,
  MapPin,
  Check
} from 'lucide-react';
import { EmptyState } from '../components/common/EmptyState';
import { ErrorState } from '../components/common/ErrorState';
import { LoadingState } from '../components/common/LoadingState';
import { PageHeader } from '../components/common/PageHeader';
import { StatusBadge } from '../components/common/StatusBadge';
import {
  analyzeDigitalTwinImpact,
  fetchDigitalTwin,
  resetDigitalTwin,
  updateDigitalTwinNodeState
} from '../services/api';
import type { DigitalTwinImpactResult } from '../digitalTwin/impact';
import type { DigitalTwinGraph, DigitalTwinNode, DigitalTwinNodeType, OperationalState } from '../digitalTwin/model';

// ── Constants & Labels ────────────────────────────────────────────────────────

const OPERATIONAL_STATES: OperationalState[] = ['operational', 'reduced', 'disrupted', 'blocked'];

const NODE_TYPE_LABELS: Record<DigitalTwinNodeType, string> = {
  supplier: 'Supplier',
  port: 'Port',
  refinery: 'Refinery',
  strategic_reserve: 'Strategic Reserve',
  shipping_route: 'Shipping Route',
  chokepoint: 'Chokepoint'
};

const NODE_TYPE_COLORS: Record<DigitalTwinNodeType, string> = {
  supplier: '#60a5fa',
  port: '#f59e0b',
  refinery: '#f97316',
  strategic_reserve: '#a78bfa',
  shipping_route: '#22d3ee',
  chokepoint: '#fb7185'
};

const STATE_COLORS: Record<OperationalState, string> = {
  operational: '#10b981',
  reduced: '#f59e0b',
  disrupted: '#f97316',
  blocked: '#ef4444'
};

// ── Geographic Data Integrity Taxonomy ────────────────────────────────────────

export type CoordType = 'SOURCE' | 'COUNTRY' | 'STATE_APPROX' | 'LOGICAL';

export interface ResolvedCoord {
  coords: [number, number] | null;
  type: CoordType;
  label: string;
}

const COUNTRY_CENTROIDS: Record<string, [number, number]> = {
  'saudi arabia': [23.8859, 45.0792],
  'united arab emirates': [23.4241, 53.8478],
  'uae': [23.4241, 53.8478],
  'iraq': [33.2232, 43.6793],
  'kuwait': [29.3117, 47.4818],
  'russia': [61.5240, 105.3188],
  'russian federation': [61.5240, 105.3188],
  'iran': [32.4279, 53.6880],
  'islamic republic of iran': [32.4279, 53.6880],
  'nigeria': [9.0820, 8.6753],
  'angola': [-11.2027, 17.8739],
  'libya': [26.3351, 17.2283],
  'mexico': [23.6345, -102.5528],
  'ecuador': [-1.8312, -78.1834],
  'colombia': [4.5709, -74.2973],
  'malaysia': [4.2105, 101.9758],
  'united states': [37.0902, -95.7129],
  'usa': [37.0902, -95.7129],
  'united states of america': [37.0902, -95.7129],
  'venezuela': [6.4238, -66.5897],
  'bolivarian republic of venezuela': [6.4238, -66.5897],
  'oman': [21.5126, 55.9233],
  'qatar': [25.3548, 51.1839],
  'brazil': [-14.2350, -51.9253],
  'australia': [-25.2744, 133.7751],
  'united kingdom': [55.3781, -3.4360],
  'uk': [55.3781, -3.4360],
  'norway': [60.4720, 8.4689],
  'egypt': [26.8206, 30.8025],
  'kazakhstan': [48.0196, 66.9237],
  'azerbaijan': [40.1431, 47.5769],
  'canada': [56.1304, -106.3468],
  'argentina': [-38.4161, -63.6167],
  'indonesia': [-0.7893, 113.9213],
  'ghana': [7.9465, -1.0232],
  'south africa': [-30.5595, 22.9375],
};

const INDIA_STATE_CENTROIDS: Record<string, [number, number]> = {
  'andhra pradesh': [15.9129, 79.7400],
  'arunachal pradesh': [28.2180, 94.7278],
  'assam': [26.2006, 92.9376],
  'bihar': [25.0961, 85.3131],
  'chhattisgarh': [21.2787, 81.8661],
  'goa': [15.2993, 74.1240],
  'gujarat': [22.2587, 71.1924],
  'haryana': [29.0588, 76.0856],
  'himachal pradesh': [31.1048, 77.1734],
  'jharkhand': [23.6102, 85.2799],
  'karnataka': [15.3173, 75.7139],
  'kerala': [10.8505, 76.2711],
  'madhya pradesh': [22.9734, 78.6569],
  'maharashtra': [19.7515, 75.7139],
  'manipur': [24.6637, 93.9063],
  'meghalaya': [25.4670, 91.3662],
  'mizoram': [23.1645, 92.9376],
  'nagaland': [26.1584, 94.5624],
  'odisha': [20.9517, 85.0985],
  'punjab': [31.1471, 75.3412],
  'rajasthan': [27.0238, 74.2179],
  'sikkim': [27.5330, 88.5122],
  'tamil nadu': [11.1271, 78.6569],
  'telangana': [18.1124, 79.0193],
  'tripura': [23.9408, 91.9882],
  'uttar pradesh': [26.8467, 80.9462],
  'uttarakhand': [30.0668, 79.0193],
  'west bengal': [22.9868, 87.8550],
  'delhi': [28.7041, 77.1025],
  'puducherry': [11.9416, 79.8083],
};

const resolveCoord = (node: DigitalTwinNode): ResolvedCoord => {
  const lat = node.metadata.latitude;
  const lng = node.metadata.longitude;

  if (typeof lat === 'number' && typeof lng === 'number' && isFinite(lat) && isFinite(lng)) {
    return {
      coords: [lat, lng],
      type: 'SOURCE',
      label: 'Verified source coordinate'
    };
  }

  // Handle shipping routes with GeoJSON geometry
  const geom = node.metadata.geometry as any;
  if (node.nodeType === 'shipping_route' && geom && Array.isArray(geom.coordinates)) {
    let sumLat = 0, sumLng = 0, count = 0;
    if (geom.type === 'MultiLineString') {
      geom.coordinates.forEach((line: any[]) => {
        if (Array.isArray(line)) {
          line.forEach((pt: number[]) => {
            if (Array.isArray(pt) && pt.length >= 2 && typeof pt[0] === 'number' && typeof pt[1] === 'number') {
              sumLng += pt[0];
              sumLat += pt[1];
              count++;
            }
          });
        }
      });
    } else if (geom.type === 'LineString') {
      geom.coordinates.forEach((pt: number[]) => {
        if (Array.isArray(pt) && pt.length >= 2 && typeof pt[0] === 'number' && typeof pt[1] === 'number') {
          sumLng += pt[0];
          sumLat += pt[1];
          count++;
        }
      });
    }

    if (count > 0) {
      return {
        coords: [sumLat / count, sumLng / count],
        type: 'SOURCE',
        label: 'Verified GeoJSON shipping lane geometry'
      };
    }
  }

  return {
    coords: null,
    type: 'LOGICAL',
    label: 'Logical network asset (no map coordinate)'
  };
};

const buildCoordMap = (nodes: DigitalTwinNode[]): Map<string, ResolvedCoord> => {
  const map = new Map<string, ResolvedCoord>();
  for (const node of nodes) {
    map.set(node.nodeId, resolveCoord(node));
  }
  return map;
};

// ── Search Helper Functions ──────────────────────────────────────────────────

/**
 * Filter and score Digital Twin nodes against a search query.
 * Matches canonical names, nodeId, asset types, and metadata variants/aliases.
 */
export const searchDigitalTwinNodes = (
  nodes: DigitalTwinNode[],
  query: string
): DigitalTwinNode[] => {
  const q = query.trim().toLowerCase();
  if (!q) return [];

  const scored: Array<{ node: DigitalTwinNode; score: number }> = [];

  for (const node of nodes) {
    const nameLower = node.name.toLowerCase();
    const idLower = node.nodeId.toLowerCase();
    const typeLabel = NODE_TYPE_LABELS[node.nodeType].toLowerCase();
    const sourceCountry = String(node.metadata.sourceCountryName || '').toLowerCase();
    const countryId = String(node.metadata.countryId || '').toLowerCase();
    const state = String(node.metadata.state || '').toLowerCase();

    let score = 0;

    // Exact matches get highest priority
    if (nameLower === q || idLower === q) {
      score = 100;
    } else if (nameLower.startsWith(q)) {
      score = 80;
    } else if (nameLower.includes(q)) {
      score = 60;
    } else if (
      sourceCountry.includes(q) ||
      countryId.includes(q) ||
      state.includes(q) ||
      idLower.includes(q)
    ) {
      score = 40;
    } else if (typeLabel.includes(q)) {
      score = 20;
    }

    if (score > 0) {
      scored.push({ node, score });
    }
  }

  // Sort descending by match score, then alphabetically by name
  return scored
    .sort((a, b) => b.score - a.score || a.node.name.localeCompare(b.node.name))
    .map((item) => item.node);
};

// ── Utility functions ─────────────────────────────────────────────────────────

const stateBadgeLevel = (state: OperationalState): string => {
  if (state === 'operational') return 'AVAILABLE';
  if (state === 'reduced') return 'MODERATE';
  if (state === 'disrupted') return 'ELEVATED';
  return 'BLOCKED';
};

const formatMeasurement = (value: number | undefined | null, unit?: string): string =>
  `${(value ?? 0).toLocaleString()} ${(unit ?? '').replaceAll('_', ' ')}`;

const formatNodeMeasurement = (measurement: DigitalTwinNode['capacity'], unitStatus?: unknown): string => {
  if (!measurement) return 'Not supplied';
  const formatted = formatMeasurement(measurement.value, measurement.unit);
  return unitStatus === 'UNDOCUMENTED' ? `${formatted} (source unit undocumented)` : formatted;
};

const updateGraphNode = (graph: DigitalTwinGraph, nodeId: string, state: OperationalState): DigitalTwinGraph => ({
  ...graph,
  nodes: graph.nodes.map((node) =>
    node.nodeId === nodeId ? { ...node, operationalState: state, stateSource: 'OVERRIDE' } : node
  ),
});

const MAP_DEFAULT_CENTER: [number, number] = [22.0, 72.0];
const MAP_DEFAULT_ZOOM = 3;
const MAP_FOCUSED_ZOOM = 6;

// ── WorldMap Component (Dynamic Browser Only) ─────────────────────────────────

interface WorldMapProps {
  graph: DigitalTwinGraph;
  coordMap: ReadonlyMap<string, ResolvedCoord>;
  selectedNodeId: string | null;
  impact: DigitalTwinImpactResult | null;
  visibleTypes: ReadonlySet<DigitalTwinNodeType>;
  showConnections: boolean;
  onSelectNode: (nodeId: string) => void;
  mapRef: React.Ref<LeafletMap | null>;
  statusFilter?: 'all' | 'operational' | 'reduced' | 'disrupted_or_blocked' | null;
}

const WorldMap: React.FC<WorldMapProps> = (props) => {
  const [LeafletComponents, setLeafletComponents] = useState<any>(null);

  useEffect(() => {
    if (typeof window !== 'undefined') {
      Promise.all([
        import('leaflet/dist/leaflet.css'),
        import('react-leaflet')
      ]).then(([, reactLeaflet]) => {
        setLeafletComponents(reactLeaflet);
      }).catch(console.error);
    }
  }, []);

  if (!LeafletComponents) {
    return (
      <div className="w-full h-full flex items-center justify-center bg-[#0D0D0D] text-xs font-mono text-[#666666]">
        Loading interactive map...
      </div>
    );
  }

  const { MapContainer, TileLayer, CircleMarker, Polyline, Tooltip, GeoJSON } = LeafletComponents;
  const { graph, coordMap, selectedNodeId, impact, visibleTypes, showConnections, onSelectNode, mapRef, statusFilter } = props;

  const affectedNodeIds = new Set(impact?.affectedNodeIds ?? []);
  const affectedEdgeIds = new Set(impact?.affectedEdgeIds ?? []);

  const isNodeMatchingFilter = (node: DigitalTwinNode): boolean => {
    if (!statusFilter || statusFilter === 'all') return true;
    if (statusFilter === 'operational') return node.operationalState === 'operational';
    if (statusFilter === 'reduced') return node.operationalState === 'reduced';
    if (statusFilter === 'disrupted_or_blocked') return node.operationalState === 'disrupted' || node.operationalState === 'blocked';
    return true;
  };

  return (
    <MapContainer
      ref={mapRef}
      center={MAP_DEFAULT_CENTER}
      zoom={MAP_DEFAULT_ZOOM}
      style={{ width: '100%', height: '100%' }}
      zoomControl
    >
      <TileLayer
        url="https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png"
        attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OSM</a> contributors &copy; <a href="https://carto.com/attributions">CARTO</a>'
        subdomains="abcd"
        maxZoom={19}
      />

      {showConnections &&
        graph.edges.map((edge) => {
          const fromRes = coordMap.get(edge.fromNodeId);
          const toRes = coordMap.get(edge.toNodeId);
          if (!fromRes?.coords || !toRes?.coords) return null;

          const fromNode = graph.nodes.find((n) => n.nodeId === edge.fromNodeId);
          const toNode = graph.nodes.find((n) => n.nodeId === edge.toNodeId);
          const isEdgeMatching = (!fromNode || isNodeMatchingFilter(fromNode)) && (!toNode || isNodeMatchingFilter(toNode));

          const isAffected = affectedEdgeIds.has(edge.edgeId);
          return (
            <Polyline
              key={edge.edgeId}
              positions={[fromRes.coords, toRes.coords]}
              pathOptions={{
                color: isAffected ? '#ef4444' : '#555555',
                weight: isAffected ? 2.5 : 1.5,
                opacity: isEdgeMatching ? (isAffected ? 0.95 : 0.6) : 0.08,
                dashArray: isAffected ? undefined : '5 4',
              }}
            >
              <Tooltip sticky>
                <div style={{ fontFamily: 'ui-monospace, monospace', fontSize: '11px', color: '#ccc' }}>
                  <div style={{ color: '#888', marginBottom: '2px' }}>
                    {edge.edgeType.replaceAll('_', ' ')}
                  </div>
                  {isValueAvailable(edge.confidence) && (
                    <div>Confidence: {Math.round(edge.confidence * 100)}%</div>
                  )}
                  {isValueAvailable(edge.capacity) && (
                    <div>Capacity: {formatValueOrMeasurement(edge.capacity)}</div>
                  )}
                  {isValueAvailable(edge.currentFlow) && (
                    <div>Current Flow: {formatValueOrMeasurement(edge.currentFlow)}</div>
                  )}
                  {(() => {
                    const extraItems: Array<{ label: string; value: string }> = [];
                    const throughputVal = edge.metadata?.throughput || (edge as any).throughput;
                    if (isValueAvailable(throughputVal)) {
                      extraItems.push({ label: 'Throughput', value: formatValueOrMeasurement(throughputVal) });
                    }

                    const supplyVolumeVal = edge.metadata?.supplyVolume || edge.metadata?.supply_volume || edge.metadata?.supply || (edge as any).supplyVolume;
                    if (isValueAvailable(supplyVolumeVal)) {
                      extraItems.push({ label: 'Supply Volume', value: formatValueOrMeasurement(supplyVolumeVal) });
                    }

                    const demandVal = edge.metadata?.demand || (edge as any).demand;
                    if (isValueAvailable(demandVal)) {
                      extraItems.push({ label: 'Demand', value: formatValueOrMeasurement(demandVal) });
                    }

                    const riskVal = edge.metadata?.risk || edge.metadata?.riskLevel || edge.metadata?.riskScore || edge.metadata?.risk_score || edge.metadata?.risk_level || edge.metadata?.geopoliticalRisk;
                    if (isValueAvailable(riskVal)) {
                      extraItems.push({ label: 'Risk', value: formatValueOrMeasurement(riskVal) });
                    }

                    const reliabilityVal = edge.metadata?.reliability || edge.metadata?.reliabilityScore || edge.metadata?.reliability_score || (edge as any).reliability;
                    if (isValueAvailable(reliabilityVal)) {
                      extraItems.push({ label: 'Reliability', value: formatValueOrMeasurement(reliabilityVal) });
                    }

                    const transitTimeVal = edge.metadata?.transitTime || edge.metadata?.transit_time || edge.metadata?.transit || (edge as any).transitTime;
                    if (isValueAvailable(transitTimeVal)) {
                      extraItems.push({ label: 'Transit Time', value: formatValueOrMeasurement(transitTimeVal) });
                    }

                    const costVal = edge.metadata?.cost || edge.metadata?.commercialCost || edge.metadata?.freightCost || (edge as any).cost;
                    if (isValueAvailable(costVal)) {
                      extraItems.push({ label: 'Cost', value: formatValueOrMeasurement(costVal) });
                    }

                    const distanceVal = edge.metadata?.distance || (edge as any).distance;
                    if (isValueAvailable(distanceVal)) {
                      extraItems.push({ label: 'Distance', value: formatValueOrMeasurement(distanceVal) });
                    }

                    const utilizationVal = edge.metadata?.utilization || (edge as any).utilization;
                    if (isValueAvailable(utilizationVal)) {
                      extraItems.push({ label: 'Utilization', value: formatValueOrMeasurement(utilizationVal) });
                    }

                    const recoveryVal = edge.metadata?.recovery || edge.metadata?.recoveryTime || (edge as any).recovery;
                    if (isValueAvailable(recoveryVal)) {
                      extraItems.push({ label: 'Recovery', value: formatValueOrMeasurement(recoveryVal) });
                    }

                    return extraItems.map((item) => (
                      <div key={item.label}>{item.label}: {item.value}</div>
                    ));
                  })()}
                  {isAffected && <div style={{ color: '#ef4444', marginTop: '2px' }}>⚠ Impact affected</div>}
                </div>
              </Tooltip>
            </Polyline>
          );
        })}

      {graph.nodes.map((node) => {
        if (!visibleTypes.has(node.nodeType)) return null;
        const res = coordMap.get(node.nodeId);
        if (!res || !res.coords) return null;

        const isSelected = node.nodeId === selectedNodeId;
        const isAffected = affectedNodeIds.has(node.nodeId);
        const typeColor = NODE_TYPE_COLORS[node.nodeType];
        const stateColor = STATE_COLORS[node.operationalState];

        const isNodeMatching = isNodeMatchingFilter(node);
        const radius = isSelected ? 14 : node.nodeType === 'chokepoint' ? 10 : node.nodeType === 'shipping_route' ? 6 : 7.5;
        const finalRadius = isNodeMatching ? radius : radius * 0.75;

        const strokeColor = isSelected ? '#f97316' : isAffected ? '#ef4444' : typeColor;
        const hasGeoJson = node.nodeType === 'shipping_route' && node.metadata.geometry;

        return (
          <React.Fragment key={node.nodeId}>
            {hasGeoJson && GeoJSON && (
              <GeoJSON
                key={`geojson-${node.nodeId}-${isSelected ? 'sel' : 'norm'}`}
                data={{
                  type: 'Feature',
                  geometry: node.metadata.geometry,
                  properties: { name: node.name }
                }}
                style={() => ({
                  color: isSelected ? '#f97316' : typeColor,
                  weight: isSelected ? 4 : 2,
                  opacity: isNodeMatching ? (isSelected ? 0.95 : 0.65) : 0.1,
                  dashArray: '6 4',
                })}
                eventHandlers={{ click: () => onSelectNode(node.nodeId) }}
              >
                <Tooltip sticky>
                  <div style={{ fontFamily: 'ui-monospace, monospace', fontSize: '11px' }}>
                    <div style={{ color: '#fff', fontWeight: 600 }}>{node.name}</div>
                    <div style={{ color: '#aaa', fontSize: '10px' }}>Shipping Lane</div>
                  </div>
                </Tooltip>
              </GeoJSON>
            )}

            <CircleMarker
              center={res.coords}
              radius={finalRadius}
              pathOptions={{
                color: strokeColor,
                weight: isSelected ? 3.5 : isAffected ? 2.5 : 1.5,
                fillColor: stateColor,
                fillOpacity: isNodeMatching ? 0.9 : 0.15,
                opacity: isNodeMatching ? 1 : 0.15,
              }}
              eventHandlers={{ click: () => onSelectNode(node.nodeId) }}
            >
              <Tooltip direction="top" offset={[0, -(finalRadius + 3)]}>
                <div style={{ fontFamily: 'ui-monospace, monospace', fontSize: '11px', minWidth: '140px' }}>
                  <div style={{ color: '#fff', fontWeight: 600, marginBottom: '2px' }}>{node.name}</div>
                  <div style={{ color: '#aaa', marginBottom: '2px' }}>{NODE_TYPE_LABELS[node.nodeType]}</div>
                  <div style={{ color: stateColor, fontSize: '10px', textTransform: 'uppercase', marginBottom: '3px' }}>
                    ● {node.operationalState}
                  </div>
                  <div style={{ color: '#888', fontSize: '9px', borderTop: '1px solid #333', paddingTop: '3px' }}>
                    [{res.type}] {res.label}
                  </div>
                  {isAffected && <div style={{ color: '#ef4444', fontSize: '10px', marginTop: '2px' }}>⚠ Impact affected</div>}
                </div>
              </Tooltip>
            </CircleMarker>
          </React.Fragment>
        );
      })}
    </MapContainer>
  );
};

// ── NetworkPage ───────────────────────────────────────────────────────────────

interface NetworkPageProps {}

export const NetworkPage: React.FC<NetworkPageProps> = () => {
  const [graph, setGraph] = useState<DigitalTwinGraph | null>(null);
  const [selectedNodeId, setSelectedNodeId] = useState<string | null>(null);
  const [draftState, setDraftState] = useState<OperationalState>('operational');
  const [impact, setImpact] = useState<DigitalTwinImpactResult | null>(null);
  const [loading, setLoading] = useState(true);
  const [action, setAction] = useState<'state' | 'reset' | 'impact' | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [actionError, setActionError] = useState<string | null>(null);
  const [visibleTypes, setVisibleTypes] = useState<Set<DigitalTwinNodeType>>(
    new Set<DigitalTwinNodeType>(['supplier', 'port', 'refinery', 'strategic_reserve', 'shipping_route', 'chokepoint'])
  );
  const [showConnections, setShowConnections] = useState(true);
  const [showLogicalPanel, setShowLogicalPanel] = useState(false);
  const [statusFilter, setStatusFilter] = useState<'all' | 'operational' | 'reduced' | 'disrupted_or_blocked' | null>(null);

  // Search state
  const [searchQuery, setSearchQuery] = useState('');
  const [isSearchOpen, setIsSearchOpen] = useState(false);
  const searchContainerRef = useRef<HTMLDivElement | null>(null);

  const mapRef = useRef<LeafletMap | null>(null);

  const loadGraph = async () => {
    setLoading(true);
    setError(null);
    try {
      const nextGraph = await fetchDigitalTwin();
      setGraph(nextGraph);
      setSelectedNodeId((current) =>
        current && nextGraph.nodes.some((node) => node.nodeId === current)
          ? current
          : nextGraph.nodes[0]?.nodeId || null
      );
      setImpact(null);
    } catch (loadError) {
      setError(loadError instanceof Error ? loadError.message : 'Digital Twin data could not be loaded.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    void loadGraph();
  }, []);

  const selectedNode = useMemo(
    () => graph?.nodes.find((node) => node.nodeId === selectedNodeId) || null,
    [graph, selectedNodeId]
  );

  const stateCounts = useMemo(() => {
    const counts: Record<OperationalState, number> = { operational: 0, reduced: 0, disrupted: 0, blocked: 0 };
    for (const node of graph?.nodes || []) counts[node.operationalState] += 1;
    return counts;
  }, [graph]);

  const coordMap = useMemo(
    () => (graph ? buildCoordMap(graph.nodes) : new Map<string, ResolvedCoord>()),
    [graph]
  );

  const logicalNodes = useMemo(
    () => graph?.nodes.filter((node) => coordMap.get(node.nodeId)?.type === 'LOGICAL') ?? [],
    [graph, coordMap]
  );

  const mappableCount = useMemo(
    () => (graph?.nodes.length ?? 0) - logicalNodes.length,
    [graph, logicalNodes]
  );

  // Search results calculation
  const searchResults = useMemo(
    () => (graph ? searchDigitalTwinNodes(graph.nodes, searchQuery) : []),
    [graph, searchQuery]
  );

  useEffect(() => {
    if (selectedNode) setDraftState(selectedNode.operationalState);
  }, [selectedNode]);

  // Click outside listener for search dropdown
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (searchContainerRef.current && !searchContainerRef.current.contains(event.target as Node)) {
        setIsSearchOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  /** Handle selection of a node from search results or enter key */
  const handleSelectNode = useCallback(
    (node: DigitalTwinNode) => {
      setSelectedNodeId(node.nodeId);
      setIsSearchOpen(false);
      setSearchQuery(node.name);

      // Ensure node's layer type is visible so the marker appears on map if mappable
      setVisibleTypes((prev) => {
        if (!prev.has(node.nodeType)) {
          const next = new Set(prev);
          next.add(node.nodeType);
          return next;
        }
        return prev;
      });

      const res = coordMap.get(node.nodeId);
      if (res?.coords) {
        // Mappable node: center and focus map to entity's position
        mapRef.current?.setView(res.coords, MAP_FOCUSED_ZOOM);
      } else {
        // Logical-only node: do NOT move map, expand logical panel
        setShowLogicalPanel(true);
      }
    },
    [coordMap]
  );

  const handleSearchKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter' && searchResults.length > 0) {
      e.preventDefault();
      handleSelectNode(searchResults[0]);
    } else if (e.key === 'Escape') {
      setIsSearchOpen(false);
    }
  };

  const handleClearSearch = () => {
    setSearchQuery('');
    setIsSearchOpen(false);
  };

  const handleStateUpdate = async () => {
    if (!selectedNode) return;
    setAction('state');
    setActionError(null);
    try {
      const updated = await updateDigitalTwinNodeState(selectedNode.nodeId, draftState);
      setGraph((current) =>
        current ? updateGraphNode(current, updated.nodeId, updated.operationalState) : current
      );
      setImpact(null);
    } catch (updateError) {
      setActionError(updateError instanceof Error ? updateError.message : 'Node state could not be updated.');
    } finally {
      setAction(null);
    }
  };

  const handleReset = async () => {
    setAction('reset');
    setActionError(null);
    try {
      const reset = await resetDigitalTwin();
      setGraph(reset.graph);
      setImpact(null);
    } catch (resetError) {
      setActionError(resetError instanceof Error ? resetError.message : 'Digital Twin could not be reset.');
    } finally {
      setAction(null);
    }
  };

  const handleImpact = async () => {
    if (
      !selectedNode ||
      (selectedNode.operationalState !== 'disrupted' && selectedNode.operationalState !== 'blocked')
    ) return;
    setAction('impact');
    setActionError(null);
    try {
      setImpact(await analyzeDigitalTwinImpact(selectedNode.nodeId));
    } catch (impactError) {
      setActionError(impactError instanceof Error ? impactError.message : 'Impact analysis could not be completed.');
    } finally {
      setAction(null);
    }
  };

  const toggleType = useCallback((type: DigitalTwinNodeType) => {
    setVisibleTypes((prev) => {
      const next = new Set(prev);
      if (next.has(type)) next.delete(type);
      else next.add(type);
      return next;
    });
  }, []);

  const handleResetView = useCallback(() => {
    mapRef.current?.setView(MAP_DEFAULT_CENTER, MAP_DEFAULT_ZOOM);
  }, []);

  if (loading)
    return <LoadingState message="Loading supply chain network..." subtext="Synchronizing asset relationships and operating states" />;
  if (error)
    return <ErrorState title="Supply chain network unavailable" message={error} onRetry={() => void loadGraph()} />;
  if (!graph || graph.nodes.length === 0) {
    return (
      <EmptyState
        title="Supply chain network has no assets"
        description="The network service returned no source-backed supply chain assets. No connectivity has been inferred."
        icon={Network}
      />
    );
  }

  return (
    <div className="space-y-6">
      <PageHeader
        title="Supply Chain Network"
        subtitle="Live source-backed assets, operating states, and deterministic disruption impact analysis."
        badgeText="AVAILABLE"
        badgeLevel="AVAILABLE"
        actions={(
          <button
            type="button"
            onClick={() => void handleReset()}
            disabled={action !== null}
            className="inline-flex items-center gap-2 px-3 py-2 rounded-md border border-[#333333] bg-[#121212] text-xs font-mono text-[#EDEDED] hover:border-orange-500/60 hover:text-orange-300 disabled:opacity-50 cursor-pointer disabled:cursor-not-allowed"
          >
            <RotateCcw className={`w-3.5 h-3.5 ${action === 'reset' ? 'animate-spin' : ''}`} />
            Reset Network States
          </button>
        )}
      />

      {/* Summary cards */}
      <div className="grid grid-cols-2 lg:grid-cols-5 gap-3">
        <SummaryCard
          label="Supply Chain Assets"
          value={`${mappableCount} / ${graph.nodes.length}`}
          icon={CircleDot}
          active={statusFilter === null}
          onClick={() => setStatusFilter(null)}
        />
        <SummaryCard
          label="Connections"
          value={graph.edges.length}
          icon={Network}
          active={showConnections}
          onClick={() => setShowConnections((prev) => !prev)}
        />
        <SummaryCard
          label="Operational"
          value={stateCounts.operational}
          color="text-emerald-400"
          active={statusFilter === 'operational'}
          onClick={() => setStatusFilter((curr) => (curr === 'operational' ? null : 'operational'))}
        />
        <SummaryCard
          label="Reduced"
          value={stateCounts.reduced}
          color="text-amber-400"
          active={statusFilter === 'reduced'}
          onClick={() => setStatusFilter((curr) => (curr === 'reduced' ? null : 'reduced'))}
        />
        <SummaryCard
          label="Disrupted / Blocked"
          value={stateCounts.disrupted + stateCounts.blocked}
          color="text-red-400"
          active={statusFilter === 'disrupted_or_blocked'}
          onClick={() => setStatusFilter((curr) => (curr === 'disrupted_or_blocked' ? null : 'disrupted_or_blocked'))}
        />
      </div>

      {actionError && (
        <div className="flex items-center gap-2 p-3 rounded-md border border-red-500/30 bg-red-500/5 text-xs text-red-300">
          <AlertTriangle className="w-4 h-4 flex-shrink-0" />
          <span>{actionError}</span>
        </div>
      )}

      <div className="grid grid-cols-1 xl:grid-cols-[minmax(0,1fr)_320px] gap-6 items-start">
        {/* ── Main Map Section ── */}
        <section className="rounded-lg border border-[#222222] bg-[#121212] overflow-hidden">
          {/* Header & Integrated Search Bar */}
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 px-4 pt-4 pb-3 border-b border-[#222222]">
            <div>
              <div className="flex items-center gap-2">
                <Network className="w-4 h-4 text-orange-400" />
                <h2 className="text-sm font-semibold text-[#EDEDED] font-mono">Geographic World Map</h2>
              </div>
              <p className="text-[11px] text-[#777777] mt-1">
                Spatial supply chain visualization adhering to strict geographic data integrity rules.
              </p>
            </div>

            {/* ── Digital Twin Asset Search Box ── */}
            <div ref={searchContainerRef} className="relative w-full sm:w-72">
              <div className="relative flex items-center">
                <Search className="w-3.5 h-3.5 absolute left-2.5 text-[#666666] pointer-events-none" />
                <input
                  type="text"
                  value={searchQuery}
                  onChange={(e) => {
                    setSearchQuery(e.target.value);
                    setIsSearchOpen(true);
                  }}
                  onFocus={() => setIsSearchOpen(true)}
                  onKeyDown={handleSearchKeyDown}
                  placeholder="Search assets, countries, ports..."
                  className="w-full pl-8 pr-7 py-1.5 rounded border border-[#333333] bg-[#0D0D0D] text-xs font-mono text-[#EDEDED] placeholder-[#555555] focus:outline-none focus:border-orange-500 transition-colors"
                />
                {searchQuery && (
                  <button
                    type="button"
                    onClick={handleClearSearch}
                    className="absolute right-2 text-[#666666] hover:text-[#EDEDED] cursor-pointer"
                    aria-label="Clear search"
                  >
                    <X className="w-3.5 h-3.5" />
                  </button>
                )}
              </div>

              {/* Dropdown Menu */}
              {isSearchOpen && searchQuery.trim().length > 0 && (
                <div className="absolute left-0 right-0 top-full mt-1 max-h-64 overflow-y-auto rounded-md border border-[#333333] bg-[#0F0F0F] shadow-xl z-50 divide-y divide-[#1A1A1A]">
                  {searchResults.length > 0 ? (
                    searchResults.map((node) => {
                      const res = coordMap.get(node.nodeId);
                      return (
                        <button
                          key={node.nodeId}
                          type="button"
                          onClick={() => handleSelectNode(node)}
                          className="w-full text-left px-3 py-2 hover:bg-[#1A1A1A] transition-colors cursor-pointer flex items-center justify-between gap-2"
                        >
                          <div className="min-w-0 flex-1">
                            <div className="text-xs font-semibold font-mono text-[#EDEDED] truncate">
                                {node.name}
                            </div>
                            <div className="text-[10px] font-mono text-[#777777] flex items-center gap-1.5 mt-0.5">
                              <span
                                className="w-1.5 h-1.5 rounded-full inline-block"
                                style={{ backgroundColor: NODE_TYPE_COLORS[node.nodeType] }}
                              />
                              <span>{NODE_TYPE_LABELS[node.nodeType]}</span>
                            </div>
                          </div>
                          <div className="text-[9px] font-mono shrink-0 px-1.5 py-0.5 rounded border border-[#222222] bg-[#0A0A0A] text-[#888888]">
                            {res?.type || 'LOGICAL'}
                          </div>
                        </button>
                      );
                    })
                  ) : (
                    <div className="px-3 py-2.5 text-xs font-mono text-[#777777] text-center">
                      No matching supply chain assets found
                    </div>
                  )}
                </div>
              )}
            </div>
          </div>

          {/* Explore Hubs suggestions */}
          <div className="flex flex-wrap items-center gap-1.5 px-4 py-2 border-b border-[#222222]/50 bg-[#121212]/30">
            <span className="text-[9px] font-mono text-[#555555] uppercase tracking-wider shrink-0 mr-1 flex items-center gap-1">
              <Compass className="w-3 h-3 text-orange-400" />
              Quick Explore:
            </span>
            {[
              { name: 'Strait of Hormuz', label: 'Strait of Hormuz' },
              { name: 'Strait of Malacca', label: 'Strait of Malacca' },
              { name: 'ISPRL Mangalore', label: 'ISPRL Mangalore' },
              { name: 'Saudi Arabia', label: 'Saudi Arabia' },
              { name: 'Iraq', label: 'Iraq' },
            ].map((item) => {
              const active = selectedNode?.name.toLowerCase().includes(item.name.toLowerCase());
              return (
                <button
                  key={item.name}
                  type="button"
                  onClick={() => {
                    const found = graph.nodes.find((n) => n.name.toLowerCase().includes(item.name.toLowerCase()));
                    if (found) {
                      handleSelectNode(found);
                    }
                  }}
                  className={`inline-flex items-center gap-1 px-2 py-0.5 rounded text-[10px] font-mono border transition-all duration-200 cursor-pointer ${
                    active
                      ? 'border-orange-500/80 bg-orange-500/10 text-orange-200'
                      : 'border-[#222222] bg-[#0A0A0A] text-[#777777] hover:border-[#444444] hover:text-[#EDEDED]'
                  }`}
                >
                  <span className={`w-1 h-1 rounded-full ${active ? 'bg-orange-500 animate-pulse' : 'bg-[#555]'}`} />
                  {item.label}
                </button>
              );
            })}
            
            {statusFilter && (
              <span className="ml-auto inline-flex items-center gap-1.5 px-2 py-0.5 rounded border border-orange-500/20 bg-orange-500/5 text-[9px] font-mono text-orange-300 animate-fade-in">
                <span className="w-1.5 h-1.5 rounded-full bg-orange-400 animate-ping inline-block" />
                Filter Active: {statusFilter.replaceAll('_', ' ')}
                <button
                  type="button"
                  onClick={() => setStatusFilter(null)}
                  className="hover:text-white ml-1 font-bold cursor-pointer"
                  title="Clear filter"
                >
                  ✕
                </button>
              </span>
            )}
          </div>

          {/* Controls Toolbar */}
          <div className="flex flex-wrap items-center gap-2 px-4 py-2.5 border-b border-[#1a1a1a] bg-[#0D0D0D]">
            <span className="text-[10px] font-mono text-[#555555] uppercase tracking-widest shrink-0">
              Layers
            </span>
            {(Object.entries(NODE_TYPE_LABELS) as Array<[DigitalTwinNodeType, string]>).map(([type, label]) => {
              const active = visibleTypes.has(type);
              return (
                <button
                  key={type}
                  type="button"
                  onClick={() => toggleType(type)}
                  className="inline-flex items-center gap-1.5 px-2 py-1 rounded border text-[10px] font-mono cursor-pointer transition-colors"
                  style={{
                    borderColor: active ? `${NODE_TYPE_COLORS[type]}55` : '#2a2a2a',
                    color: active ? NODE_TYPE_COLORS[type] : '#555555',
                    background: active ? `${NODE_TYPE_COLORS[type]}12` : 'transparent',
                  }}
                >
                  <span
                    className="w-1.5 h-1.5 rounded-full shrink-0"
                    style={{ background: active ? NODE_TYPE_COLORS[type] : '#3a3a3a' }}
                  />
                  {label}
                </button>
              );
            })}

            <div className="ml-auto flex items-center gap-2">
              <button
                type="button"
                onClick={() => setShowConnections((v) => !v)}
                className="inline-flex items-center gap-1.5 px-2 py-1 rounded border border-[#333333] text-[10px] font-mono text-[#888888] hover:text-[#EDEDED] cursor-pointer transition-colors"
              >
                {showConnections ? <Eye className="w-3 h-3" /> : <EyeOff className="w-3 h-3" />}
                {showConnections ? 'Hide' : 'Show'} Edges
              </button>
              <button
                type="button"
                onClick={handleResetView}
                title="Reset map view"
                className="inline-flex items-center gap-1.5 px-2 py-1 rounded border border-[#333333] text-[10px] font-mono text-[#888888] hover:text-orange-300 hover:border-orange-500/60 cursor-pointer transition-colors"
              >
                <Crosshair className="w-3 h-3" />
                Reset View
              </button>
            </div>
          </div>

          {/* Leaflet Map */}
          <div style={{ height: '580px', position: 'relative' }}>
            <WorldMap
              graph={graph}
              coordMap={coordMap}
              selectedNodeId={selectedNodeId}
              impact={impact}
              visibleTypes={visibleTypes}
              showConnections={showConnections}
              onSelectNode={setSelectedNodeId}
              mapRef={mapRef}
              statusFilter={statusFilter}
            />
          </div>

          {/* Geographic Integrity Legend Footer */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-2 px-4 py-3 border-t border-[#1a1a1a] bg-[#0A0A0A] text-[10px] font-mono text-[#777777]">
            <div className="flex items-center gap-1.5">
              <span className="w-2 h-2 rounded-full bg-[#10b981] border border-white/40" />
              <span><strong>[SOURCE]</strong> Verified DB Lat/Lng</span>
            </div>
            <div className="flex items-center gap-1.5">
              <span className="w-2 h-2 rounded-full bg-[#60a5fa]/70 border border-dashed border-[#60a5fa]" />
              <span><strong>[COUNTRY]</strong> Country Centroid Position</span>
            </div>
            <div className="flex items-center gap-1.5">
              <span className="w-2 h-2 rounded-full bg-[#f97316]/70 border border-dotted border-[#f97316]" />
              <span><strong>[STATE_APPROX]</strong> State Approx Centroid</span>
            </div>
          </div>

          {/* Logical-Only Assets Panel */}
          {logicalNodes.length > 0 && (
            <div className="border-t border-[#1a1a1a]">
              <button
                type="button"
                onClick={() => setShowLogicalPanel((v) => !v)}
                className="w-full flex items-center justify-between px-4 py-2.5 bg-[#0D0D0D] hover:bg-[#151515] text-[11px] font-mono text-[#AAAAAA] transition-colors cursor-pointer"
              >
                <div className="flex items-center gap-2">
                  <Layers className="w-3.5 h-3.5 text-cyan-400" />
                  <span>
                    Logical Network Assets ({logicalNodes.length}) — No geographic pin created
                  </span>
                </div>
                {showLogicalPanel ? <ChevronUp className="w-3.5 h-3.5" /> : <ChevronDown className="w-3.5 h-3.5" />}
              </button>

              {showLogicalPanel && (
                <div className="p-4 bg-[#080808] border-t border-[#1a1a1a] space-y-2">
                  <div className="flex items-start gap-2 p-2.5 rounded border border-cyan-500/20 bg-cyan-500/5 text-[11px] text-cyan-300">
                    <Info className="w-3.5 h-3.5 shrink-0 mt-0.5" />
                    <span>
                      These assets are preserved in the Digital Twin network topology and risk analysis, but are not assigned map coordinates because their source data does not provide physical facility coordinates.
                    </span>
                  </div>
                  <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-2 pt-2">
                    {logicalNodes.map((node) => (
                      <button
                        key={node.nodeId}
                        type="button"
                        onClick={() => setSelectedNodeId(node.nodeId)}
                        className={`text-left p-2 rounded border text-xs font-mono transition-colors cursor-pointer ${
                          node.nodeId === selectedNodeId
                            ? 'border-orange-500 bg-orange-500/10 text-orange-200'
                            : 'border-[#222222] bg-[#111111] text-[#CCCCCC] hover:border-[#444444]'
                        }`}
                      >
                        <div className="font-semibold truncate">{node.name}</div>
                        <div className="text-[9px] text-[#777777] flex items-center justify-between mt-1">
                          <span>{NODE_TYPE_LABELS[node.nodeType]}</span>
                          <span style={{ color: STATE_COLORS[node.operationalState] }}>
                            ● {node.operationalState}
                          </span>
                        </div>
                      </button>
                    ))}
                  </div>
                </div>
              )}
            </div>
          )}
        </section>

        {/* ── Details Sidebar ── */}
        <aside className="rounded-lg border border-[#222222] bg-[#121212] p-5 xl:sticky xl:top-6">
          {selectedNode ? (
            <NodeDetails
              node={selectedNode}
              draftState={draftState}
              action={action}
              onDraftState={setDraftState}
              onUpdate={() => void handleStateUpdate()}
              onImpact={() => void handleImpact()}
              impact={impact}
              coordRes={coordMap.get(selectedNode.nodeId)}
            />
          ) : (
            <EmptyState
              title="Select an asset"
              description="Choose an asset from the supply chain network or logical assets panel to view details."
              icon={CircleDot}
              className="border-0 bg-transparent p-4"
            />
          )}
        </aside>
      </div>
    </div>
  );
};

// ── Sub-components ────────────────────────────────────────────────────────────

const SummaryCard: React.FC<{
  label: string;
  value: string | number;
  icon?: React.ElementType;
  color?: string;
  active?: boolean;
  onClick?: () => void;
}> = ({
  label,
  value,
  icon: Icon,
  color = 'text-[#EDEDED]',
  active = false,
  onClick,
}) => (
  <button
    type="button"
    onClick={onClick}
    disabled={!onClick}
    className={`w-full text-left rounded-lg border p-3.5 transition-all duration-300 ${
      onClick
        ? 'cursor-pointer hover:-translate-y-0.5 hover:shadow-lg hover:shadow-orange-500/5'
        : 'cursor-default'
    } ${
      active
        ? 'border-orange-500/80 bg-[#1e130d] ring-1 ring-orange-500/30'
        : 'border-[#222222] bg-[#121212] hover:border-[#444444]'
    }`}
  >
    <div className="flex items-center justify-between gap-2">
      <span className="text-[10px] uppercase tracking-widest text-[#666666] font-mono">{label}</span>
      {Icon && <Icon className={`w-3.5 h-3.5 ${active ? 'text-orange-500' : 'text-orange-400'}`} />}
    </div>
    <div className={`mt-2 text-xl font-semibold font-mono flex items-baseline gap-1.5 ${color}`}>
      {value.toString()}
      {active && <span className="w-1.5 h-1.5 rounded-full bg-orange-500 animate-pulse inline-block" />}
    </div>
  </button>
);

const isValueAvailable = (val: any): boolean => {
  if (val === null || val === undefined) return false;
  if (typeof val === 'number') {
    return !isNaN(val);
  }
  if (typeof val === 'string') {
    const s = val.trim().toLowerCase();
    return s !== '' && s !== 'n/a' && s !== 'not available' && s !== 'unknown' && s !== '--' && s !== 'no data' && s !== 'not supplied';
  }
  if (typeof val === 'object') {
    if ('value' in val) {
      return isValueAvailable(val.value);
    }
    return Object.keys(val).length > 0;
  }
  return true;
};

const formatValueOrMeasurement = (val: any): string => {
  if (typeof val === 'object' && val !== null) {
    if ('value' in val && 'unit' in val) {
      return formatMeasurement(val.value, val.unit);
    }
  }
  return String(val);
};

interface NodeDetailsProps {
  node: DigitalTwinNode;
  draftState: OperationalState;
  action: 'state' | 'reset' | 'impact' | null;
  impact: DigitalTwinImpactResult | null;
  coordRes?: ResolvedCoord;
  onDraftState: (state: OperationalState) => void;
  onUpdate: () => void;
  onImpact: () => void;
}

export const NodeDetails: React.FC<NodeDetailsProps> = ({
  node,
  draftState,
  action,
  impact,
  coordRes,
  onDraftState,
  onUpdate,
  onImpact,
}) => {
  const items: Array<{ label: string; value: string }> = [];

  // 1. Asset Type
  if (isValueAvailable(NODE_TYPE_LABELS[node.nodeType])) {
    items.push({ label: 'Asset Type', value: NODE_TYPE_LABELS[node.nodeType] });
  }

  // 2. Status Source
  if (isValueAvailable(node.stateSource)) {
    items.push({ label: 'Status Source', value: node.stateSource });
  }

  // 3. Country
  const countryVal = node.metadata?.country || node.metadata?.sourceCountryName || node.metadata?.countryName;
  if (isValueAvailable(countryVal)) {
    items.push({ label: 'Country', value: String(countryVal) });
  }

  // 4. Capacity
  if (isValueAvailable(node.capacity)) {
    items.push({ label: 'Capacity', value: formatNodeMeasurement(node.capacity) });
  }

  // 5. Current Flow
  if (isValueAvailable(node.currentFlow)) {
    items.push({ label: 'Current Flow', value: formatNodeMeasurement(node.currentFlow, node.metadata?.currentFlowUnitStatus) });
  }

  // 6. Connections
  if (node.connectedNodeIds && node.connectedNodeIds.length > 0) {
    items.push({ label: 'Connections', value: node.connectedNodeIds.length.toLocaleString() });
  }

  // 7. Geographic Status
  if (coordRes && isValueAvailable(coordRes.label) && coordRes.label.trim().toLowerCase() !== 'unknown') {
    items.push({ label: 'Geographic Status', value: `[${coordRes.type}] ${coordRes.label}` });
  }

  // 8. Other optional metrics: Throughput, Supply Volume, Demand, Risk, Reliability, Transit Time, Cost, Distance, Utilization, Recovery
  const throughputVal = node.metadata?.throughput || (node as any).throughput;
  if (isValueAvailable(throughputVal)) {
    items.push({ label: 'Throughput', value: formatValueOrMeasurement(throughputVal) });
  }

  const supplyVolumeVal = node.metadata?.supplyVolume || node.metadata?.supply_volume || node.metadata?.supply || (node as any).supplyVolume;
  if (isValueAvailable(supplyVolumeVal)) {
    items.push({ label: 'Supply Volume', value: formatValueOrMeasurement(supplyVolumeVal) });
  }

  const demandVal = node.metadata?.demand || (node as any).demand;
  if (isValueAvailable(demandVal)) {
    items.push({ label: 'Demand', value: formatValueOrMeasurement(demandVal) });
  }

  const riskVal = node.metadata?.risk || node.metadata?.riskLevel || node.metadata?.riskScore || node.metadata?.risk_score || node.metadata?.risk_level || node.metadata?.geopoliticalRisk;
  if (isValueAvailable(riskVal)) {
    items.push({ label: 'Risk', value: formatValueOrMeasurement(riskVal) });
  }

  const reliabilityVal = node.metadata?.reliability || node.metadata?.reliabilityScore || node.metadata?.reliability_score || (node as any).reliability;
  if (isValueAvailable(reliabilityVal)) {
    items.push({ label: 'Reliability', value: formatValueOrMeasurement(reliabilityVal) });
  }

  const transitTimeVal = node.metadata?.transitTime || node.metadata?.transit_time || node.metadata?.transit || (node as any).transitTime;
  if (isValueAvailable(transitTimeVal)) {
    items.push({ label: 'Transit Time', value: formatValueOrMeasurement(transitTimeVal) });
  }

  const costVal = node.metadata?.cost || node.metadata?.commercialCost || node.metadata?.freightCost || (node as any).cost;
  if (isValueAvailable(costVal)) {
    items.push({ label: 'Cost', value: formatValueOrMeasurement(costVal) });
  }

  const distanceVal = node.metadata?.distance || (node as any).distance;
  if (isValueAvailable(distanceVal)) {
    items.push({ label: 'Distance', value: formatValueOrMeasurement(distanceVal) });
  }

  const utilizationVal = node.metadata?.utilization || (node as any).utilization;
  if (isValueAvailable(utilizationVal)) {
    items.push({ label: 'Utilization', value: formatValueOrMeasurement(utilizationVal) });
  }

  const recoveryVal = node.metadata?.recovery || node.metadata?.recoveryTime || (node as any).recovery;
  if (isValueAvailable(recoveryVal)) {
    items.push({ label: 'Recovery', value: formatValueOrMeasurement(recoveryVal) });
  }

  return (
    <div className="space-y-5">
      <div className="pb-4 border-b border-[#222222]">
        <div className="flex items-start justify-between gap-3">
          <div className="min-w-0">
            <p className="text-[10px] uppercase tracking-widest text-[#666666] font-mono">Selected Asset</p>
            <h2 className="text-base font-semibold text-[#EDEDED] mt-1 truncate">{node.name}</h2>
          </div>
          <StatusBadge level={stateBadgeLevel(node.operationalState)} label={node.operationalState} size="sm" />
        </div>
        <p className="text-[10px] text-[#666666] font-mono mt-2 break-all">
          <span className="text-[#555555]">Technical asset ID: </span>{node.nodeId}
        </p>
      </div>

      <dl className="grid grid-cols-2 gap-3 text-xs">
        {items.map((item) => (
          <DetailItem key={item.label} label={item.label} value={item.value} />
        ))}
      </dl>

      <div className="space-y-2.5 pt-4 border-t border-[#222222]">
        <label htmlFor="digital-twin-state" className="block text-[10px] uppercase tracking-widest text-[#666666] font-mono">
          Update Operating State
        </label>
        <div className="flex gap-2">
          <select
            id="digital-twin-state"
            value={draftState}
            onChange={(event) => onDraftState(event.target.value as OperationalState)}
            className="flex-1 min-w-0 px-2.5 py-2 rounded-md border border-[#333333] bg-[#0D0D0D] text-xs font-mono text-[#EDEDED] focus:outline-none focus:border-orange-500"
          >
            {OPERATIONAL_STATES.map((state) => (
              <option key={state} value={state}>
                {state}
              </option>
            ))}
          </select>
          <button
            type="button"
            onClick={onUpdate}
            disabled={action !== null || draftState === node.operationalState}
            className="inline-flex items-center gap-1.5 px-3 py-2 rounded-md bg-orange-600 hover:bg-orange-500 text-white text-xs font-semibold disabled:opacity-50 disabled:cursor-not-allowed cursor-pointer"
          >
            {action === 'state' ? <RefreshCw className="w-3.5 h-3.5 animate-spin" /> : <Activity className="w-3.5 h-3.5" />}
            Apply
          </button>
        </div>
        <button
          type="button"
          onClick={onImpact}
          disabled={action !== null || (node.operationalState !== 'disrupted' && node.operationalState !== 'blocked')}
          className="w-full inline-flex items-center justify-center gap-2 px-3 py-2 rounded-md border border-[#333333] bg-[#0D0D0D] text-xs font-mono text-[#EDEDED] hover:border-orange-500/60 hover:text-orange-300 disabled:opacity-50 disabled:cursor-not-allowed cursor-pointer"
        >
          {action === 'impact' ? <RefreshCw className="w-3.5 h-3.5 animate-spin" /> : <AlertTriangle className="w-3.5 h-3.5" />}
          Analyze Impact
        </button>
        <p className="text-[10px] text-[#666666]">Impact analysis is available only for disrupted or blocked assets.</p>
      </div>

      {impact && <ImpactDetails impact={impact} />}
    </div>
  );
};

const DetailItem: React.FC<{ label: string; value: string }> = ({ label, value }) => (
  <div>
    <dt className="text-[10px] uppercase tracking-widest text-[#666666] font-mono">{label}</dt>
    <dd className="text-xs text-[#D4D4D4] mt-1 break-words">{value}</dd>
  </div>
);

const ImpactDetails: React.FC<{ impact: DigitalTwinImpactResult }> = ({ impact }) => (
  <div className="pt-4 border-t border-[#222222] space-y-3">
    <div className="flex items-center gap-2">
      <AlertTriangle className="w-4 h-4 text-orange-400" />
      <h3 className="text-sm font-semibold text-[#EDEDED] font-mono">Impact Result</h3>
    </div>
    <div className="grid grid-cols-2 gap-3 text-xs">
      <DetailItem label="Affected Assets" value={impact.affectedNodeIds.length.toLocaleString()} />
      <DetailItem label="Affected Connections" value={impact.affectedEdgeIds.length.toLocaleString()} />
      <DetailItem label="Asset Types" value={impact.affectedNodeTypes.length ? impact.affectedNodeTypes.join(', ') : 'None'} />
    </div>
    {impact.affectedNodeIds.length === 0 && impact.affectedEdgeIds.length === 0 ? (
      <p className="text-[11px] leading-relaxed text-[#888888]">
        No connected impact was returned. The network service reported no confirmed relationships for this asset.
      </p>
    ) : (
      <div className="space-y-3 text-[11px] text-[#B0B0B0]">
        <MeasurementGroup label="Affected Capacity" summary={impact.affectedCapacity} />
        <MeasurementGroup label="Affected Flow" summary={impact.affectedFlow} />
      </div>
    )}
  </div>
);

export const MeasurementGroup: React.FC<{ label: string; summary: DigitalTwinImpactResult['affectedCapacity'] }> = ({
  label,
  summary,
}) => {
  const values = [...summary.nodeTotals, ...summary.edgeTotals];
  return (
    <div>
      <p className="text-[10px] uppercase tracking-widest text-[#666666] font-mono">{label}</p>
      <p className="mt-1">
        {values.length ? values.map((value) => formatMeasurement(value.value, value.unit)).join(' · ') : 'Not supplied'}
      </p>
    </div>
  );
};
