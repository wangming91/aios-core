/**
 * docs command tests
 */

const fs = require('fs');
const path = require('path');
const os = require('os');
const { Command } = require('commander');
const {
  createDocsCommand,
  getCategoryIcon
} = require('../../../.aios-core/cli/commands/docs');

describe('docs command', () => {
  let tempDir;
  let command;

  beforeEach(() => {
    tempDir = fs.mkdtempSync(path.join(os.tmpdir(), 'docs-cmd-test-'));
    command = createDocsCommand();
  });

  afterEach(() => {
    fs.rmSync(tempDir, { recursive: true, force: true });
  });

  describe('createDocsCommand()', () => {
    it('should create command with correct name', () => {
      expect(command.name()).toBe('docs');
    });

    it('should have search subcommand', () => {
      const searchCmd = command.commands.find(c => c.name() === 'search');
      expect(searchCmd).toBeDefined();
    });

    it('should have list subcommand', () => {
      const listCmd = command.commands.find(c => c.name() === 'list');
      expect(listCmd).toBeDefined();
    });

    it('should have rebuild subcommand', () => {
      const rebuildCmd = command.commands.find(c => c.name() === 'rebuild');
      expect(rebuildCmd).toBeDefined();
    });

    it('should have help subcommand', () => {
      const helpCmd = command.commands.find(c => c.name() === 'help');
      expect(helpCmd).toBeDefined();
    });

    it('should have show subcommand', () => {
      const showCmd = command.commands.find(c => c.name() === 'show');
      expect(showCmd).toBeDefined();
    });

    it('should have list alias ls', () => {
      const listCmd = command.commands.find(c => c.name() === 'list');
      expect(listCmd.aliases()).toContain('ls');
    });
  });

  describe('getCategoryIcon()', () => {
    it('should return correct icon for architecture', () => {
      expect(getCategoryIcon('architecture')).toBe('🏛️');
    });

    it('should return correct icon for guides', () => {
      expect(getCategoryIcon('guides')).toBe('📖');
    });

    it('should return correct icon for api', () => {
      expect(getCategoryIcon('api')).toBe('🔌');
    });

    it('should return correct icon for cli', () => {
      expect(getCategoryIcon('cli')).toBe('💻');
    });

    it('should return correct icon for agents', () => {
      expect(getCategoryIcon('agents')).toBe('🤖');
    });

    it('should return correct icon for stories', () => {
      expect(getCategoryIcon('stories')).toBe('📋');
    });

    it('should return default icon for unknown', () => {
      expect(getCategoryIcon('unknown')).toBe('📄');
    });
  });
});
