/**
 * AgentRouter - 代理路由器
 *
 * 智能推荐最适合任务的代理
 *
 * @module core/agent-state/router
 */

const fs = require('fs');
const path = require('path');
const yaml = require('js-yaml');
const { TaskClassifier } = require('./task-classifier');

/**
 * 代理能力定义
 * @typedef {Object} AgentCapability
 * @property {string} name - 代理名称
 * @property {string} description - 描述
 * @property {string[]} task_types - 任务类型
 * @property {Object[]} keywords - 关键词模式
 * @property {string[]} expertise - 专长
 * @property {string[]} preferred_story_types - 首选 Story 类型
 * @property {number} priority - 优先级
 */

/**
 * 路由结果
 * @typedef {Object} RoutingResult
 * @property {Object} recommendation - 推荐代理
 * @property {Object[]} alternatives - 备选代理
 * @property {Object} classification - 任务分类
 * @property {number} confidence - 置信度
 */

/**
 * 代理路由器类
 */
class AgentRouter {
  /**
   * @param {Object} options - 选项
   * @param {string} [options.capabilitiesPath] - 能力定义文件路径
   * @param {Object} [options.stateManager] - AgentStateManager 实例
   */
  constructor(options = {}) {
    this.capabilitiesPath = options.capabilitiesPath;
    this.stateManager = options.stateManager;
    this.classifier = new TaskClassifier();
    this.capabilities = null;
    this.routingHistory = [];
  }

  /**
   * 加载代理能力定义
   * @returns {Promise<Object>}
   */
  async loadCapabilities() {
    if (this.capabilities) {
      return this.capabilities;
    }

    // 默认路径
    const defaultPath = path.join(__dirname, 'agent-capabilities.yaml');
    const filePath = this.capabilitiesPath || defaultPath;

    try {
      if (fs.existsSync(filePath)) {
        const content = fs.readFileSync(filePath, 'utf8');
        this.capabilities = yaml.load(content);
      } else {
        // 使用内置的最小能力集
        this.capabilities = this._getDefaultCapabilities();
      }
    } catch (error) {
      this.capabilities = this._getDefaultCapabilities();
    }

    return this.capabilities;
  }

  /**
   * 获取默认能力集
   * @returns {Object}
   * @private
   */
  _getDefaultCapabilities() {
    return {
      dev: {
        name: 'Developer',
        task_types: ['implementation', 'bugfix', 'refactoring'],
        keywords: [{ pattern: '(implement|code|build|fix)' }],
        expertise: ['Code implementation'],
        priority: 1
      },
      qa: {
        name: 'QA Engineer',
        task_types: ['testing', 'review', 'quality'],
        keywords: [{ pattern: '(test|review|verify)' }],
        expertise: ['Testing'],
        priority: 2
      },
      architect: {
        name: 'Architect',
        task_types: ['architecture', 'design', 'planning'],
        keywords: [{ pattern: '(architect|design|plan)' }],
        expertise: ['System design'],
        priority: 2
      },
      pm: {
        name: 'Product Manager',
        task_types: ['planning', 'requirements', 'prd'],
        keywords: [{ pattern: '(prd|plan|requirement)' }],
        expertise: ['Product planning'],
        priority: 1
      }
    };
  }

  /**
   * 路由任务到最合适的代理
   * @param {string} taskDescription - 任务描述
   * @param {Object} context - 上下文
   * @returns {Promise<RoutingResult>}
   */
  async route(taskDescription, context = {}) {
    await this.loadCapabilities();

    // 分类任务
    const classification = this.classifier.classify(taskDescription);

    // 获取所有匹配的代理
    const matches = this._findMatchingAgents(classification, context);

    // 计算相关性得分
    const scored = matches.map(agent => ({
      ...agent,
      score: this._calculateScore(agent, classification, context)
    }));

    // 排序
    scored.sort((a, b) => {
      if (b.score !== a.score) return b.score - a.score;
      return (a.priority || 99) - (b.priority || 99);
    });

    // 获取推荐
    const recommendation = scored[0] || null;
    const alternatives = scored.slice(1, 4);

    // 记录路由历史
    this._recordRouting(taskDescription, recommendation, classification);

    return {
      recommendation,
      alternatives,
      classification,
      confidence: recommendation?.score || 0
    };
  }

  /**
   * 查找匹配的代理
   * @param {Object} classification - 分类结果
   * @param {Object} context - 上下文
   * @returns {Object[]}
   * @private
   */
  _findMatchingAgents(classification, context) {
    const matches = [];

    for (const [agentId, agent] of Object.entries(this.capabilities)) {
      let matchScore = 0;

      // 任务类型匹配
      const taskTypes = agent.task_types || agent.taskTypes || [];
      const typeMatches = classification.types.filter(t => taskTypes.includes(t));
      if (typeMatches.length > 0) {
        matchScore += typeMatches.length * 10;
      }

      // 关键词匹配
      const keywordPatterns = agent.keywords || [];
      for (const keyword of classification.keywords) {
        for (const kp of keywordPatterns) {
          const pattern = kp.pattern || kp;
          try {
            const regex = new RegExp(pattern, 'i');
            if (regex.test(keyword)) {
              matchScore += 5;
            }
          } catch (e) {
            // 无效正则，跳过
          }
        }
      }

      // Story 类型匹配
      const preferredStoryTypes = agent.preferred_story_types || agent.preferredStoryTypes || [];
      if (context.storyType && preferredStoryTypes.includes(context.storyType)) {
        matchScore += 15;
      }

      if (matchScore > 0) {
        matches.push({
          id: agentId,
          name: agent.name,
          description: agent.description,
          taskTypes: taskTypes,
          expertise: agent.expertise,
          priority: agent.priority || 99,
          matchScore
        });
      }
    }

    // 如果没有匹配，返回所有代理（按优先级排序）
    if (matches.length === 0) {
      for (const [agentId, agent] of Object.entries(this.capabilities)) {
        matches.push({
          id: agentId,
          name: agent.name,
          description: agent.description,
          taskTypes: agent.task_types || agent.taskTypes || [],
          expertise: agent.expertise,
          priority: agent.priority || 99,
          matchScore: 0
        });
      }
    }

    return matches;
  }

  /**
   * 计算相关性得分
   * @param {Object} agent - 代理
   * @param {Object} classification - 分类结果
   * @param {Object} context - 上下文
   * @returns {number}
   * @private
   */
  _calculateScore(agent, classification, context) {
    let score = agent.matchScore || 0;

    // 归一化到 0-100
    score = Math.min(score, 100);

    // 上下文加分
    if (context.storyType) {
      const preferredTypes = agent.preferredStoryTypes || agent.preferred_story_types || [];
      if (preferredTypes.includes(context.storyType)) {
        score += 10;
      }
    }

    // 用户偏好学习
    const preferenceBoost = this._getUserPreference(agent.id, classification);
    score += preferenceBoost * 5;

    return Math.min(score, 100);
  }

  /**
   * 获取用户偏好
   * @param {string} agentId - 代理 ID
   * @param {Object} classification - 分类结果
   * @returns {number}
   * @private
   */
  _getUserPreference(agentId, classification) {
    // 检查历史路由中相同类型任务的选择
    const similarRoutes = this.routingHistory.filter(r =>
      r.classification.primaryType === classification.primaryType
    );

    if (similarRoutes.length === 0) return 0;

    const selectedCount = similarRoutes.filter(r =>
      r.selectedAgent === agentId || r.recommendation?.id === agentId
    ).length;

    return selectedCount / similarRoutes.length;
  }

  /**
   * 记录路由历史
   * @param {string} taskDescription - 任务描述
   * @param {Object} recommendation - 推荐
   * @param {Object} classification - 分类
   * @private
   */
  _recordRouting(taskDescription, recommendation, classification) {
    this.routingHistory.push({
      task: taskDescription.substring(0, 100),
      recommendation: recommendation ? { id: recommendation.id, name: recommendation.name } : null,
      classification: {
        primaryType: classification.primaryType,
        types: classification.types.slice(0, 3)
      },
      timestamp: new Date().toISOString()
    });

    // 限制历史记录数量
    if (this.routingHistory.length > 100) {
      this.routingHistory = this.routingHistory.slice(-100);
    }
  }

  /**
   * 解释推荐理由
   * @param {string} agentId - 代理 ID
   * @param {string} taskDescription - 任务描述
   * @returns {Promise<Object>}
   */
  async explain(agentId, taskDescription) {
    await this.loadCapabilities();

    const classification = this.classifier.classify(taskDescription);
    const agent = this.capabilities[agentId];

    if (!agent) {
      return { explanation: `Unknown agent: ${agentId}`, found: false };
    }

    const reasons = [];

    // 匹配的任务类型
    const taskTypes = agent.task_types || agent.taskTypes || [];
    const matchedTypes = classification.types.filter(t => taskTypes.includes(t));
    if (matchedTypes.length > 0) {
      reasons.push(`匹配任务类型: ${matchedTypes.join(', ')}`);
    }

    // 匹配的关键词
    const matchedKeywords = [];
    const keywordPatterns = agent.keywords || [];
    for (const keyword of classification.keywords) {
      for (const kp of keywordPatterns) {
        const pattern = kp.pattern || kp;
        try {
          const regex = new RegExp(pattern, 'i');
          if (regex.test(keyword)) {
            matchedKeywords.push(keyword);
          }
        } catch (e) {
          // 跳过无效正则
        }
      }
    }
    if (matchedKeywords.length > 0) {
      reasons.push(`匹配关键词: ${[...new Set(matchedKeywords)].slice(0, 5).join(', ')}`);
    }

    // 代理专长
    if (agent.expertise && agent.expertise.length > 0) {
      reasons.push(`专长领域: ${agent.expertise.join(', ')}`);
    }

    // 计算得分
    const matches = this._findMatchingAgents(classification, {});
    const agentMatch = matches.find(m => m.id === agentId);
    const score = agentMatch ? this._calculateScore(agentMatch, classification, {}) : 0;

    return {
      agentId,
      agentName: agent.name,
      description: agent.description,
      score,
      reasons,
      capabilities: {
        taskTypes: taskTypes,
        expertise: agent.expertise
      },
      found: true
    };
  }

  /**
   * 获取所有代理能力
   * @returns {Promise<Object>}
   */
  async getAllCapabilities() {
    await this.loadCapabilities();
    return this.capabilities;
  }

  /**
   * 记录用户选择（用于学习）
   * @param {string} taskDescription - 任务描述
   * @param {string} selectedAgentId - 选择的代理 ID
   */
  recordUserChoice(taskDescription, selectedAgentId) {
    const classification = this.classifier.classify(taskDescription);

    // 查找并更新历史记录
    const lastRoute = this.routingHistory[this.routingHistory.length - 1];
    if (lastRoute && lastRoute.task === taskDescription.substring(0, 100)) {
      lastRoute.selectedAgent = selectedAgentId;
    }
  }

  /**
   * 获取路由历史
   * @param {Object} options - 过滤选项
   * @returns {Object[]}
   */
  getRoutingHistory(options = {}) {
    let history = [...this.routingHistory];

    if (options.agentId) {
      history = history.filter(h =>
        h.recommendation?.id === options.agentId || h.selectedAgent === options.agentId
      );
    }

    if (options.limit) {
      history = history.slice(-options.limit);
    }

    return history;
  }

  /**
   * 清除路由历史
   */
  clearHistory() {
    this.routingHistory = [];
  }
}

module.exports = {
  AgentRouter
};
