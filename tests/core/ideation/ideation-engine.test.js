/**
 * Tests for IdeationEngine
 *
 * Tests the main ideation engine and its analyzers.
 */

'use strict';

const fs = require('fs-extra');
const path = require('path');
const os = require('os');
const {
  IdeationEngine,
  PerformanceAnalyzer,
  SecurityAnalyzer,
  CodeQualityAnalyzer,
  UXAnalyzer,
  ArchitectureAnalyzer,
} = require('../../../.aios-core/core/ideation/ideation-engine');

// Helper to create test engine without GotchasMemory dependency issues
function createTestEngine(tempDir, config = {}) {
  const engineConfig = {
    rootPath: tempDir,
    gotchasMemory: {}, // Use empty object to avoid constructor call
    ...config,
  };
  return new IdeationEngine(engineConfig);
}

describe('IdeationEngine', () => {
  let tempDir;
  let engine;

  beforeEach(async () => {
    tempDir = await fs.mkdtemp(path.join(os.tmpdir(), 'ideation-test-'));
    engine = createTestEngine(tempDir);
  });

  afterEach(async () => {
    await fs.remove(tempDir);
  });

  describe('constructor', () => {
    it('should initialize with default areas', () => {
      expect(engine.areas).toContain('performance');
      expect(engine.areas).toContain('security');
      expect(engine.areas).toContain('codeQuality');
      expect(engine.areas).toContain('ux');
      expect(engine.areas).toContain('architecture');
    });

    it('should initialize with custom rootPath', () => {
      expect(engine.rootPath).toBe(tempDir);
    });

    it('should initialize with custom areas', () => {
      const customEngine = createTestEngine(tempDir, {
        areas: ['performance', 'security'],
      });
      expect(customEngine.areas).toEqual(['performance', 'security']);
    });

    it('should initialize analyzers', () => {
      expect(engine.analyzers.performance).toBeInstanceOf(PerformanceAnalyzer);
      expect(engine.analyzers.security).toBeInstanceOf(SecurityAnalyzer);
      expect(engine.analyzers.codeQuality).toBeInstanceOf(CodeQualityAnalyzer);
      expect(engine.analyzers.ux).toBeInstanceOf(UXAnalyzer);
      expect(engine.analyzers.architecture).toBeInstanceOf(ArchitectureAnalyzer);
    });
  });

  describe('calculatePriority', () => {
    it('should calculate priority based on impact', () => {
      const finding = { impact: 0.8, effort: 'medium' };
      const priority = engine.calculatePriority(finding);
      expect(priority).toBe(0.8);
    });

    it('should boost priority for quick wins', () => {
      const finding = { impact: 0.7, effort: 'low' };
      const priority = engine.calculatePriority(finding);
      expect(priority).toBe(0.7 * 1.5); // Quick win boost
      expect(finding.category).toBe('quick-win');
    });

    it('should reduce priority for high effort', () => {
      const finding = { impact: 0.8, effort: 'high' };
      const priority = engine.calculatePriority(finding);
      expect(priority).toBe(0.8 * 0.6);
    });

    it('should default effort multiplier to 1.0', () => {
      const finding = { impact: 0.5 };
      const priority = engine.calculatePriority(finding);
      expect(priority).toBe(0.5);
    });
  });

  describe('countByArea', () => {
    it('should count suggestions by area', () => {
      const suggestions = [
        { area: 'performance' },
        { area: 'performance' },
        { area: 'security' },
      ];

      const counts = engine.countByArea(suggestions);

      expect(counts.performance).toBe(2);
      expect(counts.security).toBe(1);
    });

    it('should return empty object for empty array', () => {
      const counts = engine.countByArea([]);
      expect(Object.keys(counts).length).toBe(0);
    });
  });

  describe('isKnownGotcha', () => {
    it('should return false when no known issues', () => {
      const result = engine.isKnownGotcha({ title: 'test' }, null);
      expect(result).toBe(false);
    });

    it('should return false for non-matching suggestion', () => {
      const knownIssues = [{ pattern: 'completely different thing' }];
      const result = engine.isKnownGotcha(
        { title: 'Test Title', description: 'Test Description' },
        knownIssues
      );
      expect(result).toBe(false);
    });
  });

  describe('formatMarkdown', () => {
    it('should format results as markdown', () => {
      const result = {
        generatedAt: '2026-01-01T00:00:00.000Z',
        projectId: 'test-project',
        duration: 100,
        summary: {
          totalSuggestions: 5,
          quickWins: 2,
          highImpact: 3,
        },
        quickWins: [],
        highImpact: [],
        allSuggestions: [],
      };

      const md = engine.formatMarkdown(result);

      expect(md).toContain('# Ideation Report');
      expect(md).toContain('test-project');
      expect(md).toContain('5');
    });

    it('should include quick wins section', () => {
      const result = {
        generatedAt: '2026-01-01T00:00:00.000Z',
        projectId: 'test-project',
        duration: 100,
        summary: {
          totalSuggestions: 1,
          quickWins: 1,
          highImpact: 0,
        },
        quickWins: [
          {
            title: 'Quick Win Test',
            impact: 0.8,
            effort: 'low',
            area: 'performance',
            description: 'Test description',
          },
        ],
        highImpact: [],
        allSuggestions: [],
      };

      const md = engine.formatMarkdown(result);

      expect(md).toContain('## 🎯 Quick Wins');
      expect(md).toContain('Quick Win Test');
    });
  });

  describe('formatSuggestion', () => {
    it('should format a single suggestion', () => {
      const suggestion = {
        title: 'Test Suggestion',
        impact: 0.8,
        effort: 'low',
        area: 'performance',
        description: 'Test description',
      };

      const md = engine.formatSuggestion(suggestion);

      expect(md).toContain('### Test Suggestion');
      expect(md).toContain('80%');
      expect(md).toContain('low');
      expect(md).toContain('performance');
    });

    it('should include location if provided', () => {
      const suggestion = {
        title: 'Test',
        impact: 0.5,
        effort: 'medium',
        area: 'codeQuality',
        description: 'Test',
        location: { file: 'test.js', lines: '10-20' },
      };

      const md = engine.formatSuggestion(suggestion);

      expect(md).toContain('test.js');
      expect(md).toContain('10-20');
    });

    it('should include suggested fix if provided', () => {
      const suggestion = {
        title: 'Test',
        impact: 0.5,
        effort: 'medium',
        area: 'security',
        description: 'Test',
        suggestedFix: 'Apply this fix',
      };

      const md = engine.formatSuggestion(suggestion);

      expect(md).toContain('Apply this fix');
    });
  });

  describe('ideate', () => {
    it('should return analysis results', async () => {
      const result = await engine.ideate({ save: false });

      expect(result).toHaveProperty('generatedAt');
      expect(result).toHaveProperty('projectId');
      expect(result).toHaveProperty('duration');
      expect(result).toHaveProperty('summary');
      expect(result).toHaveProperty('allSuggestions');
    });

    it('should include summary with counts', async () => {
      const result = await engine.ideate({ save: false });

      expect(result.summary).toHaveProperty('totalSuggestions');
      expect(result.summary).toHaveProperty('quickWins');
      expect(result.summary).toHaveProperty('highImpact');
      expect(result.summary).toHaveProperty('byArea');
    });

    it('should focus on specific areas', async () => {
      const result = await engine.ideate({
        focus: 'performance',
        save: false,
      });

      // All suggestions should be from performance area
      for (const s of result.allSuggestions) {
        expect(s.area).toBe('performance');
      }
    });

    it('should focus on multiple areas', async () => {
      const result = await engine.ideate({
        focus: ['performance', 'security'],
        save: false,
      });

      // All suggestions should be from specified areas
      for (const s of result.allSuggestions) {
        expect(['performance', 'security']).toContain(s.area);
      }
    });
  });

  describe('save', () => {
    it('should create output directory', async () => {
      const result = {
        generatedAt: '2026-01-01T00:00:00.000Z',
        projectId: 'test',
        duration: 100,
        summary: { totalSuggestions: 0, quickWins: 0, highImpact: 0 },
        quickWins: [],
        highImpact: [],
        allSuggestions: [],
      };

      await engine.save(result);

      const dirExists = await fs.pathExists(engine.outputDir);
      expect(dirExists).toBe(true);
    });

    it('should save JSON file', async () => {
      const result = {
        generatedAt: '2026-01-01T00:00:00.000Z',
        projectId: 'test',
        duration: 100,
        summary: { totalSuggestions: 0, quickWins: 0, highImpact: 0 },
        quickWins: [],
        highImpact: [],
        allSuggestions: [],
      };

      await engine.save(result);

      const jsonPath = path.join(engine.outputDir, 'suggestions.json');
      const jsonExists = await fs.pathExists(jsonPath);
      expect(jsonExists).toBe(true);

      const saved = await fs.readJson(jsonPath);
      expect(saved.projectId).toBe('test');
    });

    it('should save markdown file', async () => {
      const result = {
        generatedAt: '2026-01-01T00:00:00.000Z',
        projectId: 'test',
        duration: 100,
        summary: { totalSuggestions: 0, quickWins: 0, highImpact: 0 },
        quickWins: [],
        highImpact: [],
        allSuggestions: [],
      };

      await engine.save(result);

      const mdPath = path.join(engine.outputDir, 'suggestions.md');
      const mdExists = await fs.pathExists(mdPath);
      expect(mdExists).toBe(true);

      const saved = await fs.readFile(mdPath, 'utf8');
      expect(saved).toContain('# Ideation Report');
    });
  });
});

describe('PerformanceAnalyzer', () => {
  let analyzer;
  let tempDir;

  beforeEach(async () => {
    tempDir = await fs.mkdtemp(path.join(os.tmpdir(), 'perf-analyzer-'));
    analyzer = new PerformanceAnalyzer(tempDir);
  });

  afterEach(async () => {
    await fs.remove(tempDir);
  });

  describe('constructor', () => {
    it('should initialize with rootPath', () => {
      expect(analyzer.rootPath).toBe(tempDir);
    });
  });

  describe('analyze', () => {
    it('should return an array', async () => {
      const findings = await analyzer.analyze();
      expect(Array.isArray(findings)).toBe(true);
    });
  });
});

describe('SecurityAnalyzer', () => {
  let analyzer;
  let tempDir;

  beforeEach(async () => {
    tempDir = await fs.mkdtemp(path.join(os.tmpdir(), 'security-analyzer-'));
    analyzer = new SecurityAnalyzer(tempDir);
  });

  afterEach(async () => {
    await fs.remove(tempDir);
  });

  describe('constructor', () => {
    it('should initialize with rootPath', () => {
      expect(analyzer.rootPath).toBe(tempDir);
    });
  });

  describe('analyze', () => {
    it('should return an array', async () => {
      const findings = await analyzer.analyze();
      expect(Array.isArray(findings)).toBe(true);
    });
  });
});

describe('CodeQualityAnalyzer', () => {
  let analyzer;
  let tempDir;

  beforeEach(async () => {
    tempDir = await fs.mkdtemp(path.join(os.tmpdir(), 'code-quality-analyzer-'));
    analyzer = new CodeQualityAnalyzer(tempDir);
  });

  afterEach(async () => {
    await fs.remove(tempDir);
  });

  describe('constructor', () => {
    it('should initialize with rootPath', () => {
      expect(analyzer.rootPath).toBe(tempDir);
    });
  });

  describe('analyze', () => {
    it('should return an array', async () => {
      const findings = await analyzer.analyze();
      expect(Array.isArray(findings)).toBe(true);
    });
  });
});

describe('UXAnalyzer', () => {
  let analyzer;
  let tempDir;

  beforeEach(async () => {
    tempDir = await fs.mkdtemp(path.join(os.tmpdir(), 'ux-analyzer-'));
    analyzer = new UXAnalyzer(tempDir);
  });

  afterEach(async () => {
    await fs.remove(tempDir);
  });

  describe('constructor', () => {
    it('should initialize with rootPath', () => {
      expect(analyzer.rootPath).toBe(tempDir);
    });
  });

  describe('analyze', () => {
    it('should return an array', async () => {
      const findings = await analyzer.analyze();
      expect(Array.isArray(findings)).toBe(true);
    });
  });
});

describe('ArchitectureAnalyzer', () => {
  let analyzer;
  let tempDir;

  beforeEach(async () => {
    tempDir = await fs.mkdtemp(path.join(os.tmpdir(), 'arch-analyzer-'));
    analyzer = new ArchitectureAnalyzer(tempDir);
  });

  afterEach(async () => {
    await fs.remove(tempDir);
  });

  describe('constructor', () => {
    it('should initialize with rootPath', () => {
      expect(analyzer.rootPath).toBe(tempDir);
    });
  });

  describe('analyze', () => {
    it('should return an array', async () => {
      const findings = await analyzer.analyze();
      expect(Array.isArray(findings)).toBe(true);
    });
  });
});
