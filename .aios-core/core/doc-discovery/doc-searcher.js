/**
 * DocSearcher - 文档搜索引擎
 *
 * 提供 AIOS 文档的全文搜索功能
 *
 * @module core/doc-discovery/doc-searcher
 */

const fs = require('fs');
const path = require('path');
const yaml = require('js-yaml');

/**
 * 搜索结果
 * @typedef {Object} SearchResult
 * @property {string} title - 文档标题
 * @property {string} path - 文档路径
 * @property {string} snippet - 内容片段
 * @property {number} score - 相关度分数
 * @property {string} category - 文档类别
 * @property {string[]} highlights - 高亮关键词
 */

/**
 * 文档索引条目
 * @typedef {Object} DocIndexEntry
 * @property {string} id - 文档 ID
 * @property {string} title - 标题
 * @property {string} path - 路径
 * @property {string} content - 内容
 * @property {string} category - 类别
 * @property {string[]} keywords - 关键词
 * @property {string[]} tags - 标签
 */

/**
 * 文档搜索引擎类
 */
class DocSearcher {
  /**
   * @param {string} projectRoot - 项目根目录
   * @param {Object} options - 选项
   */
  constructor(projectRoot, options = {}) {
    this.projectRoot = projectRoot;
    this.docsDir = options.docsDir || path.join(projectRoot, 'docs');
    this.indexFile = options.indexFile || path.join(projectRoot, '.aios-core/data/doc-index.json');
    this.index = new Map();
    this.categories = new Map();
    this.initialized = false;

    // 预定义的文档类别
    this.categoryConfigs = {
      architecture: {
        patterns: ['**/architecture/**/*.md'],
        priority: 3,
        icon: '🏛️'
      },
      guides: {
        patterns: ['**/guides/**/*.md', '**/*-guide*.md'],
        priority: 2,
        icon: '📖'
      },
      api: {
        patterns: ['**/api/**/*.md'],
        priority: 2,
        icon: '🔌'
      },
      cli: {
        patterns: ['**/cli/**/*.md'],
        priority: 2,
        icon: '💻'
      },
      agents: {
        patterns: ['**/agents/**/*.md', '.aios-core/development/agents/*.md'],
        priority: 2,
        icon: '🤖'
      },
      stories: {
        patterns: ['**/stories/**/*.md'],
        priority: 1,
        icon: '📋'
      },
      templates: {
        patterns: ['.aios-core/development/templates/*.md'],
        priority: 1,
        icon: '📄'
      },
      core: {
        patterns: ['.aios-core/**/*.md'],
        priority: 1,
        icon: '⚙️'
      }
    };
  }

  /**
   * 初始化搜索引擎
   * @returns {Promise<void>}
   */
  async initialize() {
    if (this.initialized) {
      return;
    }

    // 尝试加载现有索引
    if (fs.existsSync(this.indexFile)) {
      try {
        const data = JSON.parse(fs.readFileSync(this.indexFile, 'utf8'));
        this._loadIndex(data);
        this.initialized = true;
        return;
      } catch (error) {
        // 索引损坏，重新构建
      }
    }

    // 构建新索引
    await this.buildIndex();
    this.initialized = true;
  }

  /**
   * 构建文档索引
   * @returns {Promise<number>} 索引文档数量
   */
  async buildIndex() {
    this.index.clear();
    this.categories.clear();

    let count = 0;

    // 扫描文档目录
    if (fs.existsSync(this.docsDir)) {
      count += await this._scanDirectory(this.docsDir, 'docs');
    }

    // 扫描 .aios-core 目录
    const aiosCoreDir = path.join(this.projectRoot, '.aios-core');
    if (fs.existsSync(aiosCoreDir)) {
      count += await this._scanDirectory(aiosCoreDir, 'aios-core');
    }

    // 保存索引
    this._saveIndex();

    return count;
  }

  /**
   * 扫描目录
   * @param {string} dir - 目录路径
   * @param {string} base - 基础路径名
   * @returns {Promise<number>}
   * @private
   */
  async _scanDirectory(dir, base) {
    let count = 0;

    const scan = (currentDir) => {
      const entries = fs.readdirSync(currentDir, { withFileTypes: true });

      for (const entry of entries) {
        const fullPath = path.join(currentDir, entry.name);

        if (entry.isDirectory()) {
          // 跳过 node_modules 和隐藏目录
          if (!entry.name.startsWith('.') && entry.name !== 'node_modules') {
            scan(fullPath);
          }
        } else if (entry.isFile() && entry.name.endsWith('.md')) {
          this._indexDocument(fullPath, base);
          count++;
        }
      }
    };

    scan(dir);
    return count;
  }

  /**
   * 索引单个文档
   * @param {string} filePath - 文件路径
   * @param {string} base - 基础路径名
   * @private
   */
  _indexDocument(filePath, base) {
    try {
      const content = fs.readFileSync(filePath, 'utf8');
      const relativePath = path.relative(this.projectRoot, filePath);

      // 提取标题
      const titleMatch = content.match(/^#\s+(.+)$/m);
      const title = titleMatch ? titleMatch[1] : path.basename(filePath, '.md');

      // 提取 front matter
      let metadata = {};
      const fmMatch = content.match(/^---\n([\s\S]*?)\n---/);
      if (fmMatch) {
        try {
          metadata = yaml.load(fmMatch[1]) || {};
        } catch (e) {
          // 忽略解析错误
        }
      }

      // 确定类别
      const category = this._determineCategory(relativePath);

      // 提取关键词
      const keywords = this._extractKeywords(content);

      // 提取标签
      const tags = metadata.tags || [];

      // 创建索引条目
      const entry = {
        id: this._generateId(relativePath),
        title,
        path: relativePath,
        content: this._cleanContent(content),
        category,
        keywords,
        tags,
        metadata
      };

      this.index.set(entry.id, entry);

      // 更新类别索引
      if (!this.categories.has(category)) {
        this.categories.set(category, []);
      }
      this.categories.get(category).push(entry.id);
    } catch (error) {
      // 忽略无法读取的文件
    }
  }

  /**
   * 确定文档类别
   * @param {string} filePath - 文件路径
   * @returns {string}
   * @private
   */
  _determineCategory(filePath) {
    const normalized = filePath.replace(/\\/g, '/');

    for (const [category, config] of Object.entries(this.categoryConfigs)) {
      for (const pattern of config.patterns) {
        // Convert glob pattern to regex
        // Handle ** patterns (match zero or more directories)
        let regexStr = pattern
          .replace(/\./g, '\\.')
          .replace(/\*\*\//g, '(.*\\/)?')  // **/ matches zero or more directories
          .replace(/\/\*\*/g, '(\\/.*)?')  // /** matches zero or more subdirs
          .replace(/\*/g, '[^/]*');        // * matches anything except /

        // Ensure pattern can match at any position
        if (!regexStr.startsWith('^')) {
          regexStr = '.*' + regexStr;
        }

        const regex = new RegExp(regexStr + '$');
        if (regex.test(normalized)) {
          return category;
        }
      }
    }

    return 'general';
  }

  /**
   * 提取关键词
   * @param {string} content - 文档内容
   * @returns {string[]}
   * @private
   */
  _extractKeywords(content) {
    // 移除代码块
    let cleanContent = content.replace(/```[\s\S]*?```/g, '');

    // 移除链接语法
    cleanContent = cleanContent.replace(/\[([^\]]+)\]\([^)]+\)/g, '$1');

    // 提取词
    const words = cleanContent.toLowerCase()
      .replace(/[^a-z0-9\u4e00-\u9fa5\s-]/g, ' ')
      .split(/\s+/)
      .filter(w => w.length > 2);

    // 统计词频
    const freq = new Map();
    for (const word of words) {
      freq.set(word, (freq.get(word) || 0) + 1);
    }

    // 返回高频词
    return Array.from(freq.entries())
      .sort((a, b) => b[1] - a[1])
      .slice(0, 20)
      .map(([word]) => word);
  }

  /**
   * 清理内容
   * @param {string} content - 原始内容
   * @returns {string}
   * @private
   */
  _cleanContent(content) {
    // 移除 front matter
    let cleaned = content.replace(/^---\n[\s\S]*?\n---\n?/, '');

    // 移除代码块
    cleaned = cleaned.replace(/```[\s\S]*?```/g, '');

    // 移除多余空格
    cleaned = cleaned.replace(/\n{3,}/g, '\n\n').trim();

    // 限制长度
    if (cleaned.length > 10000) {
      cleaned = cleaned.substring(0, 10000) + '...';
    }

    return cleaned;
  }

  /**
   * 生成文档 ID
   * @param {string} filePath - 文件路径
   * @returns {string}
   * @private
   */
  _generateId(filePath) {
    return filePath
      .replace(/[\/\\]/g, '-')
      .replace(/\.md$/, '')
      .toLowerCase();
  }

  /**
   * 保存索引
   * @private
   */
  _saveIndex() {
    const data = {
      version: 1,
      timestamp: new Date().toISOString(),
      entries: Array.from(this.index.values()),
      categories: Object.fromEntries(this.categories)
    };

    const dir = path.dirname(this.indexFile);
    if (!fs.existsSync(dir)) {
      fs.mkdirSync(dir, { recursive: true });
    }

    fs.writeFileSync(this.indexFile, JSON.stringify(data, null, 2), 'utf8');
  }

  /**
   * 加载索引
   * @param {Object} data - 索引数据
   * @private
   */
  _loadIndex(data) {
    for (const entry of data.entries || []) {
      this.index.set(entry.id, entry);
    }

    for (const [category, ids] of Object.entries(data.categories || {})) {
      this.categories.set(category, ids);
    }
  }

  /**
   * 搜索文档
   * @param {string} query - 搜索查询
   * @param {Object} options - 搜索选项
   * @returns {Promise<SearchResult[]>}
   */
  async search(query, options = {}) {
    await this.initialize();

    const results = [];
    const queryLower = query.toLowerCase();
    const queryTerms = queryLower.split(/\s+/).filter(t => t.length > 1);

    // 类别过滤
    const categoryFilter = options.category || null;

    for (const [id, entry] of this.index) {
      // 类别过滤
      if (categoryFilter && entry.category !== categoryFilter) {
        continue;
      }

      let score = 0;
      const highlights = [];

      // 标题匹配 (最高权重)
      if (entry.title.toLowerCase().includes(queryLower)) {
        score += 100;
        highlights.push(entry.title);
      }

      // 关键词匹配
      for (const term of queryTerms) {
        if (entry.keywords.some(k => k.includes(term))) {
          score += 30;
        }
      }

      // 标签匹配
      for (const tag of entry.tags) {
        if (tag.toLowerCase().includes(queryLower)) {
          score += 40;
        }
      }

      // 内容匹配
      if (entry.content.toLowerCase().includes(queryLower)) {
        score += 10;
      }

      // 术语匹配
      for (const term of queryTerms) {
        if (entry.title.toLowerCase().includes(term)) {
          score += 20;
        }
        if (entry.content.toLowerCase().includes(term)) {
          score += 5;
        }
      }

      if (score > 0) {
        // 类别优先级加成
        const categoryConfig = this.categoryConfigs[entry.category];
        if (categoryConfig) {
          score += categoryConfig.priority * 5;
        }

        results.push({
          title: entry.title,
          path: entry.path,
          snippet: this._extractSnippet(entry.content, queryTerms),
          score,
          category: entry.category,
          highlights
        });
      }
    }

    // 按分数排序
    results.sort((a, b) => b.score - a.score);

    // 限制结果数量
    const limit = options.limit || 10;
    return results.slice(0, limit);
  }

  /**
   * 提取内容片段
   * @param {string} content - 内容
   * @param {string[]} terms - 搜索术语
   * @returns {string}
   * @private
   */
  _extractSnippet(content, terms) {
    const contentLower = content.toLowerCase();

    // 找到第一个匹配位置
    let matchPos = -1;
    for (const term of terms) {
      const pos = contentLower.indexOf(term);
      if (pos !== -1 && (matchPos === -1 || pos < matchPos)) {
        matchPos = pos;
      }
    }

    if (matchPos === -1) {
      // 没有匹配，返回开头
      return content.substring(0, 200) + (content.length > 200 ? '...' : '');
    }

    // 提取匹配位置前后的内容
    const start = Math.max(0, matchPos - 50);
    const end = Math.min(content.length, matchPos + 150);

    let snippet = content.substring(start, end);

    if (start > 0) {
      snippet = '...' + snippet;
    }
    if (end < content.length) {
      snippet = snippet + '...';
    }

    return snippet;
  }

  /**
   * 获取文档
   * @param {string} docId - 文档 ID
   * @returns {DocIndexEntry|null}
   */
  getDocument(docId) {
    return this.index.get(docId) || null;
  }

  /**
   * 按类别列出文档
   * @param {string} category - 类别
   * @returns {DocIndexEntry[]}
   */
  listByCategory(category) {
    const ids = this.categories.get(category) || [];
    return ids.map(id => this.index.get(id)).filter(Boolean);
  }

  /**
   * 获取所有类别
   * @returns {string[]}
   */
  getCategories() {
    return Array.from(this.categories.keys());
  }

  /**
   * 获取统计信息
   * @returns {Object}
   */
  getStats() {
    return {
      totalDocuments: this.index.size,
      categories: Object.fromEntries(
        Array.from(this.categories.entries()).map(([k, v]) => [k, v.length])
      )
    };
  }
}

module.exports = {
  DocSearcher
};
