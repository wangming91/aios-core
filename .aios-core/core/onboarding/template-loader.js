/**
 * TemplateLoader — Tour Template Loading
 *
 * Loads and validates YAML tour templates.
 * Supports variable interpolation and template validation.
 *
 * @module core/onboarding/template-loader
 * @version 1.0.0
 * @story STORY-OPT-A1
 */

const fs = require('fs');
const path = require('path');
const yaml = require('js-yaml');

/**
 * Valid step types
 */
const VALID_STEP_TYPES = ['info', 'interactive', 'command', 'complete'];

/**
 * Valid action types
 */
const VALID_ACTION_TYPES = ['confirm', 'command', 'input', 'select'];

/**
 * TemplateLoader class for loading and validating tour templates
 */
class TemplateLoader {
  /**
   * Create a TemplateLoader instance
   * @param {string} [templatesDir] - Custom templates directory
   */
  constructor(templatesDir) {
    this.templatesDir = templatesDir || path.join(__dirname, 'templates');
    this._cache = {};
  }

  /**
   * Load a template by tour ID
   * @param {string} tourId - Tour ID
   * @returns {Object|null} Template object or null if not found
   */
  loadTemplate(tourId) {
    if (!tourId || typeof tourId !== 'string') {
      return null;
    }

    // Check cache
    if (this._cache[tourId]) {
      return this._cache[tourId];
    }

    const templatePath = path.join(this.templatesDir, `${tourId}.tour.yaml`);

    try {
      if (!fs.existsSync(templatePath)) {
        return null;
      }

      const content = fs.readFileSync(templatePath, 'utf8');
      const template = yaml.load(content);

      if (!template) {
        return null;
      }

      // Cache the loaded template
      this._cache[tourId] = template;
      return template;
    } catch (error) {
      // Return null on any error
      return null;
    }
  }

  /**
   * Validate a template structure
   * @param {Object} template - Template to validate
   * @returns {Object} Validation result { valid: boolean, errors: string[] }
   */
  validateTemplate(template) {
    const errors = [];

    if (!template) {
      return { valid: false, errors: ['Template is null or undefined'] };
    }

    // Required fields
    if (!template.id) {
      errors.push('Template must have an "id" field');
    }

    if (!template.title) {
      errors.push('Template must have a "title" field');
    }

    // Validate steps
    if (!template.steps) {
      errors.push('Template must have a "steps" array');
    } else if (!Array.isArray(template.steps)) {
      errors.push('Template "steps" must be an array');
    } else if (template.steps.length === 0) {
      errors.push('Template must have at least one step');
    } else {
      // Validate each step
      template.steps.forEach((step, index) => {
        if (!step.id) {
          errors.push(`Step at index ${index} must have an "id" field`);
        }

        if (!step.type) {
          errors.push(`Step "${step.id || index}" must have a "type" field`);
        } else if (!VALID_STEP_TYPES.includes(step.type)) {
          errors.push(
            `Step "${step.id || index}" has invalid type "${step.type}". ` +
              `Valid types: ${VALID_STEP_TYPES.join(', ')}`
          );
        }

        // Validate action if present
        if (step.action) {
          if (!step.action.type) {
            errors.push(`Step "${step.id || index}" action must have a "type"`);
          } else if (!VALID_ACTION_TYPES.includes(step.action.type)) {
            errors.push(
              `Step "${step.id || index}" has invalid action type "${step.action.type}". ` +
                `Valid types: ${VALID_ACTION_TYPES.join(', ')}`
            );
          }

          // Validate command action has command field
          if (step.action.type === 'command' && !step.action.command) {
            errors.push(`Step "${step.id || index}" command action must have a "command" field`);
          }
        }
      });
    }

    return {
      valid: errors.length === 0,
      errors,
    };
  }

  /**
   * Interpolate variables into template
   * @param {Object} template - Template object
   * @param {Object} variables - Variables to interpolate
   * @returns {Object} Template with interpolated values
   */
  interpolateVariables(template, variables) {
    if (!template) {
      return template;
    }

    if (!variables || Object.keys(variables).length === 0) {
      return template;
    }

    // Deep clone to avoid modifying original
    const interpolated = JSON.parse(JSON.stringify(template));

    // Interpolate in steps
    if (interpolated.steps && Array.isArray(interpolated.steps)) {
      interpolated.steps = interpolated.steps.map((step) =>
        this._interpolateStep(step, variables)
      );
    }

    // Interpolate in title and description
    if (interpolated.title) {
      interpolated.title = this._interpolateString(interpolated.title, variables);
    }

    if (interpolated.description) {
      interpolated.description = this._interpolateString(interpolated.description, variables);
    }

    return interpolated;
  }

  /**
   * Interpolate variables in a step
   * @param {Object} step - Step object
   * @param {Object} variables - Variables to interpolate
   * @returns {Object} Step with interpolated values
   * @private
   */
  _interpolateStep(step, variables) {
    const interpolated = { ...step };

    if (interpolated.title) {
      interpolated.title = this._interpolateString(interpolated.title, variables);
    }

    if (interpolated.content) {
      interpolated.content = this._interpolateString(interpolated.content, variables);
    }

    if (interpolated.action) {
      interpolated.action = { ...interpolated.action };

      if (interpolated.action.label) {
        interpolated.action.label = this._interpolateString(interpolated.action.label, variables);
      }

      if (interpolated.action.command) {
        interpolated.action.command = this._interpolateString(
          interpolated.action.command,
          variables
        );
      }
    }

    return interpolated;
  }

  /**
   * Interpolate variables in a string
   * @param {string} str - String with {variable} placeholders
   * @param {Object} variables - Variables to interpolate
   * @returns {string} Interpolated string
   * @private
   */
  _interpolateString(str, variables) {
    if (typeof str !== 'string') {
      return str;
    }

    return str.replace(/\{(\w+)\}/g, (match, key) => {
      return variables.hasOwnProperty(key) ? String(variables[key]) : match;
    });
  }

  /**
   * Get a step by ID from a template
   * @param {Object} template - Template object
   * @param {string} stepId - Step ID
   * @returns {Object|null} Step object or null
   */
  getStepById(template, stepId) {
    if (!template || !template.steps || !stepId) {
      return null;
    }

    return template.steps.find((step) => step.id === stepId) || null;
  }

  /**
   * Get the index of a step by ID
   * @param {Object} template - Template object
   * @param {string} stepId - Step ID
   * @returns {number} Step index or -1 if not found
   */
  getStepIndex(template, stepId) {
    if (!template || !template.steps || !stepId) {
      return -1;
    }

    return template.steps.findIndex((step) => step.id === stepId);
  }

  /**
   * Get total number of steps in a template
   * @param {Object} template - Template object
   * @returns {number} Total steps
   */
  getTotalSteps(template) {
    if (!template || !template.steps || !Array.isArray(template.steps)) {
      return 0;
    }

    return template.steps.length;
  }

  /**
   * List all available tour templates
   * @returns {string[]} Array of tour IDs
   */
  listTemplates() {
    try {
      if (!fs.existsSync(this.templatesDir)) {
        return [];
      }

      const files = fs.readdirSync(this.templatesDir);

      return files
        .filter((file) => file.endsWith('.tour.yaml'))
        .map((file) => file.replace('.tour.yaml', ''));
    } catch {
      return [];
    }
  }

  /**
   * Clear the template cache
   */
  clearCache() {
    this._cache = {};
  }
}

module.exports = TemplateLoader;
