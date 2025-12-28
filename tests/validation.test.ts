import { describe, it, expect } from 'vitest';
import { validateRequest, checkCapacityWarning } from '../src/api/validation.js';

describe('Input Validation', () => {
  const validRequest = {
    scenarios: [
      {
        name: 'baseline',
        demand: {
          arrival_rate_per_hour: 120,
          peak_multiplier: 1.5,
          peak_start_minute: 0,
          peak_duration_minutes: 60
        },
        capacity: {
          floors: 4,
          spots_per_floor: 60
        },
        parking_duration: {
          mean_minutes: 90,
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
      }
    ],
    config: {
      iterations: 500,
      master_seed: 42
    }
  };

  describe('Valid Requests', () => {
    it('should accept valid request', () => {
      const result = validateRequest(validRequest);
      expect(result.success).toBe(true);
      expect(result.data).toBeDefined();
    });

    it('should apply defaults for missing config', () => {
      const request = { scenarios: validRequest.scenarios };
      const result = validateRequest(request);

      expect(result.success).toBe(true);
      expect(result.data?.config.iterations).toBe(500);
      expect(result.data?.config.master_seed).toBe(42);
      expect(result.data?.config.thresholds.rejection_rate).toBe(0.05);
    });

    it('should accept all variability levels', () => {
      for (const variability of ['LOW', 'MEDIUM', 'HIGH']) {
        const request = {
          scenarios: [{
            ...validRequest.scenarios[0],
            parking_duration: {
              mean_minutes: 60,
              variability
            }
          }]
        };

        const result = validateRequest(request);
        expect(result.success).toBe(true);
      }
    });
  });

  describe('Invalid Requests', () => {
    it('should reject empty scenarios array', () => {
      const result = validateRequest({ scenarios: [] });
      expect(result.success).toBe(false);
      expect(result.errors).toBeDefined();
    });

    it('should reject more than 10 scenarios', () => {
      const scenarios = Array(11).fill(validRequest.scenarios[0]);
      const result = validateRequest({ scenarios });

      expect(result.success).toBe(false);
      expect(result.errors?.some(e => e.field === 'scenarios')).toBe(true);
    });

    it('should reject negative arrival rate', () => {
      const request = {
        scenarios: [{
          ...validRequest.scenarios[0],
          demand: {
            ...validRequest.scenarios[0].demand,
            arrival_rate_per_hour: -5
          }
        }]
      };

      const result = validateRequest(request);
      expect(result.success).toBe(false);
    });

    it('should reject peak_multiplier less than 1.0', () => {
      const request = {
        scenarios: [{
          ...validRequest.scenarios[0],
          demand: {
            ...validRequest.scenarios[0].demand,
            peak_multiplier: 0.5
          }
        }]
      };

      const result = validateRequest(request);
      expect(result.success).toBe(false);
    });

    it('should reject floors less than 1', () => {
      const request = {
        scenarios: [{
          ...validRequest.scenarios[0],
          capacity: {
            floors: 0,
            spots_per_floor: 60
          }
        }]
      };

      const result = validateRequest(request);
      expect(result.success).toBe(false);
    });

    it('should reject invalid variability level', () => {
      const request = {
        scenarios: [{
          ...validRequest.scenarios[0],
          parking_duration: {
            mean_minutes: 60,
            variability: 'INVALID'
          }
        }]
      };

      const result = validateRequest(request);
      expect(result.success).toBe(false);
    });

    it('should reject iterations > 2000', () => {
      const result = validateRequest({
        ...validRequest,
        config: { iterations: 3000 }
      });

      expect(result.success).toBe(false);
    });

    it('should reject negative entry channels', () => {
      const request = {
        scenarios: [{
          ...validRequest.scenarios[0],
          entry: {
            channels: 0,
            mean_service_time_seconds: 10
          }
        }]
      };

      const result = validateRequest(request);
      expect(result.success).toBe(false);
    });
  });

  describe('Return all errors', () => {
    it('should return multiple validation errors at once', () => {
      const request = {
        scenarios: [{
          name: '',
          demand: {
            arrival_rate_per_hour: -1,
            peak_multiplier: 0.5,
            peak_start_minute: -1,
            peak_duration_minutes: 0
          },
          capacity: {
            floors: 0,
            spots_per_floor: 0
          },
          parking_duration: {
            mean_minutes: 0,
            variability: 'INVALID'
          },
          entry: {
            channels: 0,
            mean_service_time_seconds: 0
          },
          exit: {
            channels: 0,
            mean_service_time_seconds: 0
          }
        }]
      };

      const result = validateRequest(request);
      expect(result.success).toBe(false);
      expect(result.errors!.length).toBeGreaterThan(1);
    });
  });
});

describe('Capacity Warning', () => {
  it('should warn when peak arrivals exceed 80% of capacity', () => {
    const validated = {
      scenarios: [{
        name: 'overloaded',
        demand: {
          arrival_rate_per_hour: 200,
          peak_multiplier: 2.0,
          peak_start_minute: 0,
          peak_duration_minutes: 60
        },
        capacity: {
          floors: 1,
          spots_per_floor: 50 // Only 50 spots for ~200 arrivals
        },
        parking_duration: {
          mean_minutes: 60,
          variability: 'MEDIUM' as const
        },
        entry: {
          channels: 2,
          mean_service_time_seconds: 10
        },
        exit: {
          channels: 2,
          mean_service_time_seconds: 15
        }
      }],
      config: {
        iterations: 500,
        master_seed: 42,
        warm_up_minutes: 30,
        stabilization_buffer_minutes: 60,
        thresholds: {
          rejection_rate: 0.05,
          exit_p95_sla_minutes: 3.0
        }
      }
    };

    const warning = checkCapacityWarning(validated);
    expect(warning).not.toBeNull();
    expect(warning).toContain('80%');
  });

  it('should not warn when capacity is sufficient', () => {
    const validated = {
      scenarios: [{
        name: 'sufficient',
        demand: {
          arrival_rate_per_hour: 30,
          peak_multiplier: 1.5,
          peak_start_minute: 0,
          peak_duration_minutes: 60
        },
        capacity: {
          floors: 10,
          spots_per_floor: 100 // 1000 spots for ~45 arrivals
        },
        parking_duration: {
          mean_minutes: 60,
          variability: 'MEDIUM' as const
        },
        entry: {
          channels: 2,
          mean_service_time_seconds: 10
        },
        exit: {
          channels: 2,
          mean_service_time_seconds: 15
        }
      }],
      config: {
        iterations: 500,
        master_seed: 42,
        warm_up_minutes: 30,
        stabilization_buffer_minutes: 60,
        thresholds: {
          rejection_rate: 0.05,
          exit_p95_sla_minutes: 3.0
        }
      }
    };

    const warning = checkCapacityWarning(validated);
    expect(warning).toBeNull();
  });
});
