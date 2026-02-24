#!/usr/bin/env node

/**
 * AIOS Handoff Command - Agent Handoff Visualization
 *
 * Visualizes agent handoffs and collaboration patterns.
 *
 * Usage:
 *   aios handoff              - Show ASCII visualization
 *   aios handoff mermaid      - Generate Mermaid diagram
 *   aios handoff flow <name>  - Show standard flow
 *   aios handoff timeline     - Show recent handoffs
 *   aios handoff stats        - Show statistics
 *   aios handoff flows        - List available flows
 *
 * @module bin/commands/handoff
 * @story HV-1: Agent Handoff Visualization
 */

const { program } = require('commander');
const chalk = require('chalk');

const { HandoffVisualizer } = require('../../.aios-core/development/scripts/handoff-visualizer');

// Initialize visualizer
const visualizer = new HandoffVisualizer();

/**
 * Load session handoff data if available
 */
function loadSessionData() {
  const fs = require('fs');
  const path = require('path');
  const sessionPath = path.join(process.cwd(), '.aios', 'session-state.json');

  try {
    if (fs.existsSync(sessionPath)) {
      const data = JSON.parse(fs.readFileSync(sessionPath, 'utf-8'));
      if (data.agentHistory && Array.isArray(data.agentHistory)) {
        // Replay handoffs from session
        for (let i = 0; i < data.agentHistory.length - 1; i++) {
          const current = data.agentHistory[i];
          const next = data.agentHistory[i + 1];
          if (current.agentId && next.agentId && current.agentId !== next.agentId) {
            visualizer.recordHandoff(current.agentId, next.agentId, {
              timestamp: next.timestamp,
            });
          }
        }
      }
    }
  } catch (error) {
    // Session data not available, continue with empty state
  }
}

// Load session data on start
loadSessionData();

/**
 * Show ASCII visualization
 */
function showASCII() {
  console.log(visualizer.generateASCII());
}

/**
 * Show Mermaid diagram
 */
function showMermaid(options) {
  const mermaid = visualizer.generateMermaid({ direction: options.direction });
  console.log('\n```mermaid');
  console.log(mermaid);
  console.log('```\n');
  console.log(chalk.gray('Copy the above code to a Mermaid-compatible viewer'));
}

/**
 * Show standard flow
 */
function showFlow(flowName) {
  console.log(visualizer.generateStandardFlow(flowName));
}

/**
 * Show timeline
 */
function showTimeline(options) {
  console.log(visualizer.generateTimeline(parseInt(options.limit) || 10));
}

/**
 * Show statistics
 */
function showStats() {
  console.log(visualizer.generateStats());
}

/**
 * List available flows
 */
function listFlows() {
  console.log(visualizer.listStandardFlows());
}

/**
 * Record a handoff manually
 */
function recordHandoff(from, to) {
  visualizer.recordHandoff(from, to);
  console.log(chalk.green(`✓ Recorded handoff: ${from} → ${to}`));
}

// Configure CLI
program
  .name('aios handoff')
  .description('Agent handoff visualization')
  .version('1.0.0');

// Default command: ASCII visualization
program
  .command('ascii', { isDefault: true })
  .description('Show ASCII handoff visualization')
  .action(showASCII);

// Mermaid command
program
  .command('mermaid')
  .description('Generate Mermaid diagram')
  .option('-d, --direction <dir>', 'Flow direction (LR, TB, RL)', 'LR')
  .action(showMermaid);

// Flow command
program
  .command('flow <name>')
  .description('Show standard handoff flow')
  .action(showFlow);

// Timeline command
program
  .command('timeline')
  .description('Show recent handoffs timeline')
  .option('-l, --limit <number>', 'Number of entries to show', '10')
  .action(showTimeline);

// Stats command
program
  .command('stats')
  .description('Show handoff statistics')
  .action(showStats);

// Flows command
program
  .command('flows')
  .description('List available standard flows')
  .action(listFlows);

// Record command
program
  .command('record <from> <to>')
  .description('Record a handoff manually')
  .action(recordHandoff);

// Parse arguments
program.parse(process.argv);

// Show help if no arguments
if (!process.argv.slice(2).length) {
  program.outputHelp();
}
