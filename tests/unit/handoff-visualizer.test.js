/**
 * Handoff Visualizer - Tests
 *
 * @module tests/unit/handoff-visualizer.test.js
 * @story HV-1: Agent Handoff Visualization
 */

const {
  HandoffVisualizer,
  AGENT_CONFIG,
  STANDARD_FLOWS,
} = require('../../.aios-core/development/scripts/handoff-visualizer');

describe('HandoffVisualizer', () => {
  let visualizer;

  beforeEach(() => {
    visualizer = new HandoffVisualizer();
  });

  // ============================================================
  // 1. Initialization Tests
  // ============================================================
  describe('initialization', () => {
    test('should initialize without tracker', () => {
      expect(visualizer.tracker).toBeDefined();
    });

    test('should accept custom tracker', () => {
      const mockTracker = { recordCollaboration: jest.fn() };
      const customViz = new HandoffVisualizer(mockTracker);
      expect(customViz.tracker).toBe(mockTracker);
    });
  });

  // ============================================================
  // 2. Handoff Recording Tests
  // ============================================================
  describe('recordHandoff', () => {
    test('should record handoff between agents', () => {
      visualizer.recordHandoff('dev', 'qa');

      const graph = visualizer.tracker.getGraph();
      expect(graph.nodes.length).toBe(2);
      expect(graph.edges.length).toBe(1);
    });

    test('should record multiple handoffs', () => {
      visualizer.recordHandoff('dev', 'qa');
      visualizer.recordHandoff('dev', 'qa');
      visualizer.recordHandoff('qa', 'devops');

      const graph = visualizer.tracker.getGraph();
      expect(graph.edges.find(e => e.from === 'dev' && e.to === 'qa').weight).toBe(2);
    });

    test('should include context timestamp', () => {
      const timestamp = '2026-01-01T00:00:00.000Z';
      visualizer.recordHandoff('dev', 'qa', { timestamp });

      const graph = visualizer.tracker.getGraph();
      expect(graph.edges[0].lastHandoff).toBe(timestamp);
    });
  });

  // ============================================================
  // 3. ASCII Visualization Tests
  // ============================================================
  describe('generateASCII', () => {
    test('should generate ASCII visualization', () => {
      visualizer.recordHandoff('dev', 'qa');

      const ascii = visualizer.generateASCII();

      expect(ascii).toContain('Agent Handoff');
      expect(ascii).toContain('Developer');
      expect(ascii).toContain('QA');
    });

    test('should show counts when enabled', () => {
      visualizer.recordHandoff('dev', 'qa');
      visualizer.recordHandoff('dev', 'qa');

      const ascii = visualizer.generateASCII({ showCounts: true });

      expect(ascii).toContain('(2x)');
    });

    test('should hide counts when disabled', () => {
      visualizer.recordHandoff('dev', 'qa');

      const ascii = visualizer.generateASCII({ showCounts: false });

      expect(ascii).not.toContain('(1x)');
    });

    test('should handle empty graph', () => {
      const ascii = visualizer.generateASCII();

      expect(ascii).toContain('No handoffs recorded');
    });

    test('should include summary statistics', () => {
      visualizer.recordHandoff('dev', 'qa');

      const ascii = visualizer.generateASCII();

      expect(ascii).toContain('Total Agents');
      expect(ascii).toContain('Total Handoffs');
    });
  });

  // ============================================================
  // 4. Mermaid Generation Tests
  // ============================================================
  describe('generateMermaid', () => {
    test('should generate Mermaid flowchart', () => {
      visualizer.recordHandoff('dev', 'qa');

      const mermaid = visualizer.generateMermaid();

      expect(mermaid).toContain('flowchart');
      expect(mermaid).toContain('subgraph Agents');
    });

    test('should use specified direction', () => {
      const mermaid = visualizer.generateMermaid({ direction: 'TB' });

      expect(mermaid).toContain('flowchart TB');
    });

    test('should default to LR direction', () => {
      const mermaid = visualizer.generateMermaid();

      expect(mermaid).toContain('flowchart LR');
    });
  });

  // ============================================================
  // 5. Standard Flow Tests
  // ============================================================
  describe('generateStandardFlow', () => {
    test('should generate story development flow', () => {
      const flow = visualizer.generateStandardFlow('story_development');

      expect(flow).toContain('STORY DEVELOPMENT');
      expect(flow).toContain('PO');
      expect(flow).toContain('Developer');
      expect(flow).toContain('QA');
    });

    test('should handle unknown flow', () => {
      const flow = visualizer.generateStandardFlow('unknown_flow');

      expect(flow).toContain('Unknown flow');
    });

    test('should list available flows in error message', () => {
      const flow = visualizer.generateStandardFlow('unknown');

      expect(flow).toContain('story_development');
      expect(flow).toContain('bug_fix');
    });
  });

  // ============================================================
  // 6. Timeline Tests
  // ============================================================
  describe('generateTimeline', () => {
    test('should generate timeline view', () => {
      visualizer.recordHandoff('dev', 'qa', { timestamp: '2026-01-01T10:00:00.000Z' });

      const timeline = visualizer.generateTimeline();

      expect(timeline).toContain('Recent Handoffs');
    });

    test('should respect limit parameter', () => {
      for (let i = 0; i < 20; i++) {
        visualizer.recordHandoff('dev', 'qa', { timestamp: new Date().toISOString() });
      }

      const timeline = visualizer.generateTimeline(5);

      // Count handoff entries (lines containing →)
      const handoffLines = timeline.split('\n').filter(line => line.includes('──▶'));
      expect(handoffLines.length).toBeLessThanOrEqual(5);
    });

    test('should handle empty timeline', () => {
      const timeline = visualizer.generateTimeline();

      expect(timeline).toContain('No handoffs recorded');
    });
  });

  // ============================================================
  // 7. Statistics Tests
  // ============================================================
  describe('generateStats', () => {
    test('should generate statistics', () => {
      visualizer.recordHandoff('dev', 'qa');
      visualizer.recordHandoff('qa', 'devops');

      const stats = visualizer.generateStats();

      expect(stats).toContain('Handoff Statistics');
      expect(stats).toContain('Agent Activity');
      expect(stats).toContain('Top Handoff Paths');
    });

    test('should show activity bars', () => {
      visualizer.recordHandoff('dev', 'qa');
      visualizer.recordHandoff('dev', 'qa');

      const stats = visualizer.generateStats();

      expect(stats).toContain('█');
    });
  });

  // ============================================================
  // 8. List Standard Flows Tests
  // ============================================================
  describe('listStandardFlows', () => {
    test('should list all standard flows', () => {
      const list = visualizer.listStandardFlows();

      expect(list).toContain('Available Standard Flows');
      expect(list).toContain('story_development');
      expect(list).toContain('bug_fix');
      expect(list).toContain('epic_creation');
    });
  });

  // ============================================================
  // 9. Constants Tests
  // ============================================================
  describe('constants', () => {
    test('AGENT_CONFIG should have required agents', () => {
      const requiredAgents = ['dev', 'qa', 'architect', 'pm', 'po', 'sm', 'devops'];

      requiredAgents.forEach(agent => {
        expect(AGENT_CONFIG[agent]).toBeDefined();
        expect(AGENT_CONFIG[agent].icon).toBeDefined();
        expect(AGENT_CONFIG[agent].label).toBeDefined();
      });
    });

    test('STANDARD_FLOWS should have required flows', () => {
      const requiredFlows = ['story_development', 'bug_fix', 'epic_creation'];

      requiredFlows.forEach(flow => {
        expect(STANDARD_FLOWS[flow]).toBeDefined();
        expect(Array.isArray(STANDARD_FLOWS[flow])).toBe(true);
        expect(STANDARD_FLOWS[flow].length).toBeGreaterThan(0);
      });
    });

    test('standard flows should use valid agent IDs', () => {
      for (const [flowName, agents] of Object.entries(STANDARD_FLOWS)) {
        agents.forEach(agent => {
          if (!AGENT_CONFIG[agent]) {
            throw new Error(`Invalid agent ${agent} in flow ${flowName}`);
          }
          expect(AGENT_CONFIG[agent]).toBeDefined();
        });
      }
    });
  });

  // ============================================================
  // 10. Integration Tests
  // ============================================================
  describe('integration', () => {
    test('should generate complete story development flow visualization', () => {
      // Simulate story development workflow
      visualizer.recordHandoff('po', 'dev');
      visualizer.recordHandoff('dev', 'qa');
      visualizer.recordHandoff('qa', 'dev'); // Found issues
      visualizer.recordHandoff('dev', 'qa'); // Re-submit
      visualizer.recordHandoff('qa', 'devops');

      const ascii = visualizer.generateASCII();

      expect(ascii).toContain('Developer');
      expect(ascii).toContain('QA');
      expect(ascii).toContain('DevOps');
      expect(ascii).toContain('PO');
    });

    test('should visualize complex handoff patterns', () => {
      // Simulate complex workflow
      visualizer.recordHandoff('dev', 'qa');
      visualizer.recordHandoff('dev', 'architect');
      visualizer.recordHandoff('qa', 'dev');
      visualizer.recordHandoff('architect', 'dev');
      visualizer.recordHandoff('dev', 'devops');

      const stats = visualizer.generateStats();

      expect(stats).toContain('Developer');
      expect(stats).toContain('Top Handoff Paths');
    });
  });
});
