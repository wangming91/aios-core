/**
 * DocSearcher Tests
 */

const fs = require('fs');
const path = require('path');
const os = require('os');
const { DocSearcher } = require('../../../.aios-core/core/doc-discovery/doc-searcher');

describe('DocSearcher', () => {
  let tempDir;
  let searcher;

  beforeEach(() => {
    tempDir = fs.mkdtempSync(path.join(os.tmpdir(), 'doc-searcher-test-'));
    searcher = new DocSearcher(tempDir);
  });

  afterEach(() => {
    fs.rmSync(tempDir, { recursive: true, force: true });
  });

  describe('constructor', () => {
    it('should create instance with paths', () => {
      expect(searcher.projectRoot).toBe(tempDir);
      expect(searcher.docsDir).toBeDefined();
      expect(searcher.index).toBeInstanceOf(Map);
    });
  });

  describe('initialize()', () => {
    it('should initialize without existing index', async () => {
      await searcher.initialize();
      expect(searcher.initialized).toBe(true);
    });

    it('should build index on first initialize', async () => {
      // Create test doc
      const docsDir = path.join(tempDir, 'docs');
      fs.mkdirSync(docsDir, { recursive: true });
      fs.writeFileSync(path.join(docsDir, 'test.md'), '# Test Doc\n\nContent here.');

      await searcher.initialize();

      expect(searcher.index.size).toBeGreaterThan(0);
    });
  });

  describe('_generateId()', () => {
    it('should generate ID from path', () => {
      const id = searcher._generateId('docs/guides/test.md');
      expect(id).toBe('docs-guides-test');
    });

    it('should handle windows paths', () => {
      const id = searcher._generateId('docs\\guides\\test.md');
      expect(id).toBe('docs-guides-test');
    });
  });

  describe('_determineCategory()', () => {
    it('should categorize architecture docs', () => {
      const cat = searcher._determineCategory('docs/architecture/system.md');
      expect(cat).toBe('architecture');
    });

    it('should categorize guide docs', () => {
      const cat = searcher._determineCategory('docs/guides/getting-started.md');
      expect(cat).toBe('guides');
    });

    it('should return general for unknown', () => {
      const cat = searcher._determineCategory('random/file.md');
      expect(cat).toBe('general');
    });
  });

  describe('_extractKeywords()', () => {
    it('should extract keywords from content', () => {
      const content = 'This is a test document about configuration and setup.';
      const keywords = searcher._extractKeywords(content);

      expect(keywords.length).toBeGreaterThan(0);
      expect(keywords).toContain('configuration');
      expect(keywords).toContain('document');
    });

    it('should remove code blocks', () => {
      const content = 'Test ```javascript\nconst x = 1;\n``` document';
      const keywords = searcher._extractKeywords(content);

      expect(keywords).not.toContain('javascript');
      expect(keywords).not.toContain('const');
    });
  });

  describe('_cleanContent()', () => {
    it('should remove front matter', () => {
      const content = '---\ntitle: Test\n---\n# Content';
      const cleaned = searcher._cleanContent(content);

      expect(cleaned).not.toContain('---');
      expect(cleaned).toContain('Content');
    });

    it('should remove code blocks', () => {
      const content = 'Text ```code``` more text';
      const cleaned = searcher._cleanContent(content);

      expect(cleaned).not.toContain('```');
    });

    it('should limit length', () => {
      const longContent = 'a'.repeat(15000);
      const cleaned = searcher._cleanContent(longContent);

      expect(cleaned.length).toBeLessThan(11000);
      expect(cleaned).toContain('...');
    });
  });

  describe('_extractSnippet()', () => {
    it('should extract snippet around match', () => {
      const content = 'Start of document. The keyword is here. End of document.';
      const snippet = searcher._extractSnippet(content, ['keyword']);

      expect(snippet).toContain('keyword');
    });

    it('should return start if no match', () => {
      const content = 'Some content without matches';
      const snippet = searcher._extractSnippet(content, ['nonexistent']);

      expect(snippet.length).toBeLessThanOrEqual(203); // 200 + '...'
    });
  });

  describe('search()', () => {
    beforeEach(async () => {
      // Create test docs
      const docsDir = path.join(tempDir, 'docs', 'guides');
      fs.mkdirSync(docsDir, { recursive: true });

      fs.writeFileSync(path.join(docsDir, 'getting-started.md'),
        '# Getting Started\n\nLearn how to use the system.');
      fs.writeFileSync(path.join(docsDir, 'configuration.md'),
        '# Configuration Guide\n\nSetup your configuration file.');
      fs.writeFileSync(path.join(docsDir, 'agents.md'),
        '# Agent System\n\nManage AI agents.');

      await searcher.initialize();
    });

    it('should find matching documents', async () => {
      const results = await searcher.search('configuration');

      expect(results.length).toBeGreaterThan(0);
      expect(results[0].title).toContain('Configuration');
    });

    it('should return empty array for no matches', async () => {
      const results = await searcher.search('xyznonexistent123');

      expect(results).toEqual([]);
    });

    it('should sort by score', async () => {
      const results = await searcher.search('guide');

      expect(results.length).toBeGreaterThan(0);

      for (let i = 1; i < results.length; i++) {
        expect(results[i - 1].score).toBeGreaterThanOrEqual(results[i].score);
      }
    });

    it('should limit results', async () => {
      const results = await searcher.search('the', { limit: 2 });

      expect(results.length).toBeLessThanOrEqual(2);
    });
  });

  describe('listByCategory()', () => {
    beforeEach(async () => {
      const docsDir = path.join(tempDir, 'docs', 'guides');
      fs.mkdirSync(docsDir, { recursive: true });
      fs.writeFileSync(path.join(docsDir, 'test.md'), '# Test');

      await searcher.initialize();
    });

    it('should return documents in category', () => {
      const docs = searcher.listByCategory('guides');
      expect(docs.length).toBeGreaterThan(0);
    });

    it('should return empty for unknown category', () => {
      const docs = searcher.listByCategory('nonexistent');
      expect(docs).toEqual([]);
    });
  });

  describe('getStats()', () => {
    beforeEach(async () => {
      const docsDir = path.join(tempDir, 'docs', 'guides');
      fs.mkdirSync(docsDir, { recursive: true });
      fs.writeFileSync(path.join(docsDir, 'test.md'), '# Test');

      await searcher.initialize();
    });

    it('should return statistics', () => {
      const stats = searcher.getStats();

      expect(stats.totalDocuments).toBeGreaterThan(0);
      expect(stats.categories).toBeDefined();
    });
  });
});
