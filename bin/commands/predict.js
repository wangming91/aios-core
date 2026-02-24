#!/usr/bin/env node

/**
 * AIOS Predict Command - Predictive Error Detection
 *
 * Analyzes risk factors and predicts potential errors.
 *
 * Usage:
 *   aios predict         - Show risk assessment report
 *   aios predict status  - Show brief status line
 *   aios predict analyze - Run risk analysis
 *   aios predict history - Show error history
 *   aios predict reset   - Reset state
 *
 * @module bin/commands/predict
 * @story PED-1: Predictive Error Detection
 */

const { program } = require('commander');
const chalk = require('chalk');

const {
  PredictiveErrorDetector,
  RISK_FACTORS,
  ERROR_PATTERNS,
} = require('../../.aios-core/development/scripts/predictive-error-detector');

// Initialize detector
const detector = new PredictiveErrorDetector();

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
 * Run risk analysis
 */
function runAnalyze(options) {
  // Build context from options
  const context = {
    hasUncommittedChanges: options.uncommitted || false,
    diffLines: options.diffLines ? parseInt(options.diffLines) : undefined,
    sourceFiles: options.sourceFiles ? parseInt(options.sourceFiles) : undefined,
    testFiles: options.testFiles ? parseInt(options.testFiles) : undefined,
    hasDependencyChanges: options.deps || false,
    agentCount: options.agents ? parseInt(options.agents) : undefined,
    recentFileChanges: options.changes ? parseInt(options.changes) : undefined,
    lastQualityGateFailed: options.qgFailed || false,
  };

  const assessment = detector.analyzeRisk(context);

  console.log(chalk.bold('\n🔮 Risk Analysis Complete\n'));

  // Show risk level
  const levelIcon = assessment.riskLevel === 'high' ? '🔴' :
                   assessment.riskLevel === 'medium' ? '🟡' : '🟢';
  console.log(`  Risk Level: ${levelIcon} ${assessment.riskLevel.toUpperCase()}`);
  console.log(`  Risk Score: ${assessment.totalScore}`);
  console.log('');

  // Show detected risks
  if (assessment.risks.length > 0) {
    console.log(chalk.yellow('  Detected Risks:'));
    for (const risk of assessment.risks) {
      const icon = risk.severity === 'high' ? '⚠️' :
                  risk.severity === 'medium' ? '⚡' : 'ℹ️';
      console.log(`    ${icon} ${risk.name}: ${risk.prediction}`);
    }
    console.log('');
  }

  // Show recommendations
  if (assessment.recommendations.length > 0) {
    console.log(chalk.green('  Recommendations:'));
    for (let i = 0; i < Math.min(5, assessment.recommendations.length); i++) {
      console.log(`    ${i + 1}. ${assessment.recommendations[i].suggestion}`);
    }
    console.log('');
  }
}

/**
 * Show error history
 */
function showHistory(options) {
  const limit = parseInt(options.limit) || 10;
  const history = detector.getErrorHistory(limit);

  console.log(chalk.bold('\n📜 Error History\n'));

  if (history.length === 0) {
    console.log('  No errors recorded yet.');
    return;
  }

  for (const error of history) {
    const time = new Date(error.timestamp).toLocaleString();
    const icon = error.pattern ? '🔍' : '❌';
    console.log(`  ${icon} ${time}`);
    console.log(`     ${error.message.slice(0, 80)}${error.message.length > 80 ? '...' : ''}`);
    if (error.pattern) {
      console.log(chalk.gray(`     Pattern: ${error.pattern}`));
    }
    if (error.autoFix) {
      console.log(chalk.green(`     Auto-fix: ${error.autoFix}`));
    }
    console.log('');
  }
}

/**
 * Record an error manually
 */
function recordError(message, options) {
  const error = new Error(message);
  const context = {
    manual: true,
    category: options.category || 'unknown',
  };

  detector.recordError(error, context);
  console.log(chalk.green(`✓ Error recorded: ${message.slice(0, 50)}...`));
}

/**
 * Show predictions
 */
function showPredictions() {
  const prediction = detector.predictErrors();

  console.log(chalk.bold('\n🔮 Error Predictions\n'));

  if (!prediction.hasWarnings) {
    console.log('  ✅ No significant error patterns detected.');
    console.log('');
    return;
  }

  console.log(`  Found ${prediction.predictions.length} potential issues:\n`);

  for (const p of prediction.predictions) {
    if (p.type === 'pattern_based') {
      console.log(chalk.yellow(`  📊 ${p.pattern}`));
      console.log(`     Probability: ${p.probability}%`);
      console.log(`     ${p.description}`);
      if (p.autoFix) {
        console.log(chalk.green(`     Fix: ${p.autoFix}`));
      }
    } else if (p.type === 'risk_based') {
      console.log(chalk.red(`  ⚠️  Risk-based warning`));
      console.log(`     Probability: ${p.probability}%`);
      console.log(`     ${p.description}`);
    }
    console.log('');
  }
}

/**
 * List risk factors
 */
function listRiskFactors() {
  const lines = [];
  lines.push('\n  📋 Risk Factors\n');
  lines.push('  ─────────────────────────────────────────\n');

  const categories = ['code', 'process', 'environment', 'history'];

  for (const category of categories) {
    lines.push(`  ${category.toUpperCase()}:`);
    for (const [key, risk] of Object.entries(RISK_FACTORS)) {
      if (risk.category === category) {
        const icon = risk.severity === 'high' ? '⚠️' :
                    risk.severity === 'medium' ? '⚡' : 'ℹ️';
        lines.push(`    ${icon} ${risk.id.padEnd(25)} (+${risk.weight})`);
      }
    }
    lines.push('');
  }

  console.log(lines.join('\n'));
}

/**
 * List error patterns
 */
function listErrorPatterns() {
  const lines = [];
  lines.push('\n  📋 Error Patterns\n');
  lines.push('  ─────────────────────────────────────────\n');

  for (const [name, pattern] of Object.entries(ERROR_PATTERNS)) {
    lines.push(`  ${name}:`);
    lines.push(`    Category: ${pattern.category}`);
    lines.push(`    Auto-fix: ${pattern.autoFix}`);
    lines.push('');
  }

  console.log(lines.join('\n'));
}

/**
 * Reset state
 */
function resetState() {
  detector.reset();
  console.log(chalk.green('✓ Predictive error state reset'));
}

// Configure CLI
program
  .name('aios predict')
  .description('Predictive error detection and risk analysis')
  .version('1.0.0');

// Default command: report
program
  .command('report', { isDefault: true })
  .description('Show full prediction report')
  .action(showReport);

// Status command
program
  .command('status')
  .description('Show brief status line')
  .action(showStatus);

// Analyze command
program
  .command('analyze')
  .description('Run risk analysis')
  .option('--uncommitted', 'Has uncommitted changes')
  .option('--diff-lines <number>', 'Number of diff lines')
  .option('--source-files <number>', 'Number of source files')
  .option('--test-files <number>', 'Number of test files')
  .option('--deps', 'Has dependency changes')
  .option('--agents <number>', 'Number of active agents')
  .option('--changes <number>', 'Number of recent file changes')
  .option('--qg-failed', 'Last quality gate failed')
  .action(runAnalyze);

// History command
program
  .command('history')
  .description('Show error history')
  .option('-l, --limit <number>', 'Number of entries to show', '10')
  .action(showHistory);

// Record command
program
  .command('record <message>')
  .description('Record an error manually')
  .option('-c, --category <category>', 'Error category')
  .action(recordError);

// Predictions command
program
  .command('predictions')
  .description('Show error predictions')
  .action(showPredictions);

// List risk factors
program
  .command('risks')
  .description('List available risk factors')
  .action(listRiskFactors);

// List error patterns
program
  .command('patterns')
  .description('List known error patterns')
  .action(listErrorPatterns);

// Reset command
program
  .command('reset')
  .description('Reset prediction state')
  .action(resetState);

// Parse arguments
program.parse(process.argv);

// Show help if no arguments
if (!process.argv.slice(2).length) {
  program.outputHelp();
}
