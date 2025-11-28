/**
 * Glossary Loader Service
 *
 * Loads and caches universal tax concepts and country-specific glossaries.
 * Provides lookup methods for terms, concepts, and country-specific information.
 */

import fs from 'fs/promises';
import path from 'path';
import {
  UniversalConcept,
  ConceptsDatabase,
  CountryGlossary,
  LocalTerm,
  CountryInfo,
  TaxAuthority,
} from '../types/glossary.js';
import {
  validateConceptsDatabase,
  validateCountryGlossary,
  safeValidateConceptsDatabase,
  safeValidateCountryGlossary,
} from '../schemas/glossary.js';

/**
 * Glossary loader and cache manager
 */
export class GlossaryLoader {
  private conceptsCache: ConceptsDatabase | null = null;
  private glossariesCache: Map<string, CountryGlossary> = new Map();
  private glossaryDir: string;

  constructor(glossaryDir?: string) {
    this.glossaryDir = glossaryDir || path.join(process.cwd(), 'knowledge', '_glossary');
  }

  /**
   * Load universal concepts database
   */
  async loadConcepts(): Promise<ConceptsDatabase> {
    if (this.conceptsCache) {
      return this.conceptsCache;
    }

    const conceptsPath = path.join(this.glossaryDir, 'concepts.json');

    try {
      const content = await fs.readFile(conceptsPath, 'utf-8');
      const data = JSON.parse(content);

      // Validate with Zod schema
      const validatedData = validateConceptsDatabase(data);

      this.conceptsCache = validatedData;
      return validatedData;
    } catch (error) {
      if ((error as NodeJS.ErrnoException).code === 'ENOENT') {
        throw new Error(`Universal concepts database not found at ${conceptsPath}`);
      }
      throw new Error(`Failed to load universal concepts: ${(error as Error).message}`);
    }
  }

  /**
   * Load country-specific glossary
   */
  async loadCountryGlossary(countryCode: string): Promise<CountryGlossary> {
    const normalizedCode = countryCode.toUpperCase();

    // Check cache first
    if (this.glossariesCache.has(normalizedCode)) {
      return this.glossariesCache.get(normalizedCode)!;
    }

    const glossaryPath = path.join(this.glossaryDir, `${normalizedCode.toLowerCase()}.json`);

    try {
      const content = await fs.readFile(glossaryPath, 'utf-8');
      const data = JSON.parse(content);

      // Validate with Zod schema
      const validatedData = validateCountryGlossary(data);

      // Cache the validated data
      this.glossariesCache.set(normalizedCode, validatedData);
      return validatedData;
    } catch (error) {
      if ((error as NodeJS.ErrnoException).code === 'ENOENT') {
        throw new Error(`Glossary for country ${countryCode} not found at ${glossaryPath}`);
      }
      throw new Error(`Failed to load glossary for ${countryCode}: ${(error as Error).message}`);
    }
  }

  /**
   * Get universal concept by ID
   */
  async getConcept(conceptId: string): Promise<UniversalConcept | null> {
    const concepts = await this.loadConcepts();
    return concepts.concepts.find(c => c.id === conceptId) || null;
  }

  /**
   * Get all concepts in a category
   */
  async getConceptsByCategory(category: string): Promise<UniversalConcept[]> {
    const concepts = await this.loadConcepts();
    return concepts.concepts.filter(c => c.category === category);
  }

  /**
   * Search concepts by keyword
   */
  async searchConcepts(keyword: string): Promise<UniversalConcept[]> {
    const concepts = await this.loadConcepts();
    const searchLower = keyword.toLowerCase();

    return concepts.concepts.filter(c =>
      c.id.includes(searchLower) ||
      c.name.toLowerCase().includes(searchLower) ||
      c.description.toLowerCase().includes(searchLower) ||
      Object.values(c.alternatives).some(alt => alt.toLowerCase().includes(searchLower))
    );
  }

  /**
   * Get local term for a concept in a specific country
   */
  async getLocalTerm(conceptId: string, countryCode: string): Promise<string | null> {
    const concept = await this.getConcept(conceptId);
    if (!concept) {
      return null;
    }

    const normalizedCode = countryCode.toUpperCase();
    return concept.alternatives[normalizedCode] || null;
  }

  /**
   * Translate local term to concept ID
   */
  async translateTerm(localTerm: string, countryCode: string): Promise<string | null> {
    const glossary = await this.loadCountryGlossary(countryCode);

    const term = glossary.terms.find(t =>
      t.local_term.toLowerCase() === localTerm.toLowerCase() ||
      t.full_name?.toLowerCase() === localTerm.toLowerCase()
    );

    return term?.concept_id || null;
  }

  /**
   * Get detailed local term information
   */
  async getLocalTermDetails(localTerm: string, countryCode: string): Promise<LocalTerm | null> {
    const glossary = await this.loadCountryGlossary(countryCode);

    return glossary.terms.find(t =>
      t.local_term.toLowerCase() === localTerm.toLowerCase() ||
      t.full_name?.toLowerCase() === localTerm.toLowerCase()
    ) || null;
  }

  /**
   * Get all local terms for a concept
   */
  async getAllLocalTerms(conceptId: string): Promise<Record<string, string>> {
    const concept = await this.getConcept(conceptId);
    return concept?.alternatives || {};
  }

  /**
   * Get country information
   */
  async getCountryInfo(countryCode: string): Promise<CountryInfo> {
    const glossary = await this.loadCountryGlossary(countryCode);
    return glossary.country;
  }

  /**
   * Get tax authority information
   */
  async getTaxAuthority(countryCode: string): Promise<TaxAuthority> {
    const glossary = await this.loadCountryGlossary(countryCode);
    return glossary.tax_authority;
  }

  /**
   * Check if country glossary exists
   */
  async hasCountry(countryCode: string): Promise<boolean> {
    const normalizedCode = countryCode.toUpperCase();
    const glossaryPath = path.join(this.glossaryDir, `${normalizedCode.toLowerCase()}.json`);

    try {
      await fs.access(glossaryPath);
      return true;
    } catch {
      return false;
    }
  }

  /**
   * List all available countries
   */
  async listCountries(): Promise<string[]> {
    try {
      const files = await fs.readdir(this.glossaryDir);
      return files
        .filter(f => f.endsWith('.json') && f !== 'concepts.json')
        .map(f => f.replace('.json', '').toUpperCase());
    } catch (error) {
      throw new Error(`Failed to list countries: ${(error as Error).message}`);
    }
  }

  /**
   * Get concepts that apply to a specific country
   */
  async getConceptsForCountry(countryCode: string): Promise<UniversalConcept[]> {
    const concepts = await this.loadConcepts();
    const normalizedCode = countryCode.toUpperCase();

    return concepts.concepts.filter(c =>
      c.applies_in.includes(normalizedCode) &&
      !c.not_applicable_in.includes(normalizedCode)
    );
  }

  /**
   * Get concepts NOT applicable to a specific country
   */
  async getInapplicableConcepts(countryCode: string): Promise<UniversalConcept[]> {
    const concepts = await this.loadConcepts();
    const normalizedCode = countryCode.toUpperCase();

    return concepts.concepts.filter(c =>
      c.not_applicable_in.includes(normalizedCode) ||
      !c.applies_in.includes(normalizedCode)
    );
  }

  /**
   * Clear all caches
   */
  clearCache(): void {
    this.conceptsCache = null;
    this.glossariesCache.clear();
  }

  /**
   * Clear cache for specific country
   */
  clearCountryCache(countryCode: string): void {
    this.glossariesCache.delete(countryCode.toUpperCase());
  }

  /**
   * Validate a glossary file without loading it
   */
  async validateGlossary(countryCode: string): Promise<{ valid: boolean; errors?: string[] }> {
    const normalizedCode = countryCode.toUpperCase();
    const glossaryPath = path.join(this.glossaryDir, `${normalizedCode.toLowerCase()}.json`);

    try {
      const content = await fs.readFile(glossaryPath, 'utf-8');
      const data = JSON.parse(content);

      const result = safeValidateCountryGlossary(data);

      if (result.success) {
        return { valid: true };
      } else {
        return {
          valid: false,
          errors: result.error.errors.map(e => `${e.path.join('.')}: ${e.message}`)
        };
      }
    } catch (error) {
      return {
        valid: false,
        errors: [(error as Error).message]
      };
    }
  }

  /**
   * Validate concepts database
   */
  async validateConcepts(): Promise<{ valid: boolean; errors?: string[] }> {
    const conceptsPath = path.join(this.glossaryDir, 'concepts.json');

    try {
      const content = await fs.readFile(conceptsPath, 'utf-8');
      const data = JSON.parse(content);

      const result = safeValidateConceptsDatabase(data);

      if (result.success) {
        return { valid: true };
      } else {
        return {
          valid: false,
          errors: result.error.errors.map(e => `${e.path.join('.')}: ${e.message}`)
        };
      }
    } catch (error) {
      return {
        valid: false,
        errors: [(error as Error).message]
      };
    }
  }

  /**
   * Get glossary statistics
   */
  async getStats(): Promise<{
    totalConcepts: number;
    conceptsByCategory: Record<string, number>;
    countriesAvailable: number;
    countries: string[];
  }> {
    const concepts = await this.loadConcepts();
    const countries = await this.listCountries();

    const conceptsByCategory: Record<string, number> = {};
    for (const concept of concepts.concepts) {
      conceptsByCategory[concept.category] = (conceptsByCategory[concept.category] || 0) + 1;
    }

    return {
      totalConcepts: concepts.concepts.length,
      conceptsByCategory,
      countriesAvailable: countries.length,
      countries
    };
  }
}

/**
 * Singleton instance for convenience
 */
let globalLoader: GlossaryLoader | null = null;

export function getGlossaryLoader(glossaryDir?: string): GlossaryLoader {
  if (!globalLoader) {
    globalLoader = new GlossaryLoader(glossaryDir);
  }
  return globalLoader;
}

export function resetGlossaryLoader(): void {
  globalLoader = null;
}
