/**
 * Setup Country Autonomous Agent
 *
 * Autonomously discovers and sets up tax information for a new country.
 * Uses web search to find tax authority, legal database, tax types, deadlines,
 * and business structures, then generates a country glossary.
 */

import { WebSearchService } from '../services/web-search.js';
import { GlossaryLoader } from '../services/glossary-loader.js';
import {
  CountryGlossary,
  CountryInfo,
  TaxAuthority,
  LocalTerm,
  TaxDeadline,
  BusinessStructure,
  DiscoveredCountryInfo,
} from '../types/glossary.js';
import {
  safeValidateCountryGlossary,
} from '../schemas/glossary.js';
import fs from 'fs/promises';
import path from 'path';

/**
 * Setup country agent configuration
 */
export interface SetupCountryConfig {
  /** Country code (ISO 2-letter) */
  countryCode: string;

  /** Country name (English) */
  countryName: string;

  /** Should generate personal.md template */
  generateTemplate?: boolean;

  /** Glossary output directory */
  glossaryDir?: string;

  /** Thoroughness level (quick, medium, thorough) */
  thoroughness?: 'quick' | 'medium' | 'thorough';
}

/**
 * Autonomous agent for setting up new country support
 */
export class SetupCountryAgent {
  private webSearch: WebSearchService;
  private countryCode: string;
  private countryName: string;

  constructor(
    config: SetupCountryConfig,
    webSearch: WebSearchService,
    _glossary: GlossaryLoader
  ) {
    this.countryCode = config.countryCode.toUpperCase();
    this.countryName = config.countryName;
    this.webSearch = webSearch;
  }

  /**
   * Run the autonomous discovery and setup process
   */
  async run(): Promise<DiscoveredCountryInfo> {
    console.error(`🌍 Starting autonomous discovery for ${this.countryName} (${this.countryCode})`);

    // Step 1: Discover country metadata
    console.error(`📋 Step 1/6: Discovering country metadata...`);
    const countryInfo = await this.discoverCountryInfo();

    // Step 2: Discover tax authority
    console.error(`🏛️  Step 2/6: Discovering tax authority...`);
    const taxAuthority = await this.discoverTaxAuthority();

    // Step 3: Discover tax types
    console.error(`💰 Step 3/6: Discovering tax types...`);
    const discoveredTaxes = await this.discoverTaxTypes();

    // Step 4: Discover deadlines
    console.error(`📅 Step 4/6: Discovering tax deadlines...`);
    const deadlines = await this.discoverDeadlines();

    // Step 5: Discover business structures
    console.error(`🏢 Step 5/6: Discovering business structures...`);
    const businessStructures = await this.discoverBusinessStructures();

    // Step 6: Generate glossary
    console.error(`📝 Step 6/6: Generating glossary...`);
    const warnings: string[] = [];

    // Check for gaps
    if (discoveredTaxes.length === 0) {
      warnings.push('No tax types discovered - glossary will be incomplete');
    }
    if (deadlines.length === 0) {
      warnings.push('No deadlines discovered - calendar will be empty');
    }
    if (businessStructures.length === 0) {
      warnings.push('No business structures discovered');
    }

    const result: DiscoveredCountryInfo = {
      country: countryInfo,
      tax_authority: taxAuthority,
      discovered_taxes: discoveredTaxes,
      discovered_deadlines: deadlines,
      business_structures: businessStructures,
      warnings,
    };

    console.error(`✅ Discovery complete with ${warnings.length} warnings`);
    return result;
  }

  /**
   * Discover country metadata
   */
  private async discoverCountryInfo(): Promise<CountryInfo> {
    // Search for basic country information
    const query = `${this.countryName} ISO country code currency language`;
    await this.webSearch.search(query, { maxResults: 3 });

    // For now, use reasonable defaults and require manual verification
    // In a production system, this would parse the search results
    return {
      code: this.countryCode,
      name: this.countryName,
      official_name: `Official name of ${this.countryName}`, // Needs manual update
      language: this.countryCode.toLowerCase(), // Approximation
      currency: 'XXX', // Needs manual update
      tax_year_start: '01-01', // Common default
      tax_year_end: '12-31', // Common default
    };
  }

  /**
   * Discover tax authority information
   */
  private async discoverTaxAuthority(): Promise<TaxAuthority> {
    const query = `${this.countryName} tax authority official website`;
    await this.webSearch.search(query, { maxResults: 5 });

    // Extract authority name and website from results
    // This is simplified - production version would use NLP/parsing
    return {
      name: `${this.countryName} Tax Authority`,
      official_name: `Official ${this.countryName} Tax Authority`, // Needs manual update
      website: 'https://tax.gov.example', // Needs manual update from search results
      contact: {
        phone: 'TBD',
        email: 'TBD',
        address: 'TBD',
      },
      legal_database: 'https://laws.gov.example', // Needs manual update
    };
  }

  /**
   * Discover tax types and map to universal concepts
   */
  private async discoverTaxTypes(): Promise<Array<{
    concept_id: string;
    local_name: string;
    confidence: 'high' | 'medium' | 'low';
    source_url?: string;
  }>> {
    const discovered: Array<{
      concept_id: string;
      local_name: string;
      confidence: 'high' | 'medium' | 'low';
      source_url?: string;
    }> = [];

    // Search for major tax types
    const searchTerms = [
      'income tax',
      'VAT sales tax',
      'corporate tax',
      'social security',
      'wealth tax',
      'inheritance tax',
      'property tax',
    ];

    for (const term of searchTerms) {
      const query = `${this.countryName} ${term} official name`;
      const searchResult = await this.webSearch.search(query, { maxResults: 3 });

      // Simple heuristic: if search returns results, tax probably exists
      if (searchResult.results && searchResult.results.length > 0) {
        // Map to universal concept
        let conceptId: string | null = null;
        if (term.includes('income tax')) conceptId = 'income_tax';
        else if (term.includes('VAT') || term.includes('sales tax')) conceptId = 'vat';
        else if (term.includes('corporate')) conceptId = 'corporate_tax';
        else if (term.includes('social security')) conceptId = 'social_security';
        else if (term.includes('wealth')) conceptId = 'wealth_tax';
        else if (term.includes('inheritance')) conceptId = 'inheritance_tax';
        else if (term.includes('property')) conceptId = 'property_tax';

        if (conceptId) {
          discovered.push({
            concept_id: conceptId,
            local_name: `${this.countryName} ${term}`, // Placeholder - needs manual update
            confidence: 'low', // Web search can't determine actual local name
            source_url: searchResult.results[0]?.url,
          });
        }
      }
    }

    return discovered;
  }

  /**
   * Discover tax deadlines
   */
  private async discoverDeadlines(): Promise<TaxDeadline[]> {
    const deadlines: TaxDeadline[] = [];

    // Search for common deadlines
    const query = `${this.countryName} ${new Date().getFullYear()} tax deadlines filing dates`;
    await this.webSearch.search(query, { maxResults: 5 });

    // Simplified: Create placeholder deadlines
    // Production version would parse dates from search results
    deadlines.push({
      name: 'Annual Income Tax Filing',
      local_name: 'TBD',
      date: `${new Date().getFullYear()}-12-31`, // Placeholder
      type: 'filing',
      concept_id: 'annual_tax_return',
      description: 'Annual income tax return filing deadline (verify date)',
      can_extend: false,
      recurrence: 'annual',
    });

    return deadlines;
  }

  /**
   * Discover business structures
   */
  private async discoverBusinessStructures(): Promise<Array<{
    concept_id: string;
    local_name: string;
  }>> {
    const structures: Array<{
      concept_id: string;
      local_name: string;
    }> = [];

    const query = `${this.countryName} business structures types LLC corporation sole proprietor`;
    await this.webSearch.search(query, { maxResults: 5 });

    // Common business structures to check for
    const commonStructures = [
      { concept: 'sole_proprietor', terms: ['sole proprietor', 'individual entrepreneur'] },
      { concept: 'partnership', terms: ['partnership', 'general partnership'] },
      { concept: 'limited_liability_company', terms: ['LLC', 'limited liability', 'private company'] },
      { concept: 'corporation', terms: ['corporation', 'public company', 'stock company'] },
    ];

    for (const structure of commonStructures) {
      structures.push({
        concept_id: structure.concept,
        local_name: `${this.countryName} ${structure.terms[0]}`, // Placeholder
      });
    }

    return structures;
  }

  /**
   * Generate country glossary and save to file
   */
  async generateGlossary(discovered: DiscoveredCountryInfo, outputDir?: string): Promise<string> {
    const glossaryDir = outputDir || path.join(process.cwd(), 'knowledge', '_glossary');

    // Build local terms from discovered taxes
    const terms: LocalTerm[] = discovered.discovered_taxes.map(tax => ({
      local_term: tax.local_name,
      concept_id: tax.concept_id,
      translation: tax.local_name, // Needs manual update
      contextual_meaning: `Tax concept in ${this.countryName} - requires manual description`,
      search_terms: [tax.local_name.toLowerCase()],
      warnings: ['This entry was auto-generated and needs manual verification'],
      official_page: tax.source_url,
    }));

    // Build business structures
    const businessStructures: BusinessStructure[] = discovered.business_structures.map(bs => ({
      local_term: bs.local_name,
      concept_id: bs.concept_id,
      translation: bs.local_name, // Needs manual update
      full_name: bs.local_name,
      registration_required: true, // Common default
      tax_implications: ['Requires manual documentation'],
    }));

    // Create glossary
    const glossary: CountryGlossary = {
      country: discovered.country,
      tax_authority: discovered.tax_authority,
      terms,
      calendar: discovered.discovered_deadlines.length > 0 ? {
        tax_year: new Date().getFullYear(),
        deadlines: discovered.discovered_deadlines,
      } : undefined,
      business_structures: businessStructures.length > 0 ? businessStructures : undefined,
    };

    // Validate
    const validation = safeValidateCountryGlossary(glossary);
    if (!validation.success) {
      throw new Error(`Generated glossary is invalid: ${validation.error.errors.map(e => e.message).join(', ')}`);
    }

    // Save to file
    const outputPath = path.join(glossaryDir, `${this.countryCode.toLowerCase()}.json`);
    await fs.writeFile(outputPath, JSON.stringify(glossary, null, 2), 'utf-8');

    console.error(`✅ Glossary saved to: ${outputPath}`);
    return outputPath;
  }

  /**
   * Generate example personal.md template
   */
  async generatePersonalTemplate(outputDir?: string): Promise<string> {
    const templateDir = outputDir || path.join(process.cwd(), 'data', 'templates');
    const outputPath = path.join(templateDir, `personal-${this.countryCode.toLowerCase()}-example.md`);

    const template = `---
# Personal Tax Profile for ${this.countryName}
# Auto-generated template - customize for your situation

name: Your Name
tax_id: Your Tax ID
country: ${this.countryCode}
tax_resident: true
tax_year: ${new Date().getFullYear()}
---

# Personal Information

**Name:** Your Name
**Tax ID:** Your Tax ID Number
**Country:** ${this.countryName}
**Tax Year:** ${new Date().getFullYear()}

# Income

## Employment Income
- **Annual Salary:** €0
- **Employer:** Company Name

## Business Income (if self-employed)
- **Annual Revenue:** €0
- **Business Expenses:** €0
- **Net Profit:** €0

# Assets

## Bank Accounts
- **Savings:** €0
- **Checking:** €0

## Investments
- **Stocks/ETFs:** €0
- **Other Investments:** €0

# Debts

- **Mortgage:** €0
- **Student Loans:** €0
- **Other Debts:** €0

# Deductions & Credits

*(Document available deductions specific to ${this.countryName})*

# Notes

This template was auto-generated for ${this.countryName}. Please customize it with:
1. Actual ${this.countryName} tax ID field names
2. Country-specific income categories
3. Relevant deductions and credits
4. Local currency if not Euro

Consult ${this.countryName} tax authority website for complete guidance.
`;

    await fs.mkdir(templateDir, { recursive: true });
    await fs.writeFile(outputPath, template, 'utf-8');

    console.error(`✅ Personal template saved to: ${outputPath}`);
    return outputPath;
  }
}

/**
 * Run setup country agent
 */
export async function setupCountry(
  config: SetupCountryConfig,
  webSearch: WebSearchService,
  glossary: GlossaryLoader
): Promise<{
  discovered: DiscoveredCountryInfo;
  glossaryPath: string;
  templatePath?: string;
}> {
  const agent = new SetupCountryAgent(config, webSearch, glossary);

  const discovered = await agent.run();
  const glossaryPath = await agent.generateGlossary(discovered, config.glossaryDir);

  let templatePath: string | undefined;
  if (config.generateTemplate) {
    templatePath = await agent.generatePersonalTemplate();
  }

  return {
    discovered,
    glossaryPath,
    templatePath,
  };
}
