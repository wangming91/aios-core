/**
 * AgentRouter Tests
 */

const fs = require('fs');
const path = require('path');
const os = require('os');
const yaml = require('js-yaml');
const { AgentRouter } = require('../../../.aios-core/core/agent-state/router');

describe('AgentRouter', () => {
  let tempDir;
  let router;

  beforeEach(() => {
    tempDir = fs.mkdtempSync(path.join(os.tmpdir(), 'router-test-'));
    router = new AgentRouter();
  });

  afterEach(() => {
    fs.rmSync(tempDir, { recursive: true, force: true });
  });

  describe('constructor', () => {
    it('should create instance with classifier', () => {
      expect(router.classifier).toBeDefined();
      expect(router.capabilities).toBeNull();
      expect(router.routingHistory).toEqual([]);
    });

    it('should accept options', () => {
      const customRouter = new AgentRouter({
        capabilitiesPath: '/custom/path.yaml'
      });

      expect(customRouter.capabilitiesPath).toBe('/custom/path.yaml');
    });
  });

  describe('loadCapabilities()', () => {
    it('should load default capabilities', async () => {
      const capabilities = await router.loadCapabilities();

      expect(capabilities).toBeDefined();
      expect(capabilities.dev).toBeDefined();
      expect(capabilities.qa).toBeDefined();
    });

    it('should cache capabilities', async () => {
      await router.loadCapabilities();
      const capabilities = router.capabilities;

      await router.loadCapabilities();
      expect(router.capabilities).toBe(capabilities);
    });

    it('should load from custom path', async () => {
      const customPath = path.join(tempDir, 'custom-capabilities.yaml');
      const customCapabilities = {
        custom_agent: {
          name: 'Custom Agent',
          task_types: ['custom'],
          keywords: [{ pattern: 'custom' }]
        }
      };
      fs.writeFileSync(customPath, yaml.dump(customCapabilities));

      const customRouter = new AgentRouter({ capabilitiesPath: customPath });
      const capabilities = await customRouter.loadCapabilities();

      expect(capabilities.custom_agent).toBeDefined();
    });

    it('should use default capabilities if file not found', async () => {
      const customRouter = new AgentRouter({ capabilitiesPath: '/nonexistent/path.yaml' });
      const capabilities = await customRouter.loadCapabilities();

      expect(capabilities).toBeDefined();
      expect(capabilities.dev).toBeDefined();
    });
  });

  describe('route()', () => {
    it('should route implementation task to dev', async () => {
      const result = await router.route('implement user authentication');

      expect(result.recommendation).toBeDefined();
      expect(result.recommendation.id).toBe('dev');
      expect(result.confidence).toBeGreaterThan(0);
    });

    it('should route testing task to qa', async () => {
      const result = await router.route('write unit tests for login');

      expect(result.recommendation.id).toBe('qa');
    });

    it('should route architecture task to architect', async () => {
      const result = await router.route('design the system architecture');

      expect(result.recommendation.id).toBe('architect');
    });

    it('should route prd task to pm', async () => {
      const result = await router.route('write product requirements document for roadmap');

      expect(result.recommendation.id).toBe('pm');
    });

    it('should return alternatives', async () => {
      const result = await router.route('implement and test the feature');

      expect(result.alternatives).toBeDefined();
      expect(result.alternatives.length).toBeLessThanOrEqual(3);
    });

    it('should return classification', async () => {
      const result = await router.route('fix the bug');

      expect(result.classification).toBeDefined();
      expect(result.classification.types).toBeDefined();
    });

    it('should record routing history', async () => {
      await router.route('implement feature');
      await router.route('fix bug');

      expect(router.routingHistory).toHaveLength(2);
    });

    it('should consider context story type', async () => {
      const result = await router.route('implement feature', { storyType: 'feature' });

      expect(result.recommendation).toBeDefined();
    });
  });

  describe('explain()', () => {
    it('should explain recommendation for dev', async () => {
      const explanation = await router.explain('dev', 'implement user authentication');

      expect(explanation.found).toBe(true);
      expect(explanation.agentId).toBe('dev');
      expect(explanation.agentName).toBe('Developer');
      expect(explanation.reasons).toBeDefined();
      expect(explanation.reasons.length).toBeGreaterThan(0);
    });

    it('should return not found for unknown agent', async () => {
      const explanation = await router.explain('unknown_agent', 'some task');

      expect(explanation.found).toBe(false);
      expect(explanation.explanation).toContain('Unknown agent');
    });

    it('should include score', async () => {
      const explanation = await router.explain('dev', 'implement feature');

      expect(explanation.score).toBeDefined();
      expect(typeof explanation.score).toBe('number');
    });

    it('should include capabilities', async () => {
      const explanation = await router.explain('dev', 'implement feature');

      expect(explanation.capabilities).toBeDefined();
      expect(explanation.capabilities.taskTypes).toBeDefined();
    });
  });

  describe('getAllCapabilities()', () => {
    it('should return all capabilities', async () => {
      const capabilities = await router.getAllCapabilities();

      expect(capabilities).toBeDefined();
      expect(capabilities.dev).toBeDefined();
      expect(capabilities.qa).toBeDefined();
    });
  });

  describe('recordUserChoice()', () => {
    it('should record user choice', async () => {
      await router.route('implement feature');
      router.recordUserChoice('implement feature', 'dev');

      const history = router.getRoutingHistory();
      expect(history[0].selectedAgent).toBe('dev');
    });
  });

  describe('getRoutingHistory()', () => {
    beforeEach(async () => {
      await router.route('implement feature');
      await router.route('fix bug');
      await router.route('write tests');
    });

    it('should return all history', () => {
      const history = router.getRoutingHistory();
      expect(history).toHaveLength(3);
    });

    it('should filter by agentId', () => {
      const history = router.getRoutingHistory({ agentId: 'dev' });
      expect(history.every(h => h.recommendation?.id === 'dev')).toBe(true);
    });

    it('should limit results', () => {
      const history = router.getRoutingHistory({ limit: 2 });
      expect(history).toHaveLength(2);
    });
  });

  describe('clearHistory()', () => {
    it('should clear routing history', async () => {
      await router.route('task 1');
      await router.route('task 2');

      router.clearHistory();
      expect(router.routingHistory).toHaveLength(0);
    });
  });

  describe('_getDefaultCapabilities()', () => {
    it('should return default capabilities', () => {
      const defaults = router._getDefaultCapabilities();

      expect(defaults.dev).toBeDefined();
      expect(defaults.qa).toBeDefined();
      expect(defaults.architect).toBeDefined();
      expect(defaults.pm).toBeDefined();
    });
  });

  describe('_findMatchingAgents()', () => {
    beforeEach(async () => {
      await router.loadCapabilities();
    });

    it('should find matching agents', () => {
      const classification = { types: ['implementation'], keywords: ['implement'] };
      const matches = router._findMatchingAgents(classification, {});

      expect(matches.length).toBeGreaterThan(0);
      expect(matches.find(m => m.id === 'dev')).toBeDefined();
    });

    it('should return all agents if no match', () => {
      const classification = { types: ['unknown_type'], keywords: ['xyz123'] };
      const matches = router._findMatchingAgents(classification, {});

      expect(matches.length).toBeGreaterThan(0);
    });

    it('should include match score', () => {
      const classification = { types: ['implementation'], keywords: ['implement'] };
      const matches = router._findMatchingAgents(classification, {});

      expect(matches[0].matchScore).toBeDefined();
    });
  });

  describe('_calculateScore()', () => {
    beforeEach(async () => {
      await router.loadCapabilities();
    });

    it('should calculate score based on match score', () => {
      const agent = { id: 'dev', matchScore: 50 };
      const classification = { types: [], keywords: [] };

      const score = router._calculateScore(agent, classification, {});
      expect(score).toBe(50);
    });

    it('should cap score at 100', () => {
      const agent = { id: 'dev', matchScore: 150 };
      const classification = { types: [], keywords: [] };

      const score = router._calculateScore(agent, classification, {});
      expect(score).toBe(100);
    });
  });

  describe('learning from history', () => {
    it('should boost score for frequently selected agent', async () => {
      // Route similar tasks multiple times and select dev
      await router.route('implement feature a');
      router.recordUserChoice('implement feature a', 'dev');

      await router.route('implement feature b');
      router.recordUserChoice('implement feature b', 'dev');

      // Now route similar task
      const result = await router.route('implement feature c');

      // Dev should still be recommended
      expect(result.recommendation.id).toBe('dev');
    });
  });

  describe('history limit', () => {
    it('should limit history to 100 entries', async () => {
      for (let i = 0; i < 150; i++) {
        await router.route(`task ${i}`);
      }

      expect(router.routingHistory.length).toBe(100);
    });
  });
});
