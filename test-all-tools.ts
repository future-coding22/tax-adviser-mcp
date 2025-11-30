#!/usr/bin/env tsx

/**
 * Comprehensive test script for all MCP tools
 * Tests each tool with sample inputs to verify functionality
 */

import path from 'path';
import { fileURLToPath } from 'url';
import { dirname } from 'path';
import { loadConfig } from './src/config/loader.js';
import { createToolRegistry } from './src/tools/index.js';
import { personalProfileLoader } from './src/context/personal-loader.js';
import { createDutchTaxKnowledge } from './src/context/dutch-tax-knowledge.js';
import { createTaxKnowledgeFactory } from './src/knowledge/TaxKnowledgeFactory.js';
import { KnowledgeCacheService } from './src/services/knowledge-cache.js';
import { TelegramService } from './src/services/telegram.js';
import { WebSearchService } from './src/services/web-search.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
const PROJECT_ROOT = __dirname;

interface TestResult {
  tool: string;
  status: 'PASS' | 'FAIL' | 'SKIP';
  error?: string;
  output?: any;
  duration: number;
}

const results: TestResult[] = [];

function logSection(title: string) {
  console.log('\n' + '='.repeat(70));
  console.log(`  ${title}`);
  console.log('='.repeat(70));
}

function logTest(tool: string, status: 'PASS' | 'FAIL' | 'SKIP', duration: number, error?: string) {
  const statusIcon = status === 'PASS' ? '✅' : status === 'FAIL' ? '❌' : '⏭️';
  console.log(`${statusIcon} [${status}] ${tool} (${duration}ms)`);
  if (error) {
    console.log(`   Error: ${error}`);
  }
}

async function testTool(
  registry: any,
  toolName: string,
  input: any = {},
  description?: string
): Promise<TestResult> {
  const startTime = Date.now();
  try {
    console.log(`\n📝 Testing: ${toolName}`);
    if (description) {
      console.log(`   ${description}`);
    }
    console.log(`   Input: ${JSON.stringify(input, null, 2)}`);

    const result = await registry.executeTool(toolName, input);
    const duration = Date.now() - startTime;

    console.log(`   ✓ Success`);
    console.log(`   Output preview: ${JSON.stringify(result).substring(0, 200)}...`);

    logTest(toolName, 'PASS', duration);
    return { tool: toolName, status: 'PASS', output: result, duration };
  } catch (error) {
    const duration = Date.now() - startTime;
    const errorMsg = error instanceof Error ? error.message : String(error);
    logTest(toolName, 'FAIL', duration, errorMsg);
    return { tool: toolName, status: 'FAIL', error: errorMsg, duration };
  }
}

async function main() {
  console.log('╔════════════════════════════════════════════════════════════════╗');
  console.log('║        Tax Adviser MCP - Comprehensive Tool Testing           ║');
  console.log('╚════════════════════════════════════════════════════════════════╝');

  try {
    // Load configuration
    logSection('Initializing Server Components');
    console.log('Loading configuration...');
    const configPath = path.join(PROJECT_ROOT, 'data', 'config.yaml');
    const config = await loadConfig(configPath);

    console.log('Initializing services...');
    const taxRulesPath = path.isAbsolute(config.paths.tax_rules)
      ? config.paths.tax_rules
      : path.join(PROJECT_ROOT, config.paths.tax_rules);

    const knowledgeBasePath = path.isAbsolute(config.paths.knowledge_base)
      ? config.paths.knowledge_base
      : path.join(PROJECT_ROOT, config.paths.knowledge_base);

    const taxKnowledge = createDutchTaxKnowledge(taxRulesPath);
    const taxKnowledgeFactory = createTaxKnowledgeFactory({
      taxRulesDir: path.dirname(taxRulesPath),
      glossaryDir: path.join(PROJECT_ROOT, 'knowledge', '_glossary'),
      defaultCountry: 'NL',
    });
    const knowledgeCache = new KnowledgeCacheService(knowledgeBasePath);
    const telegramService = new TelegramService(config.telegram);
    const webSearchService = new WebSearchService(config.search);

    const dependencies = {
      personalLoader: personalProfileLoader,
      taxKnowledge,
      taxKnowledgeFactory,
      knowledgeCache,
      telegramService,
      webSearchService,
    };

    const registry = createToolRegistry(config, dependencies);
    console.log('✓ Initialization complete');

    // Test each tool
    logSection('Testing MCP Tools');

    // 1. Get Tax Obligations
    results.push(
      await testTool(
        registry,
        'get_tax_obligations',
        { year: 2024 },
        'Get all taxes user is liable for based on profile'
      )
    );

    // 2. Get Upcoming Dues
    results.push(
      await testTool(
        registry,
        'get_upcoming_dues',
        { days_ahead: 90, include_autopay: true },
        'Get all upcoming payments from recurring schedule'
      )
    );

    // 3. Send Reminder (skip if no Telegram configured)
    if (config.telegram?.enabled && config.telegram?.bot_token) {
      results.push(
        await testTool(
          registry,
          'send_reminder',
          {
            message: 'Test reminder from MCP tool test',
            schedule: 'immediate',
          },
          'Send a test Telegram reminder'
        )
      );
    } else {
      console.log('\n⏭️  Skipping send_reminder (Telegram not configured)');
      results.push({
        tool: 'send_reminder',
        status: 'SKIP',
        error: 'Telegram not configured',
        duration: 0,
      });
    }

    // 4. Calculate Tax Estimate
    results.push(
      await testTool(
        registry,
        'calculate_tax_estimate',
        { year: 2024 },
        'Calculate comprehensive tax estimate (Box 1/2/3, BTW)'
      )
    );

    // 5. Search Dutch Tax Law
    if (config.search?.enabled) {
      results.push(
        await testTool(
          registry,
          'search_dutch_tax_law',
          { query: 'hypotheekrenteaftrek 2024' },
          'Search Dutch tax law with web scraping'
        )
      );
    } else {
      console.log('\n⏭️  Skipping search_dutch_tax_law (Web search not enabled)');
      results.push({
        tool: 'search_dutch_tax_law',
        status: 'SKIP',
        error: 'Web search not enabled',
        duration: 0,
      });
    }

    // 6. Search Knowledge Base
    results.push(
      await testTool(
        registry,
        'search_knowledge_base',
        { query: 'box 3 vermogensrendementsheffing', limit: 5 },
        'Search local knowledge cache'
      )
    );

    // 7. Get Knowledge Entry (need to get a valid ID first)
    const searchResult = await registry.executeTool('search_knowledge_base', {
      query: 'box',
      limit: 1,
    });
    if (searchResult.results && searchResult.results.length > 0) {
      const entryId = searchResult.results[0].id;
      results.push(
        await testTool(
          registry,
          'get_knowledge_entry',
          { id: entryId },
          `Retrieve full knowledge entry by ID: ${entryId}`
        )
      );
    } else {
      console.log('\n⏭️  Skipping get_knowledge_entry (no entries in cache)');
      results.push({
        tool: 'get_knowledge_entry',
        status: 'SKIP',
        error: 'No entries in knowledge cache',
        duration: 0,
      });
    }

    // 8. Refresh Knowledge
    results.push(
      await testTool(
        registry,
        'refresh_knowledge',
        { max_entries: 1, force: false },
        'Manually refresh expired knowledge entries'
      )
    );

    // 9. Get Law Changes
    results.push(
      await testTool(
        registry,
        'get_law_changes',
        { from_year: 2023, to_year: 2024 },
        'Detect tax law changes between years'
      )
    );

    // 10. Get Spending Advice
    results.push(
      await testTool(
        registry,
        'get_spending_advice',
        { focus: 'tax_reduction', monthly_budget: 5000 },
        'Get personalized financial optimization advice'
      )
    );

    // 11. Add Country
    results.push(
      await testTool(
        registry,
        'add_country',
        { country_code: 'DE', tax_year: 2024 },
        'Autonomously discover and set up new country support'
      )
    );

    // Print Summary
    logSection('Test Summary');

    const passed = results.filter((r) => r.status === 'PASS').length;
    const failed = results.filter((r) => r.status === 'FAIL').length;
    const skipped = results.filter((r) => r.status === 'SKIP').length;
    const total = results.length;

    console.log(`\nTotal Tests: ${total}`);
    console.log(`✅ Passed: ${passed}`);
    console.log(`❌ Failed: ${failed}`);
    console.log(`⏭️  Skipped: ${skipped}`);
    console.log(`\nSuccess Rate: ${((passed / (total - skipped)) * 100).toFixed(1)}%`);

    // Print failed tests details
    if (failed > 0) {
      logSection('Failed Tests Details');
      results
        .filter((r) => r.status === 'FAIL')
        .forEach((r) => {
          console.log(`\n❌ ${r.tool}`);
          console.log(`   Error: ${r.error}`);
        });
    }

    // Print performance stats
    logSection('Performance Stats');
    const avgDuration =
      results.reduce((sum, r) => sum + r.duration, 0) / results.length;
    console.log(`\nAverage execution time: ${avgDuration.toFixed(0)}ms`);
    console.log(`Total execution time: ${results.reduce((sum, r) => sum + r.duration, 0)}ms`);

    console.log('\n✨ Testing complete!\n');

    // Exit with appropriate code
    process.exit(failed > 0 ? 1 : 0);
  } catch (error) {
    console.error('\n❌ Fatal error during testing:');
    console.error(error);
    process.exit(1);
  }
}

main();
