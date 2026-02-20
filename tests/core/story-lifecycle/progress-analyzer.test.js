/**
 * ProgressAnalyzer Tests
 */

const fs = require('fs');
const path = require('path');
const os = require('os');
const { ProgressAnalyzer } = require('../../../.aios-core/core/story-lifecycle/progress-analyzer');

describe('ProgressAnalyzer', () => {
  let analyzer;

  beforeEach(() => {
    analyzer = new ProgressAnalyzer();
  });

  describe('constructor', () => {
    it('should create instance with patterns', () => {
      expect(analyzer.checkedPattern).toBeDefined();
      expect(analyzer.uncheckedPattern).toBeDefined();
    });
  });

  describe('analyze()', () => {
    it('should return empty result for empty content', () => {
      const result = analyzer.analyze('');

      expect(result.totalTasks).toBe(0);
      expect(result.completedTasks).toBe(0);
      expect(result.percentage).toBe(0);
    });

    it('should return empty result for null content', () => {
      const result = analyzer.analyze(null);

      expect(result.totalTasks).toBe(0);
    });

    it('should count checked tasks', () => {
      const content = `
- [x] Task 1
- [x] Task 2
- [ ] Task 3
`;

      const result = analyzer.analyze(content);

      expect(result.totalTasks).toBe(3);
      expect(result.completedTasks).toBe(2);
      expect(result.percentage).toBe(67);
    });

    it('should count all unchecked', () => {
      const content = `
- [ ] Task 1
- [ ] Task 2
`;

      const result = analyzer.analyze(content);

      expect(result.totalTasks).toBe(2);
      expect(result.completedTasks).toBe(0);
      expect(result.percentage).toBe(0);
    });

    it('should count all checked', () => {
      const content = `
- [x] Task 1
- [x] Task 2
`;

      const result = analyzer.analyze(content);

      expect(result.totalTasks).toBe(2);
      expect(result.completedTasks).toBe(2);
      expect(result.percentage).toBe(100);
    });

    it('should parse completed items', () => {
      const content = `
- [x] Completed Task
- [ ] Pending Task
`;

      const result = analyzer.analyze(content);

      expect(result.completedItems).toContain('Completed Task');
      expect(result.pendingItems).toContain('Pending Task');
    });

    it('should parse sections', () => {
      const content = `
## Acceptance Criteria
- [x] AC1
- [ ] AC2

## Technical Tasks
- [x] Task 1
- [x] Task 2
`;

      const result = analyzer.analyze(content);

      expect(result.sections.length).toBe(2);
      expect(result.sections[0].title).toBe('Acceptance Criteria');
      expect(result.sections[0].completed).toBe(1);
      expect(result.sections[1].title).toBe('Technical Tasks');
      expect(result.sections[1].completed).toBe(2);
    });
  });

  describe('analyzeFile()', () => {
    let tempFile;

    afterEach(() => {
      if (tempFile && fs.existsSync(tempFile)) {
        fs.unlinkSync(tempFile);
      }
    });

    it('should analyze file content', () => {
      tempFile = path.join(os.tmpdir(), `test-${Date.now()}.md`);
      fs.writeFileSync(tempFile, '- [x] Task 1\n- [ ] Task 2');

      const result = analyzer.analyzeFile(tempFile);

      expect(result.totalTasks).toBe(2);
      expect(result.completedTasks).toBe(1);
    });

    it('should return empty result for non-existent file', () => {
      const result = analyzer.analyzeFile('/nonexistent/file.md');

      expect(result.totalTasks).toBe(0);
    });
  });

  describe('updateTaskStatus()', () => {
    it('should mark task as completed', () => {
      const content = '- [ ] Task 1\n- [ ] Task 2';
      const updated = analyzer.updateTaskStatus(content, 0, true);

      expect(updated).toContain('- [x] Task 1');
      expect(updated).toContain('- [ ] Task 2');
    });

    it('should mark task as incomplete', () => {
      const content = '- [x] Task 1\n- [x] Task 2';
      const updated = analyzer.updateTaskStatus(content, 1, false);

      expect(updated).toContain('- [x] Task 1');
      expect(updated).toContain('- [ ] Task 2');
    });

    it('should handle invalid index', () => {
      const content = '- [ ] Task 1';
      const updated = analyzer.updateTaskStatus(content, 10, true);

      expect(updated).toBe(content);
    });
  });

  describe('batchUpdateTaskStatus()', () => {
    it('should update multiple tasks', () => {
      const content = '- [ ] Task 1\n- [ ] Task 2\n- [ ] Task 3';
      const updated = analyzer.batchUpdateTaskStatus(content, {
        0: true,
        2: true
      });

      expect(updated).toContain('- [x] Task 1');
      expect(updated).toContain('- [ ] Task 2');
      expect(updated).toContain('- [x] Task 3');
    });
  });

  describe('generateReport()', () => {
    it('should generate progress report', () => {
      const progress = {
        totalTasks: 10,
        completedTasks: 7,
        percentage: 70,
        sections: [],
        completedItems: ['Task 1', 'Task 2'],
        pendingItems: ['Task 3']
      };

      const report = analyzer.generateReport(progress);

      expect(report).toContain('Progress Report');
      expect(report).toContain('70%');
      expect(report).toContain('7/10');
    });

    it('should include sections in report', () => {
      const progress = {
        totalTasks: 5,
        completedTasks: 3,
        percentage: 60,
        sections: [
          { title: 'AC', total: 3, completed: 2 },
          { title: 'Tasks', total: 2, completed: 1 }
        ],
        completedItems: [],
        pendingItems: []
      };

      const report = analyzer.generateReport(progress);

      expect(report).toContain('AC');
      expect(report).toContain('Tasks');
    });

    it('should include pending items', () => {
      const progress = {
        totalTasks: 3,
        completedTasks: 1,
        percentage: 33,
        sections: [],
        completedItems: ['Done'],
        pendingItems: ['Pending 1', 'Pending 2']
      };

      const report = analyzer.generateReport(progress);

      expect(report).toContain('Pending');
      expect(report).toContain('Pending 1');
    });

    it('should truncate long lists', () => {
      const progress = {
        totalTasks: 20,
        completedTasks: 15,
        percentage: 75,
        sections: [],
        completedItems: Array.from({ length: 15 }, (_, i) => `Task ${i}`),
        pendingItems: Array.from({ length: 5 }, (_, i) => `Pending ${i}`)
      };

      const report = analyzer.generateReport(progress);

      expect(report).toContain('and 10 more');
    });
  });

  describe('compare()', () => {
    it('should compare progress changes', () => {
      const before = {
        totalTasks: 5,
        completedTasks: 2,
        percentage: 40,
        completedItems: ['Task 1', 'Task 2'],
        pendingItems: ['Task 3', 'Task 4', 'Task 5']
      };

      const after = {
        totalTasks: 5,
        completedTasks: 4,
        percentage: 80,
        completedItems: ['Task 1', 'Task 2', 'Task 3', 'Task 4'],
        pendingItems: ['Task 5']
      };

      const diff = analyzer.compare(before, after);

      expect(diff.tasksCompleted).toBe(2);
      expect(diff.percentageChange).toBe(40);
      expect(diff.newCompleted).toContain('Task 3');
      expect(diff.newCompleted).toContain('Task 4');
    });

    it('should detect newly pending items', () => {
      const before = {
        totalTasks: 3,
        completedTasks: 2,
        percentage: 67,
        completedItems: ['Task 1', 'Task 2'],
        pendingItems: ['Task 3']
      };

      const after = {
        totalTasks: 3,
        completedTasks: 1,
        percentage: 33,
        completedItems: ['Task 1'],
        pendingItems: ['Task 2', 'Task 3']
      };

      const diff = analyzer.compare(before, after);

      expect(diff.newlyPending).toContain('Task 2');
    });
  });
});
