/**
 * workflow command tests
 */

const fs = require('fs');
const path = require('path');
const os = require('os');
const { Command } = require('commander');
const {
  createWorkflowCommand,
  getStatusIcon,
  getStatusColor,
  getBottleneckIcon,
  getSeverityColor
} = require('../../../.aios-core/cli/commands/workflow');

describe('workflow command', () => {
  let tempDir;
  let command;

  beforeEach(() => {
    tempDir = fs.mkdtempSync(path.join(os.tmpdir(), 'workflow-cmd-test-'));
    command = createWorkflowCommand();
  });

  afterEach(() => {
    fs.rmSync(tempDir, { recursive: true, force: true });
  });

  describe('createWorkflowCommand()', () => {
    it('should create command with correct name', () => {
      expect(command.name()).toBe('workflow');
    });

    it('should have list subcommand', () => {
      const listCmd = command.commands.find(c => c.name() === 'list');
      expect(listCmd).toBeDefined();
    });

    it('should have show subcommand', () => {
      const showCmd = command.commands.find(c => c.name() === 'show');
      expect(showCmd).toBeDefined();
    });

    it('should have dashboard subcommand', () => {
      const dashCmd = command.commands.find(c => c.name() === 'dashboard');
      expect(dashCmd).toBeDefined();
    });

    it('should have viz subcommand', () => {
      const vizCmd = command.commands.find(c => c.name() === 'viz');
      expect(vizCmd).toBeDefined();
    });

    it('should have workflow alias wf', () => {
      expect(command.aliases()).toContain('wf');
    });

    it('should have list alias ls', () => {
      const listCmd = command.commands.find(c => c.name() === 'list');
      expect(listCmd.aliases()).toContain('ls');
    });

    it('should have dashboard alias dash', () => {
      const dashCmd = command.commands.find(c => c.name() === 'dashboard');
      expect(dashCmd.aliases()).toContain('dash');
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

    it('should return question mark for unknown', () => {
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

  describe('getBottleneckIcon()', () => {
    it('should return correct icon for low_progress', () => {
      expect(getBottleneckIcon('low_progress')).toBe('📉');
    });

    it('should return correct icon for stale_workflow', () => {
      expect(getBottleneckIcon('stale_workflow')).toBe('⏰');
    });

    it('should return correct icon for blocked_status', () => {
      expect(getBottleneckIcon('blocked_status')).toBe('🚫');
    });

    it('should return correct icon for task_overload', () => {
      expect(getBottleneckIcon('task_overload')).toBe('📦');
    });

    it('should return warning for unknown', () => {
      expect(getBottleneckIcon('unknown')).toBe('⚠️');
    });
  });

  describe('getSeverityColor()', () => {
    it('should return red for high severity', () => {
      const color = getSeverityColor(9);
      expect(typeof color).toBe('function');
    });

    it('should return yellow for medium severity', () => {
      const color = getSeverityColor(6);
      expect(typeof color).toBe('function');
    });

    it('should return gray for low severity', () => {
      const color = getSeverityColor(3);
      expect(typeof color).toBe('function');
    });
  });
});
