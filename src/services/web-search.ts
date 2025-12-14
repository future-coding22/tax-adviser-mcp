import type { SearchConfig } from '../types/index.js';

/**
 * Web search service for Dutch tax resources
 */
export class WebSearchService {
  private readonly config: SearchConfig;
  private lastRequestTime: number = 0;

  constructor(config: SearchConfig) {
    this.config = config;
  }

  /**
   * Search Dutch tax resources
   */
  async search(query: string, options?: SearchOptions): Promise<SearchResults> {
    if (!this.config.enabled) {
      return {
        query,
        results: [],
        sources: [],
        fromCache: false,
        error: 'Web search is disabled in configuration',
      };
    }

    // Respect rate limiting
    await this.enforceRateLimit();

    const sources = options?.sources || this.config.sources;
    const maxResults = options?.maxResults || this.config.max_results;

    const results: SearchResult[] = [];
    const errors: string[] = [];

    // Search each source
    for (const source of sources) {
      try {
        const sourceResults = await this.searchSource(source, query, maxResults);
        results.push(...sourceResults);
      } catch (error) {
        errors.push(`Failed to search ${source}: ${error instanceof Error ? error.message : 'Unknown error'}`);
      }
    }

    // Sort by relevance and limit results
    const sortedResults = results
      .sort((a, b) => b.relevance - a.relevance)
      .slice(0, maxResults);

    // Filter by relevance threshold
    const filteredResults = sortedResults.filter(
      (r) => r.relevance >= this.config.min_relevance
    );

    return {
      query,
      results: filteredResults,
      sources,
      fromCache: false,
      totalFound: results.length,
      errors: errors.length > 0 ? errors : undefined,
    };
  }

  /**
   * Search a specific source
   */
  private async searchSource(
    source: string,
    query: string,
    maxResults: number
  ): Promise<SearchResult[]> {
    // For MVP, we'll use a simple approach
    // In production, this would integrate with actual search APIs or scraping

    switch (source) {
      case 'belastingdienst.nl':
        return this.searchBelastingdienst(query, maxResults);
      case 'wetten.nl':
        return this.searchWetten(query, maxResults);
      case 'rijksoverheid.nl':
        return this.searchRijksoverheid(query, maxResults);
      default:
        return [];
    }
  }

  /**
   * Search Belastingdienst.nl
   */
  private async searchBelastingdienst(query: string, maxResults: number): Promise<SearchResult[]> {
    // Simplified implementation for MVP
    // In production, would use actual search API or scraping

    const mockResults: SearchResult[] = [
      {
        title: `Search results for "${query}" on Belastingdienst`,
        url: `https://www.belastingdienst.nl/zoeken?q=${encodeURIComponent(query)}`,
        snippet: `Information about ${query} from the Dutch Tax Authority`,
        source: 'belastingdienst.nl',
        relevance: 0.8,
        lastUpdated: new Date().toISOString(),
      },
    ];

    return mockResults.slice(0, maxResults);
  }

  /**
   * Search Wetten.nl (Dutch legislation)
   */
  private async searchWetten(query: string, maxResults: number): Promise<SearchResult[]> {
    const mockResults: SearchResult[] = [
      {
        title: `Legal information: ${query}`,
        url: `https://wetten.overheid.nl/zoeken?q=${encodeURIComponent(query)}`,
        snippet: `Dutch tax legislation related to ${query}`,
        source: 'wetten.nl',
        relevance: 0.7,
        lastUpdated: new Date().toISOString(),
      },
    ];

    return mockResults.slice(0, maxResults);
  }

  /**
   * Search Rijksoverheid.nl (Dutch government)
   */
  private async searchRijksoverheid(query: string, maxResults: number): Promise<SearchResult[]> {
    const mockResults: SearchResult[] = [
      {
        title: `Government information: ${query}`,
        url: `https://www.rijksoverheid.nl/zoeken?q=${encodeURIComponent(query)}`,
        snippet: `Official Dutch government information about ${query}`,
        source: 'rijksoverheid.nl',
        relevance: 0.75,
        lastUpdated: new Date().toISOString(),
      },
    ];

    return mockResults.slice(0, maxResults);
  }

  /**
   * Enforce rate limiting between requests
   */
  private async enforceRateLimit(): Promise<void> {
    if (!this.config.rate_limit.enabled) {
      return;
    }

    const now = Date.now();
    const timeSinceLastRequest = now - this.lastRequestTime;
    const minDelay = this.config.rate_limit.delay_between_requests_ms;

    if (timeSinceLastRequest < minDelay) {
      const waitTime = minDelay - timeSinceLastRequest;
      await this.sleep(waitTime);
    }

    this.lastRequestTime = Date.now();
  }

  /**
   * Sleep helper
   */
  private sleep(ms: number): Promise<void> {
    return new Promise((resolve) => setTimeout(resolve, ms));
  }
}

/**
 * Mock web search service for testing
 */
export class MockWebSearchService extends WebSearchService {
  private mockResults: SearchResult[] = [];

  setMockResults(results: SearchResult[]) {
    this.mockResults = results;
  }

  async search(query: string, options?: SearchOptions): Promise<SearchResults> {
    return {
      query,
      results: this.mockResults,
      sources: options?.sources || ['mock'],
      fromCache: false,
      totalFound: this.mockResults.length,
    };
  }
}

// =============================================================================
// Types
// =============================================================================

export interface SearchOptions {
  sources?: string[];
  maxResults?: number;
  forceRefresh?: boolean;
}

export interface SearchResult {
  title: string;
  url: string;
  snippet: string;
  source: string;
  relevance: number; // 0-1
  lastUpdated?: string; // ISO date
}

export interface SearchResults {
  query: string;
  results: SearchResult[];
  sources: string[];
  fromCache: boolean;
  totalFound?: number;
  cacheId?: string;
  cacheAgeDays?: number;
  errors?: string[];
  error?: string;
}

/**
 * Factory function
 */
export function createWebSearchService(config: SearchConfig, mock = false): WebSearchService {
  return mock ? new MockWebSearchService(config) : new WebSearchService(config);
}
