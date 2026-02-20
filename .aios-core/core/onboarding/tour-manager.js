/**
 * TourManager — Interactive Tour Management
 *
 * Manages tour lifecycle: start, resume, complete, reset.
 * Integrates ProgressTracker for persistence and TemplateLoader for templates.
 *
 * @module core/onboarding/tour-manager
 * @version 1.0.0
 * @story STORY-OPT-A1
 */

const ProgressTracker = require('./progress-tracker');
const TemplateLoader = require('./template-loader');

/**
 * Default tour ID
 */
const DEFAULT_TOUR_ID = 'first-run';

/**
 * TourManager class for managing interactive tours
 */
class TourManager {
  /**
   * Create a TourManager instance
   * @param {string} projectRoot - Project root directory
   */
  constructor(projectRoot) {
    this.projectRoot = projectRoot || process.cwd();
    this.progressTracker = new ProgressTracker(this.projectRoot);
    this.templateLoader = new TemplateLoader();
    this.currentTour = null;
    this.currentStepIndex = 0;
  }

  /**
   * Start a new tour
   * @param {string} tourId - Tour ID to start
   * @param {Object} [variables] - Variables to interpolate into template
   * @returns {Promise<Object|null>} Tour result { tour, step } or null
   */
  async start(tourId, variables) {
    try {
      // Load template
      const template = this.templateLoader.loadTemplate(tourId);
      if (!template) {
        return null;
      }

      // Validate template
      const validation = this.templateLoader.validateTemplate(template);
      if (!validation.valid) {
        return null;
      }

      // Check if template has steps
      const totalSteps = this.templateLoader.getTotalSteps(template);
      if (totalSteps === 0) {
        return null;
      }

      // Interpolate variables
      const interpolatedTemplate = this.templateLoader.interpolateVariables(template, variables);

      // Set current tour state
      this.currentTour = interpolatedTemplate;
      this.currentStepIndex = 0;

      // Reset and save progress
      this.progressTracker.save({
        tourId,
        status: 'in-progress',
        currentStepIndex: 0,
        completedSteps: [],
      });

      // Return first step
      return this._buildTourResult();
    } catch (error) {
      return null;
    }
  }

  /**
   * Resume an in-progress tour
   * @param {string} [tourId] - Tour ID to resume (optional, uses current tour if not provided)
   * @returns {Promise<Object|null>} Tour result { tour, step } or null
   */
  async resume(tourId) {
    try {
      // Determine which tour to resume
      let targetTourId = tourId;

      if (!targetTourId && this.currentTour) {
        targetTourId = this.currentTour.id;
      }

      if (!targetTourId) {
        return null;
      }

      // Check tour status
      const status = this.progressTracker.getTourStatus(targetTourId);
      if (status !== 'in-progress') {
        return null;
      }

      // Load template
      const template = this.templateLoader.loadTemplate(targetTourId);
      if (!template) {
        return null;
      }

      // Get current progress
      const currentStepIndex = this.progressTracker.getCurrentStepIndex(targetTourId);
      const completedSteps = this.progressTracker.getCompletedSteps(targetTourId);

      // Set current tour state
      this.currentTour = template;
      this.currentStepIndex = currentStepIndex;

      // Return current step
      return this._buildTourResult(completedSteps);
    } catch (error) {
      return null;
    }
  }

  /**
   * Complete current step and advance to next
   * @returns {Promise<Object|null>} Tour result { tour, step } or { completed: true, tour }
   */
  async completeStep() {
    if (!this.currentTour) {
      return null;
    }

    const currentStep = this.getCurrentStep();
    if (!currentStep) {
      return null;
    }

    // Mark step as completed
    this.progressTracker.markStepCompleted(this.currentTour.id, currentStep.id);

    // Advance to next step
    this.currentStepIndex++;

    // Check if tour is complete
    if (this.currentStepIndex >= this.templateLoader.getTotalSteps(this.currentTour)) {
      this.progressTracker.markTourCompleted(this.currentTour.id);

      const result = {
        completed: true,
        tour: this._buildTourMetadata(),
      };

      // Clear current tour
      this.currentTour = null;
      this.currentStepIndex = 0;

      return result;
    }

    return this._buildTourResult();
  }

  /**
   * Skip current step without marking as completed
   * @returns {Promise<Object|null>} Tour result { tour, step } or { completed: true }
   */
  async skipStep() {
    if (!this.currentTour) {
      return null;
    }

    // Advance to next step without marking as completed
    this.currentStepIndex++;

    // Check if tour is complete
    if (this.currentStepIndex >= this.templateLoader.getTotalSteps(this.currentTour)) {
      const result = {
        completed: true,
        tour: this._buildTourMetadata(),
      };

      // Clear current tour
      this.currentTour = null;
      this.currentStepIndex = 0;

      return result;
    }

    return this._buildTourResult();
  }

  /**
   * Reset tour progress
   * @param {string} [tourId] - Tour ID to reset (optional, resets all if not provided)
   */
  async reset(tourId) {
    this.progressTracker.reset(tourId);

    // Clear current tour if it matches
    if (!tourId || (this.currentTour && this.currentTour.id === tourId)) {
      this.currentTour = null;
      this.currentStepIndex = 0;
    }
  }

  /**
   * Get current step
   * @returns {Object|null} Current step or null
   */
  getCurrentStep() {
    if (!this.currentTour || !this.currentTour.steps) {
      return null;
    }

    return this.currentTour.steps[this.currentStepIndex] || null;
  }

  /**
   * Get next step without advancing
   * @returns {Object|null} Next step or null
   */
  getNextStep() {
    if (!this.currentTour || !this.currentTour.steps) {
      return null;
    }

    const nextIndex = this.currentStepIndex + 1;
    if (nextIndex >= this.currentTour.steps.length) {
      return null;
    }

    return this.currentTour.steps[nextIndex];
  }

  /**
   * Get previous step
   * @returns {Object|null} Previous step or null
   */
  getPreviousStep() {
    if (!this.currentTour || !this.currentTour.steps) {
      return null;
    }

    if (this.currentStepIndex === 0) {
      return null;
    }

    return this.currentTour.steps[this.currentStepIndex - 1];
  }

  /**
   * Go to a specific step by index
   * @param {number} index - Step index
   * @returns {Object|null} Tour result or null
   */
  goToStep(index) {
    if (!this.currentTour || !this.currentTour.steps) {
      return null;
    }

    if (index < 0 || index >= this.currentTour.steps.length) {
      return null;
    }

    this.currentStepIndex = index;
    return this._buildTourResult();
  }

  /**
   * Get current progress information
   * @returns {Object|null} Progress info or null
   */
  getProgress() {
    if (!this.currentTour) {
      return null;
    }

    const totalSteps = this.templateLoader.getTotalSteps(this.currentTour);
    const completedSteps = this.progressTracker.getCompletedSteps(this.currentTour.id);

    return {
      tourId: this.currentTour.id,
      currentStep: this.currentStepIndex + 1,
      totalSteps,
      completedSteps,
      percentage: Math.round(((this.currentStepIndex + 1) / totalSteps) * 100),
    };
  }

  /**
   * Check if a tour is currently active
   * @returns {boolean} True if tour is active
   */
  isTourActive() {
    return this.currentTour !== null;
  }

  /**
   * Get list of available tours
   * @returns {string[]} Array of tour IDs
   */
  getAvailableTours() {
    return this.templateLoader.listTemplates();
  }

  /**
   * Build tour result object
   * @param {string[]} [completedSteps] - Completed steps
   * @returns {Object} Tour result { tour, step }
   * @private
   */
  _buildTourResult(completedSteps) {
    const step = this.getCurrentStep();
    const tour = this._buildTourMetadata(completedSteps);

    return { tour, step };
  }

  /**
   * Build tour metadata object
   * @param {string[]} [completedSteps] - Completed steps
   * @returns {Object} Tour metadata
   * @private
   */
  _buildTourMetadata(completedSteps) {
    const totalSteps = this.templateLoader.getTotalSteps(this.currentTour);

    return {
      id: this.currentTour.id,
      title: this.currentTour.title,
      description: this.currentTour.description,
      estimatedTime: this.currentTour.estimatedTime,
      version: this.currentTour.version,
      totalSteps,
      currentStep: this.currentStepIndex + 1,
      completedSteps: completedSteps || this.progressTracker.getCompletedSteps(this.currentTour.id),
    };
  }
}

module.exports = TourManager;
