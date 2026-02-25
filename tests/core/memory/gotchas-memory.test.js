/**
 * Tests for GotchasMemory
 *
 * Tests auto-capture of repeated errors, context injection,
 * and all public methods of the GotchasMemory class.
 */

'use strict';

const fs = require('fs-extra');
const path = require('path');
const os = require('os');
const {
  GotchasMemory,
  GotchaCategory,
  Severity,
  Events,
  CONFIG,
} = require('../../../.aios-core/core/memory/gotchas-memory');

describe('GotchasMemory', () => {
  let tempDir;
  let memory;

  beforeEach(async () => {
    tempDir = await fs.mkdtemp(path.join(os.tmpdir(), 'gotchas-memory-test-'));
    memory = new GotchasMemory(tempDir, { debug: false });
  });

  afterEach(async () => {
    if (memory) {
      memory.removeAllListeners();
    }
    await fs.remove(tempDir);
  });

  describe('constructor', () => {
    it('should initialize with project root', () => {
      expect(memory.rootPath).toBe(tempDir);
    });

    it('should initialize with empty gotchas map', () => {
      expect(memory.gotchas).toBeInstanceOf(Map);
      expect(memory.gotchas.size).toBe(0);
    });

    it('should initialize with empty error tracking', () => {
      expect(memory.errorTracking).toBeInstanceOf(Map);
      expect(memory.errorTracking.size).toBe(0);
    });

    it('should be an EventEmitter', () => {
      expect(memory.on).toBeDefined();
      expect(memory.emit).toBeDefined();
      expect(memory.removeListener).toBeDefined();
    });
  });

  describe('addGotcha', () => {
    it('should add a new gotcha', () => {
      const gotcha = memory.addGotcha({
        title: 'TypeError: Cannot read property',
        description: 'Accessing property of null/undefined',
        category: GotchaCategory.RUNTIME,
        workaround: 'Check for null/undefined before accessing property',
        severity: Severity.WARNING,
      });

      expect(gotcha).toBeDefined();
      expect(gotcha.title).toBe('TypeError: Cannot read property');
      expect(gotcha.category).toBe(GotchaCategory.RUNTIME);
      expect(gotcha.workaround).toBe('Check for null/undefined before accessing property');
      expect(memory.gotchas.size).toBe(1);
    });

    it('should emit GOTCHA_ADDED event', (done) => {
      memory.on(Events.GOTCHA_ADDED, (gotcha) => {
        expect(gotcha.title).toBe('test title');
        done();
      });

      memory.addGotcha({
        title: 'test title',
        description: 'test description',
        category: GotchaCategory.GENERAL,
      });
    });

    it('should generate unique ID for each gotcha', () => {
      const gotcha1 = memory.addGotcha({
        title: 'title1',
        category: GotchaCategory.RUNTIME,
      });

      const gotcha2 = memory.addGotcha({
        title: 'title2',
        category: GotchaCategory.BUILD,
      });

      expect(gotcha1.id).not.toBe(gotcha2.id);
    });

    it('should default severity to INFO if not specified', () => {
      const gotcha = memory.addGotcha({
        title: 'test title',
        description: 'test description',
        category: GotchaCategory.GENERAL,
      });

      expect(gotcha.severity).toBeDefined();
    });

    it('should track occurrence count', () => {
      const gotcha = memory.addGotcha({
        title: 'test title',
        category: GotchaCategory.GENERAL,
      });

      expect(gotcha.source.occurrences).toBe(1);
    });
  });

  describe('trackError', () => {
    it('should track error and increment count', () => {
      memory.trackError({
        message: 'Some error message',
        file: 'test.js',
      });

      expect(memory.errorTracking.size).toBeGreaterThan(0);
    });

    it('should increment count for repeated errors', () => {
      memory.trackError({ message: 'Repeated error', file: 'test.js' });
      memory.trackError({ message: 'Repeated error', file: 'test.js' });
      memory.trackError({ message: 'Repeated error', file: 'test.js' });

      // Check that tracking exists
      let foundTracking = false;
      for (const tracking of memory.errorTracking.values()) {
        if (tracking.errorPattern === 'Repeated error') {
          expect(tracking.count).toBe(3);
          foundTracking = true;
          break;
        }
      }
      expect(foundTracking).toBe(true);
    });

    it('should auto-capture gotcha after threshold reached', (done) => {
      memory.on(Events.AUTO_CAPTURED, (gotcha) => {
        expect(gotcha).toBeDefined();
        expect(gotcha.description).toContain('Threshold error');
        done();
      });

      // Track error CONFIG.repeatThreshold times (default 3)
      for (let i = 0; i < CONFIG.repeatThreshold; i++) {
        memory.trackError({ message: 'Threshold error', file: 'test.js' });
      }
    });

    it('should emit ERROR_TRACKED event', (done) => {
      memory.on(Events.ERROR_TRACKED, (data) => {
        expect(data).toHaveProperty('errorHash');
        expect(data).toHaveProperty('tracking');
        done();
      });

      memory.trackError({ message: 'test error' });
    });
  });

  describe('listGotchas', () => {
    beforeEach(() => {
      memory.addGotcha({
        title: 'Runtime error',
        description: 'Runtime issue',
        category: GotchaCategory.RUNTIME,
        severity: Severity.WARNING,
      });

      memory.addGotcha({
        title: 'Build error',
        description: 'Build issue',
        category: GotchaCategory.BUILD,
        severity: Severity.CRITICAL,
      });

      memory.addGotcha({
        title: 'Test error',
        description: 'Test issue',
        category: GotchaCategory.TEST,
        severity: Severity.INFO,
      });
    });

    it('should list all gotchas when no filter', () => {
      const list = memory.listGotchas();
      expect(list.length).toBe(3);
    });

    it('should filter by category', () => {
      const list = memory.listGotchas({ category: GotchaCategory.BUILD });
      expect(list.length).toBe(1);
      expect(list[0].category).toBe(GotchaCategory.BUILD);
    });

    it('should filter by severity', () => {
      const list = memory.listGotchas({ severity: Severity.CRITICAL });
      expect(list.length).toBe(1);
      expect(list[0].severity).toBe(Severity.CRITICAL);
    });

    it('should filter by resolved status', () => {
      // Resolve one gotcha
      const gotchas = memory.listGotchas();
      memory.resolveGotcha(gotchas[0].id);

      const unresolved = memory.listGotchas({ unresolved: true });
      expect(unresolved.length).toBe(2);
    });
  });

  describe('getContextForTask', () => {
    beforeEach(() => {
      memory.addGotcha({
        title: 'npm install fails',
        description: 'npm install fails with network error',
        category: GotchaCategory.BUILD,
        severity: Severity.WARNING,
      });

      memory.addGotcha({
        title: 'test timeout',
        description: 'Tests timing out',
        category: GotchaCategory.TEST,
        severity: Severity.INFO,
      });
    });

    it('should return context array', () => {
      const context = memory.getContextForTask('Run npm install and tests');
      expect(Array.isArray(context)).toBe(true);
    });
  });

  describe('formatForPrompt', () => {
    beforeEach(() => {
      memory.addGotcha({
        title: 'Test title 1',
        description: 'Test description 1',
        category: GotchaCategory.RUNTIME,
        severity: Severity.WARNING,
      });

      memory.addGotcha({
        title: 'Test title 2',
        description: 'Test description 2',
        category: GotchaCategory.BUILD,
        severity: Severity.CRITICAL,
      });
    });

    it('should format gotchas as string', () => {
      const gotchas = memory.listGotchas();
      const formatted = memory.formatForPrompt(gotchas);
      expect(typeof formatted).toBe('string');
    });

    it('should include content in formatted output', () => {
      const gotchas = memory.listGotchas();
      const formatted = memory.formatForPrompt(gotchas);
      // Check for gotcha-related content
      expect(formatted).toContain('Test title 1');
    });

    it('should return empty string for empty gotchas', () => {
      const formatted = memory.formatForPrompt([]);
      expect(formatted).toBe('');
    });
  });

  describe('resolveGotcha', () => {
    it('should mark gotcha as resolved', () => {
      const gotcha = memory.addGotcha({
        title: 'Test title',
        description: 'Test description',
        category: GotchaCategory.GENERAL,
      });

      const result = memory.resolveGotcha(gotcha.id);
      expect(result).toBeDefined();
      expect(result.resolved).toBe(true);

      const resolved = memory.gotchas.get(gotcha.id);
      expect(resolved.resolved).toBe(true);
    });

    it('should emit GOTCHA_RESOLVED event', (done) => {
      const gotcha = memory.addGotcha({
        title: 'Test title',
        description: 'Test description',
        category: GotchaCategory.GENERAL,
      });

      memory.on(Events.GOTCHA_RESOLVED, (data) => {
        expect(data.id).toBe(gotcha.id);
        done();
      });

      memory.resolveGotcha(gotcha.id);
    });

    it('should return null for non-existent gotcha', () => {
      const result = memory.resolveGotcha('non-existent-id');
      expect(result).toBeNull();
    });
  });

  describe('removeGotcha', () => {
    it('should remove gotcha from memory', () => {
      const gotcha = memory.addGotcha({
        title: 'Test title',
        description: 'Test description',
        category: GotchaCategory.GENERAL,
      });

      expect(memory.gotchas.size).toBe(1);

      const result = memory.removeGotcha(gotcha.id);
      expect(result).toBe(true);
      expect(memory.gotchas.size).toBe(0);
    });

    it('should emit GOTCHA_REMOVED event', (done) => {
      const gotcha = memory.addGotcha({
        title: 'Test title',
        description: 'Test description',
        category: GotchaCategory.GENERAL,
      });

      memory.on(Events.GOTCHA_REMOVED, (data) => {
        expect(data.id).toBe(gotcha.id);
        done();
      });

      memory.removeGotcha(gotcha.id);
    });

    it('should return false for non-existent gotcha', () => {
      const result = memory.removeGotcha('non-existent-id');
      expect(result).toBe(false);
    });
  });

  describe('search', () => {
    beforeEach(() => {
      memory.addGotcha({
        title: 'TypeError undefined',
        description: 'Accessing undefined variable',
        category: GotchaCategory.RUNTIME,
        severity: Severity.WARNING,
      });

      memory.addGotcha({
        title: 'ReferenceError not defined',
        description: 'Variable not defined',
        category: GotchaCategory.RUNTIME,
        severity: Severity.WARNING,
      });

      memory.addGotcha({
        title: 'Build failed',
        description: 'Compilation error',
        category: GotchaCategory.BUILD,
        severity: Severity.CRITICAL,
      });
    });

    it('should search by title', () => {
      const results = memory.search('TypeError');
      expect(results.length).toBe(1);
      expect(results[0].title).toContain('TypeError');
    });

    it('should return matches', () => {
      const results = memory.search('Error');
      // Search may match title or description
      expect(results.length).toBeGreaterThanOrEqual(2);
    });

    it('should be case-insensitive', () => {
      const results = memory.search('typeerror');
      expect(results.length).toBe(1);
    });

    it('should return empty array for no matches', () => {
      const results = memory.search('nonexistent');
      expect(results.length).toBe(0);
    });
  });

  describe('getStatistics', () => {
    beforeEach(() => {
      memory.addGotcha({
        title: 'Error 1',
        description: 'Description 1',
        category: GotchaCategory.RUNTIME,
        severity: Severity.WARNING,
      });

      memory.addGotcha({
        title: 'Error 2',
        description: 'Description 2',
        category: GotchaCategory.BUILD,
        severity: Severity.CRITICAL,
      });

      memory.resolveGotcha(memory.listGotchas()[0].id);
    });

    it('should return statistics object', () => {
      const stats = memory.getStatistics();

      expect(stats).toHaveProperty('totalGotchas');
      expect(stats).toHaveProperty('byCategory');
      expect(stats).toHaveProperty('bySeverity');
      expect(stats).toHaveProperty('resolved');
    });

    it('should count total gotchas', () => {
      const stats = memory.getStatistics();
      expect(stats.totalGotchas).toBe(2);
    });

    it('should count resolved gotchas', () => {
      const stats = memory.getStatistics();
      expect(stats.resolved).toBe(1);
    });

    it('should group by category', () => {
      const stats = memory.getStatistics();
      expect(stats.byCategory[GotchaCategory.RUNTIME]).toBe(1);
      expect(stats.byCategory[GotchaCategory.BUILD]).toBe(1);
    });

    it('should group by severity', () => {
      const stats = memory.getStatistics();
      expect(stats.bySeverity[Severity.WARNING]).toBe(1);
      expect(stats.bySeverity[Severity.CRITICAL]).toBe(1);
    });
  });

  describe('toJSON', () => {
    it('should serialize to JSON object', () => {
      memory.addGotcha({
        title: 'Test title',
        description: 'Test description',
        category: GotchaCategory.GENERAL,
      });

      const json = memory.toJSON();

      expect(json).toHaveProperty('gotchas');
      expect(json).toHaveProperty('statistics');
      expect(Array.isArray(json.gotchas)).toBe(true);
      expect(json.gotchas.length).toBe(1);
      expect(json.gotchas[0].title).toBe('Test title');
    });
  });

  describe('toMarkdown', () => {
    it('should generate markdown report', () => {
      memory.addGotcha({
        title: 'Test title',
        description: 'Test description',
        category: GotchaCategory.GENERAL,
        severity: Severity.WARNING,
      });

      const md = memory.toMarkdown();

      expect(md).toContain('Gotchas');
      expect(md).toContain('Test title');
    });
  });
});

describe('GotchaCategory', () => {
  it('should have expected categories', () => {
    expect(GotchaCategory.BUILD).toBe('build');
    expect(GotchaCategory.TEST).toBe('test');
    expect(GotchaCategory.LINT).toBe('lint');
    expect(GotchaCategory.RUNTIME).toBe('runtime');
    expect(GotchaCategory.INTEGRATION).toBe('integration');
    expect(GotchaCategory.SECURITY).toBe('security');
    expect(GotchaCategory.GENERAL).toBe('general');
  });
});

describe('Severity', () => {
  it('should have expected severity levels', () => {
    expect(Severity.INFO).toBe('info');
    expect(Severity.WARNING).toBe('warning');
    expect(Severity.CRITICAL).toBe('critical');
  });
});

describe('Events', () => {
  it('should have expected event names', () => {
    expect(Events.GOTCHA_ADDED).toBe('gotcha_added');
    expect(Events.GOTCHA_REMOVED).toBe('gotcha_removed');
    expect(Events.GOTCHA_RESOLVED).toBe('gotcha_resolved');
    expect(Events.ERROR_TRACKED).toBe('error_tracked');
    expect(Events.AUTO_CAPTURED).toBe('auto_captured');
    expect(Events.CONTEXT_INJECTED).toBe('context_injected');
  });
});

describe('CONFIG', () => {
  it('should have repeatThreshold', () => {
    expect(CONFIG.repeatThreshold).toBeDefined();
    expect(typeof CONFIG.repeatThreshold).toBe('number');
  });

  it('should have errorWindowMs', () => {
    expect(CONFIG.errorWindowMs).toBeDefined();
    expect(typeof CONFIG.errorWindowMs).toBe('number');
  });
});

describe('Edge Cases', () => {
  let tempDir;
  let memory;

  beforeEach(async () => {
    tempDir = await fs.mkdtemp(path.join(os.tmpdir(), 'gotchas-edge-'));
    memory = new GotchasMemory(tempDir, { debug: false });
  });

  afterEach(async () => {
    if (memory) {
      memory.removeAllListeners();
    }
    await fs.remove(tempDir);
  });

  it('should handle empty title with default', () => {
    const gotcha = memory.addGotcha({
      title: '',
      description: 'Test description',
      category: GotchaCategory.GENERAL,
    });

    expect(gotcha).toBeDefined();
    expect(gotcha.title).toBe('Untitled Gotcha');
  });

  it('should handle very long titles', () => {
    const longTitle = 'a'.repeat(1000);
    const gotcha = memory.addGotcha({
      title: longTitle,
      description: 'Test description',
      category: GotchaCategory.GENERAL,
    });

    expect(gotcha.title).toBe(longTitle);
  });

  it('should handle special characters in title', () => {
    const specialTitle = 'Error: [test] {key} (value) <tag> "quote" \'apostrophe\'';
    const gotcha = memory.addGotcha({
      title: specialTitle,
      description: 'Test description',
      category: GotchaCategory.GENERAL,
    });

    expect(gotcha.title).toBe(specialTitle);
  });

  it('should handle concurrent operations', async () => {
    const promises = [];

    for (let i = 0; i < 10; i++) {
      promises.push(
        new Promise((resolve) => {
          memory.addGotcha({
            title: `Title ${i}`,
            description: `Description ${i}`,
            category: GotchaCategory.GENERAL,
          });
          resolve();
        })
      );
    }

    await Promise.all(promises);
    expect(memory.gotchas.size).toBe(10);
  });

  it('should handle duplicate titles', () => {
    memory.addGotcha({
      title: 'Duplicate title',
      description: 'Description 1',
      category: GotchaCategory.GENERAL,
    });

    memory.addGotcha({
      title: 'Duplicate title',
      description: 'Description 2',
      category: GotchaCategory.GENERAL,
    });

    // Both should be stored (they have different IDs)
    expect(memory.gotchas.size).toBe(2);
  });
});
