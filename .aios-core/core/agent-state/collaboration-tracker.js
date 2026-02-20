/**
 * CollaborationTracker - 代理协作追踪器
 *
 * 追踪代理间的协作关系，构建协作图
 *
 * @module core/agent-state/collaboration-tracker
 */

/**
 * 协作关系
 * @typedef {Object} CollaborationEdge
 * @property {string} from - 源代理
 * @property {string} to - 目标代理
 * @property {number} weight - 权重 (切换次数)
 * @property {string} [lastHandoff] - 最后一次切换时间
 */

/**
 * 协作图节点
 * @typedef {Object} CollaborationNode
 * @property {string} id - 代理 ID
 * @property {number} collaborations - 协作次数
 * @property {number} handoffsFrom - 发起切换次数
 * @property {number} handoffsTo - 接收切换次数
 */

/**
 * 协作图
 * @typedef {Object} CollaborationGraph
 * @property {CollaborationNode[]} nodes - 节点列表
 * @property {CollaborationEdge[]} edges - 边列表
 */

/**
 * 协作追踪器类
 */
class CollaborationTracker {
  constructor() {
    /**
     * 协作关系图
     * @type {Map<string, Set<string>>}
     * @private
     */
    this._collaborations = new Map();

    /**
     * 切换计数
     * @type {Map<string, number>}
     * @private
     */
    this._handoffCount = new Map();

    /**
     * 最后切换时间
     * @type {Map<string, string>}
     * @private
     */
    this._lastHandoffTime = new Map();

    /**
     * 代理统计
     * @type {Map<string, Object>}
     * @private
     */
    this._agentStats = new Map();
  }

  /**
   * 记录协作关系
   * @param {string} fromAgent - 源代理
   * @param {string} toAgent - 目标代理
   * @param {Object} context - 上下文
   * @returns {void}
   */
  recordCollaboration(fromAgent, toAgent, context = {}) {
    if (!fromAgent || !toAgent || fromAgent === toAgent) {
      return;
    }

    // 更新协作图 (双向)
    if (!this._collaborations.has(fromAgent)) {
      this._collaborations.set(fromAgent, new Set());
    }
    this._collaborations.get(fromAgent).add(toAgent);

    // 确保目标代理也在图中
    if (!this._collaborations.has(toAgent)) {
      this._collaborations.set(toAgent, new Set());
    }

    // 更新切换计数
    const key = `${fromAgent}->${toAgent}`;
    this._handoffCount.set(key, (this._handoffCount.get(key) || 0) + 1);

    // 更新最后切换时间
    this._lastHandoffTime.set(key, context.timestamp || new Date().toISOString());

    // 更新代理统计
    this._updateAgentStats(fromAgent, 'handoffsFrom');
    this._updateAgentStats(toAgent, 'handoffsTo');
  }

  /**
   * 更新代理统计
   * @param {string} agentId - 代理 ID
   * @param {string} statType - 统计类型
   * @private
   */
  _updateAgentStats(agentId, statType) {
    if (!this._agentStats.has(agentId)) {
      this._agentStats.set(agentId, {
        handoffsFrom: 0,
        handoffsTo: 0
      });
    }
    const stats = this._agentStats.get(agentId);
    stats[statType]++;
  }

  /**
   * 获取协作图
   * @returns {CollaborationGraph}
   */
  getGraph() {
    const nodes = [];
    const edges = [];

    // 构建节点
    for (const [agentId, collaborators] of this._collaborations) {
      const stats = this._agentStats.get(agentId) || { handoffsFrom: 0, handoffsTo: 0 };
      nodes.push({
        id: agentId,
        collaborations: collaborators.size,
        handoffsFrom: stats.handoffsFrom,
        handoffsTo: stats.handoffsTo
      });
    }

    // 构建边
    for (const [key, weight] of this._handoffCount) {
      const [from, to] = key.split('->');
      edges.push({
        from,
        to,
        weight,
        lastHandoff: this._lastHandoffTime.get(key) || null
      });
    }

    return { nodes, edges };
  }

  /**
   * 获取最频繁的协作
   * @param {number} limit - 限制数量
   * @returns {Array<{from: string, to: string, count: number, lastHandoff: string}>}
   */
  getTopCollaborations(limit = 5) {
    return Array.from(this._handoffCount.entries())
      .sort((a, b) => b[1] - a[1])
      .slice(0, limit)
      .map(([key, count]) => {
        const [from, to] = key.split('->');
        return {
          from,
          to,
          count,
          lastHandoff: this._lastHandoffTime.get(key) || null
        };
      });
  }

  /**
   * 获取代理的协作者
   * @param {string} agentId - 代理 ID
   * @returns {string[]}
   */
  getCollaborators(agentId) {
    return Array.from(this._collaborations.get(agentId) || []);
  }

  /**
   * 查找协作路径 (BFS)
   * @param {string} fromAgent - 起始代理
   * @param {string} toAgent - 目标代理
   * @returns {string[]|null} - 协作路径或 null
   */
  findCollaborationPath(fromAgent, toAgent) {
    if (fromAgent === toAgent) {
      return [fromAgent];
    }

    const queue = [[fromAgent]];
    const visited = new Set([fromAgent]);

    while (queue.length > 0) {
      const path = queue.shift();
      const current = path[path.length - 1];

      const collaborators = this._collaborations.get(current) || new Set();
      for (const next of collaborators) {
        if (next === toAgent) {
          return [...path, next];
        }

        if (!visited.has(next)) {
          visited.add(next);
          queue.push([...path, next]);
        }
      }
    }

    return null;
  }

  /**
   * 获取代理间切换次数
   * @param {string} fromAgent - 源代理
   * @param {string} toAgent - 目标代理
   * @returns {number}
   */
  getHandoffCount(fromAgent, toAgent) {
    return this._handoffCount.get(`${fromAgent}->${toAgent}`) || 0;
  }

  /**
   * 检查两个代理是否有过协作
   * @param {string} agent1 - 代理 1
   * @param {string} agent2 - 代理 2
   * @returns {boolean}
   */
  hasCollaboration(agent1, agent2) {
    const forward = this._handoffCount.get(`${agent1}->${agent2}`) || 0;
    const backward = this._handoffCount.get(`${agent2}->${agent1}`) || 0;
    return forward > 0 || backward > 0;
  }

  /**
   * 获取代理的协作强度排名
   * @param {string} agentId - 代理 ID
   * @returns {Array<{agentId: string, strength: number}>}
   */
  getCollaborationStrength(agentId) {
    const strengths = [];

    for (const [key, count] of this._handoffCount) {
      const [from, to] = key.split('->');
      if (from === agentId || to === agentId) {
        const otherAgent = from === agentId ? to : from;
        strengths.push({
          agentId: otherAgent,
          strength: count
        });
      }
    }

    return strengths.sort((a, b) => b.strength - a.strength);
  }

  /**
   * 清空所有数据
   */
  clear() {
    this._collaborations.clear();
    this._handoffCount.clear();
    this._lastHandoffTime.clear();
    this._agentStats.clear();
  }

  /**
   * 导出为可序列化对象
   * @returns {Object}
   */
  toJSON() {
    return {
      collaborations: Array.from(this._collaborations.entries()).map(([agent, collaborators]) => ({
        agent,
        collaborators: Array.from(collaborators)
      })),
      handoffCount: Array.from(this._handoffCount.entries()),
      lastHandoffTime: Array.from(this._lastHandoffTime.entries()),
      agentStats: Array.from(this._agentStats.entries())
    };
  }

  /**
   * 从序列化对象导入
   * @param {Object} data - 序列化数据
   */
  fromJSON(data) {
    this.clear();

    if (data.collaborations) {
      for (const { agent, collaborators } of data.collaborations) {
        this._collaborations.set(agent, new Set(collaborators));
      }
    }

    if (data.handoffCount) {
      for (const [key, count] of data.handoffCount) {
        this._handoffCount.set(key, count);
      }
    }

    if (data.lastHandoffTime) {
      for (const [key, time] of data.lastHandoffTime) {
        this._lastHandoffTime.set(key, time);
      }
    }

    if (data.agentStats) {
      for (const [agentId, stats] of data.agentStats) {
        this._agentStats.set(agentId, stats);
      }
    }
  }
}

module.exports = {
  CollaborationTracker
};
