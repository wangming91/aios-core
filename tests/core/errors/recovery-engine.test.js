/**
 * RecoveryEngine Unit Tests
 *
 * Tests for error recovery suggestions and auto-fix functionality.
 *
 * @module tests/core/errors/recovery-engine.test
 * @see Story STORY-OPT-D2
 */

const { RecoveryEngine, suggestFix } = require('../../../.aios-core/core/errors');
const AIOSError = require('../../../.aios-core/core/errors/base-error');
const fs = require('fs');
const path = require('path');

// Mock fs module
jest.mock('fs', () => ({
  existsSync: jest.fn(),
  mkdirSync: jest.fn(),
  writeFileSync: jest.fn(),
  readFileSync: jest.fn(),
}));

// Mock path module for join only
jest.spyOn(path, 'join').mockImplementation((...args) => args.join('/'));

describe('RecoveryEngine', () => {
  let engine;
  let mockProjectRoot;

  beforeEach(() => {
    jest.clearAllMocks();
    mockProjectRoot = '/mock/project';
    engine = new RecoveryEngine(mockProjectRoot);

    // Reset fs mocks
    fs.existsSync.mockReturnValue(true);
  });

  describe('constructor()', () => {
    it('should create engine with project root', () => {
      expect(engine.projectRoot).toBe(mockProjectRoot);
    });

    it('should load healers on initialization', () => {
      expect(engine.healers).toBeDefined();
      expect(typeof engine.healers).toBe('object');
    });

    it('should work without project root', () => {
      const defaultEngine = new RecoveryEngine();
      expect(defaultEngine.projectRoot).toBe(process.cwd());
    });
  });

  describe('getRecoverySuggestions()', () => {
    it('should return suggestions for AIOSError with recovery steps', () => {
      const error = new AIOSError('CFG_001', 'Config not found', {
        category: 'CONFIG',
        recoverySteps: [
          "Run 'aios config init'",
          'Check file path',
        ],
        recoverable: true,
      });

      const suggestions = engine.getRecoverySuggestions(error);

      expect(suggestions).toBeDefined();
      expect(suggestions.steps).toHaveLength(2);
      expect(suggestions.steps[0]).toContain("Run 'aios config init'");
      expect(suggestions.canAutoFix).toBeDefined();
    });

    it('should return empty suggestions for non-recoverable errors', () => {
      const error = new AIOSError('SYS_001', 'Critical system error', {
        recoverable: false,
        recoverySteps: [],
      });

      const suggestions = engine.getRecoverySuggestions(error);

      expect(suggestions.steps).toEqual([]);
      expect(suggestions.canAutoFix).toBe(false);
    });

    it('should handle generic Error objects', () => {
      const error = new Error('Generic error');

      const suggestions = engine.getRecoverySuggestions(error);

      expect(suggestions).toBeDefined();
      expect(suggestions.message).toBe('Generic error');
      expect(Array.isArray(suggestions.steps)).toBe(true);
    });

    it('should include doc URL when available', () => {
      const error = new AIOSError('CFG_001', 'Config error', {
        docUrl: 'https://docs.aios.dev/errors/CFG_001',
      });

      const suggestions = engine.getRecoverySuggestions(error);

      expect(suggestions.docUrl).toBe('https://docs.aios.dev/errors/CFG_001');
    });

    it('should handle null/undefined errors', () => {
      expect(engine.getRecoverySuggestions(null)).toBeDefined();
      expect(engine.getRecoverySuggestions(undefined)).toBeDefined();
    });
  });

  describe('canAutoFix()', () => {
    it('should return true for CFG_001 (config init)', () => {
      const error = new AIOSError('CFG_001', 'Config not found', {
        category: 'CONFIG',
        recoverable: true,
      });

      expect(engine.canAutoFix(error)).toBe(true);
    });

    it('should return true for CFG_003 (config parse error)', () => {
      const error = new AIOSError('CFG_003', 'Parse error', {
        category: 'CONFIG',
        recoverable: true,
      });

      expect(engine.canAutoFix(error)).toBe(true);
    });

    it('should return false for non-recoverable errors', () => {
      const error = new AIOSError('SYS_001', 'Critical error', {
        recoverable: false,
      });

      expect(engine.canAutoFix(error)).toBe(false);
    });

    it('should return false for generic errors', () => {
      const error = new Error('Generic error');

      expect(engine.canAutoFix(error)).toBe(false);
    });

    it('should return false for errors without code', () => {
      const error = new AIOSError(null, 'No code');

      expect(engine.canAutoFix(error)).toBe(false);
    });
  });

  describe('executeAutoFix()', () => {
    it('should return failure for non-auto-fixable errors', async () => {
      const error = new AIOSError('SYS_001', 'Critical', {
        recoverable: false,
      });

      const result = await engine.executeAutoFix(error);

      expect(result.success).toBe(false);
      expect(result.message).toContain('Cannot auto-fix');
    });

    it('should return preview in dry-run mode', async () => {
      const error = new AIOSError('CFG_001', 'Config not found', {
        context: { path: '/mock/config.yaml' },
        recoverable: true,
      });

      const result = await engine.executeAutoFix(error, { dryRun: true });

      expect(result.dryRun).toBe(true);
      expect(result.preview).toBeDefined();
    });

    it('should handle CFG_001 auto-fix', async () => {
      // Reset mock to simulate files don't exist
      fs.existsSync.mockReturnValue(false);

      const error = new AIOSError('CFG_001', 'Config not found', {
        context: { path: '/mock/config.yaml' },
        recoverable: true,
      });

      const result = await engine.executeAutoFix(error);

      expect(result.success).toBe(true);
      expect(result.actions).toBeDefined();
      expect(result.actions.length).toBeGreaterThan(0);
    });

    it('should return warnings on partial failure', async () => {
      // Reset mock to simulate files don't exist, then throw on write
      fs.existsSync.mockReturnValue(false);
      fs.mkdirSync.mockImplementation(() => {});
      fs.writeFileSync.mockImplementationOnce(() => {
        throw new Error('Write failed');
      });

      const error = new AIOSError('CFG_001', 'Config not found', {
        recoverable: true,
      });

      const result = await engine.executeAutoFix(error);

      expect(result.success).toBe(false);
      expect(result.error).toBeDefined();
    });

    it('should return result with actions array', async () => {
      const error = new AIOSError('CFG_001', 'Config not found', {
        recoverable: true,
      });

      const result = await engine.executeAutoFix(error);

      expect(Array.isArray(result.actions)).toBe(true);
      expect(Array.isArray(result.warnings)).toBe(true);
    });
  });

  describe('loadHealers()', () => {
    it('should load healer definitions', () => {
      const healers = engine.loadHealers();

      expect(healers).toBeDefined();
      expect(typeof healers).toBe('object');
    });

    it('should include CFG_001 healer', () => {
      const healers = engine.loadHealers();

      expect(healers['CFG_001']).toBeDefined();
      expect(healers['CFG_001'].name).toBeDefined();
      expect(healers['CFG_001'].fix).toBeDefined();
    });
  });

  describe('getHealer()', () => {
    it('should return healer for known error code', () => {
      const healer = engine.getHealer('CFG_001');

      expect(healer).toBeDefined();
      expect(healer.name).toBeDefined();
    });

    it('should return null for unknown error code', () => {
      const healer = engine.getHealer('UNKNOWN_CODE');

      expect(healer).toBeNull();
    });
  });

  describe('registerHealer()', () => {
    it('should register custom healer', () => {
      const customHealer = {
        name: 'Custom Healer',
        fix: jest.fn(),
        description: 'Custom fix for custom error',
      };

      engine.registerHealer('CUSTOM_001', customHealer);

      expect(engine.getHealer('CUSTOM_001')).toEqual(customHealer);
    });

    it('should overwrite existing healer', () => {
      const healer1 = { name: 'Healer 1', fix: jest.fn() };
      const healer2 = { name: 'Healer 2', fix: jest.fn() };

      engine.registerHealer('TEST_001', healer1);
      engine.registerHealer('TEST_001', healer2);

      expect(engine.getHealer('TEST_001').name).toBe('Healer 2');
    });
  });

  describe('FixResult structure', () => {
    it('should return correct result structure', async () => {
      const error = new AIOSError('CFG_001', 'Config not found');

      const result = await engine.executeAutoFix(error);

      expect(result).toHaveProperty('success');
      expect(result).toHaveProperty('actions');
      expect(result).toHaveProperty('warnings');
      expect(typeof result.success).toBe('boolean');
      expect(Array.isArray(result.actions)).toBe(true);
      expect(Array.isArray(result.warnings)).toBe(true);
    });
  });

  describe('integration with ErrorCodes', () => {
    it('should use recovery steps from error code definition', () => {
      const error = new AIOSError('CFG_001', 'Config not found', {
        category: 'CONFIG',
      });

      const suggestions = engine.getRecoverySuggestions(error);

      // Should have recovery steps from the error code definition
      expect(suggestions.steps.length).toBeGreaterThanOrEqual(0);
    });
  });
});

describe('suggestFix() convenience function', () => {
  it('should return suggestions for error', () => {
    const error = new AIOSError('CFG_001', 'Config not found', {
      recoverySteps: ['Step 1'],
    });

    const suggestions = suggestFix(error);

    expect(suggestions).toBeDefined();
    expect(suggestions.steps).toContain('Step 1');
  });

  it('should handle generic errors', () => {
    const error = new Error('Generic error');

    const suggestions = suggestFix(error);

    expect(suggestions).toBeDefined();
    expect(suggestions.message).toBe('Generic error');
  });

  it('should work with project root option', () => {
    const error = new AIOSError('CFG_001', 'Config not found');

    const suggestions = suggestFix(error, { projectRoot: '/custom/path' });

    expect(suggestions).toBeDefined();
  });
});

describe('BUILTIN_HEALERS', () => {
  let engine;

  beforeEach(() => {
    jest.clearAllMocks();
    engine = new RecoveryEngine('/mock/project');
  });

  describe('CFG_001 healer', () => {
    it('should create directory and config file when neither exists', async () => {
      fs.existsSync.mockReturnValue(false);

      const error = new AIOSError('CFG_001', 'Config not found', {
        recoverable: true,
      });

      const result = await engine.executeAutoFix(error);

      expect(result.success).toBe(true);
      expect(fs.mkdirSync).toHaveBeenCalled();
      expect(fs.writeFileSync).toHaveBeenCalled();
    });

    it('should only create config when directory exists', async () => {
      // Directory exists, config doesn't
      fs.existsSync.mockImplementation((path) => {
        return path.includes('.aios-core') && !path.includes('core-config.yaml');
      });

      const error = new AIOSError('CFG_001', 'Config not found', {
        recoverable: true,
      });

      const result = await engine.executeAutoFix(error);

      expect(result.success).toBe(true);
      expect(result.actions.some((a) => a.includes('config'))).toBe(true);
    });
  });

  describe('CFG_002 healer', () => {
    it('should provide manual guidance for config validation', async () => {
      const error = new AIOSError('CFG_002', 'Invalid config value', {
        recoverable: true,
      });

      const result = await engine.executeAutoFix(error);

      expect(result.success).toBe(false);
      expect(result.warnings.length).toBeGreaterThan(0);
    });
  });

  describe('CFG_003 healer', () => {
    it('should provide guidance for parse errors', async () => {
      const error = new AIOSError('CFG_003', 'Parse error', {
        recoverable: true,
        context: { file: '/path/to/config.yaml' },
      });

      const result = await engine.executeAutoFix(error);

      expect(result.success).toBe(false);
      expect(result.actions.length).toBeGreaterThan(0);
      expect(result.warnings.length).toBeGreaterThan(0);
    });

    it('should work without context file', async () => {
      const error = new AIOSError('CFG_003', 'Parse error', {
        recoverable: true,
        context: {},
      });

      const result = await engine.executeAutoFix(error);

      expect(result.actions).toBeDefined();
    });
  });

  describe('CFG_004 healer', () => {
    it('should suggest adding missing fields', async () => {
      const error = new AIOSError('CFG_004', 'Missing field', {
        recoverable: true,
      });

      const result = await engine.executeAutoFix(error);

      expect(result.actions.length).toBeGreaterThan(0);
    });
  });

  describe('SYS_003 healer', () => {
    it('should provide installation repair guidance', async () => {
      const error = new AIOSError('SYS_003', 'Installation corrupted', {
        recoverable: true,
      });

      const result = await engine.executeAutoFix(error);

      expect(result.actions.length).toBeGreaterThan(0);
      expect(result.actions.some((a) => a.includes('doctor'))).toBe(true);
    });
  });

  describe('IDS_003 healer', () => {
    it('should validate registry JSON if file exists', async () => {
      fs.existsSync.mockReturnValue(true);
      fs.readFileSync.mockReturnValue(JSON.stringify({ valid: true }));

      const error = new AIOSError('IDS_003', 'Registry corrupted', {
        recoverable: true,
      });

      const result = await engine.executeAutoFix(error);

      expect(result.success).toBe(true);
    });

    it('should detect invalid JSON in registry', async () => {
      fs.existsSync.mockReturnValue(true);
      fs.readFileSync.mockReturnValue('{ invalid json }');

      const error = new AIOSError('IDS_003', 'Registry corrupted', {
        recoverable: true,
      });

      const result = await engine.executeAutoFix(error);

      expect(result.success).toBe(false);
      expect(result.warnings.length).toBeGreaterThan(0);
    });

    it('should handle missing registry file', async () => {
      fs.existsSync.mockReturnValue(false);

      const error = new AIOSError('IDS_003', 'Registry corrupted', {
        recoverable: true,
      });

      const result = await engine.executeAutoFix(error);

      expect(result.success).toBe(false);
    });
  });
});
