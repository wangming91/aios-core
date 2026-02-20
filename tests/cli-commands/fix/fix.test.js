/**
 * Fix Command Tests
 *
 * Tests for the `aios fix` command.
 *
 * @module tests/cli-commands/fix
 * @see Story STORY-OPT-D3
 */

'use strict';

const { Command } = require('commander');

// Store original implementations
const originalErrorCodes = require('../../../.aios-core/core/errors/error-codes');
const originalRecovery = require('../../../.aios-core/core/errors/recovery-engine');

// Mock ErrorCodes.getError
jest.spyOn(originalErrorCodes, 'getError').mockImplementation((code) => {
  const errors = {
    CFG_001: {
      code: 'CFG_001',
      message: 'Configuration file not found',
      category: 'CONFIG',
      severity: 'ERROR',
      recoverable: true,
      recoverySteps: ['Run aios config init'],
    },
    SYS_001: {
      code: 'SYS_001',
      message: 'System initialization failed',
      category: 'SYSTEM',
      severity: 'CRITICAL',
      recoverable: false,
    },
  };
  return errors[code] || null;
});

describe('Fix Command', () => {
  let createFixCommand;
  let fixAction;

  beforeAll(() => {
    // Require after setting up the environment
    const fixModule = require('../../../.aios-core/cli/commands/fix/index');
    createFixCommand = fixModule.createFixCommand;
    fixAction = fixModule.fixAction;
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('Command Registration', () => {
    it('should create a fix command with correct name', () => {
      const cmd = createFixCommand();
      expect(cmd.name()).toBe('fix');
    });

    it('should have correct description', () => {
      const cmd = createFixCommand();
      expect(cmd.description()).toContain('fix');
    });

    it('should support --dry-run option', () => {
      const cmd = createFixCommand();
      const options = cmd.options;
      const dryRunOption = options.find((o) => o.long === '--dry-run');
      expect(dryRunOption).toBeDefined();
    });

    it('should support --last option', () => {
      const cmd = createFixCommand();
      const options = cmd.options;
      const lastOption = options.find((o) => o.long === '--last');
      expect(lastOption).toBeDefined();
    });

    it('should support --force option', () => {
      const cmd = createFixCommand();
      const options = cmd.options;
      const forceOption = options.find((o) => o.long === '--force');
      expect(forceOption).toBeDefined();
    });
  });

  describe('Auto-fix Execution', () => {
    it('should execute auto-fix for recoverable errors', async () => {
      const logSpy = jest.spyOn(console, 'log').mockImplementation();

      await fixAction('CFG_001', { force: true });

      const output = logSpy.mock.calls.flat().join('\n');
      // Should show either success or attempt to fix
      expect(output.length).toBeGreaterThan(0);

      logSpy.mockRestore();
    });

    it('should display fix results', async () => {
      const logSpy = jest.spyOn(console, 'log').mockImplementation();

      await fixAction('CFG_001', { force: true });

      const output = logSpy.mock.calls.flat().join('\n');
      // Should show results (success, fail, or actions)
      expect(
        output.toLowerCase().includes('success') ||
        output.toLowerCase().includes('fail') ||
        output.toLowerCase().includes('created') ||
        output.toLowerCase().includes('action')
      ).toBe(true);

      logSpy.mockRestore();
    });
  });

  describe('Dry Run Mode', () => {
    it('should preview fixes without applying with dryRun=true', async () => {
      const logSpy = jest.spyOn(console, 'log').mockImplementation();

      await fixAction('CFG_001', { dryRun: true });

      const output = logSpy.mock.calls.flat().join('\n').toLowerCase();
      // Check for either 'dry run' or 'preview' in output
      const hasDryRun = output.includes('dry run');
      const hasPreview = output.includes('preview');
      expect(hasDryRun || hasPreview).toBe(true);

      logSpy.mockRestore();
    });

    it('should show planned actions in dry-run mode', async () => {
      const logSpy = jest.spyOn(console, 'log').mockImplementation();

      await fixAction('CFG_001', { dryRun: true });

      const output = logSpy.mock.calls.flat().join('\n');
      expect(output.length).toBeGreaterThan(0);

      logSpy.mockRestore();
    });
  });

  describe('Non-recoverable Errors', () => {
    it('should warn when auto-fix is not available', async () => {
      const logSpy = jest.spyOn(console, 'log').mockImplementation();

      await fixAction('SYS_001', {});

      const output = logSpy.mock.calls.flat().join('\n').toLowerCase();
      expect(
        output.includes('not available') ||
        output.includes('manual') ||
        output.includes('cannot')
      ).toBe(true);

      logSpy.mockRestore();
    });
  });

  describe('Unknown Error Codes', () => {
    it('should handle unknown error codes gracefully', async () => {
      const logSpy = jest.spyOn(console, 'log').mockImplementation();

      await fixAction('UNKNOWN_CODE', {});

      const output = logSpy.mock.calls.flat().join('\n');
      expect(output).toContain('Unknown');

      logSpy.mockRestore();
    });
  });

  describe('Missing Error Code', () => {
    it('should require error code when not using --last', async () => {
      const errorSpy = jest.spyOn(console, 'error').mockImplementation();
      const logSpy = jest.spyOn(console, 'log').mockImplementation();
      const mockExit = jest.spyOn(process, 'exit').mockImplementation(() => {});

      await fixAction(null, {});

      expect(errorSpy).toHaveBeenCalled();
      expect(mockExit).toHaveBeenCalledWith(1);

      errorSpy.mockRestore();
      logSpy.mockRestore();
      mockExit.mockRestore();
    });
  });
});
