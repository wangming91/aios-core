/**
 * ProgressAnalyzer - Story 进度分析器
 *
 * 解析 Story 文件中的 checkbox 进度
 *
 * @module core/story-lifecycle/progress-analyzer
 */

const fs = require('fs');
const path = require('path');

/**
 * 进度分析结果
 * @typedef {Object} ProgressResult
 * @property {number} totalTasks - 总任务数
 * @property {number} completedTasks - 已完成任务数
 * @property {number} percentage - 完成百分比
 * @property {Object[]} sections - 分段进度
 * @property {string[]} completedItems - 已完成项目
 * @property {string[]} pendingItems - 待完成项目
 */

/**
 * 进度分析器类
 */
class ProgressAnalyzer {
  constructor() {
    // Checkbox 模式
    this.checkedPattern = /- \[x\]/gi;
    this.uncheckedPattern = /- \[ \]/g;
    this.taskPattern = /^(\s*)- \[([ x])\]\s*(.+)$/gm;
  }

  /**
   * 分析 Story 文件的进度
   * @param {string} content - Markdown 内容
   * @returns {ProgressResult}
   */
  analyze(content) {
    if (!content || typeof content !== 'string') {
      return this._emptyResult();
    }

    // 查找所有 checkbox
    const checked = this._findAllMatches(content, this.checkedPattern);
    const unchecked = this._findAllMatches(content, this.uncheckedPattern);

    const totalTasks = checked.length + unchecked.length;
    const completedTasks = checked.length;
    const percentage = totalTasks > 0 ? Math.round((completedTasks / totalTasks) * 100) : 0;

    // 解析任务详情
    const { completedItems, pendingItems, sections } = this._parseTasks(content);

    return {
      totalTasks,
      completedTasks,
      percentage,
      sections,
      completedItems,
      pendingItems
    };
  }

  /**
   * 分析文件
   * @param {string} filePath - 文件路径
   * @returns {ProgressResult}
   */
  analyzeFile(filePath) {
    if (!fs.existsSync(filePath)) {
      return this._emptyResult();
    }

    const content = fs.readFileSync(filePath, 'utf8');
    return this.analyze(content);
  }

  /**
   * 查找所有匹配
   * @param {string} content - 内容
   * @param {RegExp} pattern - 模式
   * @returns {string[]}
   * @private
   */
  _findAllMatches(content, pattern) {
    const matches = [];
    let match;
    const regex = new RegExp(pattern.source, pattern.flags);

    while ((match = regex.exec(content)) !== null) {
      matches.push(match[0]);
    }

    return matches;
  }

  /**
   * 解析任务详情
   * @param {string} content - Markdown 内容
   * @returns {Object}
   * @private
   */
  _parseTasks(content) {
    const completedItems = [];
    const pendingItems = [];
    const sections = [];
    let currentSection = null;

    const lines = content.split('\n');
    let sectionIndex = 0;

    for (const line of lines) {
      // 检测标题 (章节)
      const headerMatch = line.match(/^(#{1,6})\s+(.+)$/);
      if (headerMatch) {
        if (currentSection && currentSection.tasks.length > 0) {
          sections.push(currentSection);
        }
        currentSection = {
          title: headerMatch[2],
          level: headerMatch[1].length,
          total: 0,
          completed: 0,
          tasks: []
        };
        sectionIndex++;
        continue;
      }

      // 解析任务
      const taskMatch = line.match(/^(\s*)- \[([ x])\]\s*(.+)$/i);
      if (taskMatch) {
        const isCompleted = taskMatch[2].toLowerCase() === 'x';
        const taskText = taskMatch[3].trim();

        const task = {
          text: taskText,
          completed: isCompleted,
          indent: taskMatch[1].length
        };

        if (isCompleted) {
          completedItems.push(taskText);
        } else {
          pendingItems.push(taskText);
        }

        if (currentSection) {
          currentSection.total++;
          if (isCompleted) {
            currentSection.completed++;
          }
          currentSection.tasks.push(task);
        }
      }
    }

    // 添加最后一个章节
    if (currentSection && currentSection.tasks.length > 0) {
      sections.push(currentSection);
    }

    return { completedItems, pendingItems, sections };
  }

  /**
   * 返回空结果
   * @returns {ProgressResult}
   * @private
   */
  _emptyResult() {
    return {
      totalTasks: 0,
      completedTasks: 0,
      percentage: 0,
      sections: [],
      completedItems: [],
      pendingItems: []
    };
  }

  /**
   * 更新任务状态
   * @param {string} content - Markdown 内容
   * @param {number} taskIndex - 任务索引
   * @param {boolean} completed - 是否完成
   * @returns {string}
   */
  updateTaskStatus(content, taskIndex, completed) {
    const lines = content.split('\n');
    let currentIndex = 0;
    // Create new regex to avoid lastIndex issues with global flag
    const taskRegex = /^(\s*)- \[([ x])\]\s*(.+)$/i;

    for (let i = 0; i < lines.length; i++) {
      const line = lines[i];
      if (taskRegex.test(line)) {
        if (currentIndex === taskIndex) {
          const checked = completed ? 'x' : ' ';
          const match = line.match(/^(\s*)- \[[ x]\](.*)$/i);
          if (match) {
            lines[i] = `${match[1]}- [${checked}]${match[2]}`;
          }
          break;
        }
        currentIndex++;
      }
    }

    return lines.join('\n');
  }

  /**
   * 批量更新任务状态
   * @param {string} content - Markdown 内容
   * @param {Object} updates - 更新映射 { index: completed }
   * @returns {string}
   */
  batchUpdateTaskStatus(content, updates) {
    const lines = content.split('\n');
    let currentIndex = 0;
    // Create new regex to avoid lastIndex issues with global flag
    const taskRegex = /^(\s*)- \[([ x])\]\s*(.+)$/i;

    for (let i = 0; i < lines.length; i++) {
      const line = lines[i];
      if (taskRegex.test(line)) {
        if (updates.hasOwnProperty(currentIndex)) {
          const completed = updates[currentIndex];
          const checked = completed ? 'x' : ' ';
          const match = line.match(/^(\s*)- \[[ x]\](.*)$/i);
          if (match) {
            lines[i] = `${match[1]}- [${checked}]${match[2]}`;
          }
        }
        currentIndex++;
      }
    }

    return lines.join('\n');
  }

  /**
   * 生成进度报告
   * @param {ProgressResult} progress - 进度结果
   * @returns {string}
   */
  generateReport(progress) {
    const lines = [];

    lines.push(`## 📊 Progress Report`);
    lines.push('');
    lines.push(`**Overall:** ${progress.percentage}% (${progress.completedTasks}/${progress.totalTasks})`);
    lines.push('');

    // 进度条
    const barLength = 20;
    const filled = Math.round((progress.percentage / 100) * barLength);
    const bar = '█'.repeat(filled) + '░'.repeat(barLength - filled);
    lines.push(`\`${bar}\` ${progress.percentage}%`);
    lines.push('');

    // 分段进度
    if (progress.sections.length > 0) {
      lines.push(`### Sections`);
      lines.push('');

      for (const section of progress.sections) {
        const sectionPercent = section.total > 0 ?
          Math.round((section.completed / section.total) * 100) : 0;
        lines.push(`- **${section.title}:** ${sectionPercent}% (${section.completed}/${section.total})`);
      }
      lines.push('');
    }

    // 待完成项目
    if (progress.pendingItems.length > 0) {
      lines.push(`### ⏳ Pending (${progress.pendingItems.length})`);
      lines.push('');

      for (const item of progress.pendingItems.slice(0, 10)) {
        lines.push(`- [ ] ${item}`);
      }

      if (progress.pendingItems.length > 10) {
        lines.push(`- ... and ${progress.pendingItems.length - 10} more`);
      }
      lines.push('');
    }

    // 已完成项目
    if (progress.completedItems.length > 0) {
      lines.push(`### ✅ Completed (${progress.completedItems.length})`);
      lines.push('');

      for (const item of progress.completedItems.slice(0, 5)) {
        lines.push(`- [x] ${item}`);
      }

      if (progress.completedItems.length > 5) {
        lines.push(`- ... and ${progress.completedItems.length - 5} more`);
      }
    }

    return lines.join('\n');
  }

  /**
   * 比较两个进度
   * @param {ProgressResult} before - 之前的进度
   * @param {ProgressResult} after - 之后的进度
   * @returns {Object}
   */
  compare(before, after) {
    return {
      tasksAdded: after.totalTasks - before.totalTasks,
      tasksCompleted: after.completedTasks - before.completedTasks,
      percentageChange: after.percentage - before.percentage,
      newCompleted: after.completedItems.filter(
        item => !before.completedItems.includes(item)
      ),
      newlyPending: before.completedItems.filter(
        item => !after.completedItems.includes(item) && after.pendingItems.includes(item)
      )
    };
  }
}

module.exports = {
  ProgressAnalyzer
};
