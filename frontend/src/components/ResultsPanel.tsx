import { useState } from 'react';
import { useStore } from '../store/useStore';
import { Card, CardContent, CardHeader, CardTitle } from './ui';
import type { ScenarioResult, BottleneckType } from '../types';
import { formatNumber, formatPercent, formatCI, cn } from '../lib/utils';

function BottleneckBadge({ type }: { type: BottleneckType }) {
  const styles = {
    NONE: 'bg-green-100 text-green-800',
    ENTRY: 'bg-red-100 text-red-800',
    EXIT: 'bg-red-100 text-red-800',
    BOTH: 'bg-red-100 text-red-800',
  };

  return (
    <span className={cn('px-2.5 py-1 rounded-full text-xs font-semibold', styles[type])}>
      {type}
    </span>
  );
}

function HeadlineMetric({
  label,
  value,
  subValue,
  status,
}: {
  label: string;
  value: React.ReactNode;
  subValue?: string;
  status: 'success' | 'error' | 'neutral';
}) {
  const statusStyles = {
    success: 'border-l-green-500 bg-green-50',
    error: 'border-l-red-500 bg-red-50',
    neutral: 'border-l-gray-300 bg-gray-50',
  };

  const valueStyles = {
    success: 'text-green-700',
    error: 'text-red-700',
    neutral: 'text-gray-700',
  };

  return (
    <div className={cn('rounded-lg border-l-4 p-4', statusStyles[status])}>
      <p className="text-xs font-medium text-gray-500 uppercase tracking-wide">{label}</p>
      <p className={cn('text-2xl font-bold mt-1', valueStyles[status])}>{value}</p>
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
    <Card className="overflow-hidden">
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <CardTitle>{result.scenario_name}</CardTitle>
          <div className="flex items-center gap-2">
            {result.passed ? (
              <span className="flex items-center gap-1 text-sm font-medium text-green-600">
                <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 20 20">
                  <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
                </svg>
                PASSED
              </span>
            ) : (
              <span className="flex items-center gap-1 text-sm font-medium text-red-600">
                <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 20 20">
                  <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z" clipRule="evenodd" />
                </svg>
                FAILED
              </span>
            )}
          </div>
        </div>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Headline Metrics */}
        <div className="grid grid-cols-3 gap-3">
          <HeadlineMetric
            label="Capacity"
            value={rejectionFailed ? 'OVER' : 'OK'}
            subValue={`${formatPercent(metrics.rejection_rate)} rejected`}
            status={rejectionFailed ? 'error' : 'success'}
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
          />
          <HeadlineMetric
            label="Bottleneck"
            value={<BottleneckBadge type={result.bottleneck} />}
            status={result.bottleneck === 'NONE' ? 'success' : 'error'}
          />
        </div>

        {/* Secondary Metrics Grid */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 pt-2">
          <div className="text-center p-3 bg-gray-50 rounded-lg">
            <p className="text-xs text-gray-500">Avg Occupancy</p>
            <p className="text-lg font-semibold text-gray-900">{formatPercent(metrics.avg_occupancy_pct)}</p>
          </div>
          <div className="text-center p-3 bg-gray-50 rounded-lg">
            <p className="text-xs text-gray-500">Time at Full</p>
            <p className="text-lg font-semibold text-gray-900">{formatPercent(metrics.pct_time_full)}</p>
          </div>
          <div className="text-center p-3 bg-gray-50 rounded-lg">
            <p className="text-xs text-gray-500">Exit Queue Max</p>
            <p className="text-lg font-semibold text-gray-900">{metrics.exit_wait.queue_max}</p>
          </div>
          <div className="text-center p-3 bg-gray-50 rounded-lg">
            <p className="text-xs text-gray-500">Throughput</p>
            <p className="text-lg font-semibold text-gray-900">{formatNumber(metrics.throughput_per_hour, 0)}/hr</p>
          </div>
        </div>

        {/* Details Accordion */}
        <div className="pt-2">
          <button
            onClick={() => setShowDetails(!showDetails)}
            className="flex items-center gap-2 text-sm text-gray-500 hover:text-gray-700"
          >
            <svg
              className={cn('w-4 h-4 transition-transform', showDetails && 'rotate-90')}
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
            </svg>
            {showDetails ? 'Hide' : 'Show'} Details
          </button>
          {showDetails && (
            <div className="mt-3 p-3 bg-gray-50 rounded-lg overflow-x-auto">
              <pre className="text-xs text-gray-600">{JSON.stringify(metrics, null, 2)}</pre>
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
      className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider cursor-pointer hover:bg-gray-100"
    >
      <div className="flex items-center gap-1">
        {label}
        {sortKey === sortId && (
          <svg
            className={cn('w-3 h-3', sortDir === 'desc' && 'rotate-180')}
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
    <Card>
      <CardHeader>
        <CardTitle>Comparison</CardTitle>
      </CardHeader>
      <div className="overflow-x-auto">
        <table className="min-w-full divide-y divide-gray-200">
          <thead className="bg-gray-50">
            <tr>
              <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                Scenario
              </th>
              <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                Status
              </th>
              <SortHeader label="Exit p95" sortId="exit_p95" />
              <SortHeader label="Rejection" sortId="rejection" />
              <SortHeader label="Time Full" sortId="time_full" />
              <SortHeader label="Queue Max" sortId="queue_max" />
              <SortHeader label="Throughput" sortId="throughput" />
            </tr>
          </thead>
          <tbody className="bg-white divide-y divide-gray-200">
            {sortedResults.map((r) => (
              <tr key={r.scenario_name} className="hover:bg-gray-50">
                <td className="px-4 py-3 whitespace-nowrap text-sm font-medium text-gray-900">
                  {r.scenario_name}
                </td>
                <td className="px-4 py-3 whitespace-nowrap">
                  {r.passed ? (
                    <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-green-100 text-green-800">
                      PASS
                    </span>
                  ) : (
                    <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-red-100 text-red-800">
                      FAIL
                    </span>
                  )}
                </td>
                <td
                  className={cn(
                    'px-4 py-3 whitespace-nowrap text-sm',
                    r.metrics.exit_wait.p95_minutes === bestExitP95 && 'text-green-600 font-semibold'
                  )}
                >
                  {formatNumber(r.metrics.exit_wait.p95_minutes, 2)} min
                </td>
                <td
                  className={cn(
                    'px-4 py-3 whitespace-nowrap text-sm',
                    r.metrics.rejection_rate === bestRejection && 'text-green-600 font-semibold'
                  )}
                >
                  {formatPercent(r.metrics.rejection_rate)}
                </td>
                <td
                  className={cn(
                    'px-4 py-3 whitespace-nowrap text-sm',
                    r.metrics.pct_time_full === bestTimeFull && 'text-green-600 font-semibold'
                  )}
                >
                  {formatPercent(r.metrics.pct_time_full)}
                </td>
                <td
                  className={cn(
                    'px-4 py-3 whitespace-nowrap text-sm',
                    r.metrics.exit_wait.queue_max === bestQueueMax && 'text-green-600 font-semibold'
                  )}
                >
                  {r.metrics.exit_wait.queue_max}
                </td>
                <td
                  className={cn(
                    'px-4 py-3 whitespace-nowrap text-sm',
                    r.metrics.throughput_per_hour === bestThroughput && 'text-green-600 font-semibold'
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
      <div className="flex flex-col items-center justify-center h-64 text-gray-500">
        <div className="w-10 h-10 border-4 border-primary-200 border-t-primary-600 rounded-full animate-spin mb-4" />
        <p className="text-sm">Running simulation...</p>
      </div>
    );
  }

  if (!hasResults) {
    return (
      <div className="flex flex-col items-center justify-center h-64 text-gray-400">
        <svg className="w-16 h-16 mb-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth={1.5}
            d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z"
          />
        </svg>
        <p className="text-sm">No results yet</p>
        <p className="text-xs mt-1">Run a simulation to see results</p>
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
      <div className="space-y-4">
        {results.map((result) => (
          <ScenarioResultCard key={result.scenario_name} result={result} config={config} />
        ))}
      </div>

      {/* Metadata */}
      {lastMetadata && (
        <div className="text-xs text-gray-400 grid grid-cols-2 sm:grid-cols-4 gap-2 p-4 bg-gray-50 rounded-lg">
          <div>
            <span className="font-medium">Engine:</span> v{lastMetadata.engine_version}
          </div>
          <div>
            <span className="font-medium">RNG:</span> {lastMetadata.rng_algorithm}
          </div>
          <div>
            <span className="font-medium">Iterations:</span> {lastMetadata.iterations}
          </div>
          <div>
            <span className="font-medium">Time:</span> {lastMetadata.execution_time_ms}ms
          </div>
        </div>
      )}
    </div>
  );
}
