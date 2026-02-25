/**
 * AIOS Errors Module - Entry Point
 *
 * Provides:
 * - AIOSError base class for structured errors
 * - ErrorCodes loader for error definitions
 * - ErrorFactory for convenient error creation with shortcuts
 * - createError factory function for quick error creation
 * - ErrorFormatter for multi-format error display
 * - RecoveryEngine for auto-fix and recovery suggestions
 *
 * @module .aios-core/core/errors
 * @see Story STORY-OPT-D1
 * @see Story STORY-OPT-D2
 * @see Story ERR-001: Unified Error System
 *
 * @example
 * // Import all exports
 * const { AIOSError, ErrorCodes, ErrorFactory, createError } = require('@aios-core/core/errors');
 *
 * // Using ErrorFactory shortcuts (recommended)
 * throw ErrorFactory.fileNotFound('/config.yaml');
 * throw ErrorFactory.agentNotFound('dev');
 * throw ErrorFactory.configNotFound();
 *
 * // Create error from error code
 * throw createError('CFG_001', { context: { path: '/config.yaml' } });
 *
 * // Create error manually
 * throw new AIOSError('CUSTOM_001', 'Custom error message', {
 *   category: 'CONFIG',
 *   severity: 'ERROR',
 *   recoverable: true
 * });
 */

const AIOSError = require('./base-error');
const ErrorCodes = require('./error-codes');
const ErrorFactory = require('./error-factory');
const { ErrorFormatter, formatUserError } = require('./error-formatter');
const { RecoveryEngine, suggestFix } = require('./recovery-engine');

/**
 * Create an AIOSError from an error code definition
 *
 * This is the recommended way to create errors, as it automatically
 * loads the error definition from the error codes YAML file.
 *
 * @param {string} code - Error code (e.g., 'CFG_001')
 * @param {Object} [options={}] - Additional options
 * @param {Object} [options.context={}] - Error context variables
 * @param {Object} [options.variables={}] - Variables for message interpolation
 * @param {Error} [options.cause=null] - Original error that caused this error
 * @returns {AIOSError} Created error instance
 *
 * @example
 * // Basic usage
 * throw createError('CFG_001');
 *
 * @example
 * // With context
 * throw createError('CFG_002', {
 *   variables: { field: 'database.url' },
 *   context: { file: 'config.yaml', line: 42 }
 * });
 *
 * @example
 * // With cause (error chaining)
 * try {
 *   fs.readFileSync('config.yaml');
 * } catch (originalError) {
 *   throw createError('CFG_001', {
 *     context: { path: 'config.yaml' },
 *     cause: originalError
 *   });
 * }
 */
function createError(code, options = {}) {
  const opts = options || {};

  // Get error definition from codes
  const errorDef = ErrorCodes.getError(code);

  // If no definition found, create a generic error
  if (!errorDef) {
    return new AIOSError(code, `Unknown error code: ${code}`, {
      category: 'GENERAL',
      severity: 'ERROR',
      recoverable: false,
      context: opts.context || {},
    });
  }

  // Interpolate variables if provided
  const variables = opts.variables || {};
  const interpolatedDef = ErrorCodes.interpolate(errorDef, variables);

  // Create the error
  const error = new AIOSError(code, interpolatedDef.message, {
    category: interpolatedDef.category,
    severity: interpolatedDef.severity,
    recoverable: interpolatedDef.recoverable,
    recoverySteps: interpolatedDef.recoverySteps || [],
    docUrl: interpolatedDef.docUrl,
    context: opts.context || {},
  });

  // Store original cause if provided
  if (opts.cause) {
    error.cause = opts.cause;
  }

  // Store interpolated userMessage
  if (interpolatedDef.userMessage) {
    error.userMessage = interpolatedDef.userMessage;
  }

  return error;
}

/**
 * Check if a value is an AIOSError
 *
 * @param {*} value - Value to check
 * @returns {boolean} True if value is an AIOSError instance
 */
function isAIOSError(value) {
  return value instanceof AIOSError;
}

/**
 * Get user-friendly message from an error
 *
 * If the error is an AIOSError, returns the user-friendly message.
 * Otherwise, returns a generic message based on the error type.
 *
 * @param {Error} error - Error to get message from
 * @returns {string} User-friendly error message
 */
function getUserMessage(error) {
  if (isAIOSError(error)) {
    return error.userMessage || error.message;
  }

  if (error instanceof Error) {
    return error.message || 'An unexpected error occurred';
  }

  // Handle null, undefined, or other non-Error values
  if (error == null) {
    return 'An unexpected error occurred';
  }

  const strValue = String(error);
  return strValue || 'An unexpected error occurred';
}

module.exports = {
  // Classes
  AIOSError,
  ErrorCodes,
  ErrorFactory,
  ErrorFormatter,
  RecoveryEngine,

  // Factory functions
  createError,

  // Utility functions
  isAIOSError,
  getUserMessage,
  formatUserError,
  suggestFix,
};
