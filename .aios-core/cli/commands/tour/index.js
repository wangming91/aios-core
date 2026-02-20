/**
 * Tour Command Module
 *
 * CLI command for interactive tours.
 *
 * Subcommands:
 *   aios tour                  - Start default tour (first-run)
 *   aios tour <tour-id>        - Start specific tour
 *   aios tour --resume         - Resume in-progress tour
 *   aios tour --reset          - Reset tour progress
 *   aios tour --list           - List available tours
 *
 * @module cli/commands/tour
 * @version 1.0.0
 * @story STORY-OPT-A1
 */

'use strict';

const { Command } = require('commander');
const chalk = require('chalk');
const TourManager = require('../../../core/onboarding/tour-manager');

/**
 * Default tour ID
 */
const DEFAULT_TOUR_ID = 'first-run';

/**
 * Display a tour step
 * @param {Object} step - Step object
 * @param {Object} tourMeta - Tour metadata
 */
function displayStep(step, tourMeta) {
  if (!step) {
    return;
  }

  const lines = [];
  const width = 60;

  // Header
  lines.push('');
  lines.push(chalk.cyan.bold('+' + '-'.repeat(width - 2) + '+'));
  lines.push(chalk.cyan.bold(`| ${step.title}`).padEnd(width - 1) + '|');
  lines.push(chalk.cyan.bold('+' + '-'.repeat(width - 2) + '+'));

  // Progress indicator
  const progress = `[${tourMeta.currentStep}/${tourMeta.totalSteps}]`;
  const progressBar = buildProgressBar(tourMeta.currentStep, tourMeta.totalSteps, 20);
  lines.push(chalk.dim('| ') + chalk.white(progress) + ' ' + chalk.dim(progressBar));
  lines.push(chalk.cyan.bold('+' + '-'.repeat(width - 2) + '+'));

  // Content
  lines.push('');
  const contentLines = step.content.split('\n');
  contentLines.forEach((line) => {
    // Wrap long lines
    const wrapped = wrapText(line, width - 4);
    wrapped.forEach((wrappedLine) => {
      lines.push(chalk.white('  ' + wrappedLine));
    });
  });

  // Action
  if (step.action) {
    lines.push('');
    lines.push('');

    switch (step.action.type) {
      case 'command':
        lines.push(chalk.yellow('  Command: ') + chalk.green(step.action.command));
        lines.push(chalk.dim('  Press Enter to run or type your own command'));
        break;

      case 'confirm':
        lines.push(chalk.dim('  Press Enter to ') + chalk.cyan(step.action.label));
        break;

      case 'input':
        lines.push(chalk.yellow('  Input: ') + chalk.dim(step.action.label || 'Enter value'));
        break;

      case 'select':
        lines.push(chalk.yellow('  Select: ') + chalk.dim(step.action.label || 'Choose an option'));
        break;
    }
  }

  // Footer based on step type
  if (step.type === 'complete') {
    lines.push('');
    lines.push(chalk.green.bold('+' + '-'.repeat(width - 2) + '+'));
    lines.push(chalk.green.bold('|  TOUR COMPLETE!').padEnd(width - 1) + '|');
    lines.push(chalk.green.bold('+' + '-'.repeat(width - 2) + '+'));
  }

  lines.push('');
  console.log(lines.join('\n'));
}

/**
 * Build a text progress bar
 * @param {number} current - Current step
 * @param {number} total - Total steps
 * @param {number} width - Bar width
 * @returns {string} Progress bar string
 */
function buildProgressBar(current, total, width) {
  const filled = Math.round((current / total) * width);
  const empty = width - filled;
  return chalk.green('\u2588'.repeat(filled)) + chalk.dim('\u2591'.repeat(empty));
}

/**
 * Wrap text to a maximum width
 * @param {string} text - Text to wrap
 * @param {number} maxWidth - Maximum width
 * @returns {string[]} Array of wrapped lines
 */
function wrapText(text, maxWidth) {
  if (!text || text.length <= maxWidth) {
    return [text || ''];
  }

  const words = text.split(' ');
  const lines = [];
  let currentLine = '';

  words.forEach((word) => {
    if ((currentLine + ' ' + word).trim().length <= maxWidth) {
      currentLine = (currentLine + ' ' + word).trim();
    } else {
      if (currentLine) {
        lines.push(currentLine);
      }
      currentLine = word;
    }
  });

  if (currentLine) {
    lines.push(currentLine);
  }

  return lines;
}

/**
 * Display list of available tours
 * @param {string[]} tours - Array of tour IDs
 * @param {Object} progressMap - Map of tour ID to progress info
 */
function displayTourList(tours, progressMap) {
  if (!tours || tours.length === 0) {
    console.log(chalk.yellow('No tours available.'));
    return;
  }

  const lines = [];
  lines.push('');
  lines.push(chalk.cyan.bold('Available Tours:'));
  lines.push(chalk.cyan('================'));
  lines.push('');

  tours.forEach((tourId) => {
    const progress = progressMap[tourId] || { status: 'not-started', percentage: 0 };
    const statusIcon = {
      completed: chalk.green('\u2713'),
      'in-progress': chalk.yellow('\u25B6'),
      'not-started': chalk.dim('\u25CB'),
    }[progress.status] || chalk.dim('\u25CB');

    const statusText = {
      completed: 'Completed',
      'in-progress': `${progress.percentage}% complete`,
      'not-started': 'Not started',
    }[progress.status] || 'Not started';

    lines.push(`  ${statusIcon} ${chalk.white(tourId)} ${chalk.dim(`(${statusText})`)}`);
  });

  lines.push('');
  lines.push(chalk.dim('Run `aios tour <tour-id>` to start a tour.'));
  lines.push('');

  console.log(lines.join('\n'));
}

/**
 * Get progress for all tours
 * @param {TourManager} tourManager - TourManager instance
 * @param {string[]} tours - Array of tour IDs
 * @returns {Object} Map of tour ID to progress info
 */
function getToursProgress(tourManager, tours) {
  const progressMap = {};

  tours.forEach((tourId) => {
    const progress = tourManager.progressTracker.load(tourId);
    if (progress) {
      progressMap[tourId] = {
        status: progress.status,
        percentage: Math.round((progress.completedSteps?.length || 0) / (progress.totalSteps || 1) * 100),
      };
    } else {
      progressMap[tourId] = { status: 'not-started', percentage: 0 };
    }
  });

  return progressMap;
}

/**
 * Tour action handler
 * @param {string} tourId - Tour ID to start/resume
 * @param {Object} options - Command options
 */
async function tourAction(tourId, options) {
  let tourManager;

  try {
    tourManager = new TourManager(process.cwd());
  } catch (error) {
    console.error(chalk.red('Failed to initialize tour system:', error.message));
    process.exit(1);
  }

  // Handle --list option
  if (options.list) {
    const tours = tourManager.getAvailableTours();

    if (tours.length === 0) {
      console.log(chalk.yellow('No tours available.'));
      return;
    }

    const progressMap = getToursProgress(tourManager, tours);
    displayTourList(tours, progressMap);
    return;
  }

  // Handle --reset option
  if (options.reset) {
    await tourManager.reset(tourId);
    console.log(chalk.green(`Tour progress reset: ${tourId || 'all tours'}`));
    return;
  }

  // Handle --resume option
  if (options.resume) {
    const result = await tourManager.resume(tourId);

    if (!result) {
      console.log(chalk.yellow('No tour to resume. Start a new tour with `aios tour <tour-id>`'));
      return;
    }

    console.log(chalk.cyan(`Resuming tour: ${result.tour.title}`));
    displayStep(result.step, result.tour);
    return;
  }

  // Start a tour
  const targetTourId = tourId || DEFAULT_TOUR_ID;
  const result = await tourManager.start(targetTourId);

  if (!result) {
    console.error(chalk.red(`Tour not found: ${targetTourId}`));
    console.log(chalk.dim('Run `aios tour --list` to see available tours.'));
    process.exit(1);
  }

  console.log(chalk.cyan.bold(`\n${result.tour.title}`));
  console.log(chalk.dim(result.tour.description));
  console.log(chalk.dim(`Estimated time: ${result.tour.estimatedTime}\n`));

  displayStep(result.step, result.tour);
}

/**
 * Create the tour command
 * @returns {Command} Commander command instance
 */
function createTourCommand() {
  const tourCmd = new Command('tour')
    .description('Start interactive tutorials to learn AIOS')
    .argument('[tour-id]', 'Tour ID to start (default: first-run)')
    .option('-r, --resume', 'Resume an in-progress tour')
    .option('--reset', 'Reset tour progress')
    .option('-l, --list', 'List available tours')
    .option('-n, --non-interactive', 'Run in non-interactive mode')
    .action(async (tourId, options) => {
      try {
        await tourAction(tourId, options);
      } catch (error) {
        console.error(chalk.red(`Tour error: ${error.message}`));
        process.exit(1);
      }
    });

  return tourCmd;
}

module.exports = {
  createTourCommand,
  tourAction,
  displayStep,
  displayTourList,
  buildProgressBar,
  wrapText,
};
