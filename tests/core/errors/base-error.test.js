/**
 * Tests for base-error.js — AIOSError Base Class
 *
 * Covers:
 * - Constructor and property initialization (AC1)
 * - toUserMessage() method (AC1)
 * - toJSON() method (AC1)
 * - Stack trace capture (AC1)
 * - Error inheritance behavior
 * - Edge cases: missing options, invalid inputs
 *
 * @story STORY-OPT-D1
 */

const AIOSError = require('../../../.aios-core/core/errors/base-error');

describe('AIOSError', () => {
  describe('constructor', () => {
    it('should create an error with code and message', () => {
      // Given / When
      const error = new AIOSError('CFG_001', 'Configuration file not found');

      // Then
      expect(error).toBeInstanceOf(Error);
      expect(error).toBeInstanceOf(AIOSError);
      expect(error.code).toBe('CFG_001');
      expect(error.message).toBe('Configuration file not found');
      expect(error.name).toBe('AIOSError');
    });

    it('should set default category to GENERAL when not provided', () => {
      // Given / When
      const error = new AIOSError('CFG_001', 'Test message');

      // Then
      expect(error.category).toBe('GENERAL');
    });

    it('should accept category option', () => {
      // Given / When
      const error = new AIOSError('CFG_001', 'Test message', {
        category: 'CONFIG',
      });

      // Then
      expect(error.category).toBe('CONFIG');
    });

    it('should set default severity to ERROR when not provided', () => {
      // Given / When
      const error = new AIOSError('CFG_001', 'Test message');

      // Then
      expect(error.severity).toBe('ERROR');
    });

    it('should accept severity option', () => {
      // Given / When
      const error = new AIOSError('CFG_001', 'Test message', {
        severity: 'CRITICAL',
      });

      // Then
      expect(error.severity).toBe('CRITICAL');
    });

    it('should accept severity values: CRITICAL, ERROR, WARNING, INFO', () => {
      // Given / When
      const critical = new AIOSError('TEST', 'msg', { severity: 'CRITICAL' });
      const error = new AIOSError('TEST', 'msg', { severity: 'ERROR' });
      const warning = new AIOSError('TEST', 'msg', { severity: 'WARNING' });
      const info = new AIOSError('TEST', 'msg', { severity: 'INFO' });

      // Then
      expect(critical.severity).toBe('CRITICAL');
      expect(error.severity).toBe('ERROR');
      expect(warning.severity).toBe('WARNING');
      expect(info.severity).toBe('INFO');
    });

    it('should set default recoverable to false when not provided', () => {
      // Given / When
      const error = new AIOSError('CFG_001', 'Test message');

      // Then
      expect(error.recoverable).toBe(false);
    });

    it('should accept recoverable option', () => {
      // Given / When
      const error = new AIOSError('CFG_001', 'Test message', {
        recoverable: true,
      });

      // Then
      expect(error.recoverable).toBe(true);
    });

    it('should accept recoverySteps option', () => {
      // Given
      const steps = [
        "Run 'aios config init'",
        'Check file permissions',
      ];

      // When
      const error = new AIOSError('CFG_001', 'Test message', {
        recoverySteps: steps,
      });

      // Then
      expect(error.recoverySteps).toEqual(steps);
    });

    it('should set default recoverySteps to empty array', () => {
      // Given / When
      const error = new AIOSError('CFG_001', 'Test message');

      // Then
      expect(error.recoverySteps).toEqual([]);
    });

    it('should accept docUrl option', () => {
      // Given / When
      const error = new AIOSError('CFG_001', 'Test message', {
        docUrl: 'https://docs.aios.dev/errors/CFG_001',
      });

      // Then
      expect(error.docUrl).toBe('https://docs.aios.dev/errors/CFG_001');
    });

    it('should set default docUrl to null', () => {
      // Given / When
      const error = new AIOSError('CFG_001', 'Test message');

      // Then
      expect(error.docUrl).toBeNull();
    });

    it('should accept context option', () => {
      // Given
      const context = { path: '/path/to/config.yaml', line: 42 };

      // When
      const error = new AIOSError('CFG_001', 'Test message', {
        context,
      });

      // Then
      expect(error.context).toEqual(context);
    });

    it('should set default context to empty object', () => {
      // Given / When
      const error = new AIOSError('CFG_001', 'Test message');

      // Then
      expect(error.context).toEqual({});
    });

    it('should set timestamp to current ISO time', () => {
      // Given
      const beforeTime = new Date().toISOString();

      // When
      const error = new AIOSError('CFG_001', 'Test message');

      // Then
      const afterTime = new Date().toISOString();
      expect(error.timestamp).toBeDefined();
      expect(new Date(error.timestamp).getTime()).toBeGreaterThanOrEqual(new Date(beforeTime).getTime());
      expect(new Date(error.timestamp).getTime()).toBeLessThanOrEqual(new Date(afterTime).getTime());
    });

    it('should capture stack trace', () => {
      // Given / When
      const error = new AIOSError('CFG_001', 'Test message');

      // Then
      expect(error.stack).toBeDefined();
      expect(error.stack).toContain('AIOSError');
      // Stack trace should contain the error message
      expect(error.stack).toContain('Test message');
    });

    it('should include all options in a complete error', () => {
      // Given
      const options = {
        category: 'CONFIG',
        severity: 'CRITICAL',
        recoverable: true,
        recoverySteps: ['Step 1', 'Step 2'],
        docUrl: 'https://docs.aios.dev/errors/CFG_001',
        context: { file: 'config.yaml' },
      };

      // When
      const error = new AIOSError('CFG_001', 'Config error', options);

      // Then
      expect(error.code).toBe('CFG_001');
      expect(error.message).toBe('Config error');
      expect(error.category).toBe('CONFIG');
      expect(error.severity).toBe('CRITICAL');
      expect(error.recoverable).toBe(true);
      expect(error.recoverySteps).toEqual(['Step 1', 'Step 2']);
      expect(error.docUrl).toBe('https://docs.aios.dev/errors/CFG_001');
      expect(error.context).toEqual({ file: 'config.yaml' });
      expect(error.timestamp).toBeDefined();
    });
  });

  describe('toUserMessage()', () => {
    it('should return user-friendly message object', () => {
      // Given
      const error = new AIOSError('CFG_001', 'Config error', {
        category: 'CONFIG',
        severity: 'ERROR',
        recoverable: true,
        recoverySteps: ['Step 1', 'Step 2'],
        docUrl: 'https://docs.aios.dev/errors/CFG_001',
      });

      // When
      const message = error.toUserMessage();

      // Then
      expect(message).toHaveProperty('code', 'CFG_001');
      expect(message).toHaveProperty('message', 'Config error');
      expect(message).toHaveProperty('category', 'CONFIG');
      expect(message).toHaveProperty('severity', 'ERROR');
      expect(message).toHaveProperty('recoverable', true);
      expect(message).toHaveProperty('recoverySteps');
      expect(message.recoverySteps).toEqual(['Step 1', 'Step 2']);
      expect(message).toHaveProperty('docUrl', 'https://docs.aios.dev/errors/CFG_001');
    });

    it('should include context in user message', () => {
      // Given
      const error = new AIOSError('CFG_001', 'Config error', {
        context: { path: '/config.yaml' },
      });

      // When
      const message = error.toUserMessage();

      // Then
      expect(message.context).toEqual({ path: '/config.yaml' });
    });

    it('should include timestamp in user message', () => {
      // Given
      const error = new AIOSError('CFG_001', 'Config error');

      // When
      const message = error.toUserMessage();

      // Then
      expect(message.timestamp).toBeDefined();
    });

    it('should exclude internal properties from user message', () => {
      // Given
      const error = new AIOSError('CFG_001', 'Config error');

      // When
      const message = error.toUserMessage();

      // Then
      expect(message).not.toHaveProperty('stack');
    });
  });

  describe('toJSON()', () => {
    it('should return JSON-serializable object', () => {
      // Given
      const error = new AIOSError('CFG_001', 'Config error', {
        category: 'CONFIG',
        severity: 'ERROR',
        recoverable: true,
        recoverySteps: ['Step 1'],
        context: { file: 'test.yaml' },
      });

      // When
      const json = error.toJSON();

      // Then
      expect(() => JSON.stringify(json)).not.toThrow();
    });

    it('should include all error properties in JSON output', () => {
      // Given
      const error = new AIOSError('CFG_001', 'Config error', {
        category: 'CONFIG',
        severity: 'CRITICAL',
        recoverable: false,
        recoverySteps: ['Step 1'],
        docUrl: 'https://example.com',
        context: { key: 'value' },
      });

      // When
      const json = error.toJSON();
      const parsed = JSON.parse(JSON.stringify(json));

      // Then
      expect(parsed.code).toBe('CFG_001');
      expect(parsed.message).toBe('Config error');
      expect(parsed.name).toBe('AIOSError');
      expect(parsed.category).toBe('CONFIG');
      expect(parsed.severity).toBe('CRITICAL');
      expect(parsed.recoverable).toBe(false);
      expect(parsed.recoverySteps).toEqual(['Step 1']);
      expect(parsed.docUrl).toBe('https://example.com');
      expect(parsed.context).toEqual({ key: 'value' });
      expect(parsed.timestamp).toBeDefined();
      expect(parsed.stack).toBeDefined();
    });

    it('should include stack trace in JSON for debugging', () => {
      // Given
      const error = new AIOSError('CFG_001', 'Config error');

      // When
      const json = error.toJSON();

      // Then
      expect(json.stack).toBeDefined();
      expect(typeof json.stack).toBe('string');
    });
  });

  describe('Error inheritance', () => {
    it('should be instanceof Error', () => {
      // Given / When
      const error = new AIOSError('CFG_001', 'Test');

      // Then
      expect(error instanceof Error).toBe(true);
    });

    it('should have correct name property', () => {
      // Given / When
      const error = new AIOSError('CFG_001', 'Test');

      // Then
      expect(error.name).toBe('AIOSError');
    });

    it('should be catchable as Error', () => {
      // Given
      let caught = false;

      // When
      try {
        throw new AIOSError('CFG_001', 'Test');
      } catch (e) {
        if (e instanceof Error) {
          caught = true;
        }
      }

      // Then
      expect(caught).toBe(true);
    });

    it('should preserve message through throw/catch', () => {
      // Given
      let caughtError = null;

      // When
      try {
        throw new AIOSError('CFG_001', 'Original message');
      } catch (e) {
        caughtError = e;
      }

      // Then
      expect(caughtError.message).toBe('Original message');
    });
  });

  describe('edge cases', () => {
    it('should handle empty code', () => {
      // Given / When
      const error = new AIOSError('', 'Message');

      // Then
      expect(error.code).toBe('');
    });

    it('should handle empty message', () => {
      // Given / When
      const error = new AIOSError('CFG_001', '');

      // Then
      expect(error.message).toBe('');
    });

    it('should handle null options', () => {
      // Given / When
      const error = new AIOSError('CFG_001', 'Message', null);

      // Then
      expect(error.category).toBe('GENERAL');
      expect(error.severity).toBe('ERROR');
    });

    it('should handle undefined options', () => {
      // Given / When
      const error = new AIOSError('CFG_001', 'Message', undefined);

      // Then
      expect(error.category).toBe('GENERAL');
      expect(error.severity).toBe('ERROR');
    });

    it('should handle empty context object', () => {
      // Given / When
      const error = new AIOSError('CFG_001', 'Message', { context: {} });

      // Then
      expect(error.context).toEqual({});
    });

    it('should handle empty recoverySteps array', () => {
      // Given / When
      const error = new AIOSError('CFG_001', 'Message', { recoverySteps: [] });

      // Then
      expect(error.recoverySteps).toEqual([]);
    });

    it('should handle special characters in message', () => {
      // Given / When
      const error = new AIOSError('CFG_001', 'Error: "quotes" and \'apostrophes\' \n newline');

      // Then
      expect(error.message).toBe('Error: "quotes" and \'apostrophes\' \n newline');
    });

    it('should handle unicode in message', () => {
      // Given / When
      const error = new AIOSError('CFG_001', 'Config error: 中文测试 日本語 한국어');

      // Then
      expect(error.message).toBe('Config error: 中文测试 日本語 한국어');
    });

    it('should handle emoji in message', () => {
      // Given / When
      const error = new AIOSError('CFG_001', 'Error: warning caution');

      // Then
      expect(error.message).toBe('Error: warning caution');
    });
  });
});
