#!/usr/bin/env tsx

/**
 * Knowledge Refresh Script
 * Manually refresh expired or all knowledge cache entries
 */

import { loadConfig } from '../src/config/loader.js';
import { KnowledgeCacheService } from '../src/services/knowledge-cache.js';
import { WebSearchService } from '../src/services/web-search.js';

interface RefreshOptions {
  all?: boolean;
  category?: string;
  expired?: boolean;
  force?: boolean;
}

async function refreshKnowledge(options: RefreshOptions = {}) {
  console.log('🔄 Knowledge Cache Refresh Tool\n');

  try {
    // Load configuration
    const config = await loadConfig();

    if (!config.knowledge.enabled) {
      console.error('❌ Knowledge cache is disabled in configuration');
      process.exit(1);
    }

    // Initialize services
    const knowledgeCache = new KnowledgeCacheService(
      config.paths.knowledge_base,
      config.knowledge
    );
    const webSearchService = new WebSearchService(config.web_search);

    await knowledgeCache.initialize();

    // Get all entries
    const allEntries = await knowledgeCache.getAllEntries();
    console.log(`📚 Total entries in cache: ${allEntries.length}\n`);

    // Filter entries to refresh
    let entriesToRefresh = allEntries;

    if (options.expired && !options.all) {
      entriesToRefresh = allEntries.filter((entry: any) => {
        const expiresAt = new Date(entry.expiresAt);
        return expiresAt < new Date();
      });
      console.log(`🔍 Found ${entriesToRefresh.length} expired entries\n`);
    }

    if (options.category) {
      entriesToRefresh = entriesToRefresh.filter(
        (entry: any) => entry.category === options.category
      );
      console.log(`🏷️  Filtered to ${entriesToRefresh.length} entries in category: ${options.category}\n`);
    }

    if (entriesToRefresh.length === 0) {
      console.log('✅ No entries to refresh');
      return;
    }

    console.log(`🔄 Refreshing ${entriesToRefresh.length} entries...\n`);

    let refreshed = 0;
    let failed = 0;

    for (const entry of entriesToRefresh) {
      try {
        process.stdout.write(`  Refreshing: ${entry.title}... `);

        // Search web for updated information
        const query = entry.originalQuery || entry.title;
        const webResults = await webSearchService.search({
          query: `${query} ${entry.category} ${entry.taxYear} site:belastingdienst.nl`,
          maxResults: 1,
          language: 'nl',
        });

        if (webResults.results.length > 0) {
          const result = webResults.results[0];

          // Update cache entry
          await knowledgeCache.updateEntry(entry.id, {
            content: result.content || result.snippet,
            summary: result.snippet,
            sources: [result.url],
            confidence: 'high',
            expiresAt: new Date(Date.now() + 90 * 24 * 60 * 60 * 1000).toISOString(),
          });

          console.log('✅');
          refreshed++;
        } else {
          console.log('❌ (no results)');
          failed++;
        }
      } catch (error) {
        console.log(`❌ (${error instanceof Error ? error.message : 'error'})`);
        failed++;
      }
    }

    console.log(`\n📊 Refresh Summary:`);
    console.log(`   ✅ Refreshed: ${refreshed}`);
    console.log(`   ❌ Failed: ${failed}`);
    console.log(`   📈 Success rate: ${((refreshed / entriesToRefresh.length) * 100).toFixed(1)}%`);
  } catch (error) {
    console.error('❌ Error:', error);
    process.exit(1);
  }
}

// Parse command line arguments
const args = process.argv.slice(2);
const options: RefreshOptions = {
  all: args.includes('--all'),
  expired: args.includes('--expired'),
  force: args.includes('--force'),
  category: args.find((arg) => arg.startsWith('--category='))?.split('=')[1],
};

// Show help
if (args.includes('--help') || args.includes('-h')) {
  console.log(`
📚 Knowledge Cache Refresh Tool

Usage:
  npm run knowledge:refresh [options]

Options:
  --all              Refresh all entries (ignores expiry)
  --expired          Refresh only expired entries (default)
  --category=<name>  Refresh only entries in specific category
  --force            Force refresh even if not expired
  -h, --help         Show this help message

Examples:
  npm run knowledge:refresh --expired
  npm run knowledge:refresh --all
  npm run knowledge:refresh --category=box3
  npm run knowledge:refresh --category=btw --force
`);
  process.exit(0);
}

// Default to expired if nothing specified
if (!options.all && !options.expired) {
  options.expired = true;
}

refreshKnowledge(options);
