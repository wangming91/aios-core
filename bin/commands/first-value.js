#!/usr/bin/env node

/**
 * AIOS First Value Command - First Value Detection
 *
 * Tracks and reports on Time to First Value (TTFV) metrics.
 *
 * Usage:
 *   aios first-value         - Show first value status
 *   aios first-value report  - Show detailed report
 *   aios first-value status  - Show brief status line
 *   aios first-value record <milestone> - Record a milestone
 *   aios first-value reset   - Reset first value state
 *
 * @module bin/commands/first-value
 * @story FVD-1: First Value Detection
 */

const { program } = require('commander');
const chalk = require('chalk');

const {
  FirstValueDetector,
  MILESTONES,
} = require('../../.aios-core/development/scripts/first-value-detector');

// Initialize detector
const detector = new FirstValueDetector();

/**
 * Show full report
 */
function showReport() {
  console.log(detector.generateReport());
}

/**
 * Show brief status line
 */
function showStatus() {
  console.log(detector.generateStatusLine());
}

/**
 * Show detailed status as JSON
 */
function showDetailedStatus() {
  const status = detector.getStatus();
  console.log(JSON.stringify(status, null, 2));
}

/**
 * Record a milestone
 */
function recordMilestone(milestoneId) {
  const result = detector.recordMilestone(milestoneId);

  if (!result.success) {
    console.log(chalk.red(`✗ ${result.error}`));
    console.log(chalk.gray('\nAvailable milestones:'));
    for (const [key, m] of Object.entries(MILESTONES)) {
      console.log(chalk.gray(`  - ${m.id} (${m.category}, +${m.weight} pts)`));
    }
    return;
  }

  if (result.alreadyCompleted) {
    console.log(chalk.yellow('⚠ First value already reached'));
    return;
  }

  console.log(chalk.green(`✓ Milestone recorded: ${milestoneId}`));

  if (result.firstValueReached) {
    console.log(chalk.green.bold('\n🎉 Congratulations! You reached First Value!'));
    if (result.ttfv) {
      const seconds = Math.floor(result.ttfv / 1000);
      const minutes = Math.floor(seconds / 60);
      if (minutes > 0) {
        console.log(chalk.green(`   Time to First Value: ${minutes}m ${seconds % 60}s`));
      } else {
        console.log(chalk.green(`   Time to First Value: ${seconds}s`));
      }
    }
  } else {
    console.log(chalk.gray(`   Progress: ${result.score}/${FirstValueDetector.getConfig().MIN_SCORE} pts`));
  }
}

/**
 * List available milestones
 */
function listMilestones() {
  const lines = [];
  lines.push('\n  📋 Available Milestones');
  lines.push('  ' + '─'.repeat(50));
  lines.push('');

  // Core milestones
  lines.push('  Core (required):');
  for (const m of Object.values(MILESTONES).filter(m => m.required)) {
    lines.push(`    ⭐ ${m.id.padEnd(20)} +${m.weight} pts`);
    lines.push(`       ${m.description}`);
  }

  lines.push('');

  // Important milestones
  lines.push('  Important:');
  for (const m of Object.values(MILESTONES).filter(m => m.category === 'important')) {
    lines.push(`    📌 ${m.id.padEnd(20)} +${m.weight} pts`);
  }

  lines.push('');

  // Enhanced milestones
  lines.push('  Enhanced:');
  for (const m of Object.values(MILESTONES).filter(m => m.category === 'enhanced')) {
    lines.push(`    📍 ${m.id.padEnd(20)} +${m.weight} pts`);
  }

  lines.push('');
  lines.push(`  Min score required: ${FirstValueDetector.getConfig().MIN_SCORE} pts`);
  lines.push('');

  console.log(lines.join('\n'));
}

/**
 * Reset state
 */
function resetState() {
  detector.reset();
  console.log(chalk.green('✓ First value state reset'));
}

// Configure CLI
program
  .name('aios first-value')
  .description('Track and report Time to First Value (TTFV)')
  .version('1.0.0');

// Default command: report
program
  .command('report', { isDefault: true })
  .description('Show full first value report')
  .action(showReport);

// Status command
program
  .command('status')
  .description('Show brief status line')
  .option('-j, --json', 'Output as JSON')
  .action((options) => {
    if (options.json) {
      showDetailedStatus();
    } else {
      showStatus();
    }
  });

// Record command
program
  .command('record <milestone>')
  .description('Record a milestone achievement')
  .action(recordMilestone);

// List command
program
  .command('list')
  .description('List available milestones')
  .action(listMilestones);

// Reset command
program
  .command('reset')
  .description('Reset first value state')
  .action(resetState);

// Parse arguments
program.parse(process.argv);

// Show help if no arguments
if (!process.argv.slice(2).length) {
  program.outputHelp();
}
