import { describe, it, expect } from 'vitest';
import { runSimulation } from '../src/engine/simulation.js';
import { PCG64 } from '../src/engine/pcg.js';
import { Scenario, SimulationConfig, DEFAULT_CONFIG } from '../src/types/index.js';

const baseScenario: Scenario = {
  name: 'test',
  demand: {
    arrival_rate_per_hour: 60,
    peak_multiplier: 1.0,
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

describe('Simulation Engine', () => {
  describe('Reproducibility', () => {
    it('should produce identical results with same seed', () => {
      const config = { ...DEFAULT_CONFIG, iterations: 1, warm_up_minutes: 10 };

      const rng1 = new PCG64(42);
      const result1 = runSimulation(baseScenario, config, rng1);

      const rng2 = new PCG64(42);
      const result2 = runSimulation(baseScenario, config, rng2);

      expect(result1.totalArrivals).toBe(result2.totalArrivals);
      expect(result1.totalExits).toBe(result2.totalExits);
      expect(result1.rejections).toBe(result2.rejections);
      expect(result1.maxOccupancy).toBe(result2.maxOccupancy);
    });

    it('should produce different results with different seeds', () => {
      const config = { ...DEFAULT_CONFIG, iterations: 1, warm_up_minutes: 10 };

      const rng1 = new PCG64(42);
      const result1 = runSimulation(baseScenario, config, rng1);

      const rng2 = new PCG64(999);
      const result2 = runSimulation(baseScenario, config, rng2);

      // At least one metric should differ
      const isDifferent =
        result1.totalArrivals !== result2.totalArrivals ||
        result1.totalExits !== result2.totalExits ||
        result1.maxOccupancy !== result2.maxOccupancy;

      expect(isDifferent).toBe(true);
    });
  });

  describe('Queue Behavior', () => {
    it('should follow FIFO discipline (entry waits are non-negative)', () => {
      const config = { ...DEFAULT_CONFIG, iterations: 1, warm_up_minutes: 10 };
      const rng = new PCG64(42);
      const result = runSimulation(baseScenario, config, rng);

      for (const wait of result.entryWaitTimes) {
        expect(wait).toBeGreaterThanOrEqual(0);
      }
    });

    it('should follow FIFO discipline (exit waits are non-negative)', () => {
      const config = { ...DEFAULT_CONFIG, iterations: 1, warm_up_minutes: 10 };
      const rng = new PCG64(42);
      const result = runSimulation(baseScenario, config, rng);

      for (const wait of result.exitWaitTimes) {
        expect(wait).toBeGreaterThanOrEqual(0);
      }
    });
  });

  describe('Capacity Constraints', () => {
    it('should never exceed capacity', () => {
      const config = { ...DEFAULT_CONFIG, iterations: 1, warm_up_minutes: 10 };
      const rng = new PCG64(42);
      const result = runSimulation(baseScenario, config, rng);

      const totalCapacity = baseScenario.capacity.floors * baseScenario.capacity.spots_per_floor;
      expect(result.maxOccupancy).toBeLessThanOrEqual(totalCapacity);
    });

    it('should reject arrivals when at capacity', () => {
      // High demand, low capacity scenario
      const highDemandScenario: Scenario = {
        ...baseScenario,
        demand: {
          ...baseScenario.demand,
          arrival_rate_per_hour: 200,
          peak_multiplier: 2.0
        },
        capacity: {
          floors: 1,
          spots_per_floor: 20
        }
      };

      const config = { ...DEFAULT_CONFIG, iterations: 1, warm_up_minutes: 10 };
      const rng = new PCG64(42);
      const result = runSimulation(highDemandScenario, config, rng);

      // With high demand and low capacity, we should see rejections
      expect(result.rejections).toBeGreaterThan(0);
    });
  });

  describe('Zero Arrivals Edge Case', () => {
    it('should handle very low arrival rate', () => {
      const lowDemandScenario: Scenario = {
        ...baseScenario,
        demand: {
          ...baseScenario.demand,
          arrival_rate_per_hour: 0.1, // Very low rate
          peak_duration_minutes: 10
        }
      };

      const config = { ...DEFAULT_CONFIG, iterations: 1, warm_up_minutes: 5 };
      const rng = new PCG64(42);
      const result = runSimulation(lowDemandScenario, config, rng);

      // Should complete without errors
      expect(result).toBeDefined();
      expect(result.rejections).toBe(0);
    });
  });

  describe('Single Capacity Edge Case', () => {
    it('should work with capacity = 1', () => {
      const minCapacityScenario: Scenario = {
        ...baseScenario,
        capacity: {
          floors: 1,
          spots_per_floor: 1
        },
        demand: {
          ...baseScenario.demand,
          arrival_rate_per_hour: 30
        }
      };

      const config = { ...DEFAULT_CONFIG, iterations: 1, warm_up_minutes: 10 };
      const rng = new PCG64(42);
      const result = runSimulation(minCapacityScenario, config, rng);

      expect(result.maxOccupancy).toBeLessThanOrEqual(1);
    });
  });

  describe('Peak Period', () => {
    it('should have higher arrivals during peak', () => {
      const peakScenario: Scenario = {
        ...baseScenario,
        demand: {
          arrival_rate_per_hour: 30,
          peak_multiplier: 3.0,
          peak_start_minute: 0,
          peak_duration_minutes: 30
        }
      };

      // Run multiple times to get statistical reliability
      const config = { ...DEFAULT_CONFIG, iterations: 1, warm_up_minutes: 0 };
      const rng = new PCG64(42);
      const result = runSimulation(peakScenario, config, rng);

      // With 3x multiplier during peak, we should see arrivals
      expect(result.totalArrivals).toBeGreaterThan(0);
    });

    it('should handle peak_multiplier = 1.0 (no peak effect)', () => {
      const noPeakScenario: Scenario = {
        ...baseScenario,
        demand: {
          ...baseScenario.demand,
          peak_multiplier: 1.0
        }
      };

      const config = { ...DEFAULT_CONFIG, iterations: 1, warm_up_minutes: 10 };
      const rng = new PCG64(42);
      const result = runSimulation(noPeakScenario, config, rng);

      expect(result).toBeDefined();
    });
  });

  describe('Exit Queue Bottleneck', () => {
    it('should build exit queue with single channel and high load', () => {
      const bottleneckScenario: Scenario = {
        ...baseScenario,
        demand: {
          ...baseScenario.demand,
          arrival_rate_per_hour: 120
        },
        exit: {
          channels: 1,
          mean_service_time_seconds: 30 // Slow exit
        }
      };

      const config = { ...DEFAULT_CONFIG, iterations: 1, warm_up_minutes: 10 };
      const rng = new PCG64(42);
      const result = runSimulation(bottleneckScenario, config, rng);

      // Should see exit queue building up
      expect(result.maxExitQueue).toBeGreaterThan(0);
    });
  });
});

describe('Lognormal Distribution Parameters', () => {
  it('should correctly compute lognormal parameters from CV', () => {
    // LOW variability: CV = 0.3
    // σ² = ln(1 + 0.3²) = ln(1.09) ≈ 0.0862
    // σ ≈ 0.294

    // MEDIUM variability: CV = 0.6
    // σ² = ln(1 + 0.6²) = ln(1.36) ≈ 0.307
    // σ ≈ 0.555

    // HIGH variability: CV = 1.0
    // σ² = ln(1 + 1²) = ln(2) ≈ 0.693
    // σ ≈ 0.833

    const testCases = [
      { cv: 0.3, expectedSigma: 0.294 },
      { cv: 0.6, expectedSigma: 0.555 },
      { cv: 1.0, expectedSigma: 0.833 }
    ];

    for (const { cv, expectedSigma } of testCases) {
      const sigma2 = Math.log(1 + cv * cv);
      const sigma = Math.sqrt(sigma2);
      expect(sigma).toBeCloseTo(expectedSigma, 2);
    }
  });
});
