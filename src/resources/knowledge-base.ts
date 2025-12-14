import type { ResourceHandler, MCPResource, ResourceContent } from './index.js';
import { createKnowledgeLoader } from '../context/knowledge-loader.js';

/**
 * Knowledge base resource handler
 * Exposes knowledge cache index and statistics as MCP resources
 */
export class KnowledgeBaseResource implements ResourceHandler {
  private knowledgePath: string = './knowledge';
  private loader: any = null;

  /**
   * Set knowledge path
   */
  setKnowledgePath(path: string): void {
    this.knowledgePath = path;
  }

  /**
   * Get or create loader
   */
  private async getLoader() {
    if (!this.loader) {
      this.loader = createKnowledgeLoader(this.knowledgePath);
      await this.loader.load();
    }
    return this.loader;
  }

  /**
   * List available knowledge base resources
   */
  async list(): Promise<MCPResource[]> {
    return [
      {
        uri: 'knowledge://base',
        name: 'Knowledge Cache Index',
        description:
          'Complete index of all cached Dutch tax knowledge entries with metadata and statistics',
        mimeType: 'application/json',
      },
      {
        uri: 'knowledge://stats',
        name: 'Knowledge Cache Statistics',
        description:
          'Statistics about the knowledge cache: total entries, categories, age, storage size, etc.',
        mimeType: 'application/json',
      },
      {
        uri: 'knowledge://categories',
        name: 'Knowledge Categories',
        description: 'List of all knowledge categories with entry counts',
        mimeType: 'application/json',
      },
      {
        uri: 'knowledge://recent',
        name: 'Recently Updated Knowledge',
        description: 'Knowledge entries updated in the last 30 days',
        mimeType: 'application/json',
      },
      {
        uri: 'knowledge://expired',
        name: 'Expired Knowledge Entries',
        description: 'Knowledge entries that have expired and may need refreshing',
        mimeType: 'application/json',
      },
    ];
  }

  /**
   * Read knowledge base resource
   */
  async read(uri: string): Promise<ResourceContent> {
    const loader = await this.getLoader();
    const cacheService = loader.getCacheService();

    switch (uri) {
      case 'knowledge://base':
        return this.getIndex(uri, cacheService);

      case 'knowledge://stats':
        return this.getStats(uri, cacheService);

      case 'knowledge://categories':
        return this.getCategories(uri, cacheService);

      case 'knowledge://recent':
        return this.getRecent(uri, cacheService);

      case 'knowledge://expired':
        return this.getExpired(uri, cacheService);

      default:
        throw new Error(`Unknown knowledge resource: ${uri}`);
    }
  }

  /**
   * Get knowledge index
   */
  private async getIndex(uri: string, cacheService: any): Promise<ResourceContent> {
    await cacheService.initialize();
    const stats = await cacheService.getStats();

    // Get all entries
    const results = await cacheService.searchLocal({
      query: '',
      maxResults: 1000,
      includeExpired: true,
    });

    return {
      uri,
      mimeType: 'application/json',
      content: {
        version: '1.0',
        total_entries: stats.totalEntries,
        categories: Object.keys(stats.entriesByCategory),
        entries: results.map((r: any) => ({
          id: r.entry.id,
          title: r.entry.title,
          category: r.entry.category,
          tags: r.entry.tags,
          summary: r.entry.summary,
          tax_years: r.entry.taxYears,
          created_at: r.entry.createdAt,
          updated_at: r.entry.updatedAt,
          expires_at: r.entry.expiresAt,
          is_expired: r.entry.expiresAt ? new Date(r.entry.expiresAt) < new Date() : false,
          relevance_score: r.entry.relevanceScore,
          source_count: r.entry.sources.length,
        })),
      },
    };
  }

  /**
   * Get knowledge statistics
   */
  private async getStats(uri: string, cacheService: any): Promise<ResourceContent> {
    await cacheService.initialize();
    const stats = await cacheService.getStats();

    return {
      uri,
      mimeType: 'application/json',
      content: {
        total_entries: stats.totalEntries,
        entries_by_category: stats.entriesByCategory,
        entries_by_confidence: stats.entriesByConfidence,
        expired_entries: stats.expiredEntries,
        recently_updated: stats.recentlyUpdated,
        average_age_days: stats.averageAge,
        storage_size: stats.storageSize,
        most_accessed: stats.mostAccessed.map((e: any) => ({
          id: e.id,
          title: e.title,
          category: e.category,
          access_score: e.relevanceScore,
        })),
        oldest_entry: stats.oldestEntry
          ? {
              id: stats.oldestEntry.id,
              title: stats.oldestEntry.title,
              created_at: stats.oldestEntry.createdAt,
            }
          : null,
        newest_entry: stats.newestEntry
          ? {
              id: stats.newestEntry.id,
              title: stats.newestEntry.title,
              created_at: stats.newestEntry.createdAt,
            }
          : null,
      },
    };
  }

  /**
   * Get categories with entry counts
   */
  private async getCategories(uri: string, cacheService: any): Promise<ResourceContent> {
    await cacheService.initialize();
    const stats = await cacheService.getStats();

    const categories = Object.entries(stats.entriesByCategory).map(([category, count]) => ({
      category,
      count,
      percentage: ((count as number / stats.totalEntries) * 100).toFixed(1),
    }));

    // Sort by count descending
    categories.sort((a, b) => (b.count as number) - (a.count as number));

    return {
      uri,
      mimeType: 'application/json',
      content: {
        total_categories: categories.length,
        categories,
      },
    };
  }

  /**
   * Get recently updated entries
   */
  private async getRecent(uri: string, cacheService: any): Promise<ResourceContent> {
    await cacheService.initialize();

    const results = await cacheService.searchLocal({
      query: '',
      maxResults: 1000,
      includeExpired: true,
    });

    const thirtyDaysAgo = Date.now() - 30 * 24 * 60 * 60 * 1000;
    const recentEntries = results
      .filter((r: any) => new Date(r.entry.updatedAt).getTime() > thirtyDaysAgo)
      .map((r: any) => ({
        id: r.entry.id,
        title: r.entry.title,
        category: r.entry.category,
        updated_at: r.entry.updatedAt,
        days_ago: Math.floor(
          (Date.now() - new Date(r.entry.updatedAt).getTime()) / (1000 * 60 * 60 * 24)
        ),
        summary: r.entry.summary,
      }));

    // Sort by update date descending
    recentEntries.sort(
      (a: any, b: any) => new Date(b.updated_at).getTime() - new Date(a.updated_at).getTime()
    );

    return {
      uri,
      mimeType: 'application/json',
      content: {
        count: recentEntries.length,
        entries: recentEntries,
      },
    };
  }

  /**
   * Get expired entries
   */
  private async getExpired(uri: string, cacheService: any): Promise<ResourceContent> {
    await cacheService.initialize();

    const expiredEntries = await cacheService.getExpiredEntries();

    const entries = expiredEntries.map((e: any) => ({
      id: e.id,
      title: e.title,
      category: e.category,
      expired_at: e.expiresAt,
      days_expired: Math.floor(
        (Date.now() - new Date(e.expiresAt).getTime()) / (1000 * 60 * 60 * 24)
      ),
      summary: e.summary,
      tax_years: e.taxYears,
    }));

    // Sort by expiry date ascending (oldest expired first)
    entries.sort(
      (a: any, b: any) => new Date(a.expired_at).getTime() - new Date(b.expired_at).getTime()
    );

    return {
      uri,
      mimeType: 'application/json',
      content: {
        count: entries.length,
        needs_refresh: entries.length > 0,
        entries,
      },
    };
  }
}
