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
        totalMatches: 0,
        categoriesSearched: [],
      };
    }

    try {
      // Build search query
      const searchQuery: KnowledgeSearchQuery = {
        query: input.query,
        category: input.category,
        taxYear: input.taxYear,
        maxResults: input.maxResults || 10,
        includeExpired: input.includeExpired,
      };

      // Search local cache
      const cacheResults = await this.deps.knowledgeCache.searchLocal(searchQuery);

      // Filter expired if requested
      const filteredResults = input.includeExpired
        ? cacheResults
        : cacheResults.filter((r: any) => !r.isExpired);

      // Sort by relevance score (descending)
      const sortedResults = filteredResults.sort((a: any, b: any) => b.relevanceScore - a.relevanceScore);

      // Format results
      const results = sortedResults.map((r: any) => ({
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

      return {
        query: input.query,
        results,
        totalMatches: results.length,
        categoriesSearched: input.category ? [input.category] : [],
      };
    } catch (error) {
      throw new Error(
        `Failed to search knowledge base: ${error instanceof Error ? error.message : 'Unknown error'}`
      );
    }
  }
}
