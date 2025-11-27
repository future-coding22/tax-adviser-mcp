import type { ToolHandler, ToolDependencies } from './index.js';
import type { Config, GetKnowledgeEntryInput, GetKnowledgeEntryOutput } from '../types/index.js';

/**
 * Get Knowledge Entry Tool
 * Retrieves a complete knowledge entry by ID with full content
 */
export class GetKnowledgeEntryTool implements ToolHandler {
  name = 'get_knowledge_entry';
  description = 'Get a complete knowledge entry by its ID with full content and metadata';
  inputSchema = {
    type: 'object',
    properties: {
      id: {
        type: 'string',
        description: 'The ID of the knowledge entry',
      },
    },
    required: ['id'],
  };

  constructor(
    private config: Config,
    private deps: ToolDependencies
  ) {}

  async execute(input: GetKnowledgeEntryInput): Promise<GetKnowledgeEntryOutput> {
    if (!this.config.knowledge.enabled) {
      return {
        success: false,
        error: 'Knowledge base is disabled in configuration',
      };
    }

    try {
      // Get entry by ID
      const entry = await this.deps.knowledgeCache.getEntry(input.id);

      if (!entry) {
        return {
          success: false,
          error: `Knowledge entry not found: ${input.id}`,
        };
      }

      // Increment access count
      await this.deps.knowledgeCache.incrementAccessCount(input.id);

      // Check if expired
      const now = new Date();
      const expiresAt = new Date(entry.expiresAt);
      const isExpired = expiresAt < now;

      // Calculate days until expiration
      const daysUntilExpiry = Math.ceil(
        (expiresAt.getTime() - now.getTime()) / (1000 * 60 * 60 * 24)
      );

      return {
        success: true,
        entry: {
          id: entry.id,
          title: entry.title,
          summary: entry.summary,
          content: entry.content,
          category: entry.category,
          taxYear: entry.taxYear,
          tags: entry.tags,
          confidence: entry.confidence,
          sources: entry.sources,
          cachedAt: entry.cachedAt,
          expiresAt: entry.expiresAt,
          lastAccessed: new Date().toISOString(),
          accessCount: entry.accessCount + 1,
          isExpired,
          daysUntilExpiry,
        },
        warnings: isExpired
          ? ['This entry has expired and may contain outdated information']
          : daysUntilExpiry <= 7
            ? [`This entry will expire in ${daysUntilExpiry} days`]
            : [],
      };
    } catch (error) {
      return {
        success: false,
        error: `Failed to retrieve knowledge entry: ${error instanceof Error ? error.message : 'Unknown error'}`,
      };
    }
  }
}
