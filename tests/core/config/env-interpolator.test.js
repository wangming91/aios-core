/**
 * Tests for Environment Variable Interpolator
 *
 * Tests the interpolation of ${ENV_VAR} patterns in configuration values.
 */

'use strict';

const {
  interpolateEnvVars,
  interpolateString,
  lintEnvPatterns,
  ENV_VAR_PATTERN,
} = require('../../../.aios-core/core/config/env-interpolator');

describe('env-interpolator', () => {
  const originalEnv = process.env;

  beforeEach(() => {
    // Reset process.env for each test
    process.env = { ...originalEnv };
  });

  afterAll(() => {
    process.env = originalEnv;
  });

  describe('ENV_VAR_PATTERN', () => {
    it('should match simple env var pattern', () => {
      const match = ENV_VAR_PATTERN.exec('${MY_VAR}');
      expect(match).not.toBeNull();
      expect(match[1]).toBe('MY_VAR');
    });

    it('should match env var with default value', () => {
      ENV_VAR_PATTERN.lastIndex = 0;
      const match = ENV_VAR_PATTERN.exec('${MY_VAR:-default}');
      expect(match).not.toBeNull();
      expect(match[1]).toBe('MY_VAR');
      expect(match[2]).toBe('default');
    });

    it('should match env var with empty default', () => {
      ENV_VAR_PATTERN.lastIndex = 0;
      const match = ENV_VAR_PATTERN.exec('${MY_VAR:-}');
      expect(match).not.toBeNull();
      expect(match[1]).toBe('MY_VAR');
      expect(match[2]).toBe('');
    });

    it('should match env var with complex default', () => {
      ENV_VAR_PATTERN.lastIndex = 0;
      const match = ENV_VAR_PATTERN.exec('${DATABASE_URL:-localhost:5432}');
      expect(match).not.toBeNull();
      expect(match[1]).toBe('DATABASE_URL');
      expect(match[2]).toBe('localhost:5432');
    });

    it('should not match invalid var names', () => {
      ENV_VAR_PATTERN.lastIndex = 0;
      const match = ENV_VAR_PATTERN.exec('${123invalid}');
      expect(match).toBeNull();
    });
  });

  describe('interpolateString', () => {
    it('should return original string if no patterns', () => {
      const result = interpolateString('hello world');
      expect(result).toBe('hello world');
    });

    it('should interpolate existing env var', () => {
      process.env.TEST_VAR = 'test_value';
      const result = interpolateString('prefix_${TEST_VAR}_suffix');
      expect(result).toBe('prefix_test_value_suffix');
    });

    it('should use default value when env var is not set', () => {
      delete process.env.MISSING_VAR;
      const result = interpolateString('${MISSING_VAR:-default_value}');
      expect(result).toBe('default_value');
    });

    it('should return empty string when env var missing and no default', () => {
      delete process.env.UNDEFINED_VAR;
      const warnings = [];
      const result = interpolateString('${UNDEFINED_VAR}', { warnings });
      expect(result).toBe('');
      expect(warnings.length).toBe(1);
      expect(warnings[0]).toContain('UNDEFINED_VAR');
    });

    it('should interpolate multiple env vars in one string', () => {
      process.env.VAR1 = 'value1';
      process.env.VAR2 = 'value2';
      const result = interpolateString('${VAR1}_${VAR2}');
      expect(result).toBe('value1_value2');
    });

    it('should handle env var with empty default', () => {
      delete process.env.EMPTY_DEFAULT;
      const result = interpolateString('${EMPTY_DEFAULT:-}');
      expect(result).toBe('');
    });

    it('should prefer env var over default', () => {
      process.env.EXISTING_VAR = 'actual_value';
      const result = interpolateString('${EXISTING_VAR:-default}');
      expect(result).toBe('actual_value');
    });
  });

  describe('interpolateEnvVars', () => {
    it('should return non-string values as-is', () => {
      expect(interpolateEnvVars(123)).toBe(123);
      expect(interpolateEnvVars(true)).toBe(true);
      expect(interpolateEnvVars(null)).toBe(null);
    });

    it('should interpolate string values', () => {
      process.env.NAME = 'John';
      const result = interpolateEnvVars('Hello ${NAME}');
      expect(result).toBe('Hello John');
    });

    it('should interpolate values in array', () => {
      process.env.ITEM = 'interpolated';
      const result = interpolateEnvVars(['static', '${ITEM}', 'another']);
      expect(result).toEqual(['static', 'interpolated', 'another']);
    });

    it('should interpolate values in nested object', () => {
      process.env.HOST = 'localhost';
      process.env.PORT = '3000';
      const config = {
        server: {
          host: '${HOST}',
          port: '${PORT}',
        },
      };
      const result = interpolateEnvVars(config);
      expect(result.server.host).toBe('localhost');
      expect(result.server.port).toBe('3000');
    });

    it('should collect warnings for missing env vars', () => {
      delete process.env.MISSING1;
      delete process.env.MISSING2;
      const warnings = [];
      interpolateEnvVars(
        { key1: '${MISSING1}', key2: '${MISSING2}' },
        { warnings }
      );
      expect(warnings.length).toBe(2);
    });

    it('should not modify original object', () => {
      process.env.VALUE = 'test';
      const original = { key: '${VALUE}' };
      const result = interpolateEnvVars(original);
      expect(original.key).toBe('${VALUE}');
      expect(result.key).toBe('test');
    });

    it('should handle deeply nested structures', () => {
      process.env.DEEP = 'resolved';
      const config = {
        level1: {
          level2: {
            level3: {
              value: '${DEEP}',
            },
          },
        },
      };
      const result = interpolateEnvVars(config);
      expect(result.level1.level2.level3.value).toBe('resolved');
    });

    it('should handle arrays in objects', () => {
      process.env.ITEM = 'dynamic';
      const config = {
        items: ['static', '${ITEM}'],
      };
      const result = interpolateEnvVars(config);
      expect(result.items).toEqual(['static', 'dynamic']);
    });
  });

  describe('lintEnvPatterns', () => {
    it('should return empty array for config without patterns', () => {
      const config = { key: 'value', nested: { foo: 'bar' } };
      const findings = lintEnvPatterns(config, 'test.yaml');
      expect(findings.length).toBe(0);
    });

    it('should detect env var patterns in strings', () => {
      const config = { database: { url: '${DB_URL}' } };
      const findings = lintEnvPatterns(config, 'test.yaml');
      expect(findings.length).toBe(1);
      expect(findings[0]).toContain('DB_URL');
    });

    it('should include path in findings', () => {
      const config = {
        server: {
          host: '${HOST}',
        },
      };
      const findings = lintEnvPatterns(config, 'config.yaml');
      expect(findings[0]).toContain('server.host');
    });

    it('should detect patterns in arrays', () => {
      const config = {
        items: ['static', '${DYNAMIC}'],
      };
      const findings = lintEnvPatterns(config, 'config.yaml');
      expect(findings.length).toBe(1);
      expect(findings[0]).toContain('items[1]');
    });

    it('should detect multiple patterns', () => {
      const config = {
        db: '${DB}',
        api: '${API}',
      };
      const findings = lintEnvPatterns(config, 'config.yaml');
      expect(findings.length).toBe(2);
    });

    it('should include source file in findings', () => {
      const config = { key: '${VAR}' };
      const findings = lintEnvPatterns(config, 'my-config.yaml');
      expect(findings[0]).toContain('my-config.yaml');
    });
  });
});
