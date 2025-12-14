import type { ToolHandler, ToolDependencies } from './index.js';
import type {
  Config,
  SearchDutchTaxLawInput,
  SearchDutchTaxLawOutput,
  SearchResult,
  KnowledgeSearchQuery,
} from '../types/index.js';

/**
 * Search Dutch Tax Law Tool
 * Implements cache-first strategy: searches local cache first, then web if needed
 */
export class SearchDutchTaxLawTool implements ToolHandler {
  name = 'search_dutch_tax_law';
  description =
    'Search for Dutch tax laws, regulations, and rules. Uses cache-first strategy for faster responses.';
  inputSchema = {
    type: 'object',
    properties: {
      query: {
        type: 'string',
        description: 'Your question about Dutch tax law',
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
        description: 'Tax category to narrow search (optional)',
      },
      year: {
        type: 'number',
        description: 'Tax year for the query (defaults to current year)',
      },
      force_refresh: {
        type: 'boolean',
        description: 'Skip cache and search web directly (default: false)',
      },
    },
    required: ['query'],
  };

  constructor(
    private config: Config,
    private deps: ToolDependencies
  ) {}

  async execute(input: SearchDutchTaxLawInput): Promise<SearchDutchTaxLawOutput> {
    const query = input.query;
    const forceRefresh = input.forceRefresh || false;

    // Step 1: Search local cache first (unless force_refresh)
    let cacheResults: any[] = [];

    if (!forceRefresh && this.config.knowledge.enabled) {
      try {
        const searchQuery: KnowledgeSearchQuery = {
          query,
          maxResults: 5,
        };

        cacheResults = await this.deps.knowledgeCache.searchLocal(searchQuery);

        // Filter out expired entries
        const validResults = cacheResults.filter((r) => !r.isExpired);

        if (validResults.length > 0) {
          // Found valid cached results - return them
          return {
            results: validResults.map((r: any) => ({
              title: r.title,
              source: r.sources?.[0] || 'cache',
              url: r.sources?.[0] || '',
              snippet: r.summary,
              relevance: r.relevanceScore,
            })),
            fromCache: true,
            cacheId: validResults[0]?.id,
            disclaimer: 'Information from cached knowledge base. Tax laws may have changed.',
          };
        }
      } catch (error) {
        // Cache search failed, continue to web search
        console.error('Cache search failed:', error);
      }
    }

    // Step 2: No valid cache results - search the web
    try {
      const webQuery = query + ' site:belastingdienst.nl OR site:wetten.nl OR site:rijksoverheid.nl';
      const webResults = await this.deps.webSearchService.search(webQuery, {
        maxResults: input.maxResults || 5,
      });

      // Step 3: Format results
      const results: SearchResult[] = webResults.results.map((r: any) => ({
        title: r.title,
        source: r.source,
        url: r.url,
        snippet: r.snippet,
        relevance: r.relevance,
        lastUpdated: r.lastUpdated,
      }));

      return {
        results,
        fromCache: false,
        disclaimer: 'Information from web search. Always verify with official tax authorities.',
      };
    } catch (error) {
      throw new Error(
        `Failed to search Dutch tax law: ${error instanceof Error ? error.message : 'Unknown error'}`
      );
    }
  }
}
