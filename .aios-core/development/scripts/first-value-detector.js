/**
 * First Value Detector - 首次价值检测器
 *
 * 自动检测用户是否达到首次价值点 (TTFV - Time to First Value)
 * 追踪关键里程碑并生成分析报告
 *
 * @module first-value-detector
 * @version 1.0.0
 * @story FVD-1: First Value Detection
 */

const fs = require('fs');
const path = require('path');
const yaml = require('js-yaml');

/**
 * 里程碑定义 - 用户达到首次价值的关键事件
 */
const MILESTONES = {
  // P0 - 核心里程碑 (必须达到才算是首次价值)
  AGENT_ACTIVATED: {
    id: 'agent_activated',
    name: 'Agent Activated',
    description: 'Successfully activated first AI agent',
    category: 'core',
    weight: 10,
    required: true,
  },
  COMMAND_EXECUTED: {
    id: 'command_executed',
    name: 'Command Executed',
    description: 'Successfully executed first command',
    category: 'core',
    weight: 10,
    required: true,
  },

  // P1 - 重要里程碑 (增强价值体验)
  STORY_CREATED: {
    id: 'story_created',
    name: 'Story Created',
    description: 'Created first development story',
    category: 'important',
    weight: 8,
    required: false,
  },
  TASK_COMPLETED: {
    id: 'task_completed',
    name: 'Task Completed',
    description: 'Completed first task',
    category: 'important',
    weight: 8,
    required: false,
  },
  TOUR_FINISHED: {
    id: 'tour_finished',
    name: 'Tour Finished',
    description: 'Completed onboarding tour',
    category: 'important',
    weight: 7,
    required: false,
  },

  // P2 - 增强里程碑 (深度使用)
  AGENT_HANDOFF: {
    id: 'agent_handoff',
    name: 'Agent Handoff',
    description: 'Witnessed agent collaboration',
    category: 'enhanced',
    weight: 5,
    required: false,
  },
  QUALITY_GATE_PASSED: {
    id: 'quality_gate_passed',
    name: 'Quality Gate Passed',
    description: 'Passed first quality gate',
    category: 'enhanced',
    weight: 5,
    required: false,
  },
  ERROR_RECOVERED: {
    id: 'error_recovered',
    name: 'Error Recovered',
    description: 'Successfully recovered from error',
    category: 'enhanced',
    weight: 4,
    required: false,
  },
};

/**
 * 首次价值阈值配置
 */
const FV_CONFIG = {
  // 达到首次价值所需的最小权重分数
  MIN_SCORE: 18,
  // 必须完成的核心里程碑数
  REQUIRED_MILESTONES: 2,
  // 从首次激活开始的最大TTFV时间 (毫秒)
  MAX_TTFV_MS: 30 * 60 * 1000, // 30 minutes
  // 状态文件路径
  STATE_FILE: 'first-value-state.yaml',
};

/**
 * FirstValueDetector 类
 * 追踪用户里程碑并检测首次价值达成
 */
class FirstValueDetector {
  /**
   * @param {string} [projectRoot] - 项目根目录
   */
  constructor(projectRoot = process.cwd()) {
    this.projectRoot = projectRoot;
    this.stateFilePath = path.join(
      projectRoot,
      '.aios-core',
      'data',
      FV_CONFIG.STATE_FILE
    );
    this.state = this._loadState();
  }

  /**
   * 加载状态文件
   * @returns {Object} 状态对象
   * @private
   */
  _loadState() {
    const defaultState = {
      version: '1.0.0',
      sessionStartedAt: new Date().toISOString(),
      milestones: {},
      firstValueReached: false,
      firstValueAt: null,
      ttfv: null,
    };

    try {
      if (!fs.existsSync(this.stateFilePath)) {
        return defaultState;
      }

      const content = fs.readFileSync(this.stateFilePath, 'utf8');
      const state = yaml.load(content);

      return {
        version: state.version || defaultState.version,
        sessionStartedAt: state.sessionStartedAt || defaultState.sessionStartedAt,
        milestones: state.milestones || {},
        firstValueReached: state.firstValueReached || false,
        firstValueAt: state.firstValueAt || null,
        ttfv: state.ttfv || null,
      };
    } catch (error) {
      return defaultState;
    }
  }

  /**
   * 保存状态到文件
   * @private
   */
  _saveState() {
    try {
      const dir = path.dirname(this.stateFilePath);
      if (!fs.existsSync(dir)) {
        fs.mkdirSync(dir, { recursive: true });
      }

      const yamlContent = yaml.dump(this.state, { lineWidth: -1 });
      fs.writeFileSync(this.stateFilePath, yamlContent, 'utf8');
    } catch (error) {
      console.error('Failed to save first-value state:', error.message);
    }
  }

  /**
   * 记录里程碑达成
   * @param {string} milestoneId - 里程碑ID
   * @param {Object} [context] - 额外上下文
   * @returns {Object} 更新后的状态
   */
  recordMilestone(milestoneId, context = {}) {
    const milestone = Object.values(MILESTONES).find(m => m.id === milestoneId);

    if (!milestone) {
      return { success: false, error: `Unknown milestone: ${milestoneId}` };
    }

    // 如果已经达成首次价值，不再追踪
    if (this.state.firstValueReached) {
      return { success: true, alreadyCompleted: true };
    }

    const now = new Date().toISOString();

    // 记录里程碑
    this.state.milestones[milestoneId] = {
      ...milestone,
      reachedAt: now,
      context,
    };

    // 检查是否达到首次价值
    const fvCheck = this._checkFirstValue();

    this._saveState();

    return {
      success: true,
      milestone: milestoneId,
      firstValueReached: fvCheck.reached,
      score: fvCheck.score,
      ttfv: fvCheck.ttfv,
    };
  }

  /**
   * 检查是否达到首次价值
   * @returns {Object} 检查结果
   * @private
   */
  _checkFirstValue() {
    const reachedMilestones = Object.keys(this.state.milestones);

    // 计算分数
    let score = 0;
    let requiredCount = 0;

    for (const milestoneId of reachedMilestones) {
      const milestone = Object.values(MILESTONES).find(m => m.id === milestoneId);
      if (milestone) {
        score += milestone.weight;
        if (milestone.required) {
          requiredCount++;
        }
      }
    }

    // 检查条件
    const hasRequiredMilestones = requiredCount >= FV_CONFIG.REQUIRED_MILESTONES;
    const hasEnoughScore = score >= FV_CONFIG.MIN_SCORE;

    const reached = hasRequiredMilestones && hasEnoughScore;

    if (reached && !this.state.firstValueReached) {
      const now = new Date();
      const startedAt = new Date(this.state.sessionStartedAt);
      const ttfv = now - startedAt;

      this.state.firstValueReached = true;
      this.state.firstValueAt = now.toISOString();
      this.state.ttfv = ttfv;
    }

    return {
      reached,
      score,
      requiredCount,
      hasRequiredMilestones,
      hasEnoughScore,
      ttfv: this.state.ttfv,
    };
  }

  /**
   * 获取当前状态
   * @returns {Object} 状态对象
   */
  getStatus() {
    const fvCheck = this._checkFirstValue();
    const reachedMilestones = Object.keys(this.state.milestones).map(id => {
      const m = this.state.milestones[id];
      return {
        id: m.id,
        name: m.name,
        category: m.category,
        reachedAt: m.reachedAt,
      };
    });

    return {
      sessionStartedAt: this.state.sessionStartedAt,
      firstValueReached: this.state.firstValueReached,
      firstValueAt: this.state.firstValueAt,
      ttfv: this.state.ttfv,
      ttfvFormatted: this.state.ttfv ? this._formatDuration(this.state.ttfv) : null,
      currentScore: fvCheck.score,
      minScore: FV_CONFIG.MIN_SCORE,
      requiredMilestones: fvCheck.requiredCount,
      milestones: reachedMilestones,
      progress: this._calculateProgress(fvCheck),
    };
  }

  /**
   * 计算进度百分比
   * @param {Object} fvCheck - 检查结果
   * @returns {number} 进度百分比 (0-100)
   * @private
   */
  _calculateProgress(fvCheck) {
    if (fvCheck.reached) {
      return 100;
    }

    const scoreProgress = (fvCheck.score / FV_CONFIG.MIN_SCORE) * 70;
    const requiredProgress = (fvCheck.requiredCount / FV_CONFIG.REQUIRED_MILESTONES) * 30;

    return Math.min(100, Math.round(scoreProgress + requiredProgress));
  }

  /**
   * 格式化持续时间
   * @param {number} ms - 毫秒数
   * @returns {string} 格式化的时间字符串
   * @private
   */
  _formatDuration(ms) {
    const seconds = Math.floor(ms / 1000);
    const minutes = Math.floor(seconds / 60);
    const hours = Math.floor(minutes / 60);

    if (hours > 0) {
      return `${hours}h ${minutes % 60}m`;
    }
    if (minutes > 0) {
      return `${minutes}m ${seconds % 60}s`;
    }
    return `${seconds}s`;
  }

  /**
   * 生成进度报告
   * @returns {string} ASCII 格式的进度报告
   */
  generateReport() {
    const status = this.getStatus();
    const lines = [];

    lines.push('┌─────────────────────────────────────────────────────┐');
    lines.push('│         🎯 First Value Detection Report             │');
    lines.push('└─────────────────────────────────────────────────────┘');
    lines.push('');

    // 状态概览
    if (status.firstValueReached) {
      lines.push('  ✅ First Value Reached!');
      lines.push(`     📅 At: ${new Date(status.firstValueAt).toLocaleString()}`);
      lines.push(`     ⏱️  TTFV: ${status.ttfvFormatted}`);
    } else {
      const progressBar = this._generateProgressBar(status.progress);
      lines.push(`  🔄 Progress: ${progressBar} ${status.progress}%`);
      lines.push(`     📊 Score: ${status.currentScore}/${status.minScore}`);
      lines.push(`     🎯 Required Milestones: ${status.requiredMilestones}/${FV_CONFIG.REQUIRED_MILESTONES}`);
    }

    lines.push('');
    lines.push('  ─────────────────────────────────────────');
    lines.push('  Reached Milestones:');
    lines.push('');

    if (status.milestones.length === 0) {
      lines.push('    No milestones reached yet.');
    } else {
      for (const m of status.milestones) {
        const icon = m.category === 'core' ? '⭐' : m.category === 'important' ? '📌' : '📍';
        const time = new Date(m.reachedAt).toLocaleTimeString();
        lines.push(`    ${icon} ${m.name} (${time})`);
      }
    }

    // 待完成里程碑
    lines.push('');
    lines.push('  ─────────────────────────────────────────');
    lines.push('  Remaining Milestones:');

    const reachedIds = status.milestones.map(m => m.id);
    const remainingCore = Object.values(MILESTONES)
      .filter(m => m.required && !reachedIds.includes(m.id));
    const remainingOther = Object.values(MILESTONES)
      .filter(m => !m.required && !reachedIds.includes(m.id));

    lines.push('');
    lines.push('    Core (required):');
    if (remainingCore.length === 0) {
      lines.push('      ✓ All core milestones completed!');
    } else {
      for (const m of remainingCore) {
        lines.push(`      ○ ${m.name} (+${m.weight} pts)`);
      }
    }

    lines.push('');
    lines.push('    Optional:');
    for (const m of remainingOther.slice(0, 4)) {
      lines.push(`      ○ ${m.name} (+${m.weight} pts)`);
    }

    lines.push('');
    return lines.join('\n');
  }

  /**
   * 生成进度条
   * @param {number} progress - 进度百分比
   * @returns {string} ASCII 进度条
   * @private
   */
  _generateProgressBar(progress) {
    const filled = Math.floor(progress / 10);
    const empty = 10 - filled;
    return '█'.repeat(filled) + '░'.repeat(empty);
  }

  /**
   * 生成简短状态行
   * @returns {string} 状态行
   */
  generateStatusLine() {
    const status = this.getStatus();

    if (status.firstValueReached) {
      return `✅ First Value reached in ${status.ttfvFormatted}`;
    }

    return `🔄 First Value progress: ${status.progress}% (${status.currentScore}/${status.minScore} pts)`;
  }

  /**
   * 重置状态
   */
  reset() {
    this.state = {
      version: '1.0.0',
      sessionStartedAt: new Date().toISOString(),
      milestones: {},
      firstValueReached: false,
      firstValueAt: null,
      ttfv: null,
    };
    this._saveState();
  }

  /**
   * 获取所有里程碑定义
   * @returns {Object} 里程碑定义
   */
  static getMilestones() {
    return MILESTONES;
  }

  /**
   * 获取配置
   * @returns {Object} 配置对象
   */
  static getConfig() {
    return FV_CONFIG;
  }
}

module.exports = {
  FirstValueDetector,
  MILESTONES,
  FV_CONFIG,
};
