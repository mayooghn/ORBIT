import React, { useCallback, useEffect, useState } from 'react';
import { Calculator, Database, ShieldCheck } from 'lucide-react';
import { ErrorState } from '../components/common/ErrorState';
import { LoadingState } from '../components/common/LoadingState';
import { MetricCard } from '../components/common/MetricCard';
import { PageHeader } from '../components/common/PageHeader';
import { StatusBadge } from '../components/common/StatusBadge';
import {
  optimizeStrategicReserve,
} from '../services/api';
import type {
  StrategicReserveOptimizationInput,
  StrategicReserveOptimizationResult,
} from '../reserves/model';

export const ROUND_ONE_RESERVE_DEMO_INPUT: StrategicReserveOptimizationInput = {
  currentReserve: 5_000_000,
  demand: 4_500_000,
  supplyGap: 100_000,
  disruptionDuration: 30,
  alternativeProcurement: 25_000,
  replenishmentRate: 20_000,
  minimumReserveThreshold: 1_500_000,
};

const formatValue = (value: number): string =>
  value.toLocaleString(undefined, { maximumFractionDigits: 2 });

const ResultMetric: React.FC<{
  label: string;
  value: string;
  detail?: string;
}> = ({ label, value, detail }) => (
  <div className="rounded-lg border border-[#222222] bg-[#121212] p-4">
    <p className="text-xs font-semibold uppercase tracking-widest text-[#666666]">{label}</p>
    <p className="mt-2 font-mono text-2xl font-bold text-[#EDEDED]">{value}</p>
    {detail && <p className="mt-1 text-xs text-[#777777]">{detail}</p>}
  </div>
);

export const ReservesPage: React.FC = () => {
  const [result, setResult] = useState<StrategicReserveOptimizationResult | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  const runOptimization = useCallback(async () => {
    setLoading(true);
    setError('');

    try {
      const response = await optimizeStrategicReserve(ROUND_ONE_RESERVE_DEMO_INPUT);
      setResult(response);
    } catch (requestError) {
      setResult(null);
      setError(requestError instanceof Error ? requestError.message : 'Reserve optimization failed.');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void runOptimization();
  }, [runOptimization]);

  const coverageIsComplete = result?.fullyCovered === true;

  return (
    <div className="space-y-6">
      <PageHeader
        title="Strategic Reserves"
        subtitle="Calculate how much strategic reserve India should release during a disruption."
        badgeText={result ? 'OPTIMIZATION READY' : 'ROUND 1 DEMO'}
        badgeLevel={result ? 'AVAILABLE' : 'UNKNOWN'}
        actions={(
          <button
            type="button"
            onClick={() => void runOptimization()}
            disabled={loading}
            className="inline-flex items-center gap-2 rounded-lg bg-orange-500 px-4 py-2.5 text-sm font-semibold text-slate-950 transition-colors hover:bg-orange-400 disabled:cursor-not-allowed disabled:opacity-60"
          >
            <Calculator className="h-4 w-4" />
            {loading ? 'Calculating...' : 'Run Reserve Optimization'}
          </button>
        )}
      />

      <section className="rounded-xl border border-orange-500/30 bg-orange-500/5 p-5 dark:bg-orange-950/10">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
          <div>
            <div className="flex items-center gap-2">
              <Database className="h-5 w-5 text-orange-400" />
              <h2 className="text-lg font-semibold text-[#EDEDED]">Round 1 Demo Inputs</h2>
              <StatusBadge level="UNKNOWN" label="DEMO / MOCK DATA" size="sm" />
            </div>
            <p className="mt-2 max-w-2xl text-sm leading-relaxed text-[#999999]">
              These illustrative inputs are sent to the real Phase 8 reserve optimizer. The result below is never calculated or hardcoded in the UI.
            </p>
          </div>
          <span className="text-xs font-mono uppercase tracking-wider text-orange-300">Not live telemetry</span>
        </div>

        <div className="mt-5 grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
          <DemoInput label="Current reserve" value={ROUND_ONE_RESERVE_DEMO_INPUT.currentReserve} />
          <DemoInput label="Demand" value={ROUND_ONE_RESERVE_DEMO_INPUT.demand} />
          <DemoInput label="Supply gap" value={ROUND_ONE_RESERVE_DEMO_INPUT.supplyGap} />
          <DemoInput label="Disruption duration" value={ROUND_ONE_RESERVE_DEMO_INPUT.disruptionDuration} detail="days" />
          <DemoInput label="Alternative procurement" value={ROUND_ONE_RESERVE_DEMO_INPUT.alternativeProcurement} />
          <DemoInput label="Replenishment rate" value={ROUND_ONE_RESERVE_DEMO_INPUT.replenishmentRate} detail="per day" />
          <DemoInput label="Minimum reserve threshold" value={ROUND_ONE_RESERVE_DEMO_INPUT.minimumReserveThreshold} />
        </div>
      </section>

      {loading && (
        <LoadingState
          message="Running Phase 8 reserve optimizer"
          subtext="Sending Round 1 demo inputs to the real ORBIT API"
        />
      )}

      {!loading && error && (
        <ErrorState
          title="Reserve optimization failed"
          message={error}
          onRetry={() => void runOptimization()}
        />
      )}

      {!loading && !error && result && (
        <section className="space-y-5 rounded-xl border border-[#222222] bg-[#0F0F0F] p-5">
          <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <div className="flex items-center gap-2">
                <ShieldCheck className="h-5 w-5 text-emerald-400" />
                <h2 className="text-lg font-semibold text-[#EDEDED]">Reserve Optimization Result</h2>
              </div>
              <p className="mt-1 text-sm text-[#888888]">Actual response from the deterministic Phase 8 calculation.</p>
            </div>
            <StatusBadge
              level={coverageIsComplete ? 'AVAILABLE' : 'ELEVATED'}
              label={result.coverageStatus.replaceAll('_', ' ')}
              size="sm"
            />
          </div>

          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
            <MetricCard title="Current reserve" value={formatValue(ROUND_ONE_RESERVE_DEMO_INPUT.currentReserve)} subtext="Round 1 demo input" icon={Database} statusColor="cyan" />
            <MetricCard title="Effective supply gap" value={formatValue(result.effectiveGap)} subtext="After alternative procurement" icon={Calculator} statusColor="amber" />
            <MetricCard title="Drawdown amount" value={formatValue(result.drawdownAmount)} subtext="Recommended release" icon={ShieldCheck} statusColor={coverageIsComplete ? 'emerald' : 'amber'} />
            <MetricCard title="Remaining reserve" value={formatValue(result.remainingReserve)} subtext="After drawdown" icon={Database} statusColor="emerald" />
          </div>

          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
            <ResultMetric label="Drawdown rate" value={formatValue(result.drawdownRate)} detail="reserve units per day" />
            <ResultMetric label="Duration" value={`${formatValue(result.duration)} days`} />
            <ResultMetric label="Replenishment requirement" value={formatValue(result.replenishmentRequirement)} detail="reserve units" />
            <ResultMetric label="Fully covered" value={result.fullyCovered ? 'YES' : 'NO'} detail={`Shortfall: ${formatValue(result.shortfall)}`} />
          </div>
        </section>
      )}
    </div>
  );
};

const DemoInput: React.FC<{
  label: string;
  value: number;
  detail?: string;
}> = ({ label, value, detail = 'illustrative reserve units' }) => (
  <div className="rounded-lg border border-[#2A2A2A] bg-[#121212] px-3 py-2.5">
    <p className="text-[11px] font-semibold uppercase tracking-wider text-[#666666]">{label}</p>
    <p className="mt-1 font-mono text-sm font-semibold text-[#EDEDED]">{formatValue(value)}</p>
    <p className="mt-0.5 text-[11px] text-[#777777]">{detail}</p>
  </div>
);
