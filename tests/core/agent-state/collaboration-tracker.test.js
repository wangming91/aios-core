/**
 * CollaborationTracker Tests
 */

const { CollaborationTracker } = require('../../../.aios-core/core/agent-state/collaboration-tracker');

describe('CollaborationTracker', () => {
  let tracker;

  beforeEach(() => {
    tracker = new CollaborationTracker();
  });

  describe('constructor', () => {
    it('should create empty tracker', () => {
      expect(tracker._collaborations.size).toBe(0);
      expect(tracker._handoffCount.size).toBe(0);
    });
  });

  describe('recordCollaboration()', () => {
    it('should record collaboration between agents', () => {
      tracker.recordCollaboration('pm', 'dev');

      expect(tracker._collaborations.has('pm')).toBe(true);
      expect(tracker._collaborations.get('pm').has('dev')).toBe(true);
    });

    it('should increment handoff count', () => {
      tracker.recordCollaboration('pm', 'dev');
      tracker.recordCollaboration('pm', 'dev');

      expect(tracker._handoffCount.get('pm->dev')).toBe(2);
    });

    it('should ignore self-collaboration', () => {
      tracker.recordCollaboration('dev', 'dev');
      expect(tracker._collaborations.size).toBe(0);
    });

    it('should ignore null agents', () => {
      tracker.recordCollaboration(null, 'dev');
      tracker.recordCollaboration('dev', null);

      expect(tracker._collaborations.size).toBe(0);
    });

    it('should record timestamp from context', () => {
      const timestamp = '2026-02-20T10:00:00Z';
      tracker.recordCollaboration('pm', 'dev', { timestamp });

      expect(tracker._lastHandoffTime.get('pm->dev')).toBe(timestamp);
    });

    it('should create target agent in graph if not exists', () => {
      tracker.recordCollaboration('pm', 'dev');

      expect(tracker._collaborations.has('dev')).toBe(true);
    });
  });

  describe('getGraph()', () => {
    beforeEach(() => {
      tracker.recordCollaboration('pm', 'dev');
      tracker.recordCollaboration('pm', 'dev');
      tracker.recordCollaboration('dev', 'qa');
    });

    it('should return nodes and edges', () => {
      const graph = tracker.getGraph();

      expect(graph.nodes).toBeDefined();
      expect(graph.edges).toBeDefined();
    });

    it('should include all agents as nodes', () => {
      const graph = tracker.getGraph();
      const nodeIds = graph.nodes.map(n => n.id);

      expect(nodeIds).toContain('pm');
      expect(nodeIds).toContain('dev');
      expect(nodeIds).toContain('qa');
    });

    it('should include correct edge weights', () => {
      const graph = tracker.getGraph();
      const pmDevEdge = graph.edges.find(e => e.from === 'pm' && e.to === 'dev');

      expect(pmDevEdge.weight).toBe(2);
    });

    it('should include last handoff time', () => {
      const graph = tracker.getGraph();
      const pmDevEdge = graph.edges.find(e => e.from === 'pm' && e.to === 'dev');

      expect(pmDevEdge.lastHandoff).toBeDefined();
    });

    it('should track collaboration counts per node', () => {
      const graph = tracker.getGraph();
      const pmNode = graph.nodes.find(n => n.id === 'pm');

      expect(pmNode.collaborations).toBe(1); // pm only collaborates with dev
    });
  });

  describe('getTopCollaborations()', () => {
    beforeEach(() => {
      tracker.recordCollaboration('pm', 'dev');
      tracker.recordCollaboration('pm', 'dev');
      tracker.recordCollaboration('pm', 'dev');
      tracker.recordCollaboration('dev', 'qa');
      tracker.recordCollaboration('dev', 'qa');
      tracker.recordCollaboration('qa', 'architect');
    });

    it('should return collaborations sorted by count', () => {
      const top = tracker.getTopCollaborations(3);

      expect(top[0].from).toBe('pm');
      expect(top[0].to).toBe('dev');
      expect(top[0].count).toBe(3);
    });

    it('should respect limit parameter', () => {
      const top = tracker.getTopCollaborations(2);
      expect(top).toHaveLength(2);
    });

    it('should default to 5 items', () => {
      const top = tracker.getTopCollaborations();
      expect(top.length).toBeLessThanOrEqual(5);
    });
  });

  describe('getCollaborators()', () => {
    beforeEach(() => {
      tracker.recordCollaboration('pm', 'dev');
      tracker.recordCollaboration('pm', 'qa');
      tracker.recordCollaboration('dev', 'qa');
    });

    it('should return collaborators for agent', () => {
      const collaborators = tracker.getCollaborators('pm');

      expect(collaborators).toContain('dev');
      expect(collaborators).toContain('qa');
    });

    it('should return empty array for unknown agent', () => {
      const collaborators = tracker.getCollaborators('unknown');
      expect(collaborators).toEqual([]);
    });
  });

  describe('findCollaborationPath()', () => {
    beforeEach(() => {
      tracker.recordCollaboration('pm', 'dev');
      tracker.recordCollaboration('dev', 'qa');
      tracker.recordCollaboration('qa', 'architect');
    });

    it('should find direct path', () => {
      const path = tracker.findCollaborationPath('pm', 'dev');
      expect(path).toEqual(['pm', 'dev']);
    });

    it('should find multi-step path', () => {
      const path = tracker.findCollaborationPath('pm', 'qa');
      expect(path).toEqual(['pm', 'dev', 'qa']);
    });

    it('should return null for no path', () => {
      const path = tracker.findCollaborationPath('architect', 'pm');
      expect(path).toBeNull();
    });

    it('should return single element for same agent', () => {
      const path = tracker.findCollaborationPath('pm', 'pm');
      expect(path).toEqual(['pm']);
    });
  });

  describe('getHandoffCount()', () => {
    beforeEach(() => {
      tracker.recordCollaboration('pm', 'dev');
      tracker.recordCollaboration('pm', 'dev');
      tracker.recordCollaboration('pm', 'dev');
    });

    it('should return correct count', () => {
      expect(tracker.getHandoffCount('pm', 'dev')).toBe(3);
    });

    it('should return 0 for non-existent pair', () => {
      expect(tracker.getHandoffCount('dev', 'pm')).toBe(0);
    });
  });

  describe('hasCollaboration()', () => {
    beforeEach(() => {
      tracker.recordCollaboration('pm', 'dev');
    });

    it('should return true for existing collaboration', () => {
      expect(tracker.hasCollaboration('pm', 'dev')).toBe(true);
    });

    it('should return true for reverse direction', () => {
      expect(tracker.hasCollaboration('dev', 'pm')).toBe(true);
    });

    it('should return false for non-existent collaboration', () => {
      expect(tracker.hasCollaboration('pm', 'qa')).toBe(false);
    });
  });

  describe('getCollaborationStrength()', () => {
    beforeEach(() => {
      tracker.recordCollaboration('pm', 'dev');
      tracker.recordCollaboration('pm', 'dev');
      tracker.recordCollaboration('pm', 'dev');
      tracker.recordCollaboration('qa', 'pm');
      tracker.recordCollaboration('qa', 'pm');
    });

    it('should return strengths sorted', () => {
      const strengths = tracker.getCollaborationStrength('pm');

      expect(strengths[0].agentId).toBe('dev');
      expect(strengths[0].strength).toBe(3);
      expect(strengths[1].agentId).toBe('qa');
      expect(strengths[1].strength).toBe(2);
    });

    it('should return empty array for unknown agent', () => {
      const strengths = tracker.getCollaborationStrength('unknown');
      expect(strengths).toEqual([]);
    });
  });

  describe('clear()', () => {
    beforeEach(() => {
      tracker.recordCollaboration('pm', 'dev');
      tracker.recordCollaboration('dev', 'qa');
    });

    it('should clear all data', () => {
      tracker.clear();

      expect(tracker._collaborations.size).toBe(0);
      expect(tracker._handoffCount.size).toBe(0);
      expect(tracker._agentStats.size).toBe(0);
    });
  });

  describe('toJSON() and fromJSON()', () => {
    beforeEach(() => {
      tracker.recordCollaboration('pm', 'dev');
      tracker.recordCollaboration('dev', 'qa');
    });

    it('should serialize and deserialize correctly', () => {
      const json = tracker.toJSON();
      const newTracker = new CollaborationTracker();
      newTracker.fromJSON(json);

      expect(newTracker.getHandoffCount('pm', 'dev')).toBe(1);
      expect(newTracker.getHandoffCount('dev', 'qa')).toBe(1);
    });

    it('should preserve collaborations', () => {
      const json = tracker.toJSON();
      const newTracker = new CollaborationTracker();
      newTracker.fromJSON(json);

      const collaborators = newTracker.getCollaborators('pm');
      expect(collaborators).toContain('dev');
    });
  });
});
