/**
 * Zod Validation Schemas for Glossary System
 *
 * Provides runtime validation for universal concepts, country glossaries,
 * and all related data structures.
 */

import { z } from 'zod';

/**
 * Concept categories
 */
export const ConceptCategorySchema = z.enum([
  'direct_tax',
  'indirect_tax',
  'social_contribution',
  'tax_credit',
  'tax_deduction',
  'filing_requirement',
  'business_structure',
  'tax_authority',
  'calculation_method',
  'deadline',
  'exemption',
]);

/**
 * Filing frequency
 */
export const FilingFrequencySchema = z.enum([
  'monthly',
  'quarterly',
  'annual',
  'on_event',
  'never',
]);

/**
 * Universal concept metadata
 */
export const ConceptMetadataSchema = z.object({
  typical_rates: z.record(z.string(), z.number()).optional(),
  filing_frequency: z.record(z.string(), FilingFrequencySchema).optional(),
  mandatory: z.boolean().optional(),
  related_concepts: z.array(z.string()).optional(),
}).strict();

/**
 * Universal tax concept
 */
export const UniversalConceptSchema = z.object({
  id: z.string()
    .min(1, 'Concept ID cannot be empty')
    .regex(/^[a-z_]+$/, 'Concept ID must be lowercase with underscores'),
  name: z.string().min(1, 'Concept name cannot be empty'),
  description: z.string().min(10, 'Description must be at least 10 characters'),
  category: ConceptCategorySchema,
  subcategories: z.array(z.string()).optional(),
  parent: z.string().nullable().optional(),
  children: z.array(z.string()).optional(),
  applies_in: z.array(z.string().length(2, 'Country codes must be 2 characters')),
  not_applicable_in: z.array(z.string().length(2, 'Country codes must be 2 characters')),
  alternatives: z.record(
    z.string().length(2, 'Country codes must be 2 characters'),
    z.string().min(1, 'Alternative term cannot be empty')
  ),
  notes: z.string().optional(),
  metadata: ConceptMetadataSchema.optional(),
}).strict();

/**
 * Database of universal concepts
 */
export const ConceptsDatabaseSchema = z.object({
  version: z.string().regex(/^\d+\.\d+\.\d+$/, 'Version must be semver format'),
  last_updated: z.string().datetime(),
  concepts: z.array(UniversalConceptSchema).min(1, 'Must have at least one concept'),
}).strict();

/**
 * Country information
 */
export const CountryInfoSchema = z.object({
  code: z.string()
    .length(2, 'Country code must be 2 characters')
    .toUpperCase(),
  name: z.string().min(1, 'Country name cannot be empty'),
  official_name: z.string().min(1, 'Official name cannot be empty'),
  language: z.string()
    .length(2, 'Language code must be 2 characters')
    .toLowerCase(),
  currency: z.string()
    .length(3, 'Currency code must be 3 characters')
    .toUpperCase(),
  tax_year_start: z.string().regex(/^\d{2}-\d{2}$/, 'Tax year start must be MM-DD format'),
  tax_year_end: z.string().regex(/^\d{2}-\d{2}$/, 'Tax year end must be MM-DD format'),
}).strict();

/**
 * Tax authority contact information
 */
export const TaxAuthorityContactSchema = z.object({
  phone: z.string().optional(),
  email: z.string().email().optional(),
  address: z.string().optional(),
}).strict();

/**
 * Tax authority information
 */
export const TaxAuthoritySchema = z.object({
  name: z.string().min(1, 'Tax authority name cannot be empty'),
  official_name: z.string().min(1, 'Official name cannot be empty'),
  website: z.string().url('Website must be valid URL'),
  contact: TaxAuthorityContactSchema.optional(),
  legal_database: z.string().url().optional(),
}).strict();

/**
 * VAT/Sales tax rates
 */
export const VATRatesSchema = z.object({
  standard: z.number().min(0).max(100),
  reduced: z.number().min(0).max(100),
  zero: z.number().min(0).max(100),
  super_reduced: z.number().min(0).max(100).optional(),
}).strict();

/**
 * Local term current rates
 */
export const CurrentRatesSchema = z.object({
  standard: z.number().optional(),
  reduced: z.number().optional(),
  zero: z.number().optional(),
}).catchall(z.number());

/**
 * Local term in a specific country
 */
export const LocalTermSchema = z.object({
  local_term: z.string().min(1, 'Local term cannot be empty'),
  concept_id: z.string().min(1, 'Concept ID cannot be empty'),
  translation: z.string().min(1, 'Translation cannot be empty'),
  full_name: z.string().optional(),
  contextual_meaning: z.string().min(10, 'Contextual meaning must be at least 10 characters'),
  search_terms: z.array(z.string().min(1)).min(1, 'Must have at least one search term'),
  warnings: z.array(z.string()).optional(),
  official_page: z.string().url().optional(),
  current_values: z.any().optional(),
  current_rates: CurrentRatesSchema.optional(),
}).strict();

/**
 * Tax deadline type
 */
export const DeadlineTypeSchema = z.enum(['filing', 'payment', 'both']);

/**
 * Recurrence pattern
 */
export const RecurrencePatternSchema = z.enum(['monthly', 'quarterly', 'annual', 'none']);

/**
 * Tax deadline
 */
export const TaxDeadlineSchema = z.object({
  name: z.string().min(1, 'Deadline name cannot be empty'),
  local_name: z.string().optional(),
  date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, 'Date must be YYYY-MM-DD format'),
  type: DeadlineTypeSchema,
  concept_id: z.string().min(1, 'Concept ID cannot be empty'),
  description: z.string().min(1, 'Description cannot be empty'),
  can_extend: z.boolean().optional(),
  extension_deadline: z.string().regex(/^\d{4}-\d{2}-\d{2}$/).optional(),
  recurrence: RecurrencePatternSchema.optional(),
}).strict();

/**
 * Tax calendar
 */
export const TaxCalendarSchema = z.object({
  tax_year: z.number().int().min(2000).max(2100),
  deadlines: z.array(TaxDeadlineSchema),
}).strict();

/**
 * Business structure
 */
export const BusinessStructureSchema = z.object({
  local_term: z.string().min(1, 'Local term cannot be empty'),
  concept_id: z.string().min(1, 'Concept ID cannot be empty'),
  translation: z.string().min(1, 'Translation cannot be empty'),
  full_name: z.string().optional(),
  registration_required: z.boolean().optional(),
  registration_authority: z.string().optional(),
  tax_implications: z.array(z.string()).optional(),
}).strict();

/**
 * Country glossary
 */
export const CountryGlossarySchema = z.object({
  country: CountryInfoSchema,
  tax_authority: TaxAuthoritySchema,
  terms: z.array(LocalTermSchema).min(1, 'Must have at least one term'),
  calendar: TaxCalendarSchema.optional(),
  business_structures: z.array(BusinessStructureSchema).optional(),
}).strict();

/**
 * Tax bracket for progressive taxation
 */
export const TaxBracketSchema = z.object({
  from: z.number().min(0),
  to: z.number().nullable(),
  rate: z.number().min(0).max(100),
}).strict().refine(
  (data) => data.to === null || data.to > data.from,
  { message: 'Upper bound must be greater than lower bound' }
);

/**
 * Tax credit details
 */
export const TaxCreditSchema = z.object({
  name: z.string().min(1, 'Tax credit name cannot be empty'),
  amount: z.number().min(0),
  description: z.string().optional(),
  concept_id: z.string().optional(),
}).strict();

/**
 * Tax deduction details
 */
export const DeductionSchema = z.object({
  name: z.string().min(1, 'Deduction name cannot be empty'),
  amount: z.number().min(0),
  description: z.string().optional(),
  concept_id: z.string().optional(),
}).strict();

/**
 * Self-employment rules
 */
export const SelfEmploymentRulesSchema = z.object({
  deductions: z.array(DeductionSchema),
  required_hours: z.number().int().min(0).optional(),
  tax_rate: z.number().min(0).max(100).optional(),
  small_business_schemes: z.array(z.string()).optional(),
}).strict();

/**
 * Confidence level for discovered information
 */
export const ConfidenceLevelSchema = z.enum(['high', 'medium', 'low']);

/**
 * Discovered tax information
 */
export const DiscoveredTaxSchema = z.object({
  concept_id: z.string().min(1),
  local_name: z.string().min(1),
  confidence: ConfidenceLevelSchema,
  source_url: z.string().url().optional(),
}).strict();

/**
 * Discovered business structure
 */
export const DiscoveredBusinessStructureSchema = z.object({
  concept_id: z.string().min(1),
  local_name: z.string().min(1),
}).strict();

/**
 * Result of country discovery process
 */
export const DiscoveredCountryInfoSchema = z.object({
  country: CountryInfoSchema,
  tax_authority: TaxAuthoritySchema,
  discovered_taxes: z.array(DiscoveredTaxSchema),
  discovered_deadlines: z.array(TaxDeadlineSchema),
  business_structures: z.array(DiscoveredBusinessStructureSchema),
  warnings: z.array(z.string()),
}).strict();

/**
 * Validation helper functions
 */
export const validateUniversalConcept = (data: unknown) => {
  return UniversalConceptSchema.parse(data);
};

export const validateConceptsDatabase = (data: unknown) => {
  return ConceptsDatabaseSchema.parse(data);
};

export const validateCountryGlossary = (data: unknown) => {
  return CountryGlossarySchema.parse(data);
};

export const validateLocalTerm = (data: unknown) => {
  return LocalTermSchema.parse(data);
};

export const validateTaxDeadline = (data: unknown) => {
  return TaxDeadlineSchema.parse(data);
};

export const validateBusinessStructure = (data: unknown) => {
  return BusinessStructureSchema.parse(data);
};

export const validateDiscoveredCountryInfo = (data: unknown) => {
  return DiscoveredCountryInfoSchema.parse(data);
};

/**
 * Safe validation functions that return results instead of throwing
 */
export const safeValidateUniversalConcept = (data: unknown) => {
  return UniversalConceptSchema.safeParse(data);
};

export const safeValidateConceptsDatabase = (data: unknown) => {
  return ConceptsDatabaseSchema.safeParse(data);
};

export const safeValidateCountryGlossary = (data: unknown) => {
  return CountryGlossarySchema.safeParse(data);
};

export const safeValidateLocalTerm = (data: unknown) => {
  return LocalTermSchema.safeParse(data);
};
