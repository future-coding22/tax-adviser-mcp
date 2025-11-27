import type { ToolHandler, ToolDependencies } from './index.js';
import type {
  Config,
  SearchKnowledgeBaseInput,
  SearchKnowledgeBaseOutput,
  KnowledgeSearchQuery,
} from '../types/index.js';

/**
 * Search Knowledge Base Tool
 * Searches only the local knowledge cache (does not trigger web searches)
 */
export class SearchKnowledgeBaseTool implements ToolHandler {
  name = 'search_knowledge_base';
  description = 'Search the local knowledge base for previously cached tax information';
  inputSchema = {
    type: 'object',
    properties: {
      query: {
        type: 'string',
        description: 'Search query',
      },
      category: {
        type: 'string',
        enum: [
          'income_tax',
          'btw',
          'box3',
          'self_employment',
          'deductions',
          'credits',
          'deadlines',
          'general',
        ],
        description: 'Filter by category (optional)',
      },
      year: {
        type: 'number',
        description: 'Filter by tax year (optional)',
      },
      tags: {
        type: 'array',
        items: { type: 'string' },
        description: 'Filter by tags (optional)',
      },
      include_expired: {
        type: 'boolean',
        description: 'Include expired entries (default: false)',
      },
      limit: {
        type: 'number',
        description: 'Maximum number of results (default: 10)',
      },
    },
    required: ['query'],
  };

  constructor(
    private config: Config,
    private deps: ToolDependencies
  ) {}

  async execute(input: SearchKnowledgeBaseInput): Promise<SearchKnowledgeBaseOutput> {
    if (!this.config.knowledge.enabled) {
      return {
        query: input.query,
        results: [],
        count: 0,
        message: 'Knowledge base is disabled in configuration',
      };
    }

    try {
      // Build search query
      const searchQuery: KnowledgeSearchQuery = {
        query: input.query,
        category: input.category,
        taxYear: input.year,
        tags: input.tags,
        limit: input.limit || 10,
      };

      // Search local cache
      const cacheResults = await this.deps.knowledgeCache.searchLocal(searchQuery);

      // Filter expired if requested
      const filteredResults = input.include_expired
        ? cacheResults
        : cacheResults.filter((r) => !r.isExpired);

      // Sort by relevance score (descending)
      const sortedResults = filteredResults.sort((a, b) => b.relevanceScore - a.relevanceScore);

      // Format results
      const results = sortedResults.map((r) => ({
        id: r.id,
        title: r.title,
        summary: r.summary,
        category: r.category,
        year: r.taxYear,
        tags: r.tags,
        relevance_score: r.relevanceScore,
        confidence: r.confidence,
        cached_at: r.cachedAt,
        expires_at: r.expiresAt,
        is_expired: r.isExpired,
        sources: r.sources,
      }));

      // Generate stats
      const stats = {
        total_results: results.length,
        by_category: this.groupByCategory(results),
        by_confidence: this.groupByConfidence(results),
        expired_count: results.filter((r) => r.is_expired).length,
      };

      return {
        query: input.query,
        results,
        count: results.length,
        stats,
      };
    } catch (error) {
      throw new Error(
        `Failed to search knowledge base: ${error instanceof Error ? error.message : 'Unknown error'}`
      );
    }
  }

  /**
   * Group results by category
   */
  private groupByCategory(results: any[]): Record<string, number> {
    const grouped: Record<string, number> = {};
    for (const result of results) {
      grouped[result.category] = (grouped[result.category] || 0) + 1;
    }
    return grouped;
  }

  /**
   * Group results by confidence level
   */
  private groupByConfidence(results: any[]): Record<string, number> {
    const grouped: Record<string, number> = {};
    for (const result of results) {
      grouped[result.confidence] = (grouped[result.confidence] || 0) + 1;
    }
    return grouped;
  }
}
