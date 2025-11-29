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
          date: deadlines.incomeTaxFiling,
          event: 'Income tax filing deadline',
          description: 'Standard deadline for most taxpayers',
          category: 'income-tax',
          critical: true,
        },
        {
          date: deadlines.incomeTaxExtension,
          event: 'Income tax extended deadline',
          description: 'Extended deadline if requested before May 1',
          category: 'income-tax',
        },
      ],
      btw_deadlines: deadlines.btwQuarterly.map((date, index) => ({
        quarter: `Q${index + 1}`,
        deadline: date,
        description: `BTW quarterly filing and payment deadline for Q${index + 1}`,
        category: 'btw',
      })),
      provisional_assessment: {
        description: 'Voorlopige aanslag - provisional tax assessments',
        months: deadlines.provisionalAssessment,
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
          brackets: rules.incomeTax.box1Brackets.map((b) => ({
            from: taxKnowledge.formatCurrency(b.from),
            to: b.to ? taxKnowledge.formatCurrency(b.to) : 'and above',
            rate: taxKnowledge.formatPercentage(b.rate),
            rate_decimal: b.rate,
          })),
          general_credit: {
            maximum: taxKnowledge.formatCurrency(rules.incomeTax.generalCredit.max),
            phase_out_start: taxKnowledge.formatCurrency(
              rules.incomeTax.generalCredit.phaseOutStart
            ),
            phase_out_rate: taxKnowledge.formatPercentage(
              rules.incomeTax.generalCredit.phaseOutRate
            ),
          },
          labor_credit: {
            maximum: taxKnowledge.formatCurrency(rules.incomeTax.laborCredit.max),
            description: 'Progressive credit for working income with phase-out',
          },
        },
        box3: {
          exemption_single: taxKnowledge.formatCurrency(rules.box3.exemption),
          exemption_partners: taxKnowledge.formatCurrency(rules.box3.exemptionPartners),
          deemed_returns: rules.box3.deemedReturnBrackets.map((c) => ({
            from: c.from,
            to: c.to,
            savings_rate: taxKnowledge.formatPercentage(c.savingsRate),
            investment_rate: taxKnowledge.formatPercentage(c.investmentRate),
          })),
          tax_rate: taxKnowledge.formatPercentage(rules.box3.taxRate),
        },
      },
      btw: {
        standard_rate: taxKnowledge.formatPercentage(rules.btw.standardRate),
        reduced_rate: taxKnowledge.formatPercentage(rules.btw.reducedRate),
        zero_rate_applies: rules.btw.zeroRateApplies,
        kor_threshold: taxKnowledge.formatCurrency(rules.btw.smallBusinessThreshold),
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
        },
        startersaftrek: {
          amount: taxKnowledge.formatCurrency(taxKnowledge.getStartersaftrek()),
          description: 'Additional deduction for first 3 years as entrepreneur',
        },
        mkb_vrijstelling: {
          percentage: taxKnowledge.formatPercentage(taxKnowledge.getMKBVrijstelling()),
          description: 'SME profit exemption for small and medium-sized businesses',
        },
      },
      other_deductions: {
        gifts: {
          minimum: taxKnowledge.formatCurrency(rules.deductionLimits.giftsMinimum),
          maximum_percentage: taxKnowledge.formatPercentage(
            rules.deductionLimits.giftsMaximumPercentage
          ),
        },
        medical_expenses: {
          threshold_percentage: taxKnowledge.formatPercentage(
            rules.deductionLimits.medicalThresholdPercentage
          ),
          description: 'Medical expenses exceeding threshold percentage of income',
        },
        mortgage_interest: {
          max_percentage: taxKnowledge.formatPercentage(
            rules.deductionLimits.mortgageInterestMaxPercentage
          ),
          description: 'Mortgage interest deduction for primary residence',
        },
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
