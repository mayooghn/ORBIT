import React, { useEffect, useMemo, useState } from 'react';
import {
  Activity,
  AlertTriangle,
  Anchor,
  Clock3,
  GitBranch,
  Loader2,
  Ship,
  Factory,
} from 'lucide-react';
import { PageHeader } from '../components/common/PageHeader';
import type {
  ScenarioNodeListResponse,
  ScenarioSelectableNode,
} from '../scenarios/model';

type ScenarioSeverity = 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL';

interface ScenarioInput {
  eventId: string;
  durationDays: number;
  severity: ScenarioSeverity;
  affectedNodeId: string;
  capacityReductionPercent: number;
}

interface RecoveryPoint {
  day: number;
  remainingCapacityPercent: number;
  recoveryPercent: number;
  status: 'DISRUPTED' | 'RECOVERING' | 'RECOVERED';
}

interface ScenarioImpact {
  nodeId: string;
  nodeType: string;
  nodeName: string;
  impactType: 'DIRECT' | 'DOWNSTREAM';
  capacityBefore: number | null;
  capacityAfter: number | null;
  capacityLoss: number | null;
}

interface ScenarioResult {
  scenarioId: string;
  input: ScenarioInput;
  supplyLoss: number;
  supplyLossUnit: string;
  affectedRoutes: string[];
  affectedPorts: string[];
  affectedRefineries: string[];
  alternativeCapacity: number;
  alternativeCapacityUnit: string;
  alternativeCapacitySource: string;
  alternativeCapacityStatus: 'VERIFIED' | 'UNAVAILABLE';
  shortage: number;
  shortageUnit: string;
  recoveryDays: number;
  recoveryTimeline: RecoveryPoint[];
  recoveryAssumption: string;
  impacts: ScenarioImpact[];
  calculatedAt: string;
}

interface ScenarioApiResponse {
  status: string;
  scenario: ScenarioResult;
}

const API_BASE = '';
const DEFAULT_AFFECTED_NODE_ID =
  'chokepoint-strait-of-hormuz';

type ScenarioNodeListBody = Partial<ScenarioNodeListResponse> & {
  error?: unknown;
};

const readScenarioNodeListResponse = async (
  response: Response,
): Promise<ScenarioNodeListResponse> => {
  const body = await response.text();
  const contentType =
    response.headers.get('content-type') || 'unknown content type';
  const httpStatus = `HTTP ${response.status}${response.statusText ? ` ${response.statusText}` : ''}`;

  if (!body.trim()) {
    throw new Error(
      `Scenario node request returned an empty response (${httpStatus}).`,
    );
  }

  let data: ScenarioNodeListBody;
  try {
    data = JSON.parse(body) as ScenarioNodeListBody;
  } catch {
    throw new Error(
      `Scenario node request returned invalid JSON (${httpStatus}, ${contentType}).`,
    );
  }

  if (!contentType.toLowerCase().includes('application/json')) {
    throw new Error(
      `Scenario node request returned non-JSON content (${httpStatus}, ${contentType}).`,
    );
  }

  if (!response.ok) {
    throw new Error(
      typeof data.error === 'string'
        ? data.error
        : `Scenario node request failed (${httpStatus}).`,
    );
  }

  if (
    data.status !== 'AVAILABLE' ||
    !Array.isArray(data.nodes) ||
    !data.totals ||
    !data.typeCounts
  ) {
    throw new Error(
      `Scenario node request returned an incomplete response (${httpStatus}).`,
    );
  }

  return data as ScenarioNodeListResponse;
};

const formatNodeType = (nodeType: ScenarioSelectableNode['nodeType']): string => {
  const label = nodeType.replace('_', ' ');
  return `${label.charAt(0).toUpperCase()}${label.slice(1)}s`;
};

export const ScenariosPage: React.FC = () => {
  const [durationDays, setDurationDays] = useState(14);
  const [severity, setSeverity] =
    useState<ScenarioSeverity>('HIGH');
  const [capacityReductionPercent, setCapacityReductionPercent] =
    useState(50);
  const [affectedNodeId, setAffectedNodeId] = useState(
    DEFAULT_AFFECTED_NODE_ID,
  );
  const [scenarioNodes, setScenarioNodes] = useState<
    ScenarioSelectableNode[]
  >([]);
  const [nodesLoading, setNodesLoading] = useState(true);
  const [nodesError, setNodesError] = useState('');

  const [result, setResult] =
    useState<ScenarioResult | null>(null);

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    let cancelled = false;

    const loadScenarioNodes = async () => {
      setNodesLoading(true);
      setNodesError('');

      try {
        const response = await fetch(
          `${API_BASE}/api/scenarios/nodes`,
          { headers: { Accept: 'application/json' } },
        );
        const data = await readScenarioNodeListResponse(response);

        if (cancelled) return;

        setScenarioNodes(data.nodes);
        setAffectedNodeId((currentNodeId) =>
          data.nodes.some((node) => node.nodeId === currentNodeId)
            ? currentNodeId
            : data.nodes[0]?.nodeId || DEFAULT_AFFECTED_NODE_ID,
        );
      } catch (nodeError) {
        if (cancelled) return;

        setScenarioNodes([]);
        setNodesError(
          nodeError instanceof Error
            ? nodeError.message
            : 'Unable to load scenario-capable supply chain assets.',
        );
      } finally {
        if (!cancelled) setNodesLoading(false);
      }
    };

    void loadScenarioNodes();

    return () => {
      cancelled = true;
    };
  }, []);

  const groupedScenarioNodes = useMemo(() => {
    const groups = new Map<
      ScenarioSelectableNode['nodeType'],
      ScenarioSelectableNode[]
    >();

    for (const node of scenarioNodes) {
      const group = groups.get(node.nodeType) || [];
      group.push(node);
      groups.set(node.nodeType, group);
    }

    return [...groups.entries()];
  }, [scenarioNodes]);

  const selectedNode = scenarioNodes.find(
    (node) => node.nodeId === affectedNodeId,
  );

  const runScenario = async () => {
    setLoading(true);
    setError('');

    try {
      const response = await fetch(
        `${API_BASE}/api/scenarios/simulate`,
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            eventId:
              affectedNodeId === DEFAULT_AFFECTED_NODE_ID
                ? `HORMUZ-${durationDays}-DAYS`
                : `SCENARIO-${affectedNodeId}-${durationDays}-DAYS`,
            durationDays,
            severity,
            affectedNodeId,
            capacityReductionPercent,
          }),
        },
      );

      const data =
        (await response.json()) as ScenarioApiResponse & {
          error?: string;
        };

      if (!response.ok) {
        throw new Error(
          data.error || 'Scenario simulation failed.',
        );
      }

      setResult(data.scenario);
    } catch (simulationError) {
      setResult(null);
      setError(
        simulationError instanceof Error
          ? simulationError.message
          : 'Unable to run scenario.',
      );
    } finally {
      setLoading(false);
    }
  };

  const timelineMax = useMemo(() => {
    if (!result || result.recoveryTimeline.length === 0) {
      return 1;
    }

    return Math.max(
      ...result.recoveryTimeline.map(
        (point) => point.remainingCapacityPercent,
      ),
      100,
    );
  }, [result]);

  return (
    <div className="space-y-6">
      <PageHeader
        title="Scenario Studio"
        subtitle="Model deterministic disruption scenarios against the ORBIT supply chain network."
        badgeText="LIVE"
        badgeLevel="connected"
      />

      <div className="grid gap-6 lg:grid-cols-[360px_1fr]">
        {/* Scenario controls */}
        <section className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm dark:border-slate-800 dark:bg-slate-950">
          <div className="mb-6 flex items-start gap-3">
            <div className="rounded-xl bg-slate-100 p-2 dark:bg-slate-900">
              <GitBranch size={20} />
            </div>

            <div>
              <h2 className="text-lg font-semibold">
                Disruption Scenario
              </h2>
              <p className="mt-1 text-sm text-slate-500">
                Model disruptions across the supply chain network.
              </p>
            </div>
          </div>

          <div className="space-y-5">
            <div>
              <label className="mb-2 block text-sm font-medium">
                Affected asset
              </label>

              <select
                id="affected-node"
                value={affectedNodeId}
                onChange={(event) =>
                  setAffectedNodeId(event.target.value)
                }
                disabled={nodesLoading || Boolean(nodesError) || scenarioNodes.length === 0}
                className="w-full rounded-xl border border-slate-200 bg-white px-4 py-3 text-sm outline-none dark:border-slate-800 dark:bg-slate-950 disabled:cursor-not-allowed disabled:opacity-60"
              >
                {groupedScenarioNodes.map(([nodeType, nodes]) => (
                  <optgroup
                    key={nodeType}
                    label={formatNodeType(nodeType)}
                  >
                    {nodes.map((node) => (
                      <option key={node.nodeId} value={node.nodeId}>
                        {node.name}
                      </option>
                    ))}
                  </optgroup>
                ))}
              </select>

              {nodesLoading && (
                <div className="mt-2 text-xs text-slate-500">
                  Loading supply chain assets...
                </div>
              )}

              {nodesError && (
                <div
                  role="alert"
                  className="mt-2 text-xs text-red-600 dark:text-red-300"
                >
                  {nodesError}
                </div>
              )}

              {!nodesLoading && !nodesError && scenarioNodes.length === 0 && (
                <div className="mt-2 text-xs text-slate-500">
                  No scenario-selectable supply chain assets are available.
                </div>
              )}

              {selectedNode && (
                <div className="mt-2 text-xs text-slate-500">
                  {selectedNode.name} · {selectedNode.operationalState}
                  <span className="ml-1 text-slate-400">
                    ({selectedNode.nodeId})
                  </span>
                </div>
              )}
            </div>

            <div>
              <label
                htmlFor="duration"
                className="mb-2 block text-sm font-medium"
              >
                Disruption duration
              </label>

              <div className="flex items-center gap-3">
                <input
                  id="duration"
                  type="range"
                  min="1"
                  max="60"
                  value={durationDays}
                  onChange={(event) =>
                    setDurationDays(
                      Number(event.target.value),
                    )
                  }
                  className="w-full"
                />

                <div className="w-20 rounded-xl border border-slate-200 px-3 py-2 text-center text-sm font-semibold dark:border-slate-800">
                  {durationDays}d
                </div>
              </div>

              <div className="mt-2 flex justify-between text-xs text-slate-400">
                <span>1 day</span>
                <span>60 days</span>
              </div>
            </div>

            <div>
              <label
                htmlFor="severity"
                className="mb-2 block text-sm font-medium"
              >
                Severity
              </label>

              <select
                id="severity"
                value={severity}
                onChange={(event) =>
                  setSeverity(
                    event.target.value as ScenarioSeverity,
                  )
                }
                className="w-full rounded-xl border border-slate-200 bg-white px-4 py-3 text-sm outline-none dark:border-slate-800 dark:bg-slate-950"
              >
                <option value="LOW">Low</option>
                <option value="MEDIUM">Medium</option>
                <option value="HIGH">High</option>
                <option value="CRITICAL">Critical</option>
              </select>
            </div>

            <div>
              <div className="mb-2 flex items-center justify-between">
                <label
                  htmlFor="reduction"
                  className="text-sm font-medium"
                >
                  Capacity reduction
                </label>

                <span className="text-sm font-semibold">
                  {capacityReductionPercent}%
                </span>
              </div>

              <input
                id="reduction"
                type="range"
                min="0"
                max="100"
                value={capacityReductionPercent}
                onChange={(event) =>
                  setCapacityReductionPercent(
                    Number(event.target.value),
                  )
                }
                className="w-full"
              />
            </div>

            <button
              type="button"
              onClick={runScenario}
              disabled={
                loading ||
                nodesLoading ||
                Boolean(nodesError) ||
                scenarioNodes.length === 0
              }
              className="flex w-full items-center justify-center gap-2 rounded-xl bg-slate-950 px-4 py-3 text-sm font-semibold text-white transition hover:opacity-90 disabled:cursor-not-allowed disabled:opacity-50 dark:bg-white dark:text-slate-950"
            >
              {loading ? (
                <>
                  <Loader2
                    size={18}
                    className="animate-spin"
                  />
                  Simulating...
                </>
              ) : (
                <>
                  <Activity size={18} />
                  Run Simulation
                </>
              )}
            </button>

            {error && (
              <div className="flex gap-3 rounded-xl border border-red-200 bg-red-50 p-4 text-sm text-red-700 dark:border-red-900 dark:bg-red-950/30 dark:text-red-300">
                <AlertTriangle
                  size={18}
                  className="mt-0.5 shrink-0"
                />
                <span>{error}</span>
              </div>
            )}
          </div>
        </section>

        {/* Results */}
        <section className="space-y-6">
          {!result && !loading && (
            <div className="flex min-h-[420px] items-center justify-center rounded-2xl border border-dashed border-slate-300 bg-white dark:border-slate-700 dark:bg-slate-950">
              <div className="max-w-md px-6 text-center">
                <GitBranch
                  size={42}
                  className="mx-auto mb-4 opacity-40"
                />
                <h2 className="text-lg font-semibold">
                  No simulation yet
                </h2>
                <p className="mt-2 text-sm text-slate-500">
                  Configure the disruption on the left and run
                  the simulation to see how the supply chain
                  responds.
                </p>
              </div>
            </div>
          )}

          {loading && (
            <div className="flex min-h-[420px] items-center justify-center rounded-2xl border border-slate-200 bg-white dark:border-slate-800 dark:bg-slate-950">
              <div className="text-center">
                <Loader2
                  size={40}
                  className="mx-auto mb-4 animate-spin"
                />
                <p className="font-medium">
                  Running supply chain simulation
                </p>
                <p className="mt-2 text-sm text-slate-500">
                  Calculating downstream disruption and recovery.
                </p>
              </div>
            </div>
          )}

          {result && !loading && (
            <>
              {/* Headline metrics */}
              <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
                <Metric
                  icon={Activity}
                  label="Supply loss"
                  value={result.supplyLoss.toFixed(2)}
                  unit={result.supplyLossUnit}
                />

                <Metric
                  icon={AlertTriangle}
                  label="Shortage"
                  value={result.shortage.toFixed(2)}
                  unit={result.shortageUnit}
                />

                <Metric
                  icon={Activity}
                  label="Alternative capacity"
                  value={result.alternativeCapacityStatus === 'UNAVAILABLE' ? 'Not available' : result.alternativeCapacity.toFixed(2)}
                  unit={result.alternativeCapacityStatus === 'UNAVAILABLE' ? 'No verified data' : result.alternativeCapacityUnit}
                />

                <Metric
                  icon={Clock3}
                  label="Recovery"
                  value={`${result.recoveryDays}`}
                  unit="days"
                />

                <Metric
                  icon={GitBranch}
                  label="Capacity reduction"
                  value={`${result.input.capacityReductionPercent}`}
                  unit="%"
                />
              </div>

              {/* Affected network */}
              <div className="grid gap-4 md:grid-cols-3">
                <ImpactCard
                  icon={Ship}
                  label="Affected routes"
                  value={result.affectedRoutes.length}
                />

                <ImpactCard
                  icon={Anchor}
                  label="Affected ports"
                  value={result.affectedPorts.length}
                />

                <ImpactCard
                  icon={Factory}
                  label="Affected refineries"
                  value={result.affectedRefineries.length}
                />
              </div>

              {/* Recovery timeline */}
              <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm dark:border-slate-800 dark:bg-slate-950">
                <div className="mb-6 flex items-start justify-between gap-4">
                  <div>
                    <h2 className="text-lg font-semibold">
                      Recovery Timeline
                    </h2>
                    <p className="mt-1 text-sm text-slate-500">
                      {result.recoveryAssumption}
                    </p>
                  </div>

                  <div className="rounded-lg bg-slate-100 px-3 py-2 text-xs font-medium dark:bg-slate-900">
                    {result.recoveryDays} days
                  </div>
                </div>

                <div className="space-y-3">
                  {result.recoveryTimeline.map((point) => {
                    const width = Math.max(
                      4,
                      (point.remainingCapacityPercent /
                        timelineMax) *
                        100,
                    );

                    return (
                      <div
                        key={point.day}
                        className="grid grid-cols-[52px_1fr_92px] items-center gap-3 text-sm"
                      >
                        <span className="text-slate-500">
                          Day {point.day}
                        </span>

                        <div className="h-3 overflow-hidden rounded-full bg-slate-100 dark:bg-slate-900">
                          <div
                            className="h-full rounded-full bg-slate-800 transition-all dark:bg-slate-200"
                            style={{ width: `${width}%` }}
                          />
                        </div>

                        <span className="text-right font-medium">
                          {point.remainingCapacityPercent}%
                        </span>
                      </div>
                    );
                  })}
                </div>
              </div>

              {/* Impact chain */}
              <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm dark:border-slate-800 dark:bg-slate-950">
                <div className="mb-5">
                  <h2 className="text-lg font-semibold">
                    Impact Chain
                  </h2>
                  <p className="mt-1 text-sm text-slate-500">
                    Supply chain assets affected by the simulated disruption.
                  </p>
                </div>

                <div className="space-y-3">
                  {result.impacts.map((impact) => (
                    <div
                      key={impact.nodeId}
                      className="flex items-center justify-between gap-4 rounded-xl border border-slate-200 p-4 dark:border-slate-800"
                    >
                      <div className="min-w-0">
                        <div className="truncate font-medium">
                          {impact.nodeName}
                        </div>

                        <div className="mt-1 text-xs uppercase tracking-wide text-slate-400">
                          {impact.nodeType} ·{' '}
                          {impact.impactType}
                        </div>
                      </div>

                      <span className="shrink-0 rounded-full bg-slate-100 px-3 py-1 text-xs font-medium dark:bg-slate-900">
                        {impact.impactType}
                      </span>
                    </div>
                  ))}
                </div>
              </div>

              {/* Scenario metadata */}
              <div className="rounded-2xl border border-slate-200 bg-slate-50 p-5 text-xs text-slate-500 dark:border-slate-800 dark:bg-slate-900">
                <div className="grid gap-2 md:grid-cols-2">
                  <div>
                    <span className="font-medium">
                      Scenario:
                    </span>{' '}
                    {result.scenarioId}
                  </div>

                  <div>
                    <span className="font-medium">
                      Calculated:
                    </span>{' '}
                    {new Date(
                      result.calculatedAt,
                    ).toLocaleString()}
                  </div>
                </div>
              </div>
            </>
          )}
        </section>
      </div>
    </div>
  );
};

interface MetricProps {
  icon: React.ComponentType<{ size?: number }>;
  label: string;
  value: string;
  unit: string;
}

const Metric: React.FC<MetricProps> = ({
  icon: Icon,
  label,
  value,
  unit,
}) => (
  <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm dark:border-slate-800 dark:bg-slate-950">
    <div className="mb-4 flex items-center gap-2 text-sm text-slate-500">
      <Icon size={17} />
      {label}
    </div>

    <div className="text-2xl font-bold">
      {value}
    </div>

    <div className="mt-1 truncate text-xs text-slate-400">
      {unit}
    </div>
  </div>
);

interface ImpactCardProps {
  icon: React.ComponentType<{ size?: number }>;
  label: string;
  value: number;
}

const ImpactCard: React.FC<ImpactCardProps> = ({
  icon: Icon,
  label,
  value,
}) => (
  <div className="flex items-center gap-4 rounded-2xl border border-slate-200 bg-white p-5 shadow-sm dark:border-slate-800 dark:bg-slate-950">
    <div className="rounded-xl bg-slate-100 p-3 dark:bg-slate-900">
      <Icon size={20} />
    </div>

    <div>
      <div className="text-2xl font-bold">
        {value}
      </div>
      <div className="text-sm text-slate-500">
        {label}
      </div>
    </div>
  </div>
);
