/**
 * AIOSError - Base Error Class for AIOS
 *
 * Provides structured error handling with:
 * - Error codes for identification
 * - Categories for classification
 * - Severity levels
 * - Recovery suggestions
 * - User-friendly messages
 * - API serialization
 *
 * @module .aios-core/core/errors/base-error
 * @see Story STORY-OPT-D1
 */

/**
 * Valid severity levels for AIOSError
 * @constant {string[]}
 */
const _SEVERITY_LEVELS = ['CRITICAL', 'ERROR', 'WARNING', 'INFO'];

/**
 * Valid categories for AIOSError
 * @constant {string[]}
 */
const _CATEGORIES = ['CONFIG', 'AGENT', 'STORY', 'SYSTEM', 'IDS', 'GENERAL'];

/**
 * AIOSError - Structured error class for AIOS
 *
 * @class AIOSError
 * @extends Error
 *
 * @example
 * // Basic usage
 * throw new AIOSError('CFG_001', 'Configuration file not found');
 *
 * @example
 * // With all options
 * throw new AIOSError('CFG_001', 'Config error', {
 *   category: 'CONFIG',
 *   severity: 'ERROR',
 *   recoverable: true,
 *   recoverySteps: ['Run aios config init'],
 *   docUrl: 'https://docs.aios.dev/errors/CFG_001',
 *   context: { path: '/config.yaml' }
 * });
 */
class AIOSError extends Error {
  /**
   * Creates a new AIOSError instance
   *
   * @param {string} code - Error code (e.g., 'CFG_001')
   * @param {string} message - Technical error message
   * @param {Object} [options={}] - Additional options
   * @param {string} [options.category='GENERAL'] - Error category
   * @param {string} [options.severity='ERROR'] - Severity level
   * @param {boolean} [options.recoverable=false] - Whether the error is recoverable
   * @param {string[]} [options.recoverySteps=[]] - Steps to recover from the error
   * @param {string|null} [options.docUrl=null] - URL to documentation
   * @param {Object} [options.context={}] - Additional error context
   */
  constructor(code, message, options = {}) {
    super(message);

    // Ensure options is an object
    const opts = options || {};

    // Set error name
    this.name = 'AIOSError';

    // Required properties
    this.code = code;
    this.message = message;

    // Optional properties with defaults
    this.category = opts.category || 'GENERAL';
    this.severity = opts.severity || 'ERROR';
    this.recoverable = opts.recoverable || false;
    this.recoverySteps = opts.recoverySteps || [];
    this.docUrl = opts.docUrl || null;
    this.context = opts.context || {};

    // Timestamp for error tracking
    this.timestamp = new Date().toISOString();

    // Capture stack trace (excludes constructor from stack)
    if (Error.captureStackTrace) {
      Error.captureStackTrace(this, AIOSError);
    }
  }

  /**
   * Returns a user-friendly message object
   *
   * This method formats the error for display to end users,
   * excluding technical details like stack traces.
   *
   * @returns {Object} User-friendly error object
   * @returns {string} returns.code - Error code
   * @returns {string} returns.message - Error message
   * @returns {string} returns.category - Error category
   * @returns {string} returns.severity - Severity level
   * @returns {boolean} returns.recoverable - Whether error is recoverable
   * @returns {string[]} returns.recoverySteps - Recovery steps
   * @returns {string|null} returns.docUrl - Documentation URL
   * @returns {Object} returns.context - Error context
   * @returns {string} returns.timestamp - ISO timestamp
   */
  toUserMessage() {
    return {
      code: this.code,
      message: this.message,
      category: this.category,
      severity: this.severity,
      recoverable: this.recoverable,
      recoverySteps: this.recoverySteps,
      docUrl: this.docUrl,
      context: this.context,
      timestamp: this.timestamp,
    };
  }

  /**
   * Returns a JSON-serializable object
   *
   * This method includes all error properties for logging,
   * debugging, and API responses.
   *
   * @returns {Object} JSON-serializable error object
   */
  toJSON() {
    return {
      name: this.name,
      code: this.code,
      message: this.message,
      category: this.category,
      severity: this.severity,
      recoverable: this.recoverable,
      recoverySteps: this.recoverySteps,
      docUrl: this.docUrl,
      context: this.context,
      timestamp: this.timestamp,
      stack: this.stack,
    };
  }
}

module.exports = AIOSError;
