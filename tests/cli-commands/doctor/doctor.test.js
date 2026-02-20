/**
 * Doctor Command Tests
 *
 * Tests for the enhanced `aios doctor` command.
 *
 * @module tests/cli-commands/doctor
 * @see Story STORY-OPT-D3
 */

'use strict';

const { Command } = require('commander');
const path = require('path');
const fs = require('fs');

// Mock child_process
jest.mock('child_process', () => ({
  execSync: jest.fn((cmd) => {
    if (cmd.includes('npm')) return '10.2.3\n';
    if (cmd.includes('git')) return 'git version 2.43.0\n';
    return '';
  }),
}));

// Mock fs
jest.mock('fs', () => ({
  ...jest.requireActual('fs'),
  existsSync: jest.fn((p) => {
    if (p.includes('.aios-core')) return true;
    if (p.includes('pro')) return false;
    if (p.includes('package.json')) return true;
    return false;
  }),
  readFileSync: jest.fn((p, encoding) => {
    if (p.includes('package.json')) {
      return JSON.stringify({ version: '4.2.13' });
    }
    return '';
  }),
  writeFileSync: jest.fn(),
  mkdirSync: jest.fn(),
}));

describe('Doctor Command', () => {
  let createDoctorCommand;
  let doctorAction;
  let runQuickDiagnostics;
  let runFullDiagnostics;

  beforeAll(() => {
    const doctorModule = require('../../../.aios-core/cli/commands/doctor/index');
    createDoctorCommand = doctorModule.createDoctorCommand;
    doctorAction = doctorModule.doctorAction;
    runQuickDiagnostics = doctorModule.runQuickDiagnostics;
    runFullDiagnostics = doctorModule.runFullDiagnostics;
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('Command Registration', () => {
    it('should create a doctor command with correct name', () => {
      const cmd = createDoctorCommand();
      expect(cmd.name()).toBe('doctor');
    });

    it('should have correct description', () => {
      const cmd = createDoctorCommand();
      expect(cmd.description()).toContain('diagnostics');
    });

    it('should support --full option', () => {
      const cmd = createDoctorCommand();
      const options = cmd.options;
      const fullOption = options.find((o) => o.long === '--full');
      expect(fullOption).toBeDefined();
    });

    it('should support --fix option', () => {
      const cmd = createDoctorCommand();
      const options = cmd.options;
      const fixOption = options.find((o) => o.long === '--fix');
      expect(fixOption).toBeDefined();
    });

    it('should support --dry-run option', () => {
      const cmd = createDoctorCommand();
      const options = cmd.options;
      const dryRunOption = options.find((o) => o.long === '--dry-run');
      expect(dryRunOption).toBeDefined();
    });

    it('should support --report option', () => {
      const cmd = createDoctorCommand();
      const options = cmd.options;
      const reportOption = options.find((o) => o.long === '--report');
      expect(reportOption).toBeDefined();
    });
  });

  describe('Quick Diagnostics', () => {
    it('should run quick diagnostics and return results', async () => {
      const results = await runQuickDiagnostics({});

      expect(results).toBeDefined();
      expect(results.timestamp).toBeDefined();
      expect(Array.isArray(results.checks)).toBe(true);
      expect(results.checks.length).toBeGreaterThan(0);
      expect(typeof results.score).toBe('number');
    });

    it('should check Node.js version', async () => {
      const results = await runQuickDiagnostics({});
      const nodeCheck = results.checks.find((c) => c.name === 'Node.js');
      expect(nodeCheck).toBeDefined();
    });

    it('should check npm version', async () => {
      const results = await runQuickDiagnostics({});
      const npmCheck = results.checks.find((c) => c.name === 'npm');
      expect(npmCheck).toBeDefined();
    });

    it('should check AIOS Core installation', async () => {
      const results = await runQuickDiagnostics({});
      const aiosCheck = results.checks.find((c) => c.name === 'AIOS Core');
      expect(aiosCheck).toBeDefined();
    });
  });

  describe('Full Diagnostics', () => {
    it('should run full diagnostics with more checks', async () => {
      const results = await runFullDiagnostics({});

      expect(results).toBeDefined();
      expect(results.mode).toBe('full');
      // Full diagnostics should have more checks than quick
      expect(results.checks.length).toBeGreaterThan(3);
    });

    it('should check Git in full mode', async () => {
      const results = await runFullDiagnostics({});
      const gitCheck = results.checks.find((c) => c.name === 'Git');
      expect(gitCheck).toBeDefined();
    });

    it('should check configuration files in full mode', async () => {
      const results = await runFullDiagnostics({});
      const configCheck = results.checks.find((c) => c.name.includes('Config'));
      expect(configCheck).toBeDefined();
    });
  });

  describe('Diagnostics Scoring', () => {
    it('should calculate a score between 0 and 100', async () => {
      const results = await runQuickDiagnostics({});
      expect(results.score).toBeGreaterThanOrEqual(0);
      expect(results.score).toBeLessThanOrEqual(100);
    });
  });

  describe('Doctor Action', () => {
    it('should display results when run', async () => {
      const logSpy = jest.spyOn(console, 'log').mockImplementation();

      await doctorAction({});

      const output = logSpy.mock.calls.flat().join('\n');
      expect(output).toContain('Diagnostics');

      logSpy.mockRestore();
    });

    it('should show score in output', async () => {
      const logSpy = jest.spyOn(console, 'log').mockImplementation();

      await doctorAction({});

      const output = logSpy.mock.calls.flat().join('\n');
      expect(output).toContain('Score');

      logSpy.mockRestore();
    });
  });

  describe('Report Generation', () => {
    it('should generate JSON report when --report is specified', async () => {
      const logSpy = jest.spyOn(console, 'log').mockImplementation();

      await doctorAction({ report: 'json' });

      const output = logSpy.mock.calls.flat().join('\n');
      expect(output).toContain('Report');

      logSpy.mockRestore();
    });
  });
});
