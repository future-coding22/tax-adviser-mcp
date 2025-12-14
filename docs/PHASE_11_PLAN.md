# Phase 11: Multi-Country Support - Implementation Plan

## Overview

Transform the Tax Adviser MCP Server from Dutch-only to a **multi-country tax system** through a glossary-based architecture that abstracts country-specific logic.

## Goals

1. **Abstraction**: Separate universal tax concepts from country-specific implementations
2. **Extensibility**: Easy addition of new countries without core code changes
3. **Automation**: Autonomous agent discovers and configures new countries
4. **Consistency**: Unified interface across all countries
5. **Backward Compatibility**: Existing Dutch functionality remains unchanged

## Architecture Changes

### Before (Current)
```
Tool → DutchTaxKnowledge → dutch-tax-rules.json
```

### After (Multi-Country)
```
Tool → country parameter → TaxKnowledgeFactory → ITaxKnowledge
                                    ↓
                    ┌───────────────┴────────────────┐
                    ↓                                ↓
          DutchTaxKnowledge                USTaxKnowledge
                    ↓                                ↓
          nl.json + dutch-tax-rules.json    us.json + us-tax-rules.json
                    ↓                                ↓
          GlossaryLoader ← concepts.json (universal)
```

## Implementation Phases

---

## Phase 11.1: Universal Tax Concepts & Glossary Schema

**Goal**: Define universal tax taxonomy that works across all countries

**Duration**: 3-5 days

### Tasks

#### 1.1: Create Universal Concepts Schema

**File**: `knowledge/_glossary/concepts.json`

**Schema**:
```json
{
  "version": "1.0",
  "concepts": [
    {
      "id": "income_tax",
      "name": "Income Tax",
      "description": "Tax on personal or corporate income",
      "category": "direct_tax",
      "subcategories": ["progressive", "flat", "dual"],
      "parent": null,
      "children": ["income_tax_progressive", "income_tax_flat"],
      "applies_in": ["NL", "US", "UK", "DE", "FR"],
      "not_applicable_in": [],
      "alternatives": {
        "NL": "Inkomstenbelasting",
        "US": "Federal Income Tax",
        "UK": "Income Tax",
        "DE": "Einkommensteuer"
      }
    },
    {
      "id": "vat",
      "name": "Value Added Tax",
      "description": "Consumption tax on goods and services",
      "category": "indirect_tax",
      "parent": null,
      "children": ["vat_standard", "vat_reduced", "vat_zero"],
      "applies_in": ["NL", "UK", "DE", "FR"],
      "not_applicable_in": ["US"],
      "alternatives": {
        "NL": "BTW (Belasting over de Toegevoegde Waarde)",
        "UK": "VAT",
        "DE": "Mehrwertsteuer",
        "US": "Sales Tax"
      },
      "notes": "US uses state-level sales tax instead of federal VAT"
    }
  ]
}
```

**Concepts to Define** (minimum 50):

**Direct Taxes**:
- `income_tax` (with progressive/flat variants)
- `income_tax_progressive` (tax brackets)
- `income_tax_flat` (single rate)
- `capital_gains_tax`
- `wealth_tax`
- `inheritance_tax`
- `gift_tax`
- `property_tax`
- `corporate_tax`

**Indirect Taxes**:
- `vat` (value-added tax)
- `sales_tax` (US alternative to VAT)
- `excise_tax`
- `customs_duty`

**Social Contributions**:
- `social_security`
- `health_insurance_mandatory`
- `unemployment_insurance`
- `pension_contribution`

**Tax Credits & Deductions**:
- `tax_credit` (reduces tax liability)
- `tax_deduction` (reduces taxable income)
- `personal_allowance`
- `standard_deduction`
- `child_tax_credit`
- `mortgage_interest_deduction`
- `charitable_donation_deduction`

**Self-Employment**:
- `self_employment_tax`
- `self_employment_deduction`
- `business_expense_deduction`
- `home_office_deduction`
- `small_business_scheme`

**Filing & Compliance**:
- `tax_return`
- `provisional_assessment`
- `tax_deadline`
- `payment_deadline`
- `quarterly_filing`
- `annual_filing`

**Business Structures**:
- `sole_proprietor`
- `partnership`
- `corporation`
- `limited_liability_company`

#### 1.2: Create Concept Schema TypeScript Definitions

**File**: `src/types/glossary.ts`

```typescript
export interface UniversalConcept {
  id: string;
  name: string;
  description: string;
  category: ConceptCategory;
  subcategories?: string[];
  parent?: string | null;
  children?: string[];
  applies_in: string[]; // ISO country codes
  not_applicable_in: string[];
  alternatives: Record<string, string>; // country code → local term
  notes?: string;
  metadata?: {
    typical_rates?: Record<string, number>; // country → typical rate
    filing_frequency?: Record<string, FilingFrequency>;
  };
}

export type ConceptCategory =
  | 'direct_tax'
  | 'indirect_tax'
  | 'social_contribution'
  | 'tax_credit'
  | 'tax_deduction'
  | 'filing_requirement'
  | 'business_structure'
  | 'tax_authority'
  | 'calculation_method';

export type FilingFrequency = 'monthly' | 'quarterly' | 'annual' | 'on_event';

export interface ConceptsDatabase {
  version: string;
  last_updated: string;
  concepts: UniversalConcept[];
}
```

**Todo**:
- [ ] Create `src/types/glossary.ts` with all interfaces
- [ ] Create `knowledge/_glossary/concepts.json` with 50+ concepts
- [ ] Document each concept with examples
- [ ] Create validation schema (Zod)

---

## Phase 11.2: Dutch Reference Glossary

**Goal**: Extract all Dutch-specific knowledge into a glossary that serves as the reference implementation

**Duration**: 2-3 days

### Tasks

#### 2.1: Create Dutch Glossary File

**File**: `knowledge/_glossary/nl.json`

**Structure**:
```json
{
  "country": {
    "code": "NL",
    "name": "Netherlands",
    "official_name": "Kingdom of the Netherlands",
    "language": "nl",
    "currency": "EUR",
    "tax_year_start": "01-01",
    "tax_year_end": "12-31"
  },
  "tax_authority": {
    "name": "Belastingdienst",
    "official_name": "Dutch Tax and Customs Administration",
    "website": "https://www.belastingdienst.nl",
    "contact": {
      "phone": "0800-0543",
      "email": "info@belastingdienst.nl"
    },
    "legal_database": "https://wetten.overheid.nl"
  },
  "terms": [
    {
      "local_term": "Inkomstenbelasting",
      "concept_id": "income_tax",
      "translation": "Income Tax",
      "contextual_meaning": "Annual tax on all income earned by individuals residing in the Netherlands",
      "search_terms": [
        "inkomstenbelasting",
        "IB",
        "income tax netherlands",
        "box 1 2 3 tax"
      ],
      "warnings": [
        "Has unique 'box system' (Box 1, 2, 3) not found in most countries"
      ],
      "official_page": "https://www.belastingdienst.nl/wps/wcm/connect/nl/belastingaangifte/belastingaangifte"
    },
    {
      "local_term": "BTW",
      "concept_id": "vat",
      "translation": "VAT (Value Added Tax)",
      "full_name": "Belasting over de Toegevoegde Waarde",
      "contextual_meaning": "Tax on goods and services, collected at each stage of production",
      "search_terms": [
        "btw",
        "omzetbelasting",
        "vat netherlands",
        "btw aangifte"
      ],
      "current_rates": {
        "standard": 21,
        "reduced": 9,
        "zero": 0
      },
      "official_page": "https://www.belastingdienst.nl/wps/wcm/connect/nl/btw/btw"
    },
    {
      "local_term": "Box 1",
      "concept_id": "income_tax_progressive",
      "translation": "Box 1 (Work and Home)",
      "contextual_meaning": "Taxable income from employment, self-employment, and homeownership",
      "search_terms": [
        "box 1",
        "box 1 inkomstenbelasting",
        "werk en woning"
      ],
      "current_values": {
        "brackets": [
          {"from": 0, "to": 75518, "rate": 36.97},
          {"from": 75518, "to": null, "rate": 49.50}
        ]
      }
    },
    {
      "local_term": "Zelfstandigenaftrek",
      "concept_id": "self_employment_deduction",
      "translation": "Self-Employment Deduction",
      "contextual_meaning": "Deduction for self-employed individuals who meet the 1225-hour requirement",
      "search_terms": [
        "zelfstandigenaftrek",
        "self employment deduction netherlands"
      ],
      "warnings": [
        "Requires proof of 1225 hours worked per year",
        "Being phased out gradually until 2027"
      ],
      "current_values": {
        "amount": 3750,
        "phase_out_plan": {
          "2024": 3750,
          "2025": 3240,
          "2026": 1890,
          "2027": 900
        }
      }
    },
    {
      "local_term": "Aanslag",
      "concept_id": "provisional_assessment",
      "translation": "Assessment",
      "contextual_meaning": "Tax assessment issued by tax authority",
      "search_terms": [
        "aanslag belastingdienst",
        "voorlopige aanslag",
        "definitieve aanslag"
      ],
      "warnings": [
        "CAUTION: 'Aanslag' in Dutch can mean 'attack' in other contexts!",
        "Always use full term: 'belastingaanslag' (tax assessment)"
      ]
    }
  ],
  "calendar": {
    "tax_year": 2024,
    "deadlines": [
      {
        "name": "Income Tax Return Filing",
        "dutch_name": "Aangifte Inkomstenbelasting",
        "date": "2025-05-01",
        "type": "filing",
        "concept_id": "tax_return",
        "description": "Deadline for filing annual income tax return",
        "can_extend": true,
        "extension_deadline": "2025-09-01"
      },
      {
        "name": "BTW Q1 Filing",
        "dutch_name": "BTW-aangifte Q1",
        "date": "2024-04-30",
        "type": "filing",
        "concept_id": "quarterly_filing",
        "recurrence": "quarterly"
      }
    ]
  },
  "business_structures": [
    {
      "local_term": "Eenmanszaak",
      "concept_id": "sole_proprietor",
      "translation": "Sole Proprietorship",
      "registration_required": true,
      "registration_authority": "KVK (Chamber of Commerce)"
    },
    {
      "local_term": "BV",
      "concept_id": "limited_liability_company",
      "translation": "Private Limited Company",
      "full_name": "Besloten Vennootschap"
    }
  ]
}
```

**Todo**:
- [ ] Extract all Dutch terms from existing code
- [ ] Map each term to universal concept
- [ ] Add translations and contextual meanings
- [ ] Include all search terms used in current system
- [ ] Document warnings and common mistakes
- [ ] Add current rates/values for 2024

#### 2.2: Validate Dutch Glossary Completeness

**Todo**:
- [ ] Compare with `data/dutch-tax-rules.json`
- [ ] Ensure all rules are represented
- [ ] Verify all tools use covered terms
- [ ] Check calendar has all deadlines

---

## Phase 11.3: Glossary Loader Service

**Goal**: Create service to load, validate, and query glossary data

**Duration**: 3-4 days

### Tasks

#### 3.1: Create Glossary Loader Class

**File**: `src/services/glossary-loader.ts`

```typescript
import type { UniversalConcept, CountryGlossary } from '../types/glossary.js';

export class GlossaryLoader {
  private concepts: Map<string, UniversalConcept> = new Map();
  private countryGlossaries: Map<string, CountryGlossary> = new Map();
  private termIndex: Map<string, { concept_id: string; country: string }> = new Map();

  constructor(private glossaryPath: string) {}

  /**
   * Load universal concepts and all country glossaries
   */
  async initialize(): Promise<void> {
    // Load concepts.json
    await this.loadConcepts();

    // Load all country glossaries (nl.json, us.json, etc.)
    await this.loadCountryGlossaries();

    // Build search index
    this.buildIndex();
  }

  /**
   * Get concept by ID
   */
  getConcept(conceptId: string): UniversalConcept | null {
    return this.concepts.get(conceptId) || null;
  }

  /**
   * Find concept for a local term
   */
  lookupTerm(term: string, country: string): UniversalConcept | null {
    const key = `${country}:${term.toLowerCase()}`;
    const result = this.termIndex.get(key);
    if (!result) return null;
    return this.getConcept(result.concept_id);
  }

  /**
   * Find equivalent term in another country
   */
  findEquivalent(term: string, fromCountry: string, toCountry: string): string | null {
    const concept = this.lookupTerm(term, fromCountry);
    if (!concept) return null;
    return concept.alternatives[toCountry] || null;
  }

  /**
   * Get localized search terms for web queries
   */
  getSearchTerms(conceptId: string, country: string): string[] {
    const glossary = this.countryGlossaries.get(country);
    if (!glossary) return [];

    const term = glossary.terms.find(t => t.concept_id === conceptId);
    return term?.search_terms || [];
  }

  /**
   * Check if concept applies in a country
   */
  conceptAppliesIn(conceptId: string, country: string): boolean {
    const concept = this.getConcept(conceptId);
    if (!concept) return false;

    return concept.applies_in.includes(country) &&
           !concept.not_applicable_in.includes(country);
  }

  /**
   * Translate query from one country's terminology to another
   */
  localizeQuery(query: string, fromCountry: string, toCountry: string): string {
    // Tokenize query
    const words = query.toLowerCase().split(/\s+/);

    // Replace each term with equivalent
    const translatedWords = words.map(word => {
      const equivalent = this.findEquivalent(word, fromCountry, toCountry);
      return equivalent || word;
    });

    return translatedWords.join(' ');
  }

  /**
   * Get all concepts applicable in a country
   */
  getApplicableConcepts(country: string): UniversalConcept[] {
    return Array.from(this.concepts.values()).filter(c =>
      this.conceptAppliesIn(c.id, country)
    );
  }

  /**
   * Get country glossary
   */
  getCountryGlossary(country: string): CountryGlossary | null {
    return this.countryGlossaries.get(country) || null;
  }

  /**
   * Get list of supported countries
   */
  getSupportedCountries(): string[] {
    return Array.from(this.countryGlossaries.keys());
  }

  /**
   * Private: Load concepts.json
   */
  private async loadConcepts(): Promise<void> {
    const conceptsPath = `${this.glossaryPath}/concepts.json`;
    const data = JSON.parse(fs.readFileSync(conceptsPath, 'utf-8'));

    for (const concept of data.concepts) {
      this.concepts.set(concept.id, concept);
    }
  }

  /**
   * Private: Load all country glossaries
   */
  private async loadCountryGlossaries(): Promise<void> {
    const files = fs.readdirSync(this.glossaryPath);

    for (const file of files) {
      if (file === 'concepts.json') continue;
      if (!file.endsWith('.json')) continue;

      const country = file.replace('.json', '').toUpperCase();
      const data = JSON.parse(fs.readFileSync(`${this.glossaryPath}/${file}`, 'utf-8'));

      this.countryGlossaries.set(country, data);
    }
  }

  /**
   * Private: Build search index
   */
  private buildIndex(): void {
    for (const [country, glossary] of this.countryGlossaries) {
      for (const term of glossary.terms) {
        // Index local term
        const key = `${country}:${term.local_term.toLowerCase()}`;
        this.termIndex.set(key, {
          concept_id: term.concept_id,
          country
        });

        // Index all search terms
        for (const searchTerm of term.search_terms || []) {
          const searchKey = `${country}:${searchTerm.toLowerCase()}`;
          this.termIndex.set(searchKey, {
            concept_id: term.concept_id,
            country
          });
        }
      }
    }
  }
}
```

**Todo**:
- [ ] Create `src/services/glossary-loader.ts`
- [ ] Implement all public methods
- [ ] Add caching for performance
- [ ] Add validation (Zod schemas)
- [ ] Write unit tests

#### 3.2: Integration with Config

**File**: `src/config/schema.ts`

Add country configuration:

```typescript
export const configSchema = z.object({
  // ... existing fields

  country: z.object({
    current: z.string().length(2).default('NL'), // ISO code
    available: z.array(z.string().length(2)).default(['NL']),
    allow_multiple: z.boolean().default(false),
  }),

  glossary: z.object({
    enabled: z.boolean().default(true),
    path: z.string().default('./knowledge/_glossary'),
    cache_concepts: z.boolean().default(true),
  }),
});
```

**Todo**:
- [ ] Add country fields to config schema
- [ ] Update config.example.yaml
- [ ] Add glossary configuration section

---

## Phase 11.4: Tax Knowledge Factory Pattern

**Goal**: Abstract tax knowledge creation to support multiple countries

**Duration**: 3-4 days

### Tasks

#### 4.1: Create Tax Knowledge Interface

**File**: `src/context/tax-knowledge-interface.ts`

```typescript
export interface ITaxKnowledge {
  // Country identification
  getCountryCode(): string;
  getCountryName(): string;

  // Income tax calculations
  calculateIncomeTax(income: number, profile?: any): number;
  getIncomeTaxBrackets(): TaxBracket[];

  // Tax credits
  calculateTaxCredits(income: number, profile?: any): TaxCredit[];

  // Deductions
  calculateDeductions(profile: any): Deduction[];

  // VAT/Sales tax
  getVATRates(): VATRates;
  calculateVAT(amount: number, type: 'standard' | 'reduced' | 'zero'): number;

  // Deadlines
  getDeadlines(year?: number): TaxDeadline[];
  getNextDeadline(): TaxDeadline | null;

  // Tax rules
  getRules(): any;

  // Effective rate
  calculateEffectiveRate(grossIncome: number, totalTax: number): number;

  // Country-specific features
  hasProgressiveTax(): boolean;
  hasWealthTax(): boolean;
  hasSocialSecurity(): boolean;
  getSelfEmploymentRules(): SelfEmploymentRules | null;
}
```

**Todo**:
- [ ] Create `src/context/tax-knowledge-interface.ts`
- [ ] Define all required methods
- [ ] Create supporting types (TaxBracket, TaxCredit, etc.)

#### 4.2: Refactor Dutch Tax Knowledge

**File**: `src/context/dutch-tax-knowledge.ts`

Implement interface:

```typescript
export class DutchTaxKnowledge implements ITaxKnowledge {
  private glossary: CountryGlossary;
  private rules: DutchTaxRules;

  constructor(
    private rulesPath: string,
    private glossaryLoader: GlossaryLoader
  ) {
    this.glossary = glossaryLoader.getCountryGlossary('NL')!;
    this.rules = this.loadRules();
  }

  getCountryCode(): string {
    return 'NL';
  }

  getCountryName(): string {
    return 'Netherlands';
  }

  // ... implement all interface methods
}
```

**Todo**:
- [ ] Update DutchTaxKnowledge to implement ITaxKnowledge
- [ ] Add glossaryLoader dependency
- [ ] Use glossary for term lookups
- [ ] Maintain backward compatibility

#### 4.3: Create Tax Knowledge Factory

**File**: `src/context/tax-knowledge-factory.ts`

```typescript
export class TaxKnowledgeFactory {
  constructor(
    private glossaryLoader: GlossaryLoader,
    private config: Config
  ) {}

  /**
   * Create tax knowledge instance for a country
   */
  create(countryCode: string): ITaxKnowledge {
    switch (countryCode.toUpperCase()) {
      case 'NL':
        return new DutchTaxKnowledge(
          `./data/countries/nl/tax-rules.json`,
          this.glossaryLoader
        );

      case 'US':
        return new USTaxKnowledge(
          `./data/countries/us/tax-rules.json`,
          this.glossaryLoader
        );

      case 'UK':
        return new UKTaxKnowledge(
          `./data/countries/uk/tax-rules.json`,
          this.glossaryLoader
        );

      default:
        throw new Error(`Unsupported country: ${countryCode}`);
    }
  }

  /**
   * Get list of supported countries
   */
  getSupportedCountries(): string[] {
    return this.glossaryLoader.getSupportedCountries();
  }

  /**
   * Check if country is supported
   */
  isSupported(countryCode: string): boolean {
    return this.getSupportedCountries().includes(countryCode.toUpperCase());
  }
}
```

**Todo**:
- [ ] Create `src/context/tax-knowledge-factory.ts`
- [ ] Implement factory pattern
- [ ] Add country registration system
- [ ] Add validation

---

## Phase 11.5: Refactor Tools for Multi-Country

**Goal**: Update all tools to accept and use country parameter

**Duration**: 4-5 days

### Tasks

#### 5.1: Update Tool Interface

**File**: `src/types/tools.ts`

Add country to all input schemas:

```typescript
export interface GetTaxObligationsInput {
  year?: number;
  country?: string; // NEW: ISO country code, defaults to config
}

export interface CalculateTaxEstimateInput {
  year?: number;
  country?: string; // NEW
  scenario?: {
    // ... existing fields
  };
}

// ... update all tool input types
```

#### 5.2: Update Tool Registry

**File**: `src/tools/index.ts`

Add factory and glossary:

```typescript
export interface ToolDependencies {
  personalLoader: PersonalProfileLoader;
  taxKnowledgeFactory: TaxKnowledgeFactory; // NEW: was taxKnowledge
  glossaryLoader: GlossaryLoader; // NEW
  knowledgeLoader: KnowledgeLoader;
  knowledgeCache: KnowledgeCacheService;
  telegramService: TelegramService;
  webSearchService: WebSearchService;
}
```

#### 5.3: Refactor Each Tool

Example for `calculate-tax.ts`:

```typescript
export class CalculateTaxEstimateTool implements ToolHandler {
  name = 'calculate_tax_estimate';

  inputSchema = {
    type: 'object',
    properties: {
      year: { type: 'number' },
      country: { type: 'string', pattern: '^[A-Z]{2}$' }, // NEW
      scenario: { /* ... */ }
    }
  };

  constructor(
    private config: Config,
    private deps: ToolDependencies
  ) {}

  async execute(input: CalculateTaxEstimateInput): Promise<CalculateTaxEstimateOutput> {
    // Get country (default to config)
    const country = input.country || this.config.country.current;

    // Get country-specific tax knowledge
    const taxKnowledge = this.deps.taxKnowledgeFactory.create(country);

    // Get country glossary
    const glossary = this.deps.glossaryLoader.getCountryGlossary(country);

    // Rest of calculation uses taxKnowledge interface
    // ... (mostly unchanged)

    return {
      country, // NEW: include in response
      country_name: taxKnowledge.getCountryName(), // NEW
      // ... rest of response
    };
  }
}
```

**Todo**:
- [ ] Update all 10 tools to accept country parameter
- [ ] Use TaxKnowledgeFactory instead of direct DutchTaxKnowledge
- [ ] Add country to all output responses
- [ ] Update search queries to use glossary search terms
- [ ] Test each tool with NL (should work unchanged)

---

## Phase 11.6: Setup Country Autonomous Agent

**Goal**: Create intelligent agent that discovers and configures new countries

**Duration**: 5-7 days (most complex phase)

### Tasks

#### 6.1: Create Setup Country Tool

**File**: `src/tools/setup-country.ts`

```typescript
export interface SetupCountryInput {
  country_code: string; // ISO 2-letter code
  country_name?: string; // Auto-discovered if not provided
  auto_discover?: boolean; // Default: true
  manual_config?: {
    tax_authority_url?: string;
    legal_database_url?: string;
    // ... manual overrides
  };
}

export interface SetupCountryOutput {
  success: boolean;
  country_code: string;
  steps_completed: {
    discovery: boolean;
    glossary_generation: boolean;
    knowledge_population: boolean;
    template_generation: boolean;
  };
  discovered_info: DiscoveredCountryInfo;
  glossary_path: string;
  tax_rules_path: string;
  template_path: string;
  warnings: string[];
  next_steps: string[];
}
```

#### 6.2: Implement Discovery Phase

**Function**: `discoverCountryInfo()`

**Tasks**:
1. Search web for "tax authority [country]"
2. Extract official tax authority name and website
3. Search for "tax types [country]"
4. Identify which universal concepts apply
5. Search for "tax calendar [country] [year]"
6. Extract important deadlines
7. Search for "business structures [country]"
8. Map to universal business structure concepts
9. Search for "tax forms [country]"
10. Find URLs for common forms

**Web Search Queries**:
```typescript
const queries = [
  `official tax authority ${countryName}`,
  `income tax rates ${countryName} ${year}`,
  `vat rates ${countryName} ${year}`,
  `${countryName} tax calendar ${year}`,
  `business registration ${countryName}`,
  `self employment tax ${countryName}`,
  `tax deductions ${countryName}`,
  `tax filing deadlines ${countryName}`,
];
```

**Output**:
```typescript
interface DiscoveredCountryInfo {
  country: {
    code: string;
    name: string;
    official_name: string;
    language: string;
    currency: string;
  };
  tax_authority: {
    name: string;
    website: string;
    contact?: {
      phone?: string;
      email?: string;
    };
  };
  discovered_taxes: Array<{
    concept_id: string;
    local_name: string;
    confidence: 'high' | 'medium' | 'low';
  }>;
  discovered_deadlines: TaxDeadline[];
  business_structures: Array<{
    concept_id: string;
    local_name: string;
  }>;
}
```

**Todo**:
- [ ] Implement web search for tax authority
- [ ] Parse official websites
- [ ] Extract tax types
- [ ] Find deadlines
- [ ] Identify business structures
- [ ] Validate discovered information

#### 6.3: Implement Glossary Generation

**Function**: `generateCountryGlossary()`

**Process**:
1. Load universal concepts
2. For each discovered tax type:
   - Map local term to concept ID
   - Generate search terms (local term + English)
   - Add translation
   - Add contextual meaning (from web search results)
3. Structure as CountryGlossary JSON
4. Validate against schema
5. Save to `knowledge/_glossary/{country}.json`

**Example Output** (`us.json`):
```json
{
  "country": {
    "code": "US",
    "name": "United States",
    "official_name": "United States of America",
    "language": "en",
    "currency": "USD"
  },
  "tax_authority": {
    "name": "IRS",
    "official_name": "Internal Revenue Service",
    "website": "https://www.irs.gov"
  },
  "terms": [
    {
      "local_term": "Federal Income Tax",
      "concept_id": "income_tax_progressive",
      "translation": "Federal Income Tax",
      "contextual_meaning": "Progressive tax on income earned in the US",
      "search_terms": [
        "federal income tax",
        "IRS income tax",
        "1040 form"
      ],
      "current_values": {
        "brackets": [
          {"from": 0, "to": 11000, "rate": 10},
          {"from": 11000, "to": 44725, "rate": 12},
          {"from": 44725, "to": 95375, "rate": 22}
        ]
      }
    },
    {
      "local_term": "Sales Tax",
      "concept_id": "vat",
      "translation": "Sales Tax",
      "contextual_meaning": "State-level consumption tax (varies by state)",
      "search_terms": [
        "sales tax",
        "state sales tax",
        "use tax"
      ],
      "warnings": [
        "Sales tax is state-level, not federal",
        "Rates vary by state (0% to 10%+)",
        "No federal VAT in the US"
      ]
    }
  ]
}
```

**Todo**:
- [ ] Map discovered taxes to concepts
- [ ] Generate search terms
- [ ] Add translations and meanings
- [ ] Structure as JSON
- [ ] Validate schema
- [ ] Save to file

#### 6.4: Implement Knowledge Population

**Function**: `populateCountryKnowledge()`

**Process**:
1. For each discovered tax type:
   - Search for current rates using glossary search terms
   - Extract rates/values from official sources
   - Cache as knowledge entry
2. Search for tax calendar
3. Cache deadline information
4. Create `data/countries/{country}/tax-rules.json`

**Example** (`data/countries/us/tax-rules.json`):
```json
{
  "tax_year": 2024,
  "country": "US",
  "income_tax": {
    "type": "progressive",
    "brackets": [
      {"from": 0, "to": 11000, "rate": 10},
      {"from": 11000, "to": 44725, "rate": 12},
      {"from": 44725, "to": 95375, "rate": 22},
      {"from": 95375, "to": 182100, "rate": 24},
      {"from": 182100, "to": 231250, "rate": 32},
      {"from": 231250, "to": 578125, "rate": 35},
      {"from": 578125, "to": null, "rate": 37}
    ],
    "standard_deduction": {
      "single": 14600,
      "married_joint": 29200,
      "head_of_household": 21900
    }
  },
  "self_employment": {
    "tax_rate": 15.3,
    "components": {
      "social_security": 12.4,
      "medicare": 2.9
    }
  },
  "capital_gains": {
    "short_term": "ordinary_income_rate",
    "long_term": {
      "brackets": [
        {"from": 0, "to": 44625, "rate": 0},
        {"from": 44625, "to": 492300, "rate": 15},
        {"from": 492300, "to": null, "rate": 20}
      ]
    }
  }
}
```

**Todo**:
- [ ] Fetch current rates from official sources
- [ ] Structure as tax-rules.json
- [ ] Validate completeness
- [ ] Save to data/countries/{country}/
- [ ] Create knowledge cache entries

#### 6.5: Implement Template Generation

**Function**: `generatePersonalTemplate()`

**Process**:
1. Load country glossary and tax rules
2. Identify applicable sections (income types, deductions, etc.)
3. Generate country-specific `personal.example.md`
4. Include local terminology with English explanations
5. Add country-specific fields

**Example** (`data/countries/us/personal.example.md`):
```markdown
---
name: John Doe
date_of_birth: 1985-01-01
ssn: 000-00-0000  # Social Security Number
filing_status: single  # single, married_joint, married_separate, head_of_household
---

# Personal Tax Profile - United States

## Income

### W-2 Employment
- Employer: Tech Company Inc.
- Annual Salary: $80,000
- Federal Tax Withheld: $12,000
- State: California

### Self-Employment (Schedule C)
- Business Name: Freelance Consulting
- EIN: 00-0000000
- Gross Revenue: $40,000
- Business Expenses: $10,000
- Net Profit: $30,000

### Investment Income
- Capital Gains (Short-term): $2,000
- Capital Gains (Long-term): $5,000
- Dividends (Qualified): $1,500

## Deductions

### Standard vs Itemized
- Using: standard  # or itemized

### Itemized Deductions (if applicable)
- State and Local Taxes (SALT): $10,000  # Capped at $10,000
- Mortgage Interest: $8,000
- Charitable Contributions: $3,000

### Above-the-Line Deductions
- Student Loan Interest: $2,500  # Max $2,500
- HSA Contributions: $3,850
- Traditional IRA Contributions: $6,500

## Tax Credits

- Child Tax Credit: 2 children
- Education Credits: $2,000 (American Opportunity Credit)

## Estimated Tax Payments

| Quarter | Due Date | Amount Paid |
|---------|----------|-------------|
| Q1      | 04/15/24 | $5,000      |
| Q2      | 06/15/24 | $5,000      |
| Q3      | 09/15/24 | $5,000      |
| Q4      | 01/15/25 | $5,000      |
```

**Todo**:
- [ ] Generate template structure
- [ ] Include country-specific fields
- [ ] Add local terminology
- [ ] Add explanatory comments
- [ ] Save to data/countries/{country}/

#### 6.6: Integration and Validation

**Process**:
1. Validate all generated files
2. Test tax calculation with generated rules
3. Verify glossary completeness
4. Create country configuration entry
5. Update system to support new country

**Todo**:
- [ ] Validate JSON schemas
- [ ] Test ITaxKnowledge implementation
- [ ] Verify all concepts are mapped
- [ ] Add to config.yaml available countries
- [ ] Document any limitations or warnings

---

## Phase 11.7: Create Add Country MCP Tool

**Goal**: User-facing tool to add new countries through Claude

**Duration**: 2-3 days

### Tasks

#### 7.1: Create add_country Tool

**File**: `src/tools/add-country.ts`

```typescript
export class AddCountryTool implements ToolHandler {
  name = 'add_country';
  description = 'Add support for a new country through automated discovery';

  inputSchema = {
    type: 'object',
    properties: {
      country_code: {
        type: 'string',
        pattern: '^[A-Z]{2}$',
        description: 'ISO 2-letter country code (e.g., US, UK, DE)'
      },
      country_name: {
        type: 'string',
        description: 'Country name (optional, will auto-discover)'
      },
      auto_discover: {
        type: 'boolean',
        description: 'Automatically discover tax information (default: true)'
      }
    },
    required: ['country_code']
  };

  async execute(input: AddCountryInput): Promise<AddCountryOutput> {
    // 1. Validate country not already supported
    if (this.deps.taxKnowledgeFactory.isSupported(input.country_code)) {
      return {
        success: false,
        error: `Country ${input.country_code} is already supported`
      };
    }

    // 2. Run setup_country autonomous agent
    const setupTool = new SetupCountryTool(this.config, this.deps);
    const result = await setupTool.execute({
      country_code: input.country_code,
      country_name: input.country_name,
      auto_discover: input.auto_discover !== false
    });

    // 3. If successful, reload glossary and factory
    if (result.success) {
      await this.deps.glossaryLoader.initialize();
    }

    return result;
  }
}
```

**Todo**:
- [ ] Create add_country tool
- [ ] Wire to SetupCountryTool
- [ ] Add validation
- [ ] Add to tool registry
- [ ] Write tests

#### 7.2: Create Country Management Tools

Additional tools:

```typescript
// List supported countries
export class ListCountriesTool {
  name = 'list_countries';
  description = 'List all supported countries';
}

// Get country info
export class GetCountryInfoTool {
  name = 'get_country_info';
  description = 'Get detailed information about a supported country';
}

// Switch active country
export class SwitchCountryTool {
  name = 'switch_country';
  description = 'Switch the active country for tax calculations';
}

// Remove country
export class RemoveCountryTool {
  name = 'remove_country';
  description = 'Remove support for a country';
}
```

**Todo**:
- [ ] Implement all 4 management tools
- [ ] Add to tool registry
- [ ] Update API.md documentation

---

## Phase 11.8: Testing & Validation

**Goal**: Ensure multi-country system works correctly

**Duration**: 3-4 days

### Tasks

#### 8.1: Unit Tests

**Files**:
- `tests/glossary-loader.test.ts`
- `tests/tax-knowledge-factory.test.ts`
- `tests/setup-country.test.ts`

**Coverage**:
- [ ] Glossary loading and indexing
- [ ] Term lookup and translation
- [ ] Factory pattern country creation
- [ ] Setup country discovery
- [ ] Glossary generation
- [ ] Knowledge population

#### 8.2: Integration Tests

**Test Scenarios**:
- [ ] Add US as second country
- [ ] Calculate taxes for NL vs US
- [ ] Search knowledge in multiple countries
- [ ] Switch between countries
- [ ] Verify backward compatibility (NL works as before)

#### 8.3: End-to-End Testing

**User Flow**:
1. User: "Add support for United States"
2. Tool: add_country with country_code: US
3. System: Discovers US tax info
4. System: Generates US glossary
5. System: Populates US knowledge
6. System: Creates US template
7. User: "Calculate my US taxes"
8. Tool: calculate_tax_estimate with country: US
9. System: Uses US tax rules
10. User: Receives US tax calculation

**Todo**:
- [ ] Test complete flow for US
- [ ] Test complete flow for UK
- [ ] Test complete flow for DE
- [ ] Verify glossary translations work
- [ ] Test concept equivalency lookups

---

## Phase 11.9: Documentation & Migration

**Goal**: Update all documentation for multi-country support

**Duration**: 2-3 days

### Tasks

#### 9.1: Update Documentation

**Files to Update**:
- [ ] README.md - Add multi-country section
- [ ] SETUP.md - Add country selection setup
- [ ] API.md - Document country parameter on all tools
- [ ] ARCHITECTURE.md - Update with glossary system
- [ ] CONTRIBUTING.md - Add guide for adding countries

#### 9.2: Create Country Addition Guide

**File**: `docs/ADDING_COUNTRIES.md`

**Content**:
```markdown
# Adding Country Support

## Automatic Method (Recommended)

Use the `add_country` tool:

\`\`\`
Use add_country with country_code "US"
\`\`\`

The system will:
1. Discover tax authority and information
2. Generate country glossary
3. Populate knowledge base
4. Create personal.md template

## Manual Method

If automatic discovery fails:

1. Create glossary file: `knowledge/_glossary/us.json`
2. Map local terms to universal concepts
3. Create tax rules: `data/countries/us/tax-rules.json`
4. Create template: `data/countries/us/personal.example.md`
5. Implement ITaxKnowledge: `src/context/us-tax-knowledge.ts`
6. Register in factory: `src/context/tax-knowledge-factory.ts`

## Validation

Test your new country:
- `npm test -- us-tax`
- `npm run validate:country US`
```

#### 9.3: Migration Guide for Existing Users

**File**: `docs/MIGRATION_V2.md`

**Content**:
- How existing Dutch users migrate
- Config changes required
- Backward compatibility notes
- FAQ

**Todo**:
- [ ] Write comprehensive migration guide
- [ ] Test migration with existing setup
- [ ] Document breaking changes (if any)

---

## Phase 11.10: Release & Deployment

**Goal**: Release Phase 11 as v2.0.0

**Duration**: 1-2 days

### Tasks

#### 10.1: Version Bump

- [ ] Update package.json to 2.0.0
- [ ] Update all documentation versions
- [ ] Create CHANGELOG.md entry

#### 10.2: Create Release

- [ ] Git tag: `v2.0.0`
- [ ] GitHub release with notes
- [ ] npm publish (if applicable)

#### 10.3: Announce

- [ ] Update README with "Now supports multiple countries!"
- [ ] Create announcement post
- [ ] Update examples

---

## Summary of Phases

| Phase | Name | Duration | Key Deliverables |
|-------|------|----------|------------------|
| 11.1 | Universal Concepts | 3-5 days | concepts.json (50+ concepts) |
| 11.2 | Dutch Glossary | 2-3 days | nl.json (complete reference) |
| 11.3 | Glossary Loader | 3-4 days | GlossaryLoader service |
| 11.4 | Tax Knowledge Factory | 3-4 days | ITaxKnowledge interface + factory |
| 11.5 | Tool Refactoring | 4-5 days | All tools support country param |
| 11.6 | Setup Country Agent | 5-7 days | Autonomous country discovery |
| 11.7 | Add Country Tool | 2-3 days | User-facing add_country tool |
| 11.8 | Testing | 3-4 days | Unit + integration tests |
| 11.9 | Documentation | 2-3 days | Updated docs + guides |
| 11.10 | Release | 1-2 days | v2.0.0 release |

**Total Estimated Duration**: 6-8 weeks

---

## Success Criteria

Phase 11 is complete when:

- [ ] Universal concepts defined (50+ concepts)
- [ ] Dutch glossary complete and validated
- [ ] Glossary loader service implemented
- [ ] ITaxKnowledge interface defined
- [ ] All tools accept country parameter
- [ ] setup_country autonomous agent works
- [ ] add_country tool functional
- [ ] At least 3 countries supported (NL, RO, SL - Slovenia)
- [ ] Make it compatbila for EU countries. don't implement any new countries
- [ ] 90%+ test coverage for new code
- [ ] Documentation updated
- [ ] Backward compatibility maintained (NL users unaffected)
- [ ] Successfully add a new country end-to-end

---

## Risk Mitigation

### Risk 1: Web Discovery Fails
**Mitigation**: Provide manual glossary creation guide

### Risk 2: Country-Specific Edge Cases
**Mitigation**: Start with 3 well-documented countries (NL, US, UK)

### Risk 3: Performance Degradation
**Mitigation**: Cache glossary in memory, index for fast lookup

### Risk 4: Breaking Changes
**Mitigation**: Maintain backward compatibility, make country optional (defaults to NL)

---

**Next Step**: Begin Phase 11.1 by creating `knowledge/_glossary/concepts.json` with universal tax concepts.
