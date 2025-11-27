import type { ResourceHandler, MCPResource, ResourceContent } from './index.js';
import { getDutchTaxKnowledge, createDutchTaxKnowledge } from '../context/dutch-tax-knowledge.js';

/**
 * Tax calendar and rates resource handler
 * Exposes Dutch tax calendar and rates as MCP resources
 */
export class TaxCalendarResource implements ResourceHandler {
  private taxRulesPath: string = './data/dutch-tax-rules.json';
  private initialized: boolean = false;

  /**
   * Set tax rules path
   */
  setTaxRulesPath(path: string): void {
    this.taxRulesPath = path;
  }

  /**
   * Initialize tax knowledge
   */
  private ensureInitialized(): void {
    if (!this.initialized) {
      createDutchTaxKnowledge(this.taxRulesPath);
      this.initialized = true;
    }
  }

  /**
   * List available tax resources
   */
  async list(): Promise<MCPResource[]> {
    this.ensureInitialized();
    const taxKnowledge = getDutchTaxKnowledge();
    const year = taxKnowledge.getTaxYear();

    return [
      {
        uri: `tax://calendar/${year}`,
        name: `Dutch Tax Calendar ${year}`,
        description: `Key tax dates, deadlines, and important events for ${year}`,
        mimeType: 'application/json',
      },
      {
        uri: `tax://rates/${year}`,
        name: `Dutch Tax Rates ${year}`,
        description: `Income tax brackets, Box 3 rates, BTW rates, and all tax percentages for ${year}`,
        mimeType: 'application/json',
      },
      {
        uri: `tax://deductions/${year}`,
        name: `Dutch Tax Deductions ${year}`,
        description: `Self-employment deductions, credits, and limits for ${year}`,
        mimeType: 'application/json',
      },
      {
        uri: 'tax://rules',
        name: 'Dutch Tax Rules (Complete)',
        description: 'Complete Dutch tax rules database with all rates, brackets, and regulations',
        mimeType: 'application/json',
      },
    ];
  }

  /**
   * Read tax resource
   */
  async read(uri: string): Promise<ResourceContent> {
    this.ensureInitialized();
    const taxKnowledge = getDutchTaxKnowledge();

    // Parse URI
    const match = uri.match(/^tax:\/\/(\w+)(?:\/(\d{4}))?$/);
    if (!match) {
      throw new Error(`Invalid tax resource URI: ${uri}`);
    }

    const [_, resourceType, yearStr] = match;
    const year = yearStr ? parseInt(yearStr) : taxKnowledge.getTaxYear();

    // Validate year
    if (year !== taxKnowledge.getTaxYear()) {
      throw new Error(`Tax data only available for ${taxKnowledge.getTaxYear()}`);
    }

    switch (resourceType) {
      case 'calendar':
        return this.getCalendar(uri, year);
      case 'rates':
        return this.getRates(uri, year);
      case 'deductions':
        return this.getDeductions(uri, year);
      case 'rules':
        return this.getRules(uri);
      default:
        throw new Error(`Unknown tax resource type: ${resourceType}`);
    }
  }

  /**
   * Get tax calendar
   */
  private getCalendar(uri: string, year: number): ResourceContent {
    const taxKnowledge = getDutchTaxKnowledge();
    const deadlines = taxKnowledge.getDeadlines();

    const calendar = {
      year,
      important_dates: [
        {
          date: 'March 1',
          event: 'Income tax return portal opens',
          description: 'You can start filing your annual income tax return',
          category: 'income-tax',
        },
        {
          date: deadlines.income_tax_filing,
          event: 'Income tax filing deadline',
          description: 'Standard deadline for most taxpayers',
          category: 'income-tax',
          critical: true,
        },
        {
          date: deadlines.income_tax_extension,
          event: 'Income tax extended deadline',
          description: 'Extended deadline if requested before May 1',
          category: 'income-tax',
        },
      ],
      btw_deadlines: deadlines.btw_quarterly.map((date, index) => ({
        quarter: `Q${index + 1}`,
        deadline: date,
        description: `BTW quarterly filing and payment deadline for Q${index + 1}`,
        category: 'btw',
      })),
      provisional_assessment: {
        description: 'Voorlopige aanslag - provisional tax assessments',
        frequency: deadlines.provisional_assessment.frequency,
        months: deadlines.provisional_assessment.months,
      },
      monthly_reminders: [
        {
          day: 1,
          description: 'First of month - common payment date for rent, insurance, etc.',
        },
        {
          day: 15,
          description: 'Mid-month - common utility payment date',
        },
      ],
      next_deadline: taxKnowledge.getNextDeadline(),
    };

    return {
      uri,
      mimeType: 'application/json',
      content: calendar,
    };
  }

  /**
   * Get tax rates
   */
  private getRates(uri: string, year: number): ResourceContent {
    const taxKnowledge = getDutchTaxKnowledge();
    const rules = taxKnowledge.getRules();

    const rates = {
      year,
      income_tax: {
        box1: {
          brackets: rules.income_tax.box1_brackets.map((b) => ({
            from: taxKnowledge.formatCurrency(b.from),
            to: b.to ? taxKnowledge.formatCurrency(b.to) : 'and above',
            rate: taxKnowledge.formatPercentage(b.rate),
            rate_decimal: b.rate,
          })),
          general_credit: {
            maximum: taxKnowledge.formatCurrency(rules.income_tax.general_credit.max),
            phase_out_start: taxKnowledge.formatCurrency(
              rules.income_tax.general_credit.phase_out_start
            ),
            phase_out_rate: taxKnowledge.formatPercentage(
              rules.income_tax.general_credit.phase_out_rate
            ),
          },
          labor_credit: {
            maximum: taxKnowledge.formatCurrency(rules.income_tax.labor_credit.max),
            description: 'Progressive credit for working income with phase-out',
          },
        },
        box2: {
          description: rules.box2.description,
          threshold: taxKnowledge.formatPercentage(rules.box2.threshold_percentage),
          rate: taxKnowledge.formatPercentage(rules.box2.tax_rate),
        },
        box3: {
          exemption_single: taxKnowledge.formatCurrency(rules.box3.exemption),
          exemption_partners: taxKnowledge.formatCurrency(rules.box3.exemption_partners),
          deemed_returns: rules.box3.deemed_return_categories.map((c) => ({
            category: c.category,
            description: c.description,
            rate: taxKnowledge.formatPercentage(c.rate),
          })),
          tax_rate: taxKnowledge.formatPercentage(rules.box3.tax_rate),
        },
      },
      btw: {
        standard_rate: taxKnowledge.formatPercentage(rules.btw.standard_rate),
        reduced_rate: taxKnowledge.formatPercentage(rules.btw.reduced_rate),
        zero_rate: taxKnowledge.formatPercentage(rules.btw.zero_rate),
        kor_threshold: taxKnowledge.formatCurrency(rules.btw.small_business_threshold),
      },
    };

    return {
      uri,
      mimeType: 'application/json',
      content: rates,
    };
  }

  /**
   * Get deductions and credits
   */
  private getDeductions(uri: string, year: number): ResourceContent {
    const taxKnowledge = getDutchTaxKnowledge();
    const rules = taxKnowledge.getRules();

    const deductions = {
      year,
      self_employment: {
        zelfstandigenaftrek: {
          amount: taxKnowledge.formatCurrency(taxKnowledge.getZelfstandigenaftrek()),
          hours_requirement: taxKnowledge.getHoursRequirement(),
          description: 'Self-employment deduction (being phased out)',
          phase_out_schedule: rules.self_employment.zelfstandigenaftrek.phase_out_schedule,
        },
        startersaftrek: {
          amount: taxKnowledge.formatCurrency(taxKnowledge.getStartersaftrek()),
          description: 'Additional deduction for first 3 years as entrepreneur',
          eligibility: rules.self_employment.startersaftrek.eligibility,
        },
        mkb_vrijstelling: {
          percentage: taxKnowledge.formatPercentage(taxKnowledge.getMKBVrijstelling()),
          description: rules.self_employment.mkb_vrijstelling.description,
        },
      },
      other_deductions: {
        gifts: {
          minimum: taxKnowledge.formatCurrency(rules.deduction_limits.gifts.minimum),
          maximum_percentage: taxKnowledge.formatPercentage(
            rules.deduction_limits.gifts.maximum_percentage
          ),
          requirements: rules.deduction_limits.gifts.requirements,
        },
        medical_expenses: {
          threshold_percentage: taxKnowledge.formatPercentage(
            rules.deduction_limits.medical_expenses.threshold_percentage
          ),
          description: rules.deduction_limits.medical_expenses.description,
        },
        mortgage_interest: {
          description: rules.deduction_limits.mortgage_interest.description,
          requirements: rules.deduction_limits.mortgage_interest.requirements,
        },
      },
      special_rules: {
        thirty_percent_ruling: rules.special_rules['30_percent_ruling'],
        tax_partner: rules.special_rules.tax_partner,
      },
    };

    return {
      uri,
      mimeType: 'application/json',
      content: deductions,
    };
  }

  /**
   * Get complete tax rules
   */
  private getRules(uri: string): ResourceContent {
    const taxKnowledge = getDutchTaxKnowledge();

    return {
      uri,
      mimeType: 'application/json',
      content: taxKnowledge.getRules(),
    };
  }
}
