/**
 * Handoff Visualizer - 代理交接可视化
 *
 * 将代理间的交接关系可视化为 ASCII 图或 Mermaid 图
 *
 * @module handoff-visualizer
 * @version 1.0.0
 * @story HV-1: Agent Handoff Visualization
 */

const { CollaborationTracker } = require('../../core/agent-state/collaboration-tracker');

// Agent icons and colors
const AGENT_CONFIG = {
  dev: { icon: '👨‍💻', color: 'blue', label: 'Developer' },
  qa: { icon: '✅', color: 'green', label: 'QA' },
  architect: { icon: '🏛️', color: 'purple', label: 'Architect' },
  pm: { icon: '📋', color: 'yellow', label: 'PM' },
  po: { icon: '📝', color: 'orange', label: 'PO' },
  sm: { icon: '🎯', color: 'cyan', label: 'Scrum Master' },
  devops: { icon: '🚀', color: 'red', label: 'DevOps' },
  analyst: { icon: '🔍', color: 'indigo', label: 'Analyst' },
  'data-engineer': { icon: '💾', color: 'teal', label: 'Data Engineer' },
  'ux-design-expert': { icon: '🎨', color: 'pink', label: 'UX Designer' },
  'aios-master': { icon: '🤖', color: 'gray', label: 'AIOS Master' },
  // Additional agent aliases
  'db-sage': { icon: '🗃️', color: 'emerald', label: 'DB Sage' },
  'github-devops': { icon: '🐙', color: 'black', label: 'GitHub DevOps' },
};

// Standard handoff flows
const STANDARD_FLOWS = {
  story_development: ['po', 'dev', 'qa', 'devops'],
  epic_creation: ['pm', 'architect', 'sm', 'po'],
  bug_fix: ['qa', 'dev', 'qa', 'devops'],
  feature_release: ['analyst', 'pm', 'architect', 'dev', 'qa', 'devops'],
  database_change: ['data-engineer', 'dev', 'qa', 'devops'],
};

/**
 * 交接可视化器类
 */
class HandoffVisualizer {
  /**
   * @param {CollaborationTracker} [tracker] - 协作追踪器实例
   */
  constructor(tracker = null) {
    this.tracker = tracker || new CollaborationTracker();
  }

  /**
   * 记录交接
   * @param {string} fromAgent - 源代理
   * @param {string} toAgent - 目标代理
   * @param {Object} [context] - 上下文
   */
  recordHandoff(fromAgent, toAgent, context = {}) {
    this.tracker.recordCollaboration(fromAgent, toAgent, {
      ...context,
      timestamp: context.timestamp || new Date().toISOString(),
    });
  }

  /**
   * 生成 ASCII 可视化
   * @param {Object} [options]
   * @param {number} [options.width] - 宽度
   * @param {boolean} [options.showCounts] - 显示计数
   * @returns {string} ASCII 图
   */
  generateASCII(options = {}) {
    const { showCounts = true } = options;
    const graph = this.tracker.getGraph();
    const lines = [];

    lines.push('┌─────────────────────────────────────────────────────┐');
    lines.push('│          🔄 Agent Handoff Visualization              │');
    lines.push('└─────────────────────────────────────────────────────┘');
    lines.push('');

    if (graph.nodes.length === 0) {
      lines.push('  No handoffs recorded yet.');
      lines.push('');
      return lines.join('\n');
    }

    // Group edges by source agent
    const edgesBySource = new Map();
    for (const edge of graph.edges) {
      if (!edgesBySource.has(edge.from)) {
        edgesBySource.set(edge.from, []);
      }
      edgesBySource.get(edge.from).push(edge);
    }

    // Generate flow diagram
    for (const [source, edges] of edgesBySource) {
      const sourceConfig = AGENT_CONFIG[source] || { icon: '❓', label: source };
      lines.push(`  ${sourceConfig.icon} ${sourceConfig.label}`);

      for (const edge of edges) {
        const targetConfig = AGENT_CONFIG[edge.to] || { icon: '❓', label: edge.to };
        const countStr = showCounts ? ` (${edge.weight}x)` : '';
        const arrow = edge.weight > 3 ? '════▶' : '────▶';
        lines.push(`      ${arrow} ${targetConfig.icon} ${targetConfig.label}${countStr}`);
      }
      lines.push('');
    }

    // Summary
    lines.push('  ─────────────────────────────────────────');
    lines.push(`  Total Agents: ${graph.nodes.length}`);
    lines.push(`  Total Handoffs: ${graph.edges.reduce((sum, e) => sum + e.weight, 0)}`);
    lines.push('');

    return lines.join('\n');
  }

  /**
   * 生成 Mermaid 图
   * @param {Object} [options]
   * @param {string} [options.direction] - 方向 (LR, TB, RL)
   * @returns {string} Mermaid 代码
   */
  generateMermaid(options = {}) {
    const { direction = 'LR' } = options;
    const graph = this.tracker.getGraph();
    const lines = [];

    lines.push(`flowchart ${direction}`);

    // Define nodes with subgraphs for categories
    lines.push('  subgraph Agents');
    for (const node of graph.nodes) {
      const config = AGENT_CONFIG[node.id] || { icon: '❓', label: node.id };
      const label = `${config.icon} ${config.label}`;
      lines.push(`    ${node.id}["${label}<br/>↓${node.handoffsFrom} ↑${node.handoffsTo}"]`);
    }
    lines.push('  end');

    // Define edges
    for (const edge of graph.edges) {
      const thickness = edge.weight > 5 ? '===' : edge.weight > 2 ? '--' : '-.->';
      const label = `${edge.weight}x`;
      lines.push(`  ${edge.from} ${thickness}|${label}| ${edge.to}`);
    }

    return lines.join('\n');
  }

  /**
   * 生成标准流程图
   * @param {string} flowName - 流程名称
   * @returns {string} ASCII 流程图
   */
  generateStandardFlow(flowName) {
    const flow = STANDARD_FLOWS[flowName];
    if (!flow) {
      return `Unknown flow: ${flowName}. Available: ${Object.keys(STANDARD_FLOWS).join(', ')}`;
    }

    const lines = [];
    lines.push(`\n  📋 Standard Flow: ${flowName.replace(/_/g, ' ').toUpperCase()}`);
    lines.push('  ' + '─'.repeat(50));
    lines.push('');

    for (let i = 0; i < flow.length; i++) {
      const agent = flow[i];
      const config = AGENT_CONFIG[agent] || { icon: '❓', label: agent };
      const prefix = i === 0 ? '┌─►' : i === flow.length - 1 ? '└─►' : '├─►';
      const indent = '  ' + '│  '.repeat(i);

      lines.push(`${indent}${prefix} ${config.icon} ${config.label}`);

      if (i < flow.length - 1) {
        lines.push(`${indent}│`);
      }
    }

    lines.push('');
    return lines.join('\n');
  }

  /**
   * 生成时间线视图
   * @param {number} [limit] - 限制条目数
   * @returns {string} 时间线 ASCII
   */
  generateTimeline(limit = 10) {
    const graph = this.tracker.getGraph();
    const lines = [];

    // Sort edges by lastHandoff time
    const sortedEdges = [...graph.edges]
      .filter(e => e.lastHandoff)
      .sort((a, b) => new Date(b.lastHandoff) - new Date(a.lastHandoff))
      .slice(0, limit);

    lines.push('\n  ⏱️  Recent Handoffs Timeline');
    lines.push('  ' + '─'.repeat(50));
    lines.push('');

    if (sortedEdges.length === 0) {
      lines.push('  No handoffs recorded yet.');
      return lines.join('\n');
    }

    for (const edge of sortedEdges) {
      const fromConfig = AGENT_CONFIG[edge.from] || { icon: '❓', label: edge.from };
      const toConfig = AGENT_CONFIG[edge.to] || { icon: '❓', label: edge.to };
      const time = new Date(edge.lastHandoff).toLocaleString();

      lines.push(`  ${time}`);
      lines.push(`  ${fromConfig.icon} ${fromConfig.label} ──▶ ${toConfig.icon} ${toConfig.label} (${edge.weight}x)`);
      lines.push('  │');
    }

    lines.pop(); // Remove last │
    lines.push('');
    return lines.join('\n');
  }

  /**
   * 生成统计摘要
   * @returns {string} ASCII 统计
   */
  generateStats() {
    const graph = this.tracker.getGraph();
    const lines = [];

    lines.push('\n  📊 Handoff Statistics');
    lines.push('  ' + '─'.repeat(50));
    lines.push('');

    // Sort agents by total handoffs
    const sortedAgents = [...graph.nodes].sort((a, b) => {
      const aTotal = a.handoffsFrom + a.handoffsTo;
      const bTotal = b.handoffsFrom + b.handoffsTo;
      return bTotal - aTotal;
    });

    lines.push('  Agent Activity:');
    for (const agent of sortedAgents.slice(0, 5)) {
      const config = AGENT_CONFIG[agent.id] || { icon: '❓', label: agent.id };
      const bar = '█'.repeat(Math.min(10, agent.handoffsFrom + agent.handoffsTo));
      lines.push(`    ${config.icon} ${config.label.padEnd(15)} ${bar} (out: ${agent.handoffsFrom}, in: ${agent.handoffsTo})`);
    }

    // Most frequent handoff paths
    const sortedEdges = [...graph.edges].sort((a, b) => b.weight - a.weight);
    lines.push('');
    lines.push('  Top Handoff Paths:');
    for (const edge of sortedEdges.slice(0, 5)) {
      const fromConfig = AGENT_CONFIG[edge.from] || { label: edge.from };
      const toConfig = AGENT_CONFIG[edge.to] || { label: edge.to };
      lines.push(`    ${fromConfig.label} → ${toConfig.label}: ${edge.weight} times`);
    }

    lines.push('');
    return lines.join('\n');
  }

  /**
   * 列出所有标准流程
   * @returns {string} ASCII 列表
   */
  listStandardFlows() {
    const lines = [];

    lines.push('\n  📋 Available Standard Flows');
    lines.push('  ' + '─'.repeat(50));
    lines.push('');

    for (const [name, agents] of Object.entries(STANDARD_FLOWS)) {
      const flowStr = agents.map(a => {
        const config = AGENT_CONFIG[a] || { icon: '❓', label: a };
        return `${config.icon}`;
      }).join(' → ');
      lines.push(`  ${name.padEnd(20)} ${flowStr}`);
    }

    lines.push('');
    return lines.join('\n');
  }
}

module.exports = {
  HandoffVisualizer,
  AGENT_CONFIG,
  STANDARD_FLOWS,
};
