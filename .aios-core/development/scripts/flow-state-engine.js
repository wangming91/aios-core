/**
 * Flow-State Engine - Intelligent Workflow State Management
 *
 * An enhanced state management system that provides:
 * - Real-time state awareness from multiple signal sources
 * - Intelligent state machine with precise transition logic
 * - Context enrichment from project, git, CI, and story states
 * - Proactive recommendations (not just reactive to *next command)
 * - Visual state representation for user clarity
 *
 * @module flow-state-engine
 * @version 1.0.0
 * @story FSE-1: Flow-State Engine Core
 */

const fs = require('fs').promises;
const path = require('path');
const yaml = require('js-yaml');

// State signals that the engine monitors
const STATE_SIGNALS = {
  // Git signals
  git_branch: { type: 'git', weight: 0.1 },
  git_status: { type: 'git', weight: 0.15 },
  git_stash: { type: 'git', weight: 0.05 },

  // Story signals
  story_status: { type: 'story', weight: 0.25 },
  story_progress: { type: 'story', weight: 0.1 },

  // QA signals
  qa_status: { type: 'qa', weight: 0.2 },
  qa_issues_count: { type: 'qa', weight: 0.1 },

  // CI signals
  ci_status: { type: 'ci', weight: 0.15 },
  ci_last_run: { type: 'ci', weight: 0.05 },

  // Session signals
  active_agent: { type: 'session', weight: 0.1 },
  last_command: { type: 'session', weight: 0.05 },
};

// Primary flow states with their characteristics
const FLOW_STATES = {
  // Initial/Unknown state
  IDLE: {
    id: 'idle',
    label: 'Idle',
    icon: '⚪',
    color: 'gray',
    description: 'No active work detected',
    priority: 0,
  },

  // Development flow
  PLANNING: {
    id: 'planning',
    label: 'Planning',
    icon: '📋',
    color: 'blue',
    description: 'Planning and defining work',
    priority: 1,
  },
  READY_TO_START: {
    id: 'ready_to_start',
    label: 'Ready to Start',
    icon: '🚀',
    color: 'green',
    description: 'Story validated, ready for development',
    priority: 2,
  },
  IN_DEVELOPMENT: {
    id: 'in_development',
    label: 'In Development',
    icon: '🔨',
    color: 'yellow',
    description: 'Active coding in progress',
    priority: 3,
  },
  CODE_COMPLETE: {
    id: 'code_complete',
    label: 'Code Complete',
    icon: '✅',
    color: 'cyan',
    description: 'Development done, uncommitted changes',
    priority: 4,
  },

  // QA flow
  READY_FOR_QA: {
    id: 'ready_for_qa',
    label: 'Ready for QA',
    icon: '🔍',
    color: 'purple',
    description: 'Code committed, awaiting QA review',
    priority: 5,
  },
  IN_QA: {
    id: 'in_qa',
    label: 'In QA',
    icon: '🧪',
    color: 'purple',
    description: 'QA review in progress',
    priority: 6,
  },
  QA_ISSUES: {
    id: 'qa_issues',
    label: 'QA Issues',
    icon: '⚠️',
    color: 'orange',
    description: 'QA found issues to fix',
    priority: 7,
  },

  // CI/Deployment flow
  READY_FOR_CI: {
    id: 'ready_for_ci',
    label: 'Ready for CI',
    icon: '🔄',
    color: 'blue',
    description: 'QA passed, ready for CI validation',
    priority: 8,
  },
  CI_RUNNING: {
    id: 'ci_running',
    label: 'CI Running',
    icon: '🔄',
    color: 'blue',
    description: 'CI pipeline in progress',
    priority: 9,
  },
  CI_FAILED: {
    id: 'ci_failed',
    label: 'CI Failed',
    icon: '❌',
    color: 'red',
    description: 'CI pipeline failed',
    priority: 10,
  },

  // Completion
  READY_FOR_MERGE: {
    id: 'ready_for_merge',
    label: 'Ready for Merge',
    icon: '✨',
    color: 'green',
    description: 'All checks passed, ready to merge',
    priority: 11,
  },
  COMPLETED: {
    id: 'completed',
    label: 'Completed',
    icon: '🎉',
    color: 'green',
    description: 'Story completed and merged',
    priority: 12,
  },

  // Blocking states
  BLOCKED: {
    id: 'blocked',
    label: 'Blocked',
    icon: '🚫',
    color: 'red',
    description: 'Work is blocked by external factors',
    priority: -1,
  },
};

// State transitions map
const STATE_TRANSITIONS = {
  IDLE: {
    triggers: ['no_story', 'session_start'],
    next: ['PLANNING', 'READY_TO_START'],
    auto: false,
  },
  PLANNING: {
    triggers: ['story_created', 'story_validated'],
    next: ['READY_TO_START'],
    auto: true,
  },
  READY_TO_START: {
    triggers: ['develop_started', 'git_checkout'],
    next: ['IN_DEVELOPMENT'],
    auto: false,
  },
  IN_DEVELOPMENT: {
    triggers: ['code_changes', 'tests_written'],
    next: ['CODE_COMPLETE', 'READY_FOR_QA'],
    auto: false,
  },
  CODE_COMPLETE: {
    triggers: ['git_staged', 'tests_passing'],
    next: ['READY_FOR_QA'],
    auto: true,
  },
  READY_FOR_QA: {
    triggers: ['qa_started'],
    next: ['IN_QA'],
    auto: true,
  },
  IN_QA: {
    triggers: ['qa_completed'],
    next: ['QA_ISSUES', 'READY_FOR_CI'],
    auto: false,
  },
  QA_ISSUES: {
    triggers: ['fixes_applied'],
    next: ['IN_DEVELOPMENT', 'READY_FOR_QA'],
    auto: false,
  },
  READY_FOR_CI: {
    triggers: ['ci_triggered'],
    next: ['CI_RUNNING'],
    auto: true,
  },
  CI_RUNNING: {
    triggers: ['ci_completed'],
    next: ['CI_FAILED', 'READY_FOR_MERGE'],
    auto: false,
  },
  CI_FAILED: {
    triggers: ['fixes_applied'],
    next: ['IN_DEVELOPMENT', 'READY_FOR_CI'],
    auto: false,
  },
  READY_FOR_MERGE: {
    triggers: ['pr_merged', 'changes_pushed'],
    next: ['COMPLETED'],
    auto: true,
  },
  BLOCKED: {
    triggers: ['blocker_resolved'],
    next: ['IN_DEVELOPMENT', 'PLANNING'],
    auto: false,
  },
};

// Recommended actions for each state
const STATE_ACTIONS = {
  IDLE: [
    { command: '*create-story', description: 'Create a new story', priority: 1 },
    { command: '*next', description: 'Get workflow suggestions', priority: 2 },
    { command: '*status', description: 'Check project status', priority: 3 },
  ],
  PLANNING: [
    { command: '*validate-story-draft ${story}', description: 'Validate story structure', priority: 1 },
    { command: '*analyze-impact ${story}', description: 'Analyze technical impact', priority: 2 },
  ],
  READY_TO_START: [
    { command: '*develop-yolo ${story}', description: 'Start YOLO mode development', priority: 1 },
    { command: '*develop-interactive ${story}', description: 'Start interactive development', priority: 2 },
    { command: '*develop-preflight ${story}', description: 'Plan then execute', priority: 3 },
  ],
  IN_DEVELOPMENT: [
    { command: '*run-tests', description: 'Run tests to verify changes', priority: 1 },
    { command: '*lint', description: 'Check code quality', priority: 2 },
  ],
  CODE_COMPLETE: [
    { command: '*run-tests', description: 'Verify all tests pass', priority: 1 },
    { command: '*pre-push-quality-gate', description: 'Run quality checks', priority: 2 },
  ],
  READY_FOR_QA: [
    { command: '*review-qa ${story}', description: 'Start QA review', priority: 1 },
    { command: '*review-build ${story}', description: 'Full structured review', priority: 2 },
  ],
  IN_QA: [
    { command: '*review-status', description: 'Check review progress', priority: 1 },
  ],
  QA_ISSUES: [
    { command: '*apply-qa-fixes', description: 'Apply QA fixes', priority: 1 },
    { command: '*fix-qa-issues', description: 'Fix identified issues', priority: 2 },
  ],
  READY_FOR_CI: [
    { command: '*pre-push-quality-gate', description: 'Final quality gate', priority: 1 },
    { command: '*github-pr-automation', description: 'Create PR', priority: 2 },
  ],
  CI_RUNNING: [
    { command: '*ci-status', description: 'Check CI status', priority: 1 },
  ],
  CI_FAILED: [
    { command: '*run-tests', description: 'Reproduce CI failure locally', priority: 1 },
    { command: '*ci-logs', description: 'View CI failure logs', priority: 2 },
  ],
  READY_FOR_MERGE: [
    { command: '*github-pr-automation --merge', description: 'Merge PR', priority: 1 },
    { command: '*close-story ${story}', description: 'Close completed story', priority: 2 },
  ],
  COMPLETED: [
    { command: '*next', description: 'Start next story', priority: 1 },
    { command: '*backlog-review', description: 'Review backlog', priority: 2 },
  ],
  BLOCKED: [
    { command: '*orchestrate-status', description: 'View blocker details', priority: 1 },
    { command: '*unblock ${story}', description: 'Attempt to unblock', priority: 2 },
  ],
};

class FlowStateEngine {
  /**
   * @param {Object} options
   * @param {string} [options.projectRoot] - Project root directory
   * @param {boolean} [options.verbose] - Enable verbose logging
   */
  constructor(options = {}) {
    this.projectRoot = options.projectRoot || process.cwd();
    this.verbose = options.verbose || false;
    this.currentState = FLOW_STATES.IDLE;
    this.signals = {};
    this.context = {};
    this.history = [];
  }

  /**
   * Log message if verbose mode is enabled
   * @private
   */
  _log(message, data = {}) {
    if (this.verbose) {
      console.log(`[FlowState] ${message}`, data);
    }
  }

  /**
   * Collect all available signals from the environment
   * @returns {Promise<Object>} Collected signals
   */
  async collectSignals() {
    const signals = {};

    // Collect git signals
    signals.git = await this._collectGitSignals();

    // Collect story signals
    signals.story = await this._collectStorySignals();

    // Collect CI signals
    signals.ci = await this._collectCISignals();

    // Collect session signals
    signals.session = this._collectSessionSignals();

    this.signals = signals;
    this._log('Signals collected', signals);
    return signals;
  }

  /**
   * Collect git-related signals
   * @private
   */
  async _collectGitSignals() {
    const { execSync } = require('child_process');

    try {
      const status = execSync('git status --porcelain', { encoding: 'utf-8', cwd: this.projectRoot });
      const branch = execSync('git branch --show-current', { encoding: 'utf-8', cwd: this.projectRoot }).trim();
      const stash = execSync('git stash list', { encoding: 'utf-8', cwd: this.projectRoot });

      return {
        branch,
        hasChanges: status.trim().length > 0,
        changedFiles: status.trim().split('\n').filter(Boolean).length,
        hasStash: stash.trim().length > 0,
        status: status.trim() || 'clean',
      };
    } catch (error) {
      return { error: error.message, branch: null, hasChanges: false };
    }
  }

  /**
   * Collect story-related signals
   * @private
   */
  async _collectStorySignals() {
    const { loadProjectStatus } = require('../../infrastructure/scripts/project-status-loader');

    try {
      const projectStatus = await loadProjectStatus(this.projectRoot);

      return {
        status: projectStatus?.storyStatus || 'unknown',
        progress: projectStatus?.storyProgress || 0,
        path: projectStatus?.storyPath || null,
        epic: projectStatus?.epicPath || null,
      };
    } catch (error) {
      return { error: error.message, status: 'unknown' };
    }
  }

  /**
   * Collect CI-related signals
   * @private
   */
  async _collectCISignals() {
    // Check for CI status indicators
    const ciStatusPath = path.join(this.projectRoot, '.aios', 'ci-status.json');

    try {
      const content = await fs.readFile(ciStatusPath, 'utf-8');
      return JSON.parse(content);
    } catch {
      return {
        status: 'unknown',
        lastRun: null,
      };
    }
  }

  /**
   * Collect session-related signals
   * @private
   */
  _collectSessionSignals() {
    return {
      activeAgent: process.env.AIOS_ACTIVE_AGENT || null,
      lastCommand: this.history[this.history.length - 1] || null,
      commandCount: this.history.length,
    };
  }

  /**
   * Determine the current flow state based on collected signals
   * @param {Object} [signals] - Optional pre-collected signals
   * @returns {Promise<Object>} State determination result
   */
  async determineState(signals = null) {
    const sig = signals || await this.collectSignals();

    // Priority-based state determination
    let state = FLOW_STATES.IDLE;
    let confidence = 0;
    const reasons = [];

    // Check for blocking conditions first
    if (sig.story?.status === 'blocked') {
      state = FLOW_STATES.BLOCKED;
      confidence = 0.95;
      reasons.push('Story is marked as blocked');
    }
    // CI failure takes high priority
    else if (sig.ci?.status === 'failed' || sig.ci?.status === 'red') {
      state = FLOW_STATES.CI_FAILED;
      confidence = 0.92;
      reasons.push('CI pipeline failed');
    }
    // QA issues
    else if (sig.story?.status === 'qa_rejected' || sig.story?.status === 'qa_issues') {
      state = FLOW_STATES.QA_ISSUES;
      confidence = 0.90;
      reasons.push('QA found issues');
    }
    // Completed story
    else if (sig.story?.status === 'done' || sig.story?.status === 'completed') {
      state = FLOW_STATES.COMPLETED;
      confidence = 0.95;
      reasons.push('Story marked as complete');
    }
    // In QA
    else if (sig.story?.status === 'in_qa' || sig.story?.status === 'qa_review') {
      state = FLOW_STATES.IN_QA;
      confidence = 0.88;
      reasons.push('QA review in progress');
    }
    // CI running (takes priority over ready_for_qa when CI is active)
    else if (sig.ci?.status === 'running' || sig.ci?.status === 'pending') {
      state = FLOW_STATES.CI_RUNNING;
      confidence = 0.85;
      reasons.push('CI pipeline running');
    }
    // Ready for merge (CI passed)
    else if (sig.ci?.status === 'passed' || sig.ci?.status === 'green') {
      state = FLOW_STATES.READY_FOR_MERGE;
      confidence = 0.88;
      reasons.push('CI passed, ready to merge');
    }
    // Ready for QA (committed but not reviewed, CI not active)
    else if (sig.story?.status === 'in_progress' && !sig.git?.hasChanges) {
      state = FLOW_STATES.READY_FOR_QA;
      confidence = 0.82;
      reasons.push('Story in progress with clean working tree');
    }
    // Code complete (uncommitted changes)
    else if (sig.story?.status === 'in_progress' && sig.git?.hasChanges) {
      state = FLOW_STATES.IN_DEVELOPMENT;
      confidence = 0.85;
      reasons.push('Story in progress with uncommitted changes');
    }
    // Ready to start
    else if (sig.story?.status === 'validated' || sig.story?.status === 'ready') {
      state = FLOW_STATES.READY_TO_START;
      confidence = 0.88;
      reasons.push('Story validated and ready');
    }
    // Planning
    else if (sig.story?.status === 'draft' || sig.story?.status === 'planning') {
      state = FLOW_STATES.PLANNING;
      confidence = 0.80;
      reasons.push('Story in planning phase');
    }
    // Default: idle
    else {
      state = FLOW_STATES.IDLE;
      confidence = 0.5;
      reasons.push('No active work detected');
    }

    this.currentState = state;
    this.context = { signals: sig, reasons, confidence };

    return {
      state,
      signals: sig,
      confidence,
      reasons,
      timestamp: new Date().toISOString(),
    };
  }

  /**
   * Get recommended actions for the current state
   * @param {Object} [context] - Additional context for template substitution
   * @returns {Array} Recommended actions
   */
  getRecommendedActions(context = {}) {
    // Convert state ID to uppercase for lookup (e.g., 'ready_to_start' -> 'READY_TO_START')
    const stateKey = this.currentState.id.toUpperCase();
    const actions = STATE_ACTIONS[stateKey] || [];
    const story = context.story || this.signals.story?.path || '';

    return actions.map(action => ({
      ...action,
      command: action.command.replace('${story}', story),
    }));
  }

  /**
   * Get state transition options
   * @returns {Array} Possible next states
   */
  getTransitionOptions() {
    // Convert state ID to uppercase for lookup
    const stateKey = this.currentState.id.toUpperCase();
    const transitions = STATE_TRANSITIONS[stateKey];
    if (!transitions || !transitions.next) {
      return [];
    }

    return transitions.next.map(stateId => ({
      state: FLOW_STATES[stateId],
      triggers: transitions.triggers,
    }));
  }

  /**
   * Record a command in history for pattern detection
   * @param {string} command - Command that was executed
   */
  recordCommand(command) {
    this.history.push({
      command,
      timestamp: new Date().toISOString(),
      state: this.currentState.id,
    });

    // Keep only last 50 commands
    if (this.history.length > 50) {
      this.history = this.history.slice(-50);
    }
  }

  /**
   * Generate a visual representation of the current state
   * @returns {string} ASCII art state visualization
   */
  visualizeState() {
    const state = this.currentState;
    const lines = [];

    lines.push('┌─────────────────────────────────────┐');
    lines.push(`│  ${state.icon} ${state.label.padEnd(30)}│`);
    lines.push('├─────────────────────────────────────┤');
    lines.push(`│  ${state.description.padEnd(35)}│`);
    lines.push(`│  Confidence: ${(this.context.confidence * 100).toFixed(0)}%`.padEnd(37) + '│');
    lines.push('└─────────────────────────────────────┘');

    // Add recommended actions
    const actions = this.getRecommendedActions();
    if (actions.length > 0) {
      lines.push('');
      lines.push('Recommended next steps:');
      actions.forEach((action, i) => {
        lines.push(`  ${i + 1}. ${action.command}`);
        lines.push(`     ${action.description}`);
      });
    }

    return lines.join('\n');
  }

  /**
   * Export state for persistence or handoff
   * @returns {Object} Serializable state object
   */
  exportState() {
    return {
      version: '1.0.0',
      currentState: this.currentState.id,
      context: this.context,
      signals: this.signals,
      history: this.history.slice(-10), // Last 10 commands
      exportedAt: new Date().toISOString(),
    };
  }

  /**
   * Import state from a previous export
   * @param {Object} data - Previously exported state
   */
  importState(data) {
    if (data.version !== '1.0.0') {
      throw new Error(`Unsupported state version: ${data.version}`);
    }

    // Convert state ID to uppercase for FLOW_STATES lookup
    const stateKey = data.currentState ? data.currentState.toUpperCase() : 'IDLE';
    this.currentState = FLOW_STATES[stateKey] || FLOW_STATES.IDLE;
    this.context = data.context || {};
    this.signals = data.signals || {};
    this.history = data.history || [];
  }
}

module.exports = {
  FlowStateEngine,
  FLOW_STATES,
  STATE_TRANSITIONS,
  STATE_ACTIONS,
};
