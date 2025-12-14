#!/usr/bin/env tsx

/**
 * Setup Initialization Script
 * Helps users set up the Tax Adviser MCP server for the first time
 */

import * as fs from 'fs';
import * as path from 'path';
import * as readline from 'readline';

const rl = readline.createInterface({
  input: process.stdin,
  output: process.stdout,
});

function question(query: string): Promise<string> {
  return new Promise((resolve) => {
    rl.question(query, resolve);
  });
}

async function setup() {
  console.log(`
╔═══════════════════════════════════════════════════════════╗
║                                                           ║
║       🏦 Tax Adviser MCP Server - Setup Wizard 🏦        ║
║                                                           ║
╚═══════════════════════════════════════════════════════════╝

This wizard will help you configure your Tax Adviser MCP server.

`);

  const config: any = {
    server: {},
    telegram: {},
    web_search: {},
    knowledge: {},
    tax: {},
    reminders: {},
    paths: {},
  };

  // Step 1: Personal data file
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
  console.log('Step 1: Personal Data Configuration');
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n');

  const personalDataPath = await question(
    'Path to your personal.md file [./data/personal.md]: '
  );
  config.paths.personal_data = personalDataPath || './data/personal.md';

  // Create personal.md from example if it doesn't exist
  if (!fs.existsSync(config.paths.personal_data)) {
    const createPersonal = await question(
      '\nPersonal data file not found. Create from template? (y/n): '
    );
    if (createPersonal.toLowerCase() === 'y') {
      const examplePath = './data/personal.example.md';
      if (fs.existsSync(examplePath)) {
        fs.copyFileSync(examplePath, config.paths.personal_data);
        console.log(`✅ Created ${config.paths.personal_data} from template`);
        console.log('⚠️  Please edit this file with your personal information!\n');
      }
    }
  }

  // Step 2: Telegram configuration
  console.log('\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
  console.log('Step 2: Telegram Notifications');
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n');

  const enableTelegram = await question('Enable Telegram notifications? (y/n): ');
  config.telegram.enabled = enableTelegram.toLowerCase() === 'y';

  if (config.telegram.enabled) {
    console.log('\nTo use Telegram notifications, you need:');
    console.log('1. A Telegram bot token (get from @BotFather)');
    console.log('2. Your chat ID (get from @userinfobot)\n');

    config.telegram.bot_token = await question('Bot token: ');
    config.telegram.chat_id = await question('Chat ID: ');
    config.telegram.quiet_hours = {
      enabled: true,
      start: '22:00',
      end: '08:00',
    };
  }

  // Step 3: Web search configuration
  console.log('\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
  console.log('Step 3: Web Search Configuration');
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n');

  const searchProvider = await question('Search provider (duckduckgo/brave): ');
  config.web_search.provider = searchProvider || 'duckduckgo';

  if (config.web_search.provider === 'brave') {
    console.log('\nBrave Search requires an API key from brave.com/search/api\n');
    config.web_search.brave_api_key = await question('Brave API key: ');
  }

  config.web_search.max_results = 10;
  config.web_search.timeout = 10000;

  // Step 4: Knowledge cache configuration
  console.log('\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
  console.log('Step 4: Knowledge Cache Configuration');
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n');

  config.knowledge.enabled = true;
  config.knowledge.auto_cache = true;
  config.knowledge.track_in_git = true;
  config.knowledge.seed_initial_entries = true;

  const refreshStrategy = await question(
    'Refresh strategy (weekly/on-demand/disabled) [weekly]: '
  );
  config.knowledge.refresh_strategy = refreshStrategy || 'weekly';

  const notificationLevel = await question(
    'Change notifications (all/profile-specific/disabled) [profile-specific]: '
  );
  config.knowledge.change_notifications = notificationLevel || 'profile-specific';

  config.knowledge.default_expiry_days = 90;
  config.knowledge.min_confidence = 'medium';

  // Step 5: Tax year
  console.log('\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
  console.log('Step 5: Tax Year');
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n');

  const currentYear = new Date().getFullYear();
  const taxYear = await question(`Tax year [${currentYear}]: `);
  config.tax.year = parseInt(taxYear) || currentYear;

  // Step 6: Paths
  config.paths.tax_rules = './data/dutch-tax-rules.json';
  config.paths.knowledge_base = './knowledge';
  config.paths.config = './data/config.yaml';

  // Step 7: Reminders
  config.reminders = {
    enabled: config.telegram.enabled,
    deadline_check_time: '0 9 * * *',
    payment_check_time: '0 10 * * *',
    advance_notice_days: {
      income_tax: 30,
      btw: 14,
      other: 7,
    },
  };

  // Write configuration
  console.log('\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
  console.log('Generating Configuration');
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n');

  const yaml = generateYaml(config);
  const configPath = './data/config.yaml';

  fs.writeFileSync(configPath, yaml);
  console.log(`✅ Configuration written to ${configPath}\n`);

  // Summary
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
  console.log('Setup Complete! 🎉');
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n');

  console.log('Next steps:');
  console.log('1. Edit your personal.md file with your information');
  console.log('2. Build the project: npm run build');
  console.log('3. Start the MCP server: npm start');
  console.log('4. (Optional) Start the daemon: npm run daemon:start\n');

  console.log('For more help, see:');
  console.log('- README.md - General documentation');
  console.log('- SETUP.md - Detailed setup guide');
  console.log('- API.md - Tool and resource documentation\n');

  rl.close();
}

function generateYaml(config: any): string {
  return `# Tax Adviser MCP Server Configuration
# Generated by setup wizard

# Server settings
server:
  name: tax-adviser-mcp
  version: 1.0.0
  log_level: info

# Telegram notifications
telegram:
  enabled: ${config.telegram.enabled}
  ${config.telegram.enabled ? `bot_token: "${config.telegram.bot_token}"` : 'bot_token: ""'}
  ${config.telegram.enabled ? `chat_id: "${config.telegram.chat_id}"` : 'chat_id: ""'}
  quiet_hours:
    enabled: true
    start: "22:00"
    end: "08:00"
  rate_limit:
    max_per_hour: 30
    max_per_day: 100

# Web search configuration
web_search:
  provider: ${config.web_search.provider}
  ${config.web_search.brave_api_key ? `brave_api_key: "${config.web_search.brave_api_key}"` : '# brave_api_key: ""'}
  max_results: 10
  timeout: 10000
  retry:
    max_attempts: 3
    delay: 2000

# Knowledge cache
knowledge:
  enabled: ${config.knowledge.enabled}
  auto_cache: ${config.knowledge.auto_cache}
  track_in_git: ${config.knowledge.track_in_git}
  seed_initial_entries: ${config.knowledge.seed_initial_entries}
  refresh_strategy: ${config.knowledge.refresh_strategy}
  change_notifications: ${config.knowledge.change_notifications}
  default_expiry_days: 90
  min_confidence: medium
  max_entries: 1000
  cache_search_results: true

# Tax configuration
tax:
  year: ${config.tax.year}
  country: NL
  currency: EUR

# Reminder settings
reminders:
  enabled: ${config.reminders.enabled}
  deadline_check_time: "${config.reminders.deadline_check_time}"
  payment_check_time: "${config.reminders.payment_check_time}"
  advance_notice_days:
    income_tax: 30
    btw: 14
    other: 7

# File paths
paths:
  personal_data: ${config.paths.personal_data}
  tax_rules: ${config.paths.tax_rules}
  knowledge_base: ${config.paths.knowledge_base}
  config: ${config.paths.config}
`;
}

// Show help
if (process.argv.includes('--help') || process.argv.includes('-h')) {
  console.log(`
🏦 Tax Adviser MCP Server - Setup Wizard

Usage:
  npm run setup

This interactive wizard will guide you through:
- Configuring your personal data file
- Setting up Telegram notifications
- Choosing a web search provider
- Configuring the knowledge cache system
- Setting the tax year

The wizard will create a config.yaml file with your settings.
`);
  process.exit(0);
}

setup().catch((error) => {
  console.error('❌ Setup failed:', error);
  process.exit(1);
});
