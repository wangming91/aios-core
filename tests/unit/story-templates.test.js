/**
 * Story Templates Library - Tests
 *
 * @module tests/unit/story-templates.test.js
 * @story STL-1: Story Templates Library
 */

const fs = require('fs').promises;
const path = require('path');
const yaml = require('js-yaml');

const TEMPLATES_DIR = path.join(__dirname, '../../.aios-core/data/story-templates');

describe('Story Templates Library', () => {
  let indexData;
  let templateFiles;

  beforeAll(async () => {
    // Load index
    const indexPath = path.join(TEMPLATES_DIR, 'INDEX.yaml');
    const indexContent = await fs.readFile(indexPath, 'utf-8');
    indexData = yaml.load(indexContent);

    // Get all template files
    const files = await fs.readdir(TEMPLATES_DIR);
    templateFiles = files.filter(f => f.endsWith('.yaml') && f !== 'INDEX.yaml');
  });

  // ============================================================
  // 1. Index Validation Tests
  // ============================================================
  describe('Index File', () => {
    test('should have valid version', () => {
      expect(indexData.version).toBeDefined();
      expect(indexData.version).toMatch(/^\d+\.\d+\.\d+$/);
    });

    test('should have templates section', () => {
      expect(indexData.templates).toBeDefined();
      expect(typeof indexData.templates).toBe('object');
    });

    test('should have usage instructions', () => {
      expect(indexData.usage).toBeDefined();
      expect(indexData.usage.length).toBeGreaterThan(0);
    });

    test('should have selection guide', () => {
      expect(indexData.selection_guide).toBeDefined();
      expect(Array.isArray(indexData.selection_guide)).toBe(true);
    });
  });

  // ============================================================
  // 2. Template File Tests
  // ============================================================
  describe('Template Files', () => {
    test('should have at least 6 templates', () => {
      expect(templateFiles.length).toBeGreaterThanOrEqual(6);
    });

    test('each template file should exist and be valid YAML', async () => {
      for (const file of templateFiles) {
        const filePath = path.join(TEMPLATES_DIR, file);
        const content = await fs.readFile(filePath, 'utf-8');
        const data = yaml.load(content);
        expect(data).toBeDefined();
        expect(data.template).toBeDefined();
      }
    });

    test('each template should have required fields', async () => {
      const requiredFields = ['template', 'executor_assignment', 'story_pattern', 'acceptance_criteria_template', 'tasks_template'];

      for (const file of templateFiles) {
        const filePath = path.join(TEMPLATES_DIR, file);
        const content = await fs.readFile(filePath, 'utf-8');
        const data = yaml.load(content);

        requiredFields.forEach(field => {
          if (!data[field]) {
            throw new Error(`Missing field: ${field} in ${file}`);
          }
          expect(data[field]).toBeDefined();
        });
      }
    });

    test('each template should have valid id', async () => {
      for (const file of templateFiles) {
        const filePath = path.join(TEMPLATES_DIR, file);
        const content = await fs.readFile(filePath, 'utf-8');
        const data = yaml.load(content);

        expect(data.template.id).toBeDefined();
        expect(typeof data.template.id).toBe('string');
        expect(data.template.id.length).toBeGreaterThan(0);
      }
    });

    test('each template should have executor assignment', async () => {
      for (const file of templateFiles) {
        const filePath = path.join(TEMPLATES_DIR, file);
        const content = await fs.readFile(filePath, 'utf-8');
        const data = yaml.load(content);

        expect(data.executor_assignment.executor).toBeDefined();
        expect(data.executor_assignment.quality_gate).toBeDefined();
        expect(data.executor_assignment.executor).not.toBe(data.executor_assignment.quality_gate);
      }
    });
  });

  // ============================================================
  // 3. Index-Template Consistency Tests
  // ============================================================
  describe('Index-Template Consistency', () => {
    test('all index templates should have corresponding files', async () => {
      for (const [key, template] of Object.entries(indexData.templates)) {
        const expectedFile = template.file;
        const filePath = path.join(TEMPLATES_DIR, expectedFile);

        try {
          await fs.access(filePath);
        } catch {
          throw new Error(`Template file not found: ${expectedFile} (referenced in index as ${key})`);
        }
      }
    });

    test('template IDs in files should match index', async () => {
      for (const [key, indexTemplate] of Object.entries(indexData.templates)) {
        const filePath = path.join(TEMPLATES_DIR, indexTemplate.file);
        const content = await fs.readFile(filePath, 'utf-8');
        const data = yaml.load(content);

        expect(data.template.id).toBe(indexTemplate.id);
      }
    });
  });

  // ============================================================
  // 4. Template Content Tests
  // ============================================================
  describe('Template Content', () => {
    test('feature template should have appropriate fields', async () => {
      const filePath = path.join(TEMPLATES_DIR, 'feature.yaml');
      const content = await fs.readFile(filePath, 'utf-8');
      const data = yaml.load(content);

      expect(data.template.category).toBe('development');
      expect(data.template.tags).toContain('feature');
      expect(data.placeholders).toBeDefined();
    });

    test('bugfix template should have investigation template', async () => {
      const filePath = path.join(TEMPLATES_DIR, 'bugfix.yaml');
      const content = await fs.readFile(filePath, 'utf-8');
      const data = yaml.load(content);

      expect(data.template.category).toBe('maintenance');
      expect(data.dev_notes_template.investigation_template).toBeDefined();
    });

    test('security template should have OWASP reference', async () => {
      const filePath = path.join(TEMPLATES_DIR, 'security-fix.yaml');
      const content = await fs.readFile(filePath, 'utf-8');
      const data = yaml.load(content);

      expect(data.template.priority).toBe('critical');
      expect(data.dev_notes_template.security_standards).toContain('OWASP');
    });

    test('database template should have RLS reference', async () => {
      const filePath = path.join(TEMPLATES_DIR, 'database-migration.yaml');
      const content = await fs.readFile(filePath, 'utf-8');
      const data = yaml.load(content);

      expect(data.template.category).toBe('database');
      expect(data.dev_notes_template.rls_template).toBeDefined();
    });
  });

  // ============================================================
  // 5. Selection Guide Tests
  // ============================================================
  describe('Selection Guide', () => {
    test('selection guide should cover all templates', () => {
      const guideTemplates = indexData.selection_guide.map(g => g.template);
      const indexTemplates = Object.keys(indexData.templates);

      indexTemplates.forEach(templateKey => {
        expect(guideTemplates).toContain(templateKey);
      });
    });

    test('selection guide should have questions and templates', () => {
      indexData.selection_guide.forEach(guide => {
        expect(guide.question).toBeDefined();
        expect(guide.template).toBeDefined();
      });
    });
  });
});
