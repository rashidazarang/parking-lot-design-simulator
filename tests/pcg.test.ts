import { describe, it, expect } from 'vitest';
import { PCG64 } from '../src/engine/pcg.js';

describe('PCG64 Random Number Generator', () => {
  describe('Reproducibility', () => {
    it('should produce identical sequences with same seed', () => {
      const rng1 = new PCG64(42);
      const rng2 = new PCG64(42);

      for (let i = 0; i < 100; i++) {
        expect(rng1.random()).toBe(rng2.random());
      }
    });

    it('should produce different sequences with different seeds', () => {
      const rng1 = new PCG64(42);
      const rng2 = new PCG64(43);

      let allSame = true;
      for (let i = 0; i < 10; i++) {
        if (rng1.random() !== rng2.random()) {
          allSame = false;
          break;
        }
      }
      expect(allSame).toBe(false);
    });
  });

  describe('random()', () => {
    it('should produce values in [0, 1)', () => {
      const rng = new PCG64(12345);

      for (let i = 0; i < 1000; i++) {
        const val = rng.random();
        expect(val).toBeGreaterThanOrEqual(0);
        expect(val).toBeLessThan(1);
      }
    });

    it('should produce a uniform distribution', () => {
      const rng = new PCG64(12345);
      const buckets = new Array(10).fill(0);
      const n = 10000;

      for (let i = 0; i < n; i++) {
        const val = rng.random();
        const bucket = Math.min(9, Math.floor(val * 10));
        buckets[bucket]++;
      }

      // Each bucket should have ~10% of values (with some tolerance)
      const expected = n / 10;
      for (const count of buckets) {
        expect(count).toBeGreaterThan(expected * 0.7);
        expect(count).toBeLessThan(expected * 1.3);
      }
    });
  });

  describe('exponential()', () => {
    it('should produce positive values', () => {
      const rng = new PCG64(12345);

      for (let i = 0; i < 100; i++) {
        expect(rng.exponential(1)).toBeGreaterThan(0);
      }
    });

    it('should have correct mean (approximately)', () => {
      const rng = new PCG64(12345);
      const rate = 2.0;
      const n = 10000;
      let sum = 0;

      for (let i = 0; i < n; i++) {
        sum += rng.exponential(rate);
      }

      const mean = sum / n;
      const expectedMean = 1 / rate;

      // Should be within 10% of expected mean
      expect(Math.abs(mean - expectedMean) / expectedMean).toBeLessThan(0.1);
    });
  });

  describe('normal()', () => {
    it('should have correct mean and stddev (approximately)', () => {
      const rng = new PCG64(12345);
      const expectedMean = 10;
      const expectedStd = 2;
      const n = 10000;
      const values: number[] = [];

      for (let i = 0; i < n; i++) {
        values.push(rng.normal(expectedMean, expectedStd));
      }

      const actualMean = values.reduce((a, b) => a + b, 0) / n;
      const variance = values.reduce((a, b) => a + (b - actualMean) ** 2, 0) / n;
      const actualStd = Math.sqrt(variance);

      // Allow 10% tolerance
      expect(Math.abs(actualMean - expectedMean) / expectedMean).toBeLessThan(0.1);
      expect(Math.abs(actualStd - expectedStd) / expectedStd).toBeLessThan(0.1);
    });
  });

  describe('lognormal()', () => {
    it('should produce positive values', () => {
      const rng = new PCG64(12345);

      for (let i = 0; i < 100; i++) {
        expect(rng.lognormal(1, 0.5)).toBeGreaterThan(0);
      }
    });

    it('should have correct mean (approximately)', () => {
      const rng = new PCG64(12345);
      const mu = 4.0;
      const sigma = 0.5;
      const n = 10000;
      const values: number[] = [];

      for (let i = 0; i < n; i++) {
        values.push(rng.lognormal(mu, sigma));
      }

      const actualMean = values.reduce((a, b) => a + b, 0) / n;
      // Expected mean of lognormal: exp(mu + sigma^2/2)
      const expectedMean = Math.exp(mu + sigma * sigma / 2);

      // Should be within 10% of expected mean
      expect(Math.abs(actualMean - expectedMean) / expectedMean).toBeLessThan(0.1);
    });
  });

  describe('poisson()', () => {
    it('should produce non-negative integers', () => {
      const rng = new PCG64(12345);

      for (let i = 0; i < 100; i++) {
        const val = rng.poisson(5);
        expect(val).toBeGreaterThanOrEqual(0);
        expect(Number.isInteger(val)).toBe(true);
      }
    });

    it('should have correct mean (approximately)', () => {
      const rng = new PCG64(12345);
      const lambda = 7.5;
      const n = 10000;
      let sum = 0;

      for (let i = 0; i < n; i++) {
        sum += rng.poisson(lambda);
      }

      const mean = sum / n;
      expect(Math.abs(mean - lambda) / lambda).toBeLessThan(0.1);
    });
  });

  describe('clone()', () => {
    it('should create an independent copy', () => {
      const rng = new PCG64(42);

      // Advance original a bit
      for (let i = 0; i < 10; i++) rng.random();

      const clone = rng.clone();

      // Both should produce same values from here
      expect(rng.random()).toBe(clone.random());
      expect(rng.random()).toBe(clone.random());
    });
  });
});
