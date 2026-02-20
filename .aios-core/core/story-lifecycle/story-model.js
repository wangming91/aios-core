/**
 * StoryModel - Story 数据模型
 *
 * 定义统一的 Story 数据结构，支持验证和转换
 *
 * @module core/story-lifecycle/story-model
 */

/**
 * Story 状态枚举
 */
const StoryStatus = {
  DRAFT: 'draft',
  READY: 'ready',
  IN_PROGRESS: 'in_progress',
  REVIEW: 'review',
  DONE: 'done',
  BLOCKED: 'blocked'
};

/**
 * Story 类型枚举
 */
const StoryType = {
  FEATURE: 'feature',
  BUGFIX: 'bugfix',
  REFACTOR: 'refactor',
  TEST: 'test',
  DOCS: 'docs',
  SPIKE: 'spike',
  CHORE: 'chore'
};

/**
 * Story 优先级枚举
 */
const StoryPriority = {
  P0: 'P0', // Critical
  P1: 'P1', // High
  P2: 'P2', // Medium
  P3: 'P3'  // Low
};

/**
 * Story 数据结构
 * @typedef {Object} Story
 * @property {string} id - Story ID (如 STORY-OPT-A1)
 * @property {string} title - 标题
 * @property {string} description - 描述
 * @property {string} type - 类型
 * @property {string} status - 状态
 * @property {string} priority - 优先级
 * @property {string} epicId - 所属 Epic ID
 * @property {string[]} dependencies - 依赖的 Story ID
 * @property {string[]} blockedBy - 被阻塞的 Story ID
 * @property {Object} progress - 进度信息
 * @property {string} assignee - 负责人
 * @property {string} createdAt - 创建时间
 * @property {string} updatedAt - 更新时间
 * @property {string} [completedAt] - 完成时间
 * @property {Object} [metadata] - 元数据
 */

/**
 * 默认 Story 模板
 */
const DEFAULT_STORY_TEMPLATE = {
  id: null,
  title: '',
  description: '',
  type: StoryType.FEATURE,
  status: StoryStatus.DRAFT,
  priority: StoryPriority.P2,
  epicId: null,
  dependencies: [],
  blockedBy: [],
  progress: {
    totalTasks: 0,
    completedTasks: 0,
    percentage: 0
  },
  assignee: null,
  createdAt: null,
  updatedAt: null,
  completedAt: null,
  metadata: {}
};

/**
 * Story 数据模型类
 */
class StoryModel {
  constructor() {
    this.statusEnum = StoryStatus;
    this.typeEnum = StoryType;
    this.priorityEnum = StoryPriority;
  }

  /**
   * 创建新的 Story 对象
   * @param {Object} data - Story 数据
   * @returns {Story}
   */
  create(data = {}) {
    const now = new Date().toISOString();

    return {
      ...DEFAULT_STORY_TEMPLATE,
      ...data,
      createdAt: data.createdAt || now,
      updatedAt: now
    };
  }

  /**
   * 验证 Story 数据
   * @param {Object} data - Story 数据
   * @returns {{ valid: boolean, errors: string[] }}
   */
  validate(data) {
    const errors = [];

    // 必填字段
    if (!data.title || data.title.trim() === '') {
      errors.push('Title is required');
    }

    // ID 格式验证
    if (data.id && !this._isValidId(data.id)) {
      errors.push('Invalid Story ID format (expected: STORY-XXX-NNN)');
    }

    // 状态验证
    if (data.status && !Object.values(StoryStatus).includes(data.status)) {
      errors.push(`Invalid status: ${data.status}`);
    }

    // 类型验证
    if (data.type && !Object.values(StoryType).includes(data.type)) {
      errors.push(`Invalid type: ${data.type}`);
    }

    // 优先级验证
    if (data.priority && !Object.values(StoryPriority).includes(data.priority)) {
      errors.push(`Invalid priority: ${data.priority}`);
    }

    // 进度验证
    if (data.progress) {
      if (data.progress.percentage < 0 || data.progress.percentage > 100) {
        errors.push('Progress percentage must be between 0 and 100');
      }
    }

    return {
      valid: errors.length === 0,
      errors
    };
  }

  /**
   * 验证 Story ID 格式
   * @param {string} id - Story ID
   * @returns {boolean}
   * @private
   */
  _isValidId(id) {
    return /^STORY-[A-Z]+-[A-Z]?\d+$/.test(id);
  }

  /**
   * 解析 Story ID
   * @param {string} id - Story ID
   * @returns {{ prefix: string, epic: string, number: string }|null}
   */
  parseId(id) {
    const match = id.match(/^(STORY)-([A-Z]+)-([A-Z]?\d+)$/);
    if (!match) return null;

    return {
      prefix: match[1],
      epic: match[2],
      number: match[3]
    };
  }

  /**
   * 生成 Story ID
   * @param {string} epicId - Epic ID
   * @param {number} number - 序号
   * @returns {string}
   */
  generateId(epicId, number) {
    if (!epicId) {
      return `STORY-XXX-${number}`;
    }
    const epicCode = epicId.replace(/^EPIC-/, '').replace(/-/g, '');
    return `STORY-${epicCode}-${number}`;
  }

  /**
   * 计算进度百分比
   * @param {number} completed - 已完成
   * @param {number} total - 总数
   * @returns {number}
   */
  calculateProgress(completed, total) {
    if (total === 0) return 0;
    return Math.round((completed / total) * 100);
  }

  /**
   * 转换为 YAML 前置格式
   * @param {Story} story - Story 对象
   * @returns {string}
   */
  toYamlFrontMatter(story) {
    const lines = ['---'];

    lines.push(`id: ${story.id || 'STORY-XXX-NNN'}`);
    lines.push(`title: "${story.title}"`);
    lines.push(`type: ${story.type}`);
    lines.push(`status: ${story.status}`);
    lines.push(`priority: ${story.priority}`);

    if (story.epicId) {
      lines.push(`epic: ${story.epicId}`);
    }

    if (story.assignee) {
      lines.push(`assignee: ${story.assignee}`);
    }

    if (story.dependencies && story.dependencies.length > 0) {
      lines.push(`dependencies: [${story.dependencies.join(', ')}]`);
    }

    lines.push(`created: ${story.createdAt}`);
    lines.push(`updated: ${story.updatedAt}`);

    if (story.completedAt) {
      lines.push(`completed: ${story.completedAt}`);
    }

    lines.push('---');

    return lines.join('\n');
  }

  /**
   * 从 YAML 前置格式解析
   * @param {string} content - Markdown 内容
   * @returns {Story|null}
   */
  fromYamlFrontMatter(content) {
    const match = content.match(/^---\n([\s\S]*?)\n---/);
    if (!match) return null;

    const yamlContent = match[1];
    const story = { ...DEFAULT_STORY_TEMPLATE };

    // 简单的 YAML 解析
    const lines = yamlContent.split('\n');
    for (const line of lines) {
      const [key, ...valueParts] = line.split(':');
      const value = valueParts.join(':').trim();

      switch (key.trim()) {
        case 'id':
          story.id = value;
          break;
        case 'title':
          story.title = value.replace(/^"|"$/g, '');
          break;
        case 'type':
          story.type = value;
          break;
        case 'status':
          story.status = value;
          break;
        case 'priority':
          story.priority = value;
          break;
        case 'epic':
          story.epicId = value;
          break;
        case 'assignee':
          story.assignee = value;
          break;
        case 'created':
          story.createdAt = value;
          break;
        case 'updated':
          story.updatedAt = value;
          break;
        case 'completed':
          story.completedAt = value;
          break;
      }
    }

    // 提取 Markdown 正文
    const bodyStart = content.indexOf('---', 4) + 3;
    story.body = content.substring(bodyStart).trim();

    return story;
  }

  /**
   * 克隆 Story
   * @param {Story} story - Story 对象
   * @param {Object} overrides - 覆盖字段
   * @returns {Story}
   */
  clone(story, overrides = {}) {
    return {
      ...JSON.parse(JSON.stringify(story)),
      ...overrides,
      updatedAt: new Date().toISOString()
    };
  }
}

module.exports = {
  StoryModel,
  StoryStatus,
  StoryType,
  StoryPriority,
  DEFAULT_STORY_TEMPLATE
};
