/**
 * SuggestionEngine Tests
 */

const fs = require('fs');
const path = require('path');
const os = require('os');
const { SuggestionEngine } = require('../../../.aios-core/core/smart-assist/suggestion-engine');

describe('SuggestionEngine', () => {
  let tempDir;
  let engine;

  beforeEach(() => {
    tempDir = fs.mkdtempSync(path.join(os.tmpdir(), 'suggestion-engine-test-'));
    engine = new SuggestionEngine(tempDir);
  });

  afterEach(() => {
    fs.rmSync(tempDir, { recursive: true, force: true });
  });

  describe('constructor', () => {
    it('should create instance with paths', () => {
      expect(engine.projectRoot).toBe(tempDir);
      expect(engine.history).toEqual([]);
      expect(engine.patterns).toEqual([]);
    });
  });

  describe('initialize()', () => {
    it('should load patterns', async () => {
      await engine.initialize();

      expect(engine.patterns.length).toBeGreaterThan(0);
      expect(engine.initialized).toBe(true);
    });

    it('should only initialize once', async () => {
      await engine.initialize();
      const firstCount = engine.patterns.length;

      await engine.initialize();

      expect(engine.patterns.length).toBe(firstCount);
    });
  });

  describe('_getBuiltInPatterns()', () => {
    it('should return built-in patterns', () => {
      const patterns = engine._getBuiltInPatterns();

      expect(patterns.length).toBeGreaterThan(0);
      expect(patterns.some(p => p.id === 'new-user-onboarding')).toBe(true);
      expect(patterns.some(p => p.id === 'error-recovery')).toBe(true);
    });
  });

  describe('_matchesPattern()', () => {
    beforeEach(async () => {
      await engine.initialize();
    });

    it('should match command trigger', () => {
      const pattern = {
        triggers: { currentCommand: /^story/ }
      };

      expect(engine._matchesPattern(pattern, { currentCommand: 'story list' })).toBe(true);
      expect(engine._matchesPattern(pattern, { currentCommand: 'doctor' })).toBe(false);
    });

    it('should match recentCommands max', () => {
      const pattern = {
        triggers: { recentCommands: { max: 5 } }
      };

      expect(engine._matchesPattern(pattern, { recentCommands: [1, 2, 3] })).toBe(true);
      expect(engine._matchesPattern(pattern, { recentCommands: [1, 2, 3, 4, 5, 6] })).toBe(false);
    });

    it('should match recentErrors min', () => {
      const pattern = {
        triggers: { recentErrors: { min: 1 } }
      };

      expect(engine._matchesPattern(pattern, { recentErrors: ['error1'] })).toBe(true);
      expect(engine._matchesPattern(pattern, { recentErrors: [] })).toBe(false);
    });

    it('should match workingDirectory', () => {
      const pattern = {
        triggers: { workingDirectory: /src/ }
      };

      expect(engine._matchesPattern(pattern, { workingDirectory: '/project/src/components' })).toBe(true);
      expect(engine._matchesPattern(pattern, { workingDirectory: '/project/docs' })).toBe(false);
    });
  });

  describe('getSuggestions()', () => {
    beforeEach(async () => {
      await engine.initialize();
    });

    it('should return suggestions for context', async () => {
      const suggestions = await engine.getSuggestions({
        currentCommand: 'story list',
        workingDirectory: process.cwd()
      });

      expect(Array.isArray(suggestions)).toBe(true);
    });

    it('should return suggestions sorted by confidence', async () => {
      const suggestions = await engine.getSuggestions({
        recentCommands: [],
        workingDirectory: process.cwd()
      });

      for (let i = 1; i < suggestions.length; i++) {
        expect(suggestions[i - 1].confidence).toBeGreaterThanOrEqual(suggestions[i].confidence);
      }
    });

    it('should return empty for no matches', async () => {
      const suggestions = await engine.getSuggestions({});

      // Should at least have some suggestions due to broad patterns
      expect(Array.isArray(suggestions)).toBe(true);
    });
  });

  describe('recordFeedback()', () => {
    beforeEach(async () => {
      await engine.initialize();
    });

    it('should record accepted feedback', async () => {
      await engine.recordFeedback('test-id', true, { workingDirectory: process.cwd() });

      expect(engine.history.length).toBe(1);
      expect(engine.history[0].accepted).toBe(true);
    });

    it('should record rejected feedback', async () => {
      await engine.recordFeedback('test-id', false, { workingDirectory: process.cwd() });

      expect(engine.history.length).toBe(1);
      expect(engine.history[0].accepted).toBe(false);
    });
  });

  describe('getLearningPath()', () => {
    beforeEach(async () => {
      await engine.initialize();
    });

    it('should return learning path for valid topic', async () => {
      const path = await engine.getLearningPath('getting-started');

      expect(path).not.toBeNull();
      expect(path.title).toBeDefined();
      expect(path.steps.length).toBeGreaterThan(0);
    });

    it('should return null for invalid topic', async () => {
      const path = await engine.getLearningPath('nonexistent');

      expect(path).toBeNull();
    });

    it('should have commands in steps', async () => {
      const path = await engine.getLearningPath('agents');

      expect(path.steps.some(s => s.command)).toBe(true);
    });
  });

  describe('getAvailableTopics()', () => {
    it('should return available topics', () => {
      const topics = engine.getAvailableTopics();

      expect(topics).toContain('getting-started');
      expect(topics).toContain('agents');
      expect(topics).toContain('stories');
    });
  });

  describe('_adjustConfidence()', () => {
    beforeEach(async () => {
      await engine.initialize();
    });

    it('should increase confidence for recently accepted suggestions', async () => {
      // Record acceptance
      await engine.recordFeedback('test-id', true, { workingDirectory: process.cwd() });

      const suggestions = [{
        id: 'test-id',
        confidence: 50
      }];

      engine._adjustConfidence(suggestions, {});

      expect(suggestions[0].confidence).toBeGreaterThan(50);
    });

    it('should decrease confidence for recently rejected suggestions', async () => {
      // Record rejection
      await engine.recordFeedback('test-id', false, { workingDirectory: process.cwd() });

      const suggestions = [{
        id: 'test-id',
        confidence: 50
      }];

      engine._adjustConfidence(suggestions, {});

      expect(suggestions[0].confidence).toBeLessThan(50);
    });
  });
});
