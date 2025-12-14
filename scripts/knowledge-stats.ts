#!/usr/bin/env tsx

/**
 * Knowledge Stats Script
 * Display statistics about the knowledge cache
 */

import { loadConfig } from '../src/config/loader.js';
import { KnowledgeCacheService } from '../src/services/knowledge-cache.js';

async function showStats() {
  console.log('📊 Knowledge Cache Statistics\n');

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

    await knowledgeCache.initialize();

    // Get statistics
    const stats = await knowledgeCache.getStats();
    const allEntries = await knowledgeCache.getAllEntries();

    // Calculate additional stats
    const now = new Date();
    const expiredEntries = allEntries.filter((entry: any) => {
      const expiresAt = new Date(entry.expiresAt);
      return expiresAt < now;
    });

    const expiringIn7Days = allEntries.filter((entry: any) => {
      const expiresAt = new Date(entry.expiresAt);
      const daysUntil = Math.floor((expiresAt.getTime() - now.getTime()) / (1000 * 60 * 60 * 24));
      return daysUntil >= 0 && daysUntil <= 7;
    });

    const expiringIn30Days = allEntries.filter((entry: any) => {
      const expiresAt = new Date(entry.expiresAt);
      const daysUntil = Math.floor((expiresAt.getTime() - now.getTime()) / (1000 * 60 * 60 * 24));
      return daysUntil >= 0 && daysUntil <= 30;
    });

    // Display overview
    console.log('═══════════════════════════════════════');
    console.log('  OVERVIEW');
    console.log('═══════════════════════════════════════');
    console.log(`  Total Entries:        ${stats.totalEntries}`);
    console.log(`  Storage Size:         ${formatBytes(stats.storageSize)}`);
    console.log(`  Average Entry Size:   ${formatBytes(stats.storageSize / stats.totalEntries)}`);
    console.log('');

    // Display by category
    console.log('═══════════════════════════════════════');
    console.log('  BY CATEGORY');
    console.log('═══════════════════════════════════════');
    const sortedCategories = Object.entries(stats.entriesByCategory).sort(
      ([, a], [, b]) => (b as number) - (a as number)
    );
    for (const [category, count] of sortedCategories) {
      const percentage = ((count as number / stats.totalEntries) * 100).toFixed(1);
      console.log(`  ${category.padEnd(20)} ${count} (${percentage}%)`);
    }
    console.log('');

    // Display by confidence
    console.log('═══════════════════════════════════════');
    console.log('  BY CONFIDENCE LEVEL');
    console.log('═══════════════════════════════════════');
    const sortedConfidence = Object.entries(stats.entriesByConfidence).sort(
      ([, a], [, b]) => (b as number) - (a as number)
    );
    for (const [confidence, count] of sortedConfidence) {
      const percentage = ((count as number / stats.totalEntries) * 100).toFixed(1);
      const icon = confidence === 'high' ? '🟢' : confidence === 'medium' ? '🟡' : '🔴';
      console.log(`  ${icon} ${confidence.padEnd(18)} ${count} (${percentage}%)`);
    }
    console.log('');

    // Display expiry status
    console.log('═══════════════════════════════════════');
    console.log('  EXPIRY STATUS');
    console.log('═══════════════════════════════════════');
    console.log(`  ❌ Expired:           ${expiredEntries.length}`);
    console.log(`  ⚠️  Expiring (7 days):  ${expiringIn7Days.length}`);
    console.log(`  ⏰ Expiring (30 days): ${expiringIn30Days.length}`);
    console.log(`  ✅ Valid:             ${stats.totalEntries - expiredEntries.length}`);
    console.log('');

    // Display most accessed
    if (stats.mostAccessed && stats.mostAccessed.length > 0) {
      console.log('═══════════════════════════════════════');
      console.log('  MOST ACCESSED (TOP 5)');
      console.log('═══════════════════════════════════════');
      for (let i = 0; i < Math.min(5, stats.mostAccessed.length); i++) {
        const entry = stats.mostAccessed[i];
        console.log(`  ${i + 1}. ${entry.title}`);
        console.log(`     Accessed: ${entry.accessCount} times`);
        console.log(`     Category: ${entry.category}`);
        console.log('');
      }
    }

    // Display age distribution
    console.log('═══════════════════════════════════════');
    console.log('  AGE DISTRIBUTION');
    console.log('═══════════════════════════════════════');
    const ageGroups = {
      'Less than 7 days': 0,
      '7-30 days': 0,
      '30-90 days': 0,
      'More than 90 days': 0,
    };

    for (const entry of allEntries) {
      const cachedAt = new Date(entry.cachedAt);
      const ageInDays = Math.floor((now.getTime() - cachedAt.getTime()) / (1000 * 60 * 60 * 24));

      if (ageInDays < 7) {
        ageGroups['Less than 7 days']++;
      } else if (ageInDays < 30) {
        ageGroups['7-30 days']++;
      } else if (ageInDays < 90) {
        ageGroups['30-90 days']++;
      } else {
        ageGroups['More than 90 days']++;
      }
    }

    for (const [age, count] of Object.entries(ageGroups)) {
      const percentage = ((count / stats.totalEntries) * 100).toFixed(1);
      console.log(`  ${age.padEnd(20)} ${count} (${percentage}%)`);
    }
    console.log('');

    // Recommendations
    console.log('═══════════════════════════════════════');
    console.log('  RECOMMENDATIONS');
    console.log('═══════════════════════════════════════');
    const recommendations: string[] = [];

    if (expiredEntries.length > 0) {
      recommendations.push(
        `⚠️  ${expiredEntries.length} entries are expired. Run: npm run knowledge:refresh --expired`
      );
    }

    if (expiringIn7Days.length > 5) {
      recommendations.push(
        `⏰ ${expiringIn7Days.length} entries expiring in 7 days. Consider running a refresh.`
      );
    }

    const lowConfidence = stats.entriesByConfidence['low'] || 0;
    if (lowConfidence > stats.totalEntries * 0.2) {
      recommendations.push(
        `🔴 ${lowConfidence} entries have low confidence. Consider reviewing sources.`
      );
    }

    if (recommendations.length === 0) {
      console.log('  ✅ Knowledge cache is in good health!');
    } else {
      for (const rec of recommendations) {
        console.log(`  ${rec}`);
      }
    }
    console.log('');

    console.log('═══════════════════════════════════════\n');
  } catch (error) {
    console.error('❌ Error:', error);
    process.exit(1);
  }
}

/**
 * Format bytes to human-readable size
 */
function formatBytes(bytes: number): string {
  if (bytes === 0) return '0 Bytes';

  const k = 1024;
  const sizes = ['Bytes', 'KB', 'MB', 'GB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));

  return Math.round((bytes / Math.pow(k, i)) * 100) / 100 + ' ' + sizes[i];
}

// Show help
if (process.argv.includes('--help') || process.argv.includes('-h')) {
  console.log(`
📊 Knowledge Cache Statistics Tool

Usage:
  npm run knowledge:stats

Displays comprehensive statistics about your knowledge cache including:
- Total entries and storage size
- Distribution by category and confidence level
- Expiry status and age distribution
- Most accessed entries
- Health recommendations
`);
  process.exit(0);
}

showStats();
