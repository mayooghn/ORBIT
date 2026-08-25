import React, { useEffect, useMemo, useState } from 'react';
import {
  AlertTriangle,
  CheckCircle2,
  CircleHelp,
  Clock3,
  Factory,
  Loader2,
  Route,
  ShoppingCart,
  Truck,
  XCircle,
} from 'lucide-react';
import { ErrorState } from '../components/common/ErrorState';
import { LoadingState } from '../components/common/LoadingState';
import { PageHeader } from '../components/common/PageHeader';
import { StatusBadge } from '../components/common/StatusBadge';
import type {
  ProcurementAllocation,
  ProcurementConstraintValidation,
  ProcurementResult,
  ProcurementRouteAllocation,
  ProcurementSupplierAllocation,
} from '../procurement/model';
import type {
  ScenarioInput,
  ScenarioNodeListResponse,
  ScenarioResult,
  ScenarioSelectableNode,
  ScenarioSeverity,
} from '../scenarios/model';
import {
  fetchScenarioNodes,
  runScenarioProcurement,
  type ScenarioProcurementResponse,
} from '../services/api';

const DEFAULT_AFFECTED_NODE_ID = 'chokepoint-strait-of-hormuz';

type ProcurementPageStatus = 'IDLE' | 'LOADING' | 'OPTIMAL' | 'INFEASIBLE' | 'UNAVAILABLE';

const NODE_TYPE_LABELS: Record<ScenarioSelectableNode['nodeType'], string> = {
  chokepoint: 'Chokepoints',
  port: 'Ports',
  refinery: 'Refineries',
  shipping_route: 'Shipping Routes',
  strategic_reserve: 'Strategic Reserves',
  supplier: 'Suppliers',
};

const formatNumber = (value: number | null | undefined): string =>
  typeof value === 'number' && Number.isFinite(value)
    ? value.toLocaleString(undefined, { maximumFractionDigits: 2 })
    : 'Not returned';

const formatPercent = (value: number | null | undefined): string =>
  typeof value === 'number' && Number.isFinite(value)
    ? `${(value * 100).toFixed(1)}%`
    : 'Not returned';

const formatNodeType = (nodeType: ScenarioSelectableNode['nodeType']): string =>
  NODE_TYPE_LABELS[nodeType].replace(/s$/, '').toLowerCase();

const groupedNodes = (nodes: ScenarioSelectableNode[]) => {
  const groups = new Map<ScenarioSelectableNode['nodeType'], ScenarioSelectableNode[]>();
  for (const node of nodes) {
    const group = groups.get(node.nodeType) || [];
    group.push(node);
    groups.set(node.nodeType, group);
  }
  return [...groups.entries()];
};

export const ProcurementPage: React.FC = () => {
  const [scenarioNodes, setScenarioNodes] = useState<ScenarioSelectableNode[]>([]);
  const [nodesLoading, setNodesLoading] = useState(true);
  const [nodesError, setNodesError] = useState('');
  const [affectedNodeId, setAffectedNodeId] = useState(DEFAULT_AFFECTED_NODE_ID);
  const [durationDays, setDurationDays] = useState(14);
  const [severity, setSeverity] = useState<ScenarioSeverity>('HIGH');
  const [capacityReductionPercent, setCapacityReductionPercent] = useState(50);
  const [useDemoData, setUseDemoData] = useState(false);
  const [status, setStatus] = useState<ProcurementPageStatus>('IDLE');
  const [scenario, setScenario] = useState<ScenarioResult | null>(null);
  const [procurement, setProcurement] = useState<ProcurementResult | null>(null);
  const [source, setSource] = useState('');
  const [error, setError] = useState('');

  useEffect(() => {
    let cancelled = false;

    const loadNodes = async () => {
      setNodesLoading(true);
      setNodesError('');
      try {
        const data: ScenarioNodeListResponse = await fetchScenarioNodes();
        if (cancelled) return;
        setScenarioNodes(data.nodes);
        setAffectedNodeId((current) =>
          data.nodes.some((node) => node.nodeId === current)
            ? current
            : data.nodes[0]?.nodeId || DEFAULT_AFFECTED_NODE_ID,
        );
      } catch (loadError) {
        if (cancelled) return;
        setNodesError(
          loadError instanceof Error
            ? loadError.message
            : 'Unable to load scenario-capable supply chain assets.',
        );
      } finally {
        if (!cancelled) setNodesLoading(false);
      }
    };

    void loadNodes();
    return () => {
      cancelled = true;
    };
  }, []);

  const selectedNode = scenarioNodes.find((node) => node.nodeId === affectedNodeId);
  const scenarioInput = useMemo<ScenarioInput>(() => ({
    eventId: `${affectedNodeId}-${durationDays}-day-procurement`,
    durationDays,
    severity,
    affectedNodeId,
    capacityReductionPercent,
  }), [affectedNodeId, capacityReductionPercent, durationDays, severity]);

  const generatePlan = async () => {
    setStatus('LOADING');
    setError('');

    try {
      const response: ScenarioProcurementResponse = await runScenarioProcurement(
        scenarioInput,
        useDemoData,
      );

      if (response.status === 'ERROR') {
        throw new Error(response.error || 'Procurement optimization failed.');
      }

      setScenario(response.scenario || null);
      setProcurement(response.procurement || null);
      setSource(response.source || '');
      setStatus(response.status);
    } catch (requestError) {
      setScenario(null);
      setProcurement(null);
      setSource('');
      setStatus('IDLE');
      setError(
        requestError instanceof Error
          ? requestError.message
          : 'Unable to generate a procurement plan.',
      );
    }
  };

  const isBusy = status === 'LOADING';

  return (
    <div className="space-y-6">
      <PageHeader
        title="Adaptive Procurement Orchestrator"
        subtitle="Find the most feasible replacement supply across suppliers and routes."
        badgeText={useDemoData ? 'DEMO MODE' : 'LIVE DATA'}
        badgeLevel={useDemoData ? 'AVAILABLE' : 'UNKNOWN'}
      />

      <div className="grid gap-6 lg:grid-cols-[360px_1fr]">
        <section className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm dark:border-slate-800 dark:bg-slate-950">
          <div className="mb-6 flex items-start gap-3">
            <div className="rounded-xl bg-slate-100 p-2 dark:bg-slate-900">
              <ShoppingCart size={20} />
            </div>
            <div>
              <h2 className="text-lg font-semibold">Scenario supply gap</h2>
              <p className="mt-1 text-sm text-slate-500">
                Select the disruption to calculate replacement supply.
              </p>
            </div>
          </div>

          <div className="space-y-5">
            <div>
              <label htmlFor="procurement-affected-node" className="mb-2 block text-sm font-medium">
                Current disruption
              </label>
              <select
                id="procurement-affected-node"
                value={affectedNodeId}
                onChange={(event) => setAffectedNodeId(event.target.value)}
                disabled={nodesLoading || Boolean(nodesError) || scenarioNodes.length === 0}
                className="w-full rounded-xl border border-slate-200 bg-white px-4 py-3 text-sm outline-none dark:border-slate-800 dark:bg-slate-950 disabled:cursor-not-allowed disabled:opacity-60"
              >
                {groupedNodes(scenarioNodes).map(([nodeType, nodes]) => (
                  <optgroup key={nodeType} label={NODE_TYPE_LABELS[nodeType]}>
                    {nodes.map((node) => (
                      <option key={node.nodeId} value={node.nodeId}>
                        {node.name} · {formatNodeType(node.nodeType)}
                      </option>
                    ))}
                  </optgroup>
                ))}
              </select>
              {nodesLoading && (
                <p className="mt-2 text-xs text-slate-500">Loading scenario assets...</p>
              )}
              {nodesError && (
                <p role="alert" className="mt-2 text-xs text-red-600 dark:text-red-300">
                  {nodesError}
                </p>
              )}
              {!nodesLoading && !nodesError && scenarioNodes.length === 0 && (
                <p className="mt-2 text-xs text-slate-500">No supported scenario assets are available.</p>
              )}
              {selectedNode && (
                <p className="mt-2 text-xs text-slate-500">
                  {selectedNode.name} · {selectedNode.operationalState}
                </p>
              )}
            </div>

            <div>
              <label htmlFor="procurement-duration" className="mb-2 block text-sm font-medium">
                Disruption duration
              </label>
              <div className="flex items-center gap-3">
                <input
                  id="procurement-duration"
                  type="range"
                  min="1"
                  max="60"
                  value={durationDays}
                  onChange={(event) => setDurationDays(Number(event.target.value))}
                  className="w-full"
                />
                <span className="w-20 rounded-xl border border-slate-200 px-3 py-2 text-center text-sm font-semibold dark:border-slate-800">
                  {durationDays}d
                </span>
              </div>
            </div>

            <div>
              <label htmlFor="procurement-severity" className="mb-2 block text-sm font-medium">
                Severity
              </label>
              <select
                id="procurement-severity"
                value={severity}
                onChange={(event) => setSeverity(event.target.value as ScenarioSeverity)}
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
                <label htmlFor="procurement-reduction" className="text-sm font-medium">
                  Capacity reduction
                </label>
                <span className="text-sm font-semibold">{capacityReductionPercent}%</span>
              </div>
              <input
                id="procurement-reduction"
                type="range"
                min="0"
                max="100"
                value={capacityReductionPercent}
                onChange={(event) => setCapacityReductionPercent(Number(event.target.value))}
                className="w-full"
              />
            </div>

            <label className="flex items-start gap-3 rounded-xl border border-sky-200 bg-sky-50 p-3 text-xs text-sky-800 dark:border-sky-900/60 dark:bg-sky-950/20 dark:text-sky-200">
              <input
                type="checkbox"
                checked={useDemoData}
                onChange={(event) => setUseDemoData(event.target.checked)}
                className="mt-0.5 accent-sky-600"
              />
              <span>
                <span className="block font-semibold">Demo procurement data</span>
                <span className="mt-1 block text-sky-700/80 dark:text-sky-300/80">
                  Deterministic fixture inputs for the hackathon demo; not live ORBIT data.
                </span>
              </span>
            </label>

            <button
              type="button"
              onClick={generatePlan}
              disabled={isBusy || nodesLoading || Boolean(nodesError) || scenarioNodes.length === 0}
              className="flex w-full items-center justify-center gap-2 rounded-xl bg-slate-950 px-4 py-3 text-sm font-semibold text-white transition hover:opacity-90 disabled:cursor-not-allowed disabled:opacity-50 dark:bg-white dark:text-slate-950"
            >
              {isBusy ? <Loader2 size={18} className="animate-spin" /> : <Truck size={18} />}
              {isBusy ? 'Generating plan...' : 'Generate Procurement Plan'}
            </button>

            {error && (
              <ErrorState
                title="Procurement request failed"
                message={error}
                onRetry={generatePlan}
                className="p-5"
              />
            )}
          </div>
        </section>

        <section className="space-y-6">
          {isBusy && (
            <LoadingState
              message="Optimizing replacement supply..."
              subtext="Running the deterministic GLPK procurement model and validating constraints."
              className="min-h-[420px]"
            />
          )}

          {!isBusy && !scenario && !error && (
            <div className="flex min-h-[420px] items-center justify-center rounded-2xl border border-dashed border-slate-300 bg-white dark:border-slate-700 dark:bg-slate-950">
              <div className="max-w-md px-6 text-center">
                <ShoppingCart size={42} className="mx-auto mb-4 opacity-40" />
                <h2 className="text-lg font-semibold">No procurement plan yet</h2>
                <p className="mt-2 text-sm text-slate-500">
                  ORBIT will calculate the scenario supply gap and find the most feasible replacement plan.
                </p>
              </div>
            </div>
          )}

          {!isBusy && scenario && (
            <>
              <SupplyGapSummary scenario={scenario} selectedNode={selectedNode} />

              {status === 'UNAVAILABLE' && (
                <div className="rounded-2xl border border-slate-200 bg-slate-50 p-6 dark:border-slate-800 dark:bg-slate-900/60">
                  <div className="flex items-start gap-3">
                    <CircleHelp className="mt-0.5 shrink-0 text-slate-500" size={20} />
                    <div>
                      <div className="flex flex-wrap items-center gap-3">
                        <h2 className="text-lg font-semibold">Procurement plan unavailable</h2>
                        <StatusBadge level="UNKNOWN" label="DATA UNAVAILABLE" size="sm" />
                      </div>
                      <p className="mt-2 text-sm text-slate-600 dark:text-slate-300">
                        Verified procurement data is not available for this scenario.
                      </p>
                      {source && <p className="mt-2 text-xs text-slate-500">Source: {source}</p>}
                    </div>
                  </div>
                </div>
              )}

              {status === 'INFEASIBLE' && procurement && (
                <InfeasibleResult result={procurement} scenario={scenario} source={source} />
              )}

              {status === 'OPTIMAL' && procurement && (
                <OptimalResult result={procurement} scenario={scenario} source={source} />
              )}
            </>
          )}
        </section>
      </div>
    </div>
  );
};

const SupplyGapSummary: React.FC<{
  scenario: ScenarioResult;
  selectedNode?: ScenarioSelectableNode;
}> = ({ scenario, selectedNode }) => (
  <section className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm dark:border-slate-800 dark:bg-slate-950">
    <div className="mb-5 flex items-start gap-3">
      <div className="rounded-xl bg-slate-100 p-2 dark:bg-slate-900">
        <AlertTriangle size={20} />
      </div>
      <div>
        <h2 className="text-lg font-semibold">Supply Gap</h2>
        <p className="mt-1 text-sm text-slate-500">
          ORBIT detected a replacement-supply requirement from the current disruption scenario.
        </p>
      </div>
    </div>

    <div className="grid gap-4 sm:grid-cols-3">
      <SummaryMetric
        label="Current disruption"
        value={selectedNode?.name || scenario.input.affectedNodeId}
        detail={`${scenario.input.durationDays} days · ${scenario.input.severity}`}
      />
      <SummaryMetric
        label="Required replacement"
        value={formatNumber(scenario.shortage)}
        detail={scenario.shortageUnit}
      />
      <SummaryMetric
        label="Capacity reduction"
        value={`${scenario.input.capacityReductionPercent}%`}
        detail={`Gross loss: ${formatNumber(scenario.supplyLoss)} ${scenario.supplyLossUnit}`}
      />
    </div>
  </section>
);

const OptimalResult: React.FC<{
  result: ProcurementResult;
  scenario: ScenarioResult;
  source: string;
}> = ({ result, scenario, source }) => (
  <div className="space-y-6">
    <section className="rounded-2xl border border-emerald-200 bg-emerald-50/60 p-6 dark:border-emerald-900/60 dark:bg-emerald-950/20">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h2 className="text-xl font-semibold">Procurement Plan</h2>
          <p className="mt-1 text-sm text-slate-600 dark:text-slate-300">
            The optimizer found a validated replacement allocation for the scenario gap.
          </p>
        </div>
        <StatusBadge level="AVAILABLE" label="OPTIMAL" size="sm" />
      </div>

      <ResultMetrics result={result} requiredQuantity={scenario.shortage} />
      {source && <p className="mt-4 text-xs text-slate-500">Source: {source}</p>}
    </section>

    <AllocationTables result={result} />
    <ConstraintValidation validation={result.constraintValidation} />
  </div>
);

const InfeasibleResult: React.FC<{
  result: ProcurementResult;
  scenario: ScenarioResult;
  source: string;
}> = ({ result, scenario, source }) => (
  <div className="space-y-6">
    <section className="rounded-2xl border border-amber-200 bg-amber-50/70 p-6 dark:border-amber-900/60 dark:bg-amber-950/20">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h2 className="text-xl font-semibold">Procurement Plan</h2>
          <p className="mt-1 text-sm text-slate-600 dark:text-slate-300">
            Available verified capacity cannot satisfy the full scenario gap.
          </p>
        </div>
        <StatusBadge level="CONSTRAINED" label="INFEASIBLE" size="sm" />
      </div>

      <div className="mt-6 grid gap-4 sm:grid-cols-3">
        <SummaryMetric label="Required quantity" value={formatNumber(scenario.shortage)} detail={scenario.shortageUnit} />
        <SummaryMetric label="Maximum feasible" value={formatNumber(result.totalProcured)} detail={result.totalProcuredUnit} />
        <SummaryMetric label="Unmet quantity" value={formatNumber(result.unmetSupply)} detail={result.unmetSupplyUnit} />
      </div>

      {source && <p className="mt-4 text-xs text-slate-500">Source: {source}</p>}
    </section>

    <AllocationTables result={result} />
    <ConstraintValidation validation={result.constraintValidation} />
  </div>
);

const ResultMetrics: React.FC<{
  result: ProcurementResult;
  requiredQuantity: number;
}> = ({ result, requiredQuantity }) => (
  <div className="mt-6 grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
    <ResultMetric icon={ShoppingCart} label="Required quantity" value={formatNumber(requiredQuantity)} unit={result.totalProcuredUnit} />
    <ResultMetric icon={CheckCircle2} label="Total procured" value={formatNumber(result.totalProcured)} unit={result.totalProcuredUnit} />
    <ResultMetric icon={AlertTriangle} label="Unmet supply" value={formatNumber(result.unmetSupply)} unit={result.unmetSupplyUnit} />
    <ResultMetric icon={Factory} label="Total cost" value={formatNumber(result.totalCost)} unit={result.totalCostUnit} />
    <ResultMetric icon={Route} label="Objective value" value={formatNumber(result.objectiveValue)} unit="weighted objective" />
    <ResultMetric icon={CheckCircle2} label="Solver status" value={result.solverStatus} unit="GLPK" />
    <ResultMetric icon={Clock3} label="Solve time" value={formatNumber(result.solveTimeMs)} unit="ms" />
  </div>
);

const AllocationTables: React.FC<{ result: ProcurementResult }> = ({ result }) => (
  <>
    <AllocationSection title="Supplier allocations" icon={Truck}>
      <div className="overflow-x-auto">
        <table className="min-w-full text-left text-sm">
          <thead><tr className="border-b border-slate-200 text-xs uppercase tracking-wide text-slate-400 dark:border-slate-800">
            <th className="px-3 py-3">Supplier</th><th className="px-3 py-3">Quantity</th><th className="px-3 py-3">Cost</th><th className="px-3 py-3">Risk</th><th className="px-3 py-3">Reliability</th>
          </tr></thead>
          <tbody>{result.supplierAllocations.map((allocation) => <SupplierRow key={allocation.supplierId} allocation={allocation} />)}</tbody>
        </table>
      </div>
    </AllocationSection>

    <AllocationSection title="Route allocations" icon={Route}>
      <div className="overflow-x-auto">
        <table className="min-w-full text-left text-sm">
          <thead><tr className="border-b border-slate-200 text-xs uppercase tracking-wide text-slate-400 dark:border-slate-800">
            <th className="px-3 py-3">Route</th><th className="px-3 py-3">Quantity</th><th className="px-3 py-3">Capacity</th><th className="px-3 py-3">Transit time</th>
          </tr></thead>
          <tbody>{result.routeAllocations.map((allocation) => <RouteRow key={allocation.routeId} allocation={allocation} />)}</tbody>
        </table>
      </div>
    </AllocationSection>

    {result.allocations.length > 0 && (
      <AllocationSection title="Lane allocations" icon={Truck}>
        <div className="overflow-x-auto">
          <table className="min-w-full text-left text-sm">
            <thead><tr className="border-b border-slate-200 text-xs uppercase tracking-wide text-slate-400 dark:border-slate-800">
              <th className="px-3 py-3">Supplier → Route</th><th className="px-3 py-3">Quantity</th><th className="px-3 py-3">Cost</th><th className="px-3 py-3">Transit</th><th className="px-3 py-3">Risk</th><th className="px-3 py-3">Reliability</th>
            </tr></thead>
            <tbody>{result.allocations.map((allocation) => <LaneRow key={allocation.laneId} allocation={allocation} />)}</tbody>
          </table>
        </div>
      </AllocationSection>
    )}
  </>
);

const SupplierRow: React.FC<{ allocation: ProcurementSupplierAllocation }> = ({ allocation }) => (
  <tr className="border-b border-slate-100 last:border-0 dark:border-slate-900">
    <td className="px-3 py-3 font-medium">{allocation.supplierName}</td>
    <td className="px-3 py-3 font-mono">{formatNumber(allocation.quantity)} {allocation.unit}</td>
    <td className="px-3 py-3 font-mono">{formatNumber(allocation.totalCost)} <span className="text-xs text-slate-400">{allocation.totalCostUnit}</span></td>
    <td className="px-3 py-3">{allocation.riskScore === null ? 'Not returned' : allocation.riskScore.toFixed(1)}</td>
    <td className="px-3 py-3">{formatPercent(allocation.reliabilityScore)}</td>
  </tr>
);

const RouteRow: React.FC<{ allocation: ProcurementRouteAllocation }> = ({ allocation }) => (
  <tr className="border-b border-slate-100 last:border-0 dark:border-slate-900">
    <td className="px-3 py-3 font-medium">{allocation.routeName}</td>
    <td className="px-3 py-3 font-mono">{formatNumber(allocation.quantity)} {allocation.unit}</td>
    <td className="px-3 py-3 font-mono">{formatNumber(allocation.capacity)} {allocation.unit}</td>
    <td className="px-3 py-3">{allocation.transitTimeDays === null ? 'Not returned' : `${allocation.transitTimeDays.toFixed(1)} days`}</td>
  </tr>
);

const LaneRow: React.FC<{ allocation: ProcurementAllocation }> = ({ allocation }) => (
  <tr className="border-b border-slate-100 last:border-0 dark:border-slate-900">
    <td className="px-3 py-3 font-mono text-xs">{allocation.supplierId} → {allocation.routeId}</td>
    <td className="px-3 py-3 font-mono">{formatNumber(allocation.quantity)} {allocation.quantityUnit}</td>
    <td className="px-3 py-3 font-mono">{formatNumber(allocation.procurementCost)} <span className="text-xs text-slate-400">{allocation.procurementCostUnit}</span></td>
    <td className="px-3 py-3">{allocation.transitTimeDays === undefined ? 'Not returned' : `${allocation.transitTimeDays} days`}</td>
    <td className="px-3 py-3">{allocation.riskScore === undefined ? 'Not returned' : allocation.riskScore.toFixed(1)}</td>
    <td className="px-3 py-3">{formatPercent(allocation.reliabilityScore)}</td>
  </tr>
);

const AllocationSection: React.FC<{
  title: string;
  icon: React.ComponentType<{ size?: number }>;
  children: React.ReactNode;
}> = ({ title, icon: Icon, children }) => (
  <section className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm dark:border-slate-800 dark:bg-slate-950">
    <div className="mb-4 flex items-center gap-2">
      <Icon size={18} />
      <h2 className="text-lg font-semibold">{title}</h2>
    </div>
    {children}
  </section>
);

const ConstraintValidation: React.FC<{ validation: ProcurementConstraintValidation }> = ({ validation }) => {
  const checks = [
    { label: 'Supply requirement', matches: validation.checks.filter((check) => check.constraint === 'supply_gap') },
    { label: 'Supplier capacity', matches: validation.checks.filter((check) => check.constraint.startsWith('supplier_capacity_')) },
    { label: 'Route capacity', matches: validation.checks.filter((check) => check.constraint.startsWith('route_capacity_')) },
    { label: 'Compatibility', matches: validation.checks.filter((check) => check.constraint.startsWith('allocation_compatibility_')) },
  ];

  return (
    <section className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm dark:border-slate-800 dark:bg-slate-950">
      <div className="mb-4 flex items-center gap-2">
        <CheckCircle2 size={18} />
        <h2 className="text-lg font-semibold">Constraint validation</h2>
      </div>
      <div className="grid gap-3 sm:grid-cols-2">
        {checks.map(({ label, matches }) => {
          const passed = matches.length > 0 && matches.every((check) => check.passed);
          return (
            <div key={label} className="flex items-center justify-between rounded-xl border border-slate-200 px-4 py-3 dark:border-slate-800">
              <span className="text-sm">{label}</span>
              {matches.length === 0 ? <CircleHelp size={17} className="text-slate-400" /> : passed ? <CheckCircle2 size={17} className="text-emerald-500" /> : <XCircle size={17} className="text-red-500" />}
            </div>
          );
        })}
      </div>
      {!validation.valid && validation.checks.some((check) => !check.passed) && (
        <div className="mt-4 space-y-2 rounded-xl border border-amber-200 bg-amber-50 p-4 text-xs text-amber-800 dark:border-amber-900/60 dark:bg-amber-950/20 dark:text-amber-200">
          {validation.checks.filter((check) => !check.passed).map((check) => <p key={check.constraint}>{check.message}</p>)}
        </div>
      )}
    </section>
  );
};

const SummaryMetric: React.FC<{ label: string; value: string; detail: string }> = ({ label, value, detail }) => (
  <div className="rounded-xl border border-slate-200 bg-slate-50 p-4 dark:border-slate-800 dark:bg-slate-900/60">
    <div className="text-xs uppercase tracking-wide text-slate-400">{label}</div>
    <div className="mt-2 break-words text-lg font-semibold">{value}</div>
    <div className="mt-1 break-words text-xs text-slate-500">{detail}</div>
  </div>
);

const ResultMetric: React.FC<{
  icon: React.ComponentType<{ size?: number }>;
  label: string;
  value: string;
  unit: string;
}> = ({ icon: Icon, label, value, unit }) => (
  <div className="rounded-xl border border-emerald-200/70 bg-white/70 p-4 dark:border-emerald-900/50 dark:bg-slate-950/40">
    <div className="flex items-center gap-2 text-xs uppercase tracking-wide text-slate-500">
      <Icon size={15} />
      {label}
    </div>
    <div className="mt-2 break-words text-xl font-bold">{value}</div>
    <div className="mt-1 break-words text-xs text-slate-400">{unit}</div>
  </div>
);
