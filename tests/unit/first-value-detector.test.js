/**
 * First Value Detector - Tests
 *
 * @module tests/unit/first-value-detector.test.js
 * @story FVD-1: First Value Detection
 */

const {
  FirstValueDetector,
  MILESTONES,
  FV_CONFIG,
} = require('../../.aios-core/development/scripts/first-value-detector');

const fs = require('fs');
const path = require('path');

// Mock fs module
jest.mock('fs', () => ({
  existsSync: jest.fn(),
  mkdirSync: jest.fn(),
  readFileSync: jest.fn(),
  writeFileSync: jest.fn(),
}));

// Mock js-yaml
jest.mock('js-yaml', () => ({
  load: jest.fn(() => ({
    version: '1.0.0',
    sessionStartedAt: '2026-01-01T00:00:00.000Z',
    milestones: {},
    firstValueReached: false,
    firstValueAt: null,
    ttfv: null,
  })),
  dump: jest.fn(() => 'mocked: yaml'),
}));

describe('FirstValueDetector', () => {
  let detector;

  beforeEach(() => {
    jest.clearAllMocks();
    fs.existsSync.mockReturnValue(false);
    detector = new FirstValueDetector('/test/project');
  });

  // ============================================================
  // 1. Initialization Tests
  // ============================================================
  describe('initialization', () => {
    test('should initialize with default state when no file exists', () => {
      expect(detector.state).toBeDefined();
      expect(detector.state.version).toBe('1.0.0');
      expect(detector.state.firstValueReached).toBe(false);
      expect(detector.state.milestones).toEqual({});
    });

    test('should use provided project root', () => {
      expect(detector.projectRoot).toBe('/test/project');
    });

    test('should set correct state file path', () => {
      expect(detector.stateFilePath).toContain('first-value-state.yaml');
    });
  });

  // ============================================================
  // 2. Record Milestone Tests
  // ============================================================
  describe('recordMilestone', () => {
    test('should return error for unknown milestone', () => {
      const result = detector.recordMilestone('unknown_milestone');

      expect(result.success).toBe(false);
      expect(result.error).toContain('Unknown milestone');
    });

    test('should record valid milestone', () => {
      const result = detector.recordMilestone('agent_activated');

      expect(result.success).toBe(true);
      expect(result.milestone).toBe('agent_activated');
    });

    test('should track milestone in state', () => {
      detector.recordMilestone('agent_activated');

      expect(detector.state.milestones['agent_activated']).toBeDefined();
      expect(detector.state.milestones['agent_activated'].reachedAt).toBeDefined();
    });

    test('should save state after recording', () => {
      detector.recordMilestone('agent_activated');

      expect(fs.writeFileSync).toHaveBeenCalled();
    });

    test('should not reach first value with single core milestone', () => {
      const result = detector.recordMilestone('agent_activated');

      expect(result.firstValueReached).toBe(false);
    });

    test('should reach first value with both required milestones', () => {
      detector.recordMilestone('agent_activated');
      const result = detector.recordMilestone('command_executed');

      expect(result.firstValueReached).toBe(true);
    });

    test('should not double record first value', () => {
      detector.recordMilestone('agent_activated');
      detector.recordMilestone('command_executed');

      const result = detector.recordMilestone('story_created');

      expect(result.alreadyCompleted).toBe(true);
    });
  });

  // ============================================================
  // 3. First Value Detection Tests
  // ============================================================
  describe('_checkFirstValue', () => {
    test('should return false when no milestones reached', () => {
      const result = detector._checkFirstValue();

      expect(result.reached).toBe(false);
      expect(result.score).toBe(0);
    });

    test('should calculate correct score', () => {
      detector.recordMilestone('agent_activated');

      const result = detector._checkFirstValue();

      expect(result.score).toBe(10); // weight of agent_activated
    });

    test('should require both core milestones', () => {
      detector.recordMilestone('agent_activated');

      const result = detector._checkFirstValue();

      expect(result.hasRequiredMilestones).toBe(false);
      expect(result.requiredCount).toBe(1);
    });

    test('should detect first value when criteria met', () => {
      detector.recordMilestone('agent_activated');
      detector.recordMilestone('command_executed');

      const result = detector._checkFirstValue();

      expect(result.reached).toBe(true);
      expect(result.hasRequiredMilestones).toBe(true);
      expect(result.hasEnoughScore).toBe(true);
    });

    test('should set TTFV when first value reached', () => {
      detector.recordMilestone('agent_activated');
      detector.recordMilestone('command_executed');

      expect(detector.state.firstValueReached).toBe(true);
      expect(detector.state.ttfv).toBeDefined();
    });
  });

  // ============================================================
  // 4. Get Status Tests
  // ============================================================
  describe('getStatus', () => {
    test('should return status object with required fields', () => {
      const status = detector.getStatus();

      expect(status.sessionStartedAt).toBeDefined();
      expect(status.firstValueReached).toBe(false);
      expect(status.milestones).toEqual([]);
      expect(status.currentScore).toBeDefined();
    });

    test('should include formatted TTFV when reached', () => {
      detector.recordMilestone('agent_activated');
      detector.recordMilestone('command_executed');

      const status = detector.getStatus();

      expect(status.firstValueReached).toBe(true);
      expect(status.ttfvFormatted).toBeDefined();
    });

    test('should calculate progress percentage', () => {
      detector.recordMilestone('agent_activated');

      const status = detector.getStatus();

      expect(status.progress).toBeGreaterThan(0);
      expect(status.progress).toBeLessThan(100);
    });

    test('should return 100% progress when first value reached', () => {
      detector.recordMilestone('agent_activated');
      detector.recordMilestone('command_executed');

      const status = detector.getStatus();

      expect(status.progress).toBe(100);
    });
  });

  // ============================================================
  // 5. Report Generation Tests
  // ============================================================
  describe('generateReport', () => {
    test('should generate ASCII report', () => {
      const report = detector.generateReport();

      expect(report).toContain('First Value Detection Report');
      expect(report).toContain('Progress:');
    });

    test('should show reached milestones', () => {
      detector.recordMilestone('agent_activated');
      const report = detector.generateReport();

      expect(report).toContain('Agent Activated');
    });

    test('should show remaining milestones', () => {
      const report = detector.generateReport();

      expect(report).toContain('Remaining Milestones');
    });

    test('should show celebration when first value reached', () => {
      detector.recordMilestone('agent_activated');
      detector.recordMilestone('command_executed');
      const report = detector.generateReport();

      expect(report).toContain('First Value Reached');
    });
  });

  // ============================================================
  // 6. Status Line Tests
  // ============================================================
  describe('generateStatusLine', () => {
    test('should generate progress line when not reached', () => {
      const line = detector.generateStatusLine();

      expect(line).toContain('progress:');
      expect(line).toContain('%');
    });

    test('should generate celebration line when reached', () => {
      detector.recordMilestone('agent_activated');
      detector.recordMilestone('command_executed');
      const line = detector.generateStatusLine();

      expect(line).toContain('First Value reached');
    });
  });

  // ============================================================
  // 7. Reset Tests
  // ============================================================
  describe('reset', () => {
    test('should reset state to defaults', () => {
      detector.recordMilestone('agent_activated');
      detector.reset();

      expect(detector.state.milestones).toEqual({});
      expect(detector.state.firstValueReached).toBe(false);
    });

    test('should save state after reset', () => {
      detector.reset();

      expect(fs.writeFileSync).toHaveBeenCalled();
    });
  });

  // ============================================================
  // 8. Duration Formatting Tests
  // ============================================================
  describe('_formatDuration', () => {
    test('should format seconds', () => {
      const result = detector._formatDuration(5000);

      expect(result).toBe('5s');
    });

    test('should format minutes and seconds', () => {
      const result = detector._formatDuration(125000);

      expect(result).toBe('2m 5s');
    });

    test('should format hours and minutes', () => {
      const result = detector._formatDuration(3725000);

      expect(result).toBe('1h 2m');
    });
  });

  // ============================================================
  // 9. Progress Bar Tests
  // ============================================================
  describe('_generateProgressBar', () => {
    test('should generate empty bar for 0%', () => {
      const bar = detector._generateProgressBar(0);

      expect(bar).toBe('░░░░░░░░░░');
    });

    test('should generate full bar for 100%', () => {
      const bar = detector._generateProgressBar(100);

      expect(bar).toBe('██████████');
    });

    test('should generate partial bar', () => {
      const bar = detector._generateProgressBar(50);

      expect(bar).toBe('█████░░░░░');
    });
  });

  // ============================================================
  // 10. Static Methods Tests
  // ============================================================
  describe('static methods', () => {
    test('getMilestones should return milestone definitions', () => {
      const milestones = FirstValueDetector.getMilestones();

      expect(milestones).toBe(MILESTONES);
      expect(milestones.AGENT_ACTIVATED).toBeDefined();
    });

    test('getConfig should return config', () => {
      const config = FirstValueDetector.getConfig();

      expect(config).toBe(FV_CONFIG);
      expect(config.MIN_SCORE).toBeDefined();
    });
  });

  // ============================================================
  // 11. Constants Tests
  // ============================================================
  describe('constants', () => {
    test('MILESTONES should have required core milestones', () => {
      expect(MILESTONES.AGENT_ACTIVATED).toBeDefined();
      expect(MILESTONES.AGENT_ACTIVATED.required).toBe(true);
      expect(MILESTONES.COMMAND_EXECUTED).toBeDefined();
      expect(MILESTONES.COMMAND_EXECUTED.required).toBe(true);
    });

    test('all milestones should have required fields', () => {
      for (const [key, m] of Object.entries(MILESTONES)) {
        expect(m.id).toBeDefined();
        expect(m.name).toBeDefined();
        expect(m.description).toBeDefined();
        expect(m.category).toBeDefined();
        expect(m.weight).toBeGreaterThan(0);
      }
    });

    test('FV_CONFIG should have required config values', () => {
      expect(FV_CONFIG.MIN_SCORE).toBeGreaterThan(0);
      expect(FV_CONFIG.REQUIRED_MILESTONES).toBeGreaterThan(0);
      expect(FV_CONFIG.MAX_TTFV_MS).toBeGreaterThan(0);
    });

    test('MIN_SCORE should be achievable with core milestones', () => {
      const coreScore = Object.values(MILESTONES)
        .filter(m => m.required)
        .reduce((sum, m) => sum + m.weight, 0);

      expect(coreScore).toBeGreaterThanOrEqual(FV_CONFIG.MIN_SCORE);
    });
  });

  // ============================================================
  // 12. Integration Tests
  // ============================================================
  describe('integration', () => {
    test('should complete full first value flow', () => {
      // Initial state
      let status = detector.getStatus();
      expect(status.firstValueReached).toBe(false);
      expect(status.progress).toBe(0);

      // First milestone
      let result = detector.recordMilestone('agent_activated');
      expect(result.success).toBe(true);
      expect(result.firstValueReached).toBe(false);

      // Second milestone - should trigger first value
      result = detector.recordMilestone('command_executed');
      expect(result.success).toBe(true);
      expect(result.firstValueReached).toBe(true);

      // Final status
      status = detector.getStatus();
      expect(status.firstValueReached).toBe(true);
      expect(status.progress).toBe(100);
      expect(status.milestones.length).toBe(2);
    });

    test('should reach first value with combination of milestones', () => {
      // Use core + important milestones
      detector.recordMilestone('agent_activated'); // 10 pts
      detector.recordMilestone('story_created'); // 8 pts
      detector.recordMilestone('command_executed'); // 10 pts

      const status = detector.getStatus();

      // 28 pts total, should reach first value (min 18)
      expect(status.firstValueReached).toBe(true);
    });
  });
});
