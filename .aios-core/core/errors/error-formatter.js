/**
 * ErrorFormatter - Error formatting for multiple output formats
 *
 * Provides:
 * - Text format (terminal-friendly with colors)
 * - JSON format (for APIs and logging)
 * - Markdown format (for documentation)
 * - Verbose and simple modes
 *
 * @module .aios-core/core/errors/error-formatter
 * @see Story STORY-OPT-D2
 */

const chalk = require('chalk');
const AIOSError = require('./base-error');

/**
 * Severity icons mapping
 * @constant {Object}
 */
const SEVERITY_ICONS = {
  CRITICAL: '[x]',
  ERROR: '[!]',
  WARNING: '[!]',
  INFO: '[i]',
};

/**
 * Severity colors mapping
 * @constant {Object}
 */
const SEVERITY_COLORS = {
  CRITICAL: chalk.red.bold,
  ERROR: chalk.red,
  WARNING: chalk.yellow,
  INFO: chalk.blue,
};

/**
 * ErrorFormatter - Formats errors for display
 *
 * @class ErrorFormatter
 *
 * @example
 * const formatter = new ErrorFormatter();
 * console.log(formatter.format(error, { verbose: true }));
 */
class ErrorFormatter {
  /**
   * Create a new ErrorFormatter
   * @param {Object} [options={}] - Default options
   * @param {string} [options.format='text'] - Default output format
   * @param {boolean} [options.verbose=false] - Default verbose mode
   * @param {boolean} [options.color=true] - Default color output
   */
  constructor(options = {}) {
    this.defaultOptions = {
      format: 'text',
      verbose: false,
      color: true,
      ...options,
    };
  }

  /**
   * Format an error
   *
   * @param {AIOSError|Error|null} error - Error to format
   * @param {Object} [options={}] - Formatting options
   * @param {string} [options.format='text'] - Output format (text|json|markdown)
   * @param {boolean} [options.verbose=false] - Verbose mode
   * @param {boolean} [options.color=true] - Color output
   * @returns {string} Formatted error string
   */
  format(error, options = {}) {
    // Handle null/undefined
    if (error == null) {
      return this.formatUnknown(options);
    }

    const opts = { ...this.defaultOptions, ...options };

    switch (opts.format) {
      case 'json':
        return this.formatAsJson(error, opts);
      case 'markdown':
        return this.formatAsMarkdown(error, opts);
      case 'text':
      default:
        return this.formatAsText(error, opts);
    }
  }

  /**
   * Format unknown/null error
   * @private
   * @param {Object} options - Options
   * @returns {string} Formatted unknown error
   */
  formatUnknown(options = {}) {
    const opts = { ...this.defaultOptions, ...options };
    const icon = SEVERITY_ICONS.ERROR;
    const color = SEVERITY_COLORS.ERROR;

    if (opts.color) {
      return `${color(`${icon} Unknown error occurred`)}`;
    }
    return `${icon} Unknown error occurred`;
  }

  /**
   * Format error as text (terminal-friendly)
   *
   * @param {AIOSError|Error} error - Error to format
   * @param {Object} [options={}] - Options
   * @param {boolean} [options.verbose=false] - Verbose mode
   * @param {boolean} [options.color=true] - Color output
   * @returns {string} Formatted text
   */
  formatAsText(error, options = {}) {
    const opts = { ...this.defaultOptions, ...options };

    // Handle null/undefined
    if (error == null) {
      return this.formatUnknown(opts);
    }

    const isAios = error instanceof AIOSError;
    const code = isAios ? error.code : error.code || 'UNKNOWN';
    const message = error.message || 'An unexpected error occurred';
    const severity = isAios ? error.severity : 'ERROR';
    const category = isAios ? error.category : 'GENERAL';
    const recoverySteps = isAios ? error.recoverySteps || [] : [];
    const docUrl = isAios ? error.docUrl : null;
    const context = isAios ? error.context : {};
    const icon = this.getSeverityIcon(severity);
    const color = SEVERITY_COLORS[severity] || SEVERITY_COLORS.ERROR;

    if (!opts.verbose) {
      // Simple format
      const lines = [];
      if (opts.color) {
        lines.push(color(`${icon} ${code}: ${message}`));
        if (recoverySteps.length > 0) {
          lines.push(chalk.cyan.dim(`   [i] ${recoverySteps[0]}`));
        }
      } else {
        lines.push(`${icon} ${code}: ${message}`);
        if (recoverySteps.length > 0) {
          lines.push(`   [i] ${recoverySteps[0]}`);
        }
      }
      return lines.join('\n');
    }

    // Verbose format with box
    const lines = [];
    const width = 50;

    // Top border
    lines.push(color('+' + '-'.repeat(width - 2) + '+'));
    lines.push(color(`| ${icon} Error: ${code}`.padEnd(width - 2) + '|'));
    lines.push(color('+' + '-'.repeat(width - 2) + '+'));

    // Details section
    lines.push(color('|') + ' Details:'.padEnd(width - 2) + color('|'));
    lines.push(color('|') + `   Category:   ${category}`.padEnd(width - 2) + color('|'));
    lines.push(color('|') + `   Severity:   ${severity}`.padEnd(width - 2) + color('|'));
    lines.push(color('|') + `   Message:    ${message}`.padEnd(width - 2) + color('|'));
    lines.push(color('+' + '-'.repeat(width - 2) + '+'));

    // Context section (if any)
    if (context && Object.keys(context).length > 0) {
      lines.push(color('|') + ' Context:'.padEnd(width - 2) + color('|'));
      for (const [key, value] of Object.entries(context)) {
        const valueStr = String(value);
        lines.push(color('|') + `   ${key}: ${valueStr}`.padEnd(width - 2) + color('|'));
      }
      lines.push(color('+' + '-'.repeat(width - 2) + '+'));
    }

    // Recovery steps section (if any)
    if (recoverySteps.length > 0) {
      lines.push(color('|') + ' Recovery:'.padEnd(width - 2) + color('|'));
      recoverySteps.forEach((step, index) => {
        lines.push(color('|') + `   ${index + 1}. ${step}`.padEnd(width - 2) + color('|'));
      });
      lines.push(color('+' + '-'.repeat(width - 2) + '+'));
    }

    // Documentation section (if available)
    if (docUrl) {
      lines.push(color('|') + ' Documentation:'.padEnd(width - 2) + color('|'));
      lines.push(color('|') + `   ${docUrl}`.padEnd(width - 2) + color('|'));
      lines.push(color('+' + '-'.repeat(width - 2) + '+'));
    }

    // Apply colors if enabled
    if (opts.color) {
      return lines.join('\n');
    }

    // Strip ANSI color codes if color disabled
    return lines.map((line) => this.stripAnsi(line)).join('\n');
  }

  /**
   * Format error as JSON
   *
   * @param {AIOSError|Error} error - Error to format
   * @param {Object} [options={}] - Options
   * @param {boolean} [options.verbose=false] - Verbose mode (includes context)
   * @returns {string} JSON string
   */
  formatAsJson(error, options = {}) {
    const opts = { ...this.defaultOptions, ...options };

    // Handle null/undefined
    if (error == null) {
      return JSON.stringify({
        name: 'UnknownError',
        code: 'UNKNOWN',
        message: 'Unknown error occurred',
        timestamp: new Date().toISOString(),
      });
    }

    const isAios = error instanceof AIOSError;

    const result = {
      name: error.name || 'Error',
      code: isAios ? error.code : error.code || 'UNKNOWN',
      message: error.message || 'An unexpected error occurred',
      category: isAios ? error.category : 'GENERAL',
      severity: isAios ? error.severity : 'ERROR',
      recoverable: isAios ? error.recoverable : false,
      recoverySteps: isAios ? error.recoverySteps || [] : [],
      docUrl: isAios ? error.docUrl : null,
      timestamp: isAios ? error.timestamp : new Date().toISOString(),
    };

    if (opts.verbose && isAios && error.context) {
      result.context = error.context;
    }

    return JSON.stringify(result, null, 2);
  }

  /**
   * Format error as Markdown
   *
   * @param {AIOSError|Error} error - Error to format
   * @param {Object} [options={}] - Options
   * @param {boolean} [options.verbose=false] - Verbose mode
   * @returns {string} Markdown string
   */
  formatAsMarkdown(error, options = {}) {
    const opts = { ...this.defaultOptions, ...options };

    // Handle null/undefined
    if (error == null) {
      return '# Error: Unknown\n\nAn unknown error occurred.';
    }

    const isAios = error instanceof AIOSError;
    const code = isAios ? error.code : error.code || 'UNKNOWN';
    const message = error.message || 'An unexpected error occurred';
    const severity = isAios ? error.severity : 'ERROR';
    const category = isAios ? error.category : 'GENERAL';
    const recoverySteps = isAios ? error.recoverySteps || [] : [];
    const docUrl = isAios ? error.docUrl : null;
    const context = isAios ? error.context : {};

    const lines = [];

    // Heading
    lines.push(`# Error: ${code}`);
    lines.push('');
    lines.push(message);
    lines.push('');

    // Details table
    lines.push('## Details');
    lines.push('');
    lines.push('| Property | Value |');
    lines.push('|----------|-------|');
    lines.push(`| Category | ${category} |`);
    lines.push(`| Severity | ${severity} |`);
    lines.push(`| Code | ${code} |`);
    lines.push('');

    // Recovery steps
    if (recoverySteps.length > 0) {
      lines.push('## Recovery Steps');
      lines.push('');
      recoverySteps.forEach((step, index) => {
        lines.push(`${index + 1}. ${step}`);
      });
      lines.push('');
    }

    // Context (verbose mode)
    if (opts.verbose && context && Object.keys(context).length > 0) {
      lines.push('## Context');
      lines.push('');
      lines.push('```json');
      lines.push(JSON.stringify(context, null, 2));
      lines.push('```');
      lines.push('');
    }

    // Documentation link
    if (docUrl) {
      lines.push('## Documentation');
      lines.push('');
      lines.push(`[View Documentation](${docUrl})`);
      lines.push('');
    }

    return lines.join('\n');
  }

  /**
   * Format multiple errors as a table
   *
   * @param {Array<AIOSError|Error>} errors - Errors to format
   * @param {Object} [options={}] - Options
   * @returns {string} Formatted table string
   */
  formatMultiple(errors, options = {}) {
    if (!errors || errors.length === 0) {
      return chalk.green('[ok] No errors to display');
    }

    const opts = { ...this.defaultOptions, ...options };
    const lines = [];

    // Header
    lines.push(chalk.bold('Error Summary'));
    lines.push('');

    // Table header
    lines.push(chalk.dim('Code'.padEnd(12)) + chalk.dim('Severity'.padEnd(12)) + chalk.dim('Message'));
    lines.push(chalk.dim('-'.repeat(60)));

    // Error rows
    errors.forEach((error) => {
      const isAios = error instanceof AIOSError;
      const code = isAios ? error.code : error.code || 'UNKNOWN';
      const severity = isAios ? error.severity : 'ERROR';
      const message = (error.message || 'Unknown error').substring(0, 40);

      const color = SEVERITY_COLORS[severity] || SEVERITY_COLORS.ERROR;
      lines.push(code.padEnd(12) + color(severity.padEnd(12)) + message);
    });

    lines.push('');

    // Summary
    const errorCount = errors.length;
    lines.push(chalk.cyan(`Total: ${errorCount} error${errorCount !== 1 ? 's' : ''}`));

    if (opts.color) {
      return lines.join('\n');
    }
    return lines.map((line) => this.stripAnsi(line)).join('\n');
  }

  /**
   * Get severity icon
   *
   * @param {string} severity - Severity level
   * @returns {string} Icon string
   */
  getSeverityIcon(severity) {
    return SEVERITY_ICONS[severity] || SEVERITY_ICONS.ERROR;
  }

  /**
   * Strip ANSI color codes from string
   * @private
   * @param {string} str - String with ANSI codes
   * @returns {string} String without ANSI codes
   */
  stripAnsi(str) {
    // eslint-disable-next-line no-control-regex
    return str.replace(/\x1b\[[0-9;]*m/g, '');
  }
}

/**
 * Format a user error (convenience function)
 *
 * @param {AIOSError|Error} error - Error to format
 * @param {Object} [options={}] - Formatting options
 * @returns {string} Formatted error string
 */
function formatUserError(error, options = {}) {
  const formatter = new ErrorFormatter();
  return formatter.format(error, options);
}

module.exports = {
  ErrorFormatter,
  formatUserError,
  SEVERITY_ICONS,
  SEVERITY_COLORS,
};
