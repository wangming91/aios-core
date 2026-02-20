/**
 * ProgressTracker — Tour Progress Tracking
 *
 * Provides persistent storage for tour progress across sessions.
 * Stores progress in .aios-core/data/onboarding-state.yaml
 *
 * @module core/onboarding/progress-tracker
 * @version 1.0.0
 * @story STORY-OPT-A1
 */

const fs = require('fs');
const path = require('path');
const yaml = require('js-yaml');

/**
 * Default state structure
 */
const DEFAULT_STATE = {
  version: '1.0.0',
  lastUpdated: new Date().toISOString(),
  tours: {},
};

/**
 * ProgressTracker class for managing tour progress persistence
 */
class ProgressTracker {
  /**
   * Create a ProgressTracker instance
   * @param {string} projectRoot - Project root directory
   */
  constructor(projectRoot) {
    this.projectRoot = projectRoot || process.cwd();
    this.stateFilePath = path.join(
      this.projectRoot,
      '.aios-core',
      'data',
      'onboarding-state.yaml'
    );
    this.state = this._loadState();
  }

  /**
   * Load state from file or create default
   * @returns {Object} State object
   * @private
   */
  _loadState() {
    try {
      if (!fs.existsSync(this.stateFilePath)) {
        return { ...DEFAULT_STATE, lastUpdated: new Date().toISOString() };
      }

      const content = fs.readFileSync(this.stateFilePath, 'utf8');
      const state = yaml.load(content);

      // Validate loaded state
      if (!state || typeof state !== 'object') {
        return { ...DEFAULT_STATE };
      }

      // Ensure required fields
      return {
        version: state.version || DEFAULT_STATE.version,
        lastUpdated: state.lastUpdated || new Date().toISOString(),
        tours: state.tours || {},
      };
    } catch (error) {
      // Return default state on any error
      return { ...DEFAULT_STATE };
    }
  }

  /**
   * Persist state to file
   * @private
   */
  _saveState() {
    try {
      // Ensure directory exists
      const dir = path.dirname(this.stateFilePath);
      if (!fs.existsSync(dir)) {
        fs.mkdirSync(dir, { recursive: true });
      }

      this.state.lastUpdated = new Date().toISOString();
      const yamlContent = yaml.dump(this.state, { lineWidth: -1 });
      fs.writeFileSync(this.stateFilePath, yamlContent, 'utf8');
    } catch (error) {
      // Gracefully handle write errors
      console.error('Failed to save tour progress:', error.message);
    }
  }

  /**
   * Save tour progress
   * @param {Object} tourProgress - Tour progress object
   * @param {string} tourProgress.tourId - Tour ID
   * @param {string} tourProgress.status - Tour status
   * @param {number} tourProgress.currentStepIndex - Current step index
   * @param {string[]} tourProgress.completedSteps - Completed step IDs
   */
  save(tourProgress) {
    if (!tourProgress || !tourProgress.tourId) {
      return;
    }

    const now = new Date().toISOString();
    const existingProgress = this.state.tours[tourProgress.tourId] || {};

    this.state.tours[tourProgress.tourId] = {
      tourId: tourProgress.tourId,
      status: tourProgress.status || 'in-progress',
      currentStepIndex: tourProgress.currentStepIndex || 0,
      completedSteps: tourProgress.completedSteps || [],
      startedAt: existingProgress.startedAt || now,
      lastActivityAt: now,
      completedAt: tourProgress.status === 'completed' ? now : existingProgress.completedAt,
    };

    this._saveState();
  }

  /**
   * Load progress for a specific tour or all tours
   * @param {string} [tourId] - Tour ID (optional, returns all if undefined)
   * @returns {Object|null} Tour progress or all progress
   */
  load(tourId) {
    // undefined means "load all", null is treated as invalid
    if (tourId === undefined) {
      return this.state;
    }

    // null or non-string should return null
    if (tourId === null || typeof tourId !== 'string') {
      return null;
    }

    // Empty string should return null
    if (!tourId) {
      return null;
    }

    const progress = this.state.tours[tourId];
    if (!progress || typeof progress !== 'object') {
      return null;
    }

    return progress;
  }

  /**
   * Reset progress for a specific tour or all tours
   * @param {string} [tourId] - Tour ID (optional, resets all if not provided)
   */
  reset(tourId) {
    if (tourId === undefined || tourId === null) {
      this.state.tours = {};
    } else if (tourId) {
      delete this.state.tours[tourId];
    }

    this._saveState();
  }

  /**
   * Get status of a tour
   * @param {string} tourId - Tour ID
   * @returns {string} Tour status: 'not-started', 'in-progress', 'completed'
   */
  getTourStatus(tourId) {
    const progress = this.load(tourId);
    if (!progress) {
      return 'not-started';
    }
    return progress.status || 'not-started';
  }

  /**
   * Check if a tour is completed
   * @param {string} tourId - Tour ID
   * @returns {boolean} True if tour is completed
   */
  isTourCompleted(tourId) {
    return this.getTourStatus(tourId) === 'completed';
  }

  /**
   * Get completed steps for a tour
   * @param {string} tourId - Tour ID
   * @returns {string[]} Array of completed step IDs
   */
  getCompletedSteps(tourId) {
    const progress = this.load(tourId);
    if (!progress) {
      return [];
    }
    return progress.completedSteps || [];
  }

  /**
   * Get current step index for a tour
   * @param {string} tourId - Tour ID
   * @returns {number} Current step index (0-based)
   */
  getCurrentStepIndex(tourId) {
    const progress = this.load(tourId);
    if (!progress) {
      return 0;
    }
    return progress.currentStepIndex || 0;
  }

  /**
   * Mark a step as completed
   * @param {string} tourId - Tour ID
   * @param {string} stepId - Step ID
   */
  markStepCompleted(tourId, stepId) {
    if (!tourId || !stepId) {
      return;
    }

    const existingProgress = this.load(tourId) || {
      tourId,
      status: 'in-progress',
      currentStepIndex: 0,
      completedSteps: [],
    };

    // Don't duplicate steps
    if (!existingProgress.completedSteps.includes(stepId)) {
      existingProgress.completedSteps.push(stepId);
    }

    // Increment step index
    existingProgress.currentStepIndex = (existingProgress.currentStepIndex || 0) + 1;

    this.save(existingProgress);
  }

  /**
   * Mark a tour as completed
   * @param {string} tourId - Tour ID
   */
  markTourCompleted(tourId) {
    if (!tourId) {
      return;
    }

    const existingProgress = this.load(tourId) || {
      tourId,
      status: 'completed',
      currentStepIndex: 0,
      completedSteps: [],
    };

    existingProgress.status = 'completed';
    existingProgress.completedAt = new Date().toISOString();
    existingProgress.lastActivityAt = new Date().toISOString();

    this.save(existingProgress);
  }

  /**
   * Clear the cache and reload state (useful for testing)
   */
  _resetCache() {
    this.state = { ...DEFAULT_STATE, lastUpdated: new Date().toISOString() };
  }
}

module.exports = ProgressTracker;
