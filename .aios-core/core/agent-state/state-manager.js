/**
 * AgentStateManager - 代理状态管理器
 *
 * 追踪代理激活、切换和协作
 *
 * @module core/agent-state/state-manager
 */

const fs = require('fs');
const path = require('path');
const yaml = require('js-yaml');
const { ActivityLog, EventType } = require('./activity-log');
const { CollaborationTracker } = require('./collaboration-tracker');

/**
 * 活动代理信息
 * @typedef {Object} ActiveAgent
 * @property {string} id - 代理 ID
 * @property {string} activatedAt - 激活时间 (ISO)
 * @property {string} activationQuality - 激活质量 (full|partial|fallback)
 * @property {Object} context - 上下文信息
 */

/**
 * 激活结果
 * @typedef {Object} ActivationResult
 * @property {ActiveAgent} agent - 活动代理
 * @property {string} [previousAgent] - 前一个代理
 * @property {boolean} [handoff] - 是否为切换
 */

/**
 * 协作报告
 * @typedef {Object} CollaborationReport
 * @property {Object} graph - 协作图
 * @property {Array} handoffs - 切换记录
 * @property {Array} topCollaborations - 最频繁协作
 * @property {Object} agentStats - 代理统计
 */

/**
 * 代理状态管理器
 */
class AgentStateManager {
  /**
   * @param {string} projectRoot - 项目根目录
   */
  constructor(projectRoot) {
    this.projectRoot = projectRoot;
    this.stateFile = path.join(projectRoot, '.aios-core/data/agent-state.yaml');
    this.activityLog = new ActivityLog(projectRoot);
    this.collaborationTracker = new CollaborationTracker();
    this._state = null;
    this._loaded = false;
  }

  /**
   * 加载状态
   * @returns {Promise<void>}
   */
  async load() {
    if (this._loaded) return;

    try {
      if (fs.existsSync(this.stateFile)) {
        const content = fs.readFileSync(this.stateFile, 'utf8');
        const data = yaml.load(content);
        this._state = this._normalizeState(data);

        // 恢复协作追踪器状态
        if (this._state.collaborationData) {
          this.collaborationTracker.fromJSON(this._state.collaborationData);
        }
      } else {
        this._state = this._createDefaultState();
      }

      await this.activityLog.load();
      this._loaded = true;
    } catch (error) {
      this._state = this._createDefaultState();
      this._loaded = true;
    }
  }

  /**
   * 创建默认状态
   * @returns {Object}
   * @private
   */
  _createDefaultState() {
    return {
      version: '1.0',
      lastUpdated: new Date().toISOString(),
      activeAgent: null,
      history: [],
      handoffs: [],
      stats: {
        totalActivations: 0,
        totalHandoffs: 0,
        byAgent: {}
      },
      collaborationData: null
    };
  }

  /**
   * 规范化状态对象
   * @param {Object} data - 原始数据
   * @returns {Object}
   * @private
   */
  _normalizeState(data) {
    return {
      version: data.version || '1.0',
      lastUpdated: data.last_updated || data.lastUpdated || new Date().toISOString(),
      activeAgent: data.active_agent || data.activeAgent || null,
      history: data.history || [],
      handoffs: data.handoffs || [],
      stats: {
        totalActivations: data.stats?.total_activations || data.stats?.totalActivations || 0,
        totalHandoffs: data.stats?.total_handoffs || data.stats?.totalHandoffs || 0,
        byAgent: data.stats?.by_agent || data.stats?.byAgent || {}
      },
      collaborationData: data.collaborationData || null
    };
  }

  /**
   * 持久化状态
   * @returns {Promise<void>}
   */
  async save() {
    const dir = path.dirname(this.stateFile);
    if (!fs.existsSync(dir)) {
      fs.mkdirSync(dir, { recursive: true });
    }

    // 保存协作追踪器状态
    this._state.collaborationData = this.collaborationTracker.toJSON();
    this._state.lastUpdated = new Date().toISOString();

    const data = {
      version: this._state.version,
      last_updated: this._state.lastUpdated,
      active_agent: this._state.activeAgent,
      history: this._state.history,
      handoffs: this._state.handoffs,
      stats: {
        total_activations: this._state.stats.totalActivations,
        total_handoffs: this._state.stats.totalHandoffs,
        by_agent: this._state.stats.byAgent
      },
      collaborationData: this._state.collaborationData
    };

    fs.writeFileSync(this.stateFile, yaml.dump(data, { indent: 2 }));
  }

  /**
   * 激活代理
   * @param {string} agentId - 代理 ID
   * @param {Object} options - 激活选项
   * @returns {Promise<ActivationResult>}
   */
  async activateAgent(agentId, options = {}) {
    await this.load();

    const previousAgent = this.getActiveAgent();
    const timestamp = new Date().toISOString();
    let handoff = false;

    // 记录切换事件
    if (previousAgent && previousAgent.id !== agentId) {
      handoff = true;
      await this._recordHandoff(previousAgent.id, agentId, {
        ...options,
        timestamp
      });
    }

    // 更新活动代理
    this._state.activeAgent = {
      id: agentId,
      activatedAt: timestamp,
      activationQuality: options.quality || 'full',
      context: options.context || {}
    };

    // 添加到历史
    this._state.history.push({
      event: 'activate',
      agentId,
      timestamp,
      previousAgent: previousAgent?.id || null
    });

    // 更新统计
    this._state.stats.totalActivations++;
    if (!this._state.stats.byAgent[agentId]) {
      this._state.stats.byAgent[agentId] = {
        activations: 0,
        timeActive: 0
      };
    }
    this._state.stats.byAgent[agentId].activations++;

    // 记录活动日志
    await this.activityLog.addActivation(agentId, {
      previousAgent: previousAgent?.id,
      context: options.context
    });

    await this.save();

    return {
      agent: this._state.activeAgent,
      previousAgent: previousAgent?.id,
      handoff
    };
  }

  /**
   * 停用当前代理
   * @param {Object} options - 停用选项
   * @returns {Promise<Object>}
   */
  async deactivateAgent(options = {}) {
    await this.load();

    const currentAgent = this.getActiveAgent();
    if (!currentAgent) {
      return { deactivated: false, reason: 'no_active_agent' };
    }

    const timestamp = new Date().toISOString();

    // 计算活跃时间
    const activatedAt = new Date(currentAgent.activatedAt);
    const timeActive = Date.now() - activatedAt.getTime();

    // 更新统计
    if (this._state.stats.byAgent[currentAgent.id]) {
      this._state.stats.byAgent[currentAgent.id].timeActive += timeActive;
    }

    // 添加到历史
    this._state.history.push({
      event: 'deactivate',
      agentId: currentAgent.id,
      timestamp,
      duration: timeActive
    });

    // 记录活动日志
    await this.activityLog.addDeactivation(currentAgent.id, {
      reason: options.reason,
      context: options.context
    });

    this._state.activeAgent = null;
    await this.save();

    return {
      deactivated: true,
      agent: currentAgent,
      timeActive
    };
  }

  /**
   * 记录代理切换
   * @param {string} fromAgent - 源代理
   * @param {string} toAgent - 目标代理
   * @param {Object} options - 选项
   * @returns {Promise<Object>}
   * @private
   */
  async _recordHandoff(fromAgent, toAgent, options = {}) {
    const handoff = {
      from: fromAgent,
      to: toAgent,
      timestamp: options.timestamp || new Date().toISOString(),
      reason: options.reason || 'user_request',
      context: options.context || {}
    };

    this._state.handoffs.push(handoff);
    this._state.stats.totalHandoffs++;

    // 记录协作
    this.collaborationTracker.recordCollaboration(fromAgent, toAgent, handoff);

    // 记录活动日志
    await this.activityLog.addHandoff(fromAgent, toAgent, options);

    return handoff;
  }

  /**
   * 获取当前活动代理
   * @returns {ActiveAgent|null}
   */
  getActiveAgent() {
    return this._state?.activeAgent || null;
  }

  /**
   * 获取代理历史
   * @param {Object} options - 过滤选项
   * @returns {Array}
   */
  getAgentHistory(options = {}) {
    let history = this._state?.history || [];

    if (options.agentId) {
      history = history.filter(h => h.agentId === options.agentId);
    }

    if (options.eventType) {
      history = history.filter(h => h.event === options.eventType);
    }

    if (options.limit) {
      history = history.slice(-options.limit);
    }

    return history;
  }

  /**
   * 获取切换记录
   * @param {Object} options - 过滤选项
   * @returns {Array}
   */
  getHandoffs(options = {}) {
    let handoffs = this._state?.handoffs || [];

    if (options.from) {
      handoffs = handoffs.filter(h => h.from === options.from);
    }

    if (options.to) {
      handoffs = handoffs.filter(h => h.to === options.to);
    }

    if (options.limit) {
      handoffs = handoffs.slice(-options.limit);
    }

    return handoffs;
  }

  /**
   * 获取协作图
   * @returns {Object}
   */
  getCollaborationGraph() {
    return this.collaborationTracker.getGraph();
  }

  /**
   * 获取协作报告
   * @returns {CollaborationReport}
   */
  getCollaborationReport() {
    return {
      graph: this.getCollaborationGraph(),
      handoffs: this._state?.handoffs || [],
      topCollaborations: this.collaborationTracker.getTopCollaborations(),
      agentStats: this._getAgentStats()
    };
  }

  /**
   * 获取代理统计
   * @returns {Object}
   * @private
   */
  _getAgentStats() {
    const stats = {};

    for (const [agentId, data] of Object.entries(this._state?.stats?.byAgent || {})) {
      stats[agentId] = {
        activations: data.activations || 0,
        timeActive: this._formatDuration(data.timeActive || 0)
      };
    }

    return stats;
  }

  /**
   * 格式化持续时间
   * @param {number} ms - 毫秒
   * @returns {string}
   * @private
   */
  _formatDuration(ms) {
    const seconds = Math.floor(ms / 1000);
    const minutes = Math.floor(seconds / 60);
    const hours = Math.floor(minutes / 60);

    if (hours > 0) {
      return `${hours}h ${minutes % 60}m`;
    } else if (minutes > 0) {
      return `${minutes}m ${seconds % 60}s`;
    } else {
      return `${seconds}s`;
    }
  }

  /**
   * 获取状态统计
   * @returns {Object}
   */
  getStats() {
    return {
      totalActivations: this._state?.stats?.totalActivations || 0,
      totalHandoffs: this._state?.stats?.totalHandoffs || 0,
      byAgent: this._getAgentStats()
    };
  }

  /**
   * 重置状态
   * @returns {Promise<void>}
   */
  async reset() {
    this._state = this._createDefaultState();
    this.collaborationTracker.clear();
    await this.activityLog.clear();
    await this.save();
  }

  /**
   * 获取活动日志
   * @param {Object} options - 过滤选项
   * @returns {Promise<Array>}
   */
  async getActivityLog(options = {}) {
    return this.activityLog.getEntries(options);
  }
}

module.exports = {
  AgentStateManager,
  EventType
};
