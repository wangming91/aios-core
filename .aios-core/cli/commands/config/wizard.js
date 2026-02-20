/**
 * Config Wizard Command Module
 *
 * CLI command for interactive configuration wizard.
 *
 * Subcommands:
 *   aios config wizard                    - Interactive wizard
 *   aios config wizard --preset=<name>    - Use preset template
 *   aios config wizard --detect           - Auto-detect and recommend
 *   aios config wizard --dry-run          - Preview without writing
 *
 * @module cli/commands/config/wizard
 * @version 1.0.0
 * @story STORY-OPT-A3
 */

'use strict';

const { Command } = require('commander');
const path = require('path');
const fs = require('fs');
const yaml = require('js-yaml');
const chalk = require('chalk');

const ProjectDetector = require('../../../core/config/detectors');
const { createError, isAIOSError } = require('../../../core/errors');

/**
 * Presets directory path
 */
const PRESETS_DIR = path.join(__dirname, '..', '..', '..', 'core', 'config', 'presets');

/**
 * Available presets (built-in)
 */
const BUILTIN_PRESETS = {
  'react-node': {
    id: 'react-node',
    name: 'React + Node.js',
    description: 'Full-stack React application with Node.js backend',
  },
  'vue-python': {
    id: 'vue-python',
    name: 'Vue + Python',
    description: 'Vue.js frontend with Python backend',
  },
  fullstack: {
    id: 'fullstack',
    name: 'Full Stack',
    description: 'Generic full-stack configuration for complex projects',
  },
  minimal: {
    id: 'minimal',
    name: 'Minimal',
    description: 'Minimal configuration for simple projects',
  },
};

/**
 * Load a preset by ID
 * @param {string} presetId - Preset ID to load
 * @returns {Object|null} Preset object or null if not found
 */
function loadPreset(presetId) {
  if (!presetId || typeof presetId !== 'string') {
    return null;
  }

  const presetPath = path.join(PRESETS_DIR, `${presetId}.yaml`);

  try {
    if (!fs.existsSync(presetPath)) {
      return null;
    }

    const content = fs.readFileSync(presetPath, 'utf8');
    const preset = yaml.load(content);

    return preset || null;
  } catch (error) {
    return null;
  }
}

/**
 * Get list of available presets
 * @returns {Array<{id: string, name: string, description: string}>} Available presets
 */
function getAvailablePresets() {
  const presets = [];

  // Add built-in presets
  Object.values(BUILTIN_PRESETS).forEach((preset) => {
    presets.push({
      id: preset.id,
      name: preset.name,
      description: preset.description,
    });
  });

  // Scan for additional preset files
  try {
    if (fs.existsSync(PRESETS_DIR)) {
      const files = fs.readdirSync(PRESETS_DIR);
      files.forEach((file) => {
        if (file.endsWith('.yaml') || file.endsWith('.yml')) {
          const presetId = file.replace(/\.(ya?ml)$/, '');
          // Skip if already in built-in list
          if (!BUILTIN_PRESETS[presetId]) {
            try {
              const preset = loadPreset(presetId);
              if (preset) {
                presets.push({
                  id: preset.id || presetId,
                  name: preset.name || presetId,
                  description: preset.description || '',
                });
              }
            } catch {
              // Skip invalid presets
            }
          }
        }
      });
    }
  } catch {
    // Ignore errors scanning for presets
  }

  return presets;
}

/**
 * Get project root (cwd)
 * @returns {string} Project root path
 */
function getProjectRoot() {
  return process.cwd();
}

/**
 * Display welcome banner
 */
function displayWelcome() {
  const lines = [];
  const width = 55;

  lines.push('');
  lines.push(chalk.cyan.bold('='.repeat(width)));
  lines.push(chalk.cyan.bold('|') + ' AIOS Config Wizard'.padEnd(width - 2) + chalk.cyan.bold('|'));
  lines.push(chalk.cyan.bold('='.repeat(width)));
  lines.push('');
  lines.push(chalk.dim('  Configure your AIOS project with guided assistance.'));
  lines.push(chalk.dim('  Choose a preset or let AIOS detect your project type.'));
  lines.push('');

  console.log(lines.join('\n'));
}

/**
 * Display detection results
 * @param {Object} result - Detection result from ProjectDetector
 * @param {string[]} lines - Detected lines to display
 */
function displayDetectionResult(result, lines) {
  console.log(chalk.white.bold('\n  Detected:'));
  console.log('');

  if (lines.length === 0) {
    console.log(chalk.dim('  No project files detected.'));
  } else {
    lines.forEach((line) => {
      console.log(chalk.green(line));
    });
  }

  console.log('');
}

/**
 * Display configuration suggestions
 * @param {Object} suggestions - Configuration suggestions
 */
function displaySuggestions(suggestions) {
  console.log(chalk.white.bold('  Recommended configuration:'));
  console.log('');

  const labels = {
    ide: 'IDE',
    agentTeam: 'Agent Team',
    mcpServers: 'MCP Servers',
    workflow: 'Workflow',
  };

  Object.entries(labels).forEach(([key, label]) => {
    if (suggestions[key]) {
      console.log(chalk.cyan(`    ${label.padEnd(12)}`) + chalk.white(suggestions[key]));
    }
  });

  console.log('');
}

/**
 * Display preset selection menu
 */
function displayPresetMenu() {
  const presets = getAvailablePresets();

  console.log(chalk.white.bold('\n  Available presets:'));
  console.log('');

  presets.forEach((preset) => {
    console.log(chalk.cyan(`    ${preset.id.padEnd(12)}`) + chalk.white(preset.name));
    console.log(chalk.dim(`                  ${preset.description}`));
  });

  console.log('');
  console.log(chalk.dim('  Usage: aios config wizard --preset=<name>'));
  console.log(chalk.dim('  Example: aios config wizard --preset=react-node'));
  console.log('');
}

/**
 * Display configuration preview
 * @param {Object} config - Configuration to preview
 * @param {string} source - Source of configuration (preset or detected)
 */
function displayConfigPreview(config, source) {
  const width = 55;

  console.log('');
  console.log(chalk.magenta.bold('-'.repeat(width)));
  console.log(chalk.magenta.bold('| Configuration Preview (' + source + ')').padEnd(width - 1) + '|');
  console.log(chalk.magenta.bold('-'.repeat(width)));
  console.log('');

  console.log(yaml.dump(config, { lineWidth: 80, noRefs: true }));
}

/**
 * Display configuration diff
 * @param {Object} currentConfig - Current configuration
 * @param {Object} newConfig - New configuration to apply
 */
function displayConfigDiff(currentConfig, newConfig) {
  const diff = computeDiff(currentConfig, newConfig);

  if (diff.length === 0) {
    console.log(chalk.dim('  No changes from current configuration.'));
    return;
  }

  console.log(chalk.white.bold('\n  Changes to be applied:'));
  console.log('');

  diff.forEach((entry) => {
    switch (entry.type) {
      case 'added':
        console.log(chalk.green(`  + ${entry.key}: ${formatValue(entry.value)}`));
        break;
      case 'removed':
        console.log(chalk.red(`  - ${entry.key}: ${formatValue(entry.value)}`));
        break;
      case 'changed':
        console.log(chalk.yellow(`  ~ ${entry.key}:`));
        console.log(chalk.dim(`      was: ${formatValue(entry.oldValue)}`));
        console.log(chalk.white(`      now: ${formatValue(entry.newValue)}`));
        break;
    }
  });

  console.log('');
}

/**
 * Compute diff between two config objects
 * @param {Object} objA - First object
 * @param {Object} objB - Second object
 * @param {string} prefix - Key prefix for nested objects
 * @returns {Array} Array of diff entries
 */
function computeDiff(objA, objB, prefix = '') {
  const diff = [];
  const allKeys = new Set([...Object.keys(objA || {}), ...Object.keys(objB || {})]);

  for (const key of allKeys) {
    const fullKey = prefix ? `${prefix}.${key}` : key;
    const inA = objA && key in objA;
    const inB = objB && key in objB;

    if (!inA && inB) {
      diff.push({ type: 'added', key: fullKey, value: objB[key] });
    } else if (inA && !inB) {
      diff.push({ type: 'removed', key: fullKey, value: objA[key] });
    } else if (isObj(objA[key]) && isObj(objB[key])) {
      diff.push(...computeDiff(objA[key], objB[key], fullKey));
    } else if (JSON.stringify(objA[key]) !== JSON.stringify(objB[key])) {
      diff.push({ type: 'changed', key: fullKey, oldValue: objA[key], newValue: objB[key] });
    }
  }

  return diff;
}

/**
 * Check if value is a plain object
 * @param {*} v - Value to check
 * @returns {boolean} True if plain object
 */
function isObj(v) {
  return v !== null && typeof v === 'object' && !Array.isArray(v);
}

/**
 * Format a value for display
 * @param {*} v - Value to format
 * @returns {string} Formatted string
 */
function formatValue(v) {
  if (v === null || v === undefined) return 'null';
  if (typeof v === 'object') return JSON.stringify(v);
  return String(v);
}

/**
 * Write configuration to project-config.yaml
 * @param {string} projectRoot - Project root directory
 * @param {Object} config - Configuration to write
 * @returns {boolean} True if successful
 */
function writeConfig(projectRoot, config) {
  const configPath = path.join(projectRoot, '.aios-core', 'project-config.yaml');

  try {
    // Ensure .aios-core directory exists
    const aiosDir = path.dirname(configPath);
    if (!fs.existsSync(aiosDir)) {
      fs.mkdirSync(aiosDir, { recursive: true });
    }

    // Create backup if file exists
    if (fs.existsSync(configPath)) {
      const backupPath = configPath + '.backup';
      fs.copyFileSync(configPath, backupPath);
    }

    // Write header
    const header = `# ============================================
# AIOS Project Configuration (Level 2)
# ============================================
# Generated by: aios config wizard
# Date: ${new Date().toISOString()}
# ============================================

`;

    // Write config
    const yamlContent = yaml.dump(config, { lineWidth: 120, noRefs: true });
    fs.writeFileSync(configPath, header + yamlContent, 'utf8');

    return true;
  } catch (error) {
    throw createError('CFG_003', {
      variables: { path: configPath },
      cause: error,
    });
  }
}

/**
 * Load current configuration
 * @param {string} projectRoot - Project root directory
 * @returns {Object} Current configuration
 */
function loadCurrentConfig(projectRoot) {
  const configPath = path.join(projectRoot, '.aios-core', 'project-config.yaml');

  try {
    if (!fs.existsSync(configPath)) {
      return {};
    }

    const content = fs.readFileSync(configPath, 'utf8');
    return yaml.load(content) || {};
  } catch {
    return {};
  }
}

/**
 * Display next steps after configuration
 */
function displayNextSteps() {
  const lines = [];
  const width = 55;

  lines.push('');
  lines.push(chalk.cyan.bold('-'.repeat(width)));
  lines.push(chalk.cyan.bold('| Next Steps:').padEnd(width - 1) + '|');
  lines.push(chalk.cyan.bold('-'.repeat(width)));
  lines.push('');
  lines.push(chalk.white('  Configuration applied successfully!'));
  lines.push('');
  lines.push(chalk.dim('  What to do next:'));
  lines.push(chalk.green('    $ aios quickstart') + chalk.dim(' - Start your first task'));
  lines.push(chalk.green('    $ aios doctor') + chalk.dim(' - Validate your configuration'));
  lines.push(chalk.green('    $ aios config show') + chalk.dim(' - View current configuration'));
  lines.push('');

  console.log(lines.join('\n'));
}

/**
 * Run wizard in detect mode
 * @param {Object} options - Command options
 */
async function runDetectMode(options) {
  const root = getProjectRoot();
  const detector = new ProjectDetector(root);

  console.log(chalk.cyan.bold('\n  Analyzing project...'));
  console.log('');

  const result = await detector.detect();
  const detectedLines = detector.formatDetectionResult(result);

  displayDetectionResult(result, detectedLines);
  displaySuggestions(result.suggestions);

  if (options.dryRun) {
    displayConfigPreview(result.suggestions, 'detected');
    console.log(chalk.dim('  Run without --dry-run to apply this configuration.'));
    return;
  }

  // In non-interactive mode, just show what would be applied
  console.log(chalk.yellow('  Apply recommended configuration?'));
  console.log(chalk.dim('  Run with --apply to apply this configuration.'));
  console.log('');
}

/**
 * Run wizard in preset mode
 * @param {string} presetId - Preset ID
 * @param {Object} options - Command options
 */
async function runPresetMode(presetId, options) {
  const preset = loadPreset(presetId);

  if (!preset) {
    console.error(chalk.red(`\n  Preset '${presetId}' not found.`));
    displayPresetMenu();
    process.exit(1);
  }

  console.log(chalk.white.bold(`\n  Applying preset: ${preset.name}`));
  console.log(chalk.dim(`  ${preset.description}`));
  console.log('');

  if (options.dryRun) {
    displayConfigPreview(preset.config, `preset: ${presetId}`);
    console.log(chalk.dim('  Run without --dry-run to apply this configuration.'));
    return;
  }

  const root = getProjectRoot();

  // Show diff with current config
  const currentConfig = loadCurrentConfig(root);
  if (Object.keys(currentConfig).length > 0) {
    displayConfigDiff(currentConfig, preset.config);
  } else {
    displayConfigPreview(preset.config, `preset: ${presetId}`);
  }

  // Write configuration
  try {
    writeConfig(root, preset.config);
    console.log(chalk.green('\n  Configuration applied successfully!'));
    console.log(chalk.dim(`  File: .aios-core/project-config.yaml`));

    displayNextSteps();

    // Show preset-specific next steps
    if (preset.nextSteps && preset.nextSteps.length > 0) {
      console.log(chalk.white.bold('\n  Suggested commands:'));
      preset.nextSteps.forEach((step) => {
        console.log(chalk.cyan(`    ${step.command}`) + chalk.dim(` - ${step.title}`));
      });
      console.log('');
    }
  } catch (error) {
    if (isAIOSError(error)) {
      console.error(chalk.red(`\n  ${error.message}`));
    } else {
      console.error(chalk.red(`\n  Failed to write configuration: ${error.message}`));
    }
    process.exit(1);
  }
}

/**
 * Run wizard in interactive mode
 * @param {Object} options - Command options
 */
async function runInteractiveMode(options) {
  displayWelcome();

  // Show available presets
  displayPresetMenu();

  // Show detect option
  console.log(chalk.white.bold('  Or let AIOS detect your project:'));
  console.log('');
  console.log(chalk.cyan('    --detect') + '  Auto-detect project type and recommend configuration');
  console.log('');

  console.log(chalk.dim('  Examples:'));
  console.log(chalk.green('    $ aios config wizard --preset=react-node'));
  console.log(chalk.green('    $ aios config wizard --detect'));
  console.log(chalk.green('    $ aios config wizard --detect --dry-run'));
  console.log('');
}

/**
 * Wizard action handler
 * @param {Object} options - Command options
 */
async function wizardAction(options) {
  try {
    const opts = options || {};

    // Preset mode
    if (opts.preset) {
      await runPresetMode(opts.preset, opts);
      return;
    }

    // Detect mode
    if (opts.detect) {
      await runDetectMode(opts);
      return;
    }

    // Interactive mode (default)
    await runInteractiveMode(opts);
  } catch (error) {
    if (isAIOSError(error)) {
      console.error(chalk.red(`\n  ${error.message}`));
      if (error.recoverySteps && error.recoverySteps.length > 0) {
        console.log(chalk.dim('\n  Recovery suggestions:'));
        error.recoverySteps.forEach((step) => {
          console.log(chalk.dim(`    - ${step}`));
        });
      }
    } else {
      console.error(chalk.red(`\n  Wizard error: ${error.message}`));
    }
    console.log('');
    process.exit(1);
  }
}

/**
 * Create the wizard command
 * @returns {Command} Commander command instance
 */
function createWizardCommand() {
  const wizardCmd = new Command('wizard')
    .description('Interactive configuration wizard')
    .option('-p, --preset <name>', 'Apply a preset configuration')
    .option('-d, --detect', 'Auto-detect project type and recommend configuration')
    .option('--dry-run', 'Preview configuration without writing')
    .option('--apply', 'Apply detected/recommended configuration')
    .option('-f, --force', 'Force overwrite existing configuration')
    .action(async (options) => {
      try {
        await wizardAction(options || {});
      } catch (error) {
        console.error(chalk.red(`Wizard error: ${error.message}`));
        process.exit(1);
      }
    });

  return wizardCmd;
}

module.exports = {
  createWizardCommand,
  wizardAction,
  loadPreset,
  getAvailablePresets,
  writeConfig,
  loadCurrentConfig,
  displayWelcome,
  displayPresetMenu,
  displayDetectionResult,
  displaySuggestions,
  displayConfigPreview,
  displayConfigDiff,
  computeDiff,
  BUILTIN_PRESETS,
};
