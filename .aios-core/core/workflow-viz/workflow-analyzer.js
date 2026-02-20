/**
 * WorkflowAnalyzer - 工作流分析器
 *
 * 分析开发工作流，检测瓶颈和优化机会
 *
 * @module core/workflow-viz/workflow-analyzer
 */

const fs = require('fs');
const path = require('path');
const yaml = require('js-yaml');

/**
 * 工作流步骤
 * @typedef {Object} WorkflowStep
 * @property {string} id - 步骤 ID
 * @property {string} name - 步骤名称
 * @property {string} status - 状态 (pending, in_progress, completed, blocked)
 * @property {number} duration - 持续时间 (ms)
 * @property {string} assignee - 负责人
 * @property {string[]} dependencies - 依赖步骤
 */

/**
 * 瓶颈分析结果
 * @typedef {Object} BottleneckResult
 * @property {string} stepId - 步骤 ID
 * @property {string} type - 瓶颈类型
 * @property {number} severity - 严重程度 (1-10)
 * @property {string} description - 描述
 * @property {string[]} suggestions - 优化建议
 */

/**
 * 工作流统计
 * @typedef {Object} WorkflowStats
 * @property {number} totalSteps - 总步骤数
 * @property {number} completedSteps - 完成步骤数
 * @property {number} blockedSteps - 阻塞步骤数
 * @property {number} avgStepDuration - 平均步骤时长
 * @property {number} totalDuration - 总时长
 * @property {number} efficiency - 效率评分 (0-100)
 */

/**
 * 工作流分析器
 */
class WorkflowAnalyzer {
  /**
   * @param {string} projectRoot - 项目根目录
   * @param {Object} options - 选项
   */
  constructor(projectRoot, options = {}) {
    this.projectRoot = projectRoot;
    this.storiesDir = options.storiesDir || path.join(projectRoot, 'docs/stories');
    this.workflows = new Map();
    this.initialized = false;
  }

  /**
   * 初始化分析器
   * @returns {Promise<void>}
   */
  async initialize() {
    if (this.initialized) {
      return;
    }

    await this._loadWorkflows();
    this.initialized = true;
  }

  /**
   * 加载工作流数据
   * @private
   */
  async _loadWorkflows() {
    // 从 Stories 加载工作流信息
    if (!fs.existsSync(this.storiesDir)) {
      return;
    }

    const activeDir = path.join(this.storiesDir, 'active');
    if (fs.existsSync(activeDir)) {
      await this._scanStories(activeDir);
    }
  }

  /**
   * 扫描 Stories 目录
   * @param {string} dir - 目录路径
   * @private
   */
  async _scanStories(dir) {
    const entries = fs.readdirSync(dir, { withFileTypes: true });

    for (const entry of entries) {
      const fullPath = path.join(dir, entry.name);

      if (entry.isDirectory()) {
        if (entry.name.startsWith('STORY-')) {
          await this._loadStoryWorkflow(fullPath);
        } else {
          await this._scanStories(fullPath);
        }
      }
    }
  }

  /**
   * 加载 Story 工作流
   * @param {string} storyDir - Story 目录
   * @private
   */
  async _loadStoryWorkflow(storyDir) {
    const storyFile = path.join(storyDir, 'story.md');
    if (!fs.existsSync(storyFile)) {
      return;
    }

    try {
      const content = fs.readFileSync(storyFile, 'utf8');
      const storyId = path.basename(storyDir);

      // 解析 front matter
      let metadata = {};
      const fmMatch = content.match(/^---\n([\s\S]*?)\n---/);
      if (fmMatch) {
        try {
          metadata = yaml.load(fmMatch[1]) || {};
        } catch (e) {
          // 忽略解析错误
        }
      }

      // 解析任务列表
      const tasks = this._parseTasks(content);

      // 创建工作流
      const workflow = {
        id: storyId,
        title: metadata.title || storyId,
        status: metadata.status || 'draft',
        assignee: metadata.assignee || null,
        epic: metadata.epic || null,
        tasks,
        createdAt: metadata.createdAt || null,
        updatedAt: metadata.updatedAt || null,
        completedAt: metadata.completedAt || null
      };

      this.workflows.set(storyId, workflow);
    } catch (error) {
      // 忽略无法读取的文件
    }
  }

  /**
   * 解析任务列表
   * @param {string} content - Markdown 内容
   * @returns {WorkflowStep[]}
   * @private
   */
  _parseTasks(content) {
    const tasks = [];
    const lines = content.split('\n');
    let currentSection = 'General';

    for (const line of lines) {
      // 检测标题 (章节)
      const headerMatch = line.match(/^(#{1,6})\s+(.+)$/);
      if (headerMatch) {
        currentSection = headerMatch[2];
        continue;
      }

      // 解析任务
      const taskMatch = line.match(/^(\s*)- \[([ x])\]\s*(.+)$/i);
      if (taskMatch) {
        tasks.push({
          id: `task-${tasks.length}`,
          name: taskMatch[3].trim(),
          section: currentSection,
          status: taskMatch[2].toLowerCase() === 'x' ? 'completed' : 'pending',
          indent: taskMatch[1].length
        });
      }
    }

    return tasks;
  }

  /**
   * 分析工作流
   * @param {string} workflowId - 工作流 ID (可选，不提供则分析全部)
   * @returns {Promise<Object>}
   */
  async analyze(workflowId) {
    await this.initialize();

    if (workflowId) {
      const workflow = this.workflows.get(workflowId);
      if (!workflow) {
        return null;
      }
      return this._analyzeWorkflow(workflow);
    }

    // 分析所有工作流
    const results = [];
    for (const [id, workflow] of this.workflows) {
      results.push({
        id,
        ...this._analyzeWorkflow(workflow)
      });
    }

    return results;
  }

  /**
   * 分析单个工作流
   * @param {Object} workflow - 工作流数据
   * @returns {Object}
   * @private
   */
  _analyzeWorkflow(workflow) {
    const stats = this._calculateStats(workflow);
    const bottlenecks = this._detectBottlenecks(workflow, stats);
    const criticalPath = this._calculateCriticalPath(workflow);

    return {
      title: workflow.title,
      status: workflow.status,
      stats,
      bottlenecks,
      criticalPath,
      tasks: workflow.tasks
    };
  }

  /**
   * 计算统计信息
   * @param {Object} workflow - 工作流数据
   * @returns {WorkflowStats}
   * @private
   */
  _calculateStats(workflow) {
    const tasks = workflow.tasks || [];
    const totalSteps = tasks.length;
    const completedSteps = tasks.filter(t => t.status === 'completed').length;
    const blockedSteps = tasks.filter(t => t.status === 'blocked').length;
    const pendingSteps = tasks.filter(t => t.status === 'pending').length;

    // 计算效率
    let efficiency = 0;
    if (totalSteps > 0) {
      efficiency = Math.round((completedSteps / totalSteps) * 100);
    }

    return {
      totalSteps,
      completedSteps,
      blockedSteps,
      pendingSteps,
      efficiency,
      status: workflow.status
    };
  }

  /**
   * 检测瓶颈
   * @param {Object} workflow - 工作流数据
   * @param {WorkflowStats} stats - 统计信息
   * @returns {BottleneckResult[]}
   * @private
   */
  _detectBottlenecks(workflow, stats) {
    const bottlenecks = [];

    // 检测低完成率
    if (stats.efficiency < 30 && stats.totalSteps > 5) {
      bottlenecks.push({
        type: 'low_progress',
        severity: 8,
        description: `Low completion rate: ${stats.efficiency}%`,
        suggestions: [
          'Break down tasks into smaller pieces',
          'Review task complexity',
          'Consider reassigning blocked tasks'
        ]
      });
    }

    // 检测长时间无更新
    if (workflow.updatedAt) {
      const daysSinceUpdate = (Date.now() - new Date(workflow.updatedAt).getTime()) / 86400000;
      if (daysSinceUpdate > 7 && workflow.status !== 'done') {
        bottlenecks.push({
          type: 'stale_workflow',
          severity: 6,
          description: `No updates in ${Math.floor(daysSinceUpdate)} days`,
          suggestions: [
            'Review workflow status',
            'Update task progress',
            'Check for blockers'
          ]
        });
      }
    }

    // 检测阻塞状态
    if (workflow.status === 'blocked') {
      bottlenecks.push({
        type: 'blocked_status',
        severity: 9,
        description: 'Workflow is blocked',
        suggestions: [
          'Identify and resolve blockers',
          'Escalate if needed',
          'Consider alternative approaches'
        ]
      });
    }

    // 检测任务集中度
    const pendingTasks = workflow.tasks.filter(t => t.status === 'pending');
    if (pendingTasks.length > 10) {
      bottlenecks.push({
        type: 'task_overload',
        severity: 5,
        description: `${pendingTasks.length} pending tasks`,
        suggestions: [
          'Prioritize tasks',
          'Consider parallel execution',
          'Delegate where possible'
        ]
      });
    }

    return bottlenecks;
  }

  /**
   * 计算关键路径
   * @param {Object} workflow - 工作流数据
   * @returns {string[]}
   * @private
   */
  _calculateCriticalPath(workflow) {
    // 简化实现：返回未完成的任务
    return workflow.tasks
      .filter(t => t.status !== 'completed')
      .map(t => t.name);
  }

  /**
   * 获取工作流列表
   * @param {Object} filter - 过滤条件
   * @returns {Promise<Object[]>}
   */
  async listWorkflows(filter = {}) {
    await this.initialize();

    let workflows = Array.from(this.workflows.values());

    if (filter.status) {
      workflows = workflows.filter(w => w.status === filter.status);
    }

    if (filter.epic) {
      workflows = workflows.filter(w => w.epic === filter.epic);
    }

    if (filter.assignee) {
      workflows = workflows.filter(w => w.assignee === filter.assignee);
    }

    return workflows.map(w => ({
      id: w.id,
      title: w.title,
      status: w.status,
      taskCount: w.tasks.length,
      completedCount: w.tasks.filter(t => t.status === 'completed').length
    }));
  }

  /**
   * 获取整体统计
   * @returns {Promise<Object>}
   */
  async getOverallStats() {
    await this.initialize();

    const totalWorkflows = this.workflows.size;
    let totalTasks = 0;
    let completedTasks = 0;
    let blockedWorkflows = 0;
    let inProgressWorkflows = 0;

    for (const workflow of this.workflows.values()) {
      totalTasks += workflow.tasks.length;
      completedTasks += workflow.tasks.filter(t => t.status === 'completed').length;

      if (workflow.status === 'blocked') {
        blockedWorkflows++;
      }
      if (workflow.status === 'in_progress') {
        inProgressWorkflows++;
      }
    }

    return {
      totalWorkflows,
      totalTasks,
      completedTasks,
      blockedWorkflows,
      inProgressWorkflows,
      overallEfficiency: totalTasks > 0 ? Math.round((completedTasks / totalTasks) * 100) : 0
    };
  }

  /**
   * 生成可视化数据
   * @param {string} workflowId - 工作流 ID
   * @param {string} format - 格式 (mermaid, json, ascii)
   * @returns {Promise<string>}
   */
  async generateVisualization(workflowId, format = 'mermaid') {
    await this.initialize();

    const workflow = this.workflows.get(workflowId);
    if (!workflow) {
      return null;
    }

    switch (format) {
      case 'mermaid':
        return this._generateMermaid(workflow);
      case 'json':
        return JSON.stringify(workflow, null, 2);
      case 'ascii':
        return this._generateAscii(workflow);
      default:
        return this._generateMermaid(workflow);
    }
  }

  /**
   * 生成 Mermaid 图表
   * @param {Object} workflow - 工作流数据
   * @returns {string}
   * @private
   */
  _generateMermaid(workflow) {
    const lines = ['graph TD'];

    // 添加节点
    for (const task of workflow.tasks) {
      const status = task.status === 'completed' ? ':::done' :
        task.status === 'blocked' ? ':::blocked' : '';
      const label = task.name.replace(/"/g, "'");
      lines.push(`    ${task.id}["${label}"]${status}`);
    }

    // 添加样式类
    lines.push('');
    lines.push('    classDef done fill:#90EE90,stroke:#2E8B57');
    lines.push('    classDef blocked fill:#FFB6C1,stroke:#DC143C');
    lines.push('    classDef pending fill:#FFFACD,stroke:#DAA520');

    return lines.join('\n');
  }

  /**
   * 生成 ASCII 图表
   * @param {Object} workflow - 工作流数据
   * @returns {string}
   * @private
   */
  _generateAscii(workflow) {
    const lines = [];

    lines.push(`Workflow: ${workflow.title}`);
    lines.push('='.repeat(40));
    lines.push('');

    for (const task of workflow.tasks) {
      const icon = task.status === 'completed' ? '✅' :
        task.status === 'blocked' ? '🚫' : '⬜';
      const indent = '  '.repeat(task.indent);
      lines.push(`${indent}${icon} ${task.name}`);
    }

    return lines.join('\n');
  }
}

module.exports = {
  WorkflowAnalyzer
};
