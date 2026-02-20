/**
 * AIOS CLI Entry Point
 *
 * Main entry point for the AIOS CLI with Commander.js integration.
 * Registers all subcommands including workers, agents, etc.
 *
 * @module cli
 * @version 1.0.0
 * @story 2.7 - Discovery CLI Search
 */

const { Command } = require('commander');
const path = require('path');
const fs = require('fs');

// Import command modules
const { createWorkersCommand } = require('./commands/workers');
const { createManifestCommand } = require('./commands/manifest');
const { createQaCommand } = require('./commands/qa');
const { createMcpCommand } = require('./commands/mcp');
const { createMigrateCommand } = require('./commands/migrate');
const { createGenerateCommand } = require('./commands/generate');
const { createMetricsCommand } = require('./commands/metrics');
const { createConfigCommand } = require('./commands/config');
const { createProCommand } = require('./commands/pro');
const { createDiagnoseCommand } = require('./commands/diagnose');
const { createFixCommand } = require('./commands/fix');
const { createDoctorCommand } = require('./commands/doctor');
const { createQuickstartCommand } = require('./commands/quickstart');
const { createTourCommand } = require('./commands/tour');
const { createAgentsCommand } = require('./commands/agents');
const { createStoryCommand } = require('./commands/story');
const { createDocsCommand } = require('./commands/docs');
const { createWorkflowCommand } = require('./commands/workflow');
const { createSuggestCommand } = require('./commands/suggest');

// Read package.json for version
const packageJsonPath = path.join(__dirname, '..', '..', 'package.json');
let packageVersion = '0.0.0';
try {
  const packageJson = JSON.parse(fs.readFileSync(packageJsonPath, 'utf8'));
  packageVersion = packageJson.version;
} catch (error) {
  // Fallback version if package.json not found
}

/**
 * Create the main CLI program
 * @returns {Command} Commander program instance
 */
function createProgram() {
  const program = new Command();

  program
    .name('aios')
    .version(packageVersion)
    .description('AIOS-FullStack: AI-Orchestrated System for Full Stack Development')
    .addHelpText('after', `
Commands:
  workers           Manage and discover workers
  manifest          Manage manifest files (validate, regenerate)
  qa                Quality Gate Manager (run, status)
  metrics           Quality Gate Metrics (record, show, seed, cleanup)
  config            Manage layered configuration (show, diff, migrate, validate)
  pro               AIOS Pro license management (activate, status, deactivate, features)
  mcp               Manage global MCP configuration
  migrate           Migrate from v2.0 to v4.0.4 structure
  generate          Generate documents from templates (prd, adr, pmdr, etc.)
  diagnose          Diagnose AIOS errors and get recovery suggestions
  fix               Automatically fix AIOS errors
  quickstart        Quick start workflows for common tasks
  tour              Interactive tutorials to learn AIOS
  agents            Manage agents (list, status, route, history)
  story             Manage story lifecycle (list, create, show, progress, visualize)
  docs              Search and explore documentation (search, list, help)
  workflow          Analyze and visualize workflows (list, show, dashboard, viz)
  suggest           Get smart suggestions and learning paths (learn, next, feedback)
  install           Install AIOS in current project
  init <name>       Create new AIOS project
  info              Show system information
  doctor            Run system diagnostics

For command help:
  $ aios <command> --help

Examples:
  $ aios workers search "json transformation"
  $ aios workers list --category=data
  $ aios manifest validate
  $ aios manifest regenerate
  $ aios qa run
  $ aios qa status
  $ aios mcp setup --with-defaults
  $ aios mcp link
  $ aios mcp status
  $ aios metrics show
  $ aios metrics record --layer 1 --passed
  $ aios metrics seed --days 30
  $ aios migrate --dry-run
  $ aios migrate --from=2.0 --to=2.1
  $ aios generate pmdr --title "Feature X Decision"
  $ aios generate adr --save
  $ aios generate list
  $ aios config show
  $ aios config show --debug
  $ aios config diff --levels L1,L2
  $ aios config migrate --dry-run
  $ aios config validate
  $ aios config init-local
  $ aios pro activate --key PRO-XXXX-XXXX-XXXX-XXXX
  $ aios pro status
  $ aios pro deactivate
  $ aios pro features
  $ aios pro validate
  $ aios diagnose CFG_001
  $ aios diagnose --last
  $ aios fix CFG_001
  $ aios fix CFG_001 --dry-run
  $ aios quickstart feature
  $ aios quickstart bugfix
  $ aios quickstart learning
  $ aios quickstart --list
  $ aios tour first-run
  $ aios tour --list
  $ aios tour --resume
  $ aios agents list
  $ aios agents status
  $ aios agents route "implement user auth"
  $ aios agents history --graph
  $ aios story list
  $ aios story create --title "New Feature" --type feature
  $ aios story show STORY-TEST-1
  $ aios story progress STORY-TEST-1 --report
  $ aios story visualize
  $ aios docs search "configuration"
  $ aios docs list --category guides
  $ aios docs help --command doctor
  $ aios docs rebuild
  $ aios workflow list
  $ aios workflow dashboard
  $ aios workflow show STORY-TEST-1
  $ aios workflow viz STORY-TEST-1 --format mermaid
  $ aios suggest
  $ aios suggest learn getting-started
  $ aios suggest next
  $ aios install
  $ aios doctor
`);

  // Add workers command
  program.addCommand(createWorkersCommand());

  // Add manifest command (Story 2.13)
  program.addCommand(createManifestCommand());

  // Add qa command (Story 2.10)
  program.addCommand(createQaCommand());

  // Add mcp command (Story 2.11)
  program.addCommand(createMcpCommand());

  // Add migrate command (Story 2.14)
  program.addCommand(createMigrateCommand());

  // Add generate command (Story 3.9)
  program.addCommand(createGenerateCommand());

  // Add metrics command (Story 3.11a)
  program.addCommand(createMetricsCommand());

  // Add config command (Story PRO-4)
  program.addCommand(createConfigCommand());

  // Add pro command (Story PRO-6)
  program.addCommand(createProCommand());

  // Add diagnose command (Story STORY-OPT-D3)
  program.addCommand(createDiagnoseCommand());

  // Add fix command (Story STORY-OPT-D3)
  program.addCommand(createFixCommand());

  // Add doctor command (Story STORY-OPT-D3)
  program.addCommand(createDoctorCommand());

  // Add quickstart command (Story STORY-OPT-A2)
  program.addCommand(createQuickstartCommand());

  // Add tour command (Story STORY-OPT-A1)
  program.addCommand(createTourCommand());

  // Add agents command (Story STORY-OPT-B3)
  program.addCommand(createAgentsCommand());

  // Add story command (Story STORY-OPT-C3)
  program.addCommand(createStoryCommand());

  // Add docs command (Story STORY-OPT-G1/G2)
  program.addCommand(createDocsCommand());

  // Add workflow command (Story STORY-OPT-E1)
  program.addCommand(createWorkflowCommand());

  // Add suggest command (Story STORY-OPT-F1)
  program.addCommand(createSuggestCommand());

  return program;
}

/**
 * Run the CLI
 * @param {string[]} args - Command line arguments
 * @returns {Promise<void>}
 */
async function run(args = process.argv) {
  const program = createProgram();

  try {
    await program.parseAsync(args);
  } catch (error) {
    console.error(`Error: ${error.message}`);
    process.exit(1);
  }
}

module.exports = {
  createProgram,
  run,
};
