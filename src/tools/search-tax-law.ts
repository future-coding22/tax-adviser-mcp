import type { ToolHandler, ToolDependencies } from './index.js';
import type {
  Config,
  SearchDutchTaxLawInput,
  SearchDutchTaxLawOutput,
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
    const category = input.category || 'general';
    const year = input.year || this.config.tax.year || new Date().getFullYear();
    const forceRefresh = input.force_refresh || false;

    // Step 1: Search local cache first (unless force_refresh)
    let cacheResults: any[] = [];
    let usedCache = false;

    if (!forceRefresh && this.config.knowledge.enabled) {
      try {
        const searchQuery: KnowledgeSearchQuery = {
          query,
          category,
          taxYear: year,
          limit: 5,
        };

        cacheResults = await this.deps.knowledgeCache.searchLocal(searchQuery);
        usedCache = cacheResults.length > 0;

        // Filter out expired entries
        const validResults = cacheResults.filter((r) => !r.isExpired);

        if (validResults.length > 0) {
          // Found valid cached results - return them
          return {
            query,
            category,
            year,
            source: 'cache',
            results: validResults.map((r) => ({
              id: r.id,
              title: r.title,
              summary: r.summary,
              relevance_score: r.relevanceScore,
              cached_at: r.cachedAt,
              expires_at: r.expiresAt,
            })),
            count: validResults.length,
            cache_hit: true,
          };
        }
      } catch (error) {
        // Cache search failed, continue to web search
        console.error('Cache search failed:', error);
      }
    }

    // Step 2: No valid cache results - search the web
    try {
      const webQuery = this.buildWebQuery(query, category, year);
      const webResults = await this.deps.webSearchService.search({
        query: webQuery,
        maxResults: 5,
        language: 'nl',
      });

      // Step 3: Cache the web results if auto_cache is enabled
      const results: any[] = [];

      for (const webResult of webResults.results) {
        // Prepare result
        const result = {
          title: webResult.title,
          summary: webResult.snippet,
          url: webResult.url,
          source: webResult.source,
          relevance_score: webResult.score || 0.5,
        };

        results.push(result);

        // Cache if enabled
        if (this.config.knowledge.auto_cache) {
          try {
            const cacheResult = await this.deps.knowledgeCache.cacheEntry({
              query,
              content: webResult.content || webResult.snippet,
              summary: webResult.snippet,
              sources: [webResult.url],
              category,
              taxYear: year,
              confidence: this.assessConfidence(webResult),
              tags: this.extractTags(query, category),
            });

            if (cacheResult.success) {
              result.cached_id = cacheResult.entry?.id;
            }
          } catch (error) {
            console.error('Failed to cache web result:', error);
          }
        }
      }

      return {
        query,
        category,
        year,
        source: 'web',
        results,
        count: results.length,
        cache_hit: false,
        searched_sites: webResults.searchedSites || [],
      };
    } catch (error) {
      throw new Error(
        `Failed to search Dutch tax law: ${error instanceof Error ? error.message : 'Unknown error'}`
      );
    }
  }

  /**
   * Build optimized web search query
   */
  private buildWebQuery(query: string, category: string, year: number): string {
    const categoryTerms: Record<string, string> = {
      income_tax: 'inkomstenbelasting',
      btw: 'BTW omzetbelasting',
      box3: 'box 3 vermogensrendementsheffing',
      self_employment: 'zelfstandig ondernemer',
      deductions: 'aftrekposten',
      credits: 'heffingskorting',
      deadlines: 'aangifte deadline',
      general: 'belastingdienst',
    };

    const categoryTerm = categoryTerms[category] || '';
    const siteRestriction = 'site:belastingdienst.nl OR site:rijksoverheid.nl OR site:government.nl';

    return `${query} ${categoryTerm} ${year} ${siteRestriction}`;
  }

  /**
   * Assess confidence level of web result
   */
  private assessConfidence(result: any): 'low' | 'medium' | 'high' {
    const source = result.source?.toLowerCase() || result.url?.toLowerCase() || '';

    // Official government sources = high confidence
    if (source.includes('belastingdienst.nl') || source.includes('rijksoverheid.nl')) {
      return 'high';
    }

    // Other .nl domains = medium confidence
    if (source.includes('.nl')) {
      return 'medium';
    }

    // Other sources = low confidence
    return 'low';
  }

  /**
   * Extract relevant tags from query and category
   */
  private extractTags(query: string, category: string): string[] {
    const tags: string[] = [category];

    // Common tax terms
    const taxTerms = [
      'box1',
      'box2',
      'box3',
      'btw',
      'vat',
      'aftrek',
      'korting',
      'aangifte',
      'zelfstandig',
      'freelance',
      'hypotheek',
      'vermogen',
    ];

    const lowerQuery = query.toLowerCase();
    for (const term of taxTerms) {
      if (lowerQuery.includes(term)) {
        tags.push(term);
      }
    }

    return [...new Set(tags)]; // Remove duplicates
  }
}
