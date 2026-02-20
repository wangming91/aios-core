/**
 * Tests for TourManager — Interactive Tour Management
 *
 * Covers:
 * - start(tourId) method (AC1)
 * - resume() method (AC1)
 * - completeStep() method (AC1)
 * - reset() method (AC1)
 * - Progress tracking integration (AC1, AC3)
 * - Edge cases: missing tours, invalid states
 *
 * @story STORY-OPT-A1
 */

const path = require('path');

// Mock dependencies
jest.mock('../../../.aios-core/core/onboarding/progress-tracker');
jest.mock('../../../.aios-core/core/onboarding/template-loader');

// Import after mocking
const TourManager = require('../../../.aios-core/core/onboarding/tour-manager');
const ProgressTracker = require('../../../.aios-core/core/onboarding/progress-tracker');
const TemplateLoader = require('../../../.aios-core/core/onboarding/template-loader');

describe('TourManager', () => {
  let tourManager;
  let mockProgressTracker;
  let mockTemplateLoader;

  // Sample template data
  const sampleTemplate = {
    id: 'first-run',
    title: 'Welcome to AIOS',
    description: '5-minute quick introduction',
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
        id: 'stories',
        title: 'Story-Driven Development',
        type: 'interactive',
        content: 'Development is organized through stories:',
        action: {
          type: 'command',
          command: 'aios story list',
          label: 'View Stories',
        },
      },
      {
        id: 'complete',
        title: 'Tutorial Complete!',
        type: 'complete',
        content: 'Congratulations!',
      },
    ],
  };

  beforeEach(() => {
    jest.clearAllMocks();

    // Setup mock ProgressTracker
    mockProgressTracker = {
      load: jest.fn(),
      save: jest.fn(),
      reset: jest.fn(),
      getTourStatus: jest.fn().mockReturnValue('not-started'),
      getCurrentStepIndex: jest.fn().mockReturnValue(0),
      getCompletedSteps: jest.fn().mockReturnValue([]),
      markStepCompleted: jest.fn(),
      markTourCompleted: jest.fn(),
    };
    ProgressTracker.mockImplementation(() => mockProgressTracker);

    // Setup mock TemplateLoader
    mockTemplateLoader = {
      loadTemplate: jest.fn().mockReturnValue(sampleTemplate),
      validateTemplate: jest.fn().mockReturnValue({ valid: true, errors: [] }),
      interpolateVariables: jest.fn((t) => t),
      getStepById: jest.fn(),
      getStepIndex: jest.fn(),
      getTotalSteps: jest.fn().mockReturnValue(4),
    };
    TemplateLoader.mockImplementation(() => mockTemplateLoader);

    tourManager = new TourManager('/test/project');
  });

  afterEach(() => {
    jest.restoreAllMocks();
  });

  describe('constructor', () => {
    it('should initialize with project root', () => {
      expect(tourManager.projectRoot).toBe('/test/project');
    });

    it('should create ProgressTracker instance', () => {
      expect(ProgressTracker).toHaveBeenCalledWith('/test/project');
    });

    it('should create TemplateLoader instance', () => {
      expect(TemplateLoader).toHaveBeenCalled();
    });

    it('should initialize with no current tour', () => {
      expect(tourManager.currentTour).toBeNull();
      expect(tourManager.currentStepIndex).toBe(0);
    });
  });

  describe('start()', () => {
    it('should start a new tour', async () => {
      const result = await tourManager.start('first-run');

      expect(mockTemplateLoader.loadTemplate).toHaveBeenCalledWith('first-run');
      expect(result).toBeDefined();
      expect(result.tour).toBeDefined();
      expect(result.step).toBeDefined();
      expect(result.step.id).toBe('welcome');
    });

    it('should reset progress when starting a new tour', async () => {
      await tourManager.start('first-run');

      expect(mockProgressTracker.save).toHaveBeenCalled();
    });

    it('should set current tour and step index', async () => {
      await tourManager.start('first-run');

      expect(tourManager.currentTour).toEqual(sampleTemplate);
      expect(tourManager.currentStepIndex).toBe(0);
    });

    it('should return null for non-existent tour', async () => {
      mockTemplateLoader.loadTemplate.mockReturnValue(null);

      const result = await tourManager.start('non-existent');

      expect(result).toBeNull();
    });

    it('should return null for invalid template', async () => {
      mockTemplateLoader.validateTemplate.mockReturnValue({
        valid: false,
        errors: ['Missing id'],
      });

      const result = await tourManager.start('invalid-tour');

      expect(result).toBeNull();
    });

    it('should interpolate variables into template', async () => {
      await tourManager.start('first-run', { name: 'TestUser' });

      expect(mockTemplateLoader.interpolateVariables).toHaveBeenCalledWith(
        sampleTemplate,
        { name: 'TestUser' }
      );
    });

    it('should return tour metadata', async () => {
      const result = await tourManager.start('first-run');

      expect(result.tour.id).toBe('first-run');
      expect(result.tour.title).toBe('Welcome to AIOS');
      expect(result.tour.description).toBe('5-minute quick introduction');
      expect(result.tour.estimatedTime).toBe('5 min');
      expect(result.tour.totalSteps).toBe(4);
      expect(result.tour.currentStep).toBe(1);
    });
  });

  describe('resume()', () => {
    it('should resume an in-progress tour', async () => {
      mockProgressTracker.getTourStatus.mockReturnValue('in-progress');
      mockProgressTracker.getCurrentStepIndex.mockReturnValue(1);
      mockProgressTracker.getCompletedSteps.mockReturnValue(['welcome']);

      const result = await tourManager.resume('first-run');

      expect(mockTemplateLoader.loadTemplate).toHaveBeenCalledWith('first-run');
      expect(result).toBeDefined();
      expect(result.step.id).toBe('agents');
      expect(result.tour.currentStep).toBe(2);
    });

    it('should return null if no tour ID provided and no current tour', async () => {
      const result = await tourManager.resume();

      expect(result).toBeNull();
    });

    it('should resume current tour if no tour ID provided', async () => {
      await tourManager.start('first-run');
      mockProgressTracker.getTourStatus.mockReturnValue('in-progress');
      mockProgressTracker.getCurrentStepIndex.mockReturnValue(2);

      const result = await tourManager.resume();

      expect(result).toBeDefined();
      expect(result.step.id).toBe('stories');
    });

    it('should return null for completed tour', async () => {
      mockProgressTracker.getTourStatus.mockReturnValue('completed');

      const result = await tourManager.resume('first-run');

      expect(result).toBeNull();
    });

    it('should return null for non-started tour', async () => {
      mockProgressTracker.getTourStatus.mockReturnValue('not-started');

      const result = await tourManager.resume('first-run');

      expect(result).toBeNull();
    });

    it('should include completed steps info', async () => {
      mockProgressTracker.getTourStatus.mockReturnValue('in-progress');
      mockProgressTracker.getCurrentStepIndex.mockReturnValue(2);
      mockProgressTracker.getCompletedSteps.mockReturnValue(['welcome', 'agents']);

      const result = await tourManager.resume('first-run');

      expect(result.tour.completedSteps).toEqual(['welcome', 'agents']);
    });
  });

  describe('completeStep()', () => {
    beforeEach(async () => {
      await tourManager.start('first-run');
    });

    it('should complete current step and return next step', async () => {
      const result = await tourManager.completeStep();

      expect(mockProgressTracker.markStepCompleted).toHaveBeenCalledWith(
        'first-run',
        'welcome'
      );
      expect(result.step.id).toBe('agents');
      expect(result.tour.currentStep).toBe(2);
    });

    it('should return completed object when tour is finished', async () => {
      // Move to last step
      tourManager.currentStepIndex = 3;

      const result = await tourManager.completeStep();

      expect(mockProgressTracker.markTourCompleted).toHaveBeenCalledWith('first-run');
      expect(result.completed).toBe(true);
      expect(result.tour).toBeDefined();
    });

    it('should return null if no tour is active', async () => {
      tourManager.currentTour = null;

      const result = await tourManager.completeStep();

      expect(result).toBeNull();
    });

    it('should update current step index', async () => {
      await tourManager.completeStep();

      expect(tourManager.currentStepIndex).toBe(1);
    });
  });

  describe('skipStep()', () => {
    beforeEach(async () => {
      await tourManager.start('first-run');
    });

    it('should skip current step without marking as completed', async () => {
      const result = await tourManager.skipStep();

      expect(mockProgressTracker.markStepCompleted).not.toHaveBeenCalled();
      expect(result.step.id).toBe('agents');
    });

    it('should still advance to next step', async () => {
      await tourManager.skipStep();

      expect(tourManager.currentStepIndex).toBe(1);
    });

    it('should return completed object when skipping last step', async () => {
      tourManager.currentStepIndex = 3;

      const result = await tourManager.skipStep();

      expect(result.completed).toBe(true);
    });

    it('should return null if no tour is active', async () => {
      tourManager.currentTour = null;

      const result = await tourManager.skipStep();

      expect(result).toBeNull();
    });
  });

  describe('reset()', () => {
    it('should reset tour progress', async () => {
      await tourManager.reset('first-run');

      expect(mockProgressTracker.reset).toHaveBeenCalledWith('first-run');
    });

    it('should clear current tour state', async () => {
      await tourManager.start('first-run');
      await tourManager.reset('first-run');

      expect(tourManager.currentTour).toBeNull();
      expect(tourManager.currentStepIndex).toBe(0);
    });

    it('should reset all tours if no tour ID provided', async () => {
      await tourManager.reset();

      expect(mockProgressTracker.reset).toHaveBeenCalledWith(undefined);
    });
  });

  describe('getCurrentStep()', () => {
    it('should return current step', async () => {
      await tourManager.start('first-run');

      const step = tourManager.getCurrentStep();

      expect(step).toBeDefined();
      expect(step.id).toBe('welcome');
    });

    it('should return null if no tour is active', () => {
      const step = tourManager.getCurrentStep();

      expect(step).toBeNull();
    });

    it('should return correct step after navigation', async () => {
      await tourManager.start('first-run');
      tourManager.currentStepIndex = 2;

      const step = tourManager.getCurrentStep();

      expect(step.id).toBe('stories');
    });
  });

  describe('getNextStep()', () => {
    beforeEach(async () => {
      await tourManager.start('first-run');
    });

    it('should return next step', () => {
      const step = tourManager.getNextStep();

      expect(step).toBeDefined();
      expect(step.id).toBe('agents');
    });

    it('should return null if at last step', () => {
      tourManager.currentStepIndex = 3;

      const step = tourManager.getNextStep();

      expect(step).toBeNull();
    });
  });

  describe('getPreviousStep()', () => {
    beforeEach(async () => {
      await tourManager.start('first-run');
    });

    it('should return null if at first step', () => {
      const step = tourManager.getPreviousStep();

      expect(step).toBeNull();
    });

    it('should return previous step', () => {
      tourManager.currentStepIndex = 2;

      const step = tourManager.getPreviousStep();

      expect(step.id).toBe('agents');
    });
  });

  describe('goToStep()', () => {
    beforeEach(async () => {
      await tourManager.start('first-run');
    });

    it('should go to specific step by index', () => {
      const result = tourManager.goToStep(2);

      expect(tourManager.currentStepIndex).toBe(2);
      expect(result.step.id).toBe('stories');
    });

    it('should return null for invalid index', () => {
      const result = tourManager.goToStep(10);

      expect(result).toBeNull();
      expect(tourManager.currentStepIndex).toBe(0);
    });

    it('should return null for negative index', () => {
      const result = tourManager.goToStep(-1);

      expect(result).toBeNull();
    });
  });

  describe('getProgress()', () => {
    it('should return progress information', async () => {
      await tourManager.start('first-run');
      mockProgressTracker.getCompletedSteps.mockReturnValue(['welcome', 'agents']);

      const progress = tourManager.getProgress();

      expect(progress.tourId).toBe('first-run');
      expect(progress.currentStep).toBe(1);
      expect(progress.totalSteps).toBe(4);
      expect(progress.completedSteps).toEqual(['welcome', 'agents']);
      expect(progress.percentage).toBe(25);
    });

    it('should return null if no tour is active', () => {
      const progress = tourManager.getProgress();

      expect(progress).toBeNull();
    });
  });

  describe('isTourActive()', () => {
    it('should return true when tour is active', async () => {
      await tourManager.start('first-run');

      expect(tourManager.isTourActive()).toBe(true);
    });

    it('should return false when no tour is active', () => {
      expect(tourManager.isTourActive()).toBe(false);
    });
  });

  describe('getAvailableTours()', () => {
    it('should return list of available tours', () => {
      mockTemplateLoader.listTemplates = jest.fn().mockReturnValue(['first-run', 'advanced']);

      const tours = tourManager.getAvailableTours();

      expect(tours).toContain('first-run');
      expect(tours).toContain('advanced');
    });
  });

  describe('edge cases', () => {
    it('should handle null project root', () => {
      expect(() => new TourManager(null)).not.toThrow();
    });

    it('should handle empty project root', () => {
      expect(() => new TourManager('')).not.toThrow();
    });

    it('should handle template loader errors', async () => {
      mockTemplateLoader.loadTemplate.mockImplementation(() => {
        throw new Error('Loader error');
      });

      const result = await tourManager.start('first-run');

      expect(result).toBeNull();
    });

    it('should handle progress tracker errors', async () => {
      mockProgressTracker.save.mockImplementation(() => {
        throw new Error('Save error');
      });

      // Should not throw
      await expect(tourManager.start('first-run')).resolves.toBeDefined();
    });

    it('should handle template with no steps', async () => {
      mockTemplateLoader.loadTemplate.mockReturnValue({
        id: 'empty-tour',
        title: 'Empty Tour',
        steps: [],
      });
      mockTemplateLoader.getTotalSteps.mockReturnValue(0);

      const result = await tourManager.start('empty-tour');

      expect(result).toBeNull();
    });
  });
});
