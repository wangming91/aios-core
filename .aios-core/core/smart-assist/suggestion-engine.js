/**
 * SuggestionEngine - 智能建议引擎
 *
 * 基于上下文和历史数据提供智能建议
 *
 * @module core/smart-assist/suggestion-engine
 */

const fs = require('fs');
const path = require('path');
const yaml = require('js-yaml');

/**
 * 建议结果
 * @typedef {Object} Suggestion
 * @property {string} id - 建议 ID
 * @property {string} type - 建议类型
 * @property {string} title - 标题
 * @property {string} description - 描述
 * @property {number} confidence - 置信度 (0-100)
 * @property {string} action - 建议操作
 * @property {string[]} tags - 标签
 */

/**
 * 上下文数据
 * @typedef {Object} ContextData
 * @property {string} currentCommand - 当前命令
 * @property {string} currentAgent - 当前代理
 * @property {string} currentStory - 当前 Story
 * @property {string[]} recentCommands - 最近命令
 * @property {string[]} recentErrors - 最近错误
 * @property {string} workingDirectory - 工作目录
 */

/**
 * 智能建议引擎
 */
class SuggestionEngine {
  /**
   * @param {string} projectRoot - 项目根目录
   * @param {Object} options - 选项
   */
  constructor(projectRoot, options = {}) {
    this.projectRoot = projectRoot;
    this.historyFile = options.historyFile ||
      path.join(projectRoot, '.aios-core/data/suggestion-history.json');
    this.patternsFile = options.patternsFile ||
      path.join(projectRoot, '.aios-core/data/suggestion-patterns.yaml');
    this.history = [];
    this.patterns = [];
    this.initialized = false;
  }

  /**
   * 初始化引擎
   * @returns {Promise<void>}
   */
  async initialize() {
    if (this.initialized) {
      return;
    }

    await this._loadHistory();
    await this._loadPatterns();
    this.initialized = true;
  }

  /**
   * 加载历史数据
   * @private
   */
  async _loadHistory() {
    if (fs.existsSync(this.historyFile)) {
      try {
        const data = JSON.parse(fs.readFileSync(this.historyFile, 'utf8'));
        this.history = data || [];
      } catch (error) {
        this.history = [];
      }
    }
  }

  /**
   * 加载模式数据
   * @private
   */
  async _loadPatterns() {
    // 内置模式
    this.patterns = this._getBuiltInPatterns();

    // 尝试加载自定义模式
    if (fs.existsSync(this.patternsFile)) {
      try {
        const content = fs.readFileSync(this.patternsFile, 'utf8');
        const customPatterns = yaml.load(content) || [];
        this.patterns = [...this.patterns, ...customPatterns];
      } catch (error) {
        // 忽略加载错误
      }
    }
  }

  /**
   * 获取内置模式
   * @returns {Object[]}
   * @private
   */
  _getBuiltInPatterns() {
    return [
      // 新用户模式
      {
        id: 'new-user-onboarding',
        triggers: { recentCommands: { max: 5 } },
        suggestions: [{
          type: 'onboarding',
          title: 'Get Started with Quickstart',
          description: 'Run quickstart to learn AIOS basics',
          action: 'aios quickstart',
          confidence: 90
        }]
      },
      // 错误恢复模式
      {
        id: 'error-recovery',
        triggers: { recentErrors: { min: 1 } },
        suggestions: [{
          type: 'recovery',
          title: 'Run Diagnostics',
          description: 'Diagnose and fix recent errors',
          action: 'aios doctor --fix',
          confidence: 85
        }]
      },
      // Story 工作流模式
      {
        id: 'story-workflow',
        triggers: { currentCommand: /^story/ },
        suggestions: [
          {
            type: 'workflow',
            title: 'Check Story Progress',
            description: 'View overall story progress',
            action: 'aios story visualize',
            confidence: 70
          },
          {
            type: 'next-step',
            title: 'Start Next Story',
            description: 'Find the next story to work on',
            action: 'aios story list --status ready',
            confidence: 65
          }
        ]
      },
      // Agent 协作模式
      {
        id: 'agent-collaboration',
        triggers: { currentCommand: /^agents/ },
        suggestions: [
          {
            type: 'workflow',
            title: 'Route a Task',
            description: 'Find the best agent for a task',
            action: 'aios agents route "your task"',
            confidence: 75
          },
          {
            type: 'info',
            title: 'View Agent Status',
            description: 'Check current agent state',
            action: 'aios agents status',
            confidence: 65
          }
        ]
      },
      // 配置模式
      {
        id: 'config-workflow',
        triggers: { currentCommand: /^config/ },
        suggestions: [
          {
            type: 'workflow',
            title: 'Validate Configuration',
            description: 'Check configuration validity',
            action: 'aios config validate',
            confidence: 70
          },
          {
            type: 'help',
            title: 'Run Config Wizard',
            description: 'Interactive configuration setup',
            action: 'aios config wizard',
            confidence: 60
          }
        ]
      },
      // 开发模式
      {
        id: 'dev-workflow',
        triggers: { workingDirectory: /src|packages|core/ },
        suggestions: [
          {
            type: 'quality',
            title: 'Run Tests',
            description: 'Execute test suite',
            action: 'npm test',
            confidence: 60
          },
          {
            type: 'quality',
            title: 'Run Linting',
            description: 'Check code quality',
            action: 'npm run lint',
            confidence: 55
          }
        ]
      },
      // 长时间工作模式
      {
        id: 'long-session',
        triggers: { sessionDuration: { min: 3600000 } }, // 1 hour
        suggestions: [{
          type: 'wellness',
          title: 'Take a Break',
          description: 'You have been working for a while',
          action: null,
          confidence: 50
        }]
      }
    ];
  }

  /**
   * 获取建议
   * @param {ContextData} context - 上下文数据
   * @returns {Promise<Suggestion[]>}
   */
  async getSuggestions(context) {
    await this.initialize();

    const suggestions = [];

    for (const pattern of this.patterns) {
      if (this._matchesPattern(pattern, context)) {
        for (const suggestion of pattern.suggestions || []) {
          suggestions.push({
            id: `${pattern.id}-${suggestion.type}`,
            type: suggestion.type,
            title: suggestion.title,
            description: suggestion.description,
            action: suggestion.action,
            confidence: suggestion.confidence || 50,
            tags: suggestion.tags || []
          });
        }
      }
    }

    // 根据历史调整置信度
    this._adjustConfidence(suggestions, context);

    // 按置信度排序
    suggestions.sort((a, b) => b.confidence - a.confidence);

    return suggestions;
  }

  /**
   * 检查模式是否匹配
   * @param {Object} pattern - 模式
   * @param {ContextData} context - 上下文
   * @returns {boolean}
   * @private
   */
  _matchesPattern(pattern, context) {
    const triggers = pattern.triggers;
    if (!triggers) {
      return false;
    }

    // 检查命令触发
    if (triggers.currentCommand && context.currentCommand) {
      if (triggers.currentCommand instanceof RegExp) {
        if (!triggers.currentCommand.test(context.currentCommand)) {
          return false;
        }
      } else if (!context.currentCommand.includes(triggers.currentCommand)) {
        return false;
      }
    }

    // 检查最近命令数量
    if (triggers.recentCommands) {
      const count = context.recentCommands?.length || 0;
      if (triggers.recentCommands.max && count > triggers.recentCommands.max) {
        return false;
      }
      if (triggers.recentCommands.min && count < triggers.recentCommands.min) {
        return false;
      }
    }

    // 检查错误
    if (triggers.recentErrors) {
      const count = context.recentErrors?.length || 0;
      if (triggers.recentErrors.min && count < triggers.recentErrors.min) {
        return false;
      }
    }

    // 检查工作目录
    if (triggers.workingDirectory && context.workingDirectory) {
      if (triggers.workingDirectory instanceof RegExp) {
        if (!triggers.workingDirectory.test(context.workingDirectory)) {
          return false;
        }
      } else if (!context.workingDirectory.includes(triggers.workingDirectory)) {
        return false;
      }
    }

    return true;
  }

  /**
   * 根据历史调整置信度
   * @param {Suggestion[]} suggestions - 建议列表
   * @param {ContextData} context - 上下文
   * @private
   */
  _adjustConfidence(suggestions, context) {
    for (const suggestion of suggestions) {
      // 检查是否最近被接受
      const recentAccepts = this.history.filter(h =>
        h.suggestionId === suggestion.id &&
        h.accepted &&
        Date.now() - h.timestamp < 86400000 * 7 // 7 days
      );

      if (recentAccepts.length > 0) {
        // 如果最近接受过，提高置信度
        suggestion.confidence = Math.min(100, suggestion.confidence + 10);
      }

      // 检查是否最近被拒绝
      const recentRejects = this.history.filter(h =>
        h.suggestionId === suggestion.id &&
        !h.accepted &&
        Date.now() - h.timestamp < 86400000 // 1 day
      );

      if (recentRejects.length > 0) {
        // 如果最近拒绝过，降低置信度
        suggestion.confidence = Math.max(0, suggestion.confidence - 20);
      }
    }
  }

  /**
   * 记录建议反馈
   * @param {string} suggestionId - 建议 ID
   * @param {boolean} accepted - 是否接受
   * @param {ContextData} context - 上下文
   * @returns {Promise<void>}
   */
  async recordFeedback(suggestionId, accepted, context) {
    await this.initialize();

    this.history.push({
      suggestionId,
      accepted,
      context: {
        command: context.currentCommand,
        directory: context.workingDirectory
      },
      timestamp: Date.now()
    });

    // 保存历史
    this._saveHistory();
  }

  /**
   * 保存历史
   * @private
   */
  _saveHistory() {
    const dir = path.dirname(this.historyFile);
    if (!fs.existsSync(dir)) {
      fs.mkdirSync(dir, { recursive: true });
    }

    // 只保留最近 1000 条记录
    const trimmed = this.history.slice(-1000);
    fs.writeFileSync(this.historyFile, JSON.stringify(trimmed, null, 2), 'utf8');
  }

  /**
   * 获取学习模式建议
   * @param {string} topic - 学习主题
   * @returns {Promise<Object>}
   */
  async getLearningPath(topic) {
    await this.initialize();

    const learningPaths = {
      'getting-started': {
        title: 'Getting Started with AIOS',
        steps: [
          { title: 'Install AIOS', command: 'npx aios-core install' },
          { title: 'Run Quickstart', command: 'aios quickstart' },
          { title: 'Take the Tour', command: 'aios tour first-run' },
          { title: 'Create Your First Story', command: 'aios story create --title "My First Story"' }
        ]
      },
      'agents': {
        title: 'Working with Agents',
        steps: [
          { title: 'List Available Agents', command: 'aios agents list' },
          { title: 'Check Agent Status', command: 'aios agents status' },
          { title: 'Route a Task', command: 'aios agents route "implement feature"' },
          { title: 'View History', command: 'aios agents history' }
        ]
      },
      'stories': {
        title: 'Story-Driven Development',
        steps: [
          { title: 'List Stories', command: 'aios story list' },
          { title: 'Create a Story', command: 'aios story create --title "New Feature"' },
          { title: 'Track Progress', command: 'aios story progress STORY-ID' },
          { title: 'Visualize Progress', command: 'aios story visualize' }
        ]
      },
      'configuration': {
        title: 'Configuration Management',
        steps: [
          { title: 'View Configuration', command: 'aios config show' },
          { title: 'Run Config Wizard', command: 'aios config wizard' },
          { title: 'Validate Configuration', command: 'aios config validate' }
        ]
      },
      'troubleshooting': {
        title: 'Troubleshooting',
        steps: [
          { title: 'Run Doctor', command: 'aios doctor' },
          { title: 'Diagnose Issue', command: 'aios diagnose <error-code>' },
          { title: 'Auto-Fix', command: 'aios fix <error-code>' }
        ]
      }
    };

    return learningPaths[topic] || null;
  }

  /**
   * 获取可用学习主题
   * @returns {string[]}
   */
  getAvailableTopics() {
    return ['getting-started', 'agents', 'stories', 'configuration', 'troubleshooting'];
  }
}

module.exports = {
  SuggestionEngine
};
