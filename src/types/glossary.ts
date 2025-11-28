/**
 * Glossary Type Definitions for Multi-Country Tax System
 *
 * This module defines the type system for universal tax concepts and
 * country-specific glossaries that enable multi-country support.
 */

/**
 * Universal tax concept that exists across multiple countries
 */
export interface UniversalConcept {
  /** Unique identifier for the concept */
  id: string;

  /** Human-readable name (English) */
  name: string;

  /** Detailed description of the concept */
  description: string;

  /** Primary category this concept belongs to */
  category: ConceptCategory;

  /** Optional subcategories for more granular classification */
  subcategories?: string[];

  /** Parent concept ID (for hierarchical relationships) */
  parent?: string | null;

  /** Child concept IDs (for hierarchical relationships) */
  children?: string[];

  /** ISO country codes where this concept applies */
  applies_in: string[];

  /** ISO country codes where this concept does NOT apply */
  not_applicable_in: string[];

  /** Local term for this concept in each country */
  alternatives: Record<string, string>; // country code → local term

  /** Additional notes or context */
  notes?: string;

  /** Optional metadata about the concept */
  metadata?: {
    /** Typical tax rates by country */
    typical_rates?: Record<string, number>;

    /** Filing frequency by country */
    filing_frequency?: Record<string, FilingFrequency>;

    /** Whether this is mandatory or optional */
    mandatory?: boolean;

    /** Related concepts */
    related_concepts?: string[];
  };
}

/**
 * Categories for tax concepts
 */
export type ConceptCategory =
  | 'direct_tax'          // Income tax, wealth tax, etc.
  | 'indirect_tax'        // VAT, sales tax, excise tax
  | 'social_contribution' // Social security, health insurance
  | 'tax_credit'          // Reduces tax liability
  | 'tax_deduction'       // Reduces taxable income
  | 'filing_requirement'  // Tax return, quarterly filing
  | 'business_structure'  // Sole proprietor, corporation
  | 'tax_authority'       // Government agency
  | 'calculation_method'  // Progressive, flat, deemed return
  | 'deadline'            // Filing or payment deadline
  | 'exemption';          // Tax exemption or allowance

/**
 * How often a tax must be filed
 */
export type FilingFrequency = 'monthly' | 'quarterly' | 'annual' | 'on_event' | 'never';

/**
 * Database of all universal concepts
 */
export interface ConceptsDatabase {
  /** Schema version */
  version: string;

  /** Last update timestamp */
  last_updated: string;

  /** All universal tax concepts */
  concepts: UniversalConcept[];
}

/**
 * Country-specific glossary
 */
export interface CountryGlossary {
  /** Country information */
  country: CountryInfo;

  /** Tax authority information */
  tax_authority: TaxAuthority;

  /** Local terms mapped to universal concepts */
  terms: LocalTerm[];

  /** Tax calendar for the country */
  calendar?: TaxCalendar;

  /** Business structures in the country */
  business_structures?: BusinessStructure[];
}

/**
 * Country information
 */
export interface CountryInfo {
  /** ISO 2-letter country code */
  code: string;

  /** Common country name */
  name: string;

  /** Official country name */
  official_name: string;

  /** Primary language (ISO code) */
  language: string;

  /** Currency code (ISO 4217) */
  currency: string;

  /** Tax year start date (MM-DD format) */
  tax_year_start: string;

  /** Tax year end date (MM-DD format) */
  tax_year_end: string;
}

/**
 * Tax authority information
 */
export interface TaxAuthority {
  /** Common name of tax authority */
  name: string;

  /** Official full name */
  official_name: string;

  /** Primary website URL */
  website: string;

  /** Contact information */
  contact?: {
    phone?: string;
    email?: string;
    address?: string;
  };

  /** Legal database URL */
  legal_database?: string;
}

/**
 * Local term in a specific country
 */
export interface LocalTerm {
  /** The term as used locally */
  local_term: string;

  /** Universal concept this maps to */
  concept_id: string;

  /** English translation */
  translation: string;

  /** Full name if abbreviated */
  full_name?: string;

  /** What this means in context */
  contextual_meaning: string;

  /** Search terms for web queries */
  search_terms: string[];

  /** Common warnings or gotchas */
  warnings?: string[];

  /** Official page URL */
  official_page?: string;

  /** Current values or rates */
  current_values?: any;

  /** Current rates if applicable */
  current_rates?: {
    standard?: number;
    reduced?: number;
    zero?: number;
    [key: string]: number | undefined;
  };
}

/**
 * Tax calendar with deadlines
 */
export interface TaxCalendar {
  /** Tax year */
  tax_year: number;

  /** All deadlines for this year */
  deadlines: TaxDeadline[];
}

/**
 * A tax deadline
 */
export interface TaxDeadline {
  /** Deadline name */
  name: string;

  /** Local name in country language */
  local_name?: string;

  /** Date in YYYY-MM-DD format */
  date: string;

  /** Type of deadline */
  type: 'filing' | 'payment' | 'both';

  /** Universal concept this relates to */
  concept_id: string;

  /** Description */
  description: string;

  /** Can this deadline be extended */
  can_extend?: boolean;

  /** Extension deadline if applicable */
  extension_deadline?: string;

  /** Recurrence pattern */
  recurrence?: 'monthly' | 'quarterly' | 'annual' | 'none';
}

/**
 * Business structure type
 */
export interface BusinessStructure {
  /** Local term for business structure */
  local_term: string;

  /** Universal concept ID */
  concept_id: string;

  /** English translation */
  translation: string;

  /** Full name if abbreviated */
  full_name?: string;

  /** Is registration required */
  registration_required?: boolean;

  /** Which authority handles registration */
  registration_authority?: string;

  /** Tax implications */
  tax_implications?: string[];
}

/**
 * Tax bracket for progressive taxation
 */
export interface TaxBracket {
  /** Income threshold start */
  from: number;

  /** Income threshold end (null for top bracket) */
  to: number | null;

  /** Tax rate (percentage) */
  rate: number;
}

/**
 * Tax credit details
 */
export interface TaxCredit {
  /** Credit name */
  name: string;

  /** Amount in local currency */
  amount: number;

  /** Description */
  description?: string;

  /** Concept ID */
  concept_id?: string;
}

/**
 * Tax deduction details
 */
export interface Deduction {
  /** Deduction name */
  name: string;

  /** Amount in local currency */
  amount: number;

  /** Description */
  description?: string;

  /** Concept ID */
  concept_id?: string;
}

/**
 * VAT/Sales tax rates
 */
export interface VATRates {
  /** Standard rate */
  standard: number;

  /** Reduced rate */
  reduced: number;

  /** Zero rate */
  zero: number;

  /** Super-reduced rate (some countries) */
  super_reduced?: number;
}

/**
 * Self-employment rules
 */
export interface SelfEmploymentRules {
  /** Available deductions */
  deductions: Deduction[];

  /** Required hours per year */
  required_hours?: number;

  /** Self-employment tax rate */
  tax_rate?: number;

  /** Small business schemes available */
  small_business_schemes?: string[];
}

/**
 * Result of country discovery process
 */
export interface DiscoveredCountryInfo {
  /** Country information */
  country: CountryInfo;

  /** Tax authority discovered */
  tax_authority: TaxAuthority;

  /** Discovered tax types */
  discovered_taxes: Array<{
    concept_id: string;
    local_name: string;
    confidence: 'high' | 'medium' | 'low';
    source_url?: string;
  }>;

  /** Discovered deadlines */
  discovered_deadlines: TaxDeadline[];

  /** Discovered business structures */
  business_structures: Array<{
    concept_id: string;
    local_name: string;
  }>;

  /** Warnings about discovery process */
  warnings: string[];
}
