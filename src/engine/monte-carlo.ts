import { PCG64 } from './pcg.js';
import { runSimulation } from './simulation.js';
import {
  Scenario,
  SimulationConfig,
  RunMetrics,
  ScenarioMetrics,
  ScenarioResult,
  BottleneckType,
  DEFAULT_CONFIG
} from '../types/index.js';

/**
 * Calculate percentile from sorted array
 */
function percentile(sorted: number[], p: number): number {
  if (sorted.length === 0) return 0;
  const index = (p / 100) * (sorted.length - 1);
  const lower = Math.floor(index);
  const upper = Math.ceil(index);
  if (lower === upper) return sorted[lower];
  return sorted[lower] + (sorted[upper] - sorted[lower]) * (index - lower);
}

/**
 * Bootstrap confidence interval
 */
function bootstrapCI(
  data: number[],
  statFn: (arr: number[]) => number,
  rng: PCG64,
  resamples: number = 1000,
  confidence: number = 0.95
): [number, number] {
  if (data.length === 0) return [0, 0];

  const bootstrapStats: number[] = [];

  for (let i = 0; i < resamples; i++) {
    const sample: number[] = [];
    for (let j = 0; j < data.length; j++) {
      const idx = Math.floor(rng.random() * data.length);
      sample.push(data[idx]);
    }
    bootstrapStats.push(statFn(sample));
  }

  bootstrapStats.sort((a, b) => a - b);

  const alpha = 1 - confidence;
  const lowerIdx = Math.floor((alpha / 2) * resamples);
  const upperIdx = Math.floor((1 - alpha / 2) * resamples);

  return [bootstrapStats[lowerIdx], bootstrapStats[upperIdx]];
}

/**
 * Aggregate metrics from multiple runs
 */
function aggregateMetrics(
  runMetrics: RunMetrics[],
  config: SimulationConfig,
  rng: PCG64
): ScenarioMetrics {
  // Pool all observations across runs
  const allEntryWaits: number[] = [];
  const allExitWaits: number[] = [];
  const allOccupancies: number[] = [];
  const allExitQueues: number[] = [];

  let totalArrivals = 0;
  let totalExits = 0;
  let totalRejections = 0;
  let maxOccupancy = 0;
  let maxEntryQueue = 0;
  let maxExitQueue = 0;
  let totalTimeAtFull = 0;

  for (const run of runMetrics) {
    allEntryWaits.push(...run.entryWaitTimes);
    allExitWaits.push(...run.exitWaitTimes);
    allOccupancies.push(...run.occupancySamples);
    allExitQueues.push(...run.exitQueueSamples);

    totalArrivals += run.totalArrivals;
    totalExits += run.totalExits;
    totalRejections += run.rejections;
    maxOccupancy = Math.max(maxOccupancy, run.maxOccupancy);
    maxEntryQueue = Math.max(maxEntryQueue, run.maxEntryQueue);
    maxExitQueue = Math.max(maxExitQueue, run.maxExitQueue);
    totalTimeAtFull += run.timeAtFullCapacity;
  }

  // Average arrivals per run
  const avgArrivalsPerRun = totalArrivals / runMetrics.length;
  const avgExitsPerRun = totalExits / runMetrics.length;
  const avgRejectionsPerRun = totalRejections / runMetrics.length;

  // Calculate rejection rate and CI
  const rejectionRates = runMetrics.map(r =>
    r.totalArrivals > 0 ? r.rejections / r.totalArrivals : 0
  );
  const avgRejectionRate = avgArrivalsPerRun > 0 ? avgRejectionsPerRun / avgArrivalsPerRun : 0;
  const rejectionRateCI = bootstrapCI(
    rejectionRates,
    arr => arr.reduce((a, b) => a + b, 0) / arr.length,
    rng
  );

  // Sort for percentile calculations
  allEntryWaits.sort((a, b) => a - b);
  allExitWaits.sort((a, b) => a - b);

  // Entry wait metrics
  const entryWaitAvg = allEntryWaits.length > 0
    ? allEntryWaits.reduce((a, b) => a + b, 0) / allEntryWaits.length
    : 0;
  const entryWaitP95 = percentile(allEntryWaits, 95);

  // Exit wait metrics
  const exitWaitAvg = allExitWaits.length > 0
    ? allExitWaits.reduce((a, b) => a + b, 0) / allExitWaits.length
    : 0;
  const exitWaitP90 = percentile(allExitWaits, 90);
  const exitWaitP95 = percentile(allExitWaits, 95);
  const exitWaitP99 = percentile(allExitWaits, 99);

  // Bootstrap CI for exit p95
  const exitP95CI = bootstrapCI(
    allExitWaits,
    arr => {
      const sorted = [...arr].sort((a, b) => a - b);
      return percentile(sorted, 95);
    },
    rng
  );

  // Occupancy metrics
  const avgOccupancy = allOccupancies.length > 0
    ? allOccupancies.reduce((a, b) => a + b, 0) / allOccupancies.length
    : 0;

  // Exit queue metrics
  const avgExitQueue = allExitQueues.length > 0
    ? allExitQueues.reduce((a, b) => a + b, 0) / allExitQueues.length
    : 0;

  // Time at full capacity (as percentage)
  const metricsCollectionDuration =
    config.warm_up_minutes + config.stabilization_buffer_minutes;
  const avgTimeAtFull = totalTimeAtFull / runMetrics.length;
  const pctTimeFull = metricsCollectionDuration > 0
    ? avgTimeAtFull / metricsCollectionDuration
    : 0;

  // Throughput (exits per hour during metrics collection period)
  const throughputPerHour = metricsCollectionDuration > 0
    ? (avgExitsPerRun / metricsCollectionDuration) * 60
    : 0;

  return {
    avg_occupancy_pct: avgOccupancy,
    max_occupancy: maxOccupancy,
    pct_time_full: Math.min(1, pctTimeFull),
    rejection_rate: avgRejectionRate,
    rejection_rate_ci: [
      Math.max(0, rejectionRateCI[0]),
      Math.min(1, rejectionRateCI[1])
    ],
    entry_wait: {
      avg_seconds: entryWaitAvg,
      p95_seconds: entryWaitP95,
      queue_max: maxEntryQueue
    },
    exit_wait: {
      avg_minutes: exitWaitAvg,
      p90_minutes: exitWaitP90,
      p95_minutes: exitWaitP95,
      p95_ci: [Math.max(0, exitP95CI[0]), exitP95CI[1]],
      p99_minutes: exitWaitP99,
      queue_max: maxExitQueue,
      queue_avg: avgExitQueue
    },
    throughput_per_hour: throughputPerHour,
    arrivals_total: Math.round(avgArrivalsPerRun),
    exits_total: Math.round(avgExitsPerRun)
  };
}

/**
 * Classify bottleneck based on thresholds
 */
function classifyBottleneck(
  metrics: ScenarioMetrics,
  thresholds: { rejection_rate: number; exit_p95_sla_minutes: number }
): BottleneckType {
  const entryFailed = metrics.rejection_rate > thresholds.rejection_rate;
  const exitFailed = metrics.exit_wait.p95_minutes > thresholds.exit_p95_sla_minutes;

  if (!entryFailed && !exitFailed) return 'NONE';
  if (entryFailed && !exitFailed) return 'ENTRY';
  if (!entryFailed && exitFailed) return 'EXIT';
  return 'BOTH';
}

/**
 * Run Monte Carlo simulation for a single scenario
 */
export function runMonteCarloScenario(
  scenario: Scenario,
  config: SimulationConfig = DEFAULT_CONFIG
): ScenarioResult {
  const runMetrics: RunMetrics[] = [];

  // Run multiple iterations with different seeds
  for (let i = 0; i < config.iterations; i++) {
    const seed = config.master_seed + i;
    const rng = new PCG64(seed);
    const metrics = runSimulation(scenario, config, rng);
    runMetrics.push(metrics);
  }

  // Aggregate metrics with a fresh RNG for bootstrap
  const bootstrapRng = new PCG64(config.master_seed + config.iterations);
  const aggregatedMetrics = aggregateMetrics(runMetrics, config, bootstrapRng);

  // Calculate total capacity
  const totalCapacity = scenario.capacity.floors * scenario.capacity.spots_per_floor;

  // Normalize occupancy to percentage
  aggregatedMetrics.avg_occupancy_pct = totalCapacity > 0
    ? aggregatedMetrics.avg_occupancy_pct / totalCapacity
    : 0;

  // Classify bottleneck
  const bottleneck = classifyBottleneck(aggregatedMetrics, config.thresholds);

  // Determine pass/fail
  const passed = bottleneck === 'NONE';

  return {
    scenario_name: scenario.name,
    capacity: totalCapacity,
    metrics: aggregatedMetrics,
    bottleneck,
    passed
  };
}

/**
 * Run Monte Carlo simulation for multiple scenarios (can be parallelized)
 */
export async function runMonteCarloSimulation(
  scenarios: Scenario[],
  config: SimulationConfig = DEFAULT_CONFIG
): Promise<ScenarioResult[]> {
  // Run scenarios (could be parallelized with workers in future)
  const results: ScenarioResult[] = [];

  for (const scenario of scenarios) {
    const result = runMonteCarloScenario(scenario, config);
    results.push(result);
  }

  return results;
}
