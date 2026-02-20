/**
 * Diagnose Command Module
 *
 * CLI command for diagnosing AIOS errors.
 *
 * Subcommands:
 *   aios diagnose <error-code>     # Diagnose specific error
 *   aios diagnose --last           # Diagnose last error
 *   aios diagnose --format=json    # JSON output
 *   aios diagnose --verbose        # Verbose output
 *
 * @module cli/commands/diagnose
 * @version 1.0.0
 * @story STORY-OPT-D3 - Doctor Command Enhancement
 */

'use strict';

const { Command } = require('commander');
const path = require('path');
const fs = require('fs');
const chalk = require('chalk');

const {
  ErrorCodes,
  ErrorFormatter,
  RecoveryEngine,
  createError,
  isAIOSError,
} = require('../../../core/errors');

/**
 * Get the path to the last error file
 * @returns {string} Path to last error file
 */
function getLastErrorPath() {
  return path.join(process.cwd(), '.aios', 'logs', 'last-error.json');
}

/**
 * Load the last error from file
 * @returns {Object|null} Last error object or null
 */
function loadLastError() {
  const lastErrorPath = getLastErrorPath();

  if (!fs.existsSync(lastErrorPath)) {
    return null;
  }

  try {
    const content = fs.readFileSync(lastErrorPath, 'utf8');
    return JSON.parse(content);
  } catch (error) {
    return null;
  }
}

/**
 * Format error for display
 * @param {Object} errorDef - Error definition
 * @param {Object} options - Display options
 * @returns {string} Formatted output
 */
function formatErrorDiagnosis(errorDef, options = {}) {
  const formatter = new ErrorFormatter({
    format: options.format || 'text',
    verbose: options.verbose || false,
    color: options.color !== false,
  });

  // Create error instance for formatting
  const error = createError(errorDef.code || 'UNKNOWN', {
    context: errorDef.context || {},
  });

  if (options.format === 'json') {
    return formatter.formatAsJson(error, { verbose: options.verbose });
  }

  // Build rich text output
  const lines = [];
  const width = 50;

  // Header
  const headerColor = error.severity === 'CRITICAL' ? chalk.red.bold : chalk.yellow.bold;
  lines.push(headerColor('+' + '-'.repeat(width - 2) + '+'));
  lines.push(headerColor(`| [i] Error Analysis: ${errorDef.code || 'UNKNOWN'}`.padEnd(width - 2) + '|'));
  lines.push(headerColor('+' + '-'.repeat(width - 2) + '+'));

  // Details section
  lines.push(chalk.dim('|') + ' Details:'.padEnd(width - 2) + chalk.dim('|'));
  lines.push(chalk.dim('|') + `   Code:        ${errorDef.code || 'UNKNOWN'}`.padEnd(width - 2) + chalk.dim('|'));
  lines.push(chalk.dim('|') + `   Category:    ${errorDef.category || 'GENERAL'}`.padEnd(width - 2) + chalk.dim('|'));

  const severityColor = {
    CRITICAL: chalk.red,
    ERROR: chalk.red,
    WARNING: chalk.yellow,
    INFO: chalk.blue,
  }[errorDef.severity] || chalk.white;
  lines.push(chalk.dim('|') + `   Severity:    ${severityColor(errorDef.severity || 'ERROR')}`.padEnd(width - 2) + chalk.dim('|'));
  lines.push(chalk.dim('|') + `   Message:     ${errorDef.message || 'Unknown error'}`.padEnd(width - 2) + chalk.dim('|'));
  lines.push(headerColor('+' + '-'.repeat(width - 2) + '+'));

  // Context section (if any)
  if (errorDef.context && Object.keys(errorDef.context).length > 0) {
    lines.push(chalk.dim('|') + ' Context:'.padEnd(width - 2) + chalk.dim('|'));
    for (const [key, value] of Object.entries(errorDef.context)) {
      lines.push(chalk.dim('|') + `   ${key}: ${String(value)}`.padEnd(width - 2) + chalk.dim('|'));
    }
    lines.push(headerColor('+' + '-'.repeat(width - 2) + '+'));
  }

  // Recovery suggestions section
  const recoverySteps = errorDef.recoverySteps || [];
  if (recoverySteps.length > 0) {
    lines.push(chalk.cyan.dim('|') + chalk.cyan(' Recovery Suggestions:').padEnd(width - 2) + chalk.cyan.dim('|'));
    recoverySteps.forEach((step, index) => {
      lines.push(chalk.cyan.dim('|') + chalk.cyan(`   ${index + 1}. ${step}`).padEnd(width - 2) + chalk.cyan.dim('|'));
    });
    lines.push(headerColor('+' + '-'.repeat(width - 2) + '+'));
  }

  // Auto-fix section
  const recoveryEngine = new RecoveryEngine(process.cwd());
  const mockError = createError(errorDef.code || 'UNKNOWN');
  const canAutoFix = recoveryEngine.canAutoFix(mockError);

  if (canAutoFix) {
    lines.push(chalk.green.dim('|') + chalk.green(' Auto-fix: Available').padEnd(width - 2) + chalk.green.dim('|'));
    lines.push(chalk.green.dim('|') + chalk.green(`   Run 'aios fix ${errorDef.code}' to fix automatically`).padEnd(width - 2) + chalk.green.dim('|'));
    lines.push(headerColor('+' + '-'.repeat(width - 2) + '+'));
  } else if (errorDef.recoverable === false) {
    lines.push(chalk.red.dim('|') + chalk.red(' Auto-fix: Not available (manual fix required)').padEnd(width - 2) + chalk.red.dim('|'));
    lines.push(headerColor('+' + '-'.repeat(width - 2) + '+'));
  }

  // Documentation section
  if (errorDef.docUrl) {
    lines.push(chalk.blue.dim('|') + chalk.blue(' Documentation:').padEnd(width - 2) + chalk.blue.dim('|'));
    lines.push(chalk.blue.dim('|') + chalk.blue(`   ${errorDef.docUrl}`).padEnd(width - 2) + chalk.blue.dim('|'));
    lines.push(headerColor('+' + '-'.repeat(width - 2) + '+'));
  }

  return lines.join('\n');
}

/**
 * Diagnose action handler
 * @param {string} errorCode - Error code to diagnose
 * @param {Object} options - Command options
 */
async function diagnoseAction(errorCode, options) {
  // Handle --last option
  if (options.last) {
    const lastError = loadLastError();
    if (!lastError) {
      console.log(chalk.yellow('[!] No recent error found.'));
      console.log(chalk.dim('   Errors are logged when AIOS commands fail.'));
      return;
    }
    errorCode = lastError.code;
    options.context = lastError.context;
  }

  // Check if error code is provided
  if (!errorCode) {
    console.error(chalk.red('[!] Error code is required.'));
    console.log(chalk.dim('   Usage: aios diagnose <error-code>'));
    console.log(chalk.dim('   Or use: aios diagnose --last'));
    process.exit(1);
  }

  // Get error definition
  const errorDef = ErrorCodes.getError(errorCode);

  if (!errorDef) {
    console.log(chalk.yellow(`[!] Unknown error code: ${errorCode}`));
    console.log(chalk.dim('   This error code is not defined in the AIOS error registry.'));
    console.log(chalk.dim('   It may be from a custom extension or a newer version.'));
    return;
  }

  // Merge context from options
  if (options.context) {
    errorDef.context = { ...errorDef.context, ...options.context };
  }

  // Format and output
  if (options.format === 'json') {
    const formatter = new ErrorFormatter({ format: 'json' });
    const error = createError(errorCode, { context: errorDef.context });
    console.log(formatter.formatAsJson(error, { verbose: options.verbose }));
  } else {
    console.log(formatErrorDiagnosis(errorDef, {
      format: options.format,
      verbose: options.verbose,
      color: true,
    }));
  }
}

/**
 * Create the diagnose command
 * @returns {Command} Commander command instance
 */
function createDiagnoseCommand() {
  const diagnoseCmd = new Command('diagnose')
    .description('Diagnose AIOS errors and get recovery suggestions')
    .argument('[error-code]', 'Error code to diagnose (e.g., CFG_001)')
    .option('-l, --last', 'Diagnose the most recent error')
    .option('-f, --format <format>', 'Output format (text|json)', 'text')
    .option('-v, --verbose', 'Show detailed information', false)
    .action(async (errorCode, options) => {
      try {
        await diagnoseAction(errorCode, options);
      } catch (error) {
        console.error(chalk.red(`[!] Diagnose failed: ${error.message}`));
        process.exit(1);
      }
    });

  return diagnoseCmd;
}

module.exports = {
  createDiagnoseCommand,
  diagnoseAction,
  formatErrorDiagnosis,
  loadLastError,
};
