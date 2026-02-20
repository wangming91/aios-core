/**
 * Fix Command Module
 *
 * CLI command for automatically fixing AIOS errors.
 *
 * Subcommands:
 *   aios fix <error-code>          # Execute auto-fix
 *   aios fix <error-code> --dry-run # Preview fix operations
 *   aios fix --last                # Fix last error
 *   aios fix --force               # Skip confirmation
 *
 * @module cli/commands/fix
 * @version 1.0.0
 * @story STORY-OPT-D3 - Doctor Command Enhancement
 */

'use strict';

const { Command } = require('commander');
const path = require('path');
const fs = require('fs');
const chalk = require('chalk');
const readline = require('readline');

const {
  ErrorCodes,
  RecoveryEngine,
  createError,
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
 * Format fix result for display
 * @param {Object} result - Fix result from RecoveryEngine
 * @param {Object} options - Display options
 * @returns {string} Formatted output
 */
function formatFixResult(result, options = {}) {
  const lines = [];
  const width = 60;

  if (result.dryRun) {
    // Dry run output
    lines.push(chalk.cyan('[i] Dry run mode - no changes will be made'));
    lines.push('');

    if (result.preview) {
      lines.push(chalk.bold('Healer: ') + result.preview.healer);
      lines.push(chalk.bold('Description: ') + result.preview.description);
      if (result.preview.requiresConfirmation) {
        lines.push(chalk.yellow('Requires confirmation before applying'));
      }
    }

    lines.push('');
    lines.push(chalk.green('[ok] Dry run complete. Run without --dry-run to apply changes.'));
  } else if (result.success) {
    // Success output
    lines.push(chalk.green('[+] Fix applied successfully!'));
    lines.push('');

    if (result.actions && result.actions.length > 0) {
      lines.push(chalk.bold('Actions performed:'));
      result.actions.forEach((action, index) => {
        lines.push(chalk.green(`   ${index + 1}. ${action}`));
      });
    }

    if (result.warnings && result.warnings.length > 0) {
      lines.push('');
      lines.push(chalk.yellow('Warnings:'));
      result.warnings.forEach((warning) => {
        lines.push(chalk.yellow(`   [!] ${warning}`));
      });
    }

    lines.push('');
    lines.push(chalk.dim('Verify the fix by running: aios doctor'));
  } else {
    // Failure output
    lines.push(chalk.red('[x] Fix failed'));
    lines.push('');

    if (result.message) {
      lines.push(chalk.red(`   Reason: ${result.message}`));
    }

    if (result.warnings && result.warnings.length > 0) {
      lines.push('');
      lines.push(chalk.yellow('Suggestions:'));
      result.warnings.forEach((warning) => {
        lines.push(chalk.yellow(`   - ${warning}`));
      });
    }

    if (result.actions && result.actions.length > 0) {
      lines.push('');
      lines.push(chalk.cyan('Manual steps:'));
      result.actions.forEach((action, index) => {
        lines.push(chalk.cyan(`   ${index + 1}. ${action}`));
      });
    }

    lines.push('');
    lines.push(chalk.dim('For more help, run: aios diagnose <error-code>'));
  }

  return lines.join('\n');
}

/**
 * Preview fix operations (dry run)
 * @param {string} errorCode - Error code
 * @param {Object} errorDef - Error definition
 * @param {Object} options - Options
 * @returns {Object} Preview result
 */
function previewFix(errorCode, errorDef, options = {}) {
  const recoveryEngine = new RecoveryEngine(process.cwd());
  const error = createError(errorCode, { context: options.context });
  const healer = recoveryEngine.getHealer(errorCode);

  return {
    dryRun: true,
    success: true,
    preview: healer ? {
      healer: healer.name,
      description: healer.description,
      requiresConfirmation: healer.requiresConfirmation,
    } : null,
    actions: healer ? [`Run ${healer.name} to fix: ${errorDef.message}`] : [],
    warnings: [],
  };
}

/**
 * Prompt user for confirmation
 * @param {string} message - Confirmation message
 * @returns {Promise<boolean>} User confirmed
 */
async function confirmAction(message) {
  const rl = readline.createInterface({
    input: process.stdin,
    output: process.stdout,
  });

  return new Promise((resolve) => {
    rl.question(`${message} (y/N): `, (answer) => {
      rl.close();
      resolve(answer.toLowerCase() === 'y' || answer.toLowerCase() === 'yes');
    });
  });
}

/**
 * Fix action handler
 * @param {string} errorCode - Error code to fix
 * @param {Object} options - Command options
 */
async function fixAction(errorCode, options) {
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
    console.log(chalk.dim('   Usage: aios fix <error-code>'));
    console.log(chalk.dim('   Or use: aios fix --last'));
    process.exit(1);
  }

  // Get error definition
  const errorDef = ErrorCodes.getError(errorCode);

  if (!errorDef) {
    console.log(chalk.yellow(`[!] Unknown error code: ${errorCode}`));
    console.log(chalk.dim('   This error code is not defined in the AIOS error registry.'));
    console.log(chalk.dim('   Run: aios diagnose --list to see all error codes'));
    return;
  }

  // Create recovery engine and error instance
  const recoveryEngine = new RecoveryEngine(process.cwd());
  const error = createError(errorCode, { context: options.context });

  // Check if auto-fix is available
  const canAutoFix = recoveryEngine.canAutoFix(error);

  if (!canAutoFix) {
    console.log(chalk.yellow('[!] Auto-fix is not available for this error.'));
    console.log(chalk.dim(`   Error: ${errorDef.message}`));
    console.log('');

    // Show manual recovery steps
    if (errorDef.recoverySteps && errorDef.recoverySteps.length > 0) {
      console.log(chalk.cyan('Manual recovery steps:'));
      errorDef.recoverySteps.forEach((step, index) => {
        console.log(chalk.cyan(`   ${index + 1}. ${step}`));
      });
    }

    console.log('');
    console.log(chalk.dim('For more details, run: aios diagnose ' + errorCode));
    return;
  }

  // Get healer info
  const healer = recoveryEngine.getHealer(errorCode);

  // Dry run mode
  if (options.dryRun) {
    const result = await recoveryEngine.executeAutoFix(error, { dryRun: true });
    console.log(formatFixResult(result, options));
    return;
  }

  // Check if confirmation is required
  if (healer && healer.requiresConfirmation && !options.force) {
    console.log(chalk.cyan(`[i] This fix requires confirmation.`));
    console.log(chalk.dim(`   Healer: ${healer.name}`));
    console.log(chalk.dim(`   Description: ${healer.description}`));
    console.log('');

    const confirmed = await confirmAction('Proceed with fix?');
    if (!confirmed) {
      console.log(chalk.yellow('[!] Fix cancelled.'));
      return;
    }
  }

  // Execute the fix
  console.log(chalk.cyan(`[i] Executing fix for: ${errorCode}`));
  console.log('');

  try {
    const result = await recoveryEngine.executeAutoFix(error, {
      dryRun: false,
      projectRoot: process.cwd(),
    });

    console.log(formatFixResult(result, options));

    if (!result.success) {
      process.exit(1);
    }
  } catch (fixError) {
    console.log(chalk.red(`[x] Fix execution failed: ${fixError.message}`));
    console.log(chalk.dim('   Try running: aios diagnose ' + errorCode));
    process.exit(1);
  }
}

/**
 * Create the fix command
 * @returns {Command} Commander command instance
 */
function createFixCommand() {
  const fixCmd = new Command('fix')
    .description('Automatically fix AIOS errors')
    .argument('[error-code]', 'Error code to fix (e.g., CFG_001)')
    .option('-l, --last', 'Fix the most recent error')
    .option('-d, --dry-run', 'Preview fix without applying changes', false)
    .option('-f, --force', 'Skip confirmation prompts', false)
    .action(async (errorCode, options) => {
      try {
        await fixAction(errorCode, options);
      } catch (error) {
        console.error(chalk.red(`[!] Fix failed: ${error.message}`));
        process.exit(1);
      }
    });

  return fixCmd;
}

module.exports = {
  createFixCommand,
  fixAction,
  formatFixResult,
  previewFix,
  loadLastError,
};
