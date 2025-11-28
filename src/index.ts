#!/usr/bin/env node

import { Server } from '@modelcontextprotocol/sdk/server/index.js';
import { StdioServerTransport } from '@modelcontextprotocol/sdk/server/stdio.js';
import {
  CallToolRequestSchema,
  ListToolsRequestSchema,
  ListResourcesRequestSchema,
  ReadResourceRequestSchema,
  ListPromptsRequestSchema,
  GetPromptRequestSchema,
} from '@modelcontextprotocol/sdk/types.js';

import { loadConfig } from './config/loader.js';
import { createToolRegistry } from './tools/index.js';
import { createResourceRegistry } from './resources/index.js';
import { personalProfileLoader } from './context/personal-loader.js';
import { createDutchTaxKnowledge } from './context/dutch-tax-knowledge.js';
import { createTaxKnowledgeFactory } from './knowledge/TaxKnowledgeFactory.js';
import { KnowledgeCacheService } from './services/knowledge-cache.js';
import { KnowledgeLoader } from './services/knowledge-loader.js';
import { TelegramService } from './services/telegram.js';
import { WebSearchService } from './services/web-search.js';
import path from 'path';

/**
 * Tax Adviser MCP Server
 * Provides comprehensive Dutch tax assistance through MCP protocol
 */
class TaxAdviserServer {
  private server: Server;
  private config: any;
  private toolRegistry: any;
  private resourceRegistry: any;

  constructor() {
    this.server = new Server(
      {
        name: 'tax-adviser-mcp',
        version: '1.0.0',
      },
      {
        capabilities: {
          tools: {},
          resources: {},
          prompts: {},
        },
      }
    );

    this.setupErrorHandling();
  }

  /**
   * Initialize server with configuration and dependencies
   */
  async initialize(): Promise<void> {
    try {
      // Load configuration
      this.config = await loadConfig();

      // Initialize services
      const taxKnowledge = createDutchTaxKnowledge(this.config.paths.tax_rules);
      const taxKnowledgeFactory = createTaxKnowledgeFactory({
        taxRulesDir: path.dirname(this.config.paths.tax_rules),
        glossaryDir: path.join(process.cwd(), 'knowledge', '_glossary'),
        defaultCountry: 'NL',
      });
      const knowledgeLoader = new KnowledgeLoader(this.config.paths.knowledge_base);
      const knowledgeCache = new KnowledgeCacheService(
        this.config.paths.knowledge_base,
        this.config.knowledge
      );
      const telegramService = new TelegramService(this.config.telegram);
      const webSearchService = new WebSearchService(this.config.web_search);

      // Initialize knowledge cache
      if (this.config.knowledge.enabled && this.config.knowledge.seed_initial_entries) {
        await knowledgeCache.initialize();
      }

      // Create tool and resource registries
      const dependencies = {
        personalLoader: personalProfileLoader,
        taxKnowledge, // Legacy Dutch-only (deprecated)
        taxKnowledgeFactory, // New multi-country factory
        knowledgeLoader,
        knowledgeCache,
        telegramService,
        webSearchService,
      };

      this.toolRegistry = createToolRegistry(this.config, dependencies);
      this.resourceRegistry = createResourceRegistry();

      // Set up MCP protocol handlers
      this.setupHandlers();

      console.error('Tax Adviser MCP Server initialized successfully');
    } catch (error) {
      console.error('Failed to initialize server:', error);
      throw error;
    }
  }

  /**
   * Set up MCP protocol handlers
   */
  private setupHandlers(): void {
    // List available tools
    this.server.setRequestHandler(ListToolsRequestSchema, async () => {
      const tools = this.toolRegistry.listTools();
      return { tools };
    });

    // Execute a tool
    this.server.setRequestHandler(CallToolRequestSchema, async (request) => {
      const { name, arguments: args } = request.params;

      try {
        const result = await this.toolRegistry.executeTool(name, args || {});

        return {
          content: [
            {
              type: 'text',
              text: JSON.stringify(result, null, 2),
            },
          ],
        };
      } catch (error) {
        return {
          content: [
            {
              type: 'text',
              text: `Error executing tool ${name}: ${error instanceof Error ? error.message : 'Unknown error'}`,
            },
          ],
          isError: true,
        };
      }
    });

    // List available resources
    this.server.setRequestHandler(ListResourcesRequestSchema, async () => {
      const resources = await this.resourceRegistry.listResources();
      return { resources };
    });

    // Read a resource
    this.server.setRequestHandler(ReadResourceRequestSchema, async (request) => {
      const { uri } = request.params;

      try {
        const resource = await this.resourceRegistry.readResource(uri);

        return {
          contents: [
            {
              uri: resource.uri,
              mimeType: resource.mimeType,
              text:
                typeof resource.content === 'string'
                  ? resource.content
                  : JSON.stringify(resource.content, null, 2),
            },
          ],
        };
      } catch (error) {
        throw new Error(
          `Failed to read resource ${uri}: ${error instanceof Error ? error.message : 'Unknown error'}`
        );
      }
    });

    // List available prompts
    this.server.setRequestHandler(ListPromptsRequestSchema, async () => {
      return {
        prompts: [
          {
            name: 'tax_planning_session',
            description: 'Start a comprehensive tax planning session',
            arguments: [
              {
                name: 'focus_area',
                description: 'Area to focus on (tax_obligations, optimization, deadlines, all)',
                required: false,
              },
            ],
          },
          {
            name: 'deadline_check',
            description: 'Check upcoming tax deadlines and obligations',
            arguments: [],
          },
          {
            name: 'tax_optimization',
            description: 'Get personalized tax optimization recommendations',
            arguments: [],
          },
        ],
      };
    });

    // Get a prompt
    this.server.setRequestHandler(GetPromptRequestSchema, async (request) => {
      const { name, arguments: args } = request.params;

      switch (name) {
        case 'tax_planning_session':
          return this.getTaxPlanningPrompt(args?.focus_area || 'all');
        case 'deadline_check':
          return this.getDeadlineCheckPrompt();
        case 'tax_optimization':
          return this.getTaxOptimizationPrompt();
        default:
          throw new Error(`Unknown prompt: ${name}`);
      }
    });
  }

  /**
   * Tax planning session prompt
   */
  private async getTaxPlanningPrompt(focusArea: string): Promise<any> {
    return {
      messages: [
        {
          role: 'user',
          content: {
            type: 'text',
            text: `I want to do a comprehensive tax planning session focusing on: ${focusArea}

Please help me:
1. Review my tax obligations using get_tax_obligations
2. Check upcoming payment deadlines using get_upcoming_dues
3. Calculate my estimated taxes using calculate_tax_estimate
4. Provide optimization advice using get_spending_advice

Let's start by understanding my current tax situation.`,
          },
        },
      ],
    };
  }

  /**
   * Deadline check prompt
   */
  private async getDeadlineCheckPrompt(): Promise<any> {
    return {
      messages: [
        {
          role: 'user',
          content: {
            type: 'text',
            text: `Please check my upcoming tax deadlines and payment obligations.

Use get_tax_obligations to see all my tax deadlines, and get_upcoming_dues to see my recurring payments for the next 30 days.

Highlight anything that requires immediate action.`,
          },
        },
      ],
    };
  }

  /**
   * Tax optimization prompt
   */
  private async getTaxOptimizationPrompt(): Promise<any> {
    return {
      messages: [
        {
          role: 'user',
          content: {
            type: 'text',
            text: `I want to optimize my tax situation and reduce my tax burden.

Please:
1. Calculate my current tax estimate using calculate_tax_estimate
2. Provide personalized optimization advice using get_spending_advice with focus on tax_reduction
3. Search for relevant Dutch tax law that might help me using search_dutch_tax_law
4. Check for recent tax law changes using get_law_changes

Give me actionable recommendations with estimated savings.`,
          },
        },
      ],
    };
  }

  /**
   * Set up error handling
   */
  private setupErrorHandling(): void {
    this.server.onerror = (error) => {
      console.error('[MCP Error]', error);
    };

    process.on('SIGINT', async () => {
      await this.shutdown();
      process.exit(0);
    });

    process.on('SIGTERM', async () => {
      await this.shutdown();
      process.exit(0);
    });
  }

  /**
   * Start the server
   */
  async start(): Promise<void> {
    await this.initialize();

    const transport = new StdioServerTransport();
    await this.server.connect(transport);

    console.error('Tax Adviser MCP Server running on stdio');
  }

  /**
   * Shutdown the server gracefully
   */
  async shutdown(): Promise<void> {
    console.error('Shutting down Tax Adviser MCP Server...');
    await this.server.close();
  }
}

/**
 * Main entry point
 */
async function main() {
  try {
    const server = new TaxAdviserServer();
    await server.start();
  } catch (error) {
    console.error('Fatal error:', error);
    process.exit(1);
  }
}

main();
