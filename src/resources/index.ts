import type { PersonalProfile, DutchTaxRules, KnowledgeStats } from '../types/index.js';
import { PersonalProfileResource } from './personal-profile.js';
import { TaxCalendarResource } from './tax-calendar.js';
import { KnowledgeBaseResource } from './knowledge-base.js';

/**
 * MCP Resource types
 */
export interface MCPResource {
  uri: string;
  name: string;
  description: string;
  mimeType: string;
}

/**
 * Resource registry - manages all MCP resources
 */
export class ResourceRegistry {
  private resources: Map<string, ResourceHandler> = new Map();

  constructor() {
    // Register resource handlers
    this.register('personal', new PersonalProfileResource());
    this.register('tax', new TaxCalendarResource());
    this.register('knowledge', new KnowledgeBaseResource());
  }

  /**
   * Register a resource handler
   */
  register(prefix: string, handler: ResourceHandler): void {
    this.resources.set(prefix, handler);
  }

  /**
   * List all available resources
   */
  async listResources(): Promise<MCPResource[]> {
    const resources: MCPResource[] = [];

    for (const [_prefix, handler] of this.resources) {
      const handlerResources = await handler.list();
      resources.push(...handlerResources);
    }

    return resources;
  }

  /**
   * Read a resource by URI
   */
  async readResource(uri: string): Promise<ResourceContent> {
    const { prefix } = this.parseUri(uri);

    const handler = this.resources.get(prefix);
    if (!handler) {
      throw new Error(`Unknown resource type: ${prefix}`);
    }

    return handler.read(uri);
  }

  /**
   * Parse resource URI
   */
  private parseUri(uri: string): { prefix: string; path: string } {
    const match = uri.match(/^(\w+):\/\/(.+)$/);
    if (!match) {
      throw new Error(`Invalid resource URI: ${uri}`);
    }

    return {
      prefix: match[1],
      path: match[2],
    };
  }
}

/**
 * Resource handler interface
 */
export interface ResourceHandler {
  /**
   * List available resources
   */
  list(): Promise<MCPResource[]>;

  /**
   * Read a specific resource
   */
  read(uri: string): Promise<ResourceContent>;
}

/**
 * Resource content
 */
export interface ResourceContent {
  uri: string;
  mimeType: string;
  content: string | object;
}

/**
 * Create resource registry
 */
export function createResourceRegistry(): ResourceRegistry {
  return new ResourceRegistry();
}
