/**
 * Project Detector Module
 *
 * Automatically detects project type, framework, test framework, and package manager.
 * Used by config wizard to recommend appropriate configuration.
 *
 * Detection rules:
 * - Language: Detects Node.js (package.json), Python (requirements.txt/pyproject.toml), Go (go.mod)
 * - Framework: Detects React, Vue, Angular, Express, Fastify, Django, Flask, etc.
 * - Test Framework: Detects Jest, Mocha, Vitest, Pytest, etc.
 * - Package Manager: Detects npm, yarn, pnpm, pip, poetry
 *
 * @module core/config/detectors
 * @version 1.0.0
 * @story STORY-OPT-A3
 */

const fs = require('fs');
const path = require('path');

/**
 * Detection result structure
 * @typedef {Object} DetectionResult
 * @property {string|null} language - Detected language (nodejs, python, go)
 * @property {string[]|null} framework - Detected frameworks (react, vue, express)
 * @property {string|null} testFramework - Detected test framework (jest, mocha, pytest)
 * @property {string|null} packageManager - Detected package manager (npm, yarn, pnpm, pip)
 * @property {boolean} hasTypeScript - Whether TypeScript is configured
 * @property {Object} suggestions - Configuration suggestions
 */

/**
 * Framework detection patterns
 */
const FRAMEWORK_PATTERNS = {
  // Frontend frameworks
  react: {
    dependencies: ['react', 'react-dom'],
    files: [],
  },
  vue: {
    dependencies: ['vue'],
    files: [],
  },
  angular: {
    dependencies: ['@angular/core'],
    files: [],
  },
  svelte: {
    dependencies: ['svelte'],
    files: [],
  },
  next: {
    dependencies: ['next'],
    files: [],
  },
  nuxt: {
    dependencies: ['nuxt'],
    files: [],
  },

  // Backend frameworks
  express: {
    dependencies: ['express'],
    files: [],
  },
  fastify: {
    dependencies: ['fastify'],
    files: [],
  },
  koa: {
    dependencies: ['koa'],
    files: [],
  },
  nestjs: {
    dependencies: ['@nestjs/core'],
    files: [],
  },
  hapi: {
    dependencies: ['@hapi/hapi'],
    files: [],
  },

  // Python frameworks
  django: {
    dependencies: [],
    files: ['manage.py', 'settings.py'],
  },
  flask: {
    dependencies: [],
    files: ['app.py', 'flask'],
  },
  fastapi: {
    dependencies: [],
    files: [],
  },

  // Go frameworks
  gin: {
    dependencies: [],
    files: [],
  },
  echo: {
    dependencies: [],
    files: [],
  },
};

/**
 * Test framework patterns
 */
const TEST_FRAMEWORK_PATTERNS = {
  jest: {
    dependencies: ['jest', '@types/jest'],
    files: ['jest.config.js', 'jest.config.ts', 'jest.config.json'],
  },
  mocha: {
    dependencies: ['mocha'],
    files: ['.mocharc.js', '.mocharc.json'],
  },
  vitest: {
    dependencies: ['vitest'],
    files: ['vitest.config.js', 'vitest.config.ts'],
  },
  jasmine: {
    dependencies: ['jasmine'],
    files: ['jasmine.json'],
  },
  ava: {
    dependencies: ['ava'],
    files: [],
  },
  tape: {
    dependencies: ['tape'],
    files: [],
  },
  pytest: {
    dependencies: [],
    files: ['pytest.ini', 'pyproject.toml', 'setup.cfg'],
  },
};

/**
 * ProjectDetector class for detecting project configuration
 */
class ProjectDetector {
  /**
   * Create a ProjectDetector instance
   * @param {string} [projectRoot] - Project root directory (defaults to cwd)
   */
  constructor(projectRoot) {
    this.projectRoot = projectRoot || process.cwd();
    this._packageJson = null;
    this._goMod = null;
    this._pyproject = null;
  }

  /**
   * Detect all project characteristics
   * @returns {Promise<DetectionResult>} Detection result
   */
  async detect() {
    const result = {
      language: null,
      framework: null,
      testFramework: null,
      packageManager: null,
      hasTypeScript: false,
      suggestions: {},
    };

    // Detect in sequence
    result.language = await this.detectLanguage();
    result.framework = await this.detectFramework();
    result.testFramework = await this.detectTestFramework();
    result.packageManager = await this.detectPackageManager();
    result.hasTypeScript = await this.detectTypeScript();

    // Generate suggestions based on detection
    result.suggestions = this.getSuggestions(result);

    return result;
  }

  /**
   * Detect the primary programming language
   * @returns {Promise<string|null>} Language identifier (nodejs, python, go)
   */
  async detectLanguage() {
    // Check for Node.js
    if (this._fileExists('package.json')) {
      return 'nodejs';
    }

    // Check for Python
    if (
      this._fileExists('requirements.txt') ||
      this._fileExists('pyproject.toml') ||
      this._fileExists('setup.py') ||
      this._fileExists('Pipfile')
    ) {
      return 'python';
    }

    // Check for Go
    if (this._fileExists('go.mod') || this._fileExists('go.sum')) {
      return 'go';
    }

    // Check for Rust
    if (this._fileExists('Cargo.toml')) {
      return 'rust';
    }

    // Check for Java
    if (this._fileExists('pom.xml') || this._fileExists('build.gradle')) {
      return 'java';
    }

    return null;
  }

  /**
   * Detect frameworks used in the project
   * @returns {Promise<string[]|null>} Array of detected frameworks
   */
  async detectFramework() {
    const detected = [];
    const pkg = this._loadPackageJson();

    if (!pkg) {
      // Try Python detection
      if (this._fileExists('manage.py') || this._hasFileContaining('settings.py')) {
        detected.push('django');
      }
      if (this._fileExists('app.py') || this._hasFileContaining('flask')) {
        detected.push('flask');
      }

      return detected.length > 0 ? detected : null;
    }

    const allDeps = {
      ...pkg.dependencies,
      ...pkg.devDependencies,
    };

    // Check each framework pattern
    for (const [framework, pattern] of Object.entries(FRAMEWORK_PATTERNS)) {
      // Check if any required dependencies are present
      const hasDependencies = pattern.dependencies.some((dep) => dep in allDeps);

      if (hasDependencies) {
        detected.push(framework);
      }
    }

    return detected.length > 0 ? detected : null;
  }

  /**
   * Detect the test framework
   * @returns {Promise<string|null>} Test framework identifier
   */
  async detectTestFramework() {
    const pkg = this._loadPackageJson();

    if (pkg) {
      const allDeps = {
        ...pkg.dependencies,
        ...pkg.devDependencies,
      };

      // Check package.json dependencies first
      for (const [framework, pattern] of Object.entries(TEST_FRAMEWORK_PATTERNS)) {
        if (pattern.dependencies.some((dep) => dep in allDeps)) {
          return framework;
        }
      }

      // Check for config files
      for (const [framework, pattern] of Object.entries(TEST_FRAMEWORK_PATTERNS)) {
        if (pattern.files.some((file) => this._fileExists(file))) {
          return framework;
        }
      }
    }

    // Check for Python test frameworks
    if (this._fileExists('pytest.ini') || this._fileContains('pyproject.toml', 'pytest')) {
      return 'pytest';
    }

    return null;
  }

  /**
   * Detect the package manager
   * @returns {Promise<string|null>} Package manager identifier (npm, yarn, pnpm, pip)
   */
  async detectPackageManager() {
    // Node.js package managers
    if (this._fileExists('pnpm-lock.yaml')) {
      return 'pnpm';
    }
    if (this._fileExists('yarn.lock')) {
      return 'yarn';
    }
    if (this._fileExists('package-lock.json')) {
      return 'npm';
    }

    // Python package managers
    if (this._fileExists('poetry.lock')) {
      return 'poetry';
    }
    if (this._fileExists('Pipfile.lock')) {
      return 'pipenv';
    }
    if (this._fileExists('requirements.txt')) {
      return 'pip';
    }

    // Go
    if (this._fileExists('go.sum')) {
      return 'go-mod';
    }

    // Default to npm if package.json exists
    if (this._fileExists('package.json')) {
      return 'npm';
    }

    return null;
  }

  /**
   * Detect if TypeScript is configured
   * @returns {Promise<boolean>} True if TypeScript is detected
   */
  async detectTypeScript() {
    // Check for tsconfig.json
    if (this._fileExists('tsconfig.json')) {
      return true;
    }

    // Check package.json for TypeScript dependency
    const pkg = this._loadPackageJson();
    if (pkg) {
      const allDeps = {
        ...pkg.dependencies,
        ...pkg.devDependencies,
      };
      return 'typescript' in allDeps;
    }

    return false;
  }

  /**
   * Generate configuration suggestions based on detection results
   * @param {DetectionResult} result - Detection result
   * @returns {Object} Configuration suggestions
   */
  getSuggestions(result) {
    const suggestions = {
      ide: 'claude-code', // Default IDE
      agentTeam: 'minimal',
      mcpServers: 'minimal',
      workflow: 'agile',
      devLoadAlwaysFiles: [],
      testing: {
        framework: result.testFramework || 'none',
        coverageThreshold: 80,
      },
      quality: {
        lint: 'none',
        format: 'none',
      },
    };

    // Adjust based on language
    if (result.language === 'nodejs') {
      suggestions.quality.lint = 'eslint';
      suggestions.quality.format = 'prettier';

      if (result.hasTypeScript) {
        suggestions.devLoadAlwaysFiles.push('**/*.ts');
        suggestions.devLoadAlwaysFiles.push('**/*.tsx');
      } else {
        suggestions.devLoadAlwaysFiles.push('**/*.js');
        suggestions.devLoadAlwaysFiles.push('**/*.jsx');
      }
    }

    // Adjust based on framework
    if (result.framework) {
      const frameworks = Array.isArray(result.framework) ? result.framework : [result.framework];

      // Determine agent team based on frameworks
      const hasFrontend = frameworks.some((f) => ['react', 'vue', 'angular', 'svelte', 'next', 'nuxt'].includes(f));
      const hasBackend = frameworks.some((f) =>
        ['express', 'fastify', 'koa', 'nestjs', 'django', 'flask', 'fastapi'].includes(f),
      );

      if (hasFrontend && hasBackend) {
        suggestions.agentTeam = 'fullstack';
      } else if (hasFrontend) {
        suggestions.agentTeam = 'frontend';
      } else if (hasBackend) {
        suggestions.agentTeam = 'backend';
      }

      // Add framework-specific files to load
      if (frameworks.includes('next')) {
        suggestions.devLoadAlwaysFiles.push('app/**/*');
        suggestions.devLoadAlwaysFiles.push('pages/**/*');
      }
      if (frameworks.includes('react') && !frameworks.includes('next')) {
        suggestions.devLoadAlwaysFiles.push('src/**/*.tsx');
        suggestions.devLoadAlwaysFiles.push('src/**/*.css');
      }
    }

    return suggestions;
  }

  /**
   * Format detection result for display
   * @param {DetectionResult} result - Detection result
   * @returns {string[]} Formatted lines for display
   */
  formatDetectionResult(result) {
    const lines = [];

    // Language
    if (result.language) {
      const langDisplay = {
        nodejs: 'Node.js',
        python: 'Python',
        go: 'Go',
        rust: 'Rust',
        java: 'Java',
      };
      lines.push(`  \u2713 ${langDisplay[result.language] || result.language}`);
    }

    // TypeScript
    if (result.hasTypeScript) {
      lines.push('  \u2713 TypeScript configured');
    }

    // Framework
    if (result.framework && result.framework.length > 0) {
      const frameworks = Array.isArray(result.framework) ? result.framework : [result.framework];
      frameworks.forEach((fw) => {
        const fwDisplay = {
          react: 'React frontend',
          vue: 'Vue frontend',
          angular: 'Angular frontend',
          svelte: 'Svelte frontend',
          next: 'Next.js',
          nuxt: 'Nuxt.js',
          express: 'Express backend',
          fastify: 'Fastify backend',
          koa: 'Koa backend',
          nestjs: 'NestJS backend',
          django: 'Django backend',
          flask: 'Flask backend',
        };
        lines.push(`  \u2713 ${fwDisplay[fw] || fw}`);
      });
    }

    // Test framework
    if (result.testFramework) {
      const testDisplay = {
        jest: 'Jest',
        mocha: 'Mocha',
        vitest: 'Vitest',
        jasmine: 'Jasmine',
        ava: 'AVA',
        tape: 'Tape',
        pytest: 'Pytest',
      };
      lines.push(`  \u2713 ${testDisplay[result.testFramework] || result.testFramework} tests`);
    }

    // Package manager
    if (result.packageManager) {
      const pmDisplay = {
        npm: 'npm',
        yarn: 'Yarn',
        pnpm: 'pnpm',
        pip: 'pip',
        poetry: 'Poetry',
        pipenv: 'Pipenv',
        'go-mod': 'Go modules',
      };
      lines.push(`  \u2713 ${pmDisplay[result.packageManager] || result.packageManager}`);
    }

    return lines;
  }

  // --- Private helper methods ---

  /**
   * Check if a file exists in the project root
   * @param {string} filename - File name to check
   * @returns {boolean} True if file exists
   * @private
   */
  _fileExists(filename) {
    const fullPath = path.join(this.projectRoot, filename);
    return fs.existsSync(fullPath);
  }

  /**
   * Check if any file in the project contains a string
   * @param {string} searchString - String to search for in filenames
   * @returns {boolean} True if any file name contains the string
   * @private
   */
  _hasFileContaining(searchString) {
    try {
      const files = fs.readdirSync(this.projectRoot);
      return files.some((f) => f.toLowerCase().includes(searchString.toLowerCase()));
    } catch {
      return false;
    }
  }

  /**
   * Check if a file contains a specific string
   * @param {string} filename - File name to check
   * @param {string} searchString - String to search for
   * @returns {boolean} True if file contains the string
   * @private
   */
  _fileContains(filename, searchString) {
    const fullPath = path.join(this.projectRoot, filename);
    try {
      if (!fs.existsSync(fullPath)) {
        return false;
      }
      const content = fs.readFileSync(fullPath, 'utf8');
      return content.includes(searchString);
    } catch {
      return false;
    }
  }

  /**
   * Load and parse package.json
   * @returns {Object|null} Parsed package.json or null
   * @private
   */
  _loadPackageJson() {
    if (this._packageJson !== null) {
      return this._packageJson;
    }

    const fullPath = path.join(this.projectRoot, 'package.json');
    try {
      if (!fs.existsSync(fullPath)) {
        this._packageJson = null;
        return null;
      }

      const content = fs.readFileSync(fullPath, 'utf8');
      this._packageJson = JSON.parse(content);
      return this._packageJson;
    } catch {
      this._packageJson = null;
      return null;
    }
  }

  /**
   * Reset cached data (useful for testing)
   */
  resetCache() {
    this._packageJson = null;
    this._goMod = null;
    this._pyproject = null;
  }
}

// Export class and utility functions
module.exports = ProjectDetector;
module.exports.ProjectDetector = ProjectDetector;
module.exports.FRAMEWORK_PATTERNS = FRAMEWORK_PATTERNS;
module.exports.TEST_FRAMEWORK_PATTERNS = TEST_FRAMEWORK_PATTERNS;
