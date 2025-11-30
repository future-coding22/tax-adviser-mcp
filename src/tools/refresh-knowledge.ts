import type { ToolHandler, ToolDependencies } from './index.js';
import type { Config, RefreshKnowledgeOutput } from '../types/index.js';

/**
 * Refresh Knowledge Tool
 * Manually refresh cached knowledge entries by re-fetching from the web
 */
export class RefreshKnowledgeTool implements ToolHandler {
  name = 'refresh_knowledge';
  description =
    'Manually refresh knowledge cache entries by re-fetching from the web. Can refresh specific entries or all expired entries.';
  inputSchema = {
    type: 'object',
    properties: {
      entryId: {
        type: 'string',
        description: 'Specific entry ID to refresh (optional)',
      },
      id: {
        type: 'string',
        description: 'Specific entry ID to refresh (optional, alias for entryId)',
      },
      expiredOnly: {
        type: 'boolean',
        description: 'Refresh only expired entries (default: true)',
      },
      refresh_all_expired: {
        type: 'boolean',
        description: 'Refresh all expired entries (default: false)',
      },
      category: {
        type: 'string',
        description: 'Refresh all entries in a specific category (optional)',
      },
      force: {
        type: 'boolean',
        description: 'Force refresh even if not expired (default: false)',
      },
      max_entries: {
        type: 'number',
        description: 'Maximum number of entries to refresh (optional)',
      },
    },
  };

  constructor(
    private config: Config,
    private deps: ToolDependencies
  ) {}

  async execute(input: any): Promise<RefreshKnowledgeOutput> {
    if (!this.config.knowledge.enabled) {
      throw new Error('Knowledge base is disabled in configuration');
    }

    const refreshedDetails: any[] = [];
    const failedDetails: any[] = [];

    try {
      // Handle entryId with fallback to id parameter
      const entryId = (input as any).entryId || (input as any).id;
      const expiredOnly = (input as any).expiredOnly !== false; // Default to true
      const force = (input as any).force || false;
      const maxEntries = (input as any).max_entries || 100;

      // Scenario 1: Refresh specific entry
      if (entryId) {
        const result = await this.refreshEntry(entryId, force);
        if (result.success) {
          refreshedDetails.push({ id: result.id, status: 'refreshed' as const });
        } else {
          failedDetails.push({ id: result.id, status: 'failed' as const, reason: result.error });
        }
      }
      // Scenario 2: Refresh expired entries (default behavior)
      else if (expiredOnly) {
        // Get expired entries from cache
        let expiredEntries = await this.deps.knowledgeCache.getExpiredEntries();

        // Filter by category if specified
        if ((input as any).category) {
          expiredEntries = expiredEntries.filter(
            (entry: any) => entry.category === (input as any).category
          );
        }

        // Limit by max_entries
        expiredEntries = expiredEntries.slice(0, maxEntries);

        for (const entry of expiredEntries) {
          const result = await this.refreshEntry(entry.id, force);
          if (result.success) {
            refreshedDetails.push({ id: result.id, status: 'refreshed' as const });
          } else {
            failedDetails.push({ id: result.id, status: 'failed' as const, reason: result.error });
          }
        }
      }
      // Scenario 3: Refresh by category
      else if ((input as any).category) {
        const expiredEntries = await this.deps.knowledgeCache.getExpiredEntries();
        let categoryEntries = expiredEntries.filter(
          (entry: any) => entry.category === (input as any).category
        );

        // Limit by max_entries
        categoryEntries = categoryEntries.slice(0, maxEntries);

        for (const entry of categoryEntries) {
          const result = await this.refreshEntry(entry.id, force);
          if (result.success) {
            refreshedDetails.push({ id: result.id, status: 'refreshed' as const });
          } else {
            failedDetails.push({ id: result.id, status: 'failed' as const, reason: result.error });
          }
        }
      } else {
        // If no parameters specified, refresh expired by default
        let expiredEntries = await this.deps.knowledgeCache.getExpiredEntries();

        // Limit by max_entries
        expiredEntries = expiredEntries.slice(0, maxEntries);

        for (const entry of expiredEntries) {
          const result = await this.refreshEntry(entry.id, force);
          if (result.success) {
            refreshedDetails.push({ id: result.id, status: 'refreshed' as const });
          } else {
            failedDetails.push({ id: result.id, status: 'failed' as const, reason: result.error });
          }
        }
      }

      return {
        refreshed: refreshedDetails.length,
        failed: failedDetails.length,
        skipped: 0,
        details: [
          ...refreshedDetails,
          ...failedDetails,
        ],
      };
    } catch (error) {
      throw new Error(
        `Failed to refresh knowledge: ${error instanceof Error ? error.message : 'Unknown error'}`
      );
    }
  }

  /**
   * Refresh a single entry
   */
  private async refreshEntry(
    id: string,
    force: boolean
  ): Promise<{ success: boolean; id: string; title?: string; error?: string; previousExpiresAt?: string; newExpiresAt?: string }> {
    try {
      // Get existing entry
      const entry = await this.deps.knowledgeCache.getEntry(id);

      if (!entry) {
        return {
          success: false,
          id,
          error: 'Entry not found',
        };
      }

      // Check if refresh needed
      const isExpired = new Date(entry.expiresAt) < new Date();
      if (!isExpired && !force) {
        return {
          success: false,
          id,
          error: 'Entry not expired (use force=true to refresh anyway)',
        };
      }

      const previousExpiresAt = entry.expiresAt;

      // Build search query from entry metadata
      const searchQuery = entry.originalQuery || entry.title;
      const category = entry.category;
      const year = entry.taxYear;

      // Search web for updated information
      const webQuery = this.buildWebQuery(searchQuery, category, year);
      const webResults = await this.deps.webSearchService.search({
        query: webQuery,
        maxResults: 3,
        language: 'nl',
      });

      if (webResults.results.length === 0) {
        return {
          success: false,
          id,
          error: 'No web results found to refresh with',
        };
      }

      // Use the best result to update the entry
      const bestResult = webResults.results[0];

      // Update cache entry
      const updateResult = await this.deps.knowledgeCache.updateEntry(id, {
        content: bestResult.content || bestResult.snippet,
        summary: bestResult.snippet,
        sources: [bestResult.url, ...entry.sources.slice(0, 2)], // Keep old sources as references
        confidence: this.assessConfidence(bestResult),
        expiresAt: this.calculateNewExpiry(entry.category),
      });

      if (updateResult.success) {
        return {
          success: true,
          id,
          title: entry.title,
          previousExpiresAt,
          newExpiresAt: updateResult.entry?.expiresAt,
        };
      } else {
        return {
          success: false,
          id,
          error: 'Failed to update cache entry',
        };
      }
    } catch (error) {
      return {
        success: false,
        id,
        error: error instanceof Error ? error.message : 'Unknown error',
      };
    }
  }

  /**
   * Build web search query
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
    const siteRestriction = 'site:belastingdienst.nl OR site:rijksoverheid.nl';

    return `${query} ${categoryTerm} ${year} ${siteRestriction}`;
  }

  /**
   * Assess confidence level of web result
   */
  private assessConfidence(result: any): 'low' | 'medium' | 'high' {
    const source = result.source?.toLowerCase() || result.url?.toLowerCase() || '';

    if (source.includes('belastingdienst.nl') || source.includes('rijksoverheid.nl')) {
      return 'high';
    }

    if (source.includes('.nl')) {
      return 'medium';
    }

    return 'low';
  }

  /**
   * Calculate new expiry date based on category
   */
  private calculateNewExpiry(category: string): string {
    const now = new Date();
    let daysToAdd = this.config.knowledge.default_expiry_days || 90;

    // Category-specific expiry periods
    const categoryExpiry: Record<string, number> = {
      deadlines: 30, // Tax deadlines change yearly
      income_tax: 365, // Tax rates change yearly
      btw: 90, // BTW rules can change quarterly
      self_employment: 180, // Self-employment rules change less frequently
      general: 90,
    };

    daysToAdd = categoryExpiry[category] || daysToAdd;

    const expiryDate = new Date(now);
    expiryDate.setDate(expiryDate.getDate() + daysToAdd);

    return expiryDate.toISOString();
  }
}
