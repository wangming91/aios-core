#!/usr/bin/env node

/**
 * AIOS Flow Command - Workflow State Intelligence
 *
 * Provides real-time workflow state awareness and intelligent recommendations.
 *
 * Usage:
 *   aios flow              - Show current workflow state
 *   aios flow status       - Detailed status with signals
 *   aios flow next         - Get recommended next actions
 *   aios flow visualize    - ASCII visualization
 *   aios flow watch        - Continuous monitoring mode
 *
 * @module bin/commands/flow
 * @story FSE-1: Flow-State Engine
 */

const path = require('path');
const { program } = require('commander');
const chalk = require('chalk');

const { FlowStateEngine, FLOW_STATES } = require('../../.aios-core/development/scripts/flow-state-engine');

// Initialize engine
const projectRoot = process.cwd();
const engine = new FlowStateEngine({ projectRoot, verbose: false });

/**
 * Display current state in a user-friendly format
 */
async function showState(options) {
  try {
    const result = await engine.determineState();
    const state = result.state;

    // State header
    console.log();
    console.log(chalk.bold(`  ${state.icon} ${state.label}`));
    console.log(chalk.gray(`  ${state.description}`));
    console.log();

    // Confidence indicator
    const confidenceColor = result.confidence >= 0.8 ? 'green' :
                            result.confidence >= 0.6 ? 'yellow' : 'red';
    console.log(`  Confidence: ${chalk[confidenceColor]((result.confidence * 100).toFixed(0) + '%')}`);

    // Reasons
    if (result.reasons.length > 0) {
      console.log(chalk.gray(`  Reason: ${result.reasons[0]}`));
    }

    console.log();

    // Show recommended actions
    if (!options.brief) {
      const actions = engine.getRecommendedActions();
      if (actions.length > 0) {
        console.log(chalk.bold('  Recommended next steps:'));
        console.log();
        actions.slice(0, 3).forEach((action, i) => {
          console.log(`    ${chalk.cyan(i + 1 + '.')} ${chalk.white(action.command)}`);
          console.log(`       ${chalk.gray(action.description)}`);
        });
        console.log();
      }
    }
  } catch (error) {
    console.error(chalk.red(`Error: ${error.message}`));
    process.exit(1);
  }
}

/**
 * Display detailed status with all signals
 */
async function showStatus() {
  try {
    const signals = await engine.collectSignals();
    const result = await engine.determineState(signals);
    const state = result.state;

    console.log();
    console.log(chalk.bold.blue('┌─────────────────────────────────────────┐'));
    console.log(chalk.bold.blue(`│  ${state.icon} ${state.label.padEnd(35)}│`));
    console.log(chalk.bold.blue('├─────────────────────────────────────────┤'));
    console.log(chalk.bold.blue(`│  ${state.description.padEnd(39)}│`));
    console.log(chalk.bold.blue(`│  Confidence: ${(result.confidence * 100).toFixed(0)}%`.padEnd(41) + '│'));
    console.log(chalk.bold.blue('└─────────────────────────────────────────┘'));
    console.log();

    // Git signals
    console.log(chalk.bold('Git Signals:'));
    if (signals.git?.error) {
      console.log(chalk.gray(`  ⚠️  ${signals.git.error}`));
    } else {
      console.log(`  Branch: ${chalk.cyan(signals.git?.branch || 'unknown')}`);
      console.log(`  Changes: ${signals.git?.hasChanges ? chalk.yellow(signals.git?.changedFiles + ' files') : chalk.green('clean')}`);
      console.log(`  Stash: ${signals.git?.hasStash ? chalk.yellow('yes') : chalk.gray('none')}`);
    }
    console.log();

    // Story signals
    console.log(chalk.bold('Story Signals:'));
    console.log(`  Status: ${chalk.cyan(signals.story?.status || 'unknown')}`);
    if (signals.story?.path) {
      console.log(`  Path: ${chalk.gray(signals.story.path)}`);
    }
    if (signals.story?.progress) {
      console.log(`  Progress: ${signals.story.progress}%`);
    }
    console.log();

    // CI signals
    console.log(chalk.bold('CI Signals:'));
    const ciColor = signals.ci?.status === 'passed' ? 'green' :
                    signals.ci?.status === 'failed' ? 'red' :
                    signals.ci?.status === 'running' ? 'yellow' : 'gray';
    console.log(`  Status: ${chalk[ciColor](signals.ci?.status || 'unknown')}`);
    console.log();

    // Reasons
    if (result.reasons.length > 0) {
      console.log(chalk.bold('State Detection:'));
      result.reasons.forEach(reason => {
        console.log(chalk.gray(`  • ${reason}`));
      });
      console.log();
    }
  } catch (error) {
    console.error(chalk.red(`Error: ${error.message}`));
    process.exit(1);
  }
}

/**
 * Display recommended next actions
 */
async function showNextActions() {
  try {
    await engine.determineState();
    const actions = engine.getRecommendedActions();

    console.log();
    console.log(chalk.bold('🧭 Next Actions'));
    console.log();

    if (actions.length === 0) {
      console.log(chalk.gray('  No specific actions available for current state.'));
      console.log();
      return;
    }

    actions.forEach((action, i) => {
      console.log(`  ${chalk.cyan((i + 1) + '.')} ${chalk.white(action.command)}`);
      console.log(`     ${chalk.gray(action.description)}`);
      console.log();
    });

    console.log(chalk.gray('  Tip: Type the number to execute the action (coming soon)'));
    console.log();
  } catch (error) {
    console.error(chalk.red(`Error: ${error.message}`));
    process.exit(1);
  }
}

/**
 * Display ASCII visualization
 */
async function showVisualization() {
  try {
    const viz = engine.visualizeState();
    console.log(viz);
  } catch (error) {
    console.error(chalk.red(`Error: ${error.message}`));
    process.exit(1);
  }
}

/**
 * Display available states
 */
function showStatesList() {
  console.log();
  console.log(chalk.bold('Available Flow States:'));
  console.log();

  Object.values(FLOW_STATES).forEach(state => {
    console.log(`  ${state.icon} ${chalk.cyan(state.label.padEnd(20))} ${chalk.gray(state.description)}`);
  });

  console.log();
}

// Configure CLI
program
  .name('aios flow')
  .description('Workflow state intelligence and recommendations')
  .version('1.0.0');

// Default command: show state
program
  .command('state', { isDefault: true })
  .description('Show current workflow state')
  .option('-b, --brief', 'Show brief output without recommendations')
  .action(showState);

// Status command: detailed signals
program
  .command('status')
  .description('Show detailed status with all signals')
  .action(showStatus);

// Next command: recommended actions
program
  .command('next')
  .description('Show recommended next actions')
  .action(showNextActions);

// Visualize command: ASCII visualization
program
  .command('visualize')
  .description('Show ASCII visualization of current state')
  .action(showVisualization);

// States command: list all states
program
  .command('states')
  .description('List all available flow states')
  .action(showStatesList);

// Parse arguments
program.parse(process.argv);

// Show help if no arguments
if (!process.argv.slice(2).length) {
  program.outputHelp();
}
