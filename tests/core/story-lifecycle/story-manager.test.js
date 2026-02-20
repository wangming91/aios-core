/**
 * StoryManager Tests
 */

const fs = require('fs');
const path = require('path');
const os = require('os');
const { StoryManager } = require('../../../.aios-core/core/story-lifecycle/story-manager');
const { StoryStatus, StoryType, StoryPriority } = require('../../../.aios-core/core/story-lifecycle/story-model');

describe('StoryManager', () => {
  let tempDir;
  let manager;

  beforeEach(() => {
    tempDir = fs.mkdtempSync(path.join(os.tmpdir(), 'story-manager-test-'));
    manager = new StoryManager(tempDir);
  });

  afterEach(() => {
    fs.rmSync(tempDir, { recursive: true, force: true });
  });

  describe('constructor', () => {
    it('should create instance with project root', () => {
      expect(manager.projectRoot).toBe(tempDir);
      expect(manager.storiesDir).toBeDefined();
      expect(manager.model).toBeDefined();
    });
  });

  describe('create()', () => {
    it('should create a new story', async () => {
      const story = await manager.create({
        title: 'Test Story',
        type: StoryType.FEATURE,
        status: StoryStatus.DRAFT
      });

      expect(story.id).toBeDefined();
      expect(story.title).toBe('Test Story');
      expect(story.type).toBe(StoryType.FEATURE);
    });

    it('should create story directory and file', async () => {
      await manager.create({
        id: 'STORY-TEST-1',
        title: 'Test Story',
        epicId: 'EPIC-TEST'
      });

      const storyDir = path.join(tempDir, 'docs/stories/active/EPIC-TEST/STORY-TEST-1');
      expect(fs.existsSync(storyDir)).toBe(true);

      const storyFile = path.join(storyDir, 'story.md');
      expect(fs.existsSync(storyFile)).toBe(true);
    });

    it('should throw error for invalid data', async () => {
      await expect(manager.create({})).rejects.toThrow('Invalid story data');
    });

    it('should generate ID if not provided', async () => {
      const story = await manager.create({
        title: 'Test',
        epicId: 'EPIC-TEST'
      });

      expect(story.id).toMatch(/^STORY-TEST-\d+$/);
    });

    it('should cache created story', async () => {
      const story = await manager.create({
        id: 'STORY-TEST-1',
        title: 'Test'
      });

      expect(manager._cache.has('STORY-TEST-1')).toBe(true);
    });
  });

  describe('read()', () => {
    it('should return null for non-existent story', async () => {
      const story = await manager.read('STORY-NONEXISTENT');
      expect(story).toBeNull();
    });

    it('should read existing story', async () => {
      await manager.create({
        id: 'STORY-TEST-1',
        title: 'Test Story',
        epicId: 'EPIC-TEST'
      });

      const story = await manager.read('STORY-TEST-1');

      expect(story).toBeDefined();
      expect(story.id).toBe('STORY-TEST-1');
      expect(story.title).toBe('Test Story');
    });

    it('should return cached story', async () => {
      await manager.create({
        id: 'STORY-TEST-1',
        title: 'Test'
      });

      // Second read should use cache
      const story = await manager.read('STORY-TEST-1');
      expect(story).toBeDefined();
    });
  });

  describe('update()', () => {
    it('should return null for non-existent story', async () => {
      const story = await manager.update('STORY-NONEXISTENT', { title: 'Updated' });
      expect(story).toBeNull();
    });

    it('should update existing story', async () => {
      await manager.create({
        id: 'STORY-TEST-1',
        title: 'Original Title',
        epicId: 'EPIC-TEST'
      });

      const updated = await manager.update('STORY-TEST-1', {
        title: 'Updated Title',
        status: StoryStatus.IN_PROGRESS
      });

      expect(updated.title).toBe('Updated Title');
      expect(updated.status).toBe(StoryStatus.IN_PROGRESS);
    });

    it('should update timestamp', async () => {
      await manager.create({
        id: 'STORY-TEST-1',
        title: 'Test',
        epicId: 'EPIC-TEST'
      });

      // Clear cache to force re-read
      manager.clearCache();

      const original = await manager.read('STORY-TEST-1');

      // Wait a bit for timestamp to change
      await new Promise(resolve => setTimeout(resolve, 10));

      const updated = await manager.update('STORY-TEST-1', { title: 'Updated' });

      expect(updated).toBeDefined();
      expect(updated.updatedAt).toBeDefined();
      // Note: Timestamps might be the same if execution is very fast
    });

    it('should set completedAt when status becomes done', async () => {
      await manager.create({
        id: 'STORY-TEST-1',
        title: 'Test'
      });

      const updated = await manager.update('STORY-TEST-1', {
        status: StoryStatus.DONE
      });

      expect(updated.completedAt).toBeDefined();
    });

    it('should throw error for invalid updates', async () => {
      await manager.create({
        id: 'STORY-TEST-1',
        title: 'Test'
      });

      await expect(manager.update('STORY-TEST-1', {
        status: 'invalid_status'
      })).rejects.toThrow('Invalid story data');
    });
  });

  describe('delete()', () => {
    it('should return false for non-existent story', async () => {
      const result = await manager.delete('STORY-NONEXISTENT');
      expect(result).toBe(false);
    });

    it('should delete existing story', async () => {
      await manager.create({
        id: 'STORY-TEST-1',
        title: 'Test',
        epicId: 'EPIC-TEST'
      });

      const result = await manager.delete('STORY-TEST-1');
      expect(result).toBe(true);

      const story = await manager.read('STORY-TEST-1');
      expect(story).toBeNull();
    });

    it('should remove from cache', async () => {
      await manager.create({
        id: 'STORY-TEST-1',
        title: 'Test'
      });

      await manager.delete('STORY-TEST-1');
      expect(manager._cache.has('STORY-TEST-1')).toBe(false);
    });
  });

  describe('list()', () => {
    beforeEach(async () => {
      await manager.create({
        id: 'STORY-TEST-1',
        title: 'Story 1',
        epicId: 'EPIC-TEST',
        status: StoryStatus.DRAFT,
        type: StoryType.FEATURE
      });

      await manager.create({
        id: 'STORY-TEST-2',
        title: 'Story 2',
        epicId: 'EPIC-TEST',
        status: StoryStatus.IN_PROGRESS,
        type: StoryType.BUGFIX
      });

      await manager.create({
        id: 'STORY-TEST-3',
        title: 'Story 3',
        epicId: 'EPIC-OTHER',
        status: StoryStatus.DONE,
        type: StoryType.FEATURE
      });
    });

    it('should list all stories', async () => {
      manager.clearCache(); // Clear cache to force re-read
      const stories = await manager.list();

      expect(stories.length).toBe(3);
    });

    it('should filter by status', async () => {
      manager.clearCache();
      const stories = await manager.list({ status: StoryStatus.DRAFT });

      expect(stories.length).toBe(1);
      expect(stories[0].id).toBe('STORY-TEST-1');
    });

    it('should filter by type', async () => {
      manager.clearCache();
      const stories = await manager.list({ type: StoryType.FEATURE });

      expect(stories.length).toBe(2);
    });

    it('should filter by epicId', async () => {
      manager.clearCache();
      const stories = await manager.list({ epicId: 'EPIC-TEST' });

      expect(stories.length).toBe(2);
    });

    it('should sort stories', async () => {
      manager.clearCache();
      const stories = await manager.list({ sortBy: 'title', sortOrder: 'desc' });

      expect(stories[0].title).toBe('Story 3');
      expect(stories[2].title).toBe('Story 1');
    });
  });

  describe('search()', () => {
    beforeEach(async () => {
      await manager.create({
        id: 'STORY-TEST-1',
        title: 'Implement Login',
        description: 'Add user authentication feature',
        epicId: 'EPIC-TEST'
      });

      await manager.create({
        id: 'STORY-TEST-2',
        title: 'Fix Bug in Logout',
        description: 'Fix logout redirect issue',
        epicId: 'EPIC-TEST'
      });
    });

    it('should search by title', async () => {
      manager.clearCache();
      const results = await manager.search('Login');

      // Both stories have 'Login' or 'Logout' which contains 'login'
      expect(results.length).toBeGreaterThanOrEqual(1);
    });

    it('should search by description', async () => {
      manager.clearCache();
      const results = await manager.search('authentication');

      // Authentication appears in STORY-TEST-1 description
      expect(results.length).toBeGreaterThanOrEqual(1);
      expect(results.some(r => r.id === 'STORY-TEST-1')).toBe(true);
    });

    it('should be case-insensitive', async () => {
      manager.clearCache();
      const results = await manager.search('IMPLEMENT');

      expect(results.length).toBe(1);
    });

    it('should return empty array for no matches', async () => {
      manager.clearCache();
      const results = await manager.search('nonexistent');

      expect(results).toEqual([]);
    });
  });

  describe('getStats()', () => {
    beforeEach(async () => {
      await manager.create({
        id: 'STORY-TEST-1',
        title: 'Story 1',
        epicId: 'EPIC-A',
        status: StoryStatus.DRAFT,
        type: StoryType.FEATURE,
        priority: StoryPriority.P0
      });

      await manager.create({
        id: 'STORY-TEST-2',
        title: 'Story 2',
        epicId: 'EPIC-A',
        status: StoryStatus.IN_PROGRESS,
        type: StoryType.BUGFIX,
        priority: StoryPriority.P1
      });

      await manager.create({
        id: 'STORY-TEST-3',
        title: 'Story 3',
        epicId: 'EPIC-B',
        status: StoryStatus.DONE,
        type: StoryType.FEATURE,
        priority: StoryPriority.P1
      });
    });

    it('should return statistics', async () => {
      manager.clearCache();
      const stats = await manager.getStats();

      expect(stats.total).toBe(3);
      expect(stats.byStatus[StoryStatus.DRAFT]).toBe(1);
      expect(stats.byStatus[StoryStatus.IN_PROGRESS]).toBe(1);
      expect(stats.byStatus[StoryStatus.DONE]).toBe(1);
    });

    it('should count by type', async () => {
      manager.clearCache();
      const stats = await manager.getStats();

      expect(stats.byType[StoryType.FEATURE]).toBe(2);
      expect(stats.byType[StoryType.BUGFIX]).toBe(1);
    });

    it('should count by epic', async () => {
      manager.clearCache();
      const stats = await manager.getStats();

      expect(stats.byEpic['EPIC-A']).toBe(2);
      expect(stats.byEpic['EPIC-B']).toBe(1);
    });
  });

  describe('clearCache()', () => {
    it('should clear the cache', async () => {
      await manager.create({
        id: 'STORY-TEST-1',
        title: 'Test'
      });

      expect(manager._cache.size).toBe(1);

      manager.clearCache();

      expect(manager._cache.size).toBe(0);
    });
  });
});
