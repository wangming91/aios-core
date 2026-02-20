/**
 * story 命令组 - Story 生命周期管理
 *
 * @module cli/commands/story
 */

const { Command } = require('commander');
const chalk = require('chalk');
const { StoryManager } = require('../../../core/story-lifecycle/story-manager');
const { ProgressAnalyzer } = require('../../../core/story-lifecycle/progress-analyzer');
const {
  StoryStatus,
  StoryType,
  StoryPriority
} = require('../../../core/story-lifecycle/story-model');

/**
 * 获取状态图标
 * @param {string} status - Story 状态
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
 * @param {string} status - Story 状态
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
 * 获取类型图标
 * @param {string} type - Story 类型
 * @returns {string}
 */
function getTypeIcon(type) {
  const icons = {
    feature: '✨',
    bugfix: '🐛',
    refactor: '♻️',
    spike: '🔬',
    chore: '🔧',
    docs: '📚'
  };
  return icons[type] || '📄';
}

/**
 * 获取优先级显示
 * @param {string} priority - Story 优先级
 * @returns {string}
 */
function getPriorityDisplay(priority) {
  const displays = {
    P0: chalk.red.bold('P0'),
    P1: chalk.yellow('P1'),
    P2: chalk.blue('P2'),
    P3: chalk.gray('P3')
  };
  return displays[priority] || chalk.gray(priority || 'P3');
}

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
 * 列出所有 Stories
 * @param {Object} options - 选项
 */
async function listStories(options) {
  const projectRoot = process.cwd();
  const manager = new StoryManager(projectRoot);

  const filterOptions = {};

  if (options.status) {
    filterOptions.status = options.status;
  }
  if (options.type) {
    filterOptions.type = options.type;
  }
  if (options.epic) {
    filterOptions.epicId = options.epic;
  }
  if (options.assignee) {
    filterOptions.assignee = options.assignee;
  }
  if (options.sortBy) {
    filterOptions.sortBy = options.sortBy;
    filterOptions.sortOrder = options.sortOrder || 'asc';
  }

  const stories = await manager.list(filterOptions);

  console.log();
  console.log(chalk.bold('  📋 Stories'));
  console.log();

  if (stories.length === 0) {
    console.log(chalk.gray('  No stories found'));
    console.log();
    return;
  }

  // 表头
  console.log(chalk.gray('  Status   Type     Priority  ID                   Title'));
  console.log(chalk.gray('  ──────── ──────── ───────── ──────────────────── ────────────────────────'));

  for (const story of stories) {
    const statusIcon = getStatusIcon(story.status);
    const statusStr = getStatusColor(story.status)((story.status || 'draft').padEnd(8));
    const typeIcon = getTypeIcon(story.type);
    const typeStr = `${typeIcon} ${(story.type || 'feature').padEnd(6)}`;
    const priorityStr = getPriorityDisplay(story.priority);
    const idStr = chalk.cyan((story.id || 'N/A').padEnd(20));
    const titleStr = (story.title || 'Untitled').substring(0, 30);

    console.log(`  ${statusIcon} ${statusStr} ${typeStr} ${priorityStr}  ${idStr} ${titleStr}`);
  }

  console.log();
  console.log(chalk.gray(`  ${stories.length} stories found`));
  console.log(chalk.gray('  Use \'aios story show <id>\' to view details'));
  console.log();

  if (options.json) {
    console.log(JSON.stringify(stories, null, 2));
  }
}

/**
 * 创建新 Story
 * @param {Object} options - 选项
 */
async function createStory(options) {
  const projectRoot = process.cwd();
  const manager = new StoryManager(projectRoot);

  const storyData = {
    title: options.title,
    type: options.type || StoryType.FEATURE,
    status: options.status || StoryStatus.DRAFT,
    priority: options.priority || StoryPriority.P2,
    epicId: options.epic,
    assignee: options.assignee,
    description: options.description || ''
  };

  // 验证必填字段
  if (!storyData.title) {
    console.log(chalk.red('  Error: Title is required'));
    console.log(chalk.gray('  Usage: aios story create --title "Your story title"'));
    return;
  }

  try {
    const story = await manager.create(storyData);

    console.log();
    console.log(chalk.bold.green('  ✅ Story Created'));
    console.log();
    console.log(`  ${getStatusIcon(story.status)} ${chalk.cyan(story.id)}`);
    console.log(chalk.gray(`  Title: ${story.title}`));
    console.log(chalk.gray(`  Type: ${story.type}`));
    console.log(chalk.gray(`  Status: ${story.status}`));
    console.log(chalk.gray(`  Priority: ${story.priority}`));

    if (story.epicId) {
      console.log(chalk.gray(`  Epic: ${story.epicId}`));
    }

    console.log();
    console.log(chalk.gray('  Edit the story file to add acceptance criteria and tasks'));
    console.log(chalk.gray(`  File: docs/stories/active/${story.epicId || 'UNORGANIZED'}/${story.id}/story.md`));
    console.log();

    if (options.json) {
      console.log(JSON.stringify(story, null, 2));
    }
  } catch (error) {
    console.log(chalk.red(`  Error: ${error.message}`));
    console.log();
  }
}

/**
 * 显示 Story 详情
 * @param {string} storyId - Story ID
 * @param {Object} options - 选项
 */
async function showStory(storyId, options) {
  if (!storyId) {
    console.log(chalk.red('  Error: Story ID is required'));
    console.log(chalk.gray('  Usage: aios story show <story-id>'));
    return;
  }

  const projectRoot = process.cwd();
  const manager = new StoryManager(projectRoot);
  const analyzer = new ProgressAnalyzer();

  const story = await manager.read(storyId);

  if (!story) {
    console.log(chalk.red(`  Error: Story '${storyId}' not found`));
    console.log();
    return;
  }

  console.log();
  console.log(chalk.bold(`  ${getStatusIcon(story.status)} ${chalk.cyan(story.id)}`));
  console.log();

  // 基本信息
  console.log(chalk.bold('  Overview'));
  console.log(chalk.gray('  ────────────────────────────────'));
  console.log(`  Title: ${story.title || 'Untitled'}`);
  console.log(`  Type: ${getTypeIcon(story.type)} ${story.type || 'feature'}`);
  console.log(`  Status: ${getStatusColor(story.status)(story.status || 'draft')}`);
  console.log(`  Priority: ${getPriorityDisplay(story.priority)}`);

  if (story.epicId) {
    console.log(`  Epic: ${story.epicId}`);
  }

  if (story.assignee) {
    console.log(`  Assignee: ${story.assignee}`);
  }

  console.log();

  // 时间信息
  console.log(chalk.bold('  Timeline'));
  console.log(chalk.gray('  ────────────────────────────────'));
  console.log(`  Created: ${formatTimeAgo(story.createdAt)}`);
  console.log(`  Updated: ${formatTimeAgo(story.updatedAt)}`);

  if (story.completedAt) {
    console.log(`  Completed: ${formatTimeAgo(story.completedAt)}`);
  }

  console.log();

  // 进度
  if (story._path) {
    const fs = require('fs');
    const path = require('path');
    const storyFile = path.join(story._path, 'story.md');

    if (fs.existsSync(storyFile)) {
      const content = fs.readFileSync(storyFile, 'utf8');
      const progress = analyzer.analyze(content);

      console.log(chalk.bold('  Progress'));
      console.log(chalk.gray('  ────────────────────────────────'));

      // 进度条
      const barLength = 20;
      const filled = Math.round((progress.percentage / 100) * barLength);
      const bar = '█'.repeat(filled) + '░'.repeat(barLength - filled);

      console.log(`  ${bar} ${progress.percentage}%`);
      console.log(chalk.gray(`  ${progress.completedTasks}/${progress.totalTasks} tasks completed`));

      // 分段进度
      if (progress.sections.length > 0) {
        console.log();
        console.log(chalk.gray('  Sections:'));

        for (const section of progress.sections) {
          const sectionPercent = section.total > 0 ?
            Math.round((section.completed / section.total) * 100) : 0;
          console.log(chalk.gray(`    ${section.title}: ${sectionPercent}% (${section.completed}/${section.total})`));
        }
      }

      // 待办任务
      if (options.tasks && progress.pendingItems.length > 0) {
        console.log();
        console.log(chalk.bold('  Pending Tasks'));
        console.log(chalk.gray('  ────────────────────────────────'));

        for (const item of progress.pendingItems.slice(0, 10)) {
          console.log(chalk.gray(`  [ ] ${item}`));
        }

        if (progress.pendingItems.length > 10) {
          console.log(chalk.gray(`  ... and ${progress.pendingItems.length - 10} more`));
        }
      }

      console.log();
    }
  }

  // 描述
  if (story.description) {
    console.log(chalk.bold('  Description'));
    console.log(chalk.gray('  ────────────────────────────────'));
    console.log();
    console.log('  ' + story.description.split('\n').join('\n  '));
    console.log();
  }

  if (options.json) {
    console.log(JSON.stringify(story, null, 2));
  }
}

/**
 * 更新 Story 进度
 * @param {string} storyId - Story ID
 * @param {Object} options - 选项
 */
async function updateProgress(storyId, options) {
  if (!storyId) {
    console.log(chalk.red('  Error: Story ID is required'));
    console.log(chalk.gray('  Usage: aios story progress <story-id>'));
    return;
  }

  const projectRoot = process.cwd();
  const manager = new StoryManager(projectRoot);
  const analyzer = new ProgressAnalyzer();

  const story = await manager.read(storyId);

  if (!story || !story._path) {
    console.log(chalk.red(`  Error: Story '${storyId}' not found`));
    console.log();
    return;
  }

  const fs = require('fs');
  const path = require('path');
  const storyFile = path.join(story._path, 'story.md');

  if (!fs.existsSync(storyFile)) {
    console.log(chalk.red('  Error: Story file not found'));
    return;
  }

  let content = fs.readFileSync(storyFile, 'utf8');
  const beforeProgress = analyzer.analyze(content);

  // 更新任务状态
  if (options.check !== undefined) {
    const taskIndex = parseInt(options.check);
    content = analyzer.updateTaskStatus(content, taskIndex, true);
  }

  if (options.uncheck !== undefined) {
    const taskIndex = parseInt(options.uncheck);
    content = analyzer.updateTaskStatus(content, taskIndex, false);
  }

  if (options.completeAll) {
    const progress = analyzer.analyze(content);
    const updates = {};
    for (let i = 0; i < progress.totalTasks; i++) {
      updates[i] = true;
    }
    content = analyzer.batchUpdateTaskStatus(content, updates);
  }

  // 写回文件
  fs.writeFileSync(storyFile, content, 'utf8');

  const afterProgress = analyzer.analyze(content);
  const diff = analyzer.compare(beforeProgress, afterProgress);

  console.log();
  console.log(chalk.bold('  📊 Progress Updated'));
  console.log();

  // 显示进度变化
  const barLength = 20;
  const filled = Math.round((afterProgress.percentage / 100) * barLength);
  const bar = '█'.repeat(filled) + '░'.repeat(barLength - filled);

  console.log(`  ${bar} ${afterProgress.percentage}%`);
  console.log(chalk.gray(`  ${afterProgress.completedTasks}/${afterProgress.totalTasks} tasks completed`));
  console.log();

  if (diff.tasksCompleted > 0) {
    console.log(chalk.green(`  ✅ ${diff.tasksCompleted} task(s) completed`));

    if (diff.newCompleted.length > 0) {
      for (const item of diff.newCompleted) {
        console.log(chalk.gray(`    + ${item}`));
      }
    }
  }

  if (diff.newlyPending.length > 0) {
    console.log(chalk.yellow(`  🔄 ${diff.newlyPending.length} task(s) marked incomplete`));

    for (const item of diff.newlyPending) {
      console.log(chalk.gray(`    - ${item}`));
    }
  }

  // 显示报告
  if (options.report) {
    console.log();
    console.log(analyzer.generateReport(afterProgress));
  }

  console.log();

  if (options.json) {
    console.log(JSON.stringify({
      before: beforeProgress,
      after: afterProgress,
      diff
    }, null, 2));
  }
}

/**
 * 可视化 Story 进度
 * @param {Object} options - 选项
 */
async function visualizeStories(options) {
  const projectRoot = process.cwd();
  const manager = new StoryManager(projectRoot);
  const analyzer = new ProgressAnalyzer();
  const fs = require('fs');
  const path = require('path');

  const stories = await manager.list({ sortBy: 'updatedAt', sortOrder: 'desc' });

  console.log();
  console.log(chalk.bold('  📊 Story Progress Dashboard'));
  console.log();

  if (stories.length === 0) {
    console.log(chalk.gray('  No stories found'));
    console.log();
    return;
  }

  // 统计
  const stats = {
    total: stories.length,
    byStatus: {},
    totalProgress: 0,
    totalTasks: 0,
    completedTasks: 0
  };

  for (const story of stories) {
    stats.byStatus[story.status] = (stats.byStatus[story.status] || 0) + 1;

    // 计算进度
    if (story._path) {
      const storyFile = path.join(story._path, 'story.md');

      if (fs.existsSync(storyFile)) {
        const content = fs.readFileSync(storyFile, 'utf8');
        const progress = analyzer.analyze(content);

        stats.totalTasks += progress.totalTasks;
        stats.completedTasks += progress.completedTasks;
      }
    }
  }

  stats.totalProgress = stats.totalTasks > 0 ?
    Math.round((stats.completedTasks / stats.totalTasks) * 100) : 0;

  // 状态分布
  console.log(chalk.bold('  Status Distribution'));
  console.log(chalk.gray('  ────────────────────────────────'));

  for (const [status, count] of Object.entries(stats.byStatus)) {
    const icon = getStatusIcon(status);
    const color = getStatusColor(status);
    const bar = '█'.repeat(count);
    console.log(`  ${icon} ${color(status.padEnd(12))} ${chalk.gray(bar)} ${count}`);
  }

  console.log();

  // 总体进度
  console.log(chalk.bold('  Overall Progress'));
  console.log(chalk.gray('  ────────────────────────────────'));

  const barLength = 30;
  const filled = Math.round((stats.totalProgress / 100) * barLength);
  const bar = '█'.repeat(filled) + '░'.repeat(barLength - filled);

  console.log(`  ${bar} ${stats.totalProgress}%`);
  console.log(chalk.gray(`  ${stats.completedTasks}/${stats.totalTasks} total tasks`));
  console.log();

  // 活跃 Stories
  console.log(chalk.bold('  Active Stories'));
  console.log(chalk.gray('  ────────────────────────────────'));

  const activeStories = stories.filter(s =>
    s.status === StoryStatus.IN_PROGRESS ||
    s.status === StoryStatus.READY ||
    s.status === StoryStatus.REVIEW
  ).slice(0, 5);

  for (const story of activeStories) {
    const icon = getStatusIcon(story.status);
    const id = chalk.cyan(story.id);

    // 获取进度
    let progressBar = '░'.repeat(10);
    let progressPercent = 0;

    if (story._path) {
      const storyFile = path.join(story._path, 'story.md');

      if (fs.existsSync(storyFile)) {
        const content = fs.readFileSync(storyFile, 'utf8');
        const progress = analyzer.analyze(content);
        const filledBars = Math.round((progress.percentage / 100) * 10);
        progressBar = '█'.repeat(filledBars) + '░'.repeat(10 - filledBars);
        progressPercent = progress.percentage;
      }
    }

    console.log(`  ${icon} ${id} ${progressBar} ${progressPercent}%`);
    console.log(chalk.gray(`     ${story.title}`));
  }

  console.log();
  console.log(chalk.gray(`  ${stories.length} total stories, ${activeStories.length} active`));
  console.log();

  if (options.json) {
    console.log(JSON.stringify({
      stats,
      activeStories: activeStories.map(s => ({ id: s.id, title: s.title, status: s.status }))
    }, null, 2));
  }
}

/**
 * 创建 story 命令
 * @returns {Command}
 */
function createStoryCommand() {
  const command = new Command('story')
    .description('Manage story lifecycle');

  // story list
  command
    .command('list')
    .alias('ls')
    .description('List all stories')
    .option('-s, --status <status>', 'Filter by status')
    .option('-t, --type <type>', 'Filter by type')
    .option('-e, --epic <epic>', 'Filter by epic ID')
    .option('-a, --assignee <assignee>', 'Filter by assignee')
    .option('--sort-by <field>', 'Sort by field (title, status, priority)')
    .option('--sort-order <order>', 'Sort order (asc, desc)', 'asc')
    .option('--json', 'Output as JSON')
    .action(listStories);

  // story create
  command
    .command('create')
    .description('Create a new story')
    .requiredOption('--title <title>', 'Story title')
    .option('-t, --type <type>', 'Story type (feature, bugfix, refactor, spike, chore, docs)', 'feature')
    .option('-s, --status <status>', 'Initial status (draft, ready)', 'draft')
    .option('-p, --priority <priority>', 'Priority (P0, P1, P2, P3)', 'P2')
    .option('-e, --epic <epic>', 'Epic ID')
    .option('-a, --assignee <assignee>', 'Assignee')
    .option('-d, --description <description>', 'Description')
    .option('--json', 'Output as JSON')
    .action(createStory);

  // story show
  command
    .command('show <story-id>')
    .description('Show story details')
    .option('--tasks', 'Show pending tasks')
    .option('--json', 'Output as JSON')
    .action(showStory);

  // story progress
  command
    .command('progress <story-id>')
    .description('Update or view story progress')
    .option('-c, --check <index>', 'Mark task as complete by index')
    .option('-u, --uncheck <index>', 'Mark task as incomplete by index')
    .option('--complete-all', 'Mark all tasks as complete')
    .option('--report', 'Show detailed progress report')
    .option('--json', 'Output as JSON')
    .action(updateProgress);

  // story visualize
  command
    .command('visualize')
    .alias('viz')
    .description('Visualize story progress dashboard')
    .option('--json', 'Output as JSON')
    .action(visualizeStories);

  return command;
}

module.exports = {
  createStoryCommand,
  listStories,
  createStory,
  showStory,
  updateProgress,
  visualizeStories,
  getStatusIcon,
  getStatusColor,
  getTypeIcon,
  getPriorityDisplay,
  formatTimeAgo
};
