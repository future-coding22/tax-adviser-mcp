/**
 * ITaxKnowledge Interface
 *
 * Country-agnostic interface for tax knowledge and calculations.
 * Each country implements this interface with country-specific logic.
 */

import {
  TaxBracket,
  TaxCredit,
  Deduction,
  VATRates,
  SelfEmploymentRules,
  TaxDeadline,
  BusinessStructure,
  CountryInfo,
  TaxAuthority,
} from '../types/glossary.js';

/**
 * Tax calculation result
 */
export interface TaxCalculationResult {
  /** Total tax due */
  totalTax: number;

  /** Breakdown by tax type */
  breakdown: {
    incomeTax?: number;
    socialSecurity?: number;
    healthInsurance?: number;
    wealthTax?: number;
    vat?: number;
    [key: string]: number | undefined;
  };

  /** Tax credits applied */
  credits: TaxCredit[];

  /** Deductions applied */
  deductions: Deduction[];

  /** Effective tax rate (percentage) */
  effectiveRate: number;

  /** Marginal tax rate (percentage) */
  marginalRate: number;

  /** Additional details specific to country */
  details?: any;
}

/**
 * Tax obligation information
 */
export interface TaxObligation {
  /** Obligation ID (concept_id) */
  id: string;

  /** Name in local language */
  name: string;

  /** English translation */
  translation: string;

  /** Description */
  description: string;

  /** Applicable to this taxpayer */
  applicable: boolean;

  /** Reason why not applicable (if applicable = false) */
  notApplicableReason?: string;

  /** Deadlines for this obligation */
  deadlines: TaxDeadline[];

  /** Current rates if applicable */
  rates?: any;
}

/**
 * Personal tax profile (country-agnostic)
 */
export interface PersonalTaxProfile {
  /** Annual employment income */
  employmentIncome?: number;

  /** Annual business income */
  businessIncome?: number;

  /** Self-employed status */
  selfEmployed: boolean;

  /** Hours worked in business per year */
  businessHours?: number;

  /** Total assets */
  assets?: number;

  /** Total debts */
  debts?: number;

  /** Home ownership */
  homeOwnership?: {
    owned: boolean;
    mortgageDebt?: number;
    mortgageInterest?: number;
    propertyValue?: number;
  };

  /** Additional country-specific fields */
  [key: string]: any;
}

/**
 * Country-agnostic tax knowledge interface
 */
export interface ITaxKnowledge {
  /**
   * Get country information
   */
  getCountryInfo(): Promise<CountryInfo>;

  /**
   * Get tax authority information
   */
  getTaxAuthority(): Promise<TaxAuthority>;

  /**
   * Get income tax brackets
   */
  getIncomeTaxBrackets(year: number): Promise<TaxBracket[]>;

  /**
   * Calculate income tax
   */
  calculateIncomeTax(income: number, year: number): Promise<number>;

  /**
   * Get available tax credits
   */
  getTaxCredits(profile: PersonalTaxProfile, year: number): Promise<TaxCredit[]>;

  /**
   * Get available tax deductions
   */
  getTaxDeductions(profile: PersonalTaxProfile, year: number): Promise<Deduction[]>;

  /**
   * Calculate total tax liability
   */
  calculateTotalTax(profile: PersonalTaxProfile, year: number): Promise<TaxCalculationResult>;

  /**
   * Get VAT rates
   */
  getVATRates(year: number): Promise<VATRates | null>;

  /**
   * Calculate VAT amount
   */
  calculateVAT(amount: number, rate: 'standard' | 'reduced' | 'zero', year: number): Promise<number>;

  /**
   * Get self-employment rules and deductions
   */
  getSelfEmploymentRules(year: number): Promise<SelfEmploymentRules>;

  /**
   * Get tax obligations for a profile
   */
  getTaxObligations(profile: PersonalTaxProfile, year: number): Promise<TaxObligation[]>;

  /**
   * Get tax deadlines for a year
   */
  getTaxDeadlines(year: number): Promise<TaxDeadline[]>;

  /**
   * Get business structures available in country
   */
  getBusinessStructures(): Promise<BusinessStructure[]>;

  /**
   * Search tax concepts/terms
   */
  searchTaxTerms(query: string): Promise<Array<{
    term: string;
    translation: string;
    description: string;
    conceptId: string;
  }>>;

  /**
   * Get detailed information about a tax concept
   */
  getTaxConceptInfo(conceptId: string): Promise<{
    localTerm: string;
    translation: string;
    description: string;
    officialPage?: string;
    currentValues?: any;
    warnings?: string[];
  } | null>;

  /**
   * Estimate tax refund or payment
   */
  estimateTaxRefund(
    profile: PersonalTaxProfile,
    taxesPaid: number,
    year: number
  ): Promise<{
    refund: number;
    payment: number;
    net: number;
  }>;

  /**
   * Get tax planning suggestions
   */
  getTaxPlanningSuggestions(profile: PersonalTaxProfile, year: number): Promise<string[]>;

  /**
   * Validate tax profile for completeness
   */
  validateProfile(profile: PersonalTaxProfile): Promise<{
    valid: boolean;
    errors: string[];
    warnings: string[];
  }>;
}
