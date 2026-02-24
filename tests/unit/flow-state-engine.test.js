/**
 * Flow-State Engine - Full Scenario Tests
 *
 * @module tests/unit/flow-state-engine.test.js
 * @story FSE-1: Flow-State Engine Core
 * @coverage State detection, transitions, recommendations, visualization
 */

const fs = require('fs').promises;
const path = require('path');
const os = require('os');

// Mock child_process for git commands
jest.mock('child_process', () => ({
  execSync: jest.fn(),
}));

// Mock project-status-loader
jest.mock('../../.aios-core/infrastructure/scripts/project-status-loader', () => ({
  loadProjectStatus: jest.fn(),
}));

const { execSync } = require('child_process');
const { loadProjectStatus } = require('../../.aios-core/infrastructure/scripts/project-status-loader');
const {
  FlowStateEngine,
  FLOW_STATES,
  STATE_TRANSITIONS,
  STATE_ACTIONS,
} = require('../../.aios-core/development/scripts/flow-state-engine');

describe('FlowStateEngine', () => {
  let engine;
  let tempDir;

  beforeEach(() => {
    // Create temp directory for each test
    tempDir = path.join(os.tmpdir(), `flow-state-test-${Date.now()}`);
    engine = new FlowStateEngine({ projectRoot: tempDir, verbose: false });

    // Reset mocks
    jest.clearAllMocks();
  });

  afterEach(async () => {
    // Cleanup temp directory
    try {
      await fs.rm(tempDir, { recursive: true, force: true });
    } catch {
      // Ignore cleanup errors
    }
  });

  // ============================================================
  // 1. Initialization Tests
  // ============================================================
  describe('initialization', () => {
    test('should initialize with IDLE state', () => {
      expect(engine.currentState).toBe(FLOW_STATES.IDLE);
      expect(engine.currentState.id).toBe('idle');
      expect(engine.currentState.icon).toBe('⚪');
    });

    test('should have empty signals and context on init', () => {
      expect(engine.signals).toEqual({});
      expect(engine.context).toEqual({});
      expect(engine.history).toEqual([]);
    });

    test('should accept custom project root', () => {
      const customEngine = new FlowStateEngine({ projectRoot: '/custom/path' });
      expect(customEngine.projectRoot).toBe('/custom/path');
    });

    test('should enable verbose logging when requested', () => {
      const verboseEngine = new FlowStateEngine({ verbose: true });
      expect(verboseEngine.verbose).toBe(true);
    });
  });

  // ============================================================
  // 2. Signal Collection Tests
  // ============================================================
  describe('collectSignals', () => {
    test('should collect git signals', async () => {
      execSync.mockImplementation((cmd) => {
        if (cmd.includes('status')) return 'M file1.js\nA file2.js';
        if (cmd.includes('branch')) return 'feature/test-branch';
        if (cmd.includes('stash')) return '';
        return '';
      });

      loadProjectStatus.mockResolvedValue({ storyStatus: 'in_progress' });

      const signals = await engine.collectSignals();

      expect(signals.git).toBeDefined();
      expect(signals.git.branch).toBe('feature/test-branch');
      expect(signals.git.hasChanges).toBe(true);
      expect(signals.git.changedFiles).toBe(2);
    });

    test('should collect story signals', async () => {
      execSync.mockReturnValue('');
      loadProjectStatus.mockResolvedValue({
        storyStatus: 'in_progress',
        storyProgress: 50,
        storyPath: 'docs/stories/test.md',
      });

      const signals = await engine.collectSignals();

      expect(signals.story).toBeDefined();
      expect(signals.story.status).toBe('in_progress');
      expect(signals.story.progress).toBe(50);
      expect(signals.story.path).toBe('docs/stories/test.md');
    });

    test('should handle git errors gracefully', async () => {
      execSync.mockImplementation(() => {
        throw new Error('Not a git repository');
      });
      loadProjectStatus.mockResolvedValue({});

      const signals = await engine.collectSignals();

      expect(signals.git.error).toBeDefined();
      expect(signals.git.hasChanges).toBe(false);
    });

    test('should handle missing project status gracefully', async () => {
      execSync.mockReturnValue('');
      loadProjectStatus.mockRejectedValue(new Error('No status file'));

      const signals = await engine.collectSignals();

      expect(signals.story.status).toBe('unknown');
    });
  });

  // ============================================================
  // 3. State Determination Tests
  // ============================================================
  describe('determineState', () => {
    test('should detect BLOCKED state', async () => {
      const signals = {
        story: { status: 'blocked' },
        git: { hasChanges: false },
        ci: { status: 'unknown' },
        session: {},
      };

      const result = await engine.determineState(signals);

      expect(result.state).toBe(FLOW_STATES.BLOCKED);
      expect(result.confidence).toBeGreaterThanOrEqual(0.9);
      expect(result.reasons).toContain('Story is marked as blocked');
    });

    test('should detect CI_FAILED state', async () => {
      const signals = {
        story: { status: 'in_progress' },
        git: { hasChanges: false },
        ci: { status: 'failed' },
        session: {},
      };

      const result = await engine.determineState(signals);

      expect(result.state).toBe(FLOW_STATES.CI_FAILED);
      expect(result.confidence).toBeGreaterThanOrEqual(0.9);
    });

    test('should detect QA_ISSUES state', async () => {
      const signals = {
        story: { status: 'qa_rejected' },
        git: { hasChanges: false },
        ci: { status: 'unknown' },
        session: {},
      };

      const result = await engine.determineState(signals);

      expect(result.state).toBe(FLOW_STATES.QA_ISSUES);
    });

    test('should detect COMPLETED state', async () => {
      const signals = {
        story: { status: 'done' },
        git: { hasChanges: false },
        ci: { status: 'passed' },
        session: {},
      };

      const result = await engine.determineState(signals);

      expect(result.state).toBe(FLOW_STATES.COMPLETED);
    });

    test('should detect IN_QA state', async () => {
      const signals = {
        story: { status: 'in_qa' },
        git: { hasChanges: false },
        ci: { status: 'unknown' },
        session: {},
      };

      const result = await engine.determineState(signals);

      expect(result.state).toBe(FLOW_STATES.IN_QA);
    });

    test('should detect READY_FOR_QA state (clean working tree)', async () => {
      const signals = {
        story: { status: 'in_progress' },
        git: { hasChanges: false },
        ci: { status: 'unknown' },
        session: {},
      };

      const result = await engine.determineState(signals);

      expect(result.state).toBe(FLOW_STATES.READY_FOR_QA);
    });

    test('should detect IN_DEVELOPMENT state (uncommitted changes)', async () => {
      const signals = {
        story: { status: 'in_progress' },
        git: { hasChanges: true, changedFiles: 3 },
        ci: { status: 'unknown' },
        session: {},
      };

      const result = await engine.determineState(signals);

      expect(result.state).toBe(FLOW_STATES.IN_DEVELOPMENT);
    });

    test('should detect READY_TO_START state', async () => {
      const signals = {
        story: { status: 'validated' },
        git: { hasChanges: false },
        ci: { status: 'unknown' },
        session: {},
      };

      const result = await engine.determineState(signals);

      expect(result.state).toBe(FLOW_STATES.READY_TO_START);
    });

    test('should detect PLANNING state', async () => {
      const signals = {
        story: { status: 'draft' },
        git: { hasChanges: false },
        ci: { status: 'unknown' },
        session: {},
      };

      const result = await engine.determineState(signals);

      expect(result.state).toBe(FLOW_STATES.PLANNING);
    });

    test('should detect CI_RUNNING state', async () => {
      const signals = {
        story: { status: 'in_progress' },
        git: { hasChanges: false },
        ci: { status: 'running' },
        session: {},
      };

      const result = await engine.determineState(signals);

      expect(result.state).toBe(FLOW_STATES.CI_RUNNING);
    });

    test('should detect READY_FOR_MERGE state', async () => {
      const signals = {
        story: { status: 'in_progress' },
        git: { hasChanges: false },
        ci: { status: 'passed' },
        session: {},
      };

      const result = await engine.determineState(signals);

      expect(result.state).toBe(FLOW_STATES.READY_FOR_MERGE);
    });

    test('should default to IDLE when no signals', async () => {
      const signals = {
        story: { status: 'unknown' },
        git: { hasChanges: false },
        ci: { status: 'unknown' },
        session: {},
      };

      const result = await engine.determineState(signals);

      expect(result.state).toBe(FLOW_STATES.IDLE);
    });
  });

  // ============================================================
  // 4. State Priority Tests (Higher Priority States Win)
  // ============================================================
  describe('state priority', () => {
    test('BLOCKED should override other states', async () => {
      const signals = {
        story: { status: 'blocked' },
        git: { hasChanges: true },
        ci: { status: 'failed' },
        session: {},
      };

      const result = await engine.determineState(signals);

      expect(result.state).toBe(FLOW_STATES.BLOCKED);
    });

    test('CI_FAILED should override IN_DEVELOPMENT', async () => {
      const signals = {
        story: { status: 'in_progress' },
        git: { hasChanges: true },
        ci: { status: 'failed' },
        session: {},
      };

      const result = await engine.determineState(signals);

      expect(result.state).toBe(FLOW_STATES.CI_FAILED);
    });
  });

  // ============================================================
  // 5. Recommended Actions Tests
  // ============================================================
  describe('getRecommendedActions', () => {
    test('should return actions for IDLE state', async () => {
      engine.currentState = FLOW_STATES.IDLE;

      const actions = engine.getRecommendedActions();

      expect(actions.length).toBeGreaterThan(0);
      expect(actions[0].command).toContain('*create-story');
    });

    test('should return actions for IN_DEVELOPMENT state', async () => {
      engine.currentState = FLOW_STATES.IN_DEVELOPMENT;

      const actions = engine.getRecommendedActions();

      expect(actions.some(a => a.command.includes('*run-tests'))).toBe(true);
    });

    test('should return actions for READY_FOR_QA state', async () => {
      engine.currentState = FLOW_STATES.READY_FOR_QA;
      engine.signals = { story: { path: 'docs/stories/test.md' } };

      const actions = engine.getRecommendedActions();

      expect(actions[0].command).toContain('*review-qa');
    });

    test('should substitute story path in commands', async () => {
      engine.currentState = FLOW_STATES.READY_TO_START;
      engine.signals = { story: { path: 'docs/stories/my-story.md' } };

      const actions = engine.getRecommendedActions({ story: 'docs/stories/my-story.md' });

      expect(actions[0].command).toContain('docs/stories/my-story.md');
    });

    test('should return empty array for unknown state', async () => {
      engine.currentState = { id: 'unknown_state' };

      const actions = engine.getRecommendedActions();

      expect(actions).toEqual([]);
    });
  });

  // ============================================================
  // 6. State Transitions Tests
  // ============================================================
  describe('getTransitionOptions', () => {
    test('should return valid transitions for IDLE state', () => {
      engine.currentState = FLOW_STATES.IDLE;

      const transitions = engine.getTransitionOptions();

      expect(transitions.length).toBeGreaterThan(0);
      expect(transitions.some(t => t.state.id === 'planning')).toBe(true);
    });

    test('should return valid transitions for IN_DEVELOPMENT state', () => {
      engine.currentState = FLOW_STATES.IN_DEVELOPMENT;

      const transitions = engine.getTransitionOptions();

      expect(transitions.length).toBeGreaterThan(0);
    });

    test('should return empty array for state with no transitions', () => {
      engine.currentState = { id: 'nonexistent' };

      const transitions = engine.getTransitionOptions();

      expect(transitions).toEqual([]);
    });
  });

  // ============================================================
  // 7. Command History Tests
  // ============================================================
  describe('recordCommand', () => {
    test('should record command in history', () => {
      engine.recordCommand('*develop');

      expect(engine.history.length).toBe(1);
      expect(engine.history[0].command).toBe('*develop');
      expect(engine.history[0].state).toBe('idle');
    });

    test('should limit history to 50 entries', () => {
      for (let i = 0; i < 60; i++) {
        engine.recordCommand(`*command-${i}`);
      }

      expect(engine.history.length).toBe(50);
      expect(engine.history[0].command).toBe('*command-10');
    });

    test('should include timestamp in history entry', () => {
      engine.recordCommand('*test');

      expect(engine.history[0].timestamp).toBeDefined();
      expect(new Date(engine.history[0].timestamp)).toBeInstanceOf(Date);
    });
  });

  // ============================================================
  // 8. Visualization Tests
  // ============================================================
  describe('visualizeState', () => {
    test('should generate ASCII visualization', () => {
      engine.currentState = FLOW_STATES.IN_DEVELOPMENT;
      engine.context = { confidence: 0.85 };

      const viz = engine.visualizeState();

      expect(viz).toContain('In Development');
      expect(viz).toContain('85%');
    });

    test('should include state icon in visualization', () => {
      engine.currentState = FLOW_STATES.BLOCKED;
      engine.context = { confidence: 0.95 };

      const viz = engine.visualizeState();

      expect(viz).toContain(FLOW_STATES.BLOCKED.icon);
    });

    test('should include recommended actions', () => {
      engine.currentState = FLOW_STATES.READY_TO_START;
      engine.context = { confidence: 0.88 };

      const viz = engine.visualizeState();

      expect(viz).toContain('develop-yolo');
    });
  });

  // ============================================================
  // 9. Export/Import Tests
  // ============================================================
  describe('exportState', () => {
    test('should export current state', () => {
      engine.currentState = FLOW_STATES.IN_DEVELOPMENT;
      engine.context = { confidence: 0.85 };
      engine.signals = { git: { hasChanges: true } };

      const exported = engine.exportState();

      expect(exported.version).toBe('1.0.0');
      expect(exported.currentState).toBe('in_development');
      expect(exported.context.confidence).toBe(0.85);
      expect(exported.signals.git.hasChanges).toBe(true);
    });

    test('should include last 10 commands in export', () => {
      for (let i = 0; i < 15; i++) {
        engine.recordCommand(`*cmd-${i}`);
      }

      const exported = engine.exportState();

      expect(exported.history.length).toBe(10);
    });
  });

  describe('importState', () => {
    test('should import previously exported state', () => {
      const data = {
        version: '1.0.0',
        currentState: 'in_development',
        context: { confidence: 0.9 },
        signals: { story: { status: 'in_progress' } },
        history: [{ command: '*test', timestamp: '2026-01-01T00:00:00.000Z' }],
      };

      engine.importState(data);

      expect(engine.currentState).toBe(FLOW_STATES.IN_DEVELOPMENT);
      expect(engine.context.confidence).toBe(0.9);
      expect(engine.history.length).toBe(1);
    });

    test('should reject unsupported version', () => {
      const data = {
        version: '2.0.0',
        currentState: 'idle',
      };

      expect(() => engine.importState(data)).toThrow('Unsupported state version');
    });

    test('should default to IDLE for unknown state', () => {
      const data = {
        version: '1.0.0',
        currentState: 'unknown_state',
      };

      engine.importState(data);

      expect(engine.currentState).toBe(FLOW_STATES.IDLE);
    });
  });
});

// ============================================================
// 10. Constants Validation Tests
// ============================================================
describe('Constants', () => {
  test('FLOW_STATES should have all required states', () => {
    const requiredStates = [
      'IDLE', 'PLANNING', 'READY_TO_START', 'IN_DEVELOPMENT', 'CODE_COMPLETE',
      'READY_FOR_QA', 'IN_QA', 'QA_ISSUES', 'READY_FOR_CI', 'CI_RUNNING',
      'CI_FAILED', 'READY_FOR_MERGE', 'COMPLETED', 'BLOCKED',
    ];

    requiredStates.forEach(state => {
      expect(FLOW_STATES[state]).toBeDefined();
      expect(FLOW_STATES[state].id).toBeDefined();
      expect(FLOW_STATES[state].label).toBeDefined();
      expect(FLOW_STATES[state].icon).toBeDefined();
    });
  });

  test('STATE_TRANSITIONS should have valid state references', () => {
    Object.keys(STATE_TRANSITIONS).forEach(stateId => {
      expect(FLOW_STATES[stateId]).toBeDefined();

      STATE_TRANSITIONS[stateId].next.forEach(nextStateId => {
        expect(FLOW_STATES[nextStateId]).toBeDefined();
      });
    });
  });

  test('STATE_ACTIONS should have valid state references', () => {
    Object.keys(STATE_ACTIONS).forEach(stateId => {
      expect(FLOW_STATES[stateId]).toBeDefined();
      expect(Array.isArray(STATE_ACTIONS[stateId])).toBe(true);
    });
  });
});

// ============================================================
// 11. Integration Tests (Simulated Workflows)
// ============================================================
describe('Integration: Workflow Simulation', () => {
  let engine;

  beforeEach(() => {
    engine = new FlowStateEngine({ verbose: false });
  });

  test('should progress through story development workflow', async () => {
    // Start: Planning
    let signals = {
      story: { status: 'draft' },
      git: { hasChanges: false },
      ci: { status: 'unknown' },
      session: {},
    };

    let result = await engine.determineState(signals);
    expect(result.state).toBe(FLOW_STATES.PLANNING);

    // Story validated
    signals.story.status = 'validated';
    result = await engine.determineState(signals);
    expect(result.state).toBe(FLOW_STATES.READY_TO_START);

    // Development started
    signals.story.status = 'in_progress';
    signals.git.hasChanges = true;
    result = await engine.determineState(signals);
    expect(result.state).toBe(FLOW_STATES.IN_DEVELOPMENT);

    // Code complete, ready for QA
    signals.git.hasChanges = false;
    result = await engine.determineState(signals);
    expect(result.state).toBe(FLOW_STATES.READY_FOR_QA);

    // QA in progress
    signals.story.status = 'in_qa';
    result = await engine.determineState(signals);
    expect(result.state).toBe(FLOW_STATES.IN_QA);

    // QA passed, CI running
    signals.story.status = 'in_progress';
    signals.ci.status = 'running';
    result = await engine.determineState(signals);
    expect(result.state).toBe(FLOW_STATES.CI_RUNNING);

    // CI passed, ready to merge
    signals.ci.status = 'passed';
    result = await engine.determineState(signals);
    expect(result.state).toBe(FLOW_STATES.READY_FOR_MERGE);

    // Completed
    signals.story.status = 'done';
    result = await engine.determineState(signals);
    expect(result.state).toBe(FLOW_STATES.COMPLETED);
  });

  test('should handle QA rejection workflow', async () => {
    let signals = {
      story: { status: 'in_progress' },
      git: { hasChanges: false },
      ci: { status: 'unknown' },
      session: {},
    };

    // Ready for QA
    let result = await engine.determineState(signals);
    expect(result.state).toBe(FLOW_STATES.READY_FOR_QA);

    // QA rejected
    signals.story.status = 'qa_rejected';
    result = await engine.determineState(signals);
    expect(result.state).toBe(FLOW_STATES.QA_ISSUES);

    // Fixing issues
    signals.story.status = 'in_progress';
    signals.git.hasChanges = true;
    result = await engine.determineState(signals);
    expect(result.state).toBe(FLOW_STATES.IN_DEVELOPMENT);
  });

  test('should handle CI failure workflow', async () => {
    let signals = {
      story: { status: 'in_progress' },
      git: { hasChanges: false },
      ci: { status: 'running' },
      session: {},
    };

    // CI running
    let result = await engine.determineState(signals);
    expect(result.state).toBe(FLOW_STATES.CI_RUNNING);

    // CI failed
    signals.ci.status = 'failed';
    result = await engine.determineState(signals);
    expect(result.state).toBe(FLOW_STATES.CI_FAILED);

    // Fixing CI issues
    signals.git.hasChanges = true;
    signals.ci.status = 'unknown';
    result = await engine.determineState(signals);
    expect(result.state).toBe(FLOW_STATES.IN_DEVELOPMENT);
  });

  test('should handle blocked story workflow', async () => {
    const signals = {
      story: { status: 'blocked' },
      git: { hasChanges: true },
      ci: { status: 'failed' },
      session: {},
    };

    // determineState updates engine.currentState internally
    await engine.determineState(signals);

    // Now engine.currentState should be BLOCKED
    expect(engine.currentState).toBe(FLOW_STATES.BLOCKED);

    // Check recommended actions for blocked state
    const actions = engine.getRecommendedActions();
    expect(actions.length).toBeGreaterThan(0);
    expect(actions[0].command).toContain('orchestrate');
  });
});
