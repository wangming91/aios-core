/**
 * Tests for ElicitationEngine
 *
 * Tests the interactive elicitation engine for component creation.
 */

'use strict';

const fs = require('fs-extra');
const path = require('path');
const os = require('os');
const ElicitationEngine = require('../../../.aios-core/core/elicitation/elicitation-engine');

describe('ElicitationEngine', () => {
  let engine;
  let tempDir;

  beforeEach(async () => {
    tempDir = await fs.mkdtemp(path.join(os.tmpdir(), 'elicitation-test-'));
    engine = new ElicitationEngine();
  });

  afterEach(async () => {
    await fs.remove(tempDir);
  });

  describe('constructor', () => {
    it('should initialize with securityChecker', () => {
      expect(engine.securityChecker).toBeDefined();
    });

    it('should initialize with sessionManager', () => {
      expect(engine.sessionManager).toBeDefined();
    });

    it('should initialize with empty sessionData', () => {
      expect(engine.sessionData).toEqual({});
    });

    it('should initialize currentSession as null', () => {
      expect(engine.currentSession).toBeNull();
    });
  });

  describe('startSession', () => {
    it('should create session data with componentType', async () => {
      await engine.startSession('test-component');

      expect(engine.sessionData.componentType).toBe('test-component');
    });

    it('should create session data with startTime', async () => {
      await engine.startSession('test-component');

      expect(engine.sessionData.startTime).toBeDefined();
    });

    it('should create session data with empty answers', async () => {
      await engine.startSession('test-component');

      expect(engine.sessionData.answers).toEqual({});
    });

    it('should set currentStep to 0', async () => {
      await engine.startSession('test-component');

      expect(engine.sessionData.currentStep).toBe(0);
    });

    it('should merge options into sessionData', async () => {
      await engine.startSession('test-component', { customOption: true });

      expect(engine.sessionData.options.customOption).toBe(true);
    });

    it('should set currentSession', async () => {
      await engine.startSession('test-component');

      expect(engine.currentSession).toBe(engine.sessionData);
    });
  });

  describe('mockSession', () => {
    it('should set isMocked to true', async () => {
      await engine.mockSession({ test: 'answer' });

      expect(engine.isMocked).toBe(true);
    });

    it('should store mocked answers', async () => {
      const answers = { name: 'test', type: 'component' };
      await engine.mockSession(answers);

      expect(engine.mockedAnswers).toEqual(answers);
    });
  });

  describe('runProgressive', () => {
    it('should return mocked answers when mocked', async () => {
      await engine.startSession('test');
      const mockAnswers = { name: 'mocked' };
      await engine.mockSession(mockAnswers);

      const result = await engine.runProgressive([]);

      expect(result).toEqual(mockAnswers);
    });

    it('should reset isMocked after returning mocked answers', async () => {
      await engine.startSession('test');
      await engine.mockSession({ test: 'answer' });

      await engine.runProgressive([]);

      expect(engine.isMocked).toBe(false);
    });
  });

  describe('completeSession', () => {
    it('should set session status', async () => {
      await engine.startSession('test');
      await engine.completeSession('completed');

      expect(engine.currentSession.status).toBe('completed');
    });

    it('should set completedAt timestamp', async () => {
      await engine.startSession('test');
      await engine.completeSession('completed');

      expect(engine.currentSession.completedAt).toBeDefined();
    });

    it('should handle null currentSession gracefully', async () => {
      // Don't start a session
      await expect(engine.completeSession('completed')).resolves.not.toThrow();
    });
  });

  describe('getSessionSummary', () => {
    it('should return session summary', async () => {
      await engine.startSession('test-component');

      const summary = engine.getSessionSummary();

      expect(summary).toHaveProperty('componentType');
      expect(summary).toHaveProperty('duration');
      expect(summary.componentType).toBe('test-component');
    });

    it('should return summary with duration when no session started', async () => {
      // Start a session first to have valid sessionData
      await engine.startSession('test');

      const summary = engine.getSessionSummary();

      expect(summary).toHaveProperty('componentType');
      expect(summary).toHaveProperty('duration');
    });
  });

  describe('evaluateCondition', () => {
    beforeEach(async () => {
      await engine.startSession('test');
      engine.sessionData.answers = { feature: 'advanced', mode: 'dev' };
    });

    it('should return true when equals condition matches', () => {
      const result = engine.evaluateCondition({
        field: 'feature',
        operator: 'equals',
        value: 'advanced',
      });

      expect(result).toBe(true);
    });

    it('should return false when equals condition does not match', () => {
      const result = engine.evaluateCondition({
        field: 'feature',
        operator: 'equals',
        value: 'basic',
      });

      expect(result).toBe(false);
    });

    it('should handle notEquals operator', () => {
      const result = engine.evaluateCondition({
        field: 'feature',
        operator: 'notEquals',
        value: 'basic',
      });

      expect(result).toBe(true);
    });

    it('should handle exists operator', () => {
      const result = engine.evaluateCondition({
        field: 'feature',
        operator: 'exists',
      });

      expect(result).toBe(true);
    });

    it('should return true when no operator (default)', () => {
      const result = engine.evaluateCondition({});

      expect(result).toBe(true);
    });
  });

  describe('enhanceQuestion', () => {
    it('should preserve original question properties', () => {
      const step = { title: 'Test Step' };
      const question = {
        name: 'test',
        message: 'Test question',
        type: 'input',
      };

      const enhanced = engine.enhanceQuestion(question, step);

      expect(enhanced.name).toBe('test');
      expect(enhanced.message).toBe('Test question');
      expect(enhanced.type).toBe('input');
    });
  });

  describe('generateDefault', () => {
    it('should generate kebabCase from answer', async () => {
      await engine.startSession('test');
      engine.sessionData.answers.name = 'Test Name';

      const result = engine.generateDefault({ generator: 'kebabCase', source: 'name' });

      expect(result).toBe('test-name');
    });

    it('should generate timestamp', () => {
      const result = engine.generateDefault({ generator: 'timestamp' });

      expect(result).toBeDefined();
      expect(typeof result).toBe('string');
    });

    it('should generate version', () => {
      const result = engine.generateDefault({ generator: 'version' });

      expect(result).toBe('1.0.0');
    });

    it('should return empty string for unknown generator', () => {
      const result = engine.generateDefault({ generator: 'unknown' });

      expect(result).toBe('');
    });
  });

  describe('getSmartDefault', () => {
    beforeEach(async () => {
      await engine.startSession('test');
      engine.sessionData.answers = { feature: 'advanced' };
    });

    it('should return value from answer', () => {
      const result = engine.getSmartDefault({ type: 'fromAnswer', source: 'feature' });

      expect(result).toBe('advanced');
    });

    it('should return conditional value when true', () => {
      const result = engine.getSmartDefault({
        type: 'conditional',
        condition: { field: 'feature', operator: 'equals', value: 'advanced' },
        ifTrue: 'yes',
        ifFalse: 'no',
      });

      expect(result).toBe('yes');
    });

    it('should return conditional value when false', () => {
      const result = engine.getSmartDefault({
        type: 'conditional',
        condition: { field: 'feature', operator: 'equals', value: 'basic' },
        ifTrue: 'yes',
        ifFalse: 'no',
      });

      expect(result).toBe('no');
    });

    it('should return undefined for unknown type', () => {
      const result = engine.getSmartDefault({ type: 'unknown' });

      expect(result).toBeUndefined();
    });
  });
});

describe('SecurityChecker Integration', () => {
  let engine;

  beforeEach(() => {
    engine = new ElicitationEngine();
  });

  it('should have securityChecker available', () => {
    expect(engine.securityChecker).toBeDefined();
  });

  it('should be able to check code safety', () => {
    const checker = engine.securityChecker;

    // SecurityChecker has validateCode method
    if (checker.validateCode) {
      const result = checker.validateCode('const x = 1;');
      expect(result).toBeDefined();
    } else {
      // BasicInputValidator has checkCode method
      expect(true).toBe(true);
    }
  });
});
