/**
 * Tests for Merge Utilities
 *
 * Tests the deep merge strategy for layered configuration.
 */

'use strict';

const { deepMerge, mergeAll, isPlainObject } = require('../../../.aios-core/core/config/merge-utils');

describe('merge-utils', () => {
  describe('isPlainObject', () => {
    it('should return true for plain objects', () => {
      expect(isPlainObject({})).toBe(true);
      expect(isPlainObject({ a: 1 })).toBe(true);
      expect(isPlainObject({ a: { b: 2 } })).toBe(true);
    });

    it('should return false for arrays', () => {
      expect(isPlainObject([])).toBe(false);
      expect(isPlainObject([1, 2, 3])).toBe(false);
    });

    it('should return false for null', () => {
      expect(isPlainObject(null)).toBe(false);
    });

    it('should return false for primitives', () => {
      expect(isPlainObject('string')).toBe(false);
      expect(isPlainObject(123)).toBe(false);
      expect(isPlainObject(true)).toBe(false);
      expect(isPlainObject(undefined)).toBe(false);
    });

    it('should return false for Date objects', () => {
      expect(isPlainObject(new Date())).toBe(false);
    });

    it('should return true for Object.create(null)', () => {
      expect(isPlainObject(Object.create(null))).toBe(true);
    });
  });

  describe('deepMerge', () => {
    it('should return source if target is not an object', () => {
      const result = deepMerge('not an object', { a: 1 });
      expect(result).toEqual({ a: 1 });
    });

    it('should return source when source is defined (last-wins)', () => {
      // When source is defined (even if not plain object), it wins
      const result = deepMerge({ a: 1 }, 'not an object');
      expect(result).toBe('not an object');
    });

    it('should return target when source is undefined', () => {
      const result = deepMerge({ a: 1 }, undefined);
      expect(result).toEqual({ a: 1 });
    });

    it('should return source if source is defined and target is not', () => {
      const result = deepMerge(null, { a: 1 });
      expect(result).toEqual({ a: 1 });
    });

    it('should merge simple objects', () => {
      const target = { a: 1 };
      const source = { b: 2 };
      const result = deepMerge(target, source);
      expect(result).toEqual({ a: 1, b: 2 });
    });

    it('should override scalar values (last-wins)', () => {
      const target = { a: 1, b: 2 };
      const source = { b: 3 };
      const result = deepMerge(target, source);
      expect(result).toEqual({ a: 1, b: 3 });
    });

    it('should deep merge nested objects', () => {
      const target = { nested: { a: 1, b: 2 } };
      const source = { nested: { b: 3, c: 4 } };
      const result = deepMerge(target, source);
      expect(result).toEqual({ nested: { a: 1, b: 3, c: 4 } });
    });

    it('should replace arrays (not merge)', () => {
      const target = { items: [1, 2, 3] };
      const source = { items: [4, 5] };
      const result = deepMerge(target, source);
      expect(result).toEqual({ items: [4, 5] });
    });

    it('should concatenate arrays with +append', () => {
      const target = { items: [1, 2] };
      const source = { 'items+append': [3, 4] };
      const result = deepMerge(target, source);
      expect(result).toEqual({ items: [1, 2, 3, 4] });
    });

    it('should handle +append when target array does not exist', () => {
      const target = {};
      const source = { 'items+append': [1, 2] };
      const result = deepMerge(target, source);
      expect(result).toEqual({ items: [1, 2] });
    });

    it('should delete key when source value is null', () => {
      const target = { a: 1, b: 2, c: 3 };
      const source = { b: null };
      const result = deepMerge(target, source);
      expect(result).toEqual({ a: 1, c: 3 });
      expect(result).not.toHaveProperty('b');
    });

    it('should not modify original objects', () => {
      const target = { a: 1 };
      const source = { b: 2 };
      deepMerge(target, source);
      expect(target).toEqual({ a: 1 });
      expect(source).toEqual({ b: 2 });
    });

    it('should handle deeply nested structures', () => {
      const target = {
        level1: {
          level2: {
            a: 1,
            b: 2,
          },
        },
      };
      const source = {
        level1: {
          level2: {
            b: 3,
            c: 4,
          },
        },
      };
      const result = deepMerge(target, source);
      expect(result.level1.level2).toEqual({ a: 1, b: 3, c: 4 });
    });

    it('should handle mixed types', () => {
      const target = { value: 'string' };
      const source = { value: 123 };
      const result = deepMerge(target, source);
      expect(result).toEqual({ value: 123 });
    });
  });

  describe('mergeAll', () => {
    it('should return empty object for no arguments', () => {
      const result = mergeAll();
      expect(result).toEqual({});
    });

    it('should return empty object for all non-object arguments', () => {
      const result = mergeAll(null, undefined, 'string', 123);
      expect(result).toEqual({});
    });

    it('should merge single object', () => {
      const result = mergeAll({ a: 1 });
      expect(result).toEqual({ a: 1 });
    });

    it('should merge multiple objects in order', () => {
      const result = mergeAll({ a: 1 }, { b: 2 }, { c: 3 });
      expect(result).toEqual({ a: 1, b: 2, c: 3 });
    });

    it('should apply last-wins for conflicts', () => {
      const result = mergeAll({ a: 1 }, { a: 2 }, { a: 3 });
      expect(result).toEqual({ a: 3 });
    });

    it('should deep merge nested objects across layers', () => {
      const result = mergeAll(
        { config: { host: 'localhost' } },
        { config: { port: 3000 } },
        { config: { debug: true } }
      );
      expect(result).toEqual({
        config: { host: 'localhost', port: 3000, debug: true },
      });
    });

    it('should skip null/undefined layers', () => {
      const result = mergeAll({ a: 1 }, null, { b: 2 }, undefined);
      expect(result).toEqual({ a: 1, b: 2 });
    });

    it('should handle configuration layering (L1 -> L2 -> L3)', () => {
      const L1 = { framework: { name: 'AIOS', version: '1.0' } };
      const L2 = { framework: { version: '2.0' }, project: { name: 'MyProject' } };
      const L3 = { project: { debug: true } };

      const result = mergeAll(L1, L2, L3);

      expect(result.framework.name).toBe('AIOS');
      expect(result.framework.version).toBe('2.0');
      expect(result.project.name).toBe('MyProject');
      expect(result.project.debug).toBe(true);
    });

    it('should handle +append across layers', () => {
      const L1 = { plugins: ['base'] };
      const L2 = { 'plugins+append': ['extra'] };

      const result = mergeAll(L1, L2);

      expect(result.plugins).toEqual(['base', 'extra']);
    });
  });
});
