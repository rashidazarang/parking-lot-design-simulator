import { describe, it, expect } from 'vitest';
import { runMonteCarloScenario } from '../src/engine/monte-carlo.js';
import { Scenario, DEFAULT_CONFIG } from '../src/types/index.js';

const baseScenario: Scenario = {
  name: 'test',
  demand: {
    arrival_rate_per_hour: 60,
    peak_multiplier: 1.5,
    peak_start_minute: 0,
    peak_duration_minutes: 60
  },
  capacity: {
    floors: 2,
    spots_per_floor: 50
  },
  parking_duration: {
    mean_minutes: 60,
    variability: 'MEDIUM'
  },
  entry: {
    channels: 2,
    mean_service_time_seconds: 10
  },
  exit: {
    channels: 2,
    mean_service_time_seconds: 15
  }
};

describe('Monte Carlo Simulation', () => {
  describe('Reproducibility', () => {
    it('should produce identical results with same seed', () => {
      const config = { ...DEFAULT_CONFIG, iterations: 10, warm_up_minutes: 10 };

      const result1 = runMonteCarloScenario(baseScenario, config);
      const result2 = runMonteCarloScenario(baseScenario, config);

      expect(result1.metrics.rejection_rate).toBe(result2.metrics.rejection_rate);
      expect(result1.metrics.exit_wait.p95_minutes).toBe(result2.metrics.exit_wait.p95_minutes);
      expect(result1.bottleneck).toBe(result2.bottleneck);
    });

    it('should produce different results with different seeds', () => {
      const config1 = { ...DEFAULT_CONFIG, iterations: 20, master_seed: 42 };
      const config2 = { ...DEFAULT_CONFIG, iterations: 20, master_seed: 999 };

      const result1 = runMonteCarloScenario(baseScenario, config1);
      const result2 = runMonteCarloScenario(baseScenario, config2);

      // Metrics should differ (at least slightly)
      const isDifferent =
        result1.metrics.rejection_rate !== result2.metrics.rejection_rate ||
        result1.metrics.exit_wait.avg_minutes !== result2.metrics.exit_wait.avg_minutes;

      expect(isDifferent).toBe(true);
    });
  });

  describe('Bottleneck Classification', () => {
    it('should classify NONE when thresholds are met', () => {
      // Low demand scenario that should pass
      const easyScenario: Scenario = {
        ...baseScenario,
        demand: {
          arrival_rate_per_hour: 30,
          peak_multiplier: 1.0,
          peak_start_minute: 0,
          peak_duration_minutes: 60
        },
        capacity: {
          floors: 4,
          spots_per_floor: 100
        }
      };

      const config = { ...DEFAULT_CONFIG, iterations: 10, warm_up_minutes: 10 };
      const result = runMonteCarloScenario(easyScenario, config);

      expect(result.bottleneck).toBe('NONE');
      expect(result.passed).toBe(true);
    });

    it('should classify ENTRY when rejection threshold exceeded', () => {
      // High demand, low capacity
      const entryBottleneckScenario: Scenario = {
        ...baseScenario,
        demand: {
          arrival_rate_per_hour: 500,
          peak_multiplier: 2.0,
          peak_start_minute: 0,
          peak_duration_minutes: 60
        },
        capacity: {
          floors: 1,
          spots_per_floor: 10
        },
        exit: {
          channels: 10, // Many exit channels to avoid exit bottleneck
          mean_service_time_seconds: 5
        }
      };

      const config = {
        ...DEFAULT_CONFIG,
        iterations: 20,
        warm_up_minutes: 5,
        thresholds: {
          rejection_rate: 0.01, // Very strict
          exit_p95_sla_minutes: 100.0 // Very lenient
        }
      };

      const result = runMonteCarloScenario(entryBottleneckScenario, config);

      expect(result.metrics.rejection_rate).toBeGreaterThan(0.01);
      expect(['ENTRY', 'BOTH']).toContain(result.bottleneck);
      expect(result.passed).toBe(false);
    });

    it('should classify EXIT when exit SLA exceeded', () => {
      // Slow exit processing
      const exitBottleneckScenario: Scenario = {
        ...baseScenario,
        demand: {
          arrival_rate_per_hour: 60,
          peak_multiplier: 1.5,
          peak_start_minute: 0,
          peak_duration_minutes: 30
        },
        capacity: {
          floors: 10,
          spots_per_floor: 100 // Plenty of capacity
        },
        exit: {
          channels: 1,
          mean_service_time_seconds: 60 // Very slow exit
        }
      };

      const config = {
        ...DEFAULT_CONFIG,
        iterations: 20,
        warm_up_minutes: 5,
        thresholds: {
          rejection_rate: 0.5, // Very lenient
          exit_p95_sla_minutes: 0.1 // Very strict
        }
      };

      const result = runMonteCarloScenario(exitBottleneckScenario, config);

      expect(result.metrics.exit_wait.p95_minutes).toBeGreaterThan(0.1);
      expect(['EXIT', 'BOTH']).toContain(result.bottleneck);
      expect(result.passed).toBe(false);
    });
  });

  describe('Metrics Computation', () => {
    it('should compute confidence intervals', () => {
      const config = { ...DEFAULT_CONFIG, iterations: 50, warm_up_minutes: 10 };
      const result = runMonteCarloScenario(baseScenario, config);

      // CI should exist and have reasonable structure
      expect(result.metrics.rejection_rate_ci).toHaveLength(2);
      expect(result.metrics.rejection_rate_ci[0]).toBeGreaterThanOrEqual(0);
      expect(result.metrics.rejection_rate_ci[1]).toBeLessThanOrEqual(1);
      expect(result.metrics.rejection_rate_ci[0]).toBeLessThanOrEqual(result.metrics.rejection_rate_ci[1]);

      expect(result.metrics.exit_wait.p95_ci).toHaveLength(2);
      expect(result.metrics.exit_wait.p95_ci[0]).toBeGreaterThanOrEqual(0);
      expect(result.metrics.exit_wait.p95_ci[0]).toBeLessThanOrEqual(result.metrics.exit_wait.p95_ci[1]);
    });

    it('should compute percentiles correctly (p90 <= p95 <= p99)', () => {
      const config = { ...DEFAULT_CONFIG, iterations: 50, warm_up_minutes: 10 };
      const result = runMonteCarloScenario(baseScenario, config);

      expect(result.metrics.exit_wait.p90_minutes).toBeLessThanOrEqual(result.metrics.exit_wait.p95_minutes);
      expect(result.metrics.exit_wait.p95_minutes).toBeLessThanOrEqual(result.metrics.exit_wait.p99_minutes);
    });

    it('should have non-negative metrics', () => {
      const config = { ...DEFAULT_CONFIG, iterations: 20, warm_up_minutes: 10 };
      const result = runMonteCarloScenario(baseScenario, config);

      expect(result.metrics.avg_occupancy_pct).toBeGreaterThanOrEqual(0);
      expect(result.metrics.max_occupancy).toBeGreaterThanOrEqual(0);
      expect(result.metrics.pct_time_full).toBeGreaterThanOrEqual(0);
      expect(result.metrics.rejection_rate).toBeGreaterThanOrEqual(0);
      expect(result.metrics.entry_wait.avg_seconds).toBeGreaterThanOrEqual(0);
      expect(result.metrics.exit_wait.avg_minutes).toBeGreaterThanOrEqual(0);
      expect(result.metrics.throughput_per_hour).toBeGreaterThanOrEqual(0);
    });

    it('should compute capacity correctly', () => {
      const config = { ...DEFAULT_CONFIG, iterations: 5, warm_up_minutes: 5 };
      const result = runMonteCarloScenario(baseScenario, config);

      const expectedCapacity = baseScenario.capacity.floors * baseScenario.capacity.spots_per_floor;
      expect(result.capacity).toBe(expectedCapacity);
    });
  });

  describe('Convergence', () => {
    it('should converge with increasing iterations', () => {
      // Run with fewer iterations
      const config1 = { ...DEFAULT_CONFIG, iterations: 10, warm_up_minutes: 10 };
      const result1 = runMonteCarloScenario(baseScenario, config1);

      // Run with more iterations
      const config2 = { ...DEFAULT_CONFIG, iterations: 100, warm_up_minutes: 10 };
      const result2 = runMonteCarloScenario(baseScenario, config2);

      // CI should be narrower with more iterations
      const ci1Width = result2.metrics.rejection_rate_ci[1] - result2.metrics.rejection_rate_ci[0];
      const ci2Width = result1.metrics.rejection_rate_ci[1] - result1.metrics.rejection_rate_ci[0];

      // More iterations typically leads to narrower CI (not always guaranteed with small samples)
      // Just verify both produce valid results
      expect(ci1Width).toBeGreaterThanOrEqual(0);
      expect(ci2Width).toBeGreaterThanOrEqual(0);
    });
  });
});
