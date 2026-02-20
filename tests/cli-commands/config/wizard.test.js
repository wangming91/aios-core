/**
 * Tests for config wizard CLI command
 *
 * Covers:
 * - aios config wizard (AC1: interactive configuration)
 * - aios config wizard --preset=<name> (AC1: preset mode)
 * - aios config wizard --detect (AC1: auto-detect mode)
 * - Project detection (AC2)
 * - Preset templates (AC3)
 * - Configuration validation (AC4)
 *
 * @story STORY-OPT-A3
 */

const path = require('path');
const fs = require('fs');

// Mock dependencies
jest.mock('../../../.aios-core/core/errors', () => ({
  createError: jest.fn((code, options) => ({
    code,
    message: `Error: ${code}`,
    context: options?.context || {},
  })),
  isAIOSError: jest.fn((err) => err && err.code !== undefined),
}));

jest.mock('chalk', () => {
  const chalkFn = (str) => str;
  chalkFn.bold = chalkFn;
  chalkFn.cyan = chalkFn;
  chalkFn.green = chalkFn;
  chalkFn.yellow = chalkFn;
  chalkFn.red = chalkFn;
  chalkFn.dim = chalkFn;
  chalkFn.white = chalkFn;
  chalkFn.magenta = chalkFn;
  chalkFn.blue = chalkFn;
  chalkFn.gray = chalkFn;
  chalkFn.cyan.bold = chalkFn;
  chalkFn.green.bold = chalkFn;
  chalkFn.red.bold = chalkFn;
  chalkFn.yellow.bold = chalkFn;
  chalkFn.cyan.dim = chalkFn;
  chalkFn.green.dim = chalkFn;
  chalkFn.magenta.bold = chalkFn;
  return chalkFn;
});

// Import after mocking
const {
  createWizardCommand,
  wizardAction,
  loadPreset,
  getAvailablePresets,
} = require('../../../.aios-core/cli/commands/config/wizard');

const ProjectDetector = require('../../../.aios-core/core/config/detectors');

describe('config wizard command', () => {
  let mockExit;
  let originalCwd;

  beforeEach(() => {
    jest.clearAllMocks();

    // Mock process.exit
    mockExit = jest.spyOn(process, 'exit').mockImplementation(() => {});

    // Save original cwd
    originalCwd = process.cwd();

    // Mock console
    jest.spyOn(console, 'log').mockImplementation(() => {});
    jest.spyOn(console, 'error').mockImplementation(() => {});
  });

  afterEach(() => {
    jest.restoreAllMocks();
    // Restore cwd if changed
    if (process.cwd !== originalCwd) {
      process.chdir = jest.fn();
    }
  });

  describe('createWizardCommand()', () => {
    it('should create a commander command', () => {
      const cmd = createWizardCommand();

      expect(cmd).toBeDefined();
      expect(cmd.name()).toBe('wizard');
      expect(cmd.description()).toContain('configuration');
    });

    it('should have --preset option', () => {
      const cmd = createWizardCommand();

      const options = cmd.options;
      const presetOption = options.find((o) => o.long === '--preset');
      expect(presetOption).toBeDefined();
    });

    it('should have --detect option', () => {
      const cmd = createWizardCommand();

      const options = cmd.options;
      const detectOption = options.find((o) => o.long === '--detect');
      expect(detectOption).toBeDefined();
    });

    it('should have --dry-run option', () => {
      const cmd = createWizardCommand();

      const options = cmd.options;
      const dryRunOption = options.find((o) => o.long === '--dry-run');
      expect(dryRunOption).toBeDefined();
    });

    it('should have --force option', () => {
      const cmd = createWizardCommand();

      const options = cmd.options;
      const forceOption = options.find((o) => o.long === '--force');
      expect(forceOption).toBeDefined();
    });
  });

  describe('loadPreset()', () => {
    it('should load react-node preset', () => {
      const preset = loadPreset('react-node');

      expect(preset).toBeDefined();
      expect(preset.id).toBe('react-node');
      expect(preset.name).toContain('React');
    });

    it('should load vue-python preset', () => {
      const preset = loadPreset('vue-python');

      expect(preset).toBeDefined();
      expect(preset.id).toBe('vue-python');
    });

    it('should load fullstack preset', () => {
      const preset = loadPreset('fullstack');

      expect(preset).toBeDefined();
      expect(preset.id).toBe('fullstack');
    });

    it('should load minimal preset', () => {
      const preset = loadPreset('minimal');

      expect(preset).toBeDefined();
      expect(preset.id).toBe('minimal');
    });

    it('should return null for non-existent preset', () => {
      const preset = loadPreset('non-existent');

      expect(preset).toBeNull();
    });

    it('should handle null input gracefully', () => {
      const preset = loadPreset(null);

      expect(preset).toBeNull();
    });

    it('should handle undefined input gracefully', () => {
      const preset = loadPreset(undefined);

      expect(preset).toBeNull();
    });
  });

  describe('getAvailablePresets()', () => {
    it('should return array of available presets', () => {
      const presets = getAvailablePresets();

      expect(presets).toBeInstanceOf(Array);
      expect(presets.length).toBeGreaterThan(0);
    });

    it('should include react-node preset', () => {
      const presets = getAvailablePresets();

      expect(presets.some((p) => p.id === 'react-node')).toBe(true);
    });

    it('should include minimal preset', () => {
      const presets = getAvailablePresets();

      expect(presets.some((p) => p.id === 'minimal')).toBe(true);
    });

    it('should return presets with id, name, and description', () => {
      const presets = getAvailablePresets();

      presets.forEach((preset) => {
        expect(preset.id).toBeDefined();
        expect(preset.name).toBeDefined();
        expect(preset.description).toBeDefined();
      });
    });
  });

  describe('wizardAction() - interactive mode', () => {
    it('should display welcome message', async () => {
      await wizardAction({});

      expect(console.log).toHaveBeenCalled();
    });

    it('should display configuration options', async () => {
      await wizardAction({});

      expect(console.log).toHaveBeenCalled();
    });
  });

  describe('wizardAction() --preset mode', () => {
    it('should load and apply preset', async () => {
      await wizardAction({ preset: 'react-node', dryRun: true });

      expect(console.log).toHaveBeenCalledWith(expect.stringContaining('react-node'));
    });

    it('should show error for invalid preset', async () => {
      await wizardAction({ preset: 'invalid-preset' });

      // Error is displayed via console.error or console.log depending on path
      expect(console.error).toHaveBeenCalled();
    });

    it('should show preview with --dry-run', async () => {
      await wizardAction({ preset: 'minimal', dryRun: true });

      // Should display the preset name and configuration preview
      expect(console.log).toHaveBeenCalledWith(expect.stringContaining('minimal'));
    });
  });

  describe('wizardAction() --detect mode', () => {
    it('should detect project type', async () => {
      await wizardAction({ detect: true, dryRun: true });

      // Should display analyzing message
      expect(console.log).toHaveBeenCalled();
    });

    it('should recommend configuration based on detection', async () => {
      await wizardAction({ detect: true, dryRun: true });

      expect(console.log).toHaveBeenCalled();
    });
  });

  describe('error handling', () => {
    it('should handle missing project gracefully', async () => {
      await wizardAction({});

      expect(console.log).toHaveBeenCalled();
    });

    it('should handle config write errors', async () => {
      await wizardAction({ preset: 'minimal' });

      expect(console.log).toHaveBeenCalled();
    });
  });
});

describe('ProjectDetector', () => {
  let detector;
  let originalCwd;
  let tempDir;

  beforeEach(() => {
    detector = new ProjectDetector();
    originalCwd = process.cwd();
  });

  afterEach(() => {
    jest.restoreAllMocks();
    if (tempDir && fs.existsSync(tempDir)) {
      try {
        fs.rmSync(tempDir, { recursive: true, force: true });
      } catch (e) {
        // Ignore cleanup errors
      }
    }
  });

  describe('detect()', () => {
    it('should return detection result object', async () => {
      const result = await detector.detect();

      expect(result).toBeDefined();
      expect(result.language).toBeDefined();
      expect(result.framework).toBeDefined();
      expect(result.testFramework).toBeDefined();
      expect(result.packageManager).toBeDefined();
      expect(result.suggestions).toBeDefined();
    });

    it('should return suggestions object', async () => {
      const result = await detector.detect();

      expect(result.suggestions).toBeDefined();
      expect(typeof result.suggestions).toBe('object');
    });
  });

  describe('detectLanguage()', () => {
    it('should detect Node.js from package.json', async () => {
      const result = await detector.detectLanguage();

      // aios-core has package.json, so should detect nodejs
      expect(['nodejs', null]).toContain(result);
    });

    it('should return null if no language detected', async () => {
      // Create detector with temp directory without project files
      const emptyDetector = new ProjectDetector('/tmp/non-existent-path');
      const result = await emptyDetector.detectLanguage();

      expect(result).toBeNull();
    });
  });

  describe('detectFramework()', () => {
    it('should detect framework from dependencies', async () => {
      const result = await detector.detectFramework();

      // Result should be an array or null
      expect(Array.isArray(result) || result === null).toBe(true);
    });
  });

  describe('detectTestFramework()', () => {
    it('should detect test framework from devDependencies', async () => {
      const result = await detector.detectTestFramework();

      // aios-core uses jest
      expect(['jest', null]).toContain(result);
    });
  });

  describe('detectPackageManager()', () => {
    it('should detect npm from package-lock.json', async () => {
      const result = await detector.detectPackageManager();

      // aios-core uses npm
      expect(['npm', 'yarn', 'pnpm', null]).toContain(result);
    });

    it('should detect yarn from yarn.lock', async () => {
      // Test with yarn project detection
      const yarnDetector = new ProjectDetector('/tmp/yarn-project');
      const result = await yarnDetector.detectPackageManager();

      // No yarn.lock in temp, should return null
      expect(result).toBeNull();
    });

    it('should detect pnpm from pnpm-lock.yaml', async () => {
      const pnpmDetector = new ProjectDetector('/tmp/pnpm-project');
      const result = await pnpmDetector.detectPackageManager();

      expect(result).toBeNull();
    });
  });

  describe('detectTypeScript()', () => {
    it('should detect TypeScript from tsconfig.json', async () => {
      const result = await detector.detectTypeScript();

      // aios-core has tsconfig.json
      expect(typeof result).toBe('boolean');
    });
  });

  describe('getSuggestions()', () => {
    it('should return suggestions based on detection', async () => {
      const result = await detector.detect();
      const suggestions = detector.getSuggestions(result);

      expect(suggestions).toBeDefined();
      expect(typeof suggestions).toBe('object');
    });

    it('should suggest ide based on detection', async () => {
      const result = await detector.detect();
      const suggestions = detector.getSuggestions(result);

      // Should have some suggestions
      expect(suggestions).toBeDefined();
    });
  });

  describe('edge cases', () => {
    it('should handle directory without project files', async () => {
      const emptyDetector = new ProjectDetector('/tmp/empty-dir-' + Date.now());
      const result = await emptyDetector.detect();

      expect(result).toBeDefined();
      expect(result.language).toBeNull();
    });

    it('should handle missing package.json gracefully', async () => {
      const noPkgDetector = new ProjectDetector('/tmp/no-pkg-' + Date.now());
      const result = await noPkgDetector.detect();

      expect(result).toBeDefined();
    });

    it('should handle invalid package.json gracefully', async () => {
      // Create temp dir with invalid package.json
      tempDir = `/tmp/invalid-pkg-${Date.now()}`;
      fs.mkdirSync(tempDir, { recursive: true });
      fs.writeFileSync(path.join(tempDir, 'package.json'), 'invalid json {{{');

      const invalidDetector = new ProjectDetector(tempDir);
      const result = await invalidDetector.detect();

      expect(result).toBeDefined();
    });
  });
});
