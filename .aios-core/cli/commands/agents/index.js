/**
 * agents 命令组 - 代理状态、路由和历史
 *
 * @module cli/commands/agents
 */

const { Command } = require('commander');
const path = require('path');
const chalk = require('chalk');
const { AgentStateManager } = require('../../../core/agent-state');
const { AgentRouter } = require('../../../core/agent-state/router');

/**
 * 格式化时间差
 * @param {string} timestamp - ISO 时间戳
 * @returns {string}
 */
function formatTimeAgo(timestamp) {
  if (!timestamp) return 'unknown';

  const diff = Date.now() - new Date(timestamp).getTime();
  const minutes = Math.floor(diff / 60000);
  const hours = Math.floor(minutes / 60);
  const days = Math.floor(hours / 24);

  if (days > 0) return `${days}d ago`;
  if (hours > 0) return `${hours}h ago`;
  if (minutes > 0) return `${minutes}m ago`;
  return 'just now';
}

/**
 * 获取代理图标
 * @param {string} agentId - 代理 ID
 * @returns {string}
 */
function getAgentIcon(agentId) {
  const icons = {
    dev: '💻',
    qa: '🔍',
    architect: '🏛️',
    pm: '📋',
    po: '📝',
    sm: '🏃',
    analyst: '📊',
    devops: '⚙️',
    'data-engineer': '🗄️',
    'ux-design-expert': '🎨',
    'aios-master': '🤖',
    'squad-creator': '👥'
  };
  return icons[agentId] || '❓';
}

/**
 * 获取代理显示名称
 * @param {string} agentId - 代理 ID
 * @returns {string}
 */
function getAgentName(agentId) {
  const names = {
    dev: 'Dex',
    qa: 'Quinn',
    architect: 'Aria',
    pm: 'Morgan',
    po: 'Pax',
    sm: 'River',
    analyst: 'Alex',
    devops: 'Gage',
    'data-engineer': 'Dara',
    'ux-design-expert': 'Uma',
    'aios-master': 'Master',
    'squad-creator': 'Squad'
  };
  return names[agentId] || agentId;
}

/**
 * 列出所有代理
 * @param {Object} options - 选项
 */
async function listAgents(options) {
  const router = new AgentRouter();
  const capabilities = await router.getAllCapabilities();

  console.log();
  console.log(chalk.bold('  📋 Available Agents'));
  console.log();
  console.log(chalk.gray('  ID                  Name                Description'));
  console.log(chalk.gray('  ────────────────── ────────────────── ─────────────────────'));

  for (const [id, agent] of Object.entries(capabilities)) {
    const icon = getAgentIcon(id);
    const name = agent.name || getAgentName(id);
    const desc = (agent.description || '').substring(0, 30);

    console.log(`  ${icon} ${chalk.cyan(id.padEnd(18))} ${name.padEnd(18)} ${chalk.gray(desc)}`);
  }

  console.log();
  console.log(chalk.gray(`  ${Object.keys(capabilities).length} agents available`));
  console.log(chalk.gray('  Use \'@agent-name\' to activate an agent'));
  console.log();
}

/**
 * 显示代理状态
 * @param {Object} options - 选项
 */
async function showStatus(options) {
  const projectRoot = process.cwd();
  const stateManager = new AgentStateManager(projectRoot);
  await stateManager.load();

  const activeAgent = stateManager.getActiveAgent();
  const stats = stateManager.getStats();
  const recentHistory = stateManager.getAgentHistory({ limit: 5 });

  console.log();
  console.log(chalk.bold('  📊 Agent Status'));
  console.log();

  if (activeAgent) {
    const icon = getAgentIcon(activeAgent.id);
    const name = getAgentName(activeAgent.id);
    const timeAgo = formatTimeAgo(activeAgent.activatedAt);

    console.log(chalk.bold('  Active Agent:'));
    console.log(`    ${icon} ${chalk.cyan(activeAgent.id)} (${name})`);
    console.log(chalk.gray(`    Activated: ${timeAgo}`));
    console.log(chalk.gray(`    Quality: ${activeAgent.activationQuality || 'full'}`));

    if (activeAgent.context?.story_id) {
      console.log(chalk.gray(`    Context: ${activeAgent.context.story_id}`));
    }
  } else {
    console.log(chalk.gray('  No active agent'));
  }

  console.log();
  console.log(chalk.bold('  Recent Activity:'));

  if (recentHistory.length > 0) {
    for (const entry of recentHistory.slice(-5).reverse()) {
      const icon = getAgentIcon(entry.agentId);
      const timeAgo = formatTimeAgo(entry.timestamp);

      if (entry.event === 'activate') {
        console.log(`    ${icon} ${entry.agentId} activated ${timeAgo}`);
      } else if (entry.event === 'deactivate') {
        console.log(`    ${icon} ${entry.agentId} deactivated ${timeAgo}`);
      }
    }
  } else {
    console.log(chalk.gray('    No recent activity'));
  }

  console.log();
  console.log(chalk.bold('  Session Stats:'));
  console.log(chalk.gray(`    Total Activations: ${stats.totalActivations}`));
  console.log(chalk.gray(`    Total Handoffs: ${stats.totalHandoffs}`));

  if (options.json) {
    console.log();
    console.log(JSON.stringify({
      activeAgent,
      stats,
      recentHistory
    }, null, 2));
  }

  console.log();
}

/**
 * 路由任务
 * @param {string} task - 任务描述
 * @param {Object} options - 选项
 */
async function routeTask(task, options) {
  if (!task) {
    console.log(chalk.red('  Error: Task description required'));
    console.log(chalk.gray('  Usage: aios agents route "your task description"'));
    return;
  }

  const router = new AgentRouter();
  const result = await router.route(task);

  console.log();
  console.log(chalk.bold('  🎯 Routing Analysis'));
  console.log();

  // 分类信息
  console.log(chalk.bold('  Task Classification:'));
  console.log(chalk.gray(`    Type: ${result.classification.primaryType || 'unknown'}`));
  console.log(chalk.gray(`    Keywords: ${result.classification.keywords.slice(0, 5).join(', ')}`));

  console.log();

  // 推荐代理
  if (result.recommendation) {
    const icon = getAgentIcon(result.recommendation.id);
    const name = result.recommendation.name || getAgentName(result.recommendation.id);

    console.log(chalk.bold('  Recommended Agent:'));
    console.log(`    ${icon} ${chalk.cyan(result.recommendation.id)} (${name}) - Score: ${result.confidence}/100`);
    console.log();

    // 解释理由
    const explanation = await router.explain(result.recommendation.id, task);
    if (explanation.reasons.length > 0) {
      console.log(chalk.bold(`  Why ${result.recommendation.id}?`));
      for (const reason of explanation.reasons) {
        console.log(chalk.gray(`    • ${reason}`));
      }
    }
  } else {
    console.log(chalk.yellow('  No recommendation available'));
  }

  // 备选代理
  if (result.alternatives.length > 0) {
    console.log();
    console.log(chalk.bold('  Alternatives:'));

    for (let i = 0; i < result.alternatives.length; i++) {
      const alt = result.alternatives[i];
      const icon = getAgentIcon(alt.id);
      const name = alt.name || getAgentName(alt.id);

      console.log(chalk.gray(`    ${i + 1}. ${icon} @${alt.id} (${name}) - Score: ${alt.score}/100`));
    }
  }

  console.log();
  console.log(chalk.gray('  Run with --activate to activate the recommended agent'));
  console.log();

  if (options.json) {
    console.log(JSON.stringify(result, null, 2));
  }
}

/**
 * 显示历史
 * @param {Object} options - 选项
 */
async function showHistory(options) {
  const projectRoot = process.cwd();
  const stateManager = new AgentStateManager(projectRoot);
  await stateManager.load();

  const limit = parseInt(options.limit) || 20;
  const agentId = options.agent;

  const history = stateManager.getAgentHistory({
    agentId,
    limit
  });

  const handoffs = stateManager.getHandoffs({ limit: 10 });
  const graph = stateManager.getCollaborationGraph();

  console.log();
  console.log(chalk.bold('  📊 Agent History'));
  console.log();

  if (options.graph && graph.nodes.length > 0) {
    console.log(chalk.bold('  Collaboration Graph:'));
    console.log();

    // 显示边
    for (const edge of graph.edges) {
      const fromIcon = getAgentIcon(edge.from);
      const toIcon = getAgentIcon(edge.to);
      console.log(`  ${fromIcon} ${edge.from} ──${'─'.repeat(edge.weight)}→ ${toIcon} ${edge.to} (${edge.weight})`);
    }

    console.log();
  }

  // 切换记录
  if (handoffs.length > 0) {
    console.log(chalk.bold('  Recent Handoffs:'));

    for (const handoff of handoffs.slice(-5).reverse()) {
      const fromIcon = getAgentIcon(handoff.from);
      const toIcon = getAgentIcon(handoff.to);
      const timeAgo = formatTimeAgo(handoff.timestamp);

      console.log(`    ${fromIcon} ${handoff.from} → ${toIcon} ${handoff.to} ${chalk.gray(timeAgo)}`);
    }

    console.log();
  }

  // 活动历史
  if (history.length > 0) {
    console.log(chalk.bold('  Activity Log:'));

    for (const entry of history.slice(-10).reverse()) {
      const icon = getAgentIcon(entry.agentId);
      const timeAgo = formatTimeAgo(entry.timestamp);

      if (entry.event === 'activate') {
        const from = entry.previousAgent ? ` (from @${entry.previousAgent})` : '';
        console.log(`    ${icon} ${entry.agentId} activated${chalk.gray(from)} ${chalk.gray(timeAgo)}`);
      } else if (entry.event === 'deactivate') {
        console.log(`    ${icon} ${entry.agentId} deactivated ${chalk.gray(timeAgo)}`);
      }
    }
  } else {
    console.log(chalk.gray('  No history available'));
  }

  // 统计
  const report = stateManager.getCollaborationReport();
  if (report.topCollaborations.length > 0) {
    console.log();
    console.log(chalk.bold('  Top Collaborations:'));

    for (let i = 0; i < Math.min(5, report.topCollaborations.length); i++) {
      const collab = report.topCollaborations[i];
      const fromIcon = getAgentIcon(collab.from);
      const toIcon = getAgentIcon(collab.to);

      console.log(`    ${i + 1}. ${fromIcon} ${collab.from} → ${toIcon} ${collab.to} (${collab.count} handoffs)`);
    }
  }

  console.log();

  if (options.json) {
    console.log(JSON.stringify({
      history,
      handoffs,
      graph,
      topCollaborations: report.topCollaborations
    }, null, 2));
  }
}

/**
 * 创建 agents 命令
 * @returns {Command}
 */
function createAgentsCommand() {
  const command = new Command('agents')
    .description('Manage and route to AI agents');

  // agents list
  command
    .command('list')
    .description('List all available agents')
    .option('--json', 'Output as JSON')
    .action(listAgents);

  // agents status
  command
    .command('status')
    .description('Show current agent status')
    .option('-v, --verbose', 'Show detailed information')
    .option('--json', 'Output as JSON')
    .action(showStatus);

  // agents route
  command
    .command('route <task>')
    .description('Route a task to the best matching agent')
    .option('--activate', 'Automatically activate the recommended agent')
    .option('--json', 'Output as JSON')
    .action(routeTask);

  // agents history
  command
    .command('history')
    .description('Show agent activation history')
    .option('-a, --agent <id>', 'Filter by agent ID')
    .option('-l, --limit <n>', 'Limit number of entries', '20')
    .option('--graph', 'Show collaboration graph')
    .option('--json', 'Output as JSON')
    .action(showHistory);

  return command;
}

module.exports = {
  createAgentsCommand,
  listAgents,
  showStatus,
  routeTask,
  showHistory,
  getAgentIcon,
  getAgentName,
  formatTimeAgo
};
