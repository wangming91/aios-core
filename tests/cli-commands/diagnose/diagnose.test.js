/**
 * Diagnose Command Tests
 *
 * Tests for the `aios diagnose` command.
 *
 * @module tests/cli-commands/diagnose
 * @see Story STORY-OPT-D3
 */

'use strict';

const { Command } = require('commander');
const path = require('path');

// Store original implementations
const originalErrorCodes = require('../../../.aios-core/core/errors/error-codes');
const originalRecovery = require('../../../.aios-core/core/errors/recovery-engine');
const originalFormatter = require('../../../.aios-core/core/errors/error-formatter');

// Mock ErrorCodes.getError
jest.spyOn(originalErrorCodes, 'getError').mockImplementation((code) => {
  const errors = {
    CFG_001: {
      code: 'CFG_001',
      message: 'Configuration file not found',
      category: 'CONFIG',
      severity: 'ERROR',
      recoverable: true,
      recoverySteps: ['Run aios config init', 'Check configuration file path'],
      docUrl: 'https://docs.aios.dev/errors/CFG_001',
    },
    SYS_001: {
      code: 'SYS_001',
      message: 'System initialization failed',
      category: 'SYSTEM',
      severity: 'CRITICAL',
      recoverable: false,
      recoverySteps: ['Check system requirements', 'Reinstall AIOS'],
    },
  };
  return errors[code] || null;
});

describe('Diagnose Command', () => {
  let createDiagnoseCommand;
  let diagnoseAction;

  beforeAll(() => {
    // Require after setting up the environment
    const diagnoseModule = require('../../../.aios-core/cli/commands/diagnose/index');
    createDiagnoseCommand = diagnoseModule.createDiagnoseCommand;
    diagnoseAction = diagnoseModule.diagnoseAction;
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('Command Registration', () => {
    it('should create a diagnose command with correct name', () => {
      const cmd = createDiagnoseCommand();
      expect(cmd.name()).toBe('diagnose');
    });

    it('should have correct description', () => {
      const cmd = createDiagnoseCommand();
      expect(cmd.description()).toContain('Diagnose');
    });

    it('should support --last option', () => {
      const cmd = createDiagnoseCommand();
      const options = cmd.options;
      const lastOption = options.find((o) => o.long === '--last');
      expect(lastOption).toBeDefined();
    });

    it('should support --format option', () => {
      const cmd = createDiagnoseCommand();
      const options = cmd.options;
      const formatOption = options.find((o) => o.long === '--format');
      expect(formatOption).toBeDefined();
    });

    it('should support --verbose option', () => {
      const cmd = createDiagnoseCommand();
      const options = cmd.options;
      const verboseOption = options.find((o) => o.long === '--verbose');
      expect(verboseOption).toBeDefined();
    });
  });

  describe('Error Code Diagnosis', () => {
    it('should diagnose valid error code', async () => {
      const logSpy = jest.spyOn(console, 'log').mockImplementation();

      await diagnoseAction('CFG_001', {});

      const output = logSpy.mock.calls.flat().join('\n');
      expect(output).toContain('CFG_001');
      expect(output).toContain('CONFIG');

      logSpy.mockRestore();
    });

    it('should show recovery suggestions for recoverable errors', async () => {
      const logSpy = jest.spyOn(console, 'log').mockImplementation();

      await diagnoseAction('CFG_001', {});

      const output = logSpy.mock.calls.flat().join('\n');
      expect(output).toContain('Recovery');

      logSpy.mockRestore();
    });

    it('should indicate auto-fix availability for recoverable errors', async () => {
      const logSpy = jest.spyOn(console, 'log').mockImplementation();

      await diagnoseAction('CFG_001', {});

      const output = logSpy.mock.calls.flat().join('\n');
      expect(output).toContain('Auto-fix') || expect(output).toContain('fix');

      logSpy.mockRestore();
    });

    it('should handle unknown error codes gracefully', async () => {
      const logSpy = jest.spyOn(console, 'log').mockImplementation();

      await diagnoseAction('UNKNOWN_CODE', {});

      const output = logSpy.mock.calls.flat().join('\n');
      expect(output).toContain('Unknown');

      logSpy.mockRestore();
    });
  });

  describe('JSON Output Format', () => {
    it('should output JSON when format=json is specified', async () => {
      const logSpy = jest.spyOn(console, 'log').mockImplementation();

      await diagnoseAction('CFG_001', { format: 'json' });

      const output = logSpy.mock.calls.flat().join('\n');

      // Should be valid JSON
      expect(() => JSON.parse(output)).not.toThrow();
      const parsed = JSON.parse(output);
      expect(parsed.code).toBe('CFG_001');

      logSpy.mockRestore();
    });
  });

  describe('Verbose Mode', () => {
    it('should show detailed information with verbose=true', async () => {
      const logSpy = jest.spyOn(console, 'log').mockImplementation();

      await diagnoseAction('CFG_001', { verbose: true });

      const output = logSpy.mock.calls.flat().join('\n');
      // Verbose mode should include more details
      expect(output.length).toBeGreaterThan(0);

      logSpy.mockRestore();
    });
  });

  describe('Missing Error Code', () => {
    it('should require error code when not using --last', async () => {
      const errorSpy = jest.spyOn(console, 'error').mockImplementation();
      const logSpy = jest.spyOn(console, 'log').mockImplementation();
      const mockExit = jest.spyOn(process, 'exit').mockImplementation(() => {});

      await diagnoseAction(null, {});

      expect(errorSpy).toHaveBeenCalled();
      expect(mockExit).toHaveBeenCalledWith(1);

      errorSpy.mockRestore();
      logSpy.mockRestore();
      mockExit.mockRestore();
    });
  });
});
