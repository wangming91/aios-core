/**
 * ActivityLog - 代理活动日志
 *
 * 记录代理激活、停用和切换事件
 *
 * @module core/agent-state/activity-log
 */

const fs = require('fs');
const path = require('path');
const yaml = require('js-yaml');

/**
 * 活动事件类型
 */
const EventType = {
  ACTIVATE: 'activate',
  DEACTIVATE: 'deactivate',
  HANDOFF: 'handoff',
  COLLABORATION: 'collaboration'
};

/**
 * 活动日志条目
 * @typedef {Object} ActivityLogEntry
 * @property {string} event - 事件类型
 * @property {string} agentId - 代理 ID
 * @property {string} timestamp - ISO 时间戳
 * @property {string} [previousAgent] - 前一个代理 (handoff 时)
 * @property {string} [targetAgent] - 目标代理 (handoff 时)
 * @property {Object} [context] - 上下文信息
 */

/**
 * 活动日志类
 */
class ActivityLog {
  /**
   * @param {string} projectRoot - 项目根目录
   */
  constructor(projectRoot) {
    this.projectRoot = projectRoot;
    this.logFile = path.join(projectRoot, '.aios-core/data/activity-log.yaml');
    this._entries = [];
    this._loaded = false;
  }

  /**
   * 加载日志
   * @returns {Promise<void>}
   */
  async load() {
    if (this._loaded) return;

    try {
      if (fs.existsSync(this.logFile)) {
        const content = fs.readFileSync(this.logFile, 'utf8');
        const data = yaml.load(content);
        this._entries = data?.entries || [];
      } else {
        this._entries = [];
      }
      this._loaded = true;
    } catch (error) {
      // 文件不存在或解析失败，使用空数组
      this._entries = [];
      this._loaded = true;
    }
  }

  /**
   * 持久化日志
   * @returns {Promise<void>}
   */
  async save() {
    const dir = path.dirname(this.logFile);
    if (!fs.existsSync(dir)) {
      fs.mkdirSync(dir, { recursive: true });
    }

    const data = {
      version: '1.0',
      last_updated: new Date().toISOString(),
      total_entries: this._entries.length,
      entries: this._entries
    };

    fs.writeFileSync(this.logFile, yaml.dump(data, { indent: 2 }));
  }

  /**
   * 添加激活事件
   * @param {string} agentId - 代理 ID
   * @param {Object} options - 选项
   * @returns {Promise<ActivityLogEntry>}
   */
  async addActivation(agentId, options = {}) {
    await this.load();

    const entry = {
      event: EventType.ACTIVATE,
      agentId,
      timestamp: new Date().toISOString(),
      previousAgent: options.previousAgent || null,
      context: options.context || {}
    };

    this._entries.push(entry);
    await this.save();

    return entry;
  }

  /**
   * 添加停用事件
   * @param {string} agentId - 代理 ID
   * @param {Object} options - 选项
   * @returns {Promise<ActivityLogEntry>}
   */
  async addDeactivation(agentId, options = {}) {
    await this.load();

    const entry = {
      event: EventType.DEACTIVATE,
      agentId,
      timestamp: new Date().toISOString(),
      reason: options.reason || 'user_request',
      context: options.context || {}
    };

    this._entries.push(entry);
    await this.save();

    return entry;
  }

  /**
   * 添加切换事件
   * @param {string} fromAgent - 源代理
   * @param {string} toAgent - 目标代理
   * @param {Object} options - 选项
   * @returns {Promise<ActivityLogEntry>}
   */
  async addHandoff(fromAgent, toAgent, options = {}) {
    await this.load();

    const entry = {
      event: EventType.HANDOFF,
      agentId: fromAgent,
      targetAgent: toAgent,
      timestamp: new Date().toISOString(),
      reason: options.reason || 'task_delegation',
      context: options.context || {}
    };

    this._entries.push(entry);
    await this.save();

    return entry;
  }

  /**
   * 获取所有条目
   * @param {Object} options - 过滤选项
   * @returns {Promise<ActivityLogEntry[]>}
   */
  async getEntries(options = {}) {
    await this.load();

    let entries = [...this._entries];

    if (options.agentId) {
      entries = entries.filter(e =>
        e.agentId === options.agentId || e.targetAgent === options.agentId
      );
    }

    if (options.eventType) {
      entries = entries.filter(e => e.event === options.eventType);
    }

    if (options.limit) {
      entries = entries.slice(-options.limit);
    }

    if (options.since) {
      const sinceDate = new Date(options.since);
      entries = entries.filter(e => new Date(e.timestamp) >= sinceDate);
    }

    return entries;
  }

  /**
   * 获取代理统计
   * @returns {Promise<Object>}
   */
  async getStats() {
    await this.load();

    const stats = {
      totalEntries: this._entries.length,
      byEventType: {},
      byAgent: {},
      handoffs: {
        total: 0,
        pairs: {}
      }
    };

    for (const entry of this._entries) {
      // 按事件类型统计
      stats.byEventType[entry.event] = (stats.byEventType[entry.event] || 0) + 1;

      // 按代理统计
      if (!stats.byAgent[entry.agentId]) {
        stats.byAgent[entry.agentId] = {
          activations: 0,
          deactivations: 0,
          handoffsFrom: 0,
          handoffsTo: 0
        };
      }

      if (entry.event === EventType.ACTIVATE) {
        stats.byAgent[entry.agentId].activations++;
      } else if (entry.event === EventType.DEACTIVATE) {
        stats.byAgent[entry.agentId].deactivations++;
      } else if (entry.event === EventType.HANDOFF) {
        stats.byAgent[entry.agentId].handoffsFrom++;
        stats.handoffs.total++;

        if (entry.targetAgent) {
          if (!stats.byAgent[entry.targetAgent]) {
            stats.byAgent[entry.targetAgent] = {
              activations: 0,
              deactivations: 0,
              handoffsFrom: 0,
              handoffsTo: 0
            };
          }
          stats.byAgent[entry.targetAgent].handoffsTo++;

          const pairKey = `${entry.agentId}->${entry.targetAgent}`;
          stats.handoffs.pairs[pairKey] = (stats.handoffs.pairs[pairKey] || 0) + 1;
        }
      }
    }

    return stats;
  }

  /**
   * 清空日志
   * @returns {Promise<void>}
   */
  async clear() {
    this._entries = [];
    this._loaded = true;
    await this.save();
  }

  /**
   * 获取最近的 N 个条目
   * @param {number} limit - 限制数量
   * @returns {Promise<ActivityLogEntry[]>}
   */
  async getRecent(limit = 10) {
    return this.getEntries({ limit });
  }
}

module.exports = {
  ActivityLog,
  EventType
};
