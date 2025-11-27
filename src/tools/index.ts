import type { Config } from '../types/index.js';
import { GetTaxObligationsTool } from './get-tax-obligations.js';
import { GetUpcomingDuesTool } from './get-upcoming-dues.js';
import { SendReminderTool } from './send-reminder.js';
import { CalculateTaxEstimateTool } from './calculate-tax.js';
import { SearchDutchTaxLawTool } from './search-tax-law.js';
import { SearchKnowledgeBaseTool } from './search-knowledge.js';
import { GetKnowledgeEntryTool } from './get-knowledge-entry.js';
import { RefreshKnowledgeTool } from './refresh-knowledge.js';
import { GetLawChangesTool } from './get-law-changes.js';
import { GetSpendingAdviceTool } from './get-spending-advice.js';

/**
 * Tool handler interface
 */
export interface ToolHandler {
  name: string;
  description: string;
  inputSchema: Record<string, any>;
  execute(input: any): Promise<any>;
}

/**
 * Tool registry - manages all MCP tools
 */
export class ToolRegistry {
  private tools: Map<string, ToolHandler> = new Map();

  constructor(
    private config: Config,
    private dependencies: ToolDependencies
  ) {
    this.registerTools();
  }

  /**
   * Register all tool handlers
   */
  private registerTools(): void {
    // Phase 5: Basic tools
    this.register(new GetTaxObligationsTool(this.config, this.dependencies));
    this.register(new GetUpcomingDuesTool(this.config, this.dependencies));
    this.register(new SendReminderTool(this.config, this.dependencies));

    // Phase 6: Advanced tools
    this.register(new CalculateTaxEstimateTool(this.config, this.dependencies));
    this.register(new SearchDutchTaxLawTool(this.config, this.dependencies));
    this.register(new SearchKnowledgeBaseTool(this.config, this.dependencies));
    this.register(new GetKnowledgeEntryTool(this.config, this.dependencies));
    this.register(new RefreshKnowledgeTool(this.config, this.dependencies));
    this.register(new GetLawChangesTool(this.config, this.dependencies));
    this.register(new GetSpendingAdviceTool(this.config, this.dependencies));
  }

  /**
   * Register a tool handler
   */
  register(handler: ToolHandler): void {
    this.tools.set(handler.name, handler);
  }

  /**
   * List all available tools
   */
  listTools(): ToolInfo[] {
    return Array.from(this.tools.values()).map((tool) => ({
      name: tool.name,
      description: tool.description,
      inputSchema: tool.inputSchema,
    }));
  }

  /**
   * Execute a tool
   */
  async executeTool(name: string, input: any): Promise<any> {
    const tool = this.tools.get(name);
    if (!tool) {
      throw new Error(`Unknown tool: ${name}`);
    }

    try {
      return await tool.execute(input);
    } catch (error) {
      throw new Error(
        `Tool execution failed (${name}): ${error instanceof Error ? error.message : 'Unknown error'}`
      );
    }
  }

  /**
   * Get tool by name
   */
  getTool(name: string): ToolHandler | undefined {
    return this.tools.get(name);
  }
}

/**
 * Tool dependencies (injected services)
 */
export interface ToolDependencies {
  personalLoader: any;
  taxKnowledge: any;
  knowledgeLoader: any;
  knowledgeCache: any;
  telegramService: any;
  webSearchService: any;
}

/**
 * Tool information
 */
export interface ToolInfo {
  name: string;
  description: string;
  inputSchema: Record<string, any>;
}

/**
 * Create tool registry
 */
export function createToolRegistry(
  config: Config,
  dependencies: ToolDependencies
): ToolRegistry {
  return new ToolRegistry(config, dependencies);
}
