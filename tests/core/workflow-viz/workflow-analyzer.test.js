/**
 * WorkflowAnalyzer Tests
 */

const fs = require('fs');
const path = require('path');
const os = require('os');
const { WorkflowAnalyzer } = require('../../../.aios-core/core/workflow-viz/workflow-analyzer');

describe('WorkflowAnalyzer', () => {
  let tempDir;
  let analyzer;

  beforeEach(() => {
    tempDir = fs.mkdtempSync(path.join(os.tmpdir(), 'workflow-analyzer-test-'));
    analyzer = new WorkflowAnalyzer(tempDir);
  });

  afterEach(() => {
    fs.rmSync(tempDir, { recursive: true, force: true });
  });

  describe('constructor', () => {
    it('should create instance with paths', () => {
      expect(analyzer.projectRoot).toBe(tempDir);
      expect(analyzer.workflows).toBeInstanceOf(Map);
    });
  });

  describe('initialize()', () => {
    it('should initialize without existing stories', async () => {
      await analyzer.initialize();
      expect(analyzer.initialized).toBe(true);
    });

    it('should only initialize once', async () => {
      await analyzer.initialize();
      await analyzer.initialize();
      expect(analyzer.initialized).toBe(true);
    });
  });

  describe('_parseTasks()', () => {
    it('should parse tasks from markdown', () => {
      const content = `
# Test Story

## Acceptance Criteria
- [x] AC 1
- [ ] AC 2
`;

      const tasks = analyzer._parseTasks(content);
      expect(tasks.length).toBe(2);
      expect(tasks[0].status).toBe('completed');
      expect(tasks[1].status).toBe('pending');
    });

    it('should detect sections', () => {
      const content = `
## Section A
- [x] Task 1

## Section B
- [ ] Task 2
`;

      const tasks = analyzer._parseTasks(content);
      expect(tasks[0].section).toBe('Section A');
      expect(tasks[1].section).toBe('Section B');
    });

    it('should return empty array for no tasks', () => {
      const tasks = analyzer._parseTasks('# Just a title');
      expect(tasks).toEqual([]);
    });
  });

  describe('_calculateStats()', () => {
    it('should calculate statistics', () => {
      const workflow = {
        status: 'in_progress',
        tasks: [
          { status: 'completed' },
          { status: 'completed' },
          { status: 'pending' },
          { status: 'blocked' }
        ]
      };

      const stats = analyzer._calculateStats(workflow);

      expect(stats.totalSteps).toBe(4);
      expect(stats.completedSteps).toBe(2);
      expect(stats.blockedSteps).toBe(1);
      expect(stats.efficiency).toBe(50);
    });

    it('should handle empty workflow', () => {
      const stats = analyzer._calculateStats({ tasks: [] });

      expect(stats.totalSteps).toBe(0);
      expect(stats.efficiency).toBe(0);
    });
  });

  describe('_detectBottlenecks()', () => {
    it('should detect low progress', () => {
      const workflow = {
        status: 'in_progress',
        tasks: Array(10).fill({ status: 'pending' })
      };
      const stats = analyzer._calculateStats(workflow);

      const bottlenecks = analyzer._detectBottlenecks(workflow, stats);

      expect(bottlenecks.some(b => b.type === 'low_progress')).toBe(true);
    });

    it('should detect blocked status', () => {
      const workflow = {
        status: 'blocked',
        tasks: []
      };
      const stats = analyzer._calculateStats(workflow);

      const bottlenecks = analyzer._detectBottlenecks(workflow, stats);

      expect(bottlenecks.some(b => b.type === 'blocked_status')).toBe(true);
    });

    it('should detect task overload', () => {
      const workflow = {
        status: 'in_progress',
        tasks: Array(15).fill({ status: 'pending' })
      };
      const stats = analyzer._calculateStats(workflow);

      const bottlenecks = analyzer._detectBottlenecks(workflow, stats);

      expect(bottlenecks.some(b => b.type === 'task_overload')).toBe(true);
    });

    it('should return empty for healthy workflow', () => {
      const workflow = {
        status: 'in_progress',
        updatedAt: new Date().toISOString(),
        tasks: [
          { status: 'completed' },
          { status: 'completed' },
          { status: 'completed' }
        ]
      };
      const stats = analyzer._calculateStats(workflow);

      const bottlenecks = analyzer._detectBottlenecks(workflow, stats);

      // Should have no severe bottlenecks
      expect(bottlenecks.every(b => b.severity < 8)).toBe(true);
    });
  });

  describe('_calculateCriticalPath()', () => {
    it('should return incomplete tasks', () => {
      const workflow = {
        tasks: [
          { name: 'Task 1', status: 'completed' },
          { name: 'Task 2', status: 'pending' },
          { name: 'Task 3', status: 'completed' }
        ]
      };

      const path = analyzer._calculateCriticalPath(workflow);

      expect(path).toEqual(['Task 2']);
    });
  });

  describe('analyze()', () => {
    beforeEach(async () => {
      // Create test story
      const storiesDir = path.join(tempDir, 'docs', 'stories', 'active');
      const storyDir = path.join(storiesDir, 'STORY-TEST-1');
      fs.mkdirSync(storyDir, { recursive: true });

      fs.writeFileSync(path.join(storyDir, 'story.md'), `---
id: STORY-TEST-1
title: Test Story
status: in_progress
---

# Test Story

## Tasks
- [x] Task 1
- [ ] Task 2
- [ ] Task 3
`);
    });

    it('should analyze specific workflow', async () => {
      const result = await analyzer.analyze('STORY-TEST-1');

      expect(result).not.toBeNull();
      expect(result.title).toBe('Test Story');
      expect(result.stats.totalSteps).toBe(3);
    });

    it('should return null for non-existent workflow', async () => {
      const result = await analyzer.analyze('NONEXISTENT');
      expect(result).toBeNull();
    });

    it('should analyze all workflows when no ID provided', async () => {
      const results = await analyzer.analyze();

      expect(Array.isArray(results)).toBe(true);
      expect(results.length).toBeGreaterThan(0);
    });
  });

  describe('listWorkflows()', () => {
    beforeEach(async () => {
      const storiesDir = path.join(tempDir, 'docs', 'stories', 'active');
      const storyDir = path.join(storiesDir, 'STORY-TEST-1');
      fs.mkdirSync(storyDir, { recursive: true });

      fs.writeFileSync(path.join(storyDir, 'story.md'), `---
id: STORY-TEST-1
title: Test Story
status: in_progress
---

# Test Story
- [x] Task 1
`);
    });

    it('should list workflows', async () => {
      const workflows = await analyzer.listWorkflows();

      expect(workflows.length).toBeGreaterThan(0);
      expect(workflows[0].id).toBe('STORY-TEST-1');
    });

    it('should filter by status', async () => {
      const workflows = await analyzer.listWorkflows({ status: 'in_progress' });

      expect(workflows.length).toBeGreaterThan(0);
      expect(workflows[0].status).toBe('in_progress');
    });
  });

  describe('getOverallStats()', () => {
    beforeEach(async () => {
      const storiesDir = path.join(tempDir, 'docs', 'stories', 'active');
      const storyDir = path.join(storiesDir, 'STORY-TEST-1');
      fs.mkdirSync(storyDir, { recursive: true });

      fs.writeFileSync(path.join(storyDir, 'story.md'), `---
status: in_progress
---

# Test
- [x] Task 1
- [ ] Task 2
`);
    });

    it('should return overall statistics', async () => {
      const stats = await analyzer.getOverallStats();

      expect(stats.totalWorkflows).toBeGreaterThan(0);
      expect(stats.totalTasks).toBeGreaterThan(0);
      expect(stats.overallEfficiency).toBeDefined();
    });
  });

  describe('generateVisualization()', () => {
    beforeEach(async () => {
      const storiesDir = path.join(tempDir, 'docs', 'stories', 'active');
      const storyDir = path.join(storiesDir, 'STORY-TEST-1');
      fs.mkdirSync(storyDir, { recursive: true });

      fs.writeFileSync(path.join(storyDir, 'story.md'), `---
status: in_progress
---

# Test
- [x] Task 1
- [ ] Task 2
`);
    });

    it('should generate mermaid visualization', async () => {
      const viz = await analyzer.generateVisualization('STORY-TEST-1', 'mermaid');

      expect(viz).toContain('graph TD');
    });

    it('should generate json visualization', async () => {
      const viz = await analyzer.generateVisualization('STORY-TEST-1', 'json');

      expect(() => JSON.parse(viz)).not.toThrow();
    });

    it('should generate ascii visualization', async () => {
      const viz = await analyzer.generateVisualization('STORY-TEST-1', 'ascii');

      expect(viz).toContain('Workflow:');
    });

    it('should return null for non-existent workflow', async () => {
      const viz = await analyzer.generateVisualization('NONEXISTENT', 'mermaid');
      expect(viz).toBeNull();
    });
  });
});
