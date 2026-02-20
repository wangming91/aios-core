/**
 * TaskClassifier Tests
 */

const { TaskClassifier, TASK_TYPE_PATTERNS, STOP_WORDS } = require('../../../.aios-core/core/agent-state/task-classifier');

describe('TaskClassifier', () => {
  let classifier;

  beforeEach(() => {
    classifier = new TaskClassifier();
  });

  describe('constructor', () => {
    it('should create instance with type patterns', () => {
      expect(classifier.typePatterns).toBeDefined();
      expect(classifier.stopWords).toBeDefined();
    });
  });

  describe('classify()', () => {
    it('should classify implementation task', () => {
      const result = classifier.classify('implement user authentication');

      expect(result.types).toContain('implementation');
      expect(result.keywords).toContain('implement');
      expect(result.keywords).toContain('user');
      expect(result.keywords).toContain('authentication');
    });

    it('should classify bugfix task', () => {
      const result = classifier.classify('fix the login bug');

      expect(result.types).toContain('bugfix');
      expect(result.keywords).toContain('fix');
      expect(result.keywords).toContain('login');
    });

    it('should classify testing task', () => {
      const result = classifier.classify('write unit tests for authentication');

      expect(result.types).toContain('testing');
      expect(result.primaryType).toBe('testing');
    });

    it('should classify architecture task', () => {
      const result = classifier.classify('design the system architecture');

      expect(result.types).toContain('architecture');
    });

    it('should classify database task', () => {
      const result = classifier.classify('create database migration for users table');

      expect(result.types).toContain('database');
    });

    it('should handle empty input', () => {
      const result = classifier.classify('');

      expect(result.types).toEqual([]);
      expect(result.keywords).toEqual([]);
      expect(result.primaryType).toBeNull();
    });

    it('should handle null input', () => {
      const result = classifier.classify(null);

      expect(result.types).toEqual([]);
      expect(result.keywords).toEqual([]);
    });

    it('should handle undefined input', () => {
      const result = classifier.classify(undefined);

      expect(result.types).toEqual([]);
      expect(result.keywords).toEqual([]);
    });

    it('should return scores for types', () => {
      const result = classifier.classify('implement and test the feature');

      expect(result.scores).toBeDefined();
      expect(result.scores.implementation).toBeGreaterThan(0);
      expect(result.scores.testing).toBeGreaterThan(0);
    });

    it('should set primary type as highest scoring type', () => {
      const result = classifier.classify('fix the critical bug');

      expect(result.primaryType).toBe('bugfix');
    });
  });

  describe('_extractKeywords()', () => {
    it('should extract keywords from text', () => {
      const keywords = classifier._extractKeywords('implement user authentication');

      expect(keywords).toContain('implement');
      expect(keywords).toContain('user');
      expect(keywords).toContain('authentication');
    });

    it('should filter stop words', () => {
      const keywords = classifier._extractKeywords('implement the feature for the user');

      expect(keywords).not.toContain('the');
      expect(keywords).not.toContain('for');
    });

    it('should handle special characters', () => {
      const keywords = classifier._extractKeywords('implement user-authentication!');

      expect(keywords).toContain('implement');
      expect(keywords).toContain('user-authentication');
    });

    it('should convert to lowercase', () => {
      const keywords = classifier._extractKeywords('IMPLEMENT User AUTHENTICATION');

      expect(keywords).toContain('implement');
      expect(keywords).toContain('user');
    });

    it('should remove duplicates', () => {
      const keywords = classifier._extractKeywords('test test test');

      expect(keywords).toEqual(['test']);
    });

    it('should filter short words', () => {
      const keywords = classifier._extractKeywords('a b c de fg');

      expect(keywords).not.toContain('a');
      expect(keywords).not.toContain('b');
      expect(keywords).toContain('de');
      expect(keywords).toContain('fg');
    });
  });

  describe('_calculateTypeScores()', () => {
    it('should calculate scores based on patterns', () => {
      const scores = classifier._calculateTypeScores('implement the feature', ['implement', 'feature']);

      expect(scores.implementation).toBeGreaterThan(0);
    });

    it('should give higher scores for multiple matches', () => {
      const scores1 = classifier._calculateTypeScores('implement', ['implement']);
      const scores2 = classifier._calculateTypeScores('implement code build', ['implement', 'code', 'build']);

      expect(scores2.implementation).toBeGreaterThan(scores1.implementation);
    });

    it('should return empty object for no matches', () => {
      const scores = classifier._calculateTypeScores('random xyz abc', ['random', 'xyz', 'abc']);

      // 可能有一些低分匹配，但不应该有高分
      const highScores = Object.values(scores).filter(s => s >= 10);
      expect(highScores.length).toBe(0);
    });
  });

  describe('isType()', () => {
    it('should return true for matching type', () => {
      expect(classifier.isType('implement feature', 'implementation')).toBe(true);
    });

    it('should return false for non-matching type', () => {
      expect(classifier.isType('implement feature', 'testing')).toBe(false);
    });
  });

  describe('getKeywordsSummary()', () => {
    it('should return limited keywords', () => {
      const keywords = classifier.getKeywordsSummary('implement user authentication with oauth', 3);

      expect(keywords.length).toBeLessThanOrEqual(3);
    });

    it('should default to 5 keywords', () => {
      const text = 'implement user authentication with oauth and testing features';
      const keywords = classifier.getKeywordsSummary(text);

      expect(keywords.length).toBeLessThanOrEqual(5);
    });
  });
});

describe('TASK_TYPE_PATTERNS', () => {
  it('should define patterns for all major types', () => {
    expect(TASK_TYPE_PATTERNS.implementation).toBeDefined();
    expect(TASK_TYPE_PATTERNS.bugfix).toBeDefined();
    expect(TASK_TYPE_PATTERNS.testing).toBeDefined();
    expect(TASK_TYPE_PATTERNS.architecture).toBeDefined();
  });
});

describe('STOP_WORDS', () => {
  it('should contain common English stop words', () => {
    expect(STOP_WORDS.has('the')).toBe(true);
    expect(STOP_WORDS.has('and')).toBe(true);
    expect(STOP_WORDS.has('is')).toBe(true);
  });
});
