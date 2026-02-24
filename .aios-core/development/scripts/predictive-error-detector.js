/**
 * Predictive Error Detector - 预测性错误检测器
 *
 * 提前警告潜在问题，分析错误模式，预测可能的错误
 *
 * @module predictive-error-detector
 * @version 1.0.0
 * @story PED-1: Predictive Error Detection
 */

const fs = require('fs');
const path = require('path');
const yaml = require('js-yaml');

/**
 * 风险因素定义
 */
const RISK_FACTORS = {
  // 代码相关风险
  UNCOMMITTED_CHANGES: {
    id: 'uncommitted_changes',
    name: 'Uncommitted Changes',
    category: 'code',
    severity: 'medium',
    description: 'Working directory has uncommitted changes',
    prediction: 'May cause merge conflicts or lost work',
    suggestion: 'Consider committing changes before continuing',
    weight: 5,
  },
  LARGE_DIFF: {
    id: 'large_diff',
    name: 'Large Diff',
    category: 'code',
    severity: 'medium',
    description: 'Changes exceed recommended size (500+ lines)',
    prediction: 'Higher chance of bugs and review fatigue',
    suggestion: 'Consider breaking into smaller commits',
    weight: 6,
  },
  MISSING_TESTS: {
    id: 'missing_tests',
    name: 'Missing Tests',
    category: 'code',
    severity: 'high',
    description: 'Code changes without corresponding tests',
    prediction: 'Untested code is more likely to have bugs',
    suggestion: 'Add tests for new functionality',
    weight: 8,
  },
  DEPENDENCY_UPDATE: {
    id: 'dependency_update',
    name: 'Dependency Update',
    category: 'code',
    severity: 'medium',
    description: 'Package dependencies have been updated',
    prediction: 'May introduce breaking changes',
    suggestion: 'Review changelog and run full test suite',
    weight: 5,
  },

  // 流程相关风险
  LONG_RUNNING_SESSION: {
    id: 'long_running_session',
    name: 'Long Running Session',
    category: 'process',
    severity: 'low',
    description: 'Session has been running for extended period',
    prediction: 'Context may become stale or overwhelming',
    suggestion: 'Consider summarizing or taking a break',
    weight: 3,
  },
  MULTIPLE_AGENTS: {
    id: 'multiple_agents',
    name: 'Multiple Agents Active',
    category: 'process',
    severity: 'low',
    description: 'Multiple agents have been activated in session',
    prediction: 'May cause context confusion',
    suggestion: 'Ensure clear handoff between agents',
    weight: 4,
  },
  RAPID_CHANGES: {
    id: 'rapid_changes',
    name: 'Rapid File Changes',
    category: 'process',
    severity: 'medium',
    description: 'Many files changed in short time period',
    prediction: 'May indicate rushed work or system issues',
    suggestion: 'Review changes carefully before proceeding',
    weight: 5,
  },

  // 环境相关风险
  LOW_DISK_SPACE: {
    id: 'low_disk_space',
    name: 'Low Disk Space',
    category: 'environment',
    severity: 'high',
    description: 'Disk space is running low',
    prediction: 'May cause write failures or system slowdown',
    suggestion: 'Free up disk space before continuing',
    weight: 7,
  },
  OUTDATED_DEPS: {
    id: 'outdated_deps',
    name: 'Outdated Dependencies',
    category: 'environment',
    severity: 'low',
    description: 'Some dependencies are behind latest version',
    prediction: 'May miss important fixes or features',
    suggestion: 'Consider updating dependencies',
    weight: 3,
  },

  // 历史相关风险
  RECENT_ERRORS: {
    id: 'recent_errors',
    name: 'Recent Errors',
    category: 'history',
    severity: 'high',
    description: 'Similar errors occurred recently',
    prediction: 'Pattern may repeat',
    suggestion: 'Review error history and apply fixes',
    weight: 7,
  },
  FAILED_QUALITY_GATE: {
    id: 'failed_quality_gate',
    name: 'Failed Quality Gate',
    category: 'history',
    severity: 'high',
    description: 'Previous quality gate failed',
    prediction: 'Same issue may occur again',
    suggestion: 'Address root cause before continuing',
    weight: 8,
  },
};

/**
 * 错误模式定义
 */
const ERROR_PATTERNS = {
  IMPORT_ERROR: {
    pattern: /Cannot find module|Module not found|import.*not found/i,
    category: 'dependency',
    autoFix: 'Check if package is installed and import path is correct',
  },
  TYPE_ERROR: {
    pattern: /TypeError|is not a function|Cannot read property|undefined is not/i,
    category: 'code',
    autoFix: 'Add null/undefined checks or verify object structure',
  },
  SYNTAX_ERROR: {
    pattern: /SyntaxError|Unexpected token|Parse error/i,
    category: 'code',
    autoFix: 'Check for missing brackets, quotes, or invalid syntax',
  },
  PERMISSION_ERROR: {
    pattern: /EACCES|EPERM|Permission denied|not authorized/i,
    category: 'system',
    autoFix: 'Check file permissions or run with appropriate privileges',
  },
  NETWORK_ERROR: {
    pattern: /ENOTFOUND|ECONNREFUSED|ETIMEDOUT|Network|fetch failed/i,
    category: 'network',
    autoFix: 'Check network connection and service availability',
  },
  CONFIG_ERROR: {
    pattern: /config|configuration|invalid.*setting/i,
    category: 'config',
    autoFix: 'Verify configuration file format and values',
  },
};

/**
 * PED 配置
 */
const PED_CONFIG = {
  // 高风险阈值
  HIGH_RISK_THRESHOLD: 20,
  // 中风险阈值
  MEDIUM_RISK_THRESHOLD: 10,
  // 最大历史记录
  MAX_HISTORY: 100,
  // 状态文件路径
  STATE_FILE: 'predictive-error-state.yaml',
};

/**
 * PredictiveErrorDetector 类
 * 分析风险因素，预测潜在错误
 */
class PredictiveErrorDetector {
  /**
   * @param {string} [projectRoot] - 项目根目录
   */
  constructor(projectRoot = process.cwd()) {
    this.projectRoot = projectRoot;
    this.stateFilePath = path.join(
      projectRoot,
      '.aios-core',
      'data',
      PED_CONFIG.STATE_FILE
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
      errorHistory: [],
      riskAssessments: [],
      patterns: {},
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
        errorHistory: (state.errorHistory || []).slice(-PED_CONFIG.MAX_HISTORY),
        riskAssessments: (state.riskAssessments || []).slice(-20),
        patterns: state.patterns || {},
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
      console.error('Failed to save predictive error state:', error.message);
    }
  }

  /**
   * 分析当前风险因素
   * @param {Object} context - 上下文信息
   * @returns {Object} 风险评估结果
   */
  analyzeRisk(context = {}) {
    const detectedRisks = [];
    let totalScore = 0;

    // 检测各类风险
    for (const [key, risk] of Object.entries(RISK_FACTORS)) {
      const detected = this._detectRisk(risk, context);
      if (detected) {
        detectedRisks.push({
          ...risk,
          detectedAt: new Date().toISOString(),
          details: detected.details,
        });
        totalScore += risk.weight;
      }
    }

    // 确定风险级别
    let riskLevel = 'low';
    if (totalScore >= PED_CONFIG.HIGH_RISK_THRESHOLD) {
      riskLevel = 'high';
    } else if (totalScore >= PED_CONFIG.MEDIUM_RISK_THRESHOLD) {
      riskLevel = 'medium';
    }

    const assessment = {
      timestamp: new Date().toISOString(),
      riskLevel,
      totalScore,
      risks: detectedRisks,
      recommendations: this._generateRecommendations(detectedRisks),
    };

    // 保存评估结果
    this.state.riskAssessments.push(assessment);
    this._saveState();

    return assessment;
  }

  /**
   * 检测单个风险因素
   * @param {Object} risk - 风险定义
   * @param {Object} context - 上下文
   * @returns {Object|null} 检测结果
   * @private
   */
  _detectRisk(risk, context) {
    switch (risk.id) {
      case 'uncommitted_changes':
        if (context.hasUncommittedChanges) {
          return { details: 'Working directory has uncommitted files' };
        }
        break;

      case 'large_diff':
        if (context.diffLines && context.diffLines > 500) {
          return { details: `${context.diffLines} lines changed` };
        }
        break;

      case 'missing_tests':
        if (context.sourceFiles > 0 && context.testFiles === 0) {
          return { details: `${context.sourceFiles} source files without tests` };
        }
        break;

      case 'dependency_update':
        if (context.hasDependencyChanges) {
          return { details: 'Dependencies have been modified' };
        }
        break;

      case 'long_running_session':
        const sessionDuration = Date.now() - new Date(this.state.sessionStartedAt).getTime();
        if (sessionDuration > 2 * 60 * 60 * 1000) { // 2 hours
          return { details: `Session running for ${Math.floor(sessionDuration / 3600000)} hours` };
        }
        break;

      case 'multiple_agents':
        if (context.agentCount && context.agentCount > 2) {
          return { details: `${context.agentCount} agents active` };
        }
        break;

      case 'rapid_changes':
        if (context.recentFileChanges && context.recentFileChanges > 10) {
          return { details: `${context.recentFileChanges} files changed recently` };
        }
        break;

      case 'low_disk_space':
        if (context.diskSpaceGB && context.diskSpaceGB < 5) {
          return { details: `${context.diskSpaceGB}GB remaining` };
        }
        break;

      case 'outdated_deps':
        if (context.outdatedDeps && context.outdatedDeps > 5) {
          return { details: `${context.outdatedDeps} packages outdated` };
        }
        break;

      case 'recent_errors':
        const recentErrors = this.state.errorHistory.filter(e => {
          const errorTime = new Date(e.timestamp).getTime();
          return Date.now() - errorTime < 30 * 60 * 1000; // 30 minutes
        });
        if (recentErrors.length > 2) {
          return { details: `${recentErrors.length} errors in last 30 minutes` };
        }
        break;

      case 'failed_quality_gate':
        if (context.lastQualityGateFailed) {
          return { details: 'Previous quality gate did not pass' };
        }
        break;
    }

    return null;
  }

  /**
   * 生成建议
   * @param {Array} risks - 检测到的风险
   * @returns {Array} 建议列表
   * @private
   */
  _generateRecommendations(risks) {
    const recommendations = [];

    // 按严重程度排序
    const sortedRisks = [...risks].sort((a, b) => {
      const severityOrder = { high: 3, medium: 2, low: 1 };
      return severityOrder[b.severity] - severityOrder[a.severity];
    });

    for (const risk of sortedRisks.slice(0, 5)) {
      recommendations.push({
        priority: risk.severity,
        risk: risk.name,
        suggestion: risk.suggestion,
        prediction: risk.prediction,
      });
    }

    return recommendations;
  }

  /**
   * 记录错误
   * @param {Error|string} error - 错误对象或消息
   * @param {Object} [context] - 错误上下文
   */
  recordError(error, context = {}) {
    const errorMessage = error instanceof Error ? error.message : String(error);
    const errorStack = error instanceof Error ? error.stack : undefined;

    // 识别错误模式
    let matchedPattern = null;
    for (const [name, pattern] of Object.entries(ERROR_PATTERNS)) {
      if (pattern.pattern.test(errorMessage)) {
        matchedPattern = { name, ...pattern };
        break;
      }
    }

    const errorRecord = {
      timestamp: new Date().toISOString(),
      message: errorMessage,
      stack: errorStack,
      category: matchedPattern?.category || 'unknown',
      pattern: matchedPattern?.name || null,
      autoFix: matchedPattern?.autoFix || null,
      context,
    };

    this.state.errorHistory.push(errorRecord);

    // 更新模式统计
    if (matchedPattern) {
      const patternCount = this.state.patterns[matchedPattern.name] || 0;
      this.state.patterns[matchedPattern.name] = patternCount + 1;
    }

    this._saveState();
  }

  /**
   * 预测可能的错误
   * @returns {Object} 预测结果
   */
  predictErrors() {
    const predictions = [];
    const recentErrors = this.state.errorHistory.slice(-10);

    // 基于历史模式预测
    for (const [patternName, count] of Object.entries(this.state.patterns)) {
      if (count >= 2) {
        const pattern = ERROR_PATTERNS[patternName];
        if (pattern) {
          predictions.push({
            type: 'pattern_based',
            pattern: patternName,
            probability: Math.min(90, 30 + count * 15),
            category: pattern.category,
            description: `Based on ${count} similar errors`,
            autoFix: pattern.autoFix,
          });
        }
      }
    }

    // 基于风险评估预测
    const lastAssessment = this.state.riskAssessments[this.state.riskAssessments.length - 1];
    if (lastAssessment && lastAssessment.riskLevel !== 'low') {
      predictions.push({
        type: 'risk_based',
        riskLevel: lastAssessment.riskLevel,
        probability: lastAssessment.riskLevel === 'high' ? 70 : 40,
        risks: lastAssessment.risks.slice(0, 3),
        description: `Based on ${lastAssessment.risks.length} detected risk factors`,
      });
    }

    return {
      timestamp: new Date().toISOString(),
      predictions,
      hasWarnings: predictions.length > 0,
      errorHistoryCount: this.state.errorHistory.length,
      patternStats: this.state.patterns,
    };
  }

  /**
   * 生成风险报告
   * @returns {string} ASCII 格式的报告
   */
  generateReport() {
    const lastAssessment = this.state.riskAssessments[this.state.riskAssessments.length - 1];
    const prediction = this.predictErrors();
    const lines = [];

    lines.push('┌─────────────────────────────────────────────────────┐');
    lines.push('│      🔮 Predictive Error Detection Report           │');
    lines.push('└─────────────────────────────────────────────────────┘');
    lines.push('');

    // 风险级别
    if (lastAssessment) {
      const levelIcon = lastAssessment.riskLevel === 'high' ? '🔴' :
                       lastAssessment.riskLevel === 'medium' ? '🟡' : '🟢';
      lines.push(`  Risk Level: ${levelIcon} ${lastAssessment.riskLevel.toUpperCase()}`);
      lines.push(`  Risk Score: ${lastAssessment.totalScore}`);
      lines.push('');
    } else {
      lines.push('  Risk Level: 🟢 No assessment yet');
      lines.push('');
    }

    // 检测到的风险
    if (lastAssessment?.risks?.length > 0) {
      lines.push('  ─────────────────────────────────────────');
      lines.push('  Detected Risks:');
      lines.push('');

      for (const risk of lastAssessment.risks.slice(0, 5)) {
        const icon = risk.severity === 'high' ? '⚠️' :
                    risk.severity === 'medium' ? '⚡' : 'ℹ️';
        lines.push(`    ${icon} ${risk.name}`);
        lines.push(`       ${risk.prediction}`);
      }
      lines.push('');
    }

    // 预测
    if (prediction.hasWarnings) {
      lines.push('  ─────────────────────────────────────────');
      lines.push('  Predictions:');
      lines.push('');

      for (const p of prediction.predictions.slice(0, 3)) {
        if (p.type === 'pattern_based') {
          lines.push(`    📊 ${p.pattern}: ${p.probability}% probability`);
          lines.push(`       ${p.description}`);
        } else if (p.type === 'risk_based') {
          lines.push(`    ⚠️  Risk-based: ${p.probability}% chance of issues`);
          lines.push(`       ${p.description}`);
        }
      }
      lines.push('');
    }

    // 建议
    if (lastAssessment?.recommendations?.length > 0) {
      lines.push('  ─────────────────────────────────────────');
      lines.push('  Recommendations:');
      lines.push('');

      for (let i = 0; i < Math.min(3, lastAssessment.recommendations.length); i++) {
        const rec = lastAssessment.recommendations[i];
        lines.push(`    ${i + 1}. ${rec.suggestion}`);
      }
      lines.push('');
    }

    // 错误历史统计
    lines.push('  ─────────────────────────────────────────');
    lines.push(`  Error History: ${this.state.errorHistory.length} errors recorded`);

    if (Object.keys(this.state.patterns).length > 0) {
      const topPattern = Object.entries(this.state.patterns)
        .sort((a, b) => b[1] - a[1])[0];
      lines.push(`  Most Common: ${topPattern[0]} (${topPattern[1]}x)`);
    }

    lines.push('');
    return lines.join('\n');
  }

  /**
   * 生成状态行
   * @returns {string} 状态行
   */
  generateStatusLine() {
    const lastAssessment = this.state.riskAssessments[this.state.riskAssessments.length - 1];

    if (!lastAssessment) {
      return '🔮 No risk assessment yet';
    }

    const icon = lastAssessment.riskLevel === 'high' ? '🔴' :
                lastAssessment.riskLevel === 'medium' ? '🟡' : '🟢';

    return `🔮 Risk: ${icon} ${lastAssessment.riskLevel.toUpperCase()} (${lastAssessment.totalScore} pts, ${lastAssessment.risks.length} risks)`;
  }

  /**
   * 获取错误历史
   * @param {number} [limit] - 限制条目数
   * @returns {Array} 错误历史
   */
  getErrorHistory(limit = 10) {
    return this.state.errorHistory.slice(-limit);
  }

  /**
   * 重置状态
   */
  reset() {
    this.state = {
      version: '1.0.0',
      sessionStartedAt: new Date().toISOString(),
      errorHistory: [],
      riskAssessments: [],
      patterns: {},
    };
    this._saveState();
  }

  /**
   * 获取风险因素定义
   * @returns {Object} 风险因素定义
   */
  static getRiskFactors() {
    return RISK_FACTORS;
  }

  /**
   * 获取错误模式定义
   * @returns {Object} 错误模式定义
   */
  static getErrorPatterns() {
    return ERROR_PATTERNS;
  }

  /**
   * 获取配置
   * @returns {Object} 配置对象
   */
  static getConfig() {
    return PED_CONFIG;
  }
}

module.exports = {
  PredictiveErrorDetector,
  RISK_FACTORS,
  ERROR_PATTERNS,
  PED_CONFIG,
};
