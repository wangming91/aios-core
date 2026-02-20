/**
 * Tests for error-codes.js — Error Codes Loader
 *
 * Covers:
 * - Loading error codes from YAML (AC2, AC3)
 * - getError(code) method (AC3)
 * - getErrorsByCategory(category) method (AC3)
 * - Variable interpolation {variable} (AC3)
 * - Edge cases: unknown codes, missing files
 *
 * @story STORY-OPT-D1
 */

const path = require('path');
const fs = require('fs');
const yaml = require('js-yaml');

// Mock fs and yaml before requiring the module
jest.mock('fs');
jest.mock('js-yaml', () => ({
  load: jest.fn(),
}));

// Import after mocking
const ErrorCodes = require('../../../.aios-core/core/errors/error-codes');

describe('ErrorCodes', () => {
  // Sample error codes data for testing
  const sampleData = {
    metadata: {
      version: '1.0.0',
      lastUpdated: '2026-02-20',
    },
    categories: {
      CFG: { name: 'Configuration', description: '配置相关错误' },
      AGT: { name: 'Agent', description: '代理相关错误' },
      STR: { name: 'Story', description: 'Story相关错误' },
      SYS: { name: 'System', description: '系统级错误' },
      IDS: { name: 'IDS', description: '增量决策系统错误' },
    },
    codes: {
      CFG_001: {
        code: 'CFG_001',
        category: 'CONFIG',
        severity: 'ERROR',
        message: 'Configuration file not found',
        userMessage: '配置文件未找到',
        recoverable: true,
        recoverySteps: [
          "运行 'aios config init' 创建默认配置",
          '或检查配置文件路径是否正确',
        ],
        docUrl: 'https://docs.aios.dev/errors/CFG_001',
      },
      CFG_002: {
        code: 'CFG_002',
        category: 'CONFIG',
        severity: 'WARNING',
        message: 'Invalid configuration value for {field}',
        userMessage: '配置字段 {field} 的值无效',
        recoverable: true,
        recoverySteps: ['检查 {field} 字段的配置值'],
        docUrl: 'https://docs.aios.dev/errors/CFG_002',
      },
      AGT_001: {
        code: 'AGT_001',
        category: 'AGENT',
        severity: 'ERROR',
        message: 'Agent {agentName} not found',
        userMessage: '代理 {agentName} 未找到',
        recoverable: false,
        recoverySteps: ['检查代理名称是否正确'],
        docUrl: null,
      },
      SYS_001: {
        code: 'SYS_001',
        category: 'SYSTEM',
        severity: 'CRITICAL',
        message: 'System resource exhausted',
        userMessage: '系统资源耗尽',
        recoverable: false,
        recoverySteps: [],
        docUrl: null,
      },
    },
  };

  beforeEach(() => {
    jest.clearAllMocks();
    // Reset the ErrorCodes instance
    ErrorCodes._resetCache && ErrorCodes._resetCache();
  });

  describe('load()', () => {
    it('should load error codes from YAML file', () => {
      // Given
      fs.existsSync.mockReturnValue(true);
      fs.readFileSync.mockReturnValue('mock yaml content');
      yaml.load.mockReturnValue(sampleData);

      // When
      ErrorCodes.load();

      // Then
      expect(fs.existsSync).toHaveBeenCalled();
      expect(fs.readFileSync).toHaveBeenCalled();
      expect(yaml.load).toHaveBeenCalled();
    });

    it('should throw error if YAML file does not exist', () => {
      // Given
      fs.existsSync.mockReturnValue(false);

      // When / Then
      expect(() => ErrorCodes.load()).toThrow('Error codes file not found');
    });

    it('should throw error if YAML parsing fails', () => {
      // Given
      fs.existsSync.mockReturnValue(true);
      fs.readFileSync.mockReturnValue('mock yaml content');
      yaml.load.mockImplementation(() => {
        throw new Error('YAML parse error');
      });

      // When / Then
      expect(() => ErrorCodes.load()).toThrow('Failed to parse error codes YAML');
    });

    it('should cache loaded codes', () => {
      // Given
      fs.existsSync.mockReturnValue(true);
      fs.readFileSync.mockReturnValue('mock yaml content');
      yaml.load.mockReturnValue(sampleData);

      // When
      ErrorCodes.load();
      ErrorCodes.load();

      // Then
      expect(fs.readFileSync).toHaveBeenCalledTimes(1);
    });
  });

  describe('getError()', () => {
    beforeEach(() => {
      fs.existsSync.mockReturnValue(true);
      fs.readFileSync.mockReturnValue('mock yaml content');
      yaml.load.mockReturnValue(sampleData);
      ErrorCodes.load();
    });

    it('should return error definition for valid code', () => {
      // Given / When
      const errorDef = ErrorCodes.getError('CFG_001');

      // Then
      expect(errorDef).toBeDefined();
      expect(errorDef.code).toBe('CFG_001');
      expect(errorDef.category).toBe('CONFIG');
      expect(errorDef.severity).toBe('ERROR');
      expect(errorDef.message).toBe('Configuration file not found');
      expect(errorDef.userMessage).toBe('配置文件未找到');
      expect(errorDef.recoverable).toBe(true);
      expect(errorDef.recoverySteps).toHaveLength(2);
      expect(errorDef.docUrl).toBe('https://docs.aios.dev/errors/CFG_001');
    });

    it('should return null for unknown code', () => {
      // Given / When
      const errorDef = ErrorCodes.getError('UNKNOWN_CODE');

      // Then
      expect(errorDef).toBeNull();
    });

    it('should return null for null code', () => {
      // Given / When
      const errorDef = ErrorCodes.getError(null);

      // Then
      expect(errorDef).toBeNull();
    });

    it('should return null for undefined code', () => {
      // Given / When
      const errorDef = ErrorCodes.getError(undefined);

      // Then
      expect(errorDef).toBeNull();
    });

    it('should return null for empty string code', () => {
      // Given / When
      const errorDef = ErrorCodes.getError('');

      // Then
      expect(errorDef).toBeNull();
    });
  });

  describe('getErrorsByCategory()', () => {
    beforeEach(() => {
      fs.existsSync.mockReturnValue(true);
      fs.readFileSync.mockReturnValue('mock yaml content');
      yaml.load.mockReturnValue(sampleData);
      ErrorCodes.load();
    });

    it('should return all errors for a category', () => {
      // Given / When
      const configErrors = ErrorCodes.getErrorsByCategory('CONFIG');

      // Then
      expect(configErrors).toBeDefined();
      expect(configErrors.length).toBeGreaterThanOrEqual(2);
      expect(configErrors.every((e) => e.category === 'CONFIG')).toBe(true);
    });

    it('should return empty array for unknown category', () => {
      // Given / When
      const errors = ErrorCodes.getErrorsByCategory('UNKNOWN_CATEGORY');

      // Then
      expect(errors).toEqual([]);
    });

    it('should be case-sensitive for category', () => {
      // Given / When
      const upperCase = ErrorCodes.getErrorsByCategory('CONFIG');
      const lowerCase = ErrorCodes.getErrorsByCategory('config');

      // Then
      expect(upperCase.length).toBeGreaterThan(0);
      expect(lowerCase).toEqual([]);
    });

    it('should return empty array for null category', () => {
      // Given / When
      const errors = ErrorCodes.getErrorsByCategory(null);

      // Then
      expect(errors).toEqual([]);
    });
  });

  describe('interpolate()', () => {
    beforeEach(() => {
      fs.existsSync.mockReturnValue(true);
      fs.readFileSync.mockReturnValue('mock yaml content');
      yaml.load.mockReturnValue(sampleData);
      ErrorCodes.load();
    });

    it('should interpolate variables in message', () => {
      // Given
      const errorDef = ErrorCodes.getError('CFG_002');
      const variables = { field: 'database.url' };

      // When
      const interpolated = ErrorCodes.interpolate(errorDef, variables);

      // Then
      expect(interpolated.message).toBe('Invalid configuration value for database.url');
      expect(interpolated.userMessage).toBe('配置字段 database.url 的值无效');
    });

    it('should interpolate variables in recoverySteps', () => {
      // Given
      const errorDef = ErrorCodes.getError('CFG_002');
      const variables = { field: 'timeout' };

      // When
      const interpolated = ErrorCodes.interpolate(errorDef, variables);

      // Then
      expect(interpolated.recoverySteps[0]).toBe('检查 timeout 字段的配置值');
    });

    it('should interpolate multiple variables', () => {
      // Given
      const errorDef = {
        message: 'Error in {module} at {line}',
        recoverySteps: ['Check {module}', 'Fix line {line}'],
      };
      const variables = { module: 'config', line: '42' };

      // When
      const interpolated = ErrorCodes.interpolate(errorDef, variables);

      // Then
      expect(interpolated.message).toBe('Error in config at 42');
      expect(interpolated.recoverySteps[0]).toBe('Check config');
      expect(interpolated.recoverySteps[1]).toBe('Fix line 42');
    });

    it('should return copy of definition if no variables provided', () => {
      // Given
      const errorDef = ErrorCodes.getError('CFG_001');

      // When
      const result = ErrorCodes.interpolate(errorDef, {});

      // Then
      expect(result.message).toBe(errorDef.message);
    });

    it('should handle null error definition', () => {
      // Given / When
      const result = ErrorCodes.interpolate(null, { field: 'test' });

      // Then
      expect(result).toBeNull();
    });

    it('should handle undefined variables', () => {
      // Given
      const errorDef = ErrorCodes.getError('CFG_001');

      // When
      const result = ErrorCodes.interpolate(errorDef, undefined);

      // Then
      expect(result.message).toBe(errorDef.message);
    });

    it('should preserve undefined variable placeholders if not provided', () => {
      // Given
      const errorDef = ErrorCodes.getError('CFG_002');

      // When
      const interpolated = ErrorCodes.interpolate(errorDef, {});

      // Then
      expect(interpolated.message).toBe('Invalid configuration value for {field}');
    });
  });

  describe('getCategories()', () => {
    beforeEach(() => {
      fs.existsSync.mockReturnValue(true);
      fs.readFileSync.mockReturnValue('mock yaml content');
      yaml.load.mockReturnValue(sampleData);
      ErrorCodes.load();
    });

    it('should return all categories', () => {
      // Given / When
      const categories = ErrorCodes.getCategories();

      // Then
      expect(categories).toBeDefined();
      expect(categories.CFG).toBeDefined();
      expect(categories.CFG.name).toBe('Configuration');
      expect(categories.AGT).toBeDefined();
      expect(categories.STR).toBeDefined();
      expect(categories.SYS).toBeDefined();
      expect(categories.IDS).toBeDefined();
    });
  });

  describe('getMetadata()', () => {
    beforeEach(() => {
      fs.existsSync.mockReturnValue(true);
      fs.readFileSync.mockReturnValue('mock yaml content');
      yaml.load.mockReturnValue(sampleData);
      ErrorCodes.load();
    });

    it('should return metadata', () => {
      // Given / When
      const metadata = ErrorCodes.getMetadata();

      // Then
      expect(metadata).toBeDefined();
      expect(metadata.version).toBe('1.0.0');
      expect(metadata.lastUpdated).toBe('2026-02-20');
    });
  });

  describe('hasError()', () => {
    beforeEach(() => {
      fs.existsSync.mockReturnValue(true);
      fs.readFileSync.mockReturnValue('mock yaml content');
      yaml.load.mockReturnValue(sampleData);
      ErrorCodes.load();
    });

    it('should return true for existing code', () => {
      // Given / When
      const result = ErrorCodes.hasError('CFG_001');

      // Then
      expect(result).toBe(true);
    });

    it('should return false for non-existing code', () => {
      // Given / When
      const result = ErrorCodes.hasError('UNKNOWN');

      // Then
      expect(result).toBe(false);
    });

    it('should return false for null code', () => {
      // Given / When
      const result = ErrorCodes.hasError(null);

      // Then
      expect(result).toBe(false);
    });
  });

  describe('getAllCodes()', () => {
    beforeEach(() => {
      fs.existsSync.mockReturnValue(true);
      fs.readFileSync.mockReturnValue('mock yaml content');
      yaml.load.mockReturnValue(sampleData);
      ErrorCodes.load();
    });

    it('should return all error codes', () => {
      // Given / When
      const codes = ErrorCodes.getAllCodes();

      // Then
      expect(codes).toContain('CFG_001');
      expect(codes).toContain('CFG_002');
      expect(codes).toContain('AGT_001');
      expect(codes).toContain('SYS_001');
      expect(codes.length).toBe(4);
    });
  });

  describe('edge cases', () => {
    it('should handle YAML with empty codes section', () => {
      // Given
      const emptyData = {
        metadata: { version: '1.0.0' },
        categories: {},
        codes: {},
      };
      fs.existsSync.mockReturnValue(true);
      fs.readFileSync.mockReturnValue('mock yaml content');
      yaml.load.mockReturnValue(emptyData);

      // When
      ErrorCodes.load();
      const codes = ErrorCodes.getAllCodes();

      // Then
      expect(codes).toEqual([]);
    });

    it('should handle YAML with missing codes section', () => {
      // Given
      const partialData = {
        metadata: { version: '1.0.0' },
        categories: { CFG: { name: 'Configuration' } },
      };
      fs.existsSync.mockReturnValue(true);
      fs.readFileSync.mockReturnValue('mock yaml content');
      yaml.load.mockReturnValue(partialData);

      // When
      ErrorCodes.load();
      const codes = ErrorCodes.getAllCodes();

      // Then
      expect(codes).toEqual([]);
    });

    it('should handle error code with missing optional fields', () => {
      // Given
      const minimalData = {
        metadata: { version: '1.0.0' },
        categories: { CFG: { name: 'Configuration' } },
        codes: {
          MIN_001: {
            code: 'MIN_001',
            category: 'CONFIG',
            severity: 'ERROR',
            message: 'Minimal error',
          },
        },
      };
      fs.existsSync.mockReturnValue(true);
      fs.readFileSync.mockReturnValue('mock yaml content');
      yaml.load.mockReturnValue(minimalData);

      // When
      ErrorCodes.load();
      const errorDef = ErrorCodes.getError('MIN_001');

      // Then
      expect(errorDef.code).toBe('MIN_001');
      expect(errorDef.message).toBe('Minimal error');
    });
  });
});
