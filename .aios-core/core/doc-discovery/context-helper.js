/**
 * ContextHelper - 上下文帮助系统
 *
 * 根据用户当前上下文提供相关的帮助信息
 *
 * @module core/doc-discovery/context-helper
 */

const fs = require('fs');
const path = require('path');
const yaml = require('js-yaml');

/**
 * 上下文帮助结果
 * @typedef {Object} HelpResult
 * @property {string} topic - 帮助主题
 * @property {string} summary - 摘要
 * @property {string[]} relatedDocs - 相关文档
 * @property {string[]} suggestions - 建议操作
 * @property {string[]} relatedCommands - 相关命令
 */

/**
 * 上下文信息
 * @typedef {Object} ContextInfo
 * @property {string} command - 当前命令
 * @property {string} agent - 当前代理
 * @property {string} story - 当前 Story
 * @property {string} error - 错误代码
 * @property {string} directory - 当前目录
 */

/**
 * 上下文帮助系统
 */
class ContextHelper {
  /**
   * @param {string} projectRoot - 项目根目录
   * @param {Object} options - 选项
   */
  constructor(projectRoot, options = {}) {
    this.projectRoot = projectRoot;
    this.helpRulesFile = options.helpRulesFile ||
      path.join(projectRoot, '.aios-core/data/help-rules.yaml');
    this.helpRules = new Map();
    this.initialized = false;
  }

  /**
   * 初始化帮助系统
   * @returns {Promise<void>}
   */
  async initialize() {
    if (this.initialized) {
      return;
    }

    await this._loadHelpRules();
    this.initialized = true;
  }

  /**
   * 加载帮助规则
   * @private
   */
  async _loadHelpRules() {
    // 内置帮助规则
    const builtInRules = this._getBuiltInRules();

    // 尝试加载自定义规则
    if (fs.existsSync(this.helpRulesFile)) {
      try {
        const content = fs.readFileSync(this.helpRulesFile, 'utf8');
        const customRules = yaml.load(content) || [];

        for (const rule of customRules) {
          this.helpRules.set(rule.id, rule);
        }
      } catch (error) {
        // 忽略加载错误
      }
    }

    // 加载内置规则
    for (const rule of builtInRules) {
      if (!this.helpRules.has(rule.id)) {
        this.helpRules.set(rule.id, rule);
      }
    }
  }

  /**
   * 获取内置帮助规则
   * @returns {Object[]}
   * @private
   */
  _getBuiltInRules() {
    return [
      // 命令帮助规则
      {
        id: 'cmd-doctor',
        triggers: { command: 'doctor' },
        topic: 'System Diagnostics',
        summary: 'Run comprehensive system health checks',
        relatedDocs: ['docs/guides/troubleshooting.md'],
        suggestions: [
          'Run with --fix to automatically fix issues',
          'Use --full for detailed diagnostics'
        ],
        relatedCommands: ['diagnose', 'fix']
      },
      {
        id: 'cmd-quickstart',
        triggers: { command: 'quickstart' },
        topic: 'Quick Start Guide',
        summary: 'Get started quickly with common workflows',
        relatedDocs: ['docs/guides/getting-started.md'],
        suggestions: [
          'Choose a workflow template to get started',
          'Use --list to see all available workflows'
        ],
        relatedCommands: ['tour', 'config wizard']
      },
      {
        id: 'cmd-story',
        triggers: { command: /^story/ },
        topic: 'Story Management',
        summary: 'Manage development stories and track progress',
        relatedDocs: ['docs/guides/story-driven-development.md'],
        suggestions: [
          'Use "story list" to see all stories',
          'Use "story create" to create a new story'
        ],
        relatedCommands: ['agents status']
      },
      {
        id: 'cmd-agents',
        triggers: { command: /^agents/ },
        topic: 'Agent Management',
        summary: 'Manage AI agents and route tasks',
        relatedDocs: ['docs/architecture/agent-system.md'],
        suggestions: [
          'Use "agents list" to see available agents',
          'Use "agents route" to find the best agent for a task'
        ],
        relatedCommands: ['story']
      },

      // 错误代码帮助规则
      {
        id: 'error-cfg',
        triggers: { error: /^CFG_/ },
        topic: 'Configuration Error',
        summary: 'There is an issue with your configuration',
        relatedDocs: ['docs/guides/configuration.md'],
        suggestions: [
          'Run "aios doctor" to diagnose configuration issues',
          'Check your .aios-core/config/core-config.yaml file'
        ],
        relatedCommands: ['doctor', 'config validate']
      },
      {
        id: 'error-agent',
        triggers: { error: /^AGENT_/ },
        topic: 'Agent Error',
        summary: 'There is an issue with agent activation or operation',
        relatedDocs: ['docs/architecture/agent-system.md'],
        suggestions: [
          'Check if the agent exists with "aios agents list"',
          'Try activating with full context'
        ],
        relatedCommands: ['agents status']
      },

      // 代理帮助规则
      {
        id: 'agent-dev',
        triggers: { agent: 'dev' },
        topic: 'Developer Agent (Dex)',
        summary: 'Implementation and coding tasks',
        relatedDocs: ['.aios-core/development/agents/dev.md'],
        suggestions: [
          'Provide clear acceptance criteria',
          'Reference existing code patterns'
        ],
        relatedCommands: ['qa run', 'story show']
      },
      {
        id: 'agent-pm',
        triggers: { agent: 'pm' },
        topic: 'Product Manager Agent (Morgan)',
        summary: 'Product planning and documentation',
        relatedDocs: ['.aios-core/development/agents/pm.md'],
        suggestions: [
          'Use *create-prd to create PRDs',
          'Use *research for market analysis'
        ],
        relatedCommands: ['story create']
      },

      // 目录上下文规则
      {
        id: 'dir-stories',
        triggers: { directory: /docs\/stories/ },
        topic: 'Story Development',
        summary: 'You are in the stories directory',
        relatedDocs: ['docs/guides/story-driven-development.md'],
        suggestions: [
          'Create new stories with "aios story create"',
          'Track progress with checkboxes in story files'
        ],
        relatedCommands: ['story list', 'story progress']
      },
      {
        id: 'dir-core',
        triggers: { directory: /\.aios-core\/core/ },
        topic: 'AIOS Core Development',
        summary: 'You are in the AIOS core directory',
        relatedDocs: ['docs/architecture/core-modules.md'],
        suggestions: [
          'Follow the constitution guidelines',
          'Run tests after changes'
        ],
        relatedCommands: ['doctor', 'qa run']
      }
    ];
  }

  /**
   * 获取上下文帮助
   * @param {ContextInfo} context - 上下文信息
   * @returns {Promise<HelpResult[]>}
   */
  async getHelp(context) {
    await this.initialize();

    const results = [];

    for (const [id, rule] of this.helpRules) {
      if (this._matchesContext(rule, context)) {
        results.push({
          topic: rule.topic,
          summary: rule.summary,
          relatedDocs: rule.relatedDocs || [],
          suggestions: rule.suggestions || [],
          relatedCommands: rule.relatedCommands || []
        });
      }
    }

    return results;
  }

  /**
   * 检查规则是否匹配上下文
   * @param {Object} rule - 帮助规则
   * @param {ContextInfo} context - 上下文信息
   * @returns {boolean}
   * @private
   */
  _matchesContext(rule, context) {
    const triggers = rule.triggers;

    if (!triggers) {
      return false;
    }

    // 命令匹配
    if (triggers.command && context.command) {
      if (triggers.command instanceof RegExp) {
        if (triggers.command.test(context.command)) {
          return true;
        }
      } else if (context.command.includes(triggers.command)) {
        return true;
      }
    }

    // 代理匹配
    if (triggers.agent && context.agent === triggers.agent) {
      return true;
    }

    // 错误匹配
    if (triggers.error && context.error) {
      if (triggers.error instanceof RegExp) {
        if (triggers.error.test(context.error)) {
          return true;
        }
      } else if (context.error.includes(triggers.error)) {
        return true;
      }
    }

    // 目录匹配
    if (triggers.directory && context.directory) {
      if (triggers.directory instanceof RegExp) {
        if (triggers.directory.test(context.directory)) {
          return true;
        }
      } else if (context.directory.includes(triggers.directory)) {
        return true;
      }
    }

    // Story 匹配
    if (triggers.story && context.story) {
      return true;
    }

    return false;
  }

  /**
   * 获取命令帮助
   * @param {string} command - 命令名称
   * @returns {Promise<HelpResult|null>}
   */
  async getCommandHelp(command) {
    const results = await this.getHelp({ command });
    return results.length > 0 ? results[0] : null;
  }

  /**
   * 获取错误帮助
   * @param {string} errorCode - 错误代码
   * @returns {Promise<HelpResult|null>}
   */
  async getErrorHelp(errorCode) {
    const results = await this.getHelp({ error: errorCode });
    return results.length > 0 ? results[0] : null;
  }

  /**
   * 获取代理帮助
   * @param {string} agentId - 代理 ID
   * @returns {Promise<HelpResult|null>}
   */
  async getAgentHelp(agentId) {
    const results = await this.getHelp({ agent: agentId });
    return results.length > 0 ? results[0] : null;
  }

  /**
   * 添加自定义帮助规则
   * @param {Object} rule - 帮助规则
   */
  addRule(rule) {
    this.helpRules.set(rule.id, rule);
  }

  /**
   * 获取所有规则
   * @returns {Object[]}
   */
  getAllRules() {
    return Array.from(this.helpRules.values());
  }
}

module.exports = {
  ContextHelper
};
