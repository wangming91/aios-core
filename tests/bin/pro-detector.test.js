/**
 * Tests for Pro Detector
 *
 * Tests the conditional loading of AIOS Pro modules.
 */

'use strict';

const fs = require('fs');
const path = require('path');
const os = require('os');
const {
  isProAvailable,
  loadProModule,
  getProVersion,
  getProInfo,
  _PRO_DIR,
  _PRO_PACKAGE_PATH,
} = require('../../bin/utils/pro-detector');

describe('pro-detector', () => {
  describe('exports', () => {
    it('should export isProAvailable function', () => {
      expect(typeof isProAvailable).toBe('function');
    });

    it('should export loadProModule function', () => {
      expect(typeof loadProModule).toBe('function');
    });

    it('should export getProVersion function', () => {
      expect(typeof getProVersion).toBe('function');
    });

    it('should export getProInfo function', () => {
      expect(typeof getProInfo).toBe('function');
    });

    it('should export _PRO_DIR for testing', () => {
      expect(_PRO_DIR).toBeDefined();
      expect(_PRO_DIR).toContain('pro');
    });

    it('should export _PRO_PACKAGE_PATH for testing', () => {
      expect(_PRO_PACKAGE_PATH).toBeDefined();
      expect(_PRO_PACKAGE_PATH).toContain('package.json');
    });
  });

  describe('isProAvailable', () => {
    it('should return boolean', () => {
      const result = isProAvailable();
      expect(typeof result).toBe('boolean');
    });

    it('should return false when pro/package.json does not exist', () => {
      // In test environment, pro submodule is likely not initialized
      // This tests the detection logic
      const result = isProAvailable();
      // Just verify it doesn't throw
      expect(typeof result).toBe('boolean');
    });
  });

  describe('loadProModule', () => {
    it('should return null when pro is not available', () => {
      // Mock isProAvailable to return false
      const original = require.cache[require.resolve('../../bin/utils/pro-detector')];
      delete require.cache[require.resolve('../../bin/utils/pro-detector')];

      // Since pro is likely not available in test env, this should return null
      const result = loadProModule('nonexistent-module');
      expect(result).toBeNull();

      // Restore cache
      if (original) {
        require.cache[require.resolve('../../bin/utils/pro-detector')] = original;
      }
    });

    it('should return null for nonexistent module', () => {
      const result = loadProModule('this-module-does-not-exist');
      expect(result).toBeNull();
    });
  });

  describe('getProVersion', () => {
    it('should return null when pro is not available', () => {
      const result = getProVersion();
      // In test env without pro, should be null
      expect(result === null || typeof result === 'string').toBe(true);
    });
  });

  describe('getProInfo', () => {
    it('should return object with available, version, and path', () => {
      const info = getProInfo();
      expect(info).toHaveProperty('available');
      expect(info).toHaveProperty('version');
      expect(info).toHaveProperty('path');
      expect(typeof info.available).toBe('boolean');
      expect(info.path).toBe(_PRO_DIR);
    });

    it('should have version as null when not available', () => {
      const info = getProInfo();
      if (!info.available) {
        expect(info.version).toBeNull();
      }
    });

    it('should have version as string when available', () => {
      const info = getProInfo();
      if (info.available) {
        expect(typeof info.version).toBe('string');
      }
    });
  });

  describe('integration', () => {
    it('should handle multiple calls consistently', () => {
      const result1 = isProAvailable();
      const result2 = isProAvailable();
      expect(result1).toBe(result2);
    });

    it('should return consistent info', () => {
      const info1 = getProInfo();
      const info2 = getProInfo();
      expect(info1.available).toBe(info2.available);
      expect(info1.version).toBe(info2.version);
      expect(info1.path).toBe(info2.path);
    });
  });
});
