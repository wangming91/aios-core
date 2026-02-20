/**
 * ErrorCodes - Error Code Loader and Manager for AIOS
 *
 * Provides:
 * - Loading error definitions from YAML
 * - Querying error codes by code or category
 * - Variable interpolation in error messages
 *
 * @module .aios-core/core/errors/error-codes
 * @see Story STORY-OPT-D1
 */

const fs = require('fs');
const path = require('path');
const yaml = require('js-yaml');

/**
 * Path to error codes YAML file
 * @constant {string}
 */
const ERROR_CODES_PATH = path.join(__dirname, 'error-codes.yaml');

/**
 * Cache for loaded error codes
 * @type {Object|null}
 * @private
 */
let _cache = null;

/**
 * ErrorCodes - Static class for managing error code definitions
 *
 * @class ErrorCodes
 */
class ErrorCodes {
  /**
   * Load error codes from YAML file
   *
   * @returns {Object} Loaded error codes data
   * @throws {Error} If YAML file cannot be loaded
   */
  static load() {
    if (_cache) {
      return _cache;
    }

    if (!fs.existsSync(ERROR_CODES_PATH)) {
      throw new Error(`Error codes file not found: ${ERROR_CODES_PATH}`);
    }

    try {
      const content = fs.readFileSync(ERROR_CODES_PATH, 'utf8');
      _cache = yaml.load(content);
      return _cache;
    } catch (error) {
      throw new Error(`Failed to parse error codes YAML: ${error.message}`);
    }
  }

  /**
   * Reset the cache (useful for testing)
   *
   * @private
   */
  static _resetCache() {
    _cache = null;
  }

  /**
   * Get error definition by code
   *
   * @param {string} code - Error code (e.g., 'CFG_001')
   * @returns {Object|null} Error definition or null if not found
   */
  static getError(code) {
    if (!code || typeof code !== 'string' || code.trim() === '') {
      return null;
    }

    const data = ErrorCodes.load();
    if (!data || !data.codes) {
      return null;
    }

    return data.codes[code] || null;
  }

  /**
   * Get all errors for a specific category
   *
   * @param {string} category - Category name (e.g., 'CONFIG')
   * @returns {Object[]} Array of error definitions
   */
  static getErrorsByCategory(category) {
    if (!category || typeof category !== 'string') {
      return [];
    }

    const data = ErrorCodes.load();
    if (!data || !data.codes) {
      return [];
    }

    return Object.values(data.codes).filter(
      (error) => error.category === category,
    );
  }

  /**
   * Interpolate variables in error definition
   *
   * Replaces {variable} placeholders in message, userMessage,
   * and recoverySteps with provided values.
   *
   * @param {Object} errorDef - Error definition object
   * @param {Object} variables - Variables to interpolate
   * @returns {Object|null} Interpolated error definition or null if input is null
   *
   * @example
   * const errorDef = { message: 'Error in {file}' };
   * const result = ErrorCodes.interpolate(errorDef, { file: 'config.yaml' });
   * // result.message === 'Error in config.yaml'
   */
  static interpolate(errorDef, variables = {}) {
    if (!errorDef) {
      return null;
    }

    if (!variables || typeof variables !== 'object') {
      return { ...errorDef };
    }

    const result = { ...errorDef };

    // Helper function to interpolate a string
    const interpolateString = (str) => {
      if (typeof str !== 'string') {
        return str;
      }

      let result = str;
      for (const [key, value] of Object.entries(variables)) {
        const placeholder = `{${key}}`;
        result = result.replace(new RegExp(placeholder, 'g'), String(value));
      }
      return result;
    };

    // Interpolate message fields
    if (result.message) {
      result.message = interpolateString(result.message);
    }
    if (result.userMessage) {
      result.userMessage = interpolateString(result.userMessage);
    }

    // Interpolate recovery steps
    if (Array.isArray(result.recoverySteps)) {
      result.recoverySteps = result.recoverySteps.map(interpolateString);
    }

    return result;
  }

  /**
   * Get all category definitions
   *
   * @returns {Object} Category definitions
   */
  static getCategories() {
    const data = ErrorCodes.load();
    return data?.categories || {};
  }

  /**
   * Get metadata about the error codes file
   *
   * @returns {Object} Metadata object
   */
  static getMetadata() {
    const data = ErrorCodes.load();
    return data?.metadata || {};
  }

  /**
   * Check if an error code exists
   *
   * @param {string} code - Error code to check
   * @returns {boolean} True if code exists
   */
  static hasError(code) {
    if (!code || typeof code !== 'string') {
      return false;
    }

    const data = ErrorCodes.load();
    return !!(data?.codes?.[code]);
  }

  /**
   * Get all error codes
   *
   * @returns {string[]} Array of all error codes
   */
  static getAllCodes() {
    const data = ErrorCodes.load();
    if (!data?.codes) {
      return [];
    }
    return Object.keys(data.codes);
  }
}

module.exports = ErrorCodes;
