/**
 * StoryManager - Story 生命周期管理器
 *
 * 提供创建、读取、更新、删除和搜索 Story 的功能
 *
 * @module core/story-lifecycle/story-manager
 */

const fs = require('fs');
const path = require('path');
const { StoryModel, StoryStatus } = require('./story-model');

/**
 * StoryManager 类
 */
class StoryManager {
  /**
   * @param {string} projectRoot - 项目根目录
   * @param {Object} options - 选项
   */
  constructor(projectRoot, options = {}) {
    this.projectRoot = projectRoot;
    this.storiesDir = options.storiesDir || path.join(projectRoot, 'docs/stories');
    this.activeDir = path.join(this.storiesDir, 'active');
    this.completedDir = path.join(this.storiesDir, 'completed');
    this.model = new StoryModel();
    this._cache = new Map();
  }

  /**
   * 创建 Story
   * @param {Object} storyData - Story 数据
   * @returns {Promise<Object>}
   */
  async create(storyData) {
    // 验证数据
    const validation = this.model.validate(storyData);
    if (!validation.valid) {
      throw new Error(`Invalid story data: ${validation.errors.join(', ')}`);
    }

    // 创建 Story 对象
    const story = this.model.create(storyData);

    // 生成 ID（如果没有）
    if (!story.id) {
      story.id = await this._generateNextId(story.epicId);
    }

    // 确定 Story 目录
    const storyDir = this._getStoryDir(story);

    // 创建目录
    if (!fs.existsSync(storyDir)) {
      fs.mkdirSync(storyDir, { recursive: true });
    }

    // 写入 Story 文件
    const storyFile = path.join(storyDir, 'story.md');
    const content = this._serializeStory(story);
    fs.writeFileSync(storyFile, content, 'utf8');

    // 更新缓存
    this._cache.set(story.id, { story, path: storyDir });

    return story;
  }

  /**
   * 读取 Story
   * @param {string} storyId - Story ID
   * @returns {Promise<Object|null>}
   */
  async read(storyId) {
    // 检查缓存
    if (this._cache.has(storyId)) {
      const cached = this._cache.get(storyId);
      // 确保 _path 存在
      if (cached.story && !cached.story._path) {
        cached.story._path = cached.path;
      }
      return cached.story;
    }

    // 查找 Story 文件
    const storyPath = await this._findStoryPath(storyId);
    if (!storyPath) {
      return null;
    }

    // 读取并解析
    const storyFile = path.join(storyPath, 'story.md');
    if (!fs.existsSync(storyFile)) {
      return null;
    }

    const content = fs.readFileSync(storyFile, 'utf8');
    const story = this._parseStory(content);

    if (story) {
      story._path = storyPath;
      this._cache.set(storyId, { story, path: storyPath });
    }

    return story;
  }

  /**
   * 更新 Story
   * @param {string} storyId - Story ID
   * @param {Object} updates - 更新数据
   * @returns {Promise<Object|null>}
   */
  async update(storyId, updates) {
    const story = await this.read(storyId);
    if (!story || !story._path) {
      return null;
    }

    // 合并更新
    const updatedStory = {
      ...story,
      ...updates,
      id: story.id, // 保持 ID 不变
      updatedAt: new Date().toISOString()
    };

    // 如果状态变为 done，设置完成时间
    if (updates.status === StoryStatus.DONE && !updatedStory.completedAt) {
      updatedStory.completedAt = new Date().toISOString();
    }

    // 验证
    const validation = this.model.validate(updatedStory);
    if (!validation.valid) {
      throw new Error(`Invalid story data: ${validation.errors.join(', ')}`);
    }

    // 写入文件
    const storyFile = path.join(story._path, 'story.md');
    const content = this._serializeStory(updatedStory);
    fs.writeFileSync(storyFile, content, 'utf8');

    // 更新缓存
    this._cache.set(storyId, { story: updatedStory, path: story._path });

    return updatedStory;
  }

  /**
   * 删除 Story
   * @param {string} storyId - Story ID
   * @returns {Promise<boolean>}
   */
  async delete(storyId) {
    const story = await this.read(storyId);
    if (!story || !story._path) {
      return false;
    }

    // 删除目录
    const storyPath = story._path;
    if (fs.existsSync(storyPath)) {
      fs.rmSync(storyPath, { recursive: true, force: true });
    }

    // 清除缓存（必须先清除，否则 read 会从缓存返回）
    this._cache.delete(storyId);

    return true;
  }

  /**
   * 列出所有 Story
   * @param {Object} options - 过滤选项
   * @returns {Promise<Object[]>}
   */
  async list(options = {}) {
    const stories = [];

    // 扫描 active 目录
    if (fs.existsSync(this.activeDir)) {
      const epics = fs.readdirSync(this.activeDir);
      for (const epic of epics) {
        const epicPath = path.join(this.activeDir, epic);
        if (fs.statSync(epicPath).isDirectory()) {
          const storyDirs = fs.readdirSync(epicPath);
          for (const storyDir of storyDirs) {
            if (storyDir.startsWith('STORY-')) {
              const story = await this.read(storyDir);
              if (story && this._matchesFilter(story, options)) {
                stories.push(story);
              }
            }
          }
        }
      }
    }

    // 排序
    if (options.sortBy) {
      stories.sort((a, b) => {
        const aVal = a[options.sortBy];
        const bVal = b[options.sortBy];
        return options.sortOrder === 'desc' ?
          (aVal > bVal ? -1 : 1) :
          (aVal > bVal ? 1 : -1);
      });
    }

    return stories;
  }

  /**
   * 搜索 Story
   * @param {string} query - 搜索查询
   * @param {Object} options - 搜索选项
   * @returns {Promise<Object[]>}
   */
  async search(query, options = {}) {
    const stories = await this.list(options);
    const queryLower = query.toLowerCase();

    return stories.filter(story => {
      // 搜索标题
      if (story.title && story.title.toLowerCase().includes(queryLower)) {
        return true;
      }

      // 搜索描述
      if (story.description && story.description.toLowerCase().includes(queryLower)) {
        return true;
      }

      // 搜索正文内容
      if (story.body && story.body.toLowerCase().includes(queryLower)) {
        return true;
      }

      // 搜索 ID
      if (story.id && story.id.toLowerCase().includes(queryLower)) {
        return true;
      }

      return false;
    });
  }

  /**
   * 检查 Story 是否匹配过滤器
   * @param {Object} story - Story 对象
   * @param {Object} filter - 过滤条件
   * @returns {boolean}
   * @private
   */
  _matchesFilter(story, filter) {
    if (filter.status && story.status !== filter.status) {
      return false;
    }

    if (filter.type && story.type !== filter.type) {
      return false;
    }

    if (filter.priority && story.priority !== filter.priority) {
      return false;
    }

    if (filter.epicId && story.epicId !== filter.epicId) {
      return false;
    }

    if (filter.assignee && story.assignee !== filter.assignee) {
      return false;
    }

    return true;
  }

  /**
   * 获取 Story 目录
   * @param {Object} story - Story 对象
   * @returns {string}
   * @private
   */
  _getStoryDir(story) {
    const epicDir = story.epicId || 'UNORGANIZED';
    return path.join(this.activeDir, epicDir, story.id);
  }

  /**
   * 查找 Story 路径
   * @param {string} storyId - Story ID
   * @returns {Promise<string|null>}
   * @private
   */
  async _findStoryPath(storyId) {
    // 首先在 active 目录中查找
    if (fs.existsSync(this.activeDir)) {
      const epics = fs.readdirSync(this.activeDir);
      for (const epic of epics) {
        const storyPath = path.join(this.activeDir, epic, storyId);
        if (fs.existsSync(storyPath)) {
          return storyPath;
        }
      }
    }

    // 然后在 completed 目录中查找
    if (fs.existsSync(this.completedDir)) {
      const epics = fs.readdirSync(this.completedDir);
      for (const epic of epics) {
        const storyPath = path.join(this.completedDir, epic, storyId);
        if (fs.existsSync(storyPath)) {
          return storyPath;
        }
      }
    }

    return null;
  }

  /**
   * 生成下一个 Story ID
   * @param {string} epicId - Epic ID
   * @returns {Promise<string>}
   * @private
   */
  async _generateNextId(epicId) {
    const stories = await this.list({ epicId });
    const epicCode = epicId ? epicId.replace(/^EPIC-/, '').replace(/-/g, '') : 'XXX';

    // 找到最大序号
    let maxNum = 0;
    for (const story of stories) {
      const parsed = this.model.parseId(story.id);
      if (parsed && parsed.epic === epicCode) {
        const num = parseInt(parsed.number.replace(/\D/g, ''));
        if (num > maxNum) {
          maxNum = num;
        }
      }
    }

    return this.model.generateId(epicId, maxNum + 1);
  }

  /**
   * 序列化 Story 到 Markdown
   * @param {Object} story - Story 对象
   * @returns {string}
   * @private
   */
  _serializeStory(story) {
    const frontMatter = this.model.toYamlFrontMatter(story);
    const body = story.body || story.description || '';

    // 确保描述内容在正文中
    const descriptionSection = story.description ?
      `\n${story.description}\n` : '';

    return `${frontMatter}\n\n# ${story.title}\n${descriptionSection}\n${body}\n`;
  }

  /**
   * 从 Markdown 解析 Story
   * @param {string} content - Markdown 内容
   * @returns {Object|null}
   * @private
   */
  _parseStory(content) {
    const story = this.model.fromYamlFrontMatter(content);
    if (!story) {
      // 尝试从 Markdown 标题提取
      const titleMatch = content.match(/^#\s+(.+)$/m);
      if (titleMatch) {
        return this.model.create({ title: titleMatch[1] });
      }
    }
    return story;
  }

  /**
   * 清除缓存
   */
  clearCache() {
    this._cache.clear();
  }

  /**
   * 获取统计信息
   * @returns {Promise<Object>}
   */
  async getStats() {
    const stories = await this.list();

    const stats = {
      total: stories.length,
      byStatus: {},
      byType: {},
      byPriority: {},
      byEpic: {}
    };

    for (const story of stories) {
      // 按状态统计
      stats.byStatus[story.status] = (stats.byStatus[story.status] || 0) + 1;

      // 按类型统计
      stats.byType[story.type] = (stats.byType[story.type] || 0) + 1;

      // 按优先级统计
      stats.byPriority[story.priority] = (stats.byPriority[story.priority] || 0) + 1;

      // 按 Epic 统计
      if (story.epicId) {
        stats.byEpic[story.epicId] = (stats.byEpic[story.epicId] || 0) + 1;
      }
    }

    return stats;
  }
}

module.exports = {
  StoryManager
};
