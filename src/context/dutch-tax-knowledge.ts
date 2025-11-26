import { readFileSync } from 'fs';
import { resolve } from 'path';
import type { DutchTaxRules } from '../types/index.js';

/**
 * Dutch tax knowledge utilities
 */
export class DutchTaxKnowledge {
  private rules: DutchTaxRules;

  constructor(rulesPath: string) {
    this.rules = this.loadRules(rulesPath);
  }

  /**
   * Load tax rules from JSON file
   */
  private loadRules(rulesPath: string): DutchTaxRules {
    try {
      const absolutePath = resolve(rulesPath);
      const content = readFileSync(absolutePath, 'utf-8');
      return JSON.parse(content);
    } catch (error) {
      throw new Error(
        `Failed to load Dutch tax rules: ${error instanceof Error ? error.message : 'Unknown error'}`
      );
    }
  }

  /**
   * Get all tax rules
   */
  getRules(): DutchTaxRules {
    return this.rules;
  }

  /**
   * Get tax year
   */
  getTaxYear(): number {
    return this.rules.tax_year;
  }

  /**
   * Calculate income tax (Box 1) before credits
   */
  calculateBox1Tax(taxableIncome: number): number {
    let tax = 0;

    for (const bracket of this.rules.income_tax.box1_brackets) {
      if (taxableIncome <= bracket.from) {
        break;
      }

      const bracketIncome = bracket.to
        ? Math.min(taxableIncome, bracket.to) - bracket.from
        : taxableIncome - bracket.from;

      tax += bracketIncome * (bracket.rate / 100);
    }

    return tax;
  }

  /**
   * Calculate general tax credit (algemene heffingskorting)
   */
  calculateGeneralCredit(income: number): number {
    const { max, phase_out_start, phase_out_end, phase_out_rate } =
      this.rules.income_tax.general_credit;

    if (income <= phase_out_start) {
      return max;
    }

    if (income >= phase_out_end) {
      return 0;
    }

    const reduction = (income - phase_out_start) * (phase_out_rate / 100);
    return Math.max(0, max - reduction);
  }

  /**
   * Calculate labor tax credit (arbeidskorting)
   */
  calculateLaborCredit(income: number): number {
    const { max, brackets, phase_out_start, phase_out_end, phase_out_rate } =
      this.rules.income_tax.labor_credit;

    let credit = 0;

    // Calculate base credit from brackets
    for (const bracket of brackets) {
      if (income <= bracket.from) {
        break;
      }

      if (bracket.type === 'percentage_of_income') {
        const bracketIncome = Math.min(income, bracket.to || income) - bracket.from;
        credit += bracketIncome * (bracket.rate / 100);
      } else if (bracket.type === 'base_plus_percentage') {
        credit = bracket.base;
        if (income > bracket.from) {
          const excess = Math.min(income, bracket.to || income) - bracket.from;
          credit += excess * (bracket.additional_rate / 100);
        }
      } else if (bracket.type === 'fixed') {
        credit = bracket.amount;
      }
    }

    // Cap at maximum
    credit = Math.min(credit, max);

    // Apply phase-out
    if (income > phase_out_start) {
      const reduction = Math.min(income, phase_out_end) - phase_out_start;
      credit = Math.max(0, credit - reduction * (phase_out_rate / 100));
    }

    return credit;
  }

  /**
   * Calculate Box 3 tax
   */
  calculateBox3Tax(
    assets: number,
    debts: number,
    savingsPercentage: number = 50,
    hasPartner: boolean = false
  ): { tax: number; deemedReturn: number; taxableBase: number } {
    const exemption = hasPartner
      ? this.rules.box3.exemption_partners
      : this.rules.box3.exemption;

    const netAssets = assets - debts;
    const taxableBase = Math.max(0, netAssets - exemption);

    if (taxableBase === 0) {
      return { tax: 0, deemedReturn: 0, taxableBase: 0 };
    }

    // Split between savings and investments
    const savingsAmount = taxableBase * (savingsPercentage / 100);
    const investmentAmount = taxableBase * ((100 - savingsPercentage) / 100);

    // Get deemed return rates
    const savingsRate = this.rules.box3.deemed_return_categories.find(
      (c) => c.category === 'savings'
    )!.rate;
    const investmentRate = this.rules.box3.deemed_return_categories.find(
      (c) => c.category === 'investments'
    )!.rate;

    // Calculate deemed return
    const deemedReturn =
      (savingsAmount * savingsRate) / 100 + (investmentAmount * investmentRate) / 100;

    // Calculate tax
    const tax = deemedReturn * (this.rules.box3.tax_rate / 100);

    return { tax, deemedReturn, taxableBase };
  }

  /**
   * Get self-employment deduction amount
   */
  getZelfstandigenaftrek(): number {
    return this.rules.self_employment.zelfstandigenaftrek.amount;
  }

  /**
   * Get startersaftrek amount
   */
  getStartersaftrek(): number {
    return this.rules.self_employment.startersaftrek.amount;
  }

  /**
   * Get MKB-winstvrijstelling percentage
   */
  getMKBVrijstelling(): number {
    return this.rules.self_employment.mkb_vrijstelling.percentage;
  }

  /**
   * Get hours requirement for self-employment deductions
   */
  getHoursRequirement(): number {
    return this.rules.self_employment.hours_requirement.standard;
  }

  /**
   * Get BTW rates
   */
  getBTWRates(): { standard: number; reduced: number; zero: number } {
    return {
      standard: this.rules.btw.standard_rate,
      reduced: this.rules.btw.reduced_rate,
      zero: this.rules.btw.zero_rate,
    };
  }

  /**
   * Get BTW small business threshold (KOR)
   */
  getBTWThreshold(): number {
    return this.rules.btw.small_business_threshold;
  }

  /**
   * Get tax deadlines
   */
  getDeadlines() {
    return this.rules.deadlines;
  }

  /**
   * Get deduction limits
   */
  getDeductionLimits() {
    return this.rules.deduction_limits;
  }

  /**
   * Format currency amount
   */
  formatCurrency(amount: number): string {
    return new Intl.NumberFormat('nl-NL', {
      style: 'currency',
      currency: 'EUR',
      minimumFractionDigits: 0,
      maximumFractionDigits: 0,
    }).format(amount);
  }

  /**
   * Format percentage
   */
  formatPercentage(value: number, decimals: number = 2): string {
    return `${value.toFixed(decimals)}%`;
  }

  /**
   * Get tax bracket for income
   */
  getTaxBracket(income: number): { rate: number; from: number; to: number | null } {
    for (const bracket of this.rules.income_tax.box1_brackets) {
      if (income <= (bracket.to || Infinity)) {
        return bracket;
      }
    }
    return this.rules.income_tax.box1_brackets[this.rules.income_tax.box1_brackets.length - 1];
  }

  /**
   * Calculate effective tax rate
   */
  calculateEffectiveRate(grossIncome: number, totalTax: number): number {
    if (grossIncome === 0) return 0;
    return (totalTax / grossIncome) * 100;
  }

  /**
   * Get next tax deadline
   */
  getNextDeadline(): { type: string; date: string } | null {
    const now = new Date();
    const deadlines = [
      { type: 'Income Tax Filing', date: this.rules.deadlines.income_tax_filing_date },
      ...this.rules.deadlines.btw_quarterly.map((date, i) => ({
        type: `BTW Q${i + 1}`,
        date,
      })),
    ];

    const upcomingDeadlines = deadlines
      .filter((d) => new Date(d.date) > now)
      .sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());

    return upcomingDeadlines[0] || null;
  }
}

/**
 * Create Dutch tax knowledge utilities
 */
export function createDutchTaxKnowledge(rulesPath: string): DutchTaxKnowledge {
  return new DutchTaxKnowledge(rulesPath);
}

/**
 * Singleton instance
 */
let instance: DutchTaxKnowledge | null = null;

/**
 * Get or create singleton instance
 */
export function getDutchTaxKnowledge(rulesPath?: string): DutchTaxKnowledge {
  if (!instance && rulesPath) {
    instance = new DutchTaxKnowledge(rulesPath);
  }
  if (!instance) {
    throw new Error('Dutch tax knowledge not initialized. Provide rulesPath on first call.');
  }
  return instance;
}
