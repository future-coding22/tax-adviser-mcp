/**
 * Tax Knowledge Factory
 *
 * Factory pattern for creating country-specific ITaxKnowledge implementations.
 * Automatically selects the correct implementation based on country code.
 */

import { ITaxKnowledge } from './ITaxKnowledge.js';
import { DutchTaxKnowledge } from './DutchTaxKnowledge.js';
import { GlossaryLoader, getGlossaryLoader } from '../services/glossary-loader.js';
import path from 'path';

/**
 * Configuration for tax knowledge factory
 */
export interface TaxKnowledgeConfig {
  /** Path to tax rules directory */
  taxRulesDir: string;

  /** Path to glossary directory */
  glossaryDir: string;

  /** Default country code */
  defaultCountry?: string;
}

/**
 * Factory for creating country-specific tax knowledge implementations
 */
export class TaxKnowledgeFactory {
  private glossaryLoader: GlossaryLoader;
  private config: TaxKnowledgeConfig;
  private cache: Map<string, ITaxKnowledge> = new Map();

  constructor(config: TaxKnowledgeConfig) {
    this.config = config;
    this.glossaryLoader = getGlossaryLoader(config.glossaryDir);
  }

  /**
   * Create tax knowledge implementation for a country
   */
  async create(countryCode: string): Promise<ITaxKnowledge> {
    const normalizedCode = countryCode.toUpperCase();

    // Check cache first
    if (this.cache.has(normalizedCode)) {
      return this.cache.get(normalizedCode)!;
    }

    // Check if glossary exists for this country
    const hasGlossary = await this.glossaryLoader.hasCountry(normalizedCode);
    if (!hasGlossary) {
      throw new Error(
        `No glossary found for country ${countryCode}. Use add_country tool to set up support for this country.`
      );
    }

    // Create country-specific implementation
    const instance = await this.createImplementation(normalizedCode);

    // Cache the instance
    this.cache.set(normalizedCode, instance);

    return instance;
  }

  /**
   * Create the actual implementation based on country code
   */
  private async createImplementation(countryCode: string): Promise<ITaxKnowledge> {
    switch (countryCode) {
      case 'NL':
        return this.createDutchImplementation();

      // Add more countries here as they are implemented
      // case 'US':
      //   return this.createUSImplementation();
      // case 'GB':
      //   return this.createUKImplementation();

      default:
        throw new Error(
          `Tax knowledge implementation not yet available for ${countryCode}. ` +
          `The glossary exists but the calculation logic has not been implemented. ` +
          `Currently supported countries: NL`
        );
    }
  }

  /**
   * Create Dutch tax knowledge implementation
   */
  private createDutchImplementation(): ITaxKnowledge {
    const taxRulesPath = path.join(this.config.taxRulesDir, 'dutch-tax-2024.json');
    return new DutchTaxKnowledge(this.glossaryLoader, taxRulesPath);
  }

  /**
   * Get default country implementation
   */
  async getDefault(): Promise<ITaxKnowledge> {
    const defaultCountry = this.config.defaultCountry || 'NL';
    return await this.create(defaultCountry);
  }

  /**
   * List all countries with glossaries
   */
  async listAvailableCountries(): Promise<string[]> {
    return await this.glossaryLoader.listCountries();
  }

  /**
   * List countries with full implementation (glossary + calculation logic)
   */
  listImplementedCountries(): string[] {
    return ['NL']; // Expand as more countries are implemented
  }

  /**
   * Check if a country has full implementation
   */
  hasImplementation(countryCode: string): boolean {
    const normalizedCode = countryCode.toUpperCase();
    return this.listImplementedCountries().includes(normalizedCode);
  }

  /**
   * Check if a country has glossary (even if not fully implemented)
   */
  async hasGlossary(countryCode: string): Promise<boolean> {
    return await this.glossaryLoader.hasCountry(countryCode);
  }

  /**
   * Clear cache
   */
  clearCache(): void {
    this.cache.clear();
    this.glossaryLoader.clearCache();
  }

  /**
   * Clear cache for specific country
   */
  clearCountryCache(countryCode: string): void {
    const normalizedCode = countryCode.toUpperCase();
    this.cache.delete(normalizedCode);
    this.glossaryLoader.clearCountryCache(normalizedCode);
  }

  /**
   * Get glossary loader (for direct glossary access)
   */
  getGlossaryLoader(): GlossaryLoader {
    return this.glossaryLoader;
  }
}

/**
 * Singleton factory instance
 */
let factoryInstance: TaxKnowledgeFactory | null = null;

/**
 * Get or create singleton factory
 */
export function getTaxKnowledgeFactory(config?: TaxKnowledgeConfig): TaxKnowledgeFactory {
  if (!factoryInstance) {
    if (!config) {
      throw new Error('TaxKnowledgeFactory not initialized. Provide config on first call.');
    }
    factoryInstance = new TaxKnowledgeFactory(config);
  }
  return factoryInstance;
}

/**
 * Reset factory (mainly for testing)
 */
export function resetTaxKnowledgeFactory(): void {
  factoryInstance = null;
}

/**
 * Create a new factory instance (non-singleton)
 */
export function createTaxKnowledgeFactory(config: TaxKnowledgeConfig): TaxKnowledgeFactory {
  return new TaxKnowledgeFactory(config);
}
