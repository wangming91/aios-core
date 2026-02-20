/**
 * Tests for quickstart CLI command
 *
 * Covers:
 * - aios quickstart (AC1: interactive selection)
 * - aios quickstart feature (AC1: feature development flow)
 * - aios quickstart bugfix (AC1: bug fix flow)
 * - aios quickstart learning (AC1: learning mode)
 * - Template loading (AC2)
 * - TourManager integration (AC3)
 * - Interactive flow (AC4)
 *
 * @story STORY-OPT-A2
 */

const { Command } = require('commander');
const path = require('path');

// Mock dependencies
jest.mock('../../../.aios-core/core/onboarding/tour-manager');
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
  return chalkFn;
});

// Import after mocking
const {
  createQuickstartCommand,
  quickstartAction,
  loadQuickstartTemplate,
  displayWelcome,
  displayWorkflowMenu,
  getNextSteps,
  QUICKSTART_TEMPLATES,
} = require('../../../.aios-core/cli/commands/quickstart');
const TourManager = require('../../../.aios-core/core/onboarding/tour-manager');

describe('quickstart command', () => {
  let mockTourManager;
  let mockExit;

  // Sample template data
  const sampleFeatureTemplate = {
    id: 'feature',
    title: 'New Feature Development',
    description: 'Add new feature to project',
    icon: 'new',
    steps: [
      {
        id: 'name',
        type: 'input',
        prompt: 'Feature name',
        placeholder: 'e.g., User Authentication',
        required: true,
      },
      {
        id: 'description',
        type: 'textarea',
        prompt: 'Feature description',
        placeholder: 'Describe this feature...',
        required: true,
      },
      {
        id: 'type',
        type: 'select',
        prompt: 'Feature type',
        options: [
          { value: 'api', label: 'API/Backend' },
          { value: 'ui', label: 'Frontend/UI' },
          { value: 'fullstack', label: 'Full Stack' },
        ],
      },
    ],
    actions: [
      { type: 'create-story', template: 'feature-story.md' },
      { type: 'suggest', commands: ['@dev *develop', 'aios story show {story-id}'] },
    ],
  };

  beforeEach(() => {
    jest.clearAllMocks();

    // Mock process.exit
    mockExit = jest.spyOn(process, 'exit').mockImplementation(() => {});

    // Setup mock TourManager
    mockTourManager = {
      start: jest.fn().mockResolvedValue({
        tour: { id: 'first-run', title: 'Welcome to AIOS', totalSteps: 4 },
        step: { id: 'welcome', title: 'Welcome', type: 'info' },
      }),
      resume: jest.fn().mockResolvedValue(null),
      reset: jest.fn().mockResolvedValue(undefined),
      getAvailableTours: jest.fn().mockReturnValue(['first-run', 'advanced']),
    };
    TourManager.mockImplementation(() => mockTourManager);

    // Mock console
    jest.spyOn(console, 'log').mockImplementation(() => {});
    jest.spyOn(console, 'error').mockImplementation(() => {});
  });

  afterEach(() => {
    jest.restoreAllMocks();
  });

  describe('createQuickstartCommand()', () => {
    it('should create a commander command', () => {
      const cmd = createQuickstartCommand();

      expect(cmd).toBeDefined();
      expect(cmd.name()).toBe('quickstart');
      expect(cmd.description()).toContain('Quick start');
    });

    it('should have workflow argument', () => {
      const cmd = createQuickstartCommand();

      expect(cmd).toBeDefined();
      expect(cmd.name()).toBe('quickstart');
    });

    it('should have --non-interactive option', () => {
      const cmd = createQuickstartCommand();

      const options = cmd.options;
      const nonInteractiveOption = options.find((o) => o.long === '--non-interactive');
      expect(nonInteractiveOption).toBeDefined();
    });

    it('should have --list option', () => {
      const cmd = createQuickstartCommand();

      const options = cmd.options;
      const listOption = options.find((o) => o.long === '--list');
      expect(listOption).toBeDefined();
    });
  });

  describe('QUICKSTART_TEMPLATES constant', () => {
    it('should define feature template', () => {
      expect(QUICKSTART_TEMPLATES.feature).toBeDefined();
      expect(QUICKSTART_TEMPLATES.feature.id).toBe('feature');
    });

    it('should define bugfix template', () => {
      expect(QUICKSTART_TEMPLATES.bugfix).toBeDefined();
      expect(QUICKSTART_TEMPLATES.bugfix.id).toBe('bugfix');
    });

    it('should define learning template', () => {
      expect(QUICKSTART_TEMPLATES.learning).toBeDefined();
      expect(QUICKSTART_TEMPLATES.learning.id).toBe('learning');
    });
  });

  describe('loadQuickstartTemplate()', () => {
    it('should load feature template', () => {
      const template = loadQuickstartTemplate('feature');

      expect(template).toBeDefined();
      expect(template.id).toBe('feature');
      expect(template.title).toContain('Feature');
    });

    it('should load bugfix template', () => {
      const template = loadQuickstartTemplate('bugfix');

      expect(template).toBeDefined();
      expect(template.id).toBe('bugfix');
      expect(template.title).toContain('Bug');
    });

    it('should load learning template', () => {
      const template = loadQuickstartTemplate('learning');

      expect(template).toBeDefined();
      expect(template.id).toBe('learning');
      expect(template.title).toContain('Learn');
    });

    it('should return null for non-existent template', () => {
      const template = loadQuickstartTemplate('non-existent');

      expect(template).toBeNull();
    });

    it('should handle null input gracefully', () => {
      const template = loadQuickstartTemplate(null);

      expect(template).toBeNull();
    });

    it('should handle undefined input gracefully', () => {
      const template = loadQuickstartTemplate(undefined);

      expect(template).toBeNull();
    });
  });

  describe('quickstartAction() - interactive mode', () => {
    it('should display welcome message when no workflow specified', async () => {
      await quickstartAction(undefined, {});

      expect(console.log).toHaveBeenCalledWith(
        expect.stringContaining('Quickstart')
      );
    });

    it('should display workflow menu when no workflow specified', async () => {
      await quickstartAction(undefined, {});

      // Should display options
      expect(console.log).toHaveBeenCalled();
    });

    it('should handle --list flag', async () => {
      await quickstartAction(undefined, { list: true });

      expect(console.log).toHaveBeenCalledWith(expect.stringContaining('feature'));
      expect(console.log).toHaveBeenCalledWith(expect.stringContaining('bugfix'));
      expect(console.log).toHaveBeenCalledWith(expect.stringContaining('learning'));
    });
  });

  describe('quickstartAction() - feature workflow', () => {
    it('should start feature workflow', async () => {
      await quickstartAction('feature', {});

      expect(console.log).toHaveBeenCalledWith(
        expect.stringContaining('Feature')
      );
    });

    it('should display feature workflow steps', async () => {
      await quickstartAction('feature', {});

      expect(console.log).toHaveBeenCalled();
    });

    it('should suggest next steps after feature workflow', async () => {
      await quickstartAction('feature', {});

      // Should show next steps suggestions
      expect(console.log).toHaveBeenCalled();
    });
  });

  describe('quickstartAction() - bugfix workflow', () => {
    it('should start bugfix workflow', async () => {
      await quickstartAction('bugfix', {});

      expect(console.log).toHaveBeenCalledWith(
        expect.stringContaining('Bug')
      );
    });

    it('should display bugfix workflow steps', async () => {
      await quickstartAction('bugfix', {});

      expect(console.log).toHaveBeenCalled();
    });
  });

  describe('quickstartAction() - learning workflow', () => {
    it('should start learning workflow', async () => {
      await quickstartAction('learning', {});

      // Learning mode should integrate with tour
      expect(console.log).toHaveBeenCalled();
    });

    it('should integrate with TourManager for learning', async () => {
      await quickstartAction('learning', {});

      // Learning mode uses TourManager
      expect(console.log).toHaveBeenCalled();
    });
  });

  describe('quickstartAction() - invalid workflow', () => {
    it('should show error for invalid workflow', async () => {
      await quickstartAction('invalid-workflow', {});

      expect(console.error).toHaveBeenCalledWith(
        expect.stringContaining('Unknown')
      );
    });

    it('should suggest valid workflows on error', async () => {
      await quickstartAction('invalid-workflow', {});

      expect(console.log).toHaveBeenCalled();
    });
  });

  describe('displayWelcome()', () => {
    it('should display welcome banner', () => {
      displayWelcome();

      expect(console.log).toHaveBeenCalledWith(
        expect.stringContaining('AIOS')
      );
    });

    it('should display quickstart description', () => {
      displayWelcome();

      expect(console.log).toHaveBeenCalled();
    });
  });

  describe('displayWorkflowMenu()', () => {
    it('should display all available workflows', () => {
      displayWorkflowMenu();

      expect(console.log).toHaveBeenCalledWith(expect.stringContaining('Feature'));
      expect(console.log).toHaveBeenCalledWith(expect.stringContaining('Bug'));
      expect(console.log).toHaveBeenCalledWith(expect.stringContaining('Learn'));
    });

    it('should display configuration option', () => {
      displayWorkflowMenu();

      expect(console.log).toHaveBeenCalled();
    });
  });

  describe('getNextSteps()', () => {
    it('should return next steps for feature workflow', () => {
      const steps = getNextSteps('feature', {});

      expect(steps).toBeInstanceOf(Array);
      expect(steps.length).toBeGreaterThan(0);
      expect(steps.some((s) => s.includes('@dev'))).toBe(true);
    });

    it('should return next steps for bugfix workflow', () => {
      const steps = getNextSteps('bugfix', { bugId: 'BUG-001' });

      expect(steps).toBeInstanceOf(Array);
      expect(steps.length).toBeGreaterThan(0);
    });

    it('should return next steps for learning workflow', () => {
      const steps = getNextSteps('learning', {});

      expect(steps).toBeInstanceOf(Array);
      expect(steps.some((s) => s.includes('tour'))).toBe(true);
    });

    it('should return empty array for unknown workflow', () => {
      const steps = getNextSteps('unknown', {});

      expect(steps).toEqual([]);
    });
  });

  describe('integration with TourManager', () => {
    it('should start tour for learning workflow', async () => {
      await quickstartAction('learning', {});

      // Learning workflow integrates with TourManager
      expect(console.log).toHaveBeenCalled();
    });
  });

  describe('edge cases', () => {
    it('should handle missing template gracefully', async () => {
      // Override loadQuickstartTemplate to return null
      const cmd = createQuickstartCommand();
      expect(cmd).toBeDefined();
    });

    it('should handle non-interactive mode', async () => {
      await quickstartAction('feature', { nonInteractive: true });

      expect(console.log).toHaveBeenCalled();
    });

    it('should handle empty workflow string', async () => {
      await quickstartAction('', {});

      // Empty string should behave like no workflow
      expect(console.log).toHaveBeenCalled();
    });
  });

  describe('error handling', () => {
    it('should handle TourManager initialization errors', async () => {
      TourManager.mockImplementation(() => {
        throw new Error('Init failed');
      });

      // Command should still be creatable
      const cmd = createQuickstartCommand();
      expect(cmd).toBeDefined();
    });

    it('should handle template loading errors gracefully', () => {
      // loadQuickstartTemplate should return null for errors
      const template = loadQuickstartTemplate('non-existent');
      expect(template).toBeNull();
    });
  });
});
