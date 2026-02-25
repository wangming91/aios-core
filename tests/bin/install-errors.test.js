/**
 * Tests for Install Errors
 *
 * Tests error message formatting and classification.
 */

'use strict';

const {
  ERROR_CLASSIFICATION,
  ERROR_MESSAGES,
  formatErrorMessage,
  formatRollbackMessage,
  formatSuccessMessage,
  sanitizeErrorForUser,
  getErrorClassification,
} = require('../../bin/utils/install-errors');

describe('install-errors', () => {
  describe('ERROR_CLASSIFICATION', () => {
    it('should have CRITICAL classification', () => {
      expect(ERROR_CLASSIFICATION.CRITICAL).toBeDefined();
      expect(ERROR_CLASSIFICATION.CRITICAL.level).toBe('CRITICAL');
      expect(ERROR_CLASSIFICATION.CRITICAL.icon).toBe('❌');
    });

    it('should have RECOVERABLE classification', () => {
      expect(ERROR_CLASSIFICATION.RECOVERABLE).toBeDefined();
      expect(ERROR_CLASSIFICATION.RECOVERABLE.level).toBe('RECOVERABLE');
    });

    it('should have WARNING classification', () => {
      expect(ERROR_CLASSIFICATION.WARNING).toBeDefined();
      expect(ERROR_CLASSIFICATION.WARNING.level).toBe('WARNING');
    });
  });

  describe('ERROR_MESSAGES', () => {
    it('should have EACCES error template', () => {
      expect(ERROR_MESSAGES.EACCES).toBeDefined();
      expect(ERROR_MESSAGES.EACCES.title).toBe('Permission Denied');
      expect(ERROR_MESSAGES.EACCES.recovery.length).toBeGreaterThan(0);
    });

    it('should have ENOSPC error template', () => {
      expect(ERROR_MESSAGES.ENOSPC).toBeDefined();
      expect(ERROR_MESSAGES.ENOSPC.title).toBe('Disk Space Exhausted');
    });

    it('should have NETWORK_TIMEOUT error template', () => {
      expect(ERROR_MESSAGES.NETWORK_TIMEOUT).toBeDefined();
      expect(ERROR_MESSAGES.NETWORK_TIMEOUT.recovery.length).toBeGreaterThan(0);
    });

    it('should have UNKNOWN_ERROR error template', () => {
      expect(ERROR_MESSAGES.UNKNOWN_ERROR).toBeDefined();
      expect(ERROR_MESSAGES.UNKNOWN_ERROR.title).toBe('Unknown Installation Error');
    });
  });

  describe('getErrorClassification', () => {
    it('should return CRITICAL for file system errors', () => {
      const classification = getErrorClassification('EACCES');
      expect(classification.level).toBe('CRITICAL');
    });

    it('should return CRITICAL for ENOSPC', () => {
      const classification = getErrorClassification('ENOSPC');
      expect(classification.level).toBe('CRITICAL');
    });

    it('should return CRITICAL for GIT_CORRUPTION', () => {
      const classification = getErrorClassification('GIT_CORRUPTION');
      expect(classification.level).toBe('CRITICAL');
    });

    it('should return RECOVERABLE for NETWORK_TIMEOUT', () => {
      const classification = getErrorClassification('NETWORK_TIMEOUT');
      expect(classification.level).toBe('RECOVERABLE');
    });

    it('should return RECOVERABLE for NETWORK_ERROR', () => {
      const classification = getErrorClassification('NETWORK_ERROR');
      expect(classification.level).toBe('RECOVERABLE');
    });

    it('should return RECOVERABLE for DEPENDENCY_FAILED', () => {
      const classification = getErrorClassification('DEPENDENCY_FAILED');
      expect(classification.level).toBe('RECOVERABLE');
    });

    it('should return WARNING for unknown codes', () => {
      const classification = getErrorClassification('SOME_UNKNOWN_CODE');
      expect(classification.level).toBe('WARNING');
    });
  });

  describe('formatErrorMessage', () => {
    it('should format error with title and description', () => {
      const error = new Error('Test error');
      const message = formatErrorMessage(error, 'EACCES');
      expect(message).toContain('Permission Denied');
    });

    it('should include recovery steps', () => {
      const error = new Error('Test error');
      const message = formatErrorMessage(error, 'EACCES');
      expect(message).toContain('Recovery Steps:');
    });

    it('should include error code', () => {
      const error = new Error('Test error');
      const message = formatErrorMessage(error, 'EACCES');
      expect(message).toContain('EACCES');
    });

    it('should handle unknown error codes', () => {
      const error = new Error('Test error');
      const message = formatErrorMessage(error, 'UNKNOWN_CODE');
      expect(message).toContain('Unknown Installation Error');
    });

    it('should use error.code if no errorCode provided', () => {
      const error = new Error('Test error');
      error.code = 'ENOSPC';
      const message = formatErrorMessage(error);
      expect(message).toContain('Disk Space Exhausted');
    });

    it('should default to UNKNOWN_ERROR', () => {
      const error = new Error('Test error');
      const message = formatErrorMessage(error);
      expect(message).toContain('Unknown Installation Error');
    });
  });

  describe('formatRollbackMessage', () => {
    it('should format successful rollback', () => {
      const message = formatRollbackMessage(true);
      expect(message).toContain('Rollback Completed Successfully');
      expect(message).toContain('restored to its previous state');
    });

    it('should format failed rollback', () => {
      const message = formatRollbackMessage(false, ['file1.txt', 'file2.txt']);
      expect(message).toContain('Rollback Completed with Errors');
      expect(message).toContain('Manual Recovery Required');
    });

    it('should list failed files', () => {
      const message = formatRollbackMessage(false, ['config.yaml', 'settings.json']);
      expect(message).toContain('config.yaml');
      expect(message).toContain('settings.json');
    });

    it('should handle empty failed files list', () => {
      const message = formatRollbackMessage(false, []);
      expect(message).toContain('Rollback Completed with Errors');
    });
  });

  describe('formatSuccessMessage', () => {
    it('should format success message', () => {
      const message = formatSuccessMessage();
      expect(message).toContain('Installation Completed Successfully');
    });

    it('should include next steps', () => {
      const message = formatSuccessMessage();
      expect(message).toContain('Next Steps:');
    });

    it('should mention installation log', () => {
      const message = formatSuccessMessage();
      expect(message).toContain('.aios-install.log');
    });
  });

  describe('sanitizeErrorForUser', () => {
    it('should return message without stack trace', () => {
      const error = new Error('Test error\n    at Object.test (file.js:10:5)');
      const sanitized = sanitizeErrorForUser(error);
      expect(sanitized).toBe('Test error');
    });

    it('should handle null error', () => {
      const sanitized = sanitizeErrorForUser(null);
      expect(sanitized).toBe('An unknown error occurred');
    });

    it('should handle undefined error', () => {
      const sanitized = sanitizeErrorForUser(undefined);
      expect(sanitized).toBe('An unknown error occurred');
    });

    it('should remove file paths', () => {
      const error = new Error('Error at /path/to/file.js:10:5');
      const sanitized = sanitizeErrorForUser(error);
      expect(sanitized).not.toContain('/path/to/file.js');
    });

    it('should handle string errors', () => {
      const sanitized = sanitizeErrorForUser('Simple error');
      expect(sanitized).toBe('Simple error');
    });
  });
});
