/**
 * Onboarding Module Entry Point
 *
 * Exports TourManager, ProgressTracker, and TemplateLoader
 * for the interactive tour system.
 *
 * @module core/onboarding
 * @version 1.0.0
 * @story STORY-OPT-A1
 *
 * @example
 * const { TourManager, ProgressTracker, TemplateLoader } = require('@aios-core/core/onboarding');
 *
 * // Start a tour
 * const tourManager = new TourManager(projectRoot);
 * const result = await tourManager.start('first-run');
 *
 * // Check tour status
 * const progressTracker = new ProgressTracker(projectRoot);
 * const status = progressTracker.getTourStatus('first-run');
 *
 * // Load a template
 * const templateLoader = new TemplateLoader();
 * const template = templateLoader.loadTemplate('first-run');
 */

const TourManager = require('./tour-manager');
const ProgressTracker = require('./progress-tracker');
const TemplateLoader = require('./template-loader');

module.exports = {
  TourManager,
  ProgressTracker,
  TemplateLoader,
};
