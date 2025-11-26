import { KnowledgeCacheService } from '../services/knowledge-cache.js';
import type { KnowledgeIndex, KnowledgeEntry } from '../types/index.js';

/**
 * Knowledge loader - loads and provides access to cached knowledge
 */
export class KnowledgeLoader {
  private cacheService: KnowledgeCacheService;
  private index: KnowledgeIndex | null = null;
  private loaded: boolean = false;

  constructor(knowledgePath: string) {
    this.cacheService = new KnowledgeCacheService(knowledgePath);
  }

  /**
   * Load knowledge cache on startup
   */
  async load(): Promise<void> {
    await this.cacheService.initialize();
    this.loaded = true;
  }

  /**
   * Get entry by ID
   */
  async getEntry(id: string): Promise<KnowledgeEntry | null> {
    this.ensureLoaded();
    return this.cacheService.getEntry(id);
  }

  /**
   * Search knowledge base
   */
  async search(query: string, options?: {
    category?: string;
    taxYear?: number;
    maxResults?: number;
  }) {
    this.ensureLoaded();
    return this.cacheService.searchLocal({
      query,
      ...options,
    });
  }

  /**
   * Check if knowledge exists for a query
   */
  async hasKnowledge(query: string, maxAgeDays?: number) {
    this.ensureLoaded();
    return this.cacheService.hasRecentKnowledge(query, maxAgeDays);
  }

  /**
   * Get statistics
   */
  async getStats() {
    this.ensureLoaded();
    return this.cacheService.getStats();
  }

  /**
   * Get cache service for advanced operations
   */
  getCacheService(): KnowledgeCacheService {
    return this.cacheService;
  }

  /**
   * Ensure cache is loaded
   */
  private ensureLoaded(): void {
    if (!this.loaded) {
      throw new Error('Knowledge cache not loaded. Call load() first.');
    }
  }
}

/**
 * Create knowledge loader
 */
export function createKnowledgeLoader(knowledgePath: string): KnowledgeLoader {
  return new KnowledgeLoader(knowledgePath);
}
