/**
 * TaskClassifier - 任务分类器
 *
 * 分析任务描述，提取任务类型和关键词
 *
 * @module core/agent-state/task-classifier
 */

/**
 * 任务类型映射
 */
const TASK_TYPE_PATTERNS = {
  implementation: [
    /implement|code|build|create|develop|add|write/i,
    /feature|functionality|capability/i
  ],
  bugfix: [
    /fix|bug|issue|error|problem|broken|crash/i,
    /resolve|repair|patch/i
  ],
  testing: [
    /test|testing|spec|verify|validate/i,
    /unit|integration|e2e|coverage/i
  ],
  review: [
    /review|check|audit|inspect|examine/i,
    /pr|pull request|code review/i
  ],
  architecture: [
    /architect|architecture|design|structure/i,
    /system|component|module|layer/i,
    /pattern|best practice/i
  ],
  documentation: [
    /document|doc|readme|guide|tutorial/i,
    /write up|specification|spec/i
  ],
  deployment: [
    /deploy|release|ship|publish/i,
    /ci|cd|pipeline|build/i
  ],
  database: [
    /database|db|sql|schema|migration/i,
    /table|query|index|orm/i
  ],
  design: [
    /design|ui|ux|interface|layout/i,
    /wireframe|prototype|mockup|figma/i
  ],
  research: [
    /research|analyze|investigate|study/i,
    /explore|discover|understand/i
  ],
  planning: [
    /plan|roadmap|strategy|prioritize/i,
    /epic|story|backlog/i
  ]
};

/**
 * 停用词列表
 */
const STOP_WORDS = new Set([
  'a', 'an', 'the', 'and', 'or', 'but', 'in', 'on', 'at', 'to', 'for',
  'of', 'with', 'by', 'from', 'as', 'is', 'was', 'are', 'were', 'been',
  'be', 'have', 'has', 'had', 'do', 'does', 'did', 'will', 'would',
  'could', 'should', 'may', 'might', 'must', 'shall', 'can', 'need',
  'i', 'you', 'he', 'she', 'it', 'we', 'they', 'this', 'that', 'these',
  'those', 'what', 'which', 'who', 'when', 'where', 'why', 'how',
  'all', 'each', 'every', 'both', 'few', 'more', 'most', 'other',
  'some', 'such', 'no', 'not', 'only', 'own', 'same', 'so', 'than',
  'too', 'very', 'just', 'also', 'now', 'here', 'there', 'then', 'once'
]);

/**
 * 任务分类结果
 * @typedef {Object} ClassificationResult
 * @property {string[]} types - 任务类型
 * @property {string[]} keywords - 关键词
 * @property {Object} scores - 类型得分
 * @property {string} primaryType - 主要类型
 */

/**
 * 任务分类器类
 */
class TaskClassifier {
  constructor() {
    this.typePatterns = TASK_TYPE_PATTERNS;
    this.stopWords = STOP_WORDS;
  }

  /**
   * 分类任务
   * @param {string} taskDescription - 任务描述
   * @returns {ClassificationResult}
   */
  classify(taskDescription) {
    if (!taskDescription || typeof taskDescription !== 'string') {
      return {
        types: [],
        keywords: [],
        scores: {},
        primaryType: null
      };
    }

    // 提取关键词
    const keywords = this._extractKeywords(taskDescription);

    // 计算类型得分
    const scores = this._calculateTypeScores(taskDescription, keywords);

    // 排序类型
    const types = Object.entries(scores)
      .filter(([, score]) => score > 0)
      .sort((a, b) => b[1] - a[1])
      .map(([type]) => type);

    // 主要类型
    const primaryType = types[0] || null;

    return {
      types,
      keywords,
      scores,
      primaryType
    };
  }

  /**
   * 提取关键词
   * @param {string} text - 文本
   * @returns {string[]}
   * @private
   */
  _extractKeywords(text) {
    // 转小写，分词
    const words = text.toLowerCase()
      .replace(/[^\w\s-]/g, ' ')
      .split(/\s+/)
      .filter(word => word.length > 1);

    // 过滤停用词
    const keywords = words.filter(word => !this.stopWords.has(word));

    // 去重
    return [...new Set(keywords)];
  }

  /**
   * 计算类型得分
   * @param {string} text - 原始文本
   * @param {string[]} keywords - 关键词
   * @returns {Object}
   * @private
   */
  _calculateTypeScores(text, keywords) {
    const scores = {};
    const textLower = text.toLowerCase();

    for (const [type, patterns] of Object.entries(this.typePatterns)) {
      let score = 0;

      for (const pattern of patterns) {
        const matches = textLower.match(pattern);
        if (matches) {
          score += matches.length * 10;
        }
      }

      // 关键词加分
      const typeKeywords = this._getTypeKeywords(type);
      for (const keyword of keywords) {
        if (typeKeywords.some(tk => keyword.includes(tk))) {
          score += 5;
        }
      }

      if (score > 0) {
        scores[type] = score;
      }
    }

    return scores;
  }

  /**
   * 获取类型相关关键词
   * @param {string} type - 任务类型
   * @returns {string[]}
   * @private
   */
  _getTypeKeywords(type) {
    const keywordMap = {
      implementation: ['implement', 'code', 'build', 'create', 'develop', 'feature'],
      bugfix: ['fix', 'bug', 'issue', 'error', 'problem', 'crash'],
      testing: ['test', 'spec', 'verify', 'validate', 'coverage'],
      review: ['review', 'check', 'audit', 'pr'],
      architecture: ['architect', 'design', 'structure', 'system'],
      documentation: ['document', 'doc', 'readme', 'guide'],
      deployment: ['deploy', 'release', 'pipeline', 'ci'],
      database: ['database', 'sql', 'schema', 'migration', 'query'],
      design: ['design', 'ui', 'ux', 'interface', 'wireframe'],
      research: ['research', 'analyze', 'investigate', 'study'],
      planning: ['plan', 'roadmap', 'epic', 'story', 'backlog']
    };

    return keywordMap[type] || [];
  }

  /**
   * 判断任务是否属于某个类型
   * @param {string} taskDescription - 任务描述
   * @param {string} type - 任务类型
   * @returns {boolean}
   */
  isType(taskDescription, type) {
    const result = this.classify(taskDescription);
    return result.types.includes(type);
  }

  /**
   * 获取任务的关键词摘要
   * @param {string} taskDescription - 任务描述
   * @param {number} limit - 限制数量
   * @returns {string[]}
   */
  getKeywordsSummary(taskDescription, limit = 5) {
    const result = this.classify(taskDescription);
    return result.keywords.slice(0, limit);
  }
}

module.exports = {
  TaskClassifier,
  TASK_TYPE_PATTERNS,
  STOP_WORDS
};
