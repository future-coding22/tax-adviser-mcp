# Multi-Country Tax Support

The Tax Adviser MCP Server now supports multiple countries through a flexible glossary-based architecture. This guide explains how to use and extend multi-country support.

## Table of Contents

1. [Overview](#overview)
2. [Architecture](#architecture)
3. [Supported Countries](#supported-countries)
4. [Adding a New Country](#adding-a-new-country)
5. [Using Country-Specific Tools](#using-country-specific-tools)
6. [Glossary System](#glossary-system)
7. [Implementing Tax Calculations](#implementing-tax-calculations)

---

## Overview

### Key Features

- **Universal Tax Concepts**: Abstract tax taxonomy applicable across all countries
- **Country Glossaries**: Map country-specific terms to universal concepts
- **Autonomous Discovery**: Automatically discover tax information via web search
- **Factory Pattern**: Dynamically load country-specific implementations
- **Extensible Architecture**: Easy to add new countries

### How It Works

1. **Universal Concepts** (`knowledge/_glossary/concepts.json`): Define 54+ tax concepts that exist globally (income_tax, vat, social_security, etc.)

2. **Country Glossaries** (`knowledge/_glossary/{country}.json`): Map local terms to universal concepts for each country

3. **Tax Knowledge Interface** (`ITaxKnowledge`): Country-agnostic interface for tax calculations

4. **Factory** (`TaxKnowledgeFactory`): Creates the appropriate implementation based on country code

---

## Architecture

```
┌─────────────────────────────────────────────────────────────┐
│                        MCP Tools                             │
│  (calculate_tax, get_obligations, add_country, etc.)        │
└──────────────────┬──────────────────────────────────────────┘
                   │
                   ├─ country parameter (optional, default: NL)
                   │
┌──────────────────▼──────────────────────────────────────────┐
│              TaxKnowledgeFactory                             │
│  Creates ITaxKnowledge implementation for country            │
└──────────────────┬──────────────────────────────────────────┘
                   │
      ┌────────────┼────────────┐
      │            │            │
┌─────▼─────┐ ┌───▼────┐  ┌────▼─────┐
│   Dutch   │ │   US   │  │  Future  │
│TaxKnowl.. │ │TaxKnowl│  │ Countries│
└───────────┘ └────────┘  └──────────┘
      │            │            │
      │            │            │
┌─────▼────────────▼────────────▼─────┐
│         GlossaryLoader               │
│  Loads universal concepts &          │
│  country-specific glossaries         │
└──────────────────────────────────────┘
```

---

## Supported Countries

### Fully Implemented

| Country      | Code | Glossary | Calculations | Notes                           |
|--------------|------|----------|-------------|---------------------------------|
| Netherlands  | NL   | ✅       | ✅          | Complete with Box 1/2/3 system  |

### Glossary Only

Countries with glossaries but no calculation logic yet can still be added using the `add_country` tool. Calculation logic must be implemented manually.

---

## Adding a New Country

### Method 1: Autonomous Discovery (Recommended)

Use the `add_country` MCP tool to automatically discover and set up a new country:

```javascript
// Example: Adding Germany
{
  "country_code": "DE",
  "country_name": "Germany",
  "generate_template": true,
  "thoroughness": "medium"
}
```

**What It Does:**

1. **Discovers Tax Authority**: Searches for official German tax authority (Finanzamt) and website
2. **Finds Tax Types**: Discovers Einkommensteuer, Mehrwertsteuer, Körperschaftsteuer, etc.
3. **Identifies Deadlines**: Finds tax filing and payment deadlines
4. **Business Structures**: Discovers Einzelunternehmen, GmbH, AG, etc.
5. **Generates Glossary**: Creates `knowledge/_glossary/de.json`
6. **Creates Template**: Generates `data/templates/personal-de-example.md`

**Output:**

```
{
  "success": true,
  "country_code": "DE",
  "glossary_path": "knowledge/_glossary/de.json",
  "template_path": "data/templates/personal-de-example.md",
  "discovered_info": {
    "tax_types_found": 8,
    "deadlines_found": 4,
    "business_structures_found": 4
  },
  "warnings": ["Some fields need manual verification"],
  "next_steps": [
    "Review and update glossary with accurate local names",
    "Verify tax authority website and contact info",
    "Add current tax rates and thresholds",
    "Implement ITaxKnowledge for calculations"
  ]
}
```

**Manual Refinement Required:**

After auto-discovery, you must:

1. **Update Glossary** (`knowledge/_glossary/de.json`):
   - Replace placeholder local_term names with actual German terms
   - Add current tax rates (e.g., MwSt 19% standard, 7% reduced)
   - Verify tax authority website and contact information
   - Add contextual_meaning for each term
   - Include official_page URLs

2. **Implement Calculations** (`src/knowledge/GermanTaxKnowledge.ts`):
   ```typescript
   export class GermanTaxKnowledge implements ITaxKnowledge {
     // Implement all ITaxKnowledge methods
     // with German-specific tax calculation logic
   }
   ```

3. **Update Factory** (`src/knowledge/TaxKnowledgeFactory.ts`):
   ```typescript
   case 'DE':
     return this.createGermanImplementation();
   ```

### Method 2: Manual Creation

For full control, create a glossary manually:

1. **Copy Template**: Start with `knowledge/_glossary/nl.json` as a template

2. **Update Country Info**:
   ```json
   {
     "country": {
       "code": "DE",
       "name": "Germany",
       "official_name": "Federal Republic of Germany",
       "language": "de",
       "currency": "EUR",
       "tax_year_start": "01-01",
       "tax_year_end": "12-31"
     }
   }
   ```

3. **Add Tax Authority**:
   ```json
   {
     "tax_authority": {
       "name": "Finanzamt",
       "official_name": "Bundeszentralamt für Steuern",
       "website": "https://www.bzst.de"
     }
   }
   ```

4. **Map Terms to Concepts**:
   ```json
   {
     "terms": [
       {
         "local_term": "Einkommensteuer",
         "concept_id": "income_tax",
         "translation": "Income Tax",
         "contextual_meaning": "Progressive tax on personal income in Germany"
       }
     ]
   }
   ```

5. **Validate**: Run validation to ensure correctness:
   ```bash
   npm run validate-glossary -- DE
   ```

---

## Using Country-Specific Tools

### Calculate Tax (Multi-Country)

```javascript
// Netherlands (default)
{
  "year": 2024,
  "scenario": {
    "employment_income": 50000
  }
}

// Germany (when implemented)
{
  "country": "DE",
  "year": 2024,
  "scenario": {
    "employment_income": 50000
  }
}
```

### Get Tax Obligations

```javascript
// Netherlands
{
  "year": 2024
}

// Future: Germany
{
  "country": "DE",
  "year": 2024
}
```

---

## Glossary System

### Universal Concepts

54+ tax concepts that exist across countries:

**Direct Taxes:**
- `income_tax` - Tax on personal/business income
- `income_tax_progressive` - Progressive tax brackets
- `income_tax_flat` - Single flat rate
- `capital_gains_tax` - Tax on investment gains
- `wealth_tax` - Annual tax on net worth
- `corporate_tax` - Tax on company profits
- `inheritance_tax` - Tax on inherited assets
- `gift_tax` - Tax on gifts
- `property_tax` - Tax on real estate

**Indirect Taxes:**
- `vat` - Value Added Tax
- `sales_tax` - Retail sales tax
- `excise_tax` - Tax on specific goods (alcohol, tobacco)
- `customs_duty` - Import duties

**Social Contributions:**
- `social_security` - Pension and disability insurance
- `health_insurance_mandatory` - Required health coverage

**Tax Credits & Deductions:**
- `general_tax_credit` - Universal tax credit
- `labor_tax_credit` - Credit for employment income
- `child_tax_credit` - Credit for dependents
- `business_expenses` - Deductible business costs
- `mortgage_interest_deduction` - Home loan interest
- `charitable_donations` - Donations to charities

**Filing Requirements:**
- `annual_tax_return` - Yearly tax filing
- `quarterly_vat_return` - Quarterly VAT reporting
- `provisional_assessment` - Estimated tax bill

**Business Structures:**
- `sole_proprietor` - One-person unincorporated business
- `partnership` - Multi-person partnership
- `limited_liability_company` - Private limited company
- `corporation` - Public corporation

### Country Glossary Structure

Each country glossary (`knowledge/_glossary/{code}.json`) contains:

```json
{
  "country": {
    "code": "NL",
    "name": "Netherlands",
    "currency": "EUR",
    "tax_year_start": "01-01",
    "tax_year_end": "12-31"
  },
  "tax_authority": {
    "name": "Belastingdienst",
    "website": "https://www.belastingdienst.nl"
  },
  "terms": [
    {
      "local_term": "Inkomstenbelasting",
      "concept_id": "income_tax",
      "translation": "Income Tax",
      "contextual_meaning": "Annual tax on income...",
      "search_terms": ["inkomstenbelasting", "IB"],
      "warnings": ["Netherlands uses unique Box system"],
      "official_page": "https://...",
      "current_values": {
        "brackets_2024": [...]
      }
    }
  ],
  "calendar": {
    "tax_year": 2024,
    "deadlines": [...]
  },
  "business_structures": [...]
}
```

---

## Implementing Tax Calculations

To fully support a country, implement the `ITaxKnowledge` interface:

### Step 1: Create Implementation File

Create `src/knowledge/{Country}TaxKnowledge.ts`:

```typescript
import { ITaxKnowledge } from './ITaxKnowledge.js';
import { GlossaryLoader } from '../services/glossary-loader.js';

export class GermanTaxKnowledge implements ITaxKnowledge {
  private glossary: GlossaryLoader;
  private countryCode = 'DE';

  constructor(glossaryLoader: GlossaryLoader) {
    this.glossary = glossaryLoader;
  }

  async getCountryInfo(): Promise<CountryInfo> {
    return await this.glossary.getCountryInfo(this.countryCode);
  }

  async calculateIncomeTax(income: number, year: number): Promise<number> {
    // Implement German progressive tax calculation
    // Use German tax brackets for the given year
  }

  async getTaxCredits(profile: PersonalTaxProfile, year: number): Promise<TaxCredit[]> {
    // Return German tax credits (Grundfreibetrag, etc.)
  }

  async getTaxDeductions(profile: PersonalTaxProfile, year: number): Promise<Deduction[]> {
    // Return German deductions (Werbungskosten, Sonderausgaben, etc.)
  }

  // Implement all other ITaxKnowledge methods...
}
```

### Step 2: Update Factory

Add to `TaxKnowledgeFactory.createImplementation()`:

```typescript
case 'DE':
  return this.createGermanImplementation();

private createGermanImplementation(): ITaxKnowledge {
  return new GermanTaxKnowledge(this.glossaryLoader);
}
```

### Step 3: Update Supported List

Update `listImplementedCountries()`:

```typescript
listImplementedCountries(): string[] {
  return ['NL', 'DE'];
}
```

---

## Examples

### Example: Adding United States

```bash
# 1. Use add_country tool
{
  "country_code": "US",
  "country_name": "United States",
  "generate_template": true,
  "thoroughness": "thorough"
}

# 2. Review generated glossary
vim knowledge/_glossary/us.json

# 3. Update with accurate information:
# - Replace "Income Tax" with proper IRS forms (1040, etc.)
# - Add federal tax brackets
# - Include state tax considerations
# - Update FICA, Medicare rates
# - Add 401(k), IRA contribution limits

# 4. Implement calculations
# Create src/knowledge/USTaxKnowledge.ts
# Implement progressive federal tax brackets
# Include standard/itemized deductions
# Implement FICA calculations

# 5. Test
npm test -- --grep "US tax"
```

### Example: Querying Glossary

```javascript
// Find all concepts applicable to Germany
const concepts = await glossary.getConceptsForCountry('DE');

// Translate German term to universal concept
const conceptId = await glossary.translateTerm('Mehrwertsteuer', 'DE');
// Returns: 'vat'

// Get local term in France
const frenchTerm = await glossary.getLocalTerm('vat', 'FR');
// Returns: 'TVA (Taxe sur la Valeur Ajoutée)'
```

---

## Best Practices

### When Adding Countries

1. **Start with Discovery**: Use `add_country` tool to bootstrap
2. **Verify Everything**: Don't trust auto-discovered data blindly
3. **Use Official Sources**: Link to government tax websites
4. **Document Thoroughly**: Add warnings, notes, contextual meanings
5. **Test Calculations**: Create test cases before implementing
6. **Incremental Implementation**: Start with basic income tax, expand gradually

### Maintaining Glossaries

1. **Annual Updates**: Update rates, thresholds, brackets each tax year
2. **Track Changes**: Document when tax laws change
3. **Version Control**: Use git to track glossary modifications
4. **Validation**: Run `npm run validate-glossary` before committing

### Error Handling

1. **Graceful Degradation**: If implementation missing, show clear error
2. **Helpful Messages**: Tell users which countries are fully supported
3. **Fallback to Glossary**: Even without calculations, glossary provides value

---

## Roadmap

### Phase 1: Core Countries (Q1 2025)
- [x] Netherlands
- [ ] United States
- [ ] United Kingdom
- [ ] Germany

### Phase 2: European Union (Q2 2025)
- [ ] France
- [ ] Spain
- [ ] Italy
- [ ] Belgium

### Phase 3: Global Expansion (Q3-Q4 2025)
- [ ] Canada
- [ ] Australia
- [ ] Singapore
- [ ] Japan

---

## Contributing

Want to add support for your country? See [CONTRIBUTING.md](../CONTRIBUTING.md) for guidelines.

**Quick Start:**

1. Run `add_country` tool for your country
2. Refine the generated glossary with accurate local information
3. Implement `ITaxKnowledge` for calculations
4. Add tests
5. Submit pull request

We especially welcome contributions from:
- Tax professionals with local expertise
- Developers familiar with country tax systems
- Native speakers who can verify terminology

---

## FAQ

**Q: Can I use this for countries without full implementation?**

A: Yes! Even with just a glossary, you can:
- Look up tax terms and their meanings
- Find tax authority contact information
- See tax deadlines and calendar
- Understand business structures

**Q: How accurate is the autonomous discovery?**

A: Discovery provides a starting point but requires manual verification. Web search can find tax authority websites and general information, but specific rates, thresholds, and calculations must be verified against official sources.

**Q: Can I customize calculations for my specific situation?**

A: Yes! The `ITaxKnowledge` interface is extensible. You can create custom implementations for specific scenarios (e.g., expats, cross-border workers, etc.).

**Q: What if my country has regional variations (like US states)?**

A: Use sub-glossaries or extensions. For example:
- `us.json` - Federal taxes
- `us-ca.json` - California-specific additions
- `us-ny.json` - New York-specific additions

The architecture supports this through inheritance and composition.

---

## Support

- **Issues**: Report bugs or request countries at [GitHub Issues](https://github.com/future-coding22/tax-adviser-mcp/issues)
- **Discussions**: Ask questions in [GitHub Discussions](https://github.com/future-coding22/tax-adviser-mcp/discussions)
- **Documentation**: See [docs/](../) for detailed guides

---

*Last Updated: January 2025*
*Tax Adviser MCP Server v2.0.0*
