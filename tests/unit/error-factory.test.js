/**
 * Error System - Tests
 *
 * @module tests/unit/error-factory.test.js
 * @story ERR-001: Unified Error System
 */

const {
  AIOSError,
  ErrorCodes,
  ErrorFactory,
  createError,
  isAIOSError,
  getUserMessage,
} = require('../../.aios-core/core/errors');

describe('Error System', () => {
  // ============================================================
  // 1. ErrorCodes Tests
  // ============================================================
  describe('ErrorCodes', () => {
    test('should load error codes from YAML', () => {
      const data = ErrorCodes.load();
      expect(data).toBeDefined();
      expect(data.codes).toBeDefined();
      expect(data.categories).toBeDefined();
    });

    test('should get error by code', () => {
      const error = ErrorCodes.getError('FIL_001');
      expect(error).toBeDefined();
      expect(error.code).toBe('FIL_001');
      expect(error.category).toBe('FILE');
    });

    test('should return null for unknown code', () => {
      const error = ErrorCodes.getError('UNKNOWN_999');
      expect(error).toBeNull();
    });

    test('should interpolate variables', () => {
      const errorDef = ErrorCodes.getError('FIL_001');
      const interpolated = ErrorCodes.interpolate(errorDef, { path: '/test/file.yaml' });
      expect(interpolated.message).toContain('/test/file.yaml');
    });

    test('should get errors by category', () => {
      const fileErrors = ErrorCodes.getErrorsByCategory('FILE');
      expect(fileErrors.length).toBeGreaterThan(0);
    });

    test('should check if error code exists', () => {
      expect(ErrorCodes.hasError('FIL_001')).toBe(true);
      expect(ErrorCodes.hasError('UNKNOWN_999')).toBe(false);
    });

    test('should get all codes', () => {
      const codes = ErrorCodes.getAllCodes();
      expect(codes.length).toBeGreaterThan(30);
      expect(codes).toContain('FIL_001');
    });

    test('should have all required categories', () => {
      const categories = ErrorCodes.getCategories();
      expect(categories.CFG).toBeDefined();
      expect(categories.AGT).toBeDefined();
      expect(categories.FIL).toBeDefined();
      expect(categories.GIT).toBeDefined();
      expect(categories.NET).toBeDefined();
      expect(categories.VAL).toBeDefined();
      expect(categories.PRJ).toBeDefined();
    });
  });

  // ============================================================
  // 2. AIOSError Tests
  // ============================================================
  describe('AIOSError', () => {
    test('should create error with required fields', () => {
      const error = new AIOSError('TEST_001', 'Test error message');
      expect(error.code).toBe('TEST_001');
      expect(error.message).toBe('Test error message');
      expect(error.name).toBe('AIOSError');
    });

    test('should have default values', () => {
      const error = new AIOSError('TEST_001', 'Test');
      expect(error.category).toBe('GENERAL');
      expect(error.severity).toBe('ERROR');
      expect(error.recoverable).toBe(false);
    });

    test('should accept custom options', () => {
      const error = new AIOSError('TEST_001', 'Test', {
        category: 'FILE',
        severity: 'CRITICAL',
        recoverable: true,
        recoverySteps: ['Step 1', 'Step 2'],
        docUrl: 'https://example.com',
        context: { file: 'test.yaml' },
      });

      expect(error.category).toBe('FILE');
      expect(error.severity).toBe('CRITICAL');
      expect(error.recoverable).toBe(true);
      expect(error.recoverySteps).toHaveLength(2);
      expect(error.docUrl).toBe('https://example.com');
      expect(error.context.file).toBe('test.yaml');
    });

    test('should have timestamp', () => {
      const error = new AIOSError('TEST_001', 'Test');
      expect(error.timestamp).toBeDefined();
      expect(new Date(error.timestamp)).toBeInstanceOf(Date);
    });

    test('should convert to user message', () => {
      const error = new AIOSError('TEST_001', 'Technical message', {
        category: 'FILE',
        severity: 'ERROR',
      });

      const userMsg = error.toUserMessage();
      expect(userMsg.code).toBe('TEST_001');
      expect(userMsg.category).toBe('FILE');
    });

    test('should convert to JSON', () => {
      const error = new AIOSError('TEST_001', 'Test', {
        context: { key: 'value' },
      });

      const json = error.toJSON();
      expect(json.name).toBe('AIOSError');
      expect(json.code).toBe('TEST_001');
      expect(json.stack).toBeDefined();
    });

    test('should be instance of Error', () => {
      const error = new AIOSError('TEST_001', 'Test');
      expect(error).toBeInstanceOf(Error);
    });
  });

  // ============================================================
  // 3. ErrorFactory Tests
  // ============================================================
  describe('ErrorFactory', () => {
    test('should create error from code', () => {
      const error = ErrorFactory.create('FIL_001', { path: '/test.yaml' });
      expect(error).toBeInstanceOf(AIOSError);
      expect(error.code).toBe('FIL_001');
    });

    test('should interpolate variables in factory', () => {
      const error = ErrorFactory.create('FIL_001', { path: '/my/file.yaml' });
      expect(error.message).toContain('/my/file.yaml');
    });

    // File errors
    test('should create fileNotFound error', () => {
      const error = ErrorFactory.fileNotFound('/config.yaml');
      expect(error.code).toBe('FIL_001');
      expect(error.message).toContain('/config.yaml');
    });

    test('should create fileReadError error', () => {
      const error = ErrorFactory.fileReadError('/data.json');
      expect(error.code).toBe('FIL_002');
    });

    test('should create fileWriteError error', () => {
      const error = ErrorFactory.fileWriteError('/output.txt');
      expect(error.code).toBe('FIL_003');
    });

    test('should create directoryNotFound error', () => {
      const error = ErrorFactory.directoryNotFound('/missing/dir');
      expect(error.code).toBe('FIL_004');
    });

    // Agent errors
    test('should create agentNotFound error', () => {
      const error = ErrorFactory.agentNotFound('custom-agent');
      expect(error.code).toBe('AGT_001');
      expect(error.message).toContain('custom-agent');
    });

    test('should create agentActivationFailed error', () => {
      const error = ErrorFactory.agentActivationFailed('dev', 'Missing config');
      expect(error.code).toBe('AGT_002');
      expect(error.message).toContain('Missing config');
    });

    test('should create agentTimeout error', () => {
      const error = ErrorFactory.agentTimeout('qa', 30);
      expect(error.code).toBe('AGT_003');
      expect(error.message).toContain('30');
    });

    // Config errors
    test('should create configNotFound error', () => {
      const error = ErrorFactory.configNotFound();
      expect(error.code).toBe('CFG_001');
    });

    test('should create configInvalidValue error', () => {
      const error = ErrorFactory.configInvalidValue('timeout');
      expect(error.code).toBe('CFG_002');
      expect(error.message).toContain('timeout');
    });

    // Git errors
    test('should create notGitRepo error', () => {
      const error = ErrorFactory.notGitRepo();
      expect(error.code).toBe('GIT_001');
    });

    test('should create gitMergeConflict error', () => {
      const error = ErrorFactory.gitMergeConflict('file1.js, file2.js');
      expect(error.code).toBe('GIT_002');
    });

    test('should create uncommittedChanges error', () => {
      const error = ErrorFactory.uncommittedChanges();
      expect(error.code).toBe('GIT_004');
      expect(error.severity).toBe('WARNING');
    });

    // Network errors
    test('should create networkError error', () => {
      const error = ErrorFactory.networkError('https://api.example.com');
      expect(error.code).toBe('NET_001');
    });

    test('should create rateLimitExceeded error', () => {
      const error = ErrorFactory.rateLimitExceeded();
      expect(error.code).toBe('NET_002');
    });

    test('should create authFailed error', () => {
      const error = ErrorFactory.authFailed('github');
      expect(error.code).toBe('NET_003');
    });

    // Validation errors
    test('should create invalidInput error', () => {
      const error = ErrorFactory.invalidInput('email', 'Invalid format');
      expect(error.code).toBe('VAL_001');
    });

    test('should create requiredFieldMissing error', () => {
      const error = ErrorFactory.requiredFieldMissing('name');
      expect(error.code).toBe('VAL_002');
    });

    test('should create valueOutOfRange error', () => {
      const error = ErrorFactory.valueOutOfRange('age', 0, 120);
      expect(error.code).toBe('VAL_003');
      expect(error.message).toContain('0');
      expect(error.message).toContain('120');
    });

    // Project errors
    test('should create projectNotInitialized error', () => {
      const error = ErrorFactory.projectNotInitialized();
      expect(error.code).toBe('PRJ_001');
    });

    test('should create dependencyNotFound error', () => {
      const error = ErrorFactory.dependencyNotFound('express');
      expect(error.code).toBe('PRJ_004');
    });

    // General errors
    test('should create unknownError error', () => {
      const error = ErrorFactory.unknownError();
      expect(error.code).toBe('GEN_001');
    });

    test('should create operationCancelled error', () => {
      const error = ErrorFactory.operationCancelled();
      expect(error.code).toBe('GEN_002');
    });

    test('should create featureNotImplemented error', () => {
      const error = ErrorFactory.featureNotImplemented('AI Assistant');
      expect(error.code).toBe('GEN_003');
    });

    // Utility methods
    test('should check if code exists', () => {
      expect(ErrorFactory.hasCode('FIL_001')).toBe(true);
      expect(ErrorFactory.hasCode('FAKE_999')).toBe(false);
    });

    test('should get all codes', () => {
      const codes = ErrorFactory.getAllCodes();
      expect(codes.length).toBeGreaterThan(30);
    });

    test('should wrap generic Error', () => {
      const originalError = new Error('Original error message');
      const wrapped = ErrorFactory.wrap(originalError, 'GEN_001');

      expect(wrapped).toBeInstanceOf(AIOSError);
      expect(wrapped.context.originalMessage).toBe('Original error message');
    });

    test('should not double wrap AIOSError', () => {
      const aiosError = ErrorFactory.fileNotFound('/test.yaml');
      const wrapped = ErrorFactory.wrap(aiosError);

      expect(wrapped).toBe(aiosError);
    });
  });

  // ============================================================
  // 4. createError Function Tests
  // ============================================================
  describe('createError function', () => {
    test('should create error from code', () => {
      const error = createError('FIL_001', {
        variables: { path: '/test.yaml' },
      });

      expect(error).toBeInstanceOf(AIOSError);
      expect(error.code).toBe('FIL_001');
    });

    test('should handle unknown code', () => {
      const error = createError('UNKNOWN_999');
      expect(error.code).toBe('UNKNOWN_999');
      expect(error.message).toContain('Unknown error code');
    });

    test('should accept context', () => {
      const error = createError('FIL_001', {
        context: { extraInfo: 'details' },
      });

      expect(error.context.extraInfo).toBe('details');
    });
  });

  // ============================================================
  // 5. Utility Functions Tests
  // ============================================================
  describe('Utility functions', () => {
    test('isAIOSError should detect AIOSError', () => {
      const aiosError = new AIOSError('TEST', 'message');
      const normalError = new Error('message');

      expect(isAIOSError(aiosError)).toBe(true);
      expect(isAIOSError(normalError)).toBe(false);
      expect(isAIOSError(null)).toBe(false);
      expect(isAIOSError('string')).toBe(false);
    });

    test('getUserMessage should extract message', () => {
      const aiosError = new AIOSError('TEST', 'Technical', {
        userMessage: 'User friendly',
      });
      aiosError.userMessage = 'User friendly';

      const normalError = new Error('Normal error');

      expect(getUserMessage(aiosError)).toBe('User friendly');
      expect(getUserMessage(normalError)).toBe('Normal error');
      expect(getUserMessage(null)).toBe('An unexpected error occurred');
    });
  });

  // ============================================================
  // 6. Integration Tests
  // ============================================================
  describe('Integration', () => {
    test('should work in try-catch scenario', () => {
      try {
        throw ErrorFactory.fileNotFound('/missing/config.yaml');
      } catch (error) {
        expect(isAIOSError(error)).toBe(true);
        expect(error.code).toBe('FIL_001');
        expect(error.recoverable).toBe(true);
        expect(error.recoverySteps.length).toBeGreaterThan(0);
      }
    });

    test('should chain errors properly', () => {
      try {
        try {
          throw new Error('Original failure');
        } catch (innerError) {
          throw ErrorFactory.wrap(innerError, 'FIL_002', { path: '/file.yaml' });
        }
      } catch (error) {
        expect(error.code).toBe('FIL_002');
        expect(error.context.originalMessage).toBe('Original failure');
      }
    });

    test('should format error for logging', () => {
      const error = ErrorFactory.agentNotFound('test-agent');
      const json = error.toJSON();

      expect(json.code).toBeDefined();
      expect(json.message).toBeDefined();
      expect(json.category).toBeDefined();
      expect(json.timestamp).toBeDefined();
      expect(json.stack).toBeDefined();
    });
  });
});
