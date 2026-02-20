/**
 * Tests for ProgressTracker — Tour Progress Tracking
 *
 * Covers:
 * - save() method (AC3)
 * - load() method (AC3)
 * - reset() method (AC3)
 * - Cross-session persistence (AC3)
 * - Multiple tour progress tracking (AC3)
 * - Edge cases: missing files, corrupted data
 *
 * @story STORY-OPT-A1
 */

const path = require('path');
const fs = require('fs');
const os = require('os');
const yaml = require('js-yaml');

// Mock fs and yaml before requiring the module
jest.mock('fs');
jest.mock('js-yaml', () => ({
  load: jest.fn(),
  dump: jest.fn(),
}));

// Import after mocking
const ProgressTracker = require('../../../.aios-core/core/onboarding/progress-tracker');

describe('ProgressTracker', () => {
  let progressTracker;
  const mockProjectRoot = '/test/project';

  // Sample progress data for testing
  const sampleProgressData = {
    version: '1.0.0',
    lastUpdated: '2026-02-20T10:00:00.000Z',
    tours: {
      'first-run': {
        tourId: 'first-run',
        status: 'in-progress',
        currentStepIndex: 2,
        completedSteps: ['welcome', 'agents'],
        startedAt: '2026-02-20T09:00:00.000Z',
        lastActivityAt: '2026-02-20T10:00:00.000Z',
      },
      'advanced-features': {
        tourId: 'advanced-features',
        status: 'completed',
        currentStepIndex: 5,
        completedSteps: ['intro', 'step1', 'step2', 'step3', 'step4'],
        startedAt: '2026-02-19T08:00:00.000Z',
        lastActivityAt: '2026-02-19T09:00:00.000Z',
        completedAt: '2026-02-19T09:00:00.000Z',
      },
    },
  };

  beforeEach(() => {
    jest.clearAllMocks();
    fs.existsSync.mockReturnValue(true);
    fs.readFileSync.mockReturnValue('mock yaml content');
    // Deep clone sample data to avoid mutation between tests
    yaml.load.mockReturnValue(JSON.parse(JSON.stringify(sampleProgressData)));
    yaml.dump.mockReturnValue('mock: yaml');

    progressTracker = new ProgressTracker(mockProjectRoot);
  });

  afterEach(() => {
    jest.restoreAllMocks();
  });

  describe('constructor', () => {
    it('should initialize with project root', () => {
      expect(progressTracker.projectRoot).toBe(mockProjectRoot);
    });

    it('should set the correct state file path', () => {
      const expectedPath = path.join(mockProjectRoot, '.aios-core', 'data', 'onboarding-state.yaml');
      expect(progressTracker.stateFilePath).toBe(expectedPath);
    });

    it('should load existing progress on initialization', () => {
      expect(fs.existsSync).toHaveBeenCalled();
      expect(fs.readFileSync).toHaveBeenCalled();
    });

    it('should initialize empty state if no file exists', () => {
      fs.existsSync.mockReturnValue(false);
      const tracker = new ProgressTracker(mockProjectRoot);

      expect(tracker.state).toEqual({
        version: '1.0.0',
        lastUpdated: expect.any(String),
        tours: {},
      });
    });

    it('should handle corrupted state file gracefully', () => {
      fs.existsSync.mockReturnValue(true);
      yaml.load.mockImplementation(() => {
        throw new Error('YAML parse error');
      });

      const tracker = new ProgressTracker(mockProjectRoot);

      expect(tracker.state).toEqual({
        version: '1.0.0',
        lastUpdated: expect.any(String),
        tours: {},
      });
    });
  });

  describe('save()', () => {
    it('should save progress to file', () => {
      const tourProgress = {
        tourId: 'test-tour',
        status: 'in-progress',
        currentStepIndex: 1,
        completedSteps: ['step1'],
      };

      progressTracker.save(tourProgress);

      expect(yaml.dump).toHaveBeenCalled();
      expect(fs.writeFileSync).toHaveBeenCalled();
    });

    it('should update lastUpdated timestamp', () => {
      const tourProgress = {
        tourId: 'test-tour',
        status: 'in-progress',
        currentStepIndex: 0,
        completedSteps: [],
      };

      progressTracker.save(tourProgress);

      const savedState = yaml.dump.mock.calls[0][0];
      expect(savedState.lastUpdated).toBeDefined();
    });

    it('should create data directory if it does not exist', () => {
      fs.existsSync.mockReturnValue(false);
      const tracker = new ProgressTracker(mockProjectRoot);

      const tourProgress = {
        tourId: 'test-tour',
        status: 'in-progress',
        currentStepIndex: 0,
        completedSteps: [],
      };

      tracker.save(tourProgress);

      expect(fs.mkdirSync).toHaveBeenCalled();
    });

    it('should merge tour progress into existing state', () => {
      progressTracker.save({
        tourId: 'new-tour',
        status: 'in-progress',
        currentStepIndex: 0,
        completedSteps: [],
      });

      const savedState = yaml.dump.mock.calls[0][0];
      expect(savedState.tours['first-run']).toBeDefined();
      expect(savedState.tours['new-tour']).toBeDefined();
    });

    it('should update existing tour progress', () => {
      progressTracker.save({
        tourId: 'first-run',
        status: 'completed',
        currentStepIndex: 5,
        completedSteps: ['welcome', 'agents', 'stories', 'commands', 'complete'],
      });

      const savedState = yaml.dump.mock.calls[0][0];
      expect(savedState.tours['first-run'].status).toBe('completed');
      expect(savedState.tours['first-run'].currentStepIndex).toBe(5);
    });
  });

  describe('load()', () => {
    it('should load progress for a specific tour', () => {
      const progress = progressTracker.load('first-run');

      expect(progress).toBeDefined();
      expect(progress.tourId).toBe('first-run');
      expect(progress.status).toBe('in-progress');
      expect(progress.currentStepIndex).toBe(2);
      expect(progress.completedSteps).toEqual(['welcome', 'agents']);
    });

    it('should return null for non-existent tour', () => {
      const progress = progressTracker.load('non-existent-tour');

      expect(progress).toBeNull();
    });

    it('should return null for null tour ID', () => {
      const progress = progressTracker.load(null);

      // null is explicitly passed, should return null
      expect(progress).toBeNull();
    });

    it('should return all tours for undefined tour ID', () => {
      // undefined means "load all" in the implementation
      const progress = progressTracker.load(undefined);

      expect(progress).toBeDefined();
      expect(progress.tours).toBeDefined();
    });

    it('should load all tours when no tour ID specified', () => {
      const allProgress = progressTracker.load();

      expect(allProgress).toBeDefined();
      expect(allProgress.tours['first-run']).toBeDefined();
      expect(allProgress.tours['advanced-features']).toBeDefined();
    });
  });

  describe('reset()', () => {
    it('should reset progress for a specific tour', () => {
      progressTracker.reset('first-run');

      const savedState = yaml.dump.mock.calls[0][0];
      expect(savedState.tours['first-run']).toBeUndefined();
    });

    it('should preserve other tours when resetting one', () => {
      progressTracker.reset('first-run');

      const savedState = yaml.dump.mock.calls[0][0];
      expect(savedState.tours['advanced-features']).toBeDefined();
    });

    it('should reset all tours when no tour ID specified', () => {
      progressTracker.reset();

      const savedState = yaml.dump.mock.calls[0][0];
      expect(savedState.tours).toEqual({});
    });

    it('should handle reset of non-existent tour gracefully', () => {
      // Should not throw
      expect(() => progressTracker.reset('non-existent-tour')).not.toThrow();
    });
  });

  describe('getTourStatus()', () => {
    it('should return correct status for in-progress tour', () => {
      const status = progressTracker.getTourStatus('first-run');

      expect(status).toBe('in-progress');
    });

    it('should return correct status for completed tour', () => {
      const status = progressTracker.getTourStatus('advanced-features');

      expect(status).toBe('completed');
    });

    it('should return "not-started" for non-existent tour', () => {
      const status = progressTracker.getTourStatus('new-tour');

      expect(status).toBe('not-started');
    });
  });

  describe('isTourCompleted()', () => {
    it('should return true for completed tour', () => {
      expect(progressTracker.isTourCompleted('advanced-features')).toBe(true);
    });

    it('should return false for in-progress tour', () => {
      expect(progressTracker.isTourCompleted('first-run')).toBe(false);
    });

    it('should return false for non-existent tour', () => {
      expect(progressTracker.isTourCompleted('new-tour')).toBe(false);
    });
  });

  describe('getCompletedSteps()', () => {
    it('should return completed steps for a tour', () => {
      const steps = progressTracker.getCompletedSteps('first-run');

      expect(steps).toEqual(['welcome', 'agents']);
    });

    it('should return empty array for non-existent tour', () => {
      const steps = progressTracker.getCompletedSteps('new-tour');

      expect(steps).toEqual([]);
    });
  });

  describe('getCurrentStepIndex()', () => {
    it('should return current step index for a tour', () => {
      const index = progressTracker.getCurrentStepIndex('first-run');

      expect(index).toBe(2);
    });

    it('should return 0 for non-existent tour', () => {
      const index = progressTracker.getCurrentStepIndex('new-tour');

      expect(index).toBe(0);
    });
  });

  describe('markStepCompleted()', () => {
    it('should add step to completed steps', () => {
      progressTracker.markStepCompleted('first-run', 'stories');

      const savedState = yaml.dump.mock.calls[0][0];
      expect(savedState.tours['first-run'].completedSteps).toContain('stories');
    });

    it('should increment current step index', () => {
      progressTracker.markStepCompleted('first-run', 'stories');

      const savedState = yaml.dump.mock.calls[0][0];
      expect(savedState.tours['first-run'].currentStepIndex).toBe(3);
    });

    it('should create new tour progress if not exists', () => {
      progressTracker.markStepCompleted('new-tour', 'first-step');

      const savedState = yaml.dump.mock.calls[0][0];
      expect(savedState.tours['new-tour']).toBeDefined();
      expect(savedState.tours['new-tour'].status).toBe('in-progress');
      expect(savedState.tours['new-tour'].completedSteps).toContain('first-step');
    });

    it('should not duplicate completed steps', () => {
      progressTracker.markStepCompleted('first-run', 'welcome');

      const savedState = yaml.dump.mock.calls[0][0];
      const welcomeCount = savedState.tours['first-run'].completedSteps.filter(
        s => s === 'welcome'
      ).length;
      expect(welcomeCount).toBe(1);
    });
  });

  describe('markTourCompleted()', () => {
    it('should mark tour as completed', () => {
      progressTracker.markTourCompleted('first-run');

      const savedState = yaml.dump.mock.calls[0][0];
      expect(savedState.tours['first-run'].status).toBe('completed');
      expect(savedState.tours['first-run'].completedAt).toBeDefined();
    });

    it('should set last activity time', () => {
      progressTracker.markTourCompleted('first-run');

      const savedState = yaml.dump.mock.calls[0][0];
      expect(savedState.tours['first-run'].lastActivityAt).toBeDefined();
    });
  });

  describe('edge cases', () => {
    it('should handle empty project root', () => {
      expect(() => new ProgressTracker('')).not.toThrow();
    });

    it('should handle null project root', () => {
      expect(() => new ProgressTracker(null)).not.toThrow();
    });

    it('should handle fs write errors gracefully', () => {
      fs.writeFileSync.mockImplementation(() => {
        throw new Error('Write error');
      });

      expect(() => progressTracker.save({ tourId: 'test' })).not.toThrow();
    });

    it('should handle malformed tour progress data', () => {
      yaml.load.mockReturnValue({
        version: '1.0.0',
        tours: {
          'bad-tour': 'not-an-object',
        },
      });

      const tracker = new ProgressTracker(mockProjectRoot);
      const progress = tracker.load('bad-tour');

      expect(progress).toBeNull();
    });
  });
});
