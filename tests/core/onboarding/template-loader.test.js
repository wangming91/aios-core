/**
 * Tests for TemplateLoader — Tour Template Loading
 *
 * Covers:
 * - loadTemplate(tourId) method (AC2)
 * - YAML parsing (AC2)
 * - Variable interpolation (AC2)
 * - Template validation (AC2)
 * - Edge cases: missing files, invalid templates
 *
 * @story STORY-OPT-A1
 */

const path = require('path');
const fs = require('fs');
const yaml = require('js-yaml');

// Mock fs and yaml before requiring the module
jest.mock('fs');
jest.mock('js-yaml', () => ({
  load: jest.fn(),
}));

// Import after mocking
const TemplateLoader = require('../../../.aios-core/core/onboarding/template-loader');

describe('TemplateLoader', () => {
  let templateLoader;

  // Sample template data for testing
  const sampleTemplate = {
    id: 'first-run',
    title: 'Welcome to AIOS',
    description: '5-minute quick introduction to AIOS core features',
    estimatedTime: '5 min',
    version: '1.0.0',
    steps: [
      {
        id: 'welcome',
        title: 'Welcome',
        type: 'info',
        content: 'Welcome to Synkra AIOS!',
        action: {
          type: 'confirm',
          label: 'Start Tutorial',
        },
      },
      {
        id: 'agents',
        title: 'Agent System',
        type: 'interactive',
        content: 'AIOS uses specialized AI agents:',
        action: {
          type: 'command',
          command: 'aios agents list',
          label: 'View All Agents',
        },
      },
      {
        id: 'complete',
        title: 'Tutorial Complete!',
        type: 'complete',
        content: 'Congratulations! You have completed the quick start.',
      },
    ],
  };

  beforeEach(() => {
    jest.clearAllMocks();
    fs.existsSync.mockReturnValue(true);
    fs.readFileSync.mockReturnValue('mock yaml content');
    yaml.load.mockReturnValue(sampleTemplate);

    templateLoader = new TemplateLoader();
  });

  afterEach(() => {
    jest.restoreAllMocks();
  });

  describe('constructor', () => {
    it('should initialize with templates directory', () => {
      const expectedDir = path.join(__dirname, '..', '..', '..', '.aios-core', 'core', 'onboarding', 'templates');
      // The loader should have a templates directory
      expect(templateLoader.templatesDir).toBeDefined();
    });

    it('should accept custom templates directory', () => {
      const customDir = '/custom/templates';
      const loader = new TemplateLoader(customDir);

      expect(loader.templatesDir).toBe(customDir);
    });
  });

  describe('loadTemplate()', () => {
    it('should load template by tour ID', () => {
      const template = templateLoader.loadTemplate('first-run');

      expect(template).toBeDefined();
      expect(template.id).toBe('first-run');
      expect(template.title).toBe('Welcome to AIOS');
    });

    it('should return null for non-existent template', () => {
      fs.existsSync.mockReturnValue(false);

      const template = templateLoader.loadTemplate('non-existent');

      expect(template).toBeNull();
    });

    it('should load YAML file from templates directory', () => {
      templateLoader.loadTemplate('first-run');

      expect(fs.existsSync).toHaveBeenCalled();
      expect(fs.readFileSync).toHaveBeenCalled();
      expect(yaml.load).toHaveBeenCalled();
    });

    it('should construct correct file path for template', () => {
      templateLoader.loadTemplate('first-run');

      const expectedPath = expect.stringContaining('first-run.tour.yaml');
      expect(fs.readFileSync).toHaveBeenCalledWith(expectedPath, 'utf8');
    });

    it('should cache loaded templates', () => {
      templateLoader.loadTemplate('first-run');
      templateLoader.loadTemplate('first-run');

      expect(fs.readFileSync).toHaveBeenCalledTimes(1);
    });

    it('should handle YAML parsing errors gracefully', () => {
      yaml.load.mockImplementation(() => {
        throw new Error('YAML parse error');
      });

      const template = templateLoader.loadTemplate('first-run');

      expect(template).toBeNull();
    });
  });

  describe('validateTemplate()', () => {
    it('should validate a correct template', () => {
      const result = templateLoader.validateTemplate(sampleTemplate);

      expect(result.valid).toBe(true);
      expect(result.errors).toEqual([]);
    });

    it('should reject template without id', () => {
      const invalidTemplate = { ...sampleTemplate, id: undefined };
      const result = templateLoader.validateTemplate(invalidTemplate);

      expect(result.valid).toBe(false);
      expect(result.errors).toContainEqual(expect.stringContaining('id'));
    });

    it('should reject template without title', () => {
      const invalidTemplate = { ...sampleTemplate, title: undefined };
      const result = templateLoader.validateTemplate(invalidTemplate);

      expect(result.valid).toBe(false);
      expect(result.errors).toContainEqual(expect.stringContaining('title'));
    });

    it('should reject template without steps', () => {
      const invalidTemplate = { ...sampleTemplate, steps: undefined };
      const result = templateLoader.validateTemplate(invalidTemplate);

      expect(result.valid).toBe(false);
      expect(result.errors).toContainEqual(expect.stringContaining('steps'));
    });

    it('should reject template with empty steps', () => {
      const invalidTemplate = { ...sampleTemplate, steps: [] };
      const result = templateLoader.validateTemplate(invalidTemplate);

      expect(result.valid).toBe(false);
      expect(result.errors).toContainEqual(expect.stringContaining('step'));
    });

    it('should reject step without id', () => {
      const invalidTemplate = {
        ...sampleTemplate,
        steps: [{ title: 'No ID Step', type: 'info' }],
      };
      const result = templateLoader.validateTemplate(invalidTemplate);

      expect(result.valid).toBe(false);
      expect(result.errors).toContainEqual(expect.stringContaining('"id"'));
    });

    it('should reject step with invalid type', () => {
      const invalidTemplate = {
        ...sampleTemplate,
        steps: [{ id: 'step1', title: 'Test', type: 'invalid-type' }],
      };
      const result = templateLoader.validateTemplate(invalidTemplate);

      expect(result.valid).toBe(false);
      expect(result.errors).toContainEqual(expect.stringContaining('type'));
    });

    it('should accept valid step types: info, interactive, complete', () => {
      const validTemplate = {
        ...sampleTemplate,
        steps: [
          { id: 'step1', title: 'Info', type: 'info' },
          { id: 'step2', title: 'Interactive', type: 'interactive' },
          { id: 'step3', title: 'Complete', type: 'complete' },
        ],
      };
      const result = templateLoader.validateTemplate(validTemplate);

      expect(result.valid).toBe(true);
    });

    it('should validate action types', () => {
      const validTemplate = {
        ...sampleTemplate,
        steps: [
          {
            id: 'step1',
            title: 'Test',
            type: 'interactive',
            action: { type: 'command', command: 'test' },
          },
        ],
      };
      const result = templateLoader.validateTemplate(validTemplate);

      expect(result.valid).toBe(true);
    });
  });

  describe('interpolateVariables()', () => {
    it('should interpolate variables in content', () => {
      const template = {
        ...sampleTemplate,
        steps: [
          {
            id: 'step1',
            title: 'Hello {name}',
            type: 'info',
            content: 'Welcome, {name}!',
          },
        ],
      };

      const result = templateLoader.interpolateVariables(template, { name: 'User' });

      expect(result.steps[0].title).toBe('Hello User');
      expect(result.steps[0].content).toBe('Welcome, User!');
    });

    it('should interpolate variables in action properties', () => {
      const template = {
        ...sampleTemplate,
        steps: [
          {
            id: 'step1',
            title: 'Test',
            type: 'interactive',
            content: 'Run {command}',
            action: {
              type: 'command',
              command: '{command}',
              label: 'Run {command}',
            },
          },
        ],
      };

      const result = templateLoader.interpolateVariables(template, { command: 'aios help' });

      expect(result.steps[0].content).toBe('Run aios help');
      expect(result.steps[0].action.command).toBe('aios help');
      expect(result.steps[0].action.label).toBe('Run aios help');
    });

    it('should handle missing variables gracefully', () => {
      const template = {
        ...sampleTemplate,
        steps: [
          {
            id: 'step1',
            title: 'Hello {name}',
            type: 'info',
            content: 'Welcome!',
          },
        ],
      };

      const result = templateLoader.interpolateVariables(template, {});

      // Should preserve placeholder if variable not provided
      expect(result.steps[0].title).toBe('Hello {name}');
    });

    it('should return original template if no variables provided', () => {
      const result = templateLoader.interpolateVariables(sampleTemplate);

      expect(result).toEqual(sampleTemplate);
    });

    it('should not modify original template', () => {
      const original = JSON.parse(JSON.stringify(sampleTemplate));

      templateLoader.interpolateVariables(sampleTemplate, { name: 'Test' });

      expect(sampleTemplate).toEqual(original);
    });
  });

  describe('getStepById()', () => {
    it('should return step by ID', () => {
      const step = templateLoader.getStepById(sampleTemplate, 'welcome');

      expect(step).toBeDefined();
      expect(step.id).toBe('welcome');
      expect(step.title).toBe('Welcome');
    });

    it('should return null for non-existent step', () => {
      const step = templateLoader.getStepById(sampleTemplate, 'non-existent');

      expect(step).toBeNull();
    });
  });

  describe('getStepIndex()', () => {
    it('should return correct index for step', () => {
      const index = templateLoader.getStepIndex(sampleTemplate, 'agents');

      expect(index).toBe(1);
    });

    it('should return -1 for non-existent step', () => {
      const index = templateLoader.getStepIndex(sampleTemplate, 'non-existent');

      expect(index).toBe(-1);
    });
  });

  describe('getTotalSteps()', () => {
    it('should return total number of steps', () => {
      const total = templateLoader.getTotalSteps(sampleTemplate);

      expect(total).toBe(3);
    });

    it('should return 0 for template without steps', () => {
      const total = templateLoader.getTotalSteps({});

      expect(total).toBe(0);
    });
  });

  describe('listTemplates()', () => {
    it('should list all available templates', () => {
      fs.readdirSync.mockReturnValue(['first-run.tour.yaml', 'advanced.tour.yaml']);

      const templates = templateLoader.listTemplates();

      expect(templates).toContain('first-run');
      expect(templates).toContain('advanced');
    });

    it('should filter only .tour.yaml files', () => {
      fs.readdirSync.mockReturnValue(['first-run.tour.yaml', 'readme.md', 'config.yaml']);

      const templates = templateLoader.listTemplates();

      expect(templates).toContain('first-run');
      expect(templates).not.toContain('readme');
      expect(templates).not.toContain('config');
    });

    it('should return empty array if templates directory does not exist', () => {
      fs.existsSync.mockReturnValue(false);

      const templates = templateLoader.listTemplates();

      expect(templates).toEqual([]);
    });
  });

  describe('edge cases', () => {
    it('should handle null template ID', () => {
      const template = templateLoader.loadTemplate(null);

      expect(template).toBeNull();
    });

    it('should handle undefined template ID', () => {
      const template = templateLoader.loadTemplate(undefined);

      expect(template).toBeNull();
    });

    it('should handle empty template ID', () => {
      const template = templateLoader.loadTemplate('');

      expect(template).toBeNull();
    });

    it('should handle template with null steps', () => {
      const invalidTemplate = { ...sampleTemplate, steps: null };
      const result = templateLoader.validateTemplate(invalidTemplate);

      expect(result.valid).toBe(false);
    });

    it('should handle template with non-array steps', () => {
      const invalidTemplate = { ...sampleTemplate, steps: 'not-an-array' };
      const result = templateLoader.validateTemplate(invalidTemplate);

      expect(result.valid).toBe(false);
    });

    it('should handle file read errors gracefully', () => {
      fs.readFileSync.mockImplementation(() => {
        throw new Error('Read error');
      });

      const template = templateLoader.loadTemplate('first-run');

      expect(template).toBeNull();
    });
  });
});
