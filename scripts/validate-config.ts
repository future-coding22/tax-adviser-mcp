#!/usr/bin/env tsx

/**
 * Config Validation Script
 * Validates configuration file and checks all dependencies
 */

import * as fs from 'fs';
import { loadConfig } from '../src/config/loader.js';

interface ValidationResult {
  valid: boolean;
  errors: string[];
  warnings: string[];
}

async function validateConfig(): Promise<ValidationResult> {
  const result: ValidationResult = {
    valid: true,
    errors: [],
    warnings: [],
  };

  console.log('🔍 Configuration Validation Tool\n');

  try {
    // Load and validate configuration
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
    console.log('Step 1: Loading Configuration');
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n');

    const config = await loadConfig();
    console.log('✅ Configuration file loaded successfully\n');

    // Validate paths
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
    console.log('Step 2: Validating Paths');
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n');

    // Check personal data file
    if (!fs.existsSync(config.paths.personal_data)) {
      result.errors.push(`Personal data file not found: ${config.paths.personal_data}`);
      console.log(`❌ Personal data file: ${config.paths.personal_data} (NOT FOUND)`);
    } else {
      console.log(`✅ Personal data file: ${config.paths.personal_data}`);
    }

    // Check tax rules file
    if (!fs.existsSync(config.paths.tax_rules)) {
      result.errors.push(`Tax rules file not found: ${config.paths.tax_rules}`);
      console.log(`❌ Tax rules file: ${config.paths.tax_rules} (NOT FOUND)`);
    } else {
      console.log(`✅ Tax rules file: ${config.paths.tax_rules}`);
    }

    // Check knowledge base directory
    if (!fs.existsSync(config.paths.knowledge_base)) {
      result.warnings.push(
        `Knowledge base directory not found: ${config.paths.knowledge_base} (will be created)`
      );
      console.log(`⚠️  Knowledge base directory: ${config.paths.knowledge_base} (will be created)`);
    } else {
      console.log(`✅ Knowledge base directory: ${config.paths.knowledge_base}`);
    }

    console.log('');

    // Validate Telegram configuration
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
    console.log('Step 3: Validating Telegram Configuration');
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n');

    if (config.telegram.enabled) {
      if (!config.telegram.bot_token) {
        result.errors.push('Telegram enabled but bot_token is missing');
        console.log('❌ Bot token: MISSING');
      } else {
        console.log('✅ Bot token: Configured');
      }

      if (!config.telegram.chat_id) {
        result.errors.push('Telegram enabled but chat_id is missing');
        console.log('❌ Chat ID: MISSING');
      } else {
        console.log('✅ Chat ID: Configured');
      }

      if (config.telegram.quiet_hours.enabled) {
        console.log(
          `✅ Quiet hours: ${config.telegram.quiet_hours.start} - ${config.telegram.quiet_hours.end}`
        );
      }
    } else {
      console.log('ℹ️  Telegram notifications: DISABLED');
      result.warnings.push('Telegram notifications are disabled - no reminders will be sent');
    }

    console.log('');

    // Validate web search configuration
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
    console.log('Step 4: Validating Web Search Configuration');
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n');

    console.log(`✅ Provider: ${config.web_search.provider}`);

    if (config.web_search.provider === 'brave') {
      if (!config.web_search.brave_api_key) {
        result.errors.push('Brave Search selected but API key is missing');
        console.log('❌ Brave API key: MISSING');
      } else {
        console.log('✅ Brave API key: Configured');
      }
    }

    console.log(`✅ Max results: ${config.web_search.max_results}`);
    console.log(`✅ Timeout: ${config.web_search.timeout}ms`);

    console.log('');

    // Validate knowledge cache configuration
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
    console.log('Step 5: Validating Knowledge Cache Configuration');
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n');

    if (config.knowledge.enabled) {
      console.log('✅ Knowledge cache: ENABLED');
      console.log(`✅ Auto-cache: ${config.knowledge.auto_cache}`);
      console.log(`✅ Track in git: ${config.knowledge.track_in_git}`);
      console.log(`✅ Refresh strategy: ${config.knowledge.refresh_strategy}`);
      console.log(`✅ Change notifications: ${config.knowledge.change_notifications}`);
      console.log(`✅ Default expiry: ${config.knowledge.default_expiry_days} days`);

      if (
        config.knowledge.refresh_strategy === 'weekly' &&
        !config.telegram.enabled &&
        config.knowledge.change_notifications !== 'disabled'
      ) {
        result.warnings.push(
          'Knowledge refresh notifications enabled but Telegram is disabled'
        );
        console.log('\n⚠️  Change notifications enabled but Telegram is disabled');
      }
    } else {
      console.log('ℹ️  Knowledge cache: DISABLED');
      result.warnings.push('Knowledge cache is disabled - no learning will occur');
    }

    console.log('');

    // Validate tax configuration
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
    console.log('Step 6: Validating Tax Configuration');
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n');

    const currentYear = new Date().getFullYear();
    console.log(`✅ Tax year: ${config.tax.year}`);

    if (config.tax.year < currentYear - 1) {
      result.warnings.push(
        `Tax year is set to ${config.tax.year}, which is more than 1 year old`
      );
      console.log(`⚠️  Tax year is ${currentYear - config.tax.year} years old`);
    } else if (config.tax.year > currentYear + 1) {
      result.warnings.push(`Tax year is set to ${config.tax.year}, which is in the future`);
      console.log(`⚠️  Tax year is in the future`);
    }

    console.log('');

    // Validate reminder configuration
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
    console.log('Step 7: Validating Reminder Configuration');
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n');

    if (config.reminders.enabled) {
      console.log('✅ Reminders: ENABLED');
      console.log(`✅ Deadline check: ${config.reminders.deadline_check_time}`);
      console.log(`✅ Payment check: ${config.reminders.payment_check_time}`);

      if (!config.telegram.enabled) {
        result.errors.push('Reminders enabled but Telegram is disabled');
        console.log('\n❌ Reminders require Telegram to be enabled!');
      }
    } else {
      console.log('ℹ️  Reminders: DISABLED');
      result.warnings.push('Reminders are disabled - no automatic notifications');
    }

    console.log('');
  } catch (error) {
    result.valid = false;
    result.errors.push(`Failed to load configuration: ${error instanceof Error ? error.message : 'Unknown error'}`);
    console.error('❌ Failed to load configuration:', error);
  }

  // Summary
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
  console.log('Validation Summary');
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n');

  if (result.errors.length > 0) {
    result.valid = false;
    console.log(`❌ ERRORS (${result.errors.length}):\n`);
    for (const error of result.errors) {
      console.log(`   • ${error}`);
    }
    console.log('');
  }

  if (result.warnings.length > 0) {
    console.log(`⚠️  WARNINGS (${result.warnings.length}):\n`);
    for (const warning of result.warnings) {
      console.log(`   • ${warning}`);
    }
    console.log('');
  }

  if (result.valid && result.warnings.length === 0) {
    console.log('✅ Configuration is valid and ready to use!\n');
  } else if (result.valid) {
    console.log('✅ Configuration is valid (with warnings)\n');
  } else {
    console.log('❌ Configuration has errors and needs to be fixed\n');
  }

  return result;
}

// Show help
if (process.argv.includes('--help') || process.argv.includes('-h')) {
  console.log(`
🔍 Configuration Validation Tool

Usage:
  npm run validate

Validates your configuration file and checks:
- Configuration file syntax and schema
- File paths and directory existence
- Telegram credentials (if enabled)
- Web search provider settings
- Knowledge cache configuration
- Tax year settings
- Reminder configuration

Exit codes:
  0 - Configuration is valid
  1 - Configuration has errors
`);
  process.exit(0);
}

validateConfig()
  .then((result) => {
    process.exit(result.valid ? 0 : 1);
  })
  .catch((error) => {
    console.error('❌ Validation failed:', error);
    process.exit(1);
  });
