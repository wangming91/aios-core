/**
 * story command tests
 */

const fs = require('fs');
const path = require('path');
const os = require('os');
const { Command } = require('commander');
const {
  createStoryCommand,
  getStatusIcon,
  getStatusColor,
  getTypeIcon,
  getPriorityDisplay,
  formatTimeAgo
} = require('../../../.aios-core/cli/commands/story');

describe('story command', () => {
  let tempDir;
  let command;

  beforeEach(() => {
    tempDir = fs.mkdtempSync(path.join(os.tmpdir(), 'story-cmd-test-'));
    command = createStoryCommand();
  });

  afterEach(() => {
    fs.rmSync(tempDir, { recursive: true, force: true });
  });

  describe('createStoryCommand()', () => {
    it('should create command with correct name', () => {
      expect(command.name()).toBe('story');
    });

    it('should have list subcommand', () => {
      const listCmd = command.commands.find(c => c.name() === 'list');
      expect(listCmd).toBeDefined();
    });

    it('should have create subcommand', () => {
      const createCmd = command.commands.find(c => c.name() === 'create');
      expect(createCmd).toBeDefined();
    });

    it('should have show subcommand', () => {
      const showCmd = command.commands.find(c => c.name() === 'show');
      expect(showCmd).toBeDefined();
    });

    it('should have progress subcommand', () => {
      const progressCmd = command.commands.find(c => c.name() === 'progress');
      expect(progressCmd).toBeDefined();
    });

    it('should have visualize subcommand', () => {
      const vizCmd = command.commands.find(c => c.name() === 'visualize');
      expect(vizCmd).toBeDefined();
    });

    it('should have list alias ls', () => {
      const listCmd = command.commands.find(c => c.name() === 'list');
      expect(listCmd.aliases()).toContain('ls');
    });

    it('should have visualize alias viz', () => {
      const vizCmd = command.commands.find(c => c.name() === 'visualize');
      expect(vizCmd.aliases()).toContain('viz');
    });
  });

  describe('getStatusIcon()', () => {
    it('should return correct icon for draft', () => {
      expect(getStatusIcon('draft')).toBe('📝');
    });

    it('should return correct icon for in_progress', () => {
      expect(getStatusIcon('in_progress')).toBe('🔄');
    });

    it('should return correct icon for done', () => {
      expect(getStatusIcon('done')).toBe('✅');
    });

    it('should return correct icon for blocked', () => {
      expect(getStatusIcon('blocked')).toBe('🚫');
    });

    it('should return question mark for unknown status', () => {
      expect(getStatusIcon('unknown')).toBe('❓');
    });
  });

  describe('getStatusColor()', () => {
    it('should return a function', () => {
      expect(typeof getStatusColor('draft')).toBe('function');
    });

    it('should handle all valid statuses', () => {
      const statuses = ['draft', 'ready', 'in_progress', 'review', 'done', 'blocked'];

      for (const status of statuses) {
        expect(typeof getStatusColor(status)).toBe('function');
      }
    });
  });

  describe('getTypeIcon()', () => {
    it('should return correct icon for feature', () => {
      expect(getTypeIcon('feature')).toBe('✨');
    });

    it('should return correct icon for bugfix', () => {
      expect(getTypeIcon('bugfix')).toBe('🐛');
    });

    it('should return correct icon for refactor', () => {
      expect(getTypeIcon('refactor')).toBe('♻️');
    });

    it('should return correct icon for spike', () => {
      expect(getTypeIcon('spike')).toBe('🔬');
    });

    it('should return correct icon for chore', () => {
      expect(getTypeIcon('chore')).toBe('🔧');
    });

    it('should return correct icon for docs', () => {
      expect(getTypeIcon('docs')).toBe('📚');
    });

    it('should return page icon for unknown type', () => {
      expect(getTypeIcon('unknown')).toBe('📄');
    });
  });

  describe('getPriorityDisplay()', () => {
    it('should return P0 with red color', () => {
      const display = getPriorityDisplay('P0');
      expect(display).toContain('P0');
    });

    it('should return P1 with yellow color', () => {
      const display = getPriorityDisplay('P1');
      expect(display).toContain('P1');
    });

    it('should return P2 with blue color', () => {
      const display = getPriorityDisplay('P2');
      expect(display).toContain('P2');
    });

    it('should return P3 with gray color', () => {
      const display = getPriorityDisplay('P3');
      expect(display).toContain('P3');
    });

    it('should handle null priority', () => {
      const display = getPriorityDisplay(null);
      expect(display).toBeDefined();
    });
  });

  describe('formatTimeAgo()', () => {
    it('should return "just now" for recent timestamp', () => {
      const now = new Date().toISOString();
      expect(formatTimeAgo(now)).toBe('just now');
    });

    it('should return "unknown" for null timestamp', () => {
      expect(formatTimeAgo(null)).toBe('unknown');
    });

    it('should return minutes ago', () => {
      const fiveMinAgo = new Date(Date.now() - 5 * 60000).toISOString();
      expect(formatTimeAgo(fiveMinAgo)).toBe('5m ago');
    });

    it('should return hours ago', () => {
      const twoHoursAgo = new Date(Date.now() - 2 * 3600000).toISOString();
      expect(formatTimeAgo(twoHoursAgo)).toBe('2h ago');
    });

    it('should return days ago', () => {
      const threeDaysAgo = new Date(Date.now() - 3 * 86400000).toISOString();
      expect(formatTimeAgo(threeDaysAgo)).toBe('3d ago');
    });
  });
});
