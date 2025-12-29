import { useState } from 'react';
import { useStore } from '../store/useStore';
import { Card, CardContent, CardHeader, CardTitle } from './ui';
import type { ScenarioResult, BottleneckType } from '../types';
import { formatNumber, formatPercent, formatCI, cn } from '../lib/utils';

function BottleneckBadge({ type }: { type: BottleneckType }) {
  const styles = {
    NONE: 'bg-emerald-100 text-emerald-700 ring-emerald-600/20',
    ENTRY: 'bg-red-100 text-red-700 ring-red-600/20',
    EXIT: 'bg-amber-100 text-amber-700 ring-amber-600/20',
    BOTH: 'bg-red-100 text-red-700 ring-red-600/20',
  };

  return (
    <span className={cn('px-3 py-1 rounded-full text-xs font-semibold ring-1 ring-inset', styles[type])}>
      {type}
    </span>
  );
}

function HeadlineMetric({
  label,
  value,
  subValue,
  status,
  icon,
}: {
  label: string;
  value: React.ReactNode;
  subValue?: string;
  status: 'success' | 'error' | 'neutral';
  icon?: React.ReactNode;
}) {
  const statusStyles = {
    success: 'bg-gradient-to-br from-emerald-50 to-green-50 border-emerald-200/60',
    error: 'bg-gradient-to-br from-red-50 to-rose-50 border-red-200/60',
    neutral: 'bg-gradient-to-br from-gray-50 to-slate-50 border-gray-200/60',
  };

  const valueStyles = {
    success: 'text-emerald-700',
    error: 'text-red-700',
    neutral: 'text-gray-700',
  };

  const iconStyles = {
    success: 'text-emerald-500',
    error: 'text-red-500',
    neutral: 'text-gray-400',
  };

  return (
    <div className={cn('rounded-xl border p-4 transition-all hover:shadow-md', statusStyles[status])}>
      <div className="flex items-start justify-between">
        <p className="text-xs font-medium text-gray-500 uppercase tracking-wide">{label}</p>
        {icon && <span className={cn('opacity-60', iconStyles[status])}>{icon}</span>}
      </div>
      <p className={cn('text-2xl font-bold mt-2', valueStyles[status])}>{value}</p>
      {subValue && <p className="text-xs text-gray-500 mt-1">{subValue}</p>}
    </div>
  );
}

function ScenarioResultCard({ result, config }: { result: ScenarioResult; config: { thresholds: { rejection_rate: number; exit_p95_sla_minutes: number } } }) {
  const [showDetails, setShowDetails] = useState(false);
  const { metrics } = result;

  const rejectionFailed = metrics.rejection_rate > config.thresholds.rejection_rate;
  const exitFailed = metrics.exit_wait.p95_minutes > config.thresholds.exit_p95_sla_minutes;

  return (
    <Card className="overflow-hidden border-gray-200/60 shadow-lg shadow-gray-200/30">
      <CardHeader className="pb-3 bg-gradient-to-r from-gray-50/80 to-white">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className={cn(
              'w-10 h-10 rounded-xl flex items-center justify-center',
              result.passed
                ? 'bg-gradient-to-br from-emerald-500 to-green-600 shadow-lg shadow-emerald-500/30'
                : 'bg-gradient-to-br from-red-500 to-rose-600 shadow-lg shadow-red-500/30'
            )}>
              {result.passed ? (
                <svg className="w-5 h-5 text-white" fill="currentColor" viewBox="0 0 20 20">
                  <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                </svg>
              ) : (
                <svg className="w-5 h-5 text-white" fill="currentColor" viewBox="0 0 20 20">
                  <path fillRule="evenodd" d="M4.293 4.293a1 1 0 011.414 0L10 8.586l4.293-4.293a1 1 0 111.414 1.414L11.414 10l4.293 4.293a1 1 0 01-1.414 1.414L10 11.414l-4.293 4.293a1 1 0 01-1.414-1.414L8.586 10 4.293 5.707a1 1 0 010-1.414z" clipRule="evenodd" />
                </svg>
              )}
            </div>
            <div>
              <CardTitle className="text-lg">{result.scenario_name}</CardTitle>
              <p className={cn('text-xs font-medium mt-0.5', result.passed ? 'text-emerald-600' : 'text-red-600')}>
                {result.passed ? 'All thresholds met' : 'Threshold exceeded'}
              </p>
            </div>
          </div>
          <span className={cn(
            'px-3 py-1.5 rounded-lg text-sm font-bold',
            result.passed
              ? 'bg-emerald-100 text-emerald-700'
              : 'bg-red-100 text-red-700'
          )}>
            {result.passed ? 'PASSED' : 'FAILED'}
          </span>
        </div>
      </CardHeader>
      <CardContent className="space-y-5 pt-5">
        {/* Headline Metrics */}
        <div className="grid grid-cols-3 gap-4">
          <HeadlineMetric
            label="Capacity"
            value={rejectionFailed ? 'OVER' : 'OK'}
            subValue={`${formatPercent(metrics.rejection_rate)} rejected`}
            status={rejectionFailed ? 'error' : 'success'}
            icon={
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4" />
              </svg>
            }
          />
          <HeadlineMetric
            label="Exit p95"
            value={`${formatNumber(metrics.exit_wait.p95_minutes, 1)} min`}
            subValue={
              metrics.exit_wait.p95_ci
                ? `CI: ${formatCI(metrics.exit_wait.p95_ci, (n) => formatNumber(n, 1))}`
                : undefined
            }
            status={exitFailed ? 'error' : 'success'}
            icon={
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
            }
          />
          <HeadlineMetric
            label="Bottleneck"
            value={<BottleneckBadge type={result.bottleneck} />}
            status={result.bottleneck === 'NONE' ? 'success' : 'error'}
            icon={
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M13 10V3L4 14h7v7l9-11h-7z" />
              </svg>
            }
          />
        </div>

        {/* Secondary Metrics Grid */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
          <div className="text-center p-4 bg-slate-50 rounded-xl border border-slate-100">
            <p className="text-xs text-gray-500 font-medium">Avg Occupancy</p>
            <p className="text-xl font-bold text-gray-900 mt-1">{formatPercent(metrics.avg_occupancy_pct)}</p>
          </div>
          <div className="text-center p-4 bg-slate-50 rounded-xl border border-slate-100">
            <p className="text-xs text-gray-500 font-medium">Time at Full</p>
            <p className="text-xl font-bold text-gray-900 mt-1">{formatPercent(metrics.pct_time_full)}</p>
          </div>
          <div className="text-center p-4 bg-slate-50 rounded-xl border border-slate-100">
            <p className="text-xs text-gray-500 font-medium">Exit Queue Max</p>
            <p className="text-xl font-bold text-gray-900 mt-1">{metrics.exit_wait.queue_max}</p>
          </div>
          <div className="text-center p-4 bg-slate-50 rounded-xl border border-slate-100">
            <p className="text-xs text-gray-500 font-medium">Throughput</p>
            <p className="text-xl font-bold text-gray-900 mt-1">{formatNumber(metrics.throughput_per_hour, 0)}/hr</p>
          </div>
        </div>

        {/* Details Accordion */}
        <div className="pt-2 border-t border-gray-100">
          <button
            onClick={() => setShowDetails(!showDetails)}
            className="flex items-center gap-2 text-sm text-gray-500 hover:text-gray-700 transition-colors"
          >
            <svg
              className={cn('w-4 h-4 transition-transform duration-200', showDetails && 'rotate-90')}
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
            </svg>
            {showDetails ? 'Hide' : 'Show'} Raw Metrics
          </button>
          {showDetails && (
            <div className="mt-3 p-4 bg-slate-900 rounded-xl overflow-x-auto">
              <pre className="text-xs text-slate-300 font-mono">{JSON.stringify(metrics, null, 2)}</pre>
            </div>
          )}
        </div>
      </CardContent>
    </Card>
  );
}

function ComparisonTable({ results }: { results: ScenarioResult[] }) {
  const [sortKey, setSortKey] = useState<string | null>(null);
  const [sortDir, setSortDir] = useState<'asc' | 'desc'>('asc');

  const handleSort = (key: string) => {
    if (sortKey === key) {
      setSortDir(sortDir === 'asc' ? 'desc' : 'asc');
    } else {
      setSortKey(key);
      setSortDir('asc');
    }
  };

  const sortedResults = [...results].sort((a, b) => {
    if (!sortKey) return 0;
    let aVal: number, bVal: number;
    switch (sortKey) {
      case 'exit_p95':
        aVal = a.metrics.exit_wait.p95_minutes;
        bVal = b.metrics.exit_wait.p95_minutes;
        break;
      case 'rejection':
        aVal = a.metrics.rejection_rate;
        bVal = b.metrics.rejection_rate;
        break;
      case 'time_full':
        aVal = a.metrics.pct_time_full;
        bVal = b.metrics.pct_time_full;
        break;
      case 'queue_max':
        aVal = a.metrics.exit_wait.queue_max;
        bVal = b.metrics.exit_wait.queue_max;
        break;
      case 'throughput':
        aVal = a.metrics.throughput_per_hour;
        bVal = b.metrics.throughput_per_hour;
        break;
      default:
        return 0;
    }
    return sortDir === 'asc' ? aVal - bVal : bVal - aVal;
  });

  // Find best values
  const bestExitP95 = Math.min(...results.map(r => r.metrics.exit_wait.p95_minutes));
  const bestRejection = Math.min(...results.map(r => r.metrics.rejection_rate));
  const bestTimeFull = Math.min(...results.map(r => r.metrics.pct_time_full));
  const bestQueueMax = Math.min(...results.map(r => r.metrics.exit_wait.queue_max));
  const bestThroughput = Math.max(...results.map(r => r.metrics.throughput_per_hour));

  const SortHeader = ({ label, sortId }: { label: string; sortId: string }) => (
    <th
      onClick={() => handleSort(sortId)}
      className="px-4 py-3 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider cursor-pointer hover:bg-gray-100 transition-colors"
    >
      <div className="flex items-center gap-1">
        {label}
        {sortKey === sortId && (
          <svg
            className={cn('w-3 h-3 transition-transform', sortDir === 'desc' && 'rotate-180')}
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
          >
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 15l7-7 7 7" />
          </svg>
        )}
      </div>
    </th>
  );

  return (
    <Card className="border-gray-200/60 shadow-lg shadow-gray-200/30 overflow-hidden">
      <CardHeader className="bg-gradient-to-r from-gray-50/80 to-white border-b border-gray-100">
        <CardTitle className="flex items-center gap-2">
          <svg className="w-5 h-5 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 17v-2m3 2v-4m3 4v-6m2 10H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
          </svg>
          Scenario Comparison
        </CardTitle>
      </CardHeader>
      <div className="overflow-x-auto">
        <table className="min-w-full divide-y divide-gray-200">
          <thead className="bg-gray-50/50">
            <tr>
              <th className="px-4 py-3 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider">
                Scenario
              </th>
              <th className="px-4 py-3 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider">
                Status
              </th>
              <SortHeader label="Exit p95" sortId="exit_p95" />
              <SortHeader label="Rejection" sortId="rejection" />
              <SortHeader label="Time Full" sortId="time_full" />
              <SortHeader label="Queue Max" sortId="queue_max" />
              <SortHeader label="Throughput" sortId="throughput" />
            </tr>
          </thead>
          <tbody className="bg-white divide-y divide-gray-100">
            {sortedResults.map((r) => (
              <tr key={r.scenario_name} className="hover:bg-blue-50/30 transition-colors">
                <td className="px-4 py-3 whitespace-nowrap text-sm font-medium text-gray-900">
                  {r.scenario_name}
                </td>
                <td className="px-4 py-3 whitespace-nowrap">
                  {r.passed ? (
                    <span className="inline-flex items-center px-2.5 py-1 rounded-md text-xs font-semibold bg-emerald-100 text-emerald-700">
                      PASS
                    </span>
                  ) : (
                    <span className="inline-flex items-center px-2.5 py-1 rounded-md text-xs font-semibold bg-red-100 text-red-700">
                      FAIL
                    </span>
                  )}
                </td>
                <td
                  className={cn(
                    'px-4 py-3 whitespace-nowrap text-sm',
                    r.metrics.exit_wait.p95_minutes === bestExitP95 && 'text-emerald-600 font-semibold'
                  )}
                >
                  {formatNumber(r.metrics.exit_wait.p95_minutes, 2)} min
                </td>
                <td
                  className={cn(
                    'px-4 py-3 whitespace-nowrap text-sm',
                    r.metrics.rejection_rate === bestRejection && 'text-emerald-600 font-semibold'
                  )}
                >
                  {formatPercent(r.metrics.rejection_rate)}
                </td>
                <td
                  className={cn(
                    'px-4 py-3 whitespace-nowrap text-sm',
                    r.metrics.pct_time_full === bestTimeFull && 'text-emerald-600 font-semibold'
                  )}
                >
                  {formatPercent(r.metrics.pct_time_full)}
                </td>
                <td
                  className={cn(
                    'px-4 py-3 whitespace-nowrap text-sm',
                    r.metrics.exit_wait.queue_max === bestQueueMax && 'text-emerald-600 font-semibold'
                  )}
                >
                  {r.metrics.exit_wait.queue_max}
                </td>
                <td
                  className={cn(
                    'px-4 py-3 whitespace-nowrap text-sm',
                    r.metrics.throughput_per_hour === bestThroughput && 'text-emerald-600 font-semibold'
                  )}
                >
                  {formatNumber(r.metrics.throughput_per_hour, 0)}/hr
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </Card>
  );
}

export function ResultsPanel() {
  const { scenarios, config, lastMetadata, isRunningAll } = useStore();

  const results = scenarios
    .filter((s) => s.result !== null)
    .map((s) => s.result!);

  const hasResults = results.length > 0;
  const allRunning = scenarios.every((s) => s.isRunning) || isRunningAll;

  if (allRunning) {
    return (
      <div className="flex flex-col items-center justify-center py-20">
        <div className="relative">
          <div className="w-16 h-16 border-4 border-blue-200 rounded-full"></div>
          <div className="w-16 h-16 border-4 border-blue-600 border-t-transparent rounded-full animate-spin absolute top-0 left-0"></div>
        </div>
        <p className="text-sm font-medium text-gray-600 mt-6">Running simulation...</p>
        <p className="text-xs text-gray-400 mt-1">This may take a few seconds</p>
      </div>
    );
  }

  if (!hasResults) {
    return (
      <div className="flex flex-col items-center justify-center py-16">
        <div className="w-20 h-20 rounded-2xl bg-gradient-to-br from-slate-100 to-slate-200 flex items-center justify-center mb-6">
          <svg className="w-10 h-10 text-slate-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={1.5}
              d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z"
            />
          </svg>
        </div>
        <h3 className="text-lg font-semibold text-gray-900 mb-2">No Results Yet</h3>
        <p className="text-sm text-gray-500 text-center max-w-xs">
          Configure your parking scenario on the left and click <span className="font-medium text-blue-600">"Run Simulation"</span> to see results
        </p>
        <div className="mt-8 flex items-center gap-8 text-xs text-gray-400">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-lg bg-emerald-100 flex items-center justify-center">
              <svg className="w-4 h-4 text-emerald-600" fill="currentColor" viewBox="0 0 20 20">
                <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
              </svg>
            </div>
            <span>Pass/Fail Status</span>
          </div>
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-lg bg-blue-100 flex items-center justify-center">
              <svg className="w-4 h-4 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
            </div>
            <span>Wait Times</span>
          </div>
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-lg bg-amber-100 flex items-center justify-center">
              <svg className="w-4 h-4 text-amber-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
              </svg>
            </div>
            <span>Bottlenecks</span>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Comparison Table - show when multiple results */}
      {results.length > 1 && (
        <ComparisonTable results={results} />
      )}

      {/* Individual Result Cards */}
      <div className="space-y-5">
        {results.map((result) => (
          <ScenarioResultCard key={result.scenario_name} result={result} config={config} />
        ))}
      </div>

      {/* Metadata */}
      {lastMetadata && (
        <div className="flex flex-wrap items-center justify-center gap-4 text-xs text-gray-400 p-4 bg-slate-50 rounded-xl border border-slate-100">
          <div className="flex items-center gap-1.5">
            <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 3v2m6-2v2M9 19v2m6-2v2M5 9H3m2 6H3m18-6h-2m2 6h-2M7 19h10a2 2 0 002-2V7a2 2 0 00-2-2H7a2 2 0 00-2 2v10a2 2 0 002 2zM9 9h6v6H9V9z" />
            </svg>
            <span>Engine v{lastMetadata.engine_version}</span>
          </div>
          <span className="text-gray-300">|</span>
          <div className="flex items-center gap-1.5">
            <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
            </svg>
            <span>{lastMetadata.rng_algorithm}</span>
          </div>
          <span className="text-gray-300">|</span>
          <div className="flex items-center gap-1.5">
            <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 21a4 4 0 01-4-4V5a2 2 0 012-2h4a2 2 0 012 2v12a4 4 0 01-4 4zm0 0h12a2 2 0 002-2v-4a2 2 0 00-2-2h-2.343M11 7.343l1.657-1.657a2 2 0 012.828 0l2.829 2.829a2 2 0 010 2.828l-8.486 8.485M7 17h.01" />
            </svg>
            <span>{lastMetadata.iterations} iterations</span>
          </div>
          <span className="text-gray-300">|</span>
          <div className="flex items-center gap-1.5">
            <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
            <span>{(lastMetadata.execution_time_ms / 1000).toFixed(1)}s</span>
          </div>
        </div>
      )}
    </div>
  );
}
