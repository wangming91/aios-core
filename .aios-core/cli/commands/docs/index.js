/**
 * docs 命令组 - 文档搜索和帮助
 *
 * @module cli/commands/docs
 */

const { Command } = require('commander');
const chalk = require('chalk');
const path = require('path');
const { DocSearcher } = require('../../../core/doc-discovery/doc-searcher');
const { ContextHelper } = require('../../../core/doc-discovery/context-helper');

/**
 * 获取类别图标
 * @param {string} category - 类别
 * @returns {string}
 */
function getCategoryIcon(category) {
  const icons = {
    architecture: '🏛️',
    guides: '📖',
    api: '🔌',
    cli: '💻',
    agents: '🤖',
    stories: '📋',
    templates: '📄',
    core: '⚙️',
    general: '📄'
  };
  return icons[category] || '📄';
}

/**
 * 搜索文档
 * @param {string} query - 搜索查询
 * @param {Object} options - 选项
 */
async function searchDocs(query, options) {
  if (!query) {
    console.log(chalk.red('  Error: Search query is required'));
    console.log(chalk.gray('  Usage: aios docs search <query>'));
    return;
  }

  const projectRoot = process.cwd();
  const searcher = new DocSearcher(projectRoot);

  console.log();
  console.log(chalk.bold(`  🔍 Searching for "${query}"...`));
  console.log();

  try {
    // 初始化（可能需要构建索引）
    const buildStart = Date.now();
    await searcher.initialize();
    const initTime = Date.now() - buildStart;

    // 执行搜索
    const searchOptions = {
      limit: parseInt(options.limit) || 10,
      category: options.category || null
    };

    const results = await searcher.search(query, searchOptions);

    if (results.length === 0) {
      console.log(chalk.yellow('  No documents found matching your query.'));
      console.log();
      console.log(chalk.gray('  Suggestions:'));
      console.log(chalk.gray('    • Try different keywords'));
      console.log(chalk.gray('    • Use broader search terms'));
      console.log(chalk.gray('    • Check spelling'));
      console.log();
      return;
    }

    console.log(chalk.bold(`  Found ${results.length} result(s)`) + chalk.gray(` (${initTime}ms)`));
    console.log();

    for (let i = 0; i < results.length; i++) {
      const result = results[i];
      const icon = getCategoryIcon(result.category);

      console.log(`  ${icon} ${chalk.cyan(result.title)} ${chalk.gray(`(${result.score} pts)`)}`);
      console.log(chalk.gray(`     ${result.path}`));

      // 显示片段
      if (options.verbose && result.snippet) {
        console.log();
        console.log(chalk.gray('     ' + result.snippet.split('\n').join('\n     ')));
      }

      console.log();
    }

    console.log(chalk.gray('  Use --verbose to see content snippets'));
    console.log(chalk.gray('  Use --category <name> to filter by category'));
    console.log();

    if (options.json) {
      console.log(JSON.stringify(results, null, 2));
    }
  } catch (error) {
    console.log(chalk.red(`  Error: ${error.message}`));
    console.log();
  }
}

/**
 * 列出文档
 * @param {Object} options - 选项
 */
async function listDocs(options) {
  const projectRoot = process.cwd();
  const searcher = new DocSearcher(projectRoot);

  try {
    await searcher.initialize();

    const category = options.category || null;

    if (category) {
      // 列出特定类别的文档
      const docs = searcher.listByCategory(category);

      console.log();
      console.log(chalk.bold(`  📂 ${category} Documents`));
      console.log();

      if (docs.length === 0) {
        console.log(chalk.gray('  No documents in this category'));
        console.log();
        return;
      }

      const icon = getCategoryIcon(category);
      for (const doc of docs) {
        console.log(`  ${icon} ${chalk.cyan(doc.title)}`);
        console.log(chalk.gray(`     ${doc.path}`));
      }

      console.log();
      console.log(chalk.gray(`  ${docs.length} documents`));
      console.log();
    } else {
      // 显示所有类别
      const stats = searcher.getStats();
      const categories = searcher.getCategories();

      console.log();
      console.log(chalk.bold('  📚 Document Categories'));
      console.log();

      for (const cat of categories) {
        const count = stats.categories[cat] || 0;
        const icon = getCategoryIcon(cat);
        console.log(`  ${icon} ${chalk.cyan(cat.padEnd(15))} ${count} documents`);
      }

      console.log();
      console.log(chalk.gray(`  ${stats.totalDocuments} total documents`));
      console.log(chalk.gray('  Use --category <name> to list documents in a category'));
      console.log();
    }

    if (options.json) {
      console.log(JSON.stringify(stats, null, 2));
    }
  } catch (error) {
    console.log(chalk.red(`  Error: ${error.message}`));
    console.log();
  }
}

/**
 * 重建索引
 * @param {Object} options - 选项
 */
async function rebuildIndex(options) {
  const projectRoot = process.cwd();
  const searcher = new DocSearcher(projectRoot);

  console.log();
  console.log(chalk.bold('  🔄 Rebuilding document index...'));
  console.log();

  try {
    const count = await searcher.buildIndex();

    console.log(chalk.green(`  ✅ Index rebuilt successfully`));
    console.log();
    console.log(chalk.gray(`  ${count} documents indexed`));
    console.log();

    // 显示统计
    const stats = searcher.getStats();
    console.log(chalk.bold('  Categories:'));

    for (const [category, catCount] of Object.entries(stats.categories)) {
      const icon = getCategoryIcon(category);
      console.log(chalk.gray(`    ${icon} ${category}: ${catCount}`));
    }

    console.log();
  } catch (error) {
    console.log(chalk.red(`  Error: ${error.message}`));
    console.log();
  }
}

/**
 * 显示上下文帮助
 * @param {Object} options - 选项
 */
async function showHelp(options) {
  const projectRoot = process.cwd();
  const helper = new ContextHelper(projectRoot);

  try {
    await helper.initialize();

    // 构建上下文
    const context = {
      command: options.command || null,
      agent: options.agent || null,
      error: options.error || null,
      directory: process.cwd()
    };

    const helpResults = await helper.getHelp(context);

    console.log();
    console.log(chalk.bold('  💡 Context-Aware Help'));
    console.log();

    if (helpResults.length === 0) {
      console.log(chalk.gray('  No specific help available for current context.'));
      console.log();
      console.log(chalk.gray('  Try:'));
      console.log(chalk.gray('    --command <name>  Help for a specific command'));
      console.log(chalk.gray('    --agent <id>      Help for a specific agent'));
      console.log(chalk.gray('    --error <code>    Help for an error code'));
      console.log();
      return;
    }

    for (const result of helpResults) {
      console.log(chalk.bold(`  ${result.topic}`));
      console.log(chalk.gray(`  ${result.summary}`));
      console.log();

      if (result.suggestions.length > 0) {
        console.log(chalk.bold('  Suggestions:'));
        for (const suggestion of result.suggestions) {
          console.log(chalk.gray(`    • ${suggestion}`));
        }
        console.log();
      }

      if (result.relatedCommands.length > 0) {
        console.log(chalk.bold('  Related Commands:'));
        console.log(chalk.gray(`    ${result.relatedCommands.join(', ')}`));
        console.log();
      }

      if (result.relatedDocs.length > 0) {
        console.log(chalk.bold('  Related Docs:'));
        for (const doc of result.relatedDocs) {
          console.log(chalk.gray(`    • ${doc}`));
        }
        console.log();
      }
    }

    if (options.json) {
      console.log(JSON.stringify(helpResults, null, 2));
    }
  } catch (error) {
    console.log(chalk.red(`  Error: ${error.message}`));
    console.log();
  }
}

/**
 * 显示文档详情
 * @param {string} docPath - 文档路径
 * @param {Object} options - 选项
 */
async function showDoc(docPath, options) {
  if (!docPath) {
    console.log(chalk.red('  Error: Document path is required'));
    console.log(chalk.gray('  Usage: aios docs show <path>'));
    return;
  }

  const projectRoot = process.cwd();
  const fs = require('fs');
  const fullPath = path.join(projectRoot, docPath);

  if (!fs.existsSync(fullPath)) {
    console.log(chalk.red(`  Error: Document not found: ${docPath}`));
    console.log();
    return;
  }

  try {
    const content = fs.readFileSync(fullPath, 'utf8');

    console.log();
    console.log(chalk.bold(`  📄 ${path.basename(docPath)}`));
    console.log(chalk.gray(`  ${docPath}`));
    console.log();
    console.log(content);
    console.log();
  } catch (error) {
    console.log(chalk.red(`  Error reading document: ${error.message}`));
    console.log();
  }
}

/**
 * 创建 docs 命令
 * @returns {Command}
 */
function createDocsCommand() {
  const command = new Command('docs')
    .description('Search and explore AIOS documentation');

  // docs search
  command
    .command('search <query>')
    .description('Search documentation')
    .option('-l, --limit <n>', 'Maximum results', '10')
    .option('-c, --category <name>', 'Filter by category')
    .option('-v, --verbose', 'Show content snippets')
    .option('--json', 'Output as JSON')
    .action(searchDocs);

  // docs list
  command
    .command('list')
    .alias('ls')
    .description('List documents by category')
    .option('-c, --category <name>', 'Category to list')
    .option('--json', 'Output as JSON')
    .action(listDocs);

  // docs rebuild
  command
    .command('rebuild')
    .description('Rebuild document index')
    .action(rebuildIndex);

  // docs help
  command
    .command('help')
    .description('Get context-aware help')
    .option('--command <name>', 'Get help for a command')
    .option('--agent <id>', 'Get help for an agent')
    .option('--error <code>', 'Get help for an error code')
    .option('--json', 'Output as JSON')
    .action(showHelp);

  // docs show
  command
    .command('show <path>')
    .description('Show a specific document')
    .action(showDoc);

  return command;
}

module.exports = {
  createDocsCommand,
  searchDocs,
  listDocs,
  rebuildIndex,
  showHelp,
  showDoc,
  getCategoryIcon
};
