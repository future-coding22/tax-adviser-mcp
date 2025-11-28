/**
 * Add Country Tool
 *
 * MCP tool for adding support for a new country using autonomous discovery.
 * Wraps the SetupCountryAgent to provide country setup via MCP protocol.
 */

import type { ToolHandler, ToolDependencies } from './index.js';
import type { Config } from '../types/index.js';
import { setupCountry, SetupCountryConfig } from '../agents/setup-country.js';
import { getGlossaryLoader } from '../services/glossary-loader.js';

/**
 * Add Country Tool Input
 */
export interface AddCountryInput {
  /** Country code (ISO 2-letter, e.g., "US", "GB", "DE") */
  country_code: string;

  /** Country name (English, e.g., "United States", "United Kingdom") */
  country_name: string;

  /** Generate example personal.md template */
  generate_template?: boolean;

  /** Thoroughness level for discovery */
  thoroughness?: 'quick' | 'medium' | 'thorough';
}

/**
 * Add Country Tool Output
 */
export interface AddCountryOutput {
  success: boolean;
  country_code: string;
  country_name: string;
  glossary_path: string;
  template_path?: string;
  warnings: string[];
  next_steps: string[];
  discovered_info: {
    tax_types_found: number;
    deadlines_found: number;
    business_structures_found: number;
  };
}

/**
 * Add Country Tool
 *
 * Autonomously discovers tax information for a new country and creates
 * a glossary file with country-specific tax data.
 */
export class AddCountryTool implements ToolHandler {
  name = 'add_country';
  description =
    'Add support for a new country by autonomously discovering tax information via web search. ' +
    'Creates a country glossary with tax authority, tax types, deadlines, and business structures. ' +
    'Use this to expand the tax adviser to support additional countries beyond Netherlands.';

  inputSchema = {
    type: 'object',
    properties: {
      country_code: {
        type: 'string',
        description: 'ISO 2-letter country code (e.g., "US", "GB", "DE", "FR")',
        pattern: '^[A-Z]{2}$',
      },
      country_name: {
        type: 'string',
        description: 'Country name in English (e.g., "United States", "Germany")',
      },
      generate_template: {
        type: 'boolean',
        description: 'Generate example personal.md template for this country (default: true)',
        default: true,
      },
      thoroughness: {
        type: 'string',
        enum: ['quick', 'medium', 'thorough'],
        description: 'Discovery thoroughness level (default: "medium")',
        default: 'medium',
      },
    },
    required: ['country_code', 'country_name'],
  };

  constructor(
    private config: Config,
    private deps: ToolDependencies
  ) {}

  async execute(input: AddCountryInput): Promise<AddCountryOutput> {
    const countryCode = input.country_code.toUpperCase();

    // Check if country already exists
    const glossary = getGlossaryLoader();
    const exists = await glossary.hasCountry(countryCode);

    if (exists) {
      return {
        success: false,
        country_code: countryCode,
        country_name: input.country_name,
        glossary_path: '',
        warnings: [`Country ${countryCode} already has a glossary. Use update_country to modify it.`],
        next_steps: [
          `Review existing glossary at: knowledge/_glossary/${countryCode.toLowerCase()}.json`,
          'Use update_country tool to modify existing glossary',
        ],
        discovered_info: {
          tax_types_found: 0,
          deadlines_found: 0,
          business_structures_found: 0,
        },
      };
    }

    // Run autonomous discovery
    console.error(`\n🚀 Starting autonomous country setup for ${input.country_name} (${countryCode})`);
    console.error('This will take a few minutes as we search for tax information...\n');

    const setupConfig: SetupCountryConfig = {
      countryCode,
      countryName: input.country_name,
      generateTemplate: input.generate_template ?? true,
      thoroughness: input.thoroughness || 'medium',
    };

    const result = await setupCountry(
      setupConfig,
      this.deps.webSearchService,
      glossary
    );

    // Prepare output
    const warnings = result.discovered.warnings;
    const nextSteps: string[] = [];

    // Add next steps based on what was discovered
    nextSteps.push(`Review and update the generated glossary at: ${result.glossaryPath}`);
    nextSteps.push('Verify tax authority website and contact information');
    nextSteps.push('Update currency code and language code with correct values');
    nextSteps.push('Add proper local names for discovered tax types');
    nextSteps.push('Verify and add actual tax deadlines for the current year');

    if (result.discovered.discovered_taxes.length === 0) {
      nextSteps.push('⚠️  No tax types were auto-discovered - manually add tax terms to glossary');
    }

    if (result.discovered.discovered_deadlines.length === 0) {
      nextSteps.push('⚠️  No deadlines were auto-discovered - manually add tax calendar');
    }

    nextSteps.push('Implement country-specific ITaxKnowledge calculation logic in src/knowledge/');

    if (result.templatePath) {
      nextSteps.push(`Customize the personal.md template at: ${result.templatePath}`);
    }

    return {
      success: true,
      country_code: countryCode,
      country_name: input.country_name,
      glossary_path: result.glossaryPath,
      template_path: result.templatePath,
      warnings,
      next_steps: nextSteps,
      discovered_info: {
        tax_types_found: result.discovered.discovered_taxes.length,
        deadlines_found: result.discovered.discovered_deadlines.length,
        business_structures_found: result.discovered.business_structures.length,
      },
    };
  }
}
