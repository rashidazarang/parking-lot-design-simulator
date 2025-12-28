import { describe, it, expect } from 'vitest';
import { cn, formatNumber, formatPercent, formatCI, generateId, deepClone } from './utils';

describe('utils', () => {
  describe('cn', () => {
    it('should merge class names', () => {
      expect(cn('foo', 'bar')).toBe('foo bar');
    });

    it('should handle conditional classes', () => {
      expect(cn('foo', false && 'bar', 'baz')).toBe('foo baz');
    });

    it('should handle undefined values', () => {
      expect(cn('foo', undefined, 'bar')).toBe('foo bar');
    });
  });

  describe('formatNumber', () => {
    it('should format with default decimals', () => {
      expect(formatNumber(3.14159)).toBe('3.14');
    });

    it('should format with custom decimals', () => {
      expect(formatNumber(3.14159, 3)).toBe('3.142');
    });

    it('should format zero', () => {
      expect(formatNumber(0)).toBe('0.00');
    });
  });

  describe('formatPercent', () => {
    it('should format as percentage', () => {
      expect(formatPercent(0.5)).toBe('50.0%');
    });

    it('should format small percentages', () => {
      expect(formatPercent(0.031)).toBe('3.1%');
    });

    it('should format zero', () => {
      expect(formatPercent(0)).toBe('0.0%');
    });
  });

  describe('formatCI', () => {
    it('should format confidence interval', () => {
      expect(formatCI([2.1, 2.5])).toBe('2.10–2.50');
    });

    it('should use custom formatter', () => {
      expect(formatCI([0.1, 0.2], formatPercent)).toBe('10.0%–20.0%');
    });
  });

  describe('generateId', () => {
    it('should generate unique IDs', () => {
      const ids = new Set<string>();
      for (let i = 0; i < 100; i++) {
        ids.add(generateId());
      }
      expect(ids.size).toBe(100);
    });

    it('should generate string IDs', () => {
      expect(typeof generateId()).toBe('string');
    });
  });

  describe('deepClone', () => {
    it('should clone objects', () => {
      const original = { a: 1, b: { c: 2 } };
      const cloned = deepClone(original);

      expect(cloned).toEqual(original);
      expect(cloned).not.toBe(original);
      expect(cloned.b).not.toBe(original.b);
    });

    it('should clone arrays', () => {
      const original = [1, [2, 3]];
      const cloned = deepClone(original);

      expect(cloned).toEqual(original);
      expect(cloned).not.toBe(original);
    });
  });
});
