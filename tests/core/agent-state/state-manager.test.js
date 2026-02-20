/**
 * AgentStateManager Tests
 */

const fs = require('fs');
const path = require('path');
const os = require('os');
const yaml = require('js-yaml');
const { AgentStateManager, EventType } = require('../../../.aios-core/core/agent-state/state-manager');

describe('AgentStateManager', () => {
  let tempDir;
  let stateManager;

  beforeEach(() => {
    tempDir = fs.mkdtempSync(path.join(os.tmpdir(), 'agent-state-test-'));
    stateManager = new AgentStateManager(tempDir);
  });

  afterEach(() => {
    fs.rmSync(tempDir, { recursive: true, force: true });
  });

  describe('constructor', () => {
    it('should create instance with project root', () => {
      expect(stateManager.projectRoot).toBe(tempDir);
      expect(stateManager.activityLog).toBeDefined();
      expect(stateManager.collaborationTracker).toBeDefined();
    });
  });

  describe('load()', () => {
    it('should load default state if file does not exist', async () => {
      await stateManager.load();

      expect(stateManager._state).toBeDefined();
      expect(stateManager._state.version).toBe('1.0');
      expect(stateManager._state.activeAgent).toBeNull();
    });

    it('should load existing state from file', async () => {
      const stateFile = path.join(tempDir, '.aios-core/data/agent-state.yaml');
      const dir = path.dirname(stateFile);
      fs.mkdirSync(dir, { recursive: true });

      const existingData = {
        version: '1.0',
        active_agent: {
          id: 'dev',
          activated_at: '2026-02-20T10:00:00Z'
        },
        history: [
          { event: 'activate', agentId: 'dev', timestamp: '2026-02-20T10:00:00Z' }
        ]
      };
      fs.writeFileSync(stateFile, yaml.dump(existingData));

      await stateManager.load();
      expect(stateManager._state.activeAgent.id).toBe('dev');
    });
  });

  describe('activateAgent()', () => {
    it('should activate agent', async () => {
      const result = await stateManager.activateAgent('dev', {
        quality: 'full',
        context: { story: 'B1' }
      });

      expect(result.agent.id).toBe('dev');
      expect(result.agent.activationQuality).toBe('full');
      expect(result.agent.context.story).toBe('B1');
      expect(result.handoff).toBe(false);
    });

    it('should record handoff when switching agents', async () => {
      await stateManager.activateAgent('pm', {});
      const result = await stateManager.activateAgent('dev', {});

      expect(result.previousAgent).toBe('pm');
      expect(result.handoff).toBe(true);
    });

    it('should increment activation count', async () => {
      await stateManager.activateAgent('dev', {});
      const stats = stateManager.getStats();

      expect(stats.totalActivations).toBe(1);
      expect(stats.byAgent.dev.activations).toBe(1);
    });

    it('should add to history', async () => {
      await stateManager.activateAgent('dev', {});
      const history = stateManager.getAgentHistory();

      expect(history).toHaveLength(1);
      expect(history[0].event).toBe('activate');
      expect(history[0].agentId).toBe('dev');
    });

    it('should persist state to file', async () => {
      await stateManager.activateAgent('dev', {});

      const stateFile = path.join(tempDir, '.aios-core/data/agent-state.yaml');
      expect(fs.existsSync(stateFile)).toBe(true);

      const content = fs.readFileSync(stateFile, 'utf8');
      expect(content).toContain('dev');
    });
  });

  describe('deactivateAgent()', () => {
    it('should deactivate current agent', async () => {
      await stateManager.activateAgent('dev', {});
      const result = await stateManager.deactivateAgent();

      expect(result.deactivated).toBe(true);
      expect(result.agent.id).toBe('dev');
      expect(result.timeActive).toBeDefined();
    });

    it('should return false if no active agent', async () => {
      const result = await stateManager.deactivateAgent();

      expect(result.deactivated).toBe(false);
      expect(result.reason).toBe('no_active_agent');
    });

    it('should clear active agent', async () => {
      await stateManager.activateAgent('dev', {});
      await stateManager.deactivateAgent();

      expect(stateManager.getActiveAgent()).toBeNull();
    });

    it('should add deactivation to history', async () => {
      await stateManager.activateAgent('dev', {});
      await stateManager.deactivateAgent();

      const history = stateManager.getAgentHistory();
      const deactivations = history.filter(h => h.event === 'deactivate');
      expect(deactivations).toHaveLength(1);
    });
  });

  describe('getActiveAgent()', () => {
    it('should return null initially', async () => {
      await stateManager.load();
      expect(stateManager.getActiveAgent()).toBeNull();
    });

    it('should return active agent after activation', async () => {
      await stateManager.activateAgent('dev', {});
      const agent = stateManager.getActiveAgent();

      expect(agent).not.toBeNull();
      expect(agent.id).toBe('dev');
    });
  });

  describe('getAgentHistory()', () => {
    beforeEach(async () => {
      await stateManager.activateAgent('pm', {});
      await stateManager.activateAgent('dev', {});
      await stateManager.deactivateAgent();
    });

    it('should return all history', () => {
      const history = stateManager.getAgentHistory();
      expect(history.length).toBeGreaterThan(0);
    });

    it('should filter by agentId', () => {
      const history = stateManager.getAgentHistory({ agentId: 'pm' });
      expect(history.every(h => h.agentId === 'pm')).toBe(true);
    });

    it('should filter by eventType', () => {
      const history = stateManager.getAgentHistory({ eventType: 'activate' });
      expect(history.every(h => h.event === 'activate')).toBe(true);
    });

    it('should limit results', () => {
      const history = stateManager.getAgentHistory({ limit: 1 });
      expect(history).toHaveLength(1);
    });
  });

  describe('getHandoffs()', () => {
    beforeEach(async () => {
      await stateManager.activateAgent('pm', {});
      await stateManager.activateAgent('dev', {});
      await stateManager.activateAgent('qa', {});
    });

    it('should return all handoffs', () => {
      const handoffs = stateManager.getHandoffs();
      expect(handoffs).toHaveLength(2);
    });

    it('should filter by from agent', () => {
      const handoffs = stateManager.getHandoffs({ from: 'pm' });
      expect(handoffs).toHaveLength(1);
      expect(handoffs[0].from).toBe('pm');
    });

    it('should filter by to agent', () => {
      const handoffs = stateManager.getHandoffs({ to: 'qa' });
      expect(handoffs).toHaveLength(1);
      expect(handoffs[0].to).toBe('qa');
    });
  });

  describe('getCollaborationGraph()', () => {
    beforeEach(async () => {
      await stateManager.activateAgent('pm', {});
      await stateManager.activateAgent('dev', {});
      await stateManager.activateAgent('qa', {});
    });

    it('should return graph with nodes and edges', () => {
      const graph = stateManager.getCollaborationGraph();

      expect(graph.nodes).toBeDefined();
      expect(graph.edges).toBeDefined();
    });

    it('should include all agents in nodes', () => {
      const graph = stateManager.getCollaborationGraph();
      const nodeIds = graph.nodes.map(n => n.id);

      expect(nodeIds).toContain('pm');
      expect(nodeIds).toContain('dev');
      expect(nodeIds).toContain('qa');
    });
  });

  describe('getCollaborationReport()', () => {
    beforeEach(async () => {
      await stateManager.activateAgent('pm', {});
      await stateManager.activateAgent('dev', {});
      await stateManager.activateAgent('qa', {});
    });

    it('should return complete report', () => {
      const report = stateManager.getCollaborationReport();

      expect(report.graph).toBeDefined();
      expect(report.handoffs).toBeDefined();
      expect(report.topCollaborations).toBeDefined();
      expect(report.agentStats).toBeDefined();
    });

    it('should include top collaborations sorted by count', () => {
      const report = stateManager.getCollaborationReport();

      expect(report.topCollaborations.length).toBeGreaterThan(0);
    });
  });

  describe('getStats()', () => {
    beforeEach(async () => {
      await stateManager.activateAgent('pm', {});
      await stateManager.activateAgent('dev', {});
      await stateManager.activateAgent('dev', {}); // Same agent, no handoff
    });

    it('should return correct stats', () => {
      const stats = stateManager.getStats();

      expect(stats.totalActivations).toBe(3);
      // Only 1 handoff because dev -> dev doesn't count
      expect(stats.totalHandoffs).toBe(1);
    });

    it('should count activations per agent', () => {
      const stats = stateManager.getStats();

      expect(stats.byAgent.dev.activations).toBe(2);
      expect(stats.byAgent.pm.activations).toBe(1);
    });
  });

  describe('reset()', () => {
    beforeEach(async () => {
      await stateManager.activateAgent('pm', {});
      await stateManager.activateAgent('dev', {});
    });

    it('should reset all state', async () => {
      await stateManager.reset();

      expect(stateManager.getActiveAgent()).toBeNull();
      expect(stateManager.getAgentHistory()).toHaveLength(0);
      expect(stateManager.getHandoffs()).toHaveLength(0);
    });

    it('should clear collaboration tracker', async () => {
      await stateManager.reset();

      const graph = stateManager.getCollaborationGraph();
      expect(graph.nodes).toHaveLength(0);
      expect(graph.edges).toHaveLength(0);
    });
  });

  describe('getActivityLog()', () => {
    beforeEach(async () => {
      await stateManager.activateAgent('pm', {});
      await stateManager.activateAgent('dev', {});
    });

    it('should return activity log entries', async () => {
      const entries = await stateManager.getActivityLog();

      expect(entries.length).toBeGreaterThan(0);
    });

    it('should pass filter options', async () => {
      const entries = await stateManager.getActivityLog({ agentId: 'pm' });

      expect(entries.every(e => e.agentId === 'pm')).toBe(true);
    });
  });

  describe('persistence', () => {
    it('should persist collaboration data', async () => {
      await stateManager.activateAgent('pm', {});
      await stateManager.activateAgent('dev', {});

      // Create new instance and load
      const newManager = new AgentStateManager(tempDir);
      await newManager.load();

      const graph = newManager.getCollaborationGraph();
      const nodeIds = graph.nodes.map(n => n.id);

      expect(nodeIds).toContain('pm');
      expect(nodeIds).toContain('dev');
    });

    it('should persist stats', async () => {
      await stateManager.activateAgent('pm', {});
      await stateManager.activateAgent('dev', {});

      const newManager = new AgentStateManager(tempDir);
      await newManager.load();

      const stats = newManager.getStats();
      expect(stats.totalActivations).toBe(2);
    });
  });
});

describe('EventType export', () => {
  it('should export EventType from state-manager', () => {
    expect(EventType).toBeDefined();
  });
});
