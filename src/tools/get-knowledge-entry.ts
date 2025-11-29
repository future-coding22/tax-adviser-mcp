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
      throw new Error('Knowledge base is disabled in configuration');
    }

    try {
      // Get entry by ID
      const entry = await this.deps.knowledgeCache.getEntry(input.id);

      if (!entry) {
        throw new Error(`Knowledge entry not found: ${input.id}`);
      }

      // Increment access count
      await this.deps.knowledgeCache.incrementAccessCount(input.id);

      return {
        id: entry.id,
        title: entry.title,
        summary: entry.summary,
        content: entry.content,
        category: entry.category,
        tags: entry.tags,
        sources: entry.sources,
        taxYears: entry.taxYears || [],
        createdAt: entry.createdAt,
        updatedAt: entry.updatedAt,
        expiresAt: entry.expiresAt,
        confidence: entry.confidence,
        supersedes: entry.supersedes,
        relatedEntries: entry.relatedEntries?.map((id: string) => ({
          id,
          title: '',
          category: '',
        })),
      };
    } catch (error) {
      throw new Error(
        `Failed to retrieve knowledge entry: ${error instanceof Error ? error.message : 'Unknown error'}`
      );
    }
  }
}
