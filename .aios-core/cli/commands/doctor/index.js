/**
 * Doctor Command Module
 *
 * CLI command for running AIOS system diagnostics.
 *
 * Subcommands:
 *   aios doctor                  # Quick diagnostics
 *   aios doctor --full           # Full diagnostics
 *   aios doctor --fix            # Auto-fix issues
 *   aios doctor --report         # Generate report file
 *   aios doctor --dry-run        # Preview fixes
 *
 * @module cli/commands/doctor
 * @version 1.0.0
 * @story STORY-OPT-D3 - Doctor Command Enhancement
 */

'use strict';

const { Command } = require('commander');
const { execSync } = require('child_process');
const path = require('path');
const fs = require('fs');
const chalk = require('chalk');

const { HealthCheck, CheckSeverity, CheckStatus } = require('../../../core/health-check');
const { ErrorFormatter, createError, isAIOSError } = require('../../../core/errors');

/**
 * Doctor configuration
 */
const DOCTOR_CONFIG = {
  requiredNodeVersion: '18.0.0',
  checks: {
    quick: ['node', 'npm', 'aios_core'],
    full: ['node', 'npm', 'git', 'aios_core', 'aios_pro', 'config', 'health_checks'],
  },
};

/**
 * Compare semver versions
 * @param {string} a - First version
 * @param {string} b - Second version
 * @returns {number} 1 if a > b, -1 if a < b, 0 if equal
 */
function compareVersions(a, b) {
  const pa = a.split('.').map((n) => parseInt(n, 10));
  const pb = b.split('.').map((n) => parseInt(n, 10));
  for (let i = 0; i < 3; i++) {
    const na = pa[i] || 0;
    const nb = pb[i] || 0;
    if (na > nb) return 1;
    if (na < nb) return -1;
  }
  return 0;
}

/**
 * Format check result with icon
 * @param {boolean} passed - Check passed
 * @param {string} message - Check message
 * @param {string} [severity] - Severity level
 * @returns {string} Formatted line
 */
function formatCheckLine(passed, message, severity = 'INFO') {
  const icons = {
    PASS: chalk.green('[+]'),
    FAIL: chalk.red('[x]'),
    WARNING: chalk.yellow('[!]'),
    INFO: chalk.blue('[i]'),
  };

  const icon = passed ? icons.PASS : (severity === 'CRITICAL' || severity === 'ERROR' ? icons.FAIL : icons.WARNING);
  return `${icon} ${message}`;
}

/**
 * Run quick diagnostics
 * @param {Object} options - Command options
 * @returns {Object} Diagnostic results
 */
async function runQuickDiagnostics(options = {}) {
  const results = {
    timestamp: new Date().toISOString(),
    checks: [],
    issues: [],
    score: 100,
  };

  // Check 1: Node.js version
  const nodeVersion = process.version.replace('v', '');
  const nodeOk = compareVersions(nodeVersion, DOCTOR_CONFIG.requiredNodeVersion) >= 0;
  results.checks.push({
    name: 'Node.js',
    status: nodeOk ? 'PASS' : 'FAIL',
    message: nodeOk
      ? `v${nodeVersion} (meets requirement: >=${DOCTOR_CONFIG.requiredNodeVersion})`
      : `v${nodeVersion} (requires >=${DOCTOR_CONFIG.requiredNodeVersion})`,
    severity: nodeOk ? 'INFO' : 'CRITICAL',
  });
  if (!nodeOk) {
    results.issues.push({
      type: 'node_version',
      autoFix: false,
      message: `Node.js version ${process.version} is below required`,
      suggestion: 'nvm install 20 && nvm use 20',
    });
    results.score -= 25;
  }

  // Check 2: npm
  try {
    const npmVersion = execSync('npm --version', { encoding: 'utf8' }).trim();
    results.checks.push({
      name: 'npm',
      status: 'PASS',
      message: `v${npmVersion}`,
      severity: 'INFO',
    });
  } catch {
    results.checks.push({
      name: 'npm',
      status: 'FAIL',
      message: 'not found',
      severity: 'CRITICAL',
    });
    results.issues.push({
      type: 'npm',
      autoFix: false,
      message: 'npm not found',
      suggestion: 'Install Node.js from https://nodejs.org (includes npm)',
    });
    results.score -= 25;
  }

  // Check 3: AIOS Core
  const aiosCoreDir = path.join(process.cwd(), '.aios-core');
  if (fs.existsSync(aiosCoreDir)) {
    // Try to read version
    let version = 'unknown';
    try {
      const packageJsonPath = path.join(__dirname, '..', '..', '..', '..', 'package.json');
      if (fs.existsSync(packageJsonPath)) {
        const pkg = JSON.parse(fs.readFileSync(packageJsonPath, 'utf8'));
        version = pkg.version;
      }
    } catch {
      // Ignore version read errors
    }

    results.checks.push({
      name: 'AIOS Core',
      status: 'PASS',
      message: `v${version} installed`,
      severity: 'INFO',
    });
  } else {
    results.checks.push({
      name: 'AIOS Core',
      status: 'FAIL',
      message: 'not installed',
      severity: 'CRITICAL',
    });
    results.issues.push({
      type: 'aios_missing',
      autoFix: true,
      message: 'AIOS Core not installed',
      suggestion: 'Run: npx aios-core install',
    });
    results.score -= 30;
  }

  return results;
}

/**
 * Run full diagnostics
 * @param {Object} options - Command options
 * @returns {Object} Diagnostic results
 */
async function runFullDiagnostics(options = {}) {
  // Start with quick diagnostics
  const results = await runQuickDiagnostics(options);
  results.mode = 'full';

  // Check 4: Git
  try {
    const gitVersion = execSync('git --version', { encoding: 'utf8' }).trim();
    results.checks.push({
      name: 'Git',
      status: 'PASS',
      message: gitVersion.replace('git version ', ''),
      severity: 'INFO',
    });
  } catch {
    results.checks.push({
      name: 'Git',
      status: 'WARNING',
      message: 'not found (optional)',
      severity: 'WARNING',
    });
    results.issues.push({
      type: 'git',
      autoFix: false,
      message: 'Git not found (optional but recommended)',
      suggestion: 'Install Git from https://git-scm.com',
    });
    results.score -= 5;
  }

  // Check 5: AIOS Pro
  const proDir = path.join(process.cwd(), 'pro');
  if (fs.existsSync(proDir)) {
    try {
      const { featureGate } = require(path.join(proDir, 'license', 'feature-gate'));
      const state = featureGate.getLicenseState();

      if (state === 'Active') {
        results.checks.push({
          name: 'AIOS Pro',
          status: 'PASS',
          message: 'License active',
          severity: 'INFO',
        });
      } else {
        results.checks.push({
          name: 'AIOS Pro',
          status: 'WARNING',
          message: `License ${state.toLowerCase()}`,
          severity: 'WARNING',
        });
      }
    } catch {
      results.checks.push({
        name: 'AIOS Pro',
        status: 'WARNING',
        message: 'Unable to check license',
        severity: 'WARNING',
      });
    }
  }

  // Check 6: Configuration files
  const configFiles = [
    { path: '.aios-core/core-config.yaml', name: 'Core Config', required: true },
    { path: '.aios-core/framework-config.yaml', name: 'Framework Config', required: false },
    { path: '.aios-core/project-config.yaml', name: 'Project Config', required: false },
  ];

  for (const configFile of configFiles) {
    const fullPath = path.join(process.cwd(), configFile.path);
    if (fs.existsSync(fullPath)) {
      results.checks.push({
        name: configFile.name,
        status: 'PASS',
        message: 'Valid',
        severity: 'INFO',
      });
    } else if (configFile.required) {
      results.checks.push({
        name: configFile.name,
        status: 'WARNING',
        message: 'Missing (optional)',
        severity: 'WARNING',
      });
    }
  }

  // Check 7: Health Checks (if HealthCheck system is available)
  try {
    const healthCheck = new HealthCheck({ mode: 'quick' });
    const healthResults = await healthCheck.run({ domain: 'all' });

    if (healthResults && healthResults.overall) {
      const passedCount = healthResults.overall.issuesCount === 0;
      results.checks.push({
        name: 'Health Checks',
        status: passedCount ? 'PASS' : 'WARNING',
        message: passedCount
          ? 'All checks passed'
          : `${healthResults.overall.issuesCount} issue(s) found`,
        severity: passedCount ? 'INFO' : 'WARNING',
      });

      // Add health check issues
      if (healthResults.overall.issuesCount > 0) {
        for (const [domain, domainResult] of Object.entries(healthResults.domains || {})) {
          for (const check of domainResult.checks || []) {
            if (check.status !== CheckStatus.PASS) {
              results.issues.push({
                type: `health_${check.name}`,
                autoFix: false,
                message: check.message,
                suggestion: check.recommendation || 'Check documentation',
              });
            }
          }
        }
      }
    }
  } catch {
    // Health check not available, skip
  }

  // Ensure score is within bounds
  results.score = Math.max(0, Math.min(100, results.score));

  return results;
}

/**
 * Display diagnostic results
 * @param {Object} results - Diagnostic results
 * @param {Object} options - Display options
 */
function displayResults(results, options = {}) {
  const lines = [];

  // Header
  lines.push('');
  lines.push(chalk.bold.cyan('[i] AIOS System Diagnostics'));
  lines.push(chalk.dim('='.repeat(50)));
  lines.push('');

  // Configuration section
  lines.push(chalk.bold('Configuration'));
  const configChecks = results.checks.filter((c) =>
    ['Core Config', 'Framework Config', 'Project Config'].includes(c.name)
  );
  if (configChecks.length > 0) {
    for (const check of configChecks) {
      lines.push(`   ${formatCheckLine(check.status === 'PASS', check.message, check.severity)} ${chalk.dim(check.name)}`);
    }
  } else {
    lines.push(chalk.dim('   (No configuration checks in quick mode)'));
  }
  lines.push('');

  // Environment section
  lines.push(chalk.bold('Environment'));
  const envChecks = results.checks.filter((c) =>
    ['Node.js', 'npm', 'Git'].includes(c.name)
  );
  for (const check of envChecks) {
    lines.push(`   ${formatCheckLine(check.status === 'PASS', check.message, check.severity)} ${chalk.dim(check.name)}`);
  }
  lines.push('');

  // AIOS Installation section
  lines.push(chalk.bold('AIOS Installation'));
  const aiosChecks = results.checks.filter((c) =>
    ['AIOS Core', 'AIOS Pro'].includes(c.name)
  );
  for (const check of aiosChecks) {
    lines.push(`   ${formatCheckLine(check.status === 'PASS', check.message, check.severity)} ${chalk.dim(check.name)}`);
  }
  lines.push('');

  // Health Checks section (full mode only)
  if (results.mode === 'full') {
    const healthChecks = results.checks.filter((c) => c.name === 'Health Checks');
    if (healthChecks.length > 0) {
      lines.push(chalk.bold('Health Checks'));
      for (const check of healthChecks) {
        lines.push(`   ${formatCheckLine(check.status === 'PASS', check.message, check.severity)}`);
      }
      lines.push('');
    }
  }

  // Summary
  lines.push(chalk.dim('='.repeat(50)));
  const scoreColor = results.score >= 90 ? chalk.green : results.score >= 70 ? chalk.yellow : chalk.red;
  lines.push(`Summary: ${scoreColor(`Score: ${results.score}/100`)}`);

  if (results.issues.length === 0) {
    lines.push(chalk.green('All systems operational'));
  } else {
    lines.push(chalk.yellow(`${results.issues.length} issue(s) detected`));
    if (!options.fix) {
      lines.push(chalk.dim('Run with --fix to attempt automatic repair'));
    }
  }

  console.log(lines.join('\n'));
}

/**
 * Generate report file
 * @param {Object} results - Diagnostic results
 * @param {string} format - Report format (json|yaml|markdown)
 * @returns {string} Report content
 */
function generateReport(results, format = 'json') {
  if (format === 'json') {
    return JSON.stringify(results, null, 2);
  }

  if (format === 'markdown') {
    const lines = [];
    lines.push('# AIOS System Diagnostics Report');
    lines.push('');
    lines.push(`**Generated:** ${results.timestamp}`);
    lines.push(`**Mode:** ${results.mode || 'quick'}`);
    lines.push(`**Score:** ${results.score}/100`);
    lines.push('');

    lines.push('## Checks');
    lines.push('');
    lines.push('| Check | Status | Message |');
    lines.push('|-------|--------|---------|');
    for (const check of results.checks) {
      lines.push(`| ${check.name} | ${check.status} | ${check.message} |`);
    }
    lines.push('');

    if (results.issues.length > 0) {
      lines.push('## Issues');
      lines.push('');
      for (const issue of results.issues) {
        lines.push(`### ${issue.type}`);
        lines.push(`- **Message:** ${issue.message}`);
        lines.push(`- **Auto-fix:** ${issue.autoFix ? 'Available' : 'Not available'}`);
        if (issue.suggestion) {
          lines.push(`- **Suggestion:** ${issue.suggestion}`);
        }
        lines.push('');
      }
    }

    return lines.join('\n');
  }

  // Default to JSON
  return JSON.stringify(results, null, 2);
}

/**
 * Doctor action handler
 * @param {Object} options - Command options
 */
async function doctorAction(options = {}) {
  const isFull = options.full || false;
  const shouldFix = options.fix || false;
  const isDryRun = options.dryRun || false;
  const generateReportFile = options.report || false;

  // Run diagnostics
  const results = isFull
    ? await runFullDiagnostics(options)
    : await runQuickDiagnostics(options);

  // Display results
  displayResults(results, options);

  // Apply fixes if requested
  if (shouldFix && results.issues.length > 0) {
    console.log('');
    console.log(chalk.cyan('[i] Attempting fixes...'));
    console.log('');

    let fixed = 0;
    let manual = 0;

    for (const issue of results.issues) {
      if (issue.autoFix && issue.fixAction) {
        if (isDryRun) {
          console.log(chalk.dim(`   [DRY RUN] Would fix: ${issue.type}`));
          fixed++;
        } else {
          try {
            await issue.fixAction();
            console.log(chalk.green(`   [+] Fixed: ${issue.type}`));
            fixed++;
          } catch (fixError) {
            console.log(chalk.red(`   [x] Failed to fix ${issue.type}: ${fixError.message}`));
            manual++;
          }
        }
      } else {
        manual++;
        console.log(chalk.yellow(`   [!] Manual fix required: ${issue.message}`));
        if (issue.suggestion) {
          console.log(chalk.dim(`       Suggestion: ${issue.suggestion}`));
        }
      }
    }

    console.log('');
    if (isDryRun) {
      console.log(chalk.cyan(`[i] Dry run complete - ${fixed} issue(s) would be fixed`));
      if (manual > 0) {
        console.log(chalk.yellow(`[!] ${manual} issue(s) require manual action`));
      }
    } else {
      if (fixed > 0) {
        console.log(chalk.green(`[+] Fixed ${fixed} issue(s)`));
      }
      if (manual > 0) {
        console.log(chalk.yellow(`[!] ${manual} issue(s) require manual action`));
      }
    }
  }

  // Generate report file if requested
  if (generateReportFile) {
    const reportFormat = typeof generateReportFile === 'string' ? generateReportFile : 'json';
    const reportContent = generateReport(results, reportFormat);
    const reportPath = path.join(process.cwd(), `.aios-doctor-report.${reportFormat === 'markdown' ? 'md' : reportFormat}`);

    try {
      // Ensure directory exists
      const reportDir = path.dirname(reportPath);
      if (!fs.existsSync(reportDir)) {
        fs.mkdirSync(reportDir, { recursive: true });
      }

      fs.writeFileSync(reportPath, reportContent, 'utf8');
      console.log('');
      console.log(chalk.cyan(`[i] Report saved to: ${reportPath}`));
    } catch (error) {
      console.log(chalk.yellow(`[!] Could not save report: ${error.message}`));
      console.log(reportContent);
    }
  }

  // Exit with appropriate code
  if (results.issues.length > 0 && !shouldFix) {
    process.exit(1);
  }
}

/**
 * Create the doctor command
 * @returns {Command} Commander command instance
 */
function createDoctorCommand() {
  const doctorCmd = new Command('doctor')
    .description('Run AIOS system diagnostics')
    .option('-f, --full', 'Run full diagnostics (including health checks)', false)
    .option('--fix', 'Attempt to automatically fix detected issues', false)
    .option('-d, --dry-run', 'Preview fixes without applying changes', false)
    .option('-r, --report [format]', 'Generate report file (json|markdown)', false)
    .action(async (options) => {
      try {
        await doctorAction(options);
      } catch (error) {
        console.error(chalk.red(`[!] Doctor failed: ${error.message}`));
        if (options.verbose) {
          console.error(error.stack);
        }
        process.exit(1);
      }
    });

  return doctorCmd;
}

module.exports = {
  createDoctorCommand,
  doctorAction,
  runQuickDiagnostics,
  runFullDiagnostics,
  displayResults,
  generateReport,
  compareVersions,
};
