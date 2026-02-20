/**
 * Quickstart Command Module
 *
 * CLI command for quick start workflows.
 *
 * Subcommands:
 *   aios quickstart               - Interactive workflow selection
 *   aios quickstart feature       - Start feature development flow
 *   aios quickstart bugfix        - Start bug fix flow
 *   aios quickstart learning      - Start learning mode
 *   aios quickstart --list        - List available workflows
 *
 * @module cli/commands/quickstart
 * @version 1.0.0
 * @story STORY-OPT-A2
 */

'use strict';

const { Command } = require('commander');
const path = require('path');
const fs = require('fs');
const chalk = require('chalk');
const yaml = require('js-yaml');

const TourManager = require('../../../core/onboarding/tour-manager');
const { createError, isAIOSError } = require('../../../core/errors');

/**
 * Templates directory path
 */
const TEMPLATES_DIR = path.join(__dirname, 'templates');

/**
 * Quickstart workflow templates
 * These are the built-in templates for common workflows
 */
const QUICKSTART_TEMPLATES = {
  feature: {
    id: 'feature',
    title: 'New Feature',
    description: 'Add a new feature to your project',
    icon: 'new',
    emoji: 'new',
  },
  bugfix: {
    id: 'bugfix',
    title: 'Bug Fix',
    description: 'Fix a bug or issue in your project',
    icon: 'bug',
    emoji: 'bug',
  },
  learning: {
    id: 'learning',
    title: 'Learning Mode',
    description: 'Learn how to use AIOS effectively',
    icon: 'book',
    emoji: 'book',
  },
  config: {
    id: 'config',
    title: 'Configure Project',
    description: 'Set up project configuration',
    icon: 'gear',
    emoji: 'gear',
  },
};

/**
 * Load a quickstart template by ID
 * @param {string} templateId - Template ID to load
 * @returns {Object|null} Template object or null if not found
 */
function loadQuickstartTemplate(templateId) {
  if (!templateId || typeof templateId !== 'string') {
    return null;
  }

  const templatePath = path.join(TEMPLATES_DIR, `${templateId}.yaml`);

  try {
    if (!fs.existsSync(templatePath)) {
      return null;
    }

    const content = fs.readFileSync(templatePath, 'utf8');
    const template = yaml.load(content);

    return template || null;
  } catch (error) {
    return null;
  }
}

/**
 * Display welcome banner
 */
function displayWelcome() {
  const lines = [];
  const width = 55;

  lines.push('');
  lines.push(chalk.cyan.bold('='.repeat(width)));
  lines.push(chalk.cyan.bold('|') + ' AIOS Quickstart - Let\'s Get Started!'.padEnd(width - 2) + chalk.cyan.bold('|'));
  lines.push(chalk.cyan.bold('='.repeat(width)));
  lines.push('');
  lines.push(chalk.dim('  Start your development workflow in seconds.'));
  lines.push(chalk.dim('  Choose a task below to begin.'));
  lines.push('');

  console.log(lines.join('\n'));
}

/**
 * Display workflow selection menu
 */
function displayWorkflowMenu() {
  const lines = [];

  lines.push(chalk.white.bold('  What would you like to do?'));
  lines.push('');
  lines.push(chalk.cyan('    new  ') + ' New Feature - Add a new feature to your project');
  lines.push(chalk.cyan('    bug  ') + ' Bug Fix - Fix a bug or issue');
  lines.push(chalk.cyan('    book ') + ' Learning - Learn how to use AIOS');
  lines.push(chalk.cyan('    gear ') + ' Configure - Set up project configuration');
  lines.push('');
  lines.push(chalk.dim('  Usage: aios quickstart <workflow>'));
  lines.push(chalk.dim('  Example: aios quickstart feature'));
  lines.push('');

  console.log(lines.join('\n'));
}

/**
 * Display list of available workflows
 */
function displayWorkflowsList() {
  const lines = [];

  lines.push('');
  lines.push(chalk.cyan.bold('Available Quickstart Workflows:'));
  lines.push(chalk.cyan('================================'));
  lines.push('');

  Object.values(QUICKSTART_TEMPLATES).forEach((template) => {
    lines.push(chalk.white(`  ${template.emoji}  ${template.title}`));
    lines.push(chalk.dim(`      ${template.description}`));
    lines.push(chalk.dim(`      Usage: aios quickstart ${template.id}`));
    lines.push('');
  });

  lines.push(chalk.dim('Run `aios quickstart <workflow>` to start a workflow.'));
  lines.push('');

  console.log(lines.join('\n'));
}

/**
 * Display workflow header
 * @param {Object} template - Workflow template
 */
function displayWorkflowHeader(template) {
  const lines = [];
  const width = 55;

  lines.push('');
  lines.push(chalk.green.bold('-'.repeat(width)));
  lines.push(chalk.green.bold('|') + ` ${template.emoji || '*'} ${template.title}`.padEnd(width - 2) + chalk.green.bold('|'));
  lines.push(chalk.green.bold('-'.repeat(width)));
  lines.push('');

  if (template.description) {
    lines.push(chalk.white(`  ${template.description}`));
    lines.push('');
  }

  if (template.estimatedTime) {
    lines.push(chalk.dim(`  Estimated time: ${template.estimatedTime}`));
    lines.push('');
  }

  console.log(lines.join('\n'));
}

/**
 * Display workflow steps
 * @param {Object} template - Workflow template with steps
 */
function displayWorkflowSteps(template) {
  if (!template.steps || template.steps.length === 0) {
    return;
  }

  const lines = [];

  lines.push(chalk.white.bold('  Steps:'));
  lines.push('');

  template.steps.forEach((step, index) => {
    const stepNum = (index + 1).toString().padStart(2, ' ');
    lines.push(chalk.cyan(`  ${stepNum}. `) + chalk.white(step.prompt));

    if (step.placeholder) {
      lines.push(chalk.dim(`      ${step.placeholder}`));
    }

    if (step.help) {
      lines.push(chalk.dim(`      Hint: ${step.help}`));
    }

    lines.push('');
  });

  console.log(lines.join('\n'));
}

/**
 * Get next steps suggestions for a workflow
 * @param {string} workflowId - Workflow ID
 * @param {Object} context - Context variables
 * @returns {string[]} Array of next step suggestions
 */
function getNextSteps(workflowId, context) {
  const template = loadQuickstartTemplate(workflowId);

  if (!template || !template.nextSteps) {
    return [];
  }

  return template.nextSteps.map((step) => {
    let command = step.command || '';
    let description = step.description || '';

    // Interpolate context variables
    Object.entries(context).forEach(([key, value]) => {
      const placeholder = `{${key}}`;
      command = command.replace(placeholder, value);
      description = description.replace(placeholder, value);
    });

    return `${step.title}: ${command}`;
  });
}

/**
 * Display next steps suggestions
 * @param {string} workflowId - Workflow ID
 * @param {Object} context - Context variables from workflow
 */
function displayNextSteps(workflowId, context) {
  const template = loadQuickstartTemplate(workflowId);

  const lines = [];
  const width = 55;

  lines.push('');
  lines.push(chalk.cyan.bold('-'.repeat(width)));
  lines.push(chalk.cyan.bold('| Next Steps:').padEnd(width - 1) + '|');
  lines.push(chalk.cyan.bold('-'.repeat(width)));
  lines.push('');

  if (template && template.nextSteps) {
    template.nextSteps.forEach((step) => {
      lines.push(chalk.white(`  ${step.title}`));
      lines.push(chalk.dim(`    ${step.description}`));

      let command = step.command || '';
      Object.entries(context).forEach(([key, value]) => {
        command = command.replace(`{${key}}`, value);
      });

      lines.push(chalk.green(`    $ ${command}`));
      lines.push('');
    });
  } else {
    lines.push(chalk.dim('  No specific next steps defined for this workflow.'));
    lines.push('');
    lines.push(chalk.dim('  General suggestions:'));
    lines.push(chalk.green('    $ aios --help'));
    lines.push(chalk.green('    $ aios doctor'));
    lines.push('');
  }

  console.log(lines.join('\n'));
}

/**
 * Run feature workflow
 * @param {Object} options - Command options
 */
async function runFeatureWorkflow(options) {
  const template = loadQuickstartTemplate('feature');

  displayWorkflowHeader(template);

  console.log(chalk.white('  This workflow will help you:'));
  console.log(chalk.dim('    1. Define your feature'));
  console.log(chalk.dim('    2. Set up a development story'));
  console.log(chalk.dim('    3. Get implementation guidance'));
  console.log('');

  displayWorkflowSteps(template);

  // In non-interactive mode, show what would happen
  if (options.nonInteractive) {
    console.log(chalk.dim('  [Non-interactive mode - showing workflow steps]'));
    console.log('');
    console.log(chalk.yellow('  To run interactively:'));
    console.log(chalk.green('    $ aios quickstart feature'));
    console.log('');
  }

  displayNextSteps('feature', { id: '001' });
}

/**
 * Run bugfix workflow
 * @param {Object} options - Command options
 */
async function runBugfixWorkflow(options) {
  const template = loadQuickstartTemplate('bugfix');

  displayWorkflowHeader(template);

  console.log(chalk.white('  This workflow will help you:'));
  console.log(chalk.dim('    1. Document the bug'));
  console.log(chalk.dim('    2. Diagnose the issue'));
  console.log(chalk.dim('    3. Find or request a fix'));
  console.log('');

  displayWorkflowSteps(template);

  // Check if there's a recent error to diagnose
  console.log(chalk.yellow('  Useful commands:'));
  console.log(chalk.green('    $ aios diagnose --last') + chalk.dim(' - Diagnose last error'));
  console.log(chalk.green('    $ aios diagnose <error-code>') + chalk.dim(' - Diagnose specific error'));
  console.log('');

  displayNextSteps('bugfix', { 'error-code': 'ERROR_CODE' });
}

/**
 * Run learning workflow
 * @param {Object} options - Command options
 */
async function runLearningWorkflow(options) {
  const template = loadQuickstartTemplate('learning');

  displayWorkflowHeader(template);

  console.log(chalk.white('  Available learning topics:'));
  console.log('');

  if (template && template.steps) {
    const topicStep = template.steps.find((s) => s.id === 'topic');
    if (topicStep && topicStep.options) {
      topicStep.options.forEach((opt) => {
        console.log(chalk.cyan(`    ${opt.value.padEnd(12)}`) + chalk.white(opt.label));
        console.log(chalk.dim(`                  ${opt.description}`));
      });
    }
  }

  console.log('');
  console.log(chalk.yellow('  Start a guided tour:'));
  console.log(chalk.green('    $ aios tour first-run') + chalk.dim(' - AIOS basics'));
  console.log(chalk.green('    $ aios tour --list') + chalk.dim(' - See all tours'));
  console.log('');

  // Try to start the first-run tour
  try {
    const tourManager = new TourManager(process.cwd());
    const availableTours = tourManager.getAvailableTours();

    if (availableTours.includes('first-run')) {
      console.log(chalk.cyan('  Tip: Run `aios tour first-run` to start the interactive tutorial.'));
      console.log('');
    }
  } catch (error) {
    // TourManager not available, continue without tour suggestion
  }

  displayNextSteps('learning', {});
}

/**
 * Run config workflow
 * @param {Object} options - Command options
 */
async function runConfigWorkflow(options) {
  const lines = [];
  const width = 55;

  lines.push('');
  lines.push(chalk.magenta.bold('-'.repeat(width)));
  lines.push(chalk.magenta.bold('| gear Configure Project').padEnd(width - 1) + '|');
  lines.push(chalk.magenta.bold('-'.repeat(width)));
  lines.push('');

  lines.push(chalk.white('  Set up your project configuration:'));
  lines.push('');
  lines.push(chalk.cyan('    $ aios config show') + chalk.dim(' - View current configuration'));
  lines.push(chalk.cyan('    $ aios config validate') + chalk.dim(' - Validate configuration'));
  lines.push(chalk.cyan('    $ aios config init-local') + chalk.dim(' - Initialize local config'));
  lines.push('');
  lines.push(chalk.yellow('  Documentation:'));
  lines.push(chalk.dim('    .aios-core/constitution.md - Framework principles'));
  lines.push(chalk.dim('    .aios-core/framework-config.yaml - Framework settings'));
  lines.push('');

  console.log(lines.join('\n'));
}

/**
 * Quickstart action handler
 * @param {string} workflow - Workflow ID to start
 * @param {Object} options - Command options
 */
async function quickstartAction(workflow, options) {
  try {
    // Handle --list option
    if (options.list) {
      displayWorkflowsList();
      return;
    }

    // Display welcome for interactive mode
    if (!workflow) {
      displayWelcome();
      displayWorkflowMenu();
      return;
    }

    // Run specific workflow
    switch (workflow) {
      case 'feature':
      case 'new':
        await runFeatureWorkflow(options);
        break;

      case 'bugfix':
      case 'bug':
        await runBugfixWorkflow(options);
        break;

      case 'learning':
      case 'learn':
        await runLearningWorkflow(options);
        break;

      case 'config':
      case 'configure':
        await runConfigWorkflow(options);
        break;

      default:
        console.error(chalk.red(`\n  Unknown workflow: ${workflow}`));
        console.log('');
        console.log(chalk.dim('  Available workflows:'));
        console.log(chalk.cyan('    feature ') + '- New feature development');
        console.log(chalk.cyan('    bugfix   ') + '- Bug fix');
        console.log(chalk.cyan('    learning ') + '- Learn AIOS');
        console.log(chalk.cyan('    config   ') + '- Configure project');
        console.log('');
        console.log(chalk.dim('  Run `aios quickstart --list` for details.'));
        console.log('');
        break;
    }
  } catch (error) {
    if (isAIOSError(error)) {
      console.error(chalk.red(`\n  ${error.message}`));
      if (error.recoverySteps && error.recoverySteps.length > 0) {
        console.log(chalk.dim('\n  Recovery suggestions:'));
        error.recoverySteps.forEach((step) => {
          console.log(chalk.dim(`    - ${step}`));
        });
      }
    } else {
      console.error(chalk.red(`\n  Quickstart error: ${error.message}`));
    }
    console.log('');
    process.exit(1);
  }
}

/**
 * Create the quickstart command
 * @returns {Command} Commander command instance
 */
function createQuickstartCommand() {
  const quickstartCmd = new Command('quickstart')
    .description('Quick start workflows for common AIOS tasks')
    .argument('[workflow]', 'Workflow to start (feature|bugfix|learning|config)')
    .option('-l, --list', 'List available workflows')
    .option('-n, --non-interactive', 'Run in non-interactive mode')
    .action(async (workflow, options) => {
      try {
        await quickstartAction(workflow, options || {});
      } catch (error) {
        console.error(chalk.red(`Quickstart error: ${error.message}`));
        process.exit(1);
      }
    });

  return quickstartCmd;
}

module.exports = {
  createQuickstartCommand,
  quickstartAction,
  loadQuickstartTemplate,
  displayWelcome,
  displayWorkflowMenu,
  displayWorkflowsList,
  displayWorkflowHeader,
  displayWorkflowSteps,
  displayNextSteps,
  getNextSteps,
  QUICKSTART_TEMPLATES,
};
