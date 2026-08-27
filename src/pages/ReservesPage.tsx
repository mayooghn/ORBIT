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
  isCustom?: boolean;
  input: StrategicReserveOptimizationInput;
}> = [
  {
    name: 'Normal Supply Disruption',
    description: 'Typical 30-day oil supply disruption used to evaluate a standard reserve response.',
    input: {
      currentReserve: 5_000_000,
      demand: 655_271,
      availableSupply: 555_271,
      supplyGap: 100_000,
      disruptionDuration: 30,
      alternativeProcurement: 50_000,
      replenishmentRate: 20_000,
      minimumReserveThreshold: 1_500_000,
    },
  },
  {
    name: 'Strait of Hormuz Crisis',
    description: 'Major geopolitical shipping disruption with a severe crude supply deficit.',
    input: {
      currentReserve: 5_000_000,
      demand: 655_271,
      availableSupply: 305_271,
      supplyGap: 350_000,
      disruptionDuration: 60,
      alternativeProcurement: 100_000,
      replenishmentRate: 25_000,
      minimumReserveThreshold: 1_500_000,
    },
  },
  {
    name: 'Strong Backup Supply',
    description: 'Disruption where alternative supplier capacity significantly reduces the need for reserve drawdown.',
    input: {
      currentReserve: 5_000_000,
      demand: 655_271,
      availableSupply: 575_271,
      supplyGap: 80_000,
      disruptionDuration: 14,
      alternativeProcurement: 150_000,
      replenishmentRate: 20_000,
      minimumReserveThreshold: 1_500_000,
    },
  },
  {
    name: 'Reserve Safety Limit',
    description: "Extreme disruption that tests ORBIT's hard minimum reserve safety constraint.",
    input: {
      currentReserve: 2_000_000,
      demand: 655_271,
      availableSupply: 455_271,
      supplyGap: 200_000,
      disruptionDuration: 45,
      alternativeProcurement: 20_000,
      replenishmentRate: 15_000,
      minimumReserveThreshold: 1_500_000,
    },
  },
  {
    name: 'Reserve Already Below Safe Level',
    description: 'Emergency scenario where the starting reserve is already below the minimum safety threshold.',
    input: {
      currentReserve: 1_200_000,
      demand: 655_271,
      availableSupply: 505_271,
      supplyGap: 150_000,
      disruptionDuration: 30,
      alternativeProcurement: 30_000,
      replenishmentRate: 10_000,
      minimumReserveThreshold: 1_500_000,
    },
  },
  {
    name: 'Custom Crisis',
    description: 'Create your own disruption scenario by entering the assumptions.',
    isCustom: true,
    input: {
      currentReserve: 5_000_000,
      demand: 655_271,
      availableSupply: 555_271,
      supplyGap: 100_000,
      disruptionDuration: 30,
      alternativeProcurement: 50_000,
      replenishmentRate: 20_000,
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
  <div className={`rounded-lg border p-3.5 min-w-0 overflow-hidden ${highlight ? 'border-orange-500/40 bg-orange-950/10' : 'border-[#222222] bg-[#121212]'}`}>
    <p className="text-[10px] sm:text-xs font-semibold uppercase tracking-wider text-[#666666] truncate">{label}</p>
    <p className={`mt-1.5 font-mono text-lg sm:text-[22px] font-bold truncate ${highlight ? 'text-orange-400' : 'text-[#EDEDED]'}`}>{value}</p>
    {detail && <p className="mt-1 text-[11px] text-[#777777] truncate">{detail}</p>}
  </div>
);

export type StrategicReserveInputMode = 'REAL_BASELINE' | 'PRESET' | 'CUSTOM';

export const buildRealBaselineOptimizationInput = (
  state: StrategicReserveState,
  procurement: RealAlternativeProcurementState | null,
  scenarioParams?: { availableSupply?: number; supplyGap?: number; disruptionDuration?: number },
): StrategicReserveOptimizationInput => {
  const altProc = procurement?.availableAlternativeDailyTonnes
    ? Math.round(procurement.availableAlternativeDailyTonnes)
    : (state.alternativeProcurement?.availableAlternativeDailyTonnes
        ? Math.round(state.alternativeProcurement.availableAlternativeDailyTonnes)
        : 0);

  const demand = Math.round(state.currentDemand);
  const targetGap = scenarioParams?.supplyGap ?? 100_000;
  const availableSupply = scenarioParams?.availableSupply ?? Math.max(0, demand - targetGap);

  return {
    currentReserve: state.currentReserve,
    demand,
    availableSupply,
    supplyGap: Math.max(0, demand - availableSupply),
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

    // Validate numeric values and reject invalid or negative values
    const fieldsToCheck: Array<{ name: keyof StrategicReserveOptimizationInput; label: string }> = [
      { name: 'currentReserve', label: 'Current reserve' },
      { name: 'demand', label: 'Daily demand' },
      { name: 'availableSupply', label: 'Available supply' },
      { name: 'disruptionDuration', label: 'Disruption duration' },
      { name: 'alternativeProcurement', label: 'Alternative procurement' },
      { name: 'replenishmentRate', label: 'Replenishment rate' },
      { name: 'minimumReserveThreshold', label: 'Minimum reserve threshold' },
    ];

    for (const { name, label } of fieldsToCheck) {
      const val = inputToUse[name];
      if (typeof val !== 'number' || isNaN(val) || !Number.isFinite(val)) {
        setOptimizerError(`Invalid input for ${label}: Value must be a valid number.`);
        return;
      }
      if (val < 0) {
        setOptimizerError(`Invalid input for ${label}: Value cannot be negative.`);
        return;
      }
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
    setIsCustomMode(false);
    setActiveInput(presetInput);
    void runOptimization(presetInput);
  };

  const handleSelectCustomCrisis = () => {
    setInputMode('CUSTOM');
    setActivePresetName('Custom Crisis');
    setIsCustomMode(true);
    const demand = liveState ? Math.round(liveState.currentDemand) : 655_271;
    const availableSupply = activeInput?.availableSupply ?? Math.max(0, demand - 100_000);
    const customDefaults: StrategicReserveOptimizationInput = activeInput ? {
      ...activeInput,
      supplyGap: Math.max(0, activeInput.demand - activeInput.availableSupply),
    } : {
      currentReserve: liveState?.currentReserve ?? 5_000_000,
      demand,
      availableSupply,
      supplyGap: Math.max(0, demand - availableSupply),
      disruptionDuration: 30,
      alternativeProcurement: realProcurement?.availableAlternativeDailyTonnes
        ? Math.round(realProcurement.availableAlternativeDailyTonnes)
        : (liveState?.alternativeProcurement?.availableAlternativeDailyTonnes
            ? Math.round(liveState.alternativeProcurement.availableAlternativeDailyTonnes)
            : 50_000),
      replenishmentRate: liveState?.defaultReplenishmentRate ?? 20_000,
      minimumReserveThreshold: liveState?.minimumReserveThreshold ?? 1_500_000,
    };
    setActiveInput(customDefaults);
    void runOptimization(customDefaults);
  };

  const handleResetToRealBaseline = () => {
    if (!liveState) return;
    const baseline = buildRealBaselineOptimizationInput(liveState, realProcurement);
    setInputMode('REAL_BASELINE');
    setActivePresetName(null);
    setIsCustomMode(false);
    setActiveInput(baseline);
    setOptimizerError('');
    void runOptimization(baseline);
  };

  const handleApplyRealAlternative = (dailyTonnes: number) => {
    if (!activeInput) return;
    const updated = { ...activeInput, alternativeProcurement: Math.round(dailyTonnes) };
    setActiveInput(updated);
    setInputMode('CUSTOM');
    setActivePresetName('Custom Crisis');
    setIsCustomMode(true);
    void runOptimization(updated);
  };

  const handleInputChange = (field: keyof StrategicReserveOptimizationInput, value: number) => {
    if (!activeInput) return;
    setInputMode('CUSTOM');
    setActivePresetName('Custom Crisis');
    setIsCustomMode(true);
    const updated = { ...activeInput, [field]: value };
    updated.supplyGap = Math.max(0, (updated.demand ?? 0) - (updated.availableSupply ?? 0));
    setActiveInput(updated);
    void runOptimization(updated);
  };

  const [mainTab, setMainTab] = useState<'telemetry' | 'optimizer' | 'suppliers'>('telemetry');

  // 1. Initial Data Loading State (No fake data or demo fallbacks rendered)
  if (initialDataLoading) {
    return (
      <div className="space-y-6">
        <PageHeader
          title="Reserve Management"
          subtitle="Deterministic optimization engine calculating safe strategic petroleum reserve releases during supply disruptions."
        />
        <LoadingState
          message="Loading strategic reserve and procurement data..."
          subtext="Querying database for ISPRL storage facilities, MoPNG daily petroleum consumption, and bilateral supplier import records."
        />
      </div>
    );
  }

  // 2. Data Load Failure State (Explicit error, no fallback to mock figures)
  if (dataError || !liveState || !activeInput) {
    return (
      <div className="space-y-6">
        <PageHeader
          title="Reserve Management"
          subtitle="Deterministic optimization engine calculating safe strategic petroleum reserve releases during supply disruptions."
        />
        <ErrorState
          title="Reserve data unavailable"
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
        title="Reserve Management"
        subtitle="Deterministic optimization engine calculating safe strategic petroleum reserve releases during supply disruptions."
      />

      {/* Top Tab Switcher */}
      <div className="rounded-xl border border-[#22222A] bg-[#121215] p-1.5 flex items-center gap-2 overflow-x-auto shadow-md">
        <button
          type="button"
          onClick={() => setMainTab('telemetry')}
          className={`inline-flex items-center gap-2 px-4 py-2.5 rounded-lg text-xs font-semibold transition-all ${
            mainTab === 'telemetry'
              ? 'bg-orange-500 text-slate-950 shadow-md shadow-orange-500/20 font-bold'
              : 'text-[#9CA3AF] hover:text-[#F3F4F6] hover:bg-[#18181E] font-medium'
          }`}
        >
          <Database className="h-4 w-4" />
          Strategic Reserve Sites
          <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-mono font-bold ${
            mainTab === 'telemetry' ? 'bg-slate-950/30 text-slate-950' : 'bg-cyan-950/60 text-cyan-400 border border-cyan-800/50'
          }`}>
            3 Sites
          </span>
        </button>

        <button
          type="button"
          onClick={() => setMainTab('optimizer')}
          className={`inline-flex items-center gap-2 px-4 py-2.5 rounded-lg text-xs font-semibold transition-all ${
            mainTab === 'optimizer'
              ? 'bg-orange-500 text-slate-950 shadow-md shadow-orange-500/20 font-bold'
              : 'text-[#9CA3AF] hover:text-[#F3F4F6] hover:bg-[#18181E] font-medium'
          }`}
        >
          <Calculator className="h-4 w-4" />
          Reserve Optimizer
        </button>

        <button
          type="button"
          onClick={() => setMainTab('suppliers')}
          className={`inline-flex items-center gap-2 px-4 py-2.5 rounded-lg text-xs font-semibold transition-all ${
            mainTab === 'suppliers'
              ? 'bg-orange-500 text-slate-950 shadow-md shadow-orange-500/20 font-bold'
              : 'text-[#9CA3AF] hover:text-[#F3F4F6] hover:bg-[#18181E] font-medium'
          }`}
        >
          <Globe className="h-4 w-4" />
          Backup Crude Supply
          {realProcurement && (
            <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-mono font-bold ${
              mainTab === 'suppliers' ? 'bg-slate-950/30 text-slate-950' : 'bg-orange-950/60 text-orange-400 border border-orange-800/50'
            }`}>
              {realProcurement.supplierCount}
            </span>
          )}
        </button>
      </div>

      {/* TAB 1: OPTIMIZER */}
      {mainTab === 'optimizer' && (
        <div className="space-y-6">
          {/* Top Metric Strip for Optimizer */}
          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
            <div className="rounded-lg border border-[#22222A] bg-[#121215] p-3 transition hover:border-[#333342]">
              <p className="text-[10px] font-semibold uppercase tracking-wider text-[#9CA3AF]">Real Daily Demand</p>
              <p className="mt-1 font-mono text-base font-bold text-emerald-400">{formatValue(liveState.currentDemand)} <span className="text-xs font-normal text-[#9CA3AF]">t/d</span></p>
              <p className="mt-0.5 text-[10px] text-[#6B7280]">MoPNG national consumption</p>
            </div>
            <div className="rounded-lg border border-[#22222A] bg-[#121215] p-3 transition hover:border-[#333342]">
              <div className="flex items-start justify-between">
                <div>
                  <p className="text-[10px] font-semibold uppercase tracking-wider text-[#9CA3AF]">Current Strategic Reserve</p>
                  <p className="mt-1 font-mono text-base font-bold text-[#F3F4F6]">{formatValue(liveState.currentReserve)} <span className="text-xs font-normal text-[#9CA3AF]">tonnes</span></p>
                </div>
                {liveState.currentReserveStatus === 'POLICY_ESTIMATE_UNAVAILABLE_TELEMETRY' && (
                  <span className="text-[9px] font-mono font-bold text-amber-400 border border-amber-900/60 bg-amber-950/60 px-1.5 py-0.5 rounded cursor-help" title={liveState.currentReserveSource}>
                    POLICY ESTIMATE
                  </span>
                )}
              </div>
              <p className="mt-0.5 text-[10px] text-[#6B7280]">Active stock across caverns</p>
            </div>
            <div className="rounded-lg border border-[#22222A] bg-[#121215] p-3 transition hover:border-[#333342]">
              <p className="text-[10px] font-semibold uppercase tracking-wider text-[#9CA3AF]">Backup Import Supply</p>
              <p className="mt-1 font-mono text-base font-bold text-indigo-400">
                {realProcurement ? `${formatValue(realProcurement.availableAlternativeDailyTonnes)} t/d` : 'N/A'}
              </p>
              <p className="mt-0.5 text-[10px] text-[#6B7280]">{realProcurement ? `${realProcurement.supplierCount} bilateral suppliers` : 'Alternative origins'}</p>
            </div>
            <div className="rounded-lg border border-[#22222A] bg-[#121215] p-3 transition hover:border-[#333342]">
              <p className="text-[10px] font-semibold uppercase tracking-wider text-[#9CA3AF]">Safety Reserve Floor</p>
              <p className="mt-1 font-mono text-base font-bold text-amber-400">{formatValue(liveState.minimumReserveThreshold)} <span className="text-xs font-normal text-[#9CA3AF]">tonnes</span></p>
              <p className="mt-0.5 text-[10px] text-[#6B7280]">30-day statutory protection</p>
            </div>
          </div>

          {/* Compact Horizontal Crisis Scenario Bar */}
          <section className="rounded-xl border border-[#22222A] bg-[#121215] p-4 shadow-sm space-y-3">
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
              <div className="flex items-center gap-2.5">
                <div className="p-1.5 rounded-lg bg-orange-500/10 text-orange-400 border border-orange-500/20 shrink-0">
                  <Layers className="h-4 w-4" />
                </div>
                <div>
                  <div className="flex items-center gap-2">
                    <h3 className="text-sm font-semibold text-[#F3F4F6]">Choose a Crisis Scenario</h3>
                    <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-[#1A1A22] text-orange-400 border border-[#2A2A36]">
                      {activePresetName || 'Scenario Selected'}
                    </span>
                  </div>
                  <p className="text-xs text-[#9CA3AF]">
                    Select a predefined crisis or create your own to see how the strategic reserve responds.
                  </p>
                </div>
              </div>

              {/* Scenarios Dropdown */}
              <div className="flex items-center gap-2 shrink-0">
                <label htmlFor="crisis-scenario-select" className="sr-only">Select Crisis Scenario</label>
                <select
                  id="crisis-scenario-select"
                  value={activePresetName || 'Custom Crisis'}
                  onChange={(e) => {
                    const selectedName = e.target.value;
                    const preset = PRESET_SCENARIOS.find((p) => p.name === selectedName);
                    if (preset) {
                      if (preset.isCustom) {
                        handleSelectCustomCrisis();
                      } else {
                        handleSelectPreset(preset.input, preset.name);
                      }
                    }
                  }}
                  className="w-full sm:w-auto min-w-[260px] rounded-lg border border-[#2F2F3B] bg-[#18181E] px-3.5 py-2 text-xs font-semibold text-[#F3F4F6] hover:border-orange-500/50 focus:border-orange-500 focus:outline-none focus:ring-1 focus:ring-orange-500 transition cursor-pointer"
                >
                  {PRESET_SCENARIOS.map((preset) => (
                    <option key={preset.name} value={preset.name} className="bg-[#18181E] text-[#F3F4F6]">
                      {preset.name} {preset.isCustom ? '(Custom Editable)' : `(${preset.input.disruptionDuration}-day disruption)`}
                    </option>
                  ))}
                </select>
              </div>
            </div>

            {/* Active Scenario Description */}
            {(() => {
              const activeScenario = PRESET_SCENARIOS.find((p) =>
                (p.isCustom && inputMode === 'CUSTOM' && activePresetName === 'Custom Crisis') ||
                (!p.isCustom && inputMode === 'PRESET' && activePresetName === p.name)
              ) || PRESET_SCENARIOS.find((p) => p.isCustom);

              return activeScenario ? (
                <p className="text-xs text-[#9CA3AF] border-t border-[#1E1E26] pt-2.5 leading-relaxed">
                  <span className="font-semibold text-[#D1D5DB]">{activeScenario.name}: </span>
                  {activeScenario.description}
                </p>
              ) : null;
            })()}
          </section>

          {/* 2-Column Side-by-Side Layout for Inputs & Results */}
          <div className="grid gap-6 lg:grid-cols-12 items-start">
            {/* LEFT COLUMN: Scenario Inputs Panel (6 cols) */}
            <div className="lg:col-span-6 space-y-5">
              {/* Scenario Inputs Panel */}
              <section
                id="optimizer-inputs-section"
                className="rounded-xl border border-[#22222A] bg-[#121215] p-4 shadow-sm"
              >
            <div className="flex items-center justify-between border-b border-[#1E1E26] pb-3 mb-3">
              <div className="flex items-center gap-2">
                <div className="p-1 rounded bg-orange-500/10 text-orange-400 border border-orange-500/20">
                  <Sliders className="h-4 w-4" />
                </div>
                <h2 className="text-sm font-semibold text-[#F3F4F6]">Scenario Inputs</h2>
              </div>
              <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-[#1A1A22] text-[#9CA3AF] border border-[#2A2A36]">
                {isCustomMode ? 'EDITABLE MODE' : 'READ-ONLY'}
              </span>
            </div>

            <p className="text-xs text-[#9CA3AF] mb-3 leading-relaxed">
              ORBIT uses current reserve and supply information as the starting point. Crisis assumptions can be adjusted to test different situations.
            </p>

            {isCustomMode || inputMode === 'CUSTOM' ? (
              <div className="space-y-2.5">
                <div className="grid gap-2 sm:grid-cols-2">
                  <EditableInput
                    label="Daily Demand"
                    value={activeInput.demand}
                    unit="tonnes/day"
                    onChange={(val) => handleInputChange('demand', val)}
                    detail="Estimated daily oil demand"
                  />
                  <EditableInput
                    label="Available Supply"
                    value={activeInput.availableSupply}
                    unit="tonnes/day"
                    onChange={(val) => handleInputChange('availableSupply', val)}
                    detail="Expected daily incoming supply during crisis"
                    badge="SCENARIO INPUT"
                  />
                  <ParameterCard
                    label="Calculated Supply Gap"
                    value={Math.max(0, activeInput.demand - activeInput.availableSupply)}
                    unit="tonnes/day"
                    detail="Calculated: Daily Demand - Available Supply"
                    badge="CALCULATED"
                    highlight
                  />
                  <EditableInput
                    label="Crisis Duration"
                    value={activeInput.disruptionDuration}
                    unit="days"
                    onChange={(val) => handleInputChange('disruptionDuration', val)}
                    detail="How long the disruption is expected to last"
                    badge="SCENARIO"
                  />
                  <EditableInput
                    label="Backup Supply"
                    value={activeInput.alternativeProcurement}
                    unit="tonnes/day"
                    onChange={(val) => handleInputChange('alternativeProcurement', val)}
                    detail="Available supply from alternative sources"
                  />
                  <EditableInput
                    label="Refill Rate"
                    value={activeInput.replenishmentRate}
                    unit="tonnes/day"
                    onChange={(val) => handleInputChange('replenishmentRate', val)}
                    detail="Maximum daily reserve refill"
                  />
                  <EditableInput
                    label="Current Reserve"
                    value={activeInput.currentReserve}
                    unit="tonnes"
                    onChange={(val) => handleInputChange('currentReserve', val)}
                    detail="Current strategic reserve available"
                  />
                  <EditableInput
                    label="Safety Reserve"
                    value={activeInput.minimumReserveThreshold}
                    unit="tonnes"
                    onChange={(val) => handleInputChange('minimumReserveThreshold', val)}
                    detail="Minimum reserve that must be protected"
                  />
                </div>
                <button
                  type="button"
                  onClick={() => void runOptimization()}
                  disabled={optimizing}
                  className="w-full mt-2 flex items-center justify-center gap-2 rounded-lg bg-orange-500 px-4 py-2.5 text-xs font-semibold text-slate-950 hover:bg-orange-400 transition disabled:opacity-60 shadow-md"
                >
                  <Calculator className="h-4 w-4" />
                  {optimizing ? 'Calculating...' : 'Run Custom Scenario'}
                </button>
              </div>
            ) : (
              <div className="space-y-2.5">
                <div className="grid gap-2 sm:grid-cols-2">
                  <ParameterCard
                    label="Daily Demand"
                    value={activeInput.demand}
                    unit="tonnes/day"
                    detail="Estimated daily oil demand"
                  />
                  <ParameterCard
                    label="Available Supply"
                    value={activeInput.availableSupply}
                    unit="tonnes/day"
                    detail="Expected daily incoming supply during crisis"
                    badge="SCENARIO INPUT"
                  />
                  <ParameterCard
                    label="Calculated Supply Gap"
                    value={Math.max(0, activeInput.demand - activeInput.availableSupply)}
                    unit="tonnes/day"
                    detail="Calculated: Daily Demand - Available Supply"
                    badge="CALCULATED"
                    highlight
                  />
                  <ParameterCard
                    label="Crisis Duration"
                    value={activeInput.disruptionDuration}
                    unit="days"
                    detail="How long the disruption is expected to last"
                    badge="SCENARIO"
                    highlight
                  />
                  <ParameterCard
                    label="Backup Supply"
                    value={activeInput.alternativeProcurement}
                    unit="tonnes/day"
                    detail="Available supply from alternative sources"
                  />
                  <ParameterCard
                    label="Refill Rate"
                    value={activeInput.replenishmentRate}
                    unit="tonnes/day"
                    detail="Maximum daily reserve refill"
                  />
                  <ParameterCard
                    label="Current Reserve"
                    value={activeInput.currentReserve}
                    unit="tonnes"
                    detail="Current strategic reserve available"
                  />
                  <ParameterCard
                    label="Safety Reserve"
                    value={activeInput.minimumReserveThreshold}
                    unit="tonnes"
                    detail="Minimum reserve that must be protected"
                  />
                </div>
                <button
                  type="button"
                  onClick={handleSelectCustomCrisis}
                  className="w-full mt-2 flex items-center justify-center gap-2 rounded-lg border border-[#2F2F3B] bg-[#18181E] px-3 py-2 text-xs font-semibold text-[#F3F4F6] hover:border-orange-500/50 hover:text-orange-400 transition"
                >
                  <Sliders className="h-3.5 w-3.5" />
                  Customize Assumptions
                </button>
              </div>
            )}
          </section>
        </div>

        {/* RIGHT COLUMN: Optimization Results & Operations (6 cols) */}
        <div className="lg:col-span-6 space-y-5">
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
            <div className="space-y-5">
              {/* Main Result Card */}
              <section className="rounded-xl border border-[#22222A] bg-[#121215] p-5 shadow-sm space-y-4">
                <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between border-b border-[#1E1E26] pb-3">
                  <div className="flex items-center gap-2.5">
                    <div className="p-1.5 rounded-lg bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
                      <ShieldCheck className="h-5 w-5" />
                    </div>
                    <div>
                      <h2 className="text-base font-semibold text-[#F3F4F6]">Reserve Optimization Result</h2>
                      <p className="text-[11px] text-[#9CA3AF]">Deterministic Phase 8 reserve allocation & release recommendation</p>
                    </div>
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
                    <span className="text-[11px] font-mono px-2.5 py-0.5 rounded bg-[#18181E] border border-[#2A2A36] text-[#D1D5DB]">
                      {result.constraintStatus}
                    </span>
                  </div>
                </div>

                {/* Primary KPI Metrics Grid */}
                <div className="grid gap-3 grid-cols-2 sm:grid-cols-2">
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

                {/* Drawdown & Safety Buffer Visual Gauge */}
                <div className="rounded-lg border border-[#22222A] bg-[#18181E] p-3.5 space-y-2">
                  <div className="flex items-center justify-between text-xs">
                    <span className="text-[#9CA3AF] font-medium">Post-Drawdown Reserve Balance</span>
                    <span className="font-mono text-[11px] text-[#F3F4F6]">
                      Drawdown: <span className="text-amber-400 font-bold">{formatValue(result.drawdownAmount)} t</span> | Remaining: <span className="text-emerald-400 font-bold">{formatValue(result.remainingReserve)} t</span>
                    </span>
                  </div>
                  <div className="h-2.5 w-full rounded-full bg-[#1A1A22] overflow-hidden flex border border-[#2A2A36]">
                    {/* Remaining Safe Stock */}
                    <div
                      className="bg-emerald-400 h-full transition-all"
                      style={{ width: `${(result.remainingReserve / activeInput.currentReserve) * 100}%` }}
                      title="Remaining Reserve"
                    />
                    {/* Drawn Down Amount */}
                    <div
                      className="bg-amber-500 h-full transition-all"
                      style={{ width: `${(result.drawdownAmount / activeInput.currentReserve) * 100}%` }}
                      title="Drawdown Amount"
                    />
                  </div>
                </div>

                {/* Secondary Operational Details */}
                <div className="grid gap-2.5 grid-cols-2 sm:grid-cols-2">
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

                {/* Safety Guarantee Breakdown */}
                <div className="rounded-lg border border-[#22222A] bg-[#18181E] p-4 space-y-3">
                  <div className="flex items-center gap-2">
                    <Lock className="h-4 w-4 text-emerald-400" />
                    <h3 className="text-xs font-semibold uppercase tracking-wider text-[#D1D5DB]">
                      Deterministic Safety Constraint Verification
                    </h3>
                  </div>

                  <div className="grid gap-2 text-xs md:grid-cols-3">
                    <div className="rounded border border-[#262632] bg-[#121215] p-3">
                      <span className="text-[#9CA3AF] font-medium">1. Supply Gap & Backup Supply</span>
                      <div className="mt-1 font-mono text-xs font-semibold text-[#F3F4F6]">
                        {formatValue(activeInput.demand)} Demand - {formatValue(activeInput.availableSupply)} Supply = {formatValue(result.grossSupplyGap)} Gap/day
                      </div>
                      <p className="mt-1 text-[10px] text-[#6B7280]">
                        Effective Gap: {formatValue(result.residualSupplyGap)} t/day after {formatValue(result.procurementCoverage)} t/day backup supply. Total cumulative need: {formatValue(result.requiredReserveDrawdown)} units across {result.duration} days.
                      </p>
                    </div>

                    <div className="rounded border border-[#262632] bg-[#121215] p-3">
                      <span className="text-[#9CA3AF] font-medium">2. Safe Drawdown Capacity</span>
                      <div className="mt-1 font-mono text-xs font-semibold text-emerald-400">
                        Max Safe Release: {formatValue(result.maximumSafeReserveDrawdown)} units
                      </div>
                      <p className="mt-1 text-[10px] text-[#6B7280]">
                        Calculated as Current ({formatValue(activeInput.currentReserve)}) - Floor ({formatValue(result.minimumReserveConstraint)}).
                      </p>
                    </div>

                    <div className="rounded border border-[#262632] bg-[#121215] p-3">
                      <span className="text-[#9CA3AF] font-medium">3. Safety Floor Guarantee</span>
                      <div className="mt-1 flex items-center gap-1.5 font-mono text-xs font-semibold text-emerald-400">
                        <CheckCircle2 className="h-3.5 w-3.5 text-emerald-400 shrink-0" />
                        Remaining: {formatValue(result.remainingReserve)} &ge; {formatValue(result.minimumReserveConstraint)}
                      </div>
                      <p className="mt-1 text-[10px] text-[#6B7280]">
                        Strict guarantee: Drawdown never breaches statutory safety reserve.
                      </p>
                    </div>
                  </div>

                  {isSafetyCapActive && (
                    <div className="flex items-start gap-2 rounded border border-amber-500/30 bg-amber-500/10 p-2.5 text-xs text-amber-300">
                      <AlertTriangle className="h-4 w-4 shrink-0 text-amber-400 mt-0.5" />
                      <div>
                        <span className="font-semibold">Safety Limit Enforced: </span>
                        Required drawdown ({formatValue(result.requiredReserveDrawdown)}) exceeded available safe capacity ({formatValue(result.maximumSafeReserveDrawdown)}).
                        Drawdown was deterministically capped to protect the {formatValue(result.minimumReserveConstraint)} unit strategic reserve floor. Unmet shortfall: {formatValue(result.shortfall)} units.
                      </div>
                    </div>
                  )}

                  {isBelowThreshold && (
                    <div className="flex items-start gap-2 rounded border border-rose-500/30 bg-rose-500/10 p-2.5 text-xs text-rose-300">
                      <AlertTriangle className="h-4 w-4 shrink-0 text-rose-400 mt-0.5" />
                      <div>
                        <span className="font-semibold">Infeasible Reserve Drawdown: </span>
                        Current reserve ({formatValue(activeInput.currentReserve)}) is already below the minimum safety threshold ({formatValue(result.minimumReserveConstraint)}). Drawdown is locked at 0.
                      </div>
                    </div>
                  )}
                </div>
              </section>

            </div>
          )}
        </div>
      </div>
    </div>
  )}

      {/* TAB 2: NATIONAL STORAGE CAVERNS TELEMETRY */}
      {mainTab === 'telemetry' && (
        <div className="space-y-6">
          {/* Top Banner: National Strategic Reserve Capacity & Telemetry */}
          <section className="rounded-xl border border-[#22222A] bg-[#121215] p-5 shadow-lg relative overflow-hidden">
            <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between border-b border-[#1E1E26] pb-4">
              <div>
                <div className="flex items-center gap-2.5">
                  <div className="p-1.5 rounded-lg bg-cyan-500/10 border border-cyan-500/20 text-cyan-400">
                    <Database className="h-5 w-5" />
                  </div>
                  <div>
                    <h2 className="text-base font-semibold text-[#F3F4F6] tracking-tight">National Strategic Petroleum Reserve Overview</h2>
                    <p className="text-xs text-[#9CA3AF]">ISPRL Phase-1 Underground Cavern Storage Network</p>
                  </div>
                </div>
              </div>
              <div className="flex items-center gap-3">
                <span className="text-xs text-[#9CA3AF]">
                  Baseline Year: <strong className="text-emerald-400 font-mono font-medium">FY {liveState.demandFinancialYear || '2024-25'}</strong>
                </span>
                <span className="h-3 w-px bg-[#2D2D38]" />
                {liveState.currentReserveStatus === 'POLICY_ESTIMATE_UNAVAILABLE_TELEMETRY' ? (
                  <span className="inline-flex items-center gap-1.5 text-xs text-amber-400 font-mono font-medium bg-amber-950/40 px-2.5 py-1 rounded-md border border-amber-800/40 cursor-help" title={liveState.currentReserveSource}>
                    <span className="h-2 w-2 rounded-full bg-amber-400 animate-pulse" />
                    POLICY ESTIMATE
                  </span>
                ) : (
                  <span className="inline-flex items-center gap-1.5 text-xs text-cyan-400 font-mono font-medium bg-cyan-950/40 px-2.5 py-1 rounded-md border border-cyan-800/40">
                    <span className="h-2 w-2 rounded-full bg-cyan-400 animate-pulse" />
                    TELEMETRY VERIFIED
                  </span>
                )}
              </div>
            </div>

            {/* Strategic Reserve Fill Level Progress Bar */}
            <div className="mt-4 space-y-2">
              <div className="flex items-center justify-between text-xs font-mono">
                <span className="text-[#9CA3AF]">Reserve Fill Level</span>
                <span className="text-[#F3F4F6]">
                  <strong className="text-cyan-400">{formatValue(liveState.currentReserve)}</strong> / {formatValue(liveState.totalCapacity)} tonnes ({((liveState.currentReserve / liveState.totalCapacity) * 100).toFixed(1)}%)
                </span>
              </div>
              <div className="relative h-3 w-full rounded-full bg-[#1A1A22] border border-[#2A2A36] overflow-hidden p-0.5">
                <div
                  className="absolute top-0 bottom-0 bg-amber-500/30 border-r-2 border-amber-400 z-10"
                  style={{ width: `${(liveState.minimumReserveThreshold / liveState.totalCapacity) * 100}%` }}
                  title="Mandatory Statutory Safety Floor"
                />
                <div
                  className="h-full rounded-full bg-gradient-to-r from-cyan-600 via-cyan-400 to-emerald-400 transition-all duration-500"
                  style={{ width: `${(liveState.currentReserve / liveState.totalCapacity) * 100}%` }}
                />
              </div>
              <div className="flex items-center justify-between text-[10px] text-[#6B7280]">
                <span>0 Tonnes</span>
                <span className="text-amber-400/90 font-mono">▲ Statutory Safety Floor ({formatValue(liveState.minimumReserveThreshold)} t)</span>
                <span>Nameplate Cap: {formatValue(liveState.totalCapacity)} t</span>
              </div>
            </div>
          </section>

          {/* ISPRL Facilities Detailed Cards */}
          <section className="rounded-xl border border-[#22222A] bg-[#121215] p-5 shadow-sm space-y-4">
            <div className="flex items-center justify-between border-b border-[#1E1E26] pb-3">
              <h3 className="text-sm font-semibold text-[#F3F4F6]">India Strategic Petroleum Reserves (ISPRL) Facilities</h3>
              <span className="text-xs text-[#9CA3AF]">Phase 1 Underground Rock Caverns</span>
            </div>

            <div className="grid gap-4 sm:grid-cols-3">
              <div className="rounded-lg border border-[#22222A] bg-[#18181E] p-4 space-y-3">
                <div className="flex items-center justify-between">
                  <span className="text-sm font-semibold text-[#F3F4F6]">Visakhapatnam</span>
                  <span className="text-xs font-mono text-cyan-400 font-bold">1.33 MMT</span>
                </div>
                <p className="text-xs text-[#9CA3AF] leading-relaxed">
                  Underground rock cavern facility serving eastern sea-board refineries and petrochemical complexes.
                </p>
                <div className="pt-2 border-t border-[#22222A] flex items-center justify-between text-xs text-[#6B7280]">
                  <span>~9.77 Million Barrels</span>
                  <span className="text-emerald-400 font-medium">Operational</span>
                </div>
              </div>

              <div className="rounded-lg border border-[#22222A] bg-[#18181E] p-4 space-y-3">
                <div className="flex items-center justify-between">
                  <span className="text-sm font-semibold text-[#F3F4F6]">Mangalore</span>
                  <span className="text-xs font-mono text-cyan-400 font-bold">1.50 MMT</span>
                </div>
                <p className="text-xs text-[#9CA3AF] leading-relaxed">
                  Underground rock cavern storage facility with 2 separate compartments handling crude grades.
                </p>
                <div className="pt-2 border-t border-[#22222A] flex items-center justify-between text-xs text-[#6B7280]">
                  <span>~11.0 Million Barrels</span>
                  <span className="text-emerald-400 font-medium">Operational</span>
                </div>
              </div>

              <div className="rounded-lg border border-[#22222A] bg-[#18181E] p-4 space-y-3">
                <div className="flex items-center justify-between">
                  <span className="text-sm font-semibold text-[#F3F4F6]">Padur</span>
                  <span className="text-xs font-mono text-cyan-400 font-bold">2.50 MMT</span>
                </div>
                <p className="text-xs text-[#9CA3AF] leading-relaxed">
                  Largest Phase-1 underground storage site with 4 independent cavern compartments.
                </p>
                <div className="pt-2 border-t border-[#22222A] flex items-center justify-between text-xs text-[#6B7280]">
                  <span>~18.37 Million Barrels</span>
                  <span className="text-emerald-400 font-medium">Operational</span>
                </div>
              </div>
            </div>
          </section>
        </div>
      )}

      {/* TAB 3: BACKUP CRUDE SUPPLY & SUPPLIERS */}
      {mainTab === 'suppliers' && (
        <div className="space-y-6">
          {/* Backup Supply Summary Header */}
          <section className="rounded-xl border border-[#22222A] bg-[#121215] p-5 shadow-sm space-y-3">
            <div className="flex items-center justify-between border-b border-[#1E1E26] pb-3">
              <div className="flex items-center gap-2.5">
                <div className="p-1.5 rounded-lg bg-indigo-500/10 text-indigo-400 border border-indigo-500/20">
                  <Globe className="h-5 w-5" />
                </div>
                <div>
                  <h2 className="text-base font-semibold text-[#F3F4F6]">Import Origins</h2>
                </div>
              </div>
              <span className="text-xs font-mono text-indigo-400 bg-indigo-950/40 px-2.5 py-1 rounded border border-indigo-800/40">
                {realProcurement?.supplierCount || 41} Active Origins
              </span>
            </div>

            <div className="grid gap-3 sm:grid-cols-3">
              <div className="rounded-lg border border-[#22222A] bg-[#18181E] p-3.5">
                <p className="text-[10px] font-semibold uppercase tracking-wider text-[#9CA3AF]">Alternative Daily Capacity</p>
                <p className="mt-1 font-mono text-lg font-bold text-indigo-400">
                  {realProcurement ? formatValue(realProcurement.availableAlternativeDailyTonnes) : 'N/A'} <span className="text-xs font-normal text-[#9CA3AF]">t/d</span>
                </p>
              </div>
              <div className="rounded-lg border border-[#22222A] bg-[#18181E] p-3.5">
                <p className="text-[10px] font-semibold uppercase tracking-wider text-[#9CA3AF]">Annual Crude Imports</p>
                <p className="mt-1 font-mono text-lg font-bold text-[#F3F4F6]">
                  {realProcurement ? formatValue(realProcurement.totalAnnualImportTonnes) : 'N/A'} <span className="text-xs font-normal text-[#9CA3AF]">t/yr</span>
                </p>
              </div>
              <div className="rounded-lg border border-[#22222A] bg-[#18181E] p-3.5">
                <p className="text-[10px] font-semibold uppercase tracking-wider text-[#9CA3AF]">Active Trade Partners</p>
                <p className="mt-1 font-mono text-lg font-bold text-emerald-400">
                  {realProcurement?.supplierCount || 41} <span className="text-xs font-normal text-[#9CA3AF]">countries</span>
                </p>
              </div>
            </div>
          </section>

          {/* Supplier Grid */}
          <section className="rounded-xl border border-[#22222A] bg-[#121215] p-5 shadow-sm space-y-4">
            <div className="flex items-center justify-between border-b border-[#1E1E26] pb-3">
              <h3 className="text-xs font-semibold text-[#F3F4F6]">Select a Supplier to Apply Daily Import Capacity to Optimizer</h3>
              <span className="text-[11px] text-[#9CA3AF]">Click supplier origin card</span>
            </div>

            {realProcurement && realProcurement.suppliers.length > 0 ? (
              <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
                {realProcurement.suppliers.map((s) => (
                  <button
                    key={s.countryId}
                    type="button"
                    onClick={() => {
                      handleApplyRealAlternative(s.dailyCapacityTonnes);
                      setMainTab('optimizer');
                    }}
                    className="flex flex-col text-left rounded-lg border border-[#22222A] bg-[#18181E] p-3 hover:border-indigo-500/50 hover:bg-indigo-950/20 transition group shadow-sm"
                  >
                    <div className="flex items-center justify-between w-full">
                      <span className="text-xs font-semibold text-[#F3F4F6] group-hover:text-indigo-300">{s.canonicalName}</span>
                      <span className="text-[10px] font-mono px-1.5 py-0.5 rounded bg-indigo-950/70 text-indigo-400 border border-indigo-800/40">
                        {s.shareOfTotalImportsPercent}%
                      </span>
                    </div>
                    <div className="mt-2 flex items-center justify-between w-full text-xs text-[#9CA3AF]">
                      <span>{formatValue(s.dailyCapacityTonnes)} t/d</span>
                      <span className="text-[10px] text-[#6B7280]">{formatValue(s.annualQuantityTonnes)} t/yr</span>
                    </div>
                  </button>
                ))}
              </div>
            ) : (
              <div className="p-8 text-center text-xs text-[#9CA3AF]">
                Supplier import origins data loading or unavailable.
              </div>
            )}
          </section>
        </div>
      )}
    </div>
  );
};

const ParameterCard: React.FC<{
  label: string;
  value: number;
  detail: string;
  badge?: string;
  unit?: string;
  highlight?: boolean;
}> = ({ label, value, detail, badge, unit, highlight }) => (
  <div className={`rounded-lg border px-3 py-2.5 ${
    highlight ? 'border-orange-500/40 bg-orange-950/10' : 'border-[#2A2A2A] bg-[#121212]'
  }`}>
    <div className="flex items-center justify-between">
      <p className="text-[11px] font-semibold uppercase tracking-wider text-[#888888]">{label}</p>
      {badge && (
        <span className="text-[9px] font-mono px-1.5 py-0.5 rounded bg-orange-950/60 text-orange-300 border border-orange-800/60 font-semibold">
          {badge}
        </span>
      )}
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
  unit?: string;
  onChange: (val: number) => void;
  detail?: string;
  badge?: string;
}> = ({ label, value, unit, onChange, detail, badge }) => {
  const [localVal, setLocalVal] = useState<string>(value.toString());

  useEffect(() => {
    setLocalVal(value.toString());
  }, [value]);

  const commitValue = () => {
    const parsed = Number(localVal);
    const validVal = isNaN(parsed) || localVal.trim() === '' ? 0 : Math.max(0, parsed);
    if (validVal !== value) {
      onChange(validVal);
    }
  };

  return (
    <div className="rounded-lg border border-[#333333] bg-[#121212] px-3 py-2.5">
      <div className="flex items-center justify-between">
        <label className="text-[11px] font-semibold uppercase tracking-wider text-[#888888] block">
          {label}
        </label>
        {badge && (
          <span className="text-[9px] font-mono px-1.5 py-0.5 rounded bg-orange-950/60 text-orange-300 border border-orange-800/60 font-semibold">
            {badge}
          </span>
        )}
      </div>
      <div className="relative mt-1">
        <input
          type="number"
          value={localVal}
          min="0"
          onChange={(e) => {
            setLocalVal(e.target.value);
          }}
          onKeyDown={(e) => {
            if (e.key === 'Enter') {
              commitValue();
              (e.target as HTMLInputElement).blur();
            }
          }}
          onBlur={commitValue}
          className="w-full rounded bg-[#1A1A1A] border border-[#383838] pl-2.5 pr-20 py-1.5 font-mono text-sm font-semibold text-[#EDEDED] focus:border-orange-500 focus:outline-none"
        />
        {unit && (
          <span className="absolute right-2.5 top-2 text-[11px] font-mono text-orange-400 pointer-events-none font-semibold">
            {unit}
          </span>
        )}
      </div>
      {detail && <p className="mt-1 text-[10px] text-[#777777]">{detail}</p>}
    </div>
  );
};
