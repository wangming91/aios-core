/**
 * agents 命令组测试
 */

const fs = require('fs');
const path = require('path');
const os = require('os');
const { Command } = require('commander');
const {
  createAgentsCommand,
  listAgents,
  showStatus,
  routeTask,
  showHistory,
  getAgentIcon,
  getAgentName,
  formatTimeAgo
} = require('../../../.aios-core/cli/commands/agents');

describe('agents commands', () => {
  let tempDir;
  let originalCwd;

  beforeEach(() => {
    tempDir = fs.mkdtempSync(path.join(os.tmpdir(), 'agents-cmd-test-'));
    originalCwd = process.cwd();
    process.chdir(tempDir);
  });

  afterEach(() => {
    process.chdir(originalCwd);
    fs.rmSync(tempDir, { recursive: true, force: true });
  });

  describe('createAgentsCommand()', () => {
    it('should create a commander command', () => {
      const cmd = createAgentsCommand();
      expect(cmd).toBeInstanceOf(Command);
      expect(cmd.name()).toBe('agents');
    });

    it('should have list subcommand', () => {
      const cmd = createAgentsCommand();
      const listCmd = cmd.commands.find(c => c.name() === 'list');
      expect(listCmd).toBeDefined();
    });

    it('should have status subcommand', () => {
      const cmd = createAgentsCommand();
      const statusCmd = cmd.commands.find(c => c.name() === 'status');
      expect(statusCmd).toBeDefined();
    });

    it('should have route subcommand', () => {
      const cmd = createAgentsCommand();
      const routeCmd = cmd.commands.find(c => c.name() === 'route');
      expect(routeCmd).toBeDefined();
    });

    it('should have history subcommand', () => {
      const cmd = createAgentsCommand();
      const historyCmd = cmd.commands.find(c => c.name() === 'history');
      expect(historyCmd).toBeDefined();
    });
  });

  describe('listAgents()', () => {
    it('should list all agents', async () => {
      const consoleSpy = jest.spyOn(console, 'log').mockImplementation();

      await listAgents({});

      const output = consoleSpy.mock.calls.flat().join('\n');
      expect(output).toContain('Available Agents');
      expect(output).toContain('dev');
      expect(output).toContain('qa');

      consoleSpy.mockRestore();
    });
  });

  describe('showStatus()', () => {
    it('should show no active agent when none is active', async () => {
      const consoleSpy = jest.spyOn(console, 'log').mockImplementation();

      await showStatus({});

      const output = consoleSpy.mock.calls.flat().join('\n');
      expect(output).toContain('No active agent');

      consoleSpy.mockRestore();
    });

    it('should show active agent after activation', async () => {
      const { AgentStateManager } = require('../../../.aios-core/core/agent-state');
      const stateManager = new AgentStateManager(tempDir);
      await stateManager.activateAgent('dev', { quality: 'full' });

      const consoleSpy = jest.spyOn(console, 'log').mockImplementation();

      await showStatus({});

      const output = consoleSpy.mock.calls.flat().join('\n');
      expect(output).toContain('Active Agent');
      expect(output).toContain('dev');

      consoleSpy.mockRestore();
    });
  });

  describe('routeTask()', () => {
    it('should show error for missing task', async () => {
      const consoleSpy = jest.spyOn(console, 'log').mockImplementation();

      await routeTask(null, {});

      const output = consoleSpy.mock.calls.flat().join('\n');
      expect(output).toContain('Error');

      consoleSpy.mockRestore();
    });

    it('should route implementation task', async () => {
      const consoleSpy = jest.spyOn(console, 'log').mockImplementation();

      await routeTask('implement user authentication', {});

      const output = consoleSpy.mock.calls.flat().join('\n');
      expect(output).toContain('Routing Analysis');
      expect(output).toContain('Recommended Agent');

      consoleSpy.mockRestore();
    });

    it('should show alternatives', async () => {
      const consoleSpy = jest.spyOn(console, 'log').mockImplementation();

      await routeTask('implement and test the feature', {});

      const output = consoleSpy.mock.calls.flat().join('\n');
      expect(output).toContain('Alternatives');

      consoleSpy.mockRestore();
    });
  });

  describe('showHistory()', () => {
    it('should show no history initially', async () => {
      const consoleSpy = jest.spyOn(console, 'log').mockImplementation();

      await showHistory({});

      const output = consoleSpy.mock.calls.flat().join('\n');
      expect(output).toContain('Agent History');

      consoleSpy.mockRestore();
    });

    it('should show history after activity', async () => {
      const { AgentStateManager } = require('../../../.aios-core/core/agent-state');
      const stateManager = new AgentStateManager(tempDir);
      await stateManager.activateAgent('pm', {});
      await stateManager.activateAgent('dev', {});

      const consoleSpy = jest.spyOn(console, 'log').mockImplementation();

      await showHistory({});

      const output = consoleSpy.mock.calls.flat().join('\n');
      expect(output).toContain('Recent Handoffs');

      consoleSpy.mockRestore();
    });

    it('should filter by agent', async () => {
      const { AgentStateManager } = require('../../../.aios-core/core/agent-state');
      const stateManager = new AgentStateManager(tempDir);
      await stateManager.activateAgent('pm', {});
      await stateManager.activateAgent('dev', {});

      const consoleSpy = jest.spyOn(console, 'log').mockImplementation();

      await showHistory({ agent: 'dev' });

      const output = consoleSpy.mock.calls.flat().join('\n');
      expect(output).toContain('Agent History');

      consoleSpy.mockRestore();
    });

    it('should show collaboration graph with --graph', async () => {
      const { AgentStateManager } = require('../../../.aios-core/core/agent-state');
      const stateManager = new AgentStateManager(tempDir);
      await stateManager.activateAgent('pm', {});
      await stateManager.activateAgent('dev', {});

      const consoleSpy = jest.spyOn(console, 'log').mockImplementation();

      await showHistory({ graph: true });

      const output = consoleSpy.mock.calls.flat().join('\n');
      expect(output).toContain('Collaboration Graph');

      consoleSpy.mockRestore();
    });
  });

  describe('getAgentIcon()', () => {
    it('should return icon for known agents', () => {
      expect(getAgentIcon('dev')).toBe('💻');
      expect(getAgentIcon('qa')).toBe('🔍');
      expect(getAgentIcon('architect')).toBe('🏛️');
      expect(getAgentIcon('pm')).toBe('📋');
    });

    it('should return default icon for unknown agents', () => {
      expect(getAgentIcon('unknown')).toBe('❓');
    });
  });

  describe('getAgentName()', () => {
    it('should return name for known agents', () => {
      expect(getAgentName('dev')).toBe('Dex');
      expect(getAgentName('qa')).toBe('Quinn');
      expect(getAgentName('architect')).toBe('Aria');
      expect(getAgentName('pm')).toBe('Morgan');
    });

    it('should return agentId for unknown agents', () => {
      expect(getAgentName('unknown')).toBe('unknown');
    });
  });

  describe('formatTimeAgo()', () => {
    it('should return "just now" for recent timestamps', () => {
      const now = new Date().toISOString();
      expect(formatTimeAgo(now)).toBe('just now');
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

    it('should return "unknown" for null', () => {
      expect(formatTimeAgo(null)).toBe('unknown');
    });
  });
});
