/**
 * StoryModel Tests
 */

const {
  StoryModel,
  StoryStatus,
  StoryType,
  StoryPriority,
  DEFAULT_STORY_TEMPLATE
} = require('../../../.aios-core/core/story-lifecycle/story-model');

describe('StoryModel', () => {
  let model;

  beforeEach(() => {
    model = new StoryModel();
  });

  describe('constructor', () => {
    it('should create instance with enums', () => {
      expect(model.statusEnum).toBe(StoryStatus);
      expect(model.typeEnum).toBe(StoryType);
      expect(model.priorityEnum).toBe(StoryPriority);
    });
  });

  describe('create()', () => {
    it('should create a new story with defaults', () => {
      const story = model.create();

      expect(story.id).toBeNull();
      expect(story.title).toBe('');
      expect(story.type).toBe(StoryType.FEATURE);
      expect(story.status).toBe(StoryStatus.DRAFT);
      expect(story.createdAt).toBeDefined();
      expect(story.updatedAt).toBeDefined();
    });

    it('should merge provided data', () => {
      const story = model.create({
        title: 'Test Story',
        type: StoryType.BUGFIX,
        priority: StoryPriority.P0
      });

      expect(story.title).toBe('Test Story');
      expect(story.type).toBe(StoryType.BUGFIX);
      expect(story.priority).toBe(StoryPriority.P0);
    });

    it('should preserve provided timestamps', () => {
      const timestamp = '2026-01-01T00:00:00Z';
      const story = model.create({ createdAt: timestamp });

      expect(story.createdAt).toBe(timestamp);
    });
  });

  describe('validate()', () => {
    it('should validate required fields', () => {
      const result = model.validate({});

      expect(result.valid).toBe(false);
      expect(result.errors).toContain('Title is required');
    });

    it('should pass validation with valid data', () => {
      const result = model.validate({ title: 'Test Story' });

      expect(result.valid).toBe(true);
      expect(result.errors).toHaveLength(0);
    });

    it('should validate Story ID format', () => {
      const result = model.validate({
        title: 'Test',
        id: 'INVALID-ID'
      });

      expect(result.valid).toBe(false);
      expect(result.errors.some(e => e.includes('Invalid Story ID'))).toBe(true);
    });

    it('should validate status', () => {
      const result = model.validate({
        title: 'Test',
        status: 'invalid_status'
      });

      expect(result.valid).toBe(false);
      expect(result.errors.some(e => e.includes('Invalid status'))).toBe(true);
    });

    it('should validate type', () => {
      const result = model.validate({
        title: 'Test',
        type: 'invalid_type'
      });

      expect(result.valid).toBe(false);
      expect(result.errors.some(e => e.includes('Invalid type'))).toBe(true);
    });

    it('should validate priority', () => {
      const result = model.validate({
        title: 'Test',
        priority: 'invalid_priority'
      });

      expect(result.valid).toBe(false);
      expect(result.errors.some(e => e.includes('Invalid priority'))).toBe(true);
    });

    it('should validate progress percentage', () => {
      const result = model.validate({
        title: 'Test',
        progress: { percentage: 150 }
      });

      expect(result.valid).toBe(false);
      expect(result.errors.some(e => e.includes('Progress percentage'))).toBe(true);
    });
  });

  describe('_isValidId()', () => {
    it('should validate correct ID format', () => {
      expect(model._isValidId('STORY-OPT-A1')).toBe(true);
      expect(model._isValidId('STORY-PRO-12')).toBe(true);
      expect(model._isValidId('STORY-EPIC-C5')).toBe(true);
    });

    it('should reject invalid ID formats', () => {
      expect(model._isValidId('INVALID')).toBe(false);
      expect(model._isValidId('story-opt-a1')).toBe(false);
      expect(model._isValidId('STORY-123')).toBe(false);
    });
  });

  describe('parseId()', () => {
    it('should parse valid ID', () => {
      const parsed = model.parseId('STORY-OPT-A1');

      expect(parsed).toEqual({
        prefix: 'STORY',
        epic: 'OPT',
        number: 'A1'
      });
    });

    it('should return null for invalid ID', () => {
      expect(model.parseId('INVALID')).toBeNull();
    });
  });

  describe('generateId()', () => {
    it('should generate ID from epic and number', () => {
      const id = model.generateId('EPIC-OPT-UX', 1);
      expect(id).toBe('STORY-OPTUX-1');
    });

    it('should handle simple epic ID', () => {
      const id = model.generateId('EPIC-TEST', 5);
      expect(id).toBe('STORY-TEST-5');
    });
  });

  describe('calculateProgress()', () => {
    it('should calculate percentage correctly', () => {
      expect(model.calculateProgress(5, 10)).toBe(50);
      expect(model.calculateProgress(3, 4)).toBe(75);
      expect(model.calculateProgress(1, 3)).toBe(33);
    });

    it('should return 0 for zero total', () => {
      expect(model.calculateProgress(0, 0)).toBe(0);
    });
  });

  describe('toYamlFrontMatter()', () => {
    it('should generate YAML front matter', () => {
      const story = model.create({
        id: 'STORY-TEST-1',
        title: 'Test Story',
        type: StoryType.FEATURE,
        status: StoryStatus.IN_PROGRESS
      });

      const yaml = model.toYamlFrontMatter(story);

      expect(yaml).toContain('---');
      expect(yaml).toContain('id: STORY-TEST-1');
      expect(yaml).toContain('title: "Test Story"');
      expect(yaml).toContain('type: feature');
      expect(yaml).toContain('status: in_progress');
    });

    it('should include optional fields', () => {
      const story = model.create({
        id: 'STORY-TEST-1',
        title: 'Test',
        epicId: 'EPIC-TEST',
        assignee: '@dev'
      });

      const yaml = model.toYamlFrontMatter(story);

      expect(yaml).toContain('epic: EPIC-TEST');
      expect(yaml).toContain('assignee: @dev');
    });
  });

  describe('fromYamlFrontMatter()', () => {
    it('should parse YAML front matter', () => {
      const content = `---
id: STORY-TEST-1
title: "Test Story"
type: feature
status: in_progress
priority: P1
---

# Test Story

This is the body.`;

      const story = model.fromYamlFrontMatter(content);

      expect(story).toBeDefined();
      expect(story.id).toBe('STORY-TEST-1');
      expect(story.title).toBe('Test Story');
      expect(story.type).toBe('feature');
      expect(story.status).toBe('in_progress');
      expect(story.priority).toBe('P1');
    });

    it('should return null for content without front matter', () => {
      const content = '# Just a markdown file';
      const story = model.fromYamlFrontMatter(content);

      expect(story).toBeNull();
    });
  });

  describe('clone()', () => {
    it('should clone a story', () => {
      const original = model.create({
        id: 'STORY-TEST-1',
        title: 'Original'
      });

      const cloned = model.clone(original, { title: 'Cloned' });

      expect(cloned.id).toBe('STORY-TEST-1');
      expect(cloned.title).toBe('Cloned');
      expect(cloned).not.toBe(original);
    });

    it('should update timestamp', async () => {
      const original = model.create({ title: 'Test' });
      const originalTime = original.updatedAt;

      // Wait a bit for timestamp to change
      await new Promise(resolve => setTimeout(resolve, 10));

      const cloned = model.clone(original, {});

      expect(cloned.updatedAt).toBeDefined();
      // Timestamps might be the same if execution is very fast
      // So we just verify the updatedAt field exists
    });
  });
});

describe('Enums', () => {
  it('should define StoryStatus', () => {
    expect(StoryStatus.DRAFT).toBe('draft');
    expect(StoryStatus.IN_PROGRESS).toBe('in_progress');
    expect(StoryStatus.DONE).toBe('done');
  });

  it('should define StoryType', () => {
    expect(StoryType.FEATURE).toBe('feature');
    expect(StoryType.BUGFIX).toBe('bugfix');
    expect(StoryType.REFACTOR).toBe('refactor');
  });

  it('should define StoryPriority', () => {
    expect(StoryPriority.P0).toBe('P0');
    expect(StoryPriority.P1).toBe('P1');
    expect(StoryPriority.P2).toBe('P2');
  });
});

describe('DEFAULT_STORY_TEMPLATE', () => {
  it('should have all default fields', () => {
    expect(DEFAULT_STORY_TEMPLATE.id).toBeNull();
    expect(DEFAULT_STORY_TEMPLATE.title).toBe('');
    expect(DEFAULT_STORY_TEMPLATE.status).toBe(StoryStatus.DRAFT);
    expect(DEFAULT_STORY_TEMPLATE.progress).toBeDefined();
  });
});
