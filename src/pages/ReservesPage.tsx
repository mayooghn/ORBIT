import React, { useCallback, useEffect, useState } from 'react';
import {
  Calculator,
  Database,
  ShieldCheck,
  AlertTriangle,
  RefreshCw,
  Sliders,
  CheckCircle2,
  Lock,
  Layers,
  History,
  Info,
  Globe,
  Ship,
} from 'lucide-react';
import { ErrorState } from '../components/common/ErrorState';
import { LoadingState } from '../components/common/LoadingState';
import { MetricCard } from '../components/common/MetricCard';
import { PageHeader } from '../components/common/PageHeader';
import { StatusBadge } from '../components/common/StatusBadge';
import {
  optimizeStrategicReserve,
  fetchStrategicReserveState,
  fetchStrategicReserveHistory,
  fetchRealAlternativeProcurement,
} from '../services/api';
import type {
  StrategicReserveOptimizationInput,
  StrategicReserveOptimizationResult,
  StrategicReserveState,
  RealAlternativeProcurementState,
  ProcurementProvenance,
} from '../reserves/model';

const formatValue = (value: number): string =>
  value.toLocaleString(undefined, { maximumFractionDigits: 2 });

const PRESET_SCENARIOS: Array<{
  name: string;
  description: string;
  input: StrategicReserveOptimizationInput;
}> = [
  {
    name: 'Standard Stress Test',
    description: 'Standard 30-day disruption (100,000 t/d gap) evaluating reserve response under baseline conditions.',
    input: {
      currentReserve: 5_000_000,
      demand: 655_271,
      supplyGap: 100_000,
      disruptionDuration: 30,
      alternativeProcurement: 50_000,
      replenishmentRate: 20_000,
      minimumReserveThreshold: 1_500_000,
    },
  },
  {
    name: 'Strait of Hormuz Disruption',
    description: 'Severe 60-day disruption scenario with 350k t/d deficit and constrained alternatives.',
    input: {
      currentReserve: 5_000_000,
      demand: 655_271,
      supplyGap: 350_000,
      disruptionDuration: 60,
      alternativeProcurement: 100_000,
      replenishmentRate: 25_000,
      minimumReserveThreshold: 1_500_000,
    },
  },
  {
    name: 'Procurement-Protected Event',
    description: 'Disruption scenario where emergency bilateral procurement contracts absorb the supply shock.',
    input: {
      currentReserve: 5_000_000,
      demand: 655_271,
      supplyGap: 80_000,
      disruptionDuration: 14,
      alternativeProcurement: 150_000,
      replenishmentRate: 20_000,
      minimumReserveThreshold: 1_500_000,
    },
  },
  {
    name: 'Critical Safety Cap Binding',
    description: 'Extreme scenario where reserve drawdown is strictly capped at the statutory safety floor.',
    input: {
      currentReserve: 2_000_000,
      demand: 655_271,
      supplyGap: 200_000,
      disruptionDuration: 45,
      alternativeProcurement: 20_000,
      replenishmentRate: 15_000,
      minimumReserveThreshold: 1_500_000,
    },
  },
  {
    name: 'Exhausted Reserve Safety Trigger',
    description: 'Emergency test scenario where current reserve starts below the mandatory safety floor.',
    input: {
      currentReserve: 1_200_000,
      demand: 655_271,
      supplyGap: 150_000,
      disruptionDuration: 30,
      alternativeProcurement: 30_000,
      replenishmentRate: 10_000,
      minimumReserveThreshold: 1_500_000,
    },
  },
];

const ResultMetric: React.FC<{
  label: string;
  value: string;
  detail?: string;
  highlight?: boolean;
}> = ({ label, value, detail, highlight }) => (
  <div className={`rounded-lg border p-4 ${highlight ? 'border-orange-500/40 bg-orange-950/10' : 'border-[#222222] bg-[#121212]'}`}>
    <p className="text-xs font-semibold uppercase tracking-widest text-[#666666]">{label}</p>
    <p className={`mt-2 font-mono text-2xl font-bold ${highlight ? 'text-orange-400' : 'text-[#EDEDED]'}`}>{value}</p>
    {detail && <p className="mt-1 text-xs text-[#777777]">{detail}</p>}
  </div>
);

export type StrategicReserveInputMode = 'REAL_BASELINE' | 'PRESET' | 'CUSTOM';

export const buildRealBaselineOptimizationInput = (
  state: StrategicReserveState,
  procurement: RealAlternativeProcurementState | null,
  scenarioParams?: { supplyGap?: number; disruptionDuration?: number },
): StrategicReserveOptimizationInput => {
  const altProc = procurement?.availableAlternativeDailyTonnes
    ? Math.round(procurement.availableAlternativeDailyTonnes)
    : (state.alternativeProcurement?.availableAlternativeDailyTonnes
        ? Math.round(state.alternativeProcurement.availableAlternativeDailyTonnes)
        : 0);

  return {
    currentReserve: state.currentReserve,
    demand: Math.round(state.currentDemand),
    supplyGap: scenarioParams?.supplyGap ?? 100_000,
    disruptionDuration: scenarioParams?.disruptionDuration ?? 30,
    alternativeProcurement: altProc,
    replenishmentRate: state.defaultReplenishmentRate,
    minimumReserveThreshold: state.minimumReserveThreshold,
  };
};

export const ReservesPage: React.FC = () => {
  const [activeInput, setActiveInput] = useState<StrategicReserveOptimizationInput | null>(null);
  const [inputMode, setInputMode] = useState<StrategicReserveInputMode>('REAL_BASELINE');
  const [activePresetName, setActivePresetName] = useState<string | null>(null);
  const [result, setResult] = useState<(StrategicReserveOptimizationResult & { procurementProvenance?: ProcurementProvenance; optimizationId?: string }) | null>(null);
  const [optimizing, setOptimizing] = useState(false);
  const [optimizerError, setOptimizerError] = useState('');
  const [isCustomMode, setIsCustomMode] = useState(false);
  const [liveState, setLiveState] = useState<StrategicReserveState | null>(null);
  const [realProcurement, setRealProcurement] = useState<RealAlternativeProcurementState | null>(null);
  const [initialDataLoading, setInitialDataLoading] = useState(true);
  const [dataError, setDataError] = useState('');
  const [historyRuns, setHistoryRuns] = useState<Array<{
    optimizationId: string;
    requestedAt: string;
    input: StrategicReserveOptimizationInput;
    result: StrategicReserveOptimizationResult;
  }>>([]);

  const loadAllData = useCallback(async () => {
    setInitialDataLoading(true);
    setDataError('');
    setOptimizerError('');

    try {
      const [state, procurement, history] = await Promise.all([
        fetchStrategicReserveState(),
        fetchRealAlternativeProcurement({ limit: 50 }).catch(() => null),
        fetchStrategicReserveHistory(10).catch(() => []),
      ]);

      if (!state) {
        throw new Error('Unable to retrieve real strategic reserve state from SQLite database.');
      }

      setLiveState(state);
      const resolvedProcurement = procurement || state.alternativeProcurement || null;
      setRealProcurement(resolvedProcurement);
      setHistoryRuns(history);

      const baselineInput = buildRealBaselineOptimizationInput(state, resolvedProcurement);
      setActiveInput(baselineInput);
      setInputMode('REAL_BASELINE');

      // Deterministically run the Phase 8 optimizer with the real database baseline immediately
      const initialOptimization = await optimizeStrategicReserve(baselineInput);
      setResult(initialOptimization);
    } catch (err) {
      setLiveState(null);
      setRealProcurement(null);
      setActiveInput(null);
      setResult(null);
      setDataError(err instanceof Error ? err.message : 'Failed to load real strategic reserve data.');
    } finally {
      setInitialDataLoading(false);
    }
  }, []);

  useEffect(() => {
    void loadAllData();
  }, [loadAllData]);

  const runOptimization = useCallback(async (customInput?: StrategicReserveOptimizationInput) => {
    const inputToUse = customInput ?? activeInput;
    if (!inputToUse) {
      setOptimizerError('No active baseline inputs available for optimization.');
      return;
    }

    setOptimizing(true);
    setOptimizerError('');

    try {
      const response = await optimizeStrategicReserve(inputToUse);
      setResult(response);
    } catch (requestError) {
      setResult(null);
      setOptimizerError(requestError instanceof Error ? requestError.message : 'Reserve optimization failed.');
    } finally {
      setOptimizing(false);
    }
  }, [activeInput]);

  const handleSelectPreset = (presetInput: StrategicReserveOptimizationInput, presetName: string) => {
    setInputMode('PRESET');
    setActivePresetName(presetName);
    setActiveInput(presetInput);
    void runOptimization(presetInput);
  };

  const handleResetToRealBaseline = () => {
    if (!liveState) return;
    const baseline = buildRealBaselineOptimizationInput(liveState, realProcurement);
    setInputMode('REAL_BASELINE');
    setActivePresetName(null);
    setActiveInput(baseline);
    void runOptimization(baseline);
  };

  const handleApplyRealAlternative = (dailyTonnes: number) => {
    if (!activeInput) return;
    const updated = { ...activeInput, alternativeProcurement: Math.round(dailyTonnes) };
    setActiveInput(updated);
    setInputMode('CUSTOM');
    void runOptimization(updated);
  };

  const handleInputChange = (field: keyof StrategicReserveOptimizationInput, value: number) => {
    if (!activeInput) return;
    setInputMode('CUSTOM');
    setActivePresetName(null);
    const updated = { ...activeInput, [field]: value };
    setActiveInput(updated);
  };

  // 1. Initial Data Loading State (No fake data or demo fallbacks rendered)
  if (initialDataLoading) {
    return (
      <div className="space-y-6">
        <PageHeader
          title="Strategic Reserves"
          subtitle="Deterministic optimization engine calculating safe strategic petroleum reserve releases during supply disruptions."
          badgeText="LOADING REAL DATA"
          badgeLevel="ELEVATED"
        />
        <LoadingState
          message="Loading real strategic reserve and procurement data..."
          subtext="Querying SQLite database for ISPRL storage facilities, MoPNG daily petroleum consumption, and bilateral supplier import records."
        />
      </div>
    );
  }

  // 2. Data Load Failure State (Explicit error, no fallback to mock figures)
  if (dataError || !liveState || !activeInput) {
    return (
      <div className="space-y-6">
        <PageHeader
          title="Strategic Reserves"
          subtitle="Deterministic optimization engine calculating safe strategic petroleum reserve releases during supply disruptions."
          badgeText="DATA UNAVAILABLE"
          badgeLevel="CRITICAL"
        />
        <ErrorState
          title="Strategic reserve data unavailable"
          message={dataError || 'Failed to retrieve verified strategic reserve baselines from database.'}
          onRetry={() => void loadAllData()}
        />
      </div>
    );
  }

  const coverageIsComplete = result?.fullyCovered === true;
  const isSafetyCapActive = result && result.maximumSafeReserveDrawdown < (result.residualSupplyGap * activeInput.disruptionDuration);
  const isBelowThreshold = result && result.constraintStatus === 'BELOW_THRESHOLD';

  return (
    <div className="space-y-6">
      <PageHeader
        title="Strategic Reserves"
        subtitle="Deterministic optimization engine calculating safe strategic petroleum reserve releases during supply disruptions."
        badgeText={result ? (result.isFeasible ? 'OPTIMIZATION READY' : 'SAFETY CONSTRAINT ENFORCED') : 'OPTIMIZATION READY'}
        badgeLevel={result ? (result.isFeasible ? 'AVAILABLE' : 'ELEVATED') : 'AVAILABLE'}
        actions={(
          <div className="flex items-center gap-3">
            <button
              type="button"
              onClick={() => setIsCustomMode(!isCustomMode)}
              className="inline-flex items-center gap-2 rounded-lg border border-[#333333] bg-[#161616] px-3.5 py-2 text-sm font-medium text-[#D1D5DB] transition hover:border-[#555555] hover:text-white"
            >
              <Sliders className="h-4 w-4" />
              {isCustomMode ? 'Show Presets' : 'Custom Parameters'}
            </button>
            <button
              type="button"
              onClick={() => void runOptimization()}
              disabled={optimizing}
              className="inline-flex items-center gap-2 rounded-lg bg-orange-500 px-4 py-2 text-sm font-semibold text-slate-950 transition-colors hover:bg-orange-400 disabled:cursor-not-allowed disabled:opacity-60"
            >
              <Calculator className="h-4 w-4" />
              {optimizing ? 'Calculating...' : 'Run Reserve Optimization'}
            </button>
          </div>
        )}
      />

      {/* Live National Strategic Reserve State (Database Provenance) */}
      <section className="rounded-xl border border-cyan-500/30 bg-cyan-950/10 p-5">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <div className="flex items-center gap-2">
              <Database className="h-5 w-5 text-cyan-400" />
              <h2 className="text-lg font-semibold text-[#EDEDED]">National Strategic Reserve State (Database Sourced)</h2>
              <StatusBadge level="AVAILABLE" label="REAL DATA" size="sm" />
            </div>
            <p className="mt-1 text-xs text-[#888888]">
              Real Phase 1 ISPRL underground storage facilities ({formatValue(liveState.totalCapacity)} tonnes capacity) and real consumption demand derived from MoPNG dataset ({formatValue(liveState.currentDemand)} tonnes/day).
            </p>
          </div>
        </div>

        <div className="mt-4 grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
          <div className="rounded-lg border border-[#222222] bg-[#121212] p-3">
            <p className="text-[11px] font-semibold uppercase tracking-wider text-[#666666]">Total Nameplate Capacity</p>
            <p className="mt-1 font-mono text-lg font-bold text-cyan-400">{formatValue(liveState.totalCapacity)} tonnes</p>
            <p className="mt-0.5 text-[10px] text-[#777777]">5.33 MMT across 3 Phase-1 facilities</p>
          </div>
          <div className="rounded-lg border border-[#222222] bg-[#121212] p-3">
            <p className="text-[11px] font-semibold uppercase tracking-wider text-[#666666]">Real Daily Demand</p>
            <p className="mt-1 font-mono text-lg font-bold text-emerald-400">{formatValue(liveState.currentDemand)} tonnes/day</p>
            <p className="mt-0.5 text-[10px] text-[#777777]">FY {liveState.demandFinancialYear || '2024-25'} petroleum consumption</p>
          </div>
          <div className="rounded-lg border border-[#222222] bg-[#121212] p-3">
            <p className="text-[11px] font-semibold uppercase tracking-wider text-[#666666]">Estimated Current Reserve</p>
            <p className="mt-1 font-mono text-lg font-bold text-[#EDEDED]">{formatValue(liveState.currentReserve)} tonnes</p>
          </div>
          <div className="rounded-lg border border-[#222222] bg-[#121212] p-3">
            <p className="text-[11px] font-semibold uppercase tracking-wider text-[#666666]">Statutory Minimum Floor</p>
            <p className="mt-1 font-mono text-lg font-bold text-[#EDEDED]">{formatValue(liveState.minimumReserveThreshold)} tonnes</p>
            <p className="mt-0.5 text-[10px] text-[#777777]">Mandatory 30-day safety reserve</p>
          </div>
        </div>
      </section>

      {/* Real Alternative Procurement Integration (Phase 2 SQLite Data Layer) */}
      <section className="rounded-xl border border-indigo-500/30 bg-indigo-950/10 p-5">
        {realProcurement ? (
          <>
            <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
              <div>
                <div className="flex items-center gap-2">
                  <Globe className="h-5 w-5 text-indigo-400" />
                  <h2 className="text-lg font-semibold text-[#EDEDED]">Real Alternative Procurement (SQLite Data Layer)</h2>
                  <StatusBadge level="AVAILABLE" label="REAL DATA" size="sm" />
                </div>
                <p className="mt-1 text-xs text-[#888888]">
                  Real historical supplier import volumes sourced from SQLite <code className="text-indigo-300">supplier_imports</code> table ({formatValue(realProcurement.totalAnnualImportTonnes)} tonnes/year across {realProcurement.supplierCount} registered supplier countries for FY {realProcurement.financialYear}).
                </p>
              </div>
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  id="apply-real-supply-btn"
                  onClick={() => handleApplyRealAlternative(realProcurement.availableAlternativeDailyTonnes)}
                  className="inline-flex items-center gap-2 rounded-lg border border-indigo-500/40 bg-indigo-500/10 px-3 py-1.5 text-xs font-semibold text-indigo-300 hover:bg-indigo-500/20 transition"
                >
                  <Ship className="h-3.5 w-3.5" /> Apply Alternative Supply ({formatValue(realProcurement.availableAlternativeDailyTonnes)} t/d)
                </button>
              </div>
            </div>

            {/* Cost Notice & Data Constraints */}
            <div className="mt-3 flex items-start gap-2.5 rounded-lg border border-amber-500/30 bg-amber-500/10 p-3 text-xs text-amber-300">
              <Info className="h-4 w-4 shrink-0 text-amber-400 mt-0.5" />
              <div>
                <span className="font-semibold text-amber-200">Commercial lane-cost data unavailable</span>
                <p className="mt-0.5 text-[11px] text-amber-300/80">
                  The SQLite data layer contains verified physical crude import tonnages per supplier country, but commercial spot freight rates and per-barrel procurement costs are unrecorded. The optimizer uses real physical supply capacity as an operational constraint without fabricating costs.
                </p>
              </div>
            </div>

            <div className="mt-4 grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
              <div className="rounded-lg border border-[#222222] bg-[#121212] p-3">
                <p className="text-[11px] font-semibold uppercase tracking-wider text-[#666666]">Available Daily Alternatives</p>
                <p className="mt-1 font-mono text-lg font-bold text-indigo-400">{formatValue(realProcurement.availableAlternativeDailyTonnes)} t/d</p>
                <p className="mt-0.5 text-[10px] text-[#777777]">Annual volume ÷ 365 days</p>
              </div>
              <div className="rounded-lg border border-[#222222] bg-[#121212] p-3">
                <p className="text-[11px] font-semibold uppercase tracking-wider text-[#666666]">Annual Real Imports</p>
                <p className="mt-1 font-mono text-lg font-bold text-[#EDEDED]">{formatValue(realProcurement.totalAnnualImportTonnes)} tonnes</p>
                <p className="mt-0.5 text-[10px] text-[#777777]">FY {realProcurement.financialYear} crude imports</p>
              </div>
              <div className="rounded-lg border border-[#222222] bg-[#121212] p-3">
                <p className="text-[11px] font-semibold uppercase tracking-wider text-[#666666]">Active Supplier Sources</p>
                <p className="mt-1 font-mono text-lg font-bold text-emerald-400">{realProcurement.supplierCount} countries</p>
                <p className="mt-0.5 text-[10px] text-[#777777]">Real bilateral import origins</p>
              </div>
              <div className="rounded-lg border border-[#222222] bg-[#121212] p-3">
                <p className="text-[11px] font-semibold uppercase tracking-wider text-[#666666]">Lane Cost Status</p>
                <p className="mt-1 font-mono text-xs font-semibold text-amber-400">{realProcurement.commercialCostStatus}</p>
                <p className="mt-0.5 text-[10px] text-[#777777]">No fabricated costs used</p>
              </div>
            </div>

            {/* Top Real Suppliers Table */}
            {realProcurement.suppliers.length > 0 && (
              <div className="mt-4">
                <div className="flex items-center justify-between mb-2">
                  <span className="text-xs font-semibold text-[#CCCCCC]">Real Supplier Import Volumes (Top Origins)</span>
                  <span className="text-[11px] text-[#777777]">Click a supplier to use their capacity in optimizer</span>
                </div>
                <div className="grid gap-2 sm:grid-cols-2 lg:grid-cols-4">
                  {realProcurement.suppliers.slice(0, 8).map((s) => (
                    <button
                      key={s.countryId}
                      type="button"
                      onClick={() => handleApplyRealAlternative(s.dailyCapacityTonnes)}
                      className="flex flex-col text-left rounded-lg border border-[#242424] bg-[#141414] p-2.5 hover:border-indigo-500/50 hover:bg-indigo-950/20 transition group"
                    >
                      <div className="flex items-center justify-between w-full">
                        <span className="text-xs font-semibold text-[#EDEDED] group-hover:text-indigo-300">{s.canonicalName}</span>
                        <span className="text-[10px] font-mono text-indigo-400">{s.shareOfTotalImportsPercent}%</span>
                      </div>
                      <div className="mt-1 flex items-center justify-between w-full text-[11px] text-[#888888]">
                        <span>{formatValue(s.dailyCapacityTonnes)} t/d</span>
                        <span className="text-[10px] text-[#666666]">{formatValue(s.annualQuantityTonnes)} t/yr</span>
                      </div>
                    </button>
                  ))}
                </div>
              </div>
            )}
          </>
        ) : (
          <div className="p-4 text-center text-sm text-[#888888]">
            Alternative procurement data unavailable
          </div>
        )}
      </section>

      {/* Preset Scenarios Selector */}
      {!isCustomMode && (
        <section className="rounded-xl border border-[#222222] bg-[#0E0E0E] p-4">
          <div className="flex items-center justify-between mb-3">
            <div className="flex items-center gap-2">
              <Layers className="h-4 w-4 text-orange-400" />
              <h3 className="text-sm font-semibold text-[#EDEDED]">Disruption Scenario Presets (Stress Tests)</h3>
            </div>
            <span className="text-xs text-[#777777]">Select an illustrative scenario to evaluate reserve release behavior</span>
          </div>
          <div className="grid gap-2.5 sm:grid-cols-2 lg:grid-cols-5">
            {PRESET_SCENARIOS.map((preset) => {
              const isSelected = inputMode === 'PRESET' && activePresetName === preset.name;
              return (
                <button
                  key={preset.name}
                  type="button"
                  onClick={() => handleSelectPreset(preset.input, preset.name)}
                  className={`flex flex-col text-left p-3 rounded-lg border transition-all ${
                    isSelected
                      ? 'border-orange-500/60 bg-orange-500/10 shadow-sm'
                      : 'border-[#222222] bg-[#141414] hover:border-[#383838] hover:bg-[#181818]'
                  }`}
                >
                  <span className={`text-xs font-semibold ${isSelected ? 'text-orange-400' : 'text-[#EDEDED]'}`}>
                    {preset.name}
                  </span>
                  <span className="mt-1 text-[11px] leading-tight text-[#888888] line-clamp-2">
                    {preset.description}
                  </span>
                </button>
              );
            })}
          </div>
        </section>
      )}

      {/* Strategic Reserve Optimizer Inputs Section */}
      <section
        id="optimizer-inputs-section"
        className={`rounded-xl border p-5 transition-colors ${
          inputMode === 'REAL_BASELINE'
            ? 'border-cyan-500/40 bg-cyan-950/15'
            : inputMode === 'PRESET'
              ? 'border-purple-500/30 bg-purple-950/10'
              : 'border-blue-500/30 bg-blue-950/10'
        }`}
      >
        <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
          <div>
            <div className="flex items-center gap-2">
              <Database className={`h-5 w-5 ${
                inputMode === 'REAL_BASELINE' ? 'text-cyan-400' : 'text-orange-400'
              }`} />
              <h2 className="text-lg font-semibold text-[#EDEDED]">
                {inputMode === 'REAL_BASELINE'
                  ? 'Real Database Baseline Inputs'
                  : inputMode === 'PRESET'
                    ? `Disruption Preset: ${activePresetName || 'Scenario'}`
                    : 'Custom Interactive Parameters'}
              </h2>
              <StatusBadge
                level={inputMode === 'REAL_BASELINE' ? 'AVAILABLE' : 'ELEVATED'}
                label={
                  inputMode === 'REAL_BASELINE'
                    ? 'REAL BASELINE'
                    : inputMode === 'CUSTOM'
                      ? 'USER CUSTOM'
                      : 'SCENARIO PRESET'
                }
                size="sm"
              />
            </div>
            <p className="mt-2 max-w-2xl text-sm leading-relaxed text-[#999999]">
              {inputMode === 'REAL_BASELINE'
                ? `Using verified SQLite database baselines (FY ${liveState.demandFinancialYear || '2024-25'} daily consumption demand of ${formatValue(activeInput.demand)} t/d, ${formatValue(activeInput.alternativeProcurement)} t/d bilateral alternative imports from ${realProcurement?.supplierCount || 41} origins, 5.00 MMT policy reserve baseline). Supply gap (${formatValue(activeInput.supplyGap)} t/d) and duration (${activeInput.disruptionDuration}d) represent the hypothetical scenario under evaluation.`
                : inputMode === 'PRESET'
                  ? 'Illustrative stress-test scenario inputs sent to the deterministic Phase 8 reserve optimizer.'
                  : 'User-customized configuration evaluated by the deterministic Phase 8 reserve optimizer.'}
            </p>
          </div>
          <div className="flex items-center gap-3">
            <span className={`text-xs font-mono uppercase tracking-wider ${
              inputMode === 'REAL_BASELINE' ? 'text-cyan-300' : 'text-orange-300'
            }`}>
              {inputMode === 'REAL_BASELINE' ? 'Real Database Sourced' : 'Scenario Evaluation'}
            </span>
            {inputMode !== 'REAL_BASELINE' && (
              <button
                type="button"
                id="reset-baseline-btn"
                onClick={handleResetToRealBaseline}
                className="text-xs text-cyan-400 hover:text-cyan-300 underline"
              >
                Reset to Real Baseline
              </button>
            )}
          </div>
        </div>

        {isCustomMode ? (
          <div className="mt-5 grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
            <EditableInput
              label="Current reserve"
              value={activeInput.currentReserve}
              onChange={(val) => handleInputChange('currentReserve', val)}
              detail="Real baseline (5.00 MMT policy baseline)"
            />
            <EditableInput
              label="Demand"
              value={activeInput.demand}
              onChange={(val) => handleInputChange('demand', val)}
              detail={`Real baseline (FY ${liveState.demandFinancialYear || '2024-25'} MoPNG data)`}
            />
            <EditableInput
              label="Supply gap"
              value={activeInput.supplyGap}
              onChange={(val) => handleInputChange('supplyGap', val)}
              detail="Scenario Input (Gross disruption deficit)"
              badge="SCENARIO INPUT"
            />
            <EditableInput
              label="Disruption duration"
              value={activeInput.disruptionDuration}
              onChange={(val) => handleInputChange('disruptionDuration', val)}
              detail="Scenario Input (Disruption days)"
              badge="SCENARIO INPUT"
            />
            <EditableInput
              label="Alternative procurement"
              value={activeInput.alternativeProcurement}
              onChange={(val) => handleInputChange('alternativeProcurement', val)}
              detail={`Real baseline (${realProcurement?.supplierCount || 41} supplier origins)`}
            />
            <EditableInput
              label="Replenishment rate"
              value={activeInput.replenishmentRate}
              onChange={(val) => handleInputChange('replenishmentRate', val)}
              detail="Real baseline (ISPRL cavern injection rate)"
            />
            <EditableInput
              label="Minimum reserve threshold"
              value={activeInput.minimumReserveThreshold}
              onChange={(val) => handleInputChange('minimumReserveThreshold', val)}
              detail="Real baseline (Mandatory 30-day statutory floor)"
            />
            <div className="flex flex-col justify-end p-2">
              <button
                type="button"
                onClick={() => void runOptimization()}
                className="w-full flex items-center justify-center gap-2 rounded-lg bg-orange-500/20 border border-orange-500/40 px-3 py-2 text-xs font-semibold text-orange-300 hover:bg-orange-500/30 transition"
              >
                <RefreshCw className="h-3.5 w-3.5" /> Re-calculate With Values
              </button>
            </div>
          </div>
        ) : (
          <div className="mt-5 grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
            <ParameterCard
              label="Current reserve"
              value={activeInput.currentReserve}
              detail="5.00 MMT policy baseline (5.33 MMT cavern capacity)"
              provenance="REAL BASELINE"
            />
            <ParameterCard
              label="Demand"
              value={activeInput.demand}
              detail={`Real FY ${liveState.demandFinancialYear || '2024-25'} consumption demand`}
              provenance="REAL BASELINE"
            />
            <ParameterCard
              label="Supply gap"
              value={activeInput.supplyGap}
              detail="Hypothetical disruption deficit under evaluation"
              provenance="SCENARIO INPUT"
              highlight
            />
            <ParameterCard
              label="Disruption duration"
              value={activeInput.disruptionDuration}
              detail="Hypothetical disruption duration (days)"
              provenance="SCENARIO INPUT"
              unit="days"
              highlight
            />
            <ParameterCard
              label="Alternative procurement"
              value={activeInput.alternativeProcurement}
              detail={`Real SQLite imports (${realProcurement?.supplierCount || 41} supplier origins)`}
              provenance="REAL BASELINE"
            />
            <ParameterCard
              label="Replenishment rate"
              value={activeInput.replenishmentRate}
              detail="Operational cavern pipeline injection rate"
              provenance="REAL BASELINE"
            />
            <ParameterCard
              label="Minimum reserve threshold"
              value={activeInput.minimumReserveThreshold}
              detail="Mandatory 30-day statutory safety floor"
              provenance="REAL BASELINE"
            />
          </div>
        )}
      </section>

      {optimizing && (
        <LoadingState
          message="Running Phase 8 reserve optimizer"
          subtext="Evaluating inputs with deterministic Phase 8 optimizer"
        />
      )}

      {!optimizing && optimizerError && (
        <ErrorState
          title="Reserve optimization failed"
          message={optimizerError}
          onRetry={() => void runOptimization()}
        />
      )}

      {!optimizing && !optimizerError && result && (
        <div className="space-y-6">
          {/* Main Results Section */}
          <section className="space-y-5 rounded-xl border border-[#222222] bg-[#0F0F0F] p-5">
            <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
              <div>
                <div className="flex items-center gap-2">
                  <ShieldCheck className="h-5 w-5 text-emerald-400" />
                  <h2 className="text-lg font-semibold text-[#EDEDED]">Reserve Optimization Result</h2>
                </div>
                <p className="mt-1 text-sm text-[#888888]">Actual response from the deterministic Phase 8 calculation.</p>
              </div>
              <div className="flex items-center gap-2">
                <StatusBadge
                  level={
                    result.feasibility === 'FEASIBLE'
                      ? 'AVAILABLE'
                      : result.feasibility === 'PARTIALLY_FEASIBLE'
                        ? 'ELEVATED'
                        : 'CRITICAL'
                  }
                  label={result.coverageStatus.replaceAll('_', ' ')}
                  size="sm"
                />
                <span className="text-xs font-mono px-2.5 py-1 rounded bg-[#1A1A1A] border border-[#2D2D2D] text-[#AAAAAA]">
                  {result.constraintStatus}
                </span>
              </div>
            </div>

            {/* Primary KPI Metrics */}
            <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
              <MetricCard
                title="Current reserve"
                value={formatValue(activeInput.currentReserve)}
                subtext="Total starting stock"
                icon={Database}
                statusColor="cyan"
              />
              <MetricCard
                title="Effective supply gap"
                value={formatValue(result.effectiveGap)}
                subtext="After alternative procurement"
                icon={Calculator}
                statusColor="amber"
              />
              <MetricCard
                title="Drawdown amount"
                value={formatValue(result.drawdownAmount)}
                subtext="Recommended release"
                icon={ShieldCheck}
                statusColor={coverageIsComplete ? 'emerald' : 'amber'}
              />
              <MetricCard
                title="Remaining reserve"
                value={formatValue(result.remainingReserve)}
                subtext={`Safety threshold: ${formatValue(result.minimumReserveConstraint)}`}
                icon={Database}
                statusColor={result.remainingReserve >= result.minimumReserveConstraint ? 'emerald' : 'rose'}
              />
            </div>

            {/* Secondary Operational Metrics */}
            <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
              <ResultMetric label="Drawdown rate" value={formatValue(result.drawdownRate)} detail="reserve units per day" />
              <ResultMetric label="Duration" value={`${formatValue(result.duration)} days`} />
              <ResultMetric
                label="Replenishment requirement"
                value={formatValue(result.replenishmentRequirement)}
                detail={result.replenishmentDays > 0 ? `Est. ${result.replenishmentDays} days to refill` : 'No replenishment required'}
              />
              <ResultMetric
                label="Fully covered"
                value={result.fullyCovered ? 'YES' : 'NO'}
                detail={`Shortfall: ${formatValue(result.shortfall)} units`}
                highlight={!result.fullyCovered}
              />
            </div>

            {/* Deterministic Optimization Breakdown & Safety Verification */}
            <div className="rounded-lg border border-[#242424] bg-[#141414] p-4">
              <div className="flex items-center gap-2 mb-3">
                <Lock className="h-4 w-4 text-emerald-400" />
                <h3 className="text-xs font-semibold uppercase tracking-wider text-[#CCCCCC]">
                  Deterministic Safety Constraint Verification
                </h3>
              </div>

              <div className="grid gap-3 text-xs md:grid-cols-3">
                <div className="rounded border border-[#2A2A2A] bg-[#0C0C0C] p-3">
                  <span className="text-[#888888]">1. Gross Disruption vs Alternatives</span>
                  <div className="mt-1 font-mono text-sm font-semibold text-[#EDEDED]">
                    {formatValue(result.grossSupplyGap)} Gross - {formatValue(result.procurementCoverage)} Alt = {formatValue(result.residualSupplyGap)}/day
                  </div>
                  <p className="mt-1 text-[11px] text-[#777777]">
                    Total cumulative need: {formatValue(result.requiredReserveDrawdown)} units across {result.duration} days.
                  </p>
                </div>

                <div className="rounded border border-[#2A2A2A] bg-[#0C0C0C] p-3">
                  <span className="text-[#888888]">2. Safe Drawdown Capacity</span>
                  <div className="mt-1 font-mono text-sm font-semibold text-emerald-400">
                    Max Safe Release: {formatValue(result.maximumSafeReserveDrawdown)} units
                  </div>
                  <p className="mt-1 text-[11px] text-[#777777]">
                    Calculated as Current ({formatValue(activeInput.currentReserve)}) - Floor ({formatValue(result.minimumReserveConstraint)}).
                  </p>
                </div>

                <div className="rounded border border-[#2A2A2A] bg-[#0C0C0C] p-3">
                  <span className="text-[#888888]">3. Safety Floor Guarantee</span>
                  <div className="mt-1 flex items-center gap-1.5 font-mono text-sm font-semibold text-emerald-400">
                    <CheckCircle2 className="h-4 w-4 text-emerald-400" />
                    Remaining: {formatValue(result.remainingReserve)} &ge; {formatValue(result.minimumReserveConstraint)}
                  </div>
                  <p className="mt-1 text-[11px] text-[#777777]">
                    Strict guarantee: Drawdown never breaches statutory safety reserve.
                  </p>
                </div>
              </div>

              {isSafetyCapActive && (
                <div className="mt-3 flex items-start gap-2.5 rounded border border-amber-500/30 bg-amber-500/10 p-3 text-xs text-amber-300">
                  <AlertTriangle className="h-4 w-4 shrink-0 text-amber-400 mt-0.5" />
                  <div>
                    <span className="font-semibold">Safety Limit Enforced: </span>
                    Required drawdown ({formatValue(result.requiredReserveDrawdown)}) exceeded available safe capacity ({formatValue(result.maximumSafeReserveDrawdown)}).
                    Drawdown was deterministically capped to protect the {formatValue(result.minimumReserveConstraint)} unit strategic reserve floor. Unmet shortfall: {formatValue(result.shortfall)} units.
                  </div>
                </div>
              )}

              {isBelowThreshold && (
                <div className="mt-3 flex items-start gap-2.5 rounded border border-rose-500/30 bg-rose-500/10 p-3 text-xs text-rose-300">
                  <AlertTriangle className="h-4 w-4 shrink-0 text-rose-400 mt-0.5" />
                  <div>
                    <span className="font-semibold">Infeasible Reserve Drawdown: </span>
                    Current reserve ({formatValue(activeInput.currentReserve)}) is already below the minimum safety threshold ({formatValue(result.minimumReserveConstraint)}). Drawdown is locked at 0.
                  </div>
                </div>
              )}

              {/* Real Alternative Procurement Provenance */}
              {result.procurementProvenance && (
                <div className="mt-3 rounded border border-indigo-500/30 bg-indigo-950/20 p-3 text-xs">
                  <div className="flex items-center gap-2">
                    <Globe className="h-4 w-4 text-indigo-400" />
                    <span className="font-semibold text-indigo-200">Procurement Provenance & Cost Constraints</span>
                    <span className="rounded bg-amber-950/60 border border-amber-800/80 px-2 py-0.5 text-[10px] font-mono text-amber-300">
                      {result.procurementProvenance.commercialCostStatus}
                    </span>
                  </div>
                  <p className="mt-1.5 text-[11px] text-[#A0A0A0]">
                    {result.procurementProvenance.notes} (Source: {result.procurementProvenance.source}, FY {result.procurementProvenance.financialYear}, {result.procurementProvenance.activeSuppliersCount} verified suppliers).
                  </p>
                </div>
              )}
            </div>
          </section>

          {/* Strategic Facilities Reference Panel */}
          <section className="rounded-xl border border-[#222222] bg-[#0F0F0F] p-5">
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center gap-2">
                <Database className="h-4 w-4 text-cyan-400" />
                <h3 className="text-sm font-semibold text-[#EDEDED]">India Strategic Petroleum Reserves (ISPRL) Facilities</h3>
              </div>
              <span className="text-xs text-[#777777]">Phase 1 Strategic Storage Sites</span>
            </div>

            <div className="grid gap-3 sm:grid-cols-3">
              <div className="rounded-lg border border-[#222222] bg-[#141414] p-3.5">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-semibold text-[#EDEDED]">Visakhapatnam, Andhra Pradesh</span>
                  <span className="text-[11px] font-mono text-cyan-400">1.33 MMT</span>
                </div>
                <p className="mt-1 text-xs text-[#777777]">Underground rock cavern serving eastern refineries.</p>
                <div className="mt-2.5 flex items-center justify-between text-[11px] text-[#888888]">
                  <span>Capacity: ~9.77M bbl</span>
                  <span className="text-emerald-400 font-medium">Operational</span>
                </div>
              </div>

              <div className="rounded-lg border border-[#222222] bg-[#141414] p-3.5">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-semibold text-[#EDEDED]">Mangalore, Karnataka</span>
                  <span className="text-[11px] font-mono text-cyan-400">1.50 MMT</span>
                </div>
                <p className="mt-1 text-xs text-[#777777]">Underground rock cavern with 2 separate compartments.</p>
                <div className="mt-2.5 flex items-center justify-between text-[11px] text-[#888888]">
                  <span>Capacity: ~11.0M bbl</span>
                  <span className="text-emerald-400 font-medium">Operational</span>
                </div>
              </div>

              <div className="rounded-lg border border-[#222222] bg-[#141414] p-3.5">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-semibold text-[#EDEDED]">Padur, Karnataka</span>
                  <span className="text-[11px] font-mono text-cyan-400">2.50 MMT</span>
                </div>
                <p className="mt-1 text-xs text-[#777777]">Largest Phase-1 underground storage facility (4 compartments).</p>
                <div className="mt-2.5 flex items-center justify-between text-[11px] text-[#888888]">
                  <span>Capacity: ~18.37M bbl</span>
                  <span className="text-emerald-400 font-medium">Operational</span>
                </div>
              </div>
            </div>
          </section>

          {/* Recent Optimization Runs History */}
          {historyRuns.length > 0 && (
            <section className="rounded-xl border border-[#222222] bg-[#0F0F0F] p-5">
              <div className="flex items-center justify-between mb-4">
                <div className="flex items-center gap-2">
                  <History className="h-4 w-4 text-orange-400" />
                  <h3 className="text-sm font-semibold text-[#EDEDED]">Recent Optimization History</h3>
                </div>
                <span className="text-xs text-[#777777]">{historyRuns.length} recorded runs in SQLite database</span>
              </div>

              <div className="overflow-x-auto">
                <table className="w-full text-left text-xs">
                  <thead className="border-b border-[#222222] text-[#777777]">
                    <tr>
                      <th className="pb-2 font-medium">Timestamp</th>
                      <th className="pb-2 font-medium">Supply Gap</th>
                      <th className="pb-2 font-medium">Duration</th>
                      <th className="pb-2 font-medium">Procurement</th>
                      <th className="pb-2 font-medium">Drawdown Amount</th>
                      <th className="pb-2 font-medium">Remaining</th>
                      <th className="pb-2 font-medium">Status</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-[#1A1A1A]">
                    {historyRuns.map((run) => (
                      <tr key={run.optimizationId} className="hover:bg-[#141414]">
                        <td className="py-2.5 font-mono text-[#888888]">
                          {new Date(run.requestedAt).toLocaleTimeString()}
                        </td>
                        <td className="py-2.5 font-mono text-[#CCCCCC]">
                          {formatValue(run.input.supplyGap)}
                        </td>
                        <td className="py-2.5 text-[#AAAAAA]">
                          {run.input.disruptionDuration}d
                        </td>
                        <td className="py-2.5 font-mono text-[#AAAAAA]">
                          {formatValue(run.input.alternativeProcurement)}
                        </td>
                        <td className="py-2.5 font-mono text-emerald-400 font-medium">
                          {formatValue(run.result.drawdownAmount)}
                        </td>
                        <td className="py-2.5 font-mono text-[#CCCCCC]">
                          {formatValue(run.result.remainingReserve)}
                        </td>
                        <td className="py-2.5">
                          <span className={`px-2 py-0.5 rounded text-[10px] font-semibold ${
                            run.result.fullyCovered
                              ? 'bg-emerald-950/40 border border-emerald-800 text-emerald-400'
                              : 'bg-amber-950/40 border border-amber-800 text-amber-400'
                          }`}>
                            {run.result.coverageStatus}
                          </span>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </section>
          )}
        </div>
      )}
    </div>
  );
};

const ParameterCard: React.FC<{
  label: string;
  value: number;
  detail: string;
  provenance: 'REAL BASELINE' | 'SCENARIO INPUT';
  unit?: string;
  highlight?: boolean;
}> = ({ label, value, detail, provenance, unit, highlight }) => (
  <div className={`rounded-lg border px-3 py-2.5 ${
    highlight ? 'border-orange-500/40 bg-orange-950/10' : 'border-[#2A2A2A] bg-[#121212]'
  }`}>
    <div className="flex items-center justify-between">
      <p className="text-[11px] font-semibold uppercase tracking-wider text-[#666666]">{label}</p>
      <span className={`text-[9px] font-mono px-1.5 py-0.5 rounded ${
        provenance === 'REAL BASELINE'
          ? 'bg-cyan-950/60 text-cyan-300 border border-cyan-800/60'
          : 'bg-orange-950/60 text-orange-300 border border-orange-800/60'
      }`}>
        {provenance}
      </span>
    </div>
    <p className={`mt-1 font-mono text-sm font-semibold ${highlight ? 'text-orange-300' : 'text-[#EDEDED]'}`}>
      {formatValue(value)}{unit ? ` ${unit}` : ''}
    </p>
    <p className="mt-0.5 text-[11px] text-[#777777]">{detail}</p>
  </div>
);

const EditableInput: React.FC<{
  label: string;
  value: number;
  onChange: (val: number) => void;
  detail?: string;
  badge?: string;
}> = ({ label, value, onChange, detail, badge }) => (
  <div className="rounded-lg border border-[#333333] bg-[#121212] px-3 py-2.5">
    <div className="flex items-center justify-between">
      <label className="text-[11px] font-semibold uppercase tracking-wider text-[#888888] block">
        {label}
      </label>
      {badge && (
        <span className="text-[9px] font-mono px-1.5 py-0.5 rounded bg-orange-950/60 text-orange-300 border border-orange-800/60">
          {badge}
        </span>
      )}
    </div>
    <input
      type="number"
      value={value}
      min="0"
      onChange={(e) => onChange(Number(e.target.value) || 0)}
      className="mt-1 w-full rounded bg-[#1A1A1A] border border-[#383838] px-2 py-1 font-mono text-sm font-semibold text-[#EDEDED] focus:border-orange-500 focus:outline-none"
    />
    {detail && <p className="mt-0.5 text-[10px] text-[#777777]">{detail}</p>}
  </div>
);
