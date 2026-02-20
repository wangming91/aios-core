/**
 * workflow 命令组 - 工作流可视化和分析
 *
 * @module cli/commands/workflow
 */

const { Command } = require('commander');
const chalk = require('chalk');
const { WorkflowAnalyzer } = require('../../../core/workflow-viz/workflow-analyzer');

/**
 * 获取状态图标
 * @param {string} status - 状态
 * @returns {string}
 */
function getStatusIcon(status) {
  const icons = {
    draft: '📝',
    ready: '✅',
    in_progress: '🔄',
    review: '👀',
    done: '✅',
    blocked: '🚫'
  };
  return icons[status] || '❓';
}

/**
 * 获取状态颜色
 * @param {string} status - 状态
 * @returns {Function}
 */
function getStatusColor(status) {
  const colors = {
    draft: chalk.gray,
    ready: chalk.blue,
    in_progress: chalk.yellow,
    review: chalk.magenta,
    done: chalk.green,
    blocked: chalk.red
  };
  return colors[status] || chalk.white;
}

/**
 * 获取瓶颈类型图标
 * @param {string} type - 瓶颈类型
 * @returns {string}
 */
function getBottleneckIcon(type) {
  const icons = {
    low_progress: '📉',
    stale_workflow: '⏰',
    blocked_status: '🚫',
    task_overload: '📦'
  };
  return icons[type] || '⚠️';
}

/**
 * 获取严重程度颜色
 * @param {number} severity - 严重程度 (1-10)
 * @returns {Function}
 */
function getSeverityColor(severity) {
  if (severity >= 8) return chalk.red;
  if (severity >= 5) return chalk.yellow;
  return chalk.gray;
}

/**
 * 列出工作流
 * @param {Object} options - 选项
 */
async function listWorkflows(options) {
  const projectRoot = process.cwd();
  const analyzer = new WorkflowAnalyzer(projectRoot);

  try {
    await analyzer.initialize();

    const filter = {};
    if (options.status) filter.status = options.status;
    if (options.epic) filter.epic = options.epic;
    if (options.assignee) filter.assignee = options.assignee;

    const workflows = await analyzer.listWorkflows(filter);

    console.log();
    console.log(chalk.bold('  🔄 Workflows'));
    console.log();

    if (workflows.length === 0) {
      console.log(chalk.gray('  No workflows found'));
      console.log();
      return;
    }

    console.log(chalk.gray('  Status   Progress  ID                   Title'));
    console.log(chalk.gray('  ──────── ───────── ──────────────────── ────────────────────────'));

    for (const wf of workflows) {
      const icon = getStatusIcon(wf.status);
      const statusStr = getStatusColor(wf.status)((wf.status || 'draft').padEnd(8));
      const progress = wf.taskCount > 0 ?
        Math.round((wf.completedCount / wf.taskCount) * 100) : 0;
      const progressStr = `${progress}%`.padStart(7);
      const idStr = chalk.cyan((wf.id || 'N/A').padEnd(20));
      const titleStr = (wf.title || 'Untitled').substring(0, 28);

      console.log(`  ${icon} ${statusStr} ${progressStr}  ${idStr} ${titleStr}`);
    }

    console.log();
    console.log(chalk.gray(`  ${workflows.length} workflows`));
    console.log(chalk.gray('  Use \'aios workflow show <id>\' to view details'));
    console.log();

    if (options.json) {
      console.log(JSON.stringify(workflows, null, 2));
    }
  } catch (error) {
    console.log(chalk.red(`  Error: ${error.message}`));
    console.log();
  }
}

/**
 * 显示工作流详情
 * @param {string} workflowId - 工作流 ID
 * @param {Object} options - 选项
 */
async function showWorkflow(workflowId, options) {
  if (!workflowId) {
    console.log(chalk.red('  Error: Workflow ID is required'));
    console.log(chalk.gray('  Usage: aios workflow show <id>'));
    return;
  }

  const projectRoot = process.cwd();
  const analyzer = new WorkflowAnalyzer(projectRoot);

  try {
    await analyzer.initialize();

    const analysis = await analyzer.analyze(workflowId);

    if (!analysis) {
      console.log(chalk.red(`  Error: Workflow '${workflowId}' not found`));
      console.log();
      return;
    }

    console.log();
    console.log(chalk.bold(`  ${getStatusIcon(analysis.status)} ${chalk.cyan(workflowId)}`));
    console.log(chalk.gray(`  ${analysis.title}`));
    console.log();

    // 统计信息
    console.log(chalk.bold('  Statistics'));
    console.log(chalk.gray('  ────────────────────────────────'));
    console.log(`  Status: ${getStatusColor(analysis.status)(analysis.stats.status)}`);
    console.log(`  Progress: ${analysis.stats.efficiency}%`);
    console.log(chalk.gray(`  ${analysis.stats.completedSteps}/${analysis.stats.totalSteps} tasks completed`));
    console.log();

    // 瓶颈
    if (analysis.bottlenecks.length > 0) {
      console.log(chalk.bold('  ⚠️  Bottlenecks'));
      console.log(chalk.gray('  ────────────────────────────────'));

      for (const bn of analysis.bottlenecks) {
        const icon = getBottleneckIcon(bn.type);
        const severityColor = getSeverityColor(bn.severity);

        console.log(`  ${icon} ${severityColor(`[${bn.severity}/10]`)} ${bn.description}`);

        if (options.verbose && bn.suggestions.length > 0) {
          for (const suggestion of bn.suggestions) {
            console.log(chalk.gray(`      → ${suggestion}`));
          }
        }
      }
      console.log();
    }

    // 任务列表
    if (options.tasks) {
      console.log(chalk.bold('  Tasks'));
      console.log(chalk.gray('  ────────────────────────────────'));

      for (const task of analysis.tasks) {
        const icon = task.status === 'completed' ? '✅' :
          task.status === 'blocked' ? '🚫' : '⬜';
        const indent = '  '.repeat(task.indent);
        console.log(`${indent}${icon} ${task.name}`);
      }
      console.log();
    }

    console.log(chalk.gray('  Use --tasks to show task list'));
    console.log(chalk.gray('  Use --verbose to show suggestions'));
    console.log();

    if (options.json) {
      console.log(JSON.stringify(analysis, null, 2));
    }
  } catch (error) {
    console.log(chalk.red(`  Error: ${error.message}`));
    console.log();
  }
}

/**
 * 显示仪表板
 * @param {Object} options - 选项
 */
async function showDashboard(options) {
  const projectRoot = process.cwd();
  const analyzer = new WorkflowAnalyzer(projectRoot);

  try {
    await analyzer.initialize();

    const stats = await analyzer.getOverallStats();
    const workflows = await analyzer.listWorkflows();

    console.log();
    console.log(chalk.bold('  📊 Workflow Dashboard'));
    console.log();

    // 总体统计
    console.log(chalk.bold('  Overview'));
    console.log(chalk.gray('  ────────────────────────────────'));
    console.log(`  Total Workflows: ${stats.totalWorkflows}`);
    console.log(`  In Progress: ${chalk.yellow(stats.inProgressWorkflows)}`);
    console.log(`  Blocked: ${chalk.red(stats.blockedWorkflows)}`);
    console.log();

    // 进度条
    const barLength = 30;
    const filled = Math.round((stats.overallEfficiency / 100) * barLength);
    const bar = '█'.repeat(filled) + '░'.repeat(barLength - filled);

    console.log(chalk.bold('  Overall Progress'));
    console.log(chalk.gray('  ────────────────────────────────'));
    console.log(`  ${bar} ${stats.overallEfficiency}%`);
    console.log(chalk.gray(`  ${stats.completedTasks}/${stats.totalTasks} tasks completed`));
    console.log();

    // 活跃工作流
    if (workflows.length > 0) {
      console.log(chalk.bold('  Active Workflows'));
      console.log(chalk.gray('  ────────────────────────────────'));

      const active = workflows
        .filter(w => w.status === 'in_progress' || w.status === 'ready')
        .slice(0, 5);

      for (const wf of active) {
        const icon = getStatusIcon(wf.status);
        const progress = wf.taskCount > 0 ?
          Math.round((wf.completedCount / wf.taskCount) * 100) : 0;

        const barLen = 10;
        const barFill = Math.round((progress / 100) * barLen);
        const miniBar = '█'.repeat(barFill) + '░'.repeat(barLen - barFill);

        console.log(`  ${icon} ${chalk.cyan(wf.id)} ${miniBar} ${progress}%`);
        console.log(chalk.gray(`     ${wf.title}`));
      }

      console.log();
    }

    console.log(chalk.gray(`  ${workflows.length} total workflows`));
    console.log(chalk.gray('  Use \'aios workflow show <id>\' for details'));
    console.log();

    if (options.json) {
      console.log(JSON.stringify({ stats, workflows }, null, 2));
    }
  } catch (error) {
    console.log(chalk.red(`  Error: ${error.message}`));
    console.log();
  }
}

/**
 * 生成可视化
 * @param {string} workflowId - 工作流 ID
 * @param {Object} options - 选项
 */
async function generateViz(workflowId, options) {
  if (!workflowId) {
    console.log(chalk.red('  Error: Workflow ID is required'));
    console.log(chalk.gray('  Usage: aios workflow viz <id>'));
    return;
  }

  const projectRoot = process.cwd();
  const analyzer = new WorkflowAnalyzer(projectRoot);

  try {
    await analyzer.initialize();

    const format = options.format || 'mermaid';
    const viz = await analyzer.generateVisualization(workflowId, format);

    if (!viz) {
      console.log(chalk.red(`  Error: Workflow '${workflowId}' not found`));
      console.log();
      return;
    }

    console.log();
    console.log(chalk.bold(`  📊 Visualization (${format})`));
    console.log();
    console.log(viz);
    console.log();

    if (options.output) {
      const fs = require('fs');
      const path = require('path');
      const outputPath = path.join(projectRoot, options.output);
      fs.writeFileSync(outputPath, viz, 'utf8');
      console.log(chalk.green(`  ✅ Saved to ${options.output}`));
      console.log();
    }
  } catch (error) {
    console.log(chalk.red(`  Error: ${error.message}`));
    console.log();
  }
}

/**
 * 创建 workflow 命令
 * @returns {Command}
 */
function createWorkflowCommand() {
  const command = new Command('workflow')
    .alias('wf')
    .description('Analyze and visualize workflows');

  // workflow list
  command
    .command('list')
    .alias('ls')
    .description('List all workflows')
    .option('-s, --status <status>', 'Filter by status')
    .option('-e, --epic <epic>', 'Filter by epic')
    .option('-a, --assignee <assignee>', 'Filter by assignee')
    .option('--json', 'Output as JSON')
    .action(listWorkflows);

  // workflow show
  command
    .command('show <workflow-id>')
    .description('Show workflow details and analysis')
    .option('--tasks', 'Show task list')
    .option('-v, --verbose', 'Show suggestions')
    .option('--json', 'Output as JSON')
    .action(showWorkflow);

  // workflow dashboard
  command
    .command('dashboard')
    .alias('dash')
    .description('Show workflow dashboard')
    .option('--json', 'Output as JSON')
    .action(showDashboard);

  // workflow viz
  command
    .command('viz <workflow-id>')
    .description('Generate workflow visualization')
    .option('-f, --format <format>', 'Output format (mermaid, json, ascii)', 'mermaid')
    .option('-o, --output <file>', 'Save to file')
    .action(generateViz);

  return command;
}

module.exports = {
  createWorkflowCommand,
  listWorkflows,
  showWorkflow,
  showDashboard,
  generateViz,
  getStatusIcon,
  getStatusColor,
  getBottleneckIcon,
  getSeverityColor
};
