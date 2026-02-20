/**
 * suggest 命令组 - 智能建议和学习模式
 *
 * @module cli/commands/suggest
 */

const { Command } = require('commander');
const chalk = require('chalk');
const { SuggestionEngine } = require('../../../core/smart-assist/suggestion-engine');

/**
 * 获取建议类型图标
 * @param {string} type - 建议类型
 * @returns {string}
 */
function getTypeIcon(type) {
  const icons = {
    onboarding: '🚀',
    recovery: '🔧',
    workflow: '🔄',
    'next-step': '➡️',
    info: 'ℹ️',
    help: '❓',
    quality: '✨',
    wellness: '☕'
  };
  return icons[type] || '💡';
}

/**
 * 获取置信度颜色
 * @param {number} confidence - 置信度
 * @returns {Function}
 */
function getConfidenceColor(confidence) {
  if (confidence >= 80) return chalk.green;
  if (confidence >= 60) return chalk.yellow;
  return chalk.gray;
}

/**
 * 显示智能建议
 * @param {Object} options - 选项
 */
async function showSuggestions(options) {
  const projectRoot = process.cwd();
  const engine = new SuggestionEngine(projectRoot);

  try {
    await engine.initialize();

    // 构建上下文
    const context = {
      currentCommand: options.command || null,
      currentAgent: options.agent || null,
      recentCommands: [],
      recentErrors: [],
      workingDirectory: process.cwd()
    };

    const suggestions = await engine.getSuggestions(context);

    console.log();
    console.log(chalk.bold('  💡 Smart Suggestions'));
    console.log();

    if (suggestions.length === 0) {
      console.log(chalk.gray('  No suggestions available for current context.'));
      console.log();
      console.log(chalk.gray('  Try:'));
      console.log(chalk.gray('    --command <name>  Get suggestions for a command'));
      console.log(chalk.gray('    --learn <topic>   Start a learning path'));
      console.log();
      return;
    }

    // 显示建议
    for (let i = 0; i < suggestions.length; i++) {
      const suggestion = suggestions[i];
      const icon = getTypeIcon(suggestion.type);
      const confidenceStr = getConfidenceColor(suggestion.confidence)(`${suggestion.confidence}%`);

      console.log(`  ${icon} ${chalk.bold(suggestion.title)} ${confidenceStr}`);
      console.log(chalk.gray(`     ${suggestion.description}`));

      if (suggestion.action) {
        console.log(chalk.cyan(`     → ${suggestion.action}`));
      }

      console.log();
    }

    console.log(chalk.gray(`  ${suggestions.length} suggestions based on your context`));
    console.log();

    if (options.json) {
      console.log(JSON.stringify(suggestions, null, 2));
    }
  } catch (error) {
    console.log(chalk.red(`  Error: ${error.message}`));
    console.log();
  }
}

/**
 * 显示学习路径
 * @param {string} topic - 学习主题
 * @param {Object} options - 选项
 */
async function showLearningPath(topic, options) {
  const projectRoot = process.cwd();
  const engine = new SuggestionEngine(projectRoot);

  try {
    await engine.initialize();

    if (!topic) {
      // 显示可用主题
      const topics = engine.getAvailableTopics();

      console.log();
      console.log(chalk.bold('  📚 Available Learning Paths'));
      console.log();

      for (const t of topics) {
        const path = await engine.getLearningPath(t);
        if (path) {
          console.log(`  📖 ${chalk.cyan(t.padEnd(20))} ${path.title}`);
        }
      }

      console.log();
      console.log(chalk.gray('  Use \'aios suggest learn <topic>\' to start a path'));
      console.log();
      return;
    }

    const learningPath = await engine.getLearningPath(topic);

    if (!learningPath) {
      console.log(chalk.red(`  Error: Learning path '${topic}' not found`));
      console.log(chalk.gray('  Use \'aios suggest learn\' to see available topics'));
      console.log();
      return;
    }

    console.log();
    console.log(chalk.bold(`  📚 ${learningPath.title}`));
    console.log();

    for (let i = 0; i < learningPath.steps.length; i++) {
      const step = learningPath.steps[i];
      const stepNum = `${i + 1}.`.padStart(3);
      console.log(`  ${stepNum} ${step.title}`);

      if (step.command) {
        console.log(chalk.gray(`      $ ${step.command}`));
      }

      console.log();
    }

    console.log(chalk.gray('  Complete each step to master this topic'));
    console.log();

    if (options.json) {
      console.log(JSON.stringify(learningPath, null, 2));
    }
  } catch (error) {
    console.log(chalk.red(`  Error: ${error.message}`));
    console.log();
  }
}

/**
 * 记录反馈
 * @param {string} suggestionId - 建议 ID
 * @param {Object} options - 选项
 */
async function recordFeedback(suggestionId, options) {
  if (!suggestionId) {
    console.log(chalk.red('  Error: Suggestion ID is required'));
    console.log(chalk.gray('  Usage: aios suggest feedback <id> --accept|--reject'));
    return;
  }

  const projectRoot = process.cwd();
  const engine = new SuggestionEngine(projectRoot);

  try {
    await engine.initialize();

    const accepted = options.accept || false;

    await engine.recordFeedback(suggestionId, accepted, {
      workingDirectory: process.cwd()
    });

    console.log();
    if (accepted) {
      console.log(chalk.green('  ✅ Feedback recorded: Suggestion accepted'));
    } else {
      console.log(chalk.gray('  ✅ Feedback recorded: Suggestion rejected'));
    }
    console.log();
    console.log(chalk.gray('  This will help improve future suggestions'));
    console.log();
  } catch (error) {
    console.log(chalk.red(`  Error: ${error.message}`));
    console.log();
  }
}

/**
 * 显示下一步建议
 * @param {Object} options - 选项
 */
async function showNextStep(options) {
  const projectRoot = process.cwd();
  const engine = new SuggestionEngine(projectRoot);

  try {
    await engine.initialize();

    const context = {
      workingDirectory: process.cwd()
    };

    const suggestions = await engine.getSuggestions(context);
    const nextStep = suggestions.find(s => s.type === 'next-step') || suggestions[0];

    console.log();
    console.log(chalk.bold('  ➡️  Recommended Next Step'));
    console.log();

    if (!nextStep) {
      console.log(chalk.gray('  No specific next step available.'));
      console.log(chalk.gray('  Try running \'aios suggest\' for more options.'));
      console.log();
      return;
    }

    const icon = getTypeIcon(nextStep.type);
    console.log(`  ${icon} ${chalk.bold(nextStep.title)}`);
    console.log(chalk.gray(`     ${nextStep.description}`));

    if (nextStep.action) {
      console.log();
      console.log(chalk.cyan(`     $ ${nextStep.action}`));
    }

    console.log();
    console.log(chalk.gray(`  Confidence: ${nextStep.confidence}%`));
    console.log();
  } catch (error) {
    console.log(chalk.red(`  Error: ${error.message}`));
    console.log();
  }
}

/**
 * 创建 suggest 命令
 * @returns {Command}
 */
function createSuggestCommand() {
  const command = new Command('suggest')
    .alias('tip')
    .description('Get smart suggestions and learning paths');

  // 默认动作：显示建议
  command
    .option('--command <name>', 'Get suggestions for a command')
    .option('--agent <id>', 'Get suggestions for an agent')
    .option('--json', 'Output as JSON')
    .action(showSuggestions);

  // suggest learn
  command
    .command('learn [topic]')
    .description('Start a learning path')
    .option('--json', 'Output as JSON')
    .action(showLearningPath);

  // suggest feedback
  command
    .command('feedback <suggestion-id>')
    .description('Record feedback on a suggestion')
    .option('--accept', 'Mark suggestion as accepted')
    .option('--reject', 'Mark suggestion as rejected')
    .action(recordFeedback);

  // suggest next
  command
    .command('next')
    .description('Get recommended next step')
    .action(showNextStep);

  return command;
}

module.exports = {
  createSuggestCommand,
  showSuggestions,
  showLearningPath,
  recordFeedback,
  showNextStep,
  getTypeIcon,
  getConfidenceColor
};
