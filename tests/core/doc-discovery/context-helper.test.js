/**
 * ContextHelper Tests
 */

const fs = require('fs');
const path = require('path');
const os = require('os');
const { ContextHelper } = require('../../../.aios-core/core/doc-discovery/context-helper');

describe('ContextHelper', () => {
  let tempDir;
  let helper;

  beforeEach(() => {
    tempDir = fs.mkdtempSync(path.join(os.tmpdir(), 'context-helper-test-'));
    helper = new ContextHelper(tempDir);
  });

  afterEach(() => {
    fs.rmSync(tempDir, { recursive: true, force: true });
  });

  describe('constructor', () => {
    it('should create instance', () => {
      expect(helper.projectRoot).toBe(tempDir);
      expect(helper.helpRules).toBeInstanceOf(Map);
    });
  });

  describe('initialize()', () => {
    it('should load built-in rules', async () => {
      await helper.initialize();

      expect(helper.helpRules.size).toBeGreaterThan(0);
      expect(helper.initialized).toBe(true);
    });

    it('should only initialize once', async () => {
      await helper.initialize();
      const firstSize = helper.helpRules.size;

      await helper.initialize();

      expect(helper.helpRules.size).toBe(firstSize);
    });
  });

  describe('getHelp()', () => {
    beforeEach(async () => {
      await helper.initialize();
    });

    it('should return help for command context', async () => {
      const results = await helper.getHelp({ command: 'doctor' });

      expect(results.length).toBeGreaterThan(0);
      expect(results[0].topic).toBeDefined();
    });

    it('should return help for agent context', async () => {
      const results = await helper.getHelp({ agent: 'dev' });

      expect(results.length).toBeGreaterThan(0);
      expect(results[0].topic).toContain('Developer');
    });

    it('should return empty for no matching context', async () => {
      const results = await helper.getHelp({ command: 'nonexistent123' });

      expect(results).toEqual([]);
    });
  });

  describe('getCommandHelp()', () => {
    beforeEach(async () => {
      await helper.initialize();
    });

    it('should return help for command', async () => {
      const help = await helper.getCommandHelp('quickstart');

      expect(help).not.toBeNull();
      expect(help.topic).toBeDefined();
    });

    it('should return null for unknown command', async () => {
      const help = await helper.getCommandHelp('nonexistent123');

      expect(help).toBeNull();
    });
  });

  describe('getAgentHelp()', () => {
    beforeEach(async () => {
      await helper.initialize();
    });

    it('should return help for agent', async () => {
      const help = await helper.getAgentHelp('dev');

      expect(help).not.toBeNull();
      expect(help.topic).toContain('Developer');
    });

    it('should return help for pm agent', async () => {
      const help = await helper.getAgentHelp('pm');

      expect(help).not.toBeNull();
      expect(help.topic).toContain('Product Manager');
    });
  });

  describe('getErrorHelp()', () => {
    beforeEach(async () => {
      await helper.initialize();
    });

    it('should return help for error code', async () => {
      const help = await helper.getErrorHelp('CFG_001');

      expect(help).not.toBeNull();
      expect(help.topic).toContain('Configuration');
    });

    it('should return help for agent error', async () => {
      const help = await helper.getErrorHelp('AGENT_001');

      expect(help).not.toBeNull();
      expect(help.topic).toContain('Agent');
    });
  });

  describe('addRule()', () => {
    beforeEach(async () => {
      await helper.initialize();
    });

    it('should add custom rule', () => {
      const initialSize = helper.helpRules.size;

      helper.addRule({
        id: 'custom-test',
        triggers: { command: 'test' },
        topic: 'Test Topic',
        summary: 'Test summary',
        relatedDocs: [],
        suggestions: [],
        relatedCommands: []
      });

      expect(helper.helpRules.size).toBe(initialSize + 1);
    });

    it('should match custom rule', async () => {
      helper.addRule({
        id: 'custom-test',
        triggers: { command: 'customcommand' },
        topic: 'Custom Topic',
        summary: 'Custom summary',
        relatedDocs: [],
        suggestions: ['Test suggestion'],
        relatedCommands: []
      });

      const results = await helper.getHelp({ command: 'customcommand' });

      expect(results.length).toBeGreaterThan(0);
      expect(results[0].topic).toBe('Custom Topic');
    });
  });

  describe('getAllRules()', () => {
    beforeEach(async () => {
      await helper.initialize();
    });

    it('should return all rules', () => {
      const rules = helper.getAllRules();

      expect(rules.length).toBeGreaterThan(0);
      expect(rules[0].id).toBeDefined();
      expect(rules[0].topic).toBeDefined();
    });
  });

  describe('_matchesContext()', () => {
    beforeEach(async () => {
      await helper.initialize();
    });

    it('should match string trigger', () => {
      const rule = {
        triggers: { command: 'doctor' }
      };

      const result = helper._matchesContext(rule, { command: 'aios doctor' });
      expect(result).toBe(true);
    });

    it('should match regex trigger', () => {
      const rule = {
        triggers: { error: /^CFG_/ }
      };

      const result = helper._matchesContext(rule, { error: 'CFG_001' });
      expect(result).toBe(true);
    });

    it('should not match different value', () => {
      const rule = {
        triggers: { command: 'doctor' }
      };

      const result = helper._matchesContext(rule, { command: 'quickstart' });
      expect(result).toBe(false);
    });
  });
});
