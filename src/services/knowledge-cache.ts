import { readFileSync, writeFileSync, existsSync, mkdirSync, readdirSync, statSync } from 'fs';
import { join, resolve, dirname } from 'path';
import matter from 'gray-matter';
import type {
  KnowledgeIndex,
  KnowledgeIndexEntry,
  KnowledgeEntry,
  KnowledgeSearchQuery,
  KnowledgeSearchResult,
  CacheOptions,
  RefreshOptions,
  RefreshResult,
  DetectedChange,
  KnowledgeStats,
  ExportOptions,
  ExportResult,
} from '../types/index.js';

/**
 * Knowledge cache service - manages cached Dutch tax knowledge
 */
export class KnowledgeCacheService {
  private knowledgePath: string;
  private indexPath: string;
  private index: KnowledgeIndex | null = null;

  constructor(basePath: string) {
    this.knowledgePath = resolve(basePath);
    this.indexPath = join(this.knowledgePath, '.index.json');
  }

  /**
   * Initialize the knowledge cache system
   */
  async initialize(): Promise<void> {
    // Create knowledge directory if it doesn't exist
    if (!existsSync(this.knowledgePath)) {
      mkdirSync(this.knowledgePath, { recursive: true });
    }

    // Load or create index
    if (existsSync(this.indexPath)) {
      this.index = this.loadIndex();
    } else {
      this.index = this.createEmptyIndex();
      this.saveIndex();
    }
  }

  /**
   * Load the knowledge index
   */
  private loadIndex(): KnowledgeIndex {
    try {
      const content = readFileSync(this.indexPath, 'utf-8');
      return JSON.parse(content);
    } catch (error) {
      throw new Error(`Failed to load knowledge index: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  /**
   * Save the knowledge index
   */
  private saveIndex(): void {
    if (!this.index) {
      throw new Error('No index to save');
    }

    this.index.lastUpdated = new Date().toISOString();
    this.index.totalEntries = this.index.entries.length;

    writeFileSync(this.indexPath, JSON.stringify(this.index, null, 2), 'utf-8');
  }

  /**
   * Create an empty index
   */
  private createEmptyIndex(): KnowledgeIndex {
    return {
      version: '1.0',
      lastUpdated: new Date().toISOString(),
      entries: [],
      categories: [],
      totalEntries: 0,
    };
  }

  /**
   * Save a knowledge entry from web search results
   */
  async cacheEntry(
    query: string,
    content: string,
    summary: string,
    sources: Array<{ url: string; title: string }>,
    options: CacheOptions
  ): Promise<{ success: boolean; entryId?: string; error?: string }> {
    try {
      await this.ensureInitialized();

      // Generate unique ID
      const id = this.generateId(query, options.category);

      // Create entry
      const entry: KnowledgeIndexEntry = {
        id,
        filePath: `${options.category}/${id}.md`,
        title: this.generateTitle(query),
        category: options.category,
        tags: options.tags || this.extractTags(query),
        sources: sources.map((s) => ({
          ...s,
          accessedAt: new Date().toISOString(),
        })),
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
        expiresAt: options.expiresIn
          ? this.calculateExpiryDate(options.expiresIn).toISOString()
          : undefined,
        supersedes: options.supersedes,
        relevanceScore: 100,
        taxYears: options.taxYears || [new Date().getFullYear()],
        summary,
      };

      // Save markdown file with frontmatter
      await this.saveEntryFile(entry, content);

      // Update index
      this.addToIndex(entry);
      this.saveIndex();

      return { success: true, entryId: id };
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error',
      };
    }
  }

  /**
   * Save entry as markdown file with frontmatter
   */
  private async saveEntryFile(entry: KnowledgeIndexEntry, content: string): Promise<void> {
    const filePath = join(this.knowledgePath, entry.filePath);
    const dir = dirname(filePath);

    // Ensure directory exists
    if (!existsSync(dir)) {
      mkdirSync(dir, { recursive: true });
    }

    // Create frontmatter
    const frontmatter = {
      id: entry.id,
      title: entry.title,
      category: entry.category,
      tags: entry.tags,
      sources: entry.sources,
      created_at: entry.createdAt,
      updated_at: entry.updatedAt,
      expires_at: entry.expiresAt,
      tax_years: entry.taxYears,
      confidence: 'high',
      ...(entry.supersedes && { supersedes: entry.supersedes }),
    };

    // Create markdown with frontmatter
    const markdown = matter.stringify(content, frontmatter);

    writeFileSync(filePath, markdown, 'utf-8');
  }

  /**
   * Search local knowledge cache
   */
  async searchLocal(query: KnowledgeSearchQuery): Promise<KnowledgeSearchResult[]> {
    await this.ensureInitialized();

    let results = this.index!.entries;

    // Filter by category
    if (query.category) {
      results = results.filter((e) => e.category === query.category);
    }

    // Filter by tax year
    if (query.taxYear) {
      results = results.filter((e) => e.taxYears.includes(query.taxYear!));
    }

    // Filter by tags
    if (query.tags && query.tags.length > 0) {
      results = results.filter((e) => query.tags!.some((tag) => e.tags.includes(tag)));
    }

    // Filter expired entries
    if (!query.includeExpired) {
      const now = new Date();
      results = results.filter((e) => !e.expiresAt || new Date(e.expiresAt) > now);
    }

    // Calculate relevance scores
    const scoredResults = results.map((entry) => ({
      entry,
      relevance: this.calculateRelevance(entry, query.query),
      matchedFields: this.getMatchedFields(entry, query.query),
      excerpt: this.extractExcerpt(entry, query.query),
    }));

    // Filter by minimum relevance
    const minRelevance = query.minRelevance || 0;
    const filteredResults = scoredResults.filter((r) => r.relevance >= minRelevance);

    // Sort by relevance
    const sortedResults = filteredResults.sort((a, b) => b.relevance - a.relevance);

    // Limit results
    const maxResults = query.maxResults || 10;
    return sortedResults.slice(0, maxResults);
  }

  /**
   * Get a specific knowledge entry by ID
   */
  async getEntry(id: string): Promise<KnowledgeEntry | null> {
    await this.ensureInitialized();

    const indexEntry = this.index!.entries.find((e) => e.id === id);
    if (!indexEntry) {
      return null;
    }

    // Load full entry from file
    const filePath = join(this.knowledgePath, indexEntry.filePath);
    if (!existsSync(filePath)) {
      return null;
    }

    const fileContent = readFileSync(filePath, 'utf-8');
    const { data: frontmatter, content } = matter(fileContent);

    // Increment access count (for tracking popular entries)
    this.recordAccess(id);

    return {
      id: indexEntry.id,
      title: indexEntry.title,
      category: indexEntry.category,
      tags: indexEntry.tags,
      sources: indexEntry.sources,
      content,
      summary: indexEntry.summary,
      taxYears: indexEntry.taxYears,
      createdAt: new Date(indexEntry.createdAt),
      updatedAt: new Date(indexEntry.updatedAt),
      expiresAt: indexEntry.expiresAt ? new Date(indexEntry.expiresAt) : undefined,
      confidence: (frontmatter.confidence || 'medium') as 'low' | 'medium' | 'high',
      supersedes: indexEntry.supersedes,
      relatedEntries: this.findRelatedEntries(indexEntry),
    };
  }

  /**
   * Check if recent knowledge exists on a topic
   */
  async hasRecentKnowledge(
    query: string,
    maxAgeDays: number = 30
  ): Promise<{ found: boolean; entry?: KnowledgeIndexEntry; isExpired: boolean }> {
    await this.ensureInitialized();

    const results = await this.searchLocal({ query, maxResults: 1 });

    if (results.length === 0) {
      return { found: false, isExpired: false };
    }

    const entry = results[0].entry;
    const ageMs = Date.now() - new Date(entry.updatedAt).getTime();
    const ageDays = ageMs / (1000 * 60 * 60 * 24);
    const isExpired = entry.expiresAt ? new Date(entry.expiresAt) < new Date() : false;

    return {
      found: ageDays <= maxAgeDays && !isExpired,
      entry,
      isExpired,
    };
  }

  /**
   * Mark entry as expired
   */
  async invalidateEntry(id: string): Promise<void> {
    await this.ensureInitialized();

    const entry = this.index!.entries.find((e) => e.id === id);
    if (entry) {
      entry.expiresAt = new Date().toISOString();
      this.saveIndex();
    }
  }

  /**
   * Get entries that need refreshing
   */
  async getExpiredEntries(): Promise<KnowledgeIndexEntry[]> {
    await this.ensureInitialized();

    const now = new Date();
    return this.index!.entries.filter((e) => e.expiresAt && new Date(e.expiresAt) < now);
  }

  /**
   * Record access to an entry (for tracking popularity)
   */
  private recordAccess(id: string): void {
    const entry = this.index!.entries.find((e) => e.id === id);
    if (entry) {
      entry.relevanceScore = Math.min(100, entry.relevanceScore + 1);
      this.saveIndex();
    }
  }

  /**
   * Detect changes between old and new entries
   */
  detectChanges(oldEntry: KnowledgeEntry, newContent: string): DetectedChange[] {
    const changes: DetectedChange[] = [];

    // Simple change detection (can be enhanced with more sophisticated diff)
    if (oldEntry.content !== newContent) {
      changes.push({
        field: 'content',
        oldValue: oldEntry.content.substring(0, 100) + '...',
        newValue: newContent.substring(0, 100) + '...',
        significance: 'medium',
      });
    }

    return changes;
  }

  /**
   * Get knowledge cache statistics
   */
  async getStats(): Promise<KnowledgeStats> {
    await this.ensureInitialized();

    const entriesByCategory: Record<string, number> = {};
    const entriesByConfidence: Record<string, number> = { low: 0, medium: 0, high: 0 };

    let expiredCount = 0;
    let recentCount = 0;
    let totalAge = 0;
    const now = Date.now();
    const thirtyDaysAgo = now - 30 * 24 * 60 * 60 * 1000;

    for (const entry of this.index!.entries) {
      // By category
      entriesByCategory[entry.category] = (entriesByCategory[entry.category] || 0) + 1;

      // Expired
      if (entry.expiresAt && new Date(entry.expiresAt) < new Date()) {
        expiredCount++;
      }

      // Recently updated
      if (new Date(entry.updatedAt).getTime() > thirtyDaysAgo) {
        recentCount++;
      }

      // Age
      const age = now - new Date(entry.createdAt).getTime();
      totalAge += age;
    }

    const avgAgeDays = this.index!.entries.length > 0 ? totalAge / this.index!.entries.length / (1000 * 60 * 60 * 24) : 0;

    // Most accessed
    const mostAccessed = [...this.index!.entries]
      .sort((a, b) => b.relevanceScore - a.relevanceScore)
      .slice(0, 5);

    // Oldest and newest
    const sortedByDate = [...this.index!.entries].sort(
      (a, b) => new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime()
    );
    const oldestEntry = sortedByDate[0];
    const newestEntry = sortedByDate[sortedByDate.length - 1];

    // Storage size
    const storageSize = this.calculateStorageSize();

    return {
      totalEntries: this.index!.totalEntries,
      entriesByCategory,
      entriesByConfidence,
      expiredEntries: expiredCount,
      recentlyUpdated: recentCount,
      averageAge: Math.round(avgAgeDays),
      mostAccessed,
      oldestEntry,
      newestEntry,
      storageSize,
    };
  }

  // =============================================================================
  // Helper Methods
  // =============================================================================

  private async ensureInitialized(): Promise<void> {
    if (!this.index) {
      await this.initialize();
    }
  }

  private generateId(query: string, category: string): string {
    const cleaned = query.toLowerCase().replace(/[^a-z0-9]+/g, '-');
    const timestamp = Date.now().toString(36);
    return `${category}-${cleaned.substring(0, 30)}-${timestamp}`;
  }

  private generateTitle(query: string): string {
    return query
      .split(' ')
      .map((w) => w.charAt(0).toUpperCase() + w.slice(1))
      .join(' ');
  }

  private extractTags(query: string): string[] {
    // Simple tag extraction (can be enhanced with NLP)
    return query
      .toLowerCase()
      .split(' ')
      .filter((w) => w.length > 3);
  }

  private calculateExpiryDate(daysUntilExpiry: number): Date {
    const date = new Date();
    date.setDate(date.getDate() + daysUntilExpiry);
    return date;
  }

  private addToIndex(entry: KnowledgeIndexEntry): void {
    // Remove old entry if superseding
    if (entry.supersedes) {
      this.index!.entries = this.index!.entries.filter((e) => e.id !== entry.supersedes);
    }

    this.index!.entries.push(entry);

    // Update categories list
    if (!this.index!.categories.includes(entry.category)) {
      this.index!.categories.push(entry.category);
    }
  }

  private calculateRelevance(entry: KnowledgeIndexEntry, query: string): number {
    if (!query) return entry.relevanceScore / 100;

    const queryLower = query.toLowerCase();
    let score = 0;

    // Title match (highest weight)
    if (entry.title.toLowerCase().includes(queryLower)) {
      score += 0.4;
    }

    // Summary match
    if (entry.summary.toLowerCase().includes(queryLower)) {
      score += 0.3;
    }

    // Tags match
    const matchingTags = entry.tags.filter((tag) => tag.toLowerCase().includes(queryLower));
    score += matchingTags.length * 0.1;

    // Relevance score (popularity)
    score += (entry.relevanceScore / 100) * 0.2;

    return Math.min(1, score);
  }

  private getMatchedFields(entry: KnowledgeIndexEntry, query: string): string[] {
    if (!query) return [];

    const queryLower = query.toLowerCase();
    const matched: string[] = [];

    if (entry.title.toLowerCase().includes(queryLower)) matched.push('title');
    if (entry.summary.toLowerCase().includes(queryLower)) matched.push('summary');
    if (entry.tags.some((tag) => tag.toLowerCase().includes(queryLower))) matched.push('tags');

    return matched;
  }

  private extractExcerpt(entry: KnowledgeIndexEntry, query: string, maxLength = 150): string {
    const text = entry.summary;
    if (text.length <= maxLength) return text;

    if (query) {
      const queryLower = query.toLowerCase();
      const textLower = text.toLowerCase();
      const index = textLower.indexOf(queryLower);

      if (index !== -1) {
        const start = Math.max(0, index - 50);
        const end = Math.min(text.length, index + query.length + 100);
        let excerpt = text.substring(start, end);

        if (start > 0) excerpt = '...' + excerpt;
        if (end < text.length) excerpt = excerpt + '...';

        return excerpt;
      }
    }

    return text.substring(0, maxLength) + '...';
  }

  private findRelatedEntries(entry: KnowledgeIndexEntry): string[] {
    // Find entries with overlapping tags or same category
    return this.index!.entries
      .filter((e) => {
        if (e.id === entry.id) return false;
        if (e.category === entry.category) return true;
        return e.tags.some((tag) => entry.tags.includes(tag));
      })
      .slice(0, 5)
      .map((e) => e.id);
  }

  private calculateStorageSize(): string {
    try {
      let totalBytes = 0;

      const calculateDir = (dirPath: string) => {
        const files = readdirSync(dirPath);
        for (const file of files) {
          const filePath = join(dirPath, file);
          const stats = statSync(filePath);
          if (stats.isDirectory()) {
            calculateDir(filePath);
          } else {
            totalBytes += stats.size;
          }
        }
      };

      calculateDir(this.knowledgePath);

      // Convert to human-readable format
      if (totalBytes < 1024) return `${totalBytes} B`;
      if (totalBytes < 1024 * 1024) return `${(totalBytes / 1024).toFixed(1)} KB`;
      return `${(totalBytes / (1024 * 1024)).toFixed(1)} MB`;
    } catch {
      return 'Unknown';
    }
  }
}

/**
 * Create knowledge cache service
 */
export function createKnowledgeCacheService(basePath: string): KnowledgeCacheService {
  return new KnowledgeCacheService(basePath);
}
