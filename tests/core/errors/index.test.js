/**
 * Tests for index.js — Error Module Entry Point
 *
 * Covers:
 * - createError factory function (AC4)
 * - isAIOSError utility function
 * - getUserMessage utility function
 * - ErrorFormatter and formatUserError (STORY-OPT-D2)
 * - RecoveryEngine and suggestFix (STORY-OPT-D2)
 * - Module exports
 *
 * @story STORY-OPT-D1
 * @story STORY-OPT-D2
 */

const fs = require('fs');
const yaml = require('js-yaml');

// Mock fs and yaml before requiring the module
jest.mock('fs');
jest.mock('js-yaml', () => ({
  load: jest.fn(),
}));

// Import after mocking
const {
  AIOSError,
  ErrorCodes,
  createError,
  isAIOSError,
  getUserMessage,
  ErrorFormatter,
  formatUserError,
  RecoveryEngine,
  suggestFix,
} = require('../../../.aios-core/core/errors');

describe('errors/index.js', () => {
  // Sample error codes data for testing
  const sampleData = {
    metadata: {
      version: '1.0.0',
      lastUpdated: '2026-02-20',
    },
    categories: {
      CFG: { name: 'Configuration' },
    },
    codes: {
      CFG_001: {
        code: 'CFG_001',
        category: 'CONFIG',
        severity: 'ERROR',
        message: 'Configuration file not found',
        userMessage: '配置文件未找到',
        recoverable: true,
        recoverySteps: ['Run aios config init'],
        docUrl: 'https://docs.aios.dev/errors/CFG_001',
      },
      CFG_002: {
        code: 'CFG_002',
        category: 'CONFIG',
        severity: 'WARNING',
        message: 'Invalid configuration value for {field}',
        userMessage: '配置字段 {field} 的值无效',
        recoverable: true,
        recoverySteps: ['Check {field} value'],
        docUrl: 'https://docs.aios.dev/errors/CFG_002',
      },
    },
  };

  beforeEach(() => {
    jest.clearAllMocks();
    ErrorCodes._resetCache && ErrorCodes._resetCache();
    fs.existsSync.mockReturnValue(true);
    fs.readFileSync.mockReturnValue('mock yaml content');
    yaml.load.mockReturnValue(sampleData);
  });

  describe('exports', () => {
    it('should export AIOSError class', () => {
      expect(AIOSError).toBeDefined();
      expect(typeof AIOSError).toBe('function');
    });

    it('should export ErrorCodes class', () => {
      expect(ErrorCodes).toBeDefined();
      expect(typeof ErrorCodes).toBe('function');
    });

    it('should export createError function', () => {
      expect(createError).toBeDefined();
      expect(typeof createError).toBe('function');
    });

    it('should export isAIOSError function', () => {
      expect(isAIOSError).toBeDefined();
      expect(typeof isAIOSError).toBe('function');
    });

    it('should export getUserMessage function', () => {
      expect(getUserMessage).toBeDefined();
      expect(typeof getUserMessage).toBe('function');
    });

    it('should export ErrorFormatter class', () => {
      expect(ErrorFormatter).toBeDefined();
      expect(typeof ErrorFormatter).toBe('function');
    });

    it('should export formatUserError function', () => {
      expect(formatUserError).toBeDefined();
      expect(typeof formatUserError).toBe('function');
    });

    it('should export RecoveryEngine class', () => {
      expect(RecoveryEngine).toBeDefined();
      expect(typeof RecoveryEngine).toBe('function');
    });

    it('should export suggestFix function', () => {
      expect(suggestFix).toBeDefined();
      expect(typeof suggestFix).toBe('function');
    });
  });

  describe('createError()', () => {
    it('should create error from error code definition', () => {
      // Given / When
      const error = createError('CFG_001');

      // Then
      expect(error).toBeInstanceOf(AIOSError);
      expect(error.code).toBe('CFG_001');
      expect(error.message).toBe('Configuration file not found');
      expect(error.category).toBe('CONFIG');
      expect(error.severity).toBe('ERROR');
      expect(error.recoverable).toBe(true);
      expect(error.recoverySteps).toEqual(['Run aios config init']);
    });

    it('should interpolate variables in message', () => {
      // Given / When
      const error = createError('CFG_002', {
        variables: { field: 'database.url' },
      });

      // Then
      expect(error.message).toBe('Invalid configuration value for database.url');
      expect(error.userMessage).toBe('配置字段 database.url 的值无效');
    });

    it('should include context in error', () => {
      // Given
      const context = { path: '/config.yaml', line: 42 };

      // When
      const error = createError('CFG_001', { context });

      // Then
      expect(error.context).toEqual(context);
    });

    it('should include cause when provided', () => {
      // Given
      const cause = new Error('Original error');

      // When
      const error = createError('CFG_001', { cause });

      // Then
      expect(error.cause).toBe(cause);
    });

    it('should create generic error for unknown code', () => {
      // Given / When
      const error = createError('UNKNOWN_CODE');

      // Then
      expect(error).toBeInstanceOf(AIOSError);
      expect(error.code).toBe('UNKNOWN_CODE');
      expect(error.message).toBe('Unknown error code: UNKNOWN_CODE');
      expect(error.category).toBe('GENERAL');
      expect(error.recoverable).toBe(false);
    });

    it('should handle null options', () => {
      // Given / When
      const error = createError('CFG_001', null);

      // Then
      expect(error).toBeInstanceOf(AIOSError);
      expect(error.code).toBe('CFG_001');
    });

    it('should handle undefined options', () => {
      // Given / When
      const error = createError('CFG_001', undefined);

      // Then
      expect(error).toBeInstanceOf(AIOSError);
      expect(error.code).toBe('CFG_001');
    });

    it('should handle empty options', () => {
      // Given / When
      const error = createError('CFG_001', {});

      // Then
      expect(error).toBeInstanceOf(AIOSError);
      expect(error.context).toEqual({});
    });
  });

  describe('isAIOSError()', () => {
    it('should return true for AIOSError instances', () => {
      // Given
      const error = new AIOSError('TEST', 'Test message');

      // When / Then
      expect(isAIOSError(error)).toBe(true);
    });

    it('should return true for createError results', () => {
      // Given
      const error = createError('CFG_001');

      // When / Then
      expect(isAIOSError(error)).toBe(true);
    });

    it('should return false for regular Error instances', () => {
      // Given
      const error = new Error('Regular error');

      // When / Then
      expect(isAIOSError(error)).toBe(false);
    });

    it('should return false for null', () => {
      // When / Then
      expect(isAIOSError(null)).toBe(false);
    });

    it('should return false for undefined', () => {
      // When / Then
      expect(isAIOSError(undefined)).toBe(false);
    });

    it('should return false for non-error objects', () => {
      // When / Then
      expect(isAIOSError({})).toBe(false);
      expect(isAIOSError('error')).toBe(false);
      expect(isAIOSError(123)).toBe(false);
    });
  });

  describe('getUserMessage()', () => {
    it('should return userMessage from AIOSError', () => {
      // Given
      const error = createError('CFG_001');

      // When
      const message = getUserMessage(error);

      // Then
      expect(message).toBe('配置文件未找到');
    });

    it('should fallback to message if userMessage not set', () => {
      // Given
      const error = new AIOSError('TEST', 'Test message');

      // When
      const message = getUserMessage(error);

      // Then
      expect(message).toBe('Test message');
    });

    it('should return message from regular Error', () => {
      // Given
      const error = new Error('Regular error message');

      // When
      const message = getUserMessage(error);

      // Then
      expect(message).toBe('Regular error message');
    });

    it('should handle Error with empty message', () => {
      // Given
      const error = new Error('');

      // When
      const message = getUserMessage(error);

      // Then
      expect(message).toBe('An unexpected error occurred');
    });

    it('should handle non-Error values', () => {
      // When / Then
      expect(getUserMessage(null)).toBe('An unexpected error occurred');
      expect(getUserMessage(undefined)).toBe('An unexpected error occurred');
      expect(getUserMessage('string error')).toBe('string error');
      expect(getUserMessage(123)).toBe('123');
    });

    it('should handle empty string', () => {
      // When
      const message = getUserMessage('');

      // Then
      expect(message).toBe('An unexpected error occurred');
    });
  });

  describe('integration', () => {
    it('should work end-to-end: create, check, and get message', () => {
      // Given
      const error = createError('CFG_002', {
        variables: { field: 'timeout' },
        context: { file: 'config.yaml' },
      });

      // When / Then
      expect(isAIOSError(error)).toBe(true);
      expect(getUserMessage(error)).toBe('配置字段 timeout 的值无效');
      expect(error.code).toBe('CFG_002');
      expect(error.category).toBe('CONFIG');
      expect(error.recoverable).toBe(true);
      expect(error.recoverySteps).toEqual(['Check timeout value']);
    });
  });
});
