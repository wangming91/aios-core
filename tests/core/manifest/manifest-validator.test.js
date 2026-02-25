/**
 * Tests for Manifest Validator
 *
 * Tests CSV parsing and manifest validation logic.
 */

'use strict';

const fs = require('fs-extra');
const path = require('path');
const os = require('os');
const {
  ManifestValidator,
  createManifestValidator,
  parseCSV,
  parseCSVLine,
  parseCSVContent,
} = require('../../../.aios-core/core/manifest/manifest-validator');

describe('parseCSVLine', () => {
  it('should parse simple CSV line', () => {
    const result = parseCSVLine('a,b,c');
    expect(result).toEqual(['a', 'b', 'c']);
  });

  it('should handle empty values', () => {
    const result = parseCSVLine('a,,c');
    expect(result).toEqual(['a', '', 'c']);
  });

  it('should handle quoted values', () => {
    const result = parseCSVLine('"a,b",c,d');
    expect(result).toEqual(['a,b', 'c', 'd']);
  });

  it('should handle escaped quotes', () => {
    const result = parseCSVLine('"a""b",c,d');
    expect(result).toEqual(['a"b', 'c', 'd']);
  });

  it('should handle trailing comma', () => {
    const result = parseCSVLine('a,b,');
    expect(result).toEqual(['a', 'b', '']);
  });

  it('should handle single value', () => {
    const result = parseCSVLine('single');
    expect(result).toEqual(['single']);
  });

  it('should handle empty string', () => {
    const result = parseCSVLine('');
    expect(result).toEqual(['']);
  });
});

describe('parseCSVContent', () => {
  it('should parse simple CSV content', () => {
    const content = 'a,b,c\n1,2,3\n4,5,6';
    const result = parseCSVContent(content);
    expect(result).toEqual([
      ['a', 'b', 'c'],
      ['1', '2', '3'],
      ['4', '5', '6'],
    ]);
  });

  it('should handle quoted values with newlines', () => {
    const content = 'a,b\n"line1\nline2",value';
    const result = parseCSVContent(content);
    expect(result).toEqual([
      ['a', 'b'],
      ['line1\nline2', 'value'],
    ]);
  });

  it('should skip empty lines', () => {
    const content = 'a,b\n\n1,2\n\n';
    const result = parseCSVContent(content);
    expect(result).toEqual([
      ['a', 'b'],
      ['1', '2'],
    ]);
  });

  it('should handle CRLF line endings', () => {
    const content = 'a,b\r\n1,2\r\n';
    const result = parseCSVContent(content);
    expect(result).toEqual([
      ['a', 'b'],
      ['1', '2'],
    ]);
  });

  it('should return empty array for empty content', () => {
    const result = parseCSVContent('');
    expect(result).toEqual([]);
  });

  it('should handle escaped quotes in quoted values', () => {
    const content = '"a""b",c\n"d""e""f",g';
    const result = parseCSVContent(content);
    expect(result).toEqual([
      ['a"b', 'c'],
      ['d"e"f', 'g'],
    ]);
  });
});

describe('parseCSV', () => {
  it('should parse CSV with header', () => {
    const content = 'id,name,value\n1,test,100\n2,example,200';
    const result = parseCSV(content);

    expect(result.header).toEqual(['id', 'name', 'value']);
    expect(result.rows.length).toBe(2);
    expect(result.rows[0]).toEqual({
      id: '1',
      name: 'test',
      value: '100',
      _lineNumber: 2,
    });
    expect(result.rows[1]).toEqual({
      id: '2',
      name: 'example',
      value: '200',
      _lineNumber: 3,
    });
  });

  it('should return empty arrays for empty content', () => {
    const result = parseCSV('');
    expect(result.header).toEqual([]);
    expect(result.rows).toEqual([]);
  });

  it('should include _lineNumber starting from 2', () => {
    const content = 'col1,col2\nval1,val2';
    const result = parseCSV(content);
    expect(result.rows[0]._lineNumber).toBe(2);
  });
});

describe('ManifestValidator', () => {
  let tempDir;
  let validator;

  beforeEach(async () => {
    tempDir = await fs.mkdtemp(path.join(os.tmpdir(), 'manifest-test-'));
    validator = new ManifestValidator({ basePath: tempDir });
  });

  afterEach(async () => {
    await fs.remove(tempDir);
  });

  describe('constructor', () => {
    it('should use provided basePath', () => {
      expect(validator.basePath).toBe(tempDir);
    });

    it('should set aiosCoreDir', () => {
      expect(validator.aiosCoreDir).toBe(path.join(tempDir, '.aios-core'));
    });

    it('should set manifestDir', () => {
      expect(validator.manifestDir).toBe(path.join(tempDir, '.aios-core', 'manifests'));
    });

    it('should default verbose to false', () => {
      expect(validator.verbose).toBe(false);
    });

    it('should accept verbose option', () => {
      const v = new ManifestValidator({ basePath: tempDir, verbose: true });
      expect(v.verbose).toBe(true);
    });
  });

  describe('getAgentsSchema', () => {
    it('should return schema with required fields', () => {
      const schema = validator.getAgentsSchema();
      expect(schema.required).toContain('id');
      expect(schema.required).toContain('name');
      expect(schema.required).toContain('version');
      expect(schema.required).toContain('status');
      expect(schema.required).toContain('file_path');
    });

    it('should have sourceDir for agents', () => {
      const schema = validator.getAgentsSchema();
      expect(schema.sourceDir).toBe('.aios-core/development/agents');
    });
  });

  describe('getWorkersSchema', () => {
    it('should return schema with required fields', () => {
      const schema = validator.getWorkersSchema();
      expect(schema.required).toContain('id');
      expect(schema.required).toContain('name');
      expect(schema.required).toContain('category');
    });
  });

  describe('getTasksSchema', () => {
    it('should return schema with required fields', () => {
      const schema = validator.getTasksSchema();
      expect(schema.required).toContain('id');
      expect(schema.required).toContain('name');
      expect(schema.required).toContain('file_path');
    });
  });

  describe('validateHeader', () => {
    it('should pass for valid header', () => {
      const schema = { required: ['id', 'name'] };
      const header = ['id', 'name', 'extra'];
      const errors = validator.validateHeader(header, schema);
      expect(errors.length).toBe(0);
    });

    it('should error for missing required column', () => {
      const schema = { required: ['id', 'name', 'status'] };
      const header = ['id', 'name'];
      const errors = validator.validateHeader(header, schema);
      expect(errors.length).toBe(1);
      expect(errors[0]).toContain('status');
    });

    it('should error for multiple missing columns', () => {
      const schema = { required: ['id', 'name', 'status', 'version'] };
      const header = ['id'];
      const errors = validator.validateHeader(header, schema);
      expect(errors.length).toBe(3);
    });
  });

  describe('validateManifest', () => {
    it('should fail for missing file', async () => {
      const result = await validator.validateManifest('nonexistent.csv', { required: [] });
      expect(result.valid).toBe(false);
      expect(result.errors.length).toBeGreaterThan(0);
      expect(result.errors[0]).toContain('not found');
    });

    it('should validate valid manifest', async () => {
      // Create manifest directory and file
      await fs.ensureDir(validator.manifestDir);
      const csvContent = 'id,name,status,file_path\ntest1,Test,active,./test.md';
      await fs.writeFile(path.join(validator.manifestDir, 'test.csv'), csvContent);

      // Create the referenced file
      await fs.writeFile(path.join(tempDir, 'test.md'), 'content');

      const result = await validator.validateManifest('test.csv', {
        required: ['id', 'name', 'status', 'file_path'],
      });

      expect(result.valid).toBe(true);
      expect(result.rowCount).toBe(1);
    });

    it('should detect missing required fields', async () => {
      await fs.ensureDir(validator.manifestDir);
      // Header includes all columns, but one row has empty 'status'
      const csvContent = 'id,name,status\nid1,name1,';  // status is empty
      await fs.writeFile(path.join(validator.manifestDir, 'test.csv'), csvContent);

      const result = await validator.validateManifest('test.csv', {
        required: ['id', 'name', 'status'],
      });

      expect(result.valid).toBe(false);
      expect(result.errors.some(e => e.includes('Missing required field'))).toBe(true);
    });

    it('should detect duplicate IDs', async () => {
      await fs.ensureDir(validator.manifestDir);
      const csvContent = 'id,name\nid1,name1\nid1,name2';
      await fs.writeFile(path.join(validator.manifestDir, 'test.csv'), csvContent);

      const result = await validator.validateManifest('test.csv', {
        required: ['id', 'name'],
      });

      expect(result.valid).toBe(false);
      expect(result.errors.some(e => e.includes('Duplicate ID'))).toBe(true);
    });

    it('should detect missing files', async () => {
      await fs.ensureDir(validator.manifestDir);
      const csvContent = 'id,name,file_path\ntest1,Test,./nonexistent.md';
      await fs.writeFile(path.join(validator.manifestDir, 'test.csv'), csvContent);

      const result = await validator.validateManifest('test.csv', {
        required: ['id', 'name', 'file_path'],
      });

      expect(result.valid).toBe(false);
      expect(result.missingFiles.length).toBe(1);
    });

    it('should warn on invalid status', async () => {
      await fs.ensureDir(validator.manifestDir);
      const csvContent = 'id,name,status\nid1,name1,invalid_status';
      await fs.writeFile(path.join(validator.manifestDir, 'test.csv'), csvContent);

      const result = await validator.validateManifest('test.csv', {
        required: ['id', 'name'],
      });

      expect(result.warnings.some(w => w.includes('Invalid status'))).toBe(true);
    });
  });

  describe('formatResults', () => {
    it('should format valid results', () => {
      const results = {
        agents: { filename: 'agents.csv', valid: true, rowCount: 5, errors: [], warnings: [], missingFiles: [], orphanFiles: [] },
        workers: { filename: 'workers.csv', valid: true, rowCount: 3, errors: [], warnings: [], missingFiles: [], orphanFiles: [] },
        tasks: { filename: 'tasks.csv', valid: true, rowCount: 10, errors: [], warnings: [], missingFiles: [], orphanFiles: [] },
        summary: { valid: 3, invalid: 0, missing: [], orphan: [] },
      };

      const output = validator.formatResults(results);
      expect(output).toContain('✓');
      expect(output).toContain('All manifests valid');
    });

    it('should format invalid results', () => {
      const results = {
        agents: { filename: 'agents.csv', valid: false, rowCount: 5, errors: ['Error 1'], warnings: [], missingFiles: [], orphanFiles: [] },
        workers: { filename: 'workers.csv', valid: true, rowCount: 3, errors: [], warnings: [], missingFiles: [], orphanFiles: [] },
        tasks: { filename: 'tasks.csv', valid: true, rowCount: 10, errors: [], warnings: [], missingFiles: [], orphanFiles: [] },
        summary: { valid: 2, invalid: 1, missing: [], orphan: [] },
      };

      const output = validator.formatResults(results);
      expect(output).toContain('✗');
      expect(output).toContain('Validation failed');
    });

    it('should show errors in verbose mode', () => {
      const v = new ManifestValidator({ basePath: tempDir, verbose: true });
      const results = {
        agents: { filename: 'agents.csv', valid: false, rowCount: 5, errors: ['Test error'], warnings: [], missingFiles: [], orphanFiles: [] },
        summary: { valid: 0, invalid: 1, missing: [], orphan: [] },
      };

      const output = v.formatResults(results);
      expect(output).toContain('Test error');
    });
  });
});

describe('createManifestValidator', () => {
  it('should create ManifestValidator instance', () => {
    const validator = createManifestValidator({ basePath: '/test' });
    expect(validator).toBeInstanceOf(ManifestValidator);
  });
});
