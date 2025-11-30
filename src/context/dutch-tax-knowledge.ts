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
    return this.rules.taxYear;
  }

  /**
   * Calculate income tax (Box 1) before credits
   */
  calculateBox1Tax(taxableIncome: number): number {
    let tax = 0;

    for (const bracket of this.rules.incomeTax.box1Brackets) {
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
    const { max, phaseOutStart, phaseOutRate } =
      this.rules.incomeTax.generalCredit;

    if (income <= phaseOutStart) {
      return max;
    }

    // Calculate reduction based on phase-out rate
    const reduction = (income - phaseOutStart) * (phaseOutRate / 100);
    return Math.max(0, max - reduction);
  }

  /**
   * Calculate labor tax credit (arbeidskorting)
   */
  calculateLaborCredit(income: number): number {
    const { max, brackets, phaseOutStart, phaseOutRate } =
      this.rules.incomeTax.laborCredit;

    let credit = 0;

    // Calculate base credit from brackets
    for (const bracket of brackets) {
      if (income <= bracket.from) {
        break;
      }

      const bracketIncome = Math.min(income, bracket.to || income) - bracket.from;

      // Handle different bracket types
      if (bracket.type === 'percentage_of_income') {
        // Simple percentage of income in bracket
        credit += bracketIncome * ((bracket as any).rate / 100);
      } else if (bracket.type === 'base_plus_percentage') {
        // Base amount + percentage of income above bracket start
        credit += (bracket as any).base + bracketIncome * ((bracket as any).additional_rate / 100);
      } else if (bracket.type === 'fixed') {
        // Fixed amount for this bracket
        credit += (bracket as any).amount;
      }
    }

    // Cap at maximum
    credit = Math.min(credit, max);

    // Apply phase-out
    if (income > phaseOutStart) {
      const reduction = (income - phaseOutStart) * (phaseOutRate / 100);
      credit = Math.max(0, credit - reduction);
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
      ? this.rules.box3.exemptionPartners
      : this.rules.box3.exemption;

    const netAssets = assets - debts;
    const taxableBase = Math.max(0, netAssets - exemption);

    if (taxableBase === 0) {
      return { tax: 0, deemedReturn: 0, taxableBase: 0 };
    }

    // Split between savings and investments
    const savingsAmount = taxableBase * (savingsPercentage / 100);
    const investmentAmount = taxableBase * ((100 - savingsPercentage) / 100);

    // Find the appropriate bracket and get deemed return rates
    // Using first bracket as default (should be enhanced to handle multiple brackets)
    const bracket = this.rules.box3.deemedReturnBrackets[0];
    const savingsRate = bracket.savingsRate;
    const investmentRate = bracket.investmentRate;

    // Calculate deemed return
    const deemedReturn =
      (savingsAmount * savingsRate) / 100 + (investmentAmount * investmentRate) / 100;

    // Calculate tax
    const tax = deemedReturn * (this.rules.box3.taxRate / 100);

    return { tax, deemedReturn, taxableBase };
  }

  /**
   * Get self-employment deduction amount
   */
  getZelfstandigenaftrek(): number {
    return this.rules.selfEmployment.zelfstandigenaftrek;
  }

  /**
   * Get startersaftrek amount
   */
  getStartersaftrek(): number {
    return this.rules.selfEmployment.startersaftrek;
  }

  /**
   * Get MKB-winstvrijstelling percentage
   */
  getMKBVrijstelling(): number {
    return this.rules.selfEmployment.mkbVrijstelling;
  }

  /**
   * Get hours requirement for self-employment deductions
   */
  getHoursRequirement(): number {
    return this.rules.selfEmployment.hoursRequirement;
  }

  /**
   * Get BTW rates
   */
  getBTWRates(): { standard: number; reduced: number; zero: number } {
    return {
      standard: this.rules.btw.standardRate,
      reduced: this.rules.btw.reducedRate,
      zero: 0,
    };
  }

  /**
   * Get BTW small business threshold (KOR)
   */
  getBTWThreshold(): number {
    return this.rules.btw.smallBusinessThreshold;
  }

  /**
   * Get tax deadlines
   */
  getDeadlines() {
    return {
      income_tax: this.rules.deadlines.incomeTaxFiling,
      btw_quarterly: this.rules.deadlines.btwQuarterly,
    };
  }

  /**
   * Get deduction limits
   */
  getDeductionLimits() {
    return this.rules.deductionLimits;
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
    for (const bracket of this.rules.incomeTax.box1Brackets) {
      if (income <= (bracket.to || Infinity)) {
        return bracket;
      }
    }
    return this.rules.incomeTax.box1Brackets[this.rules.incomeTax.box1Brackets.length - 1];
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
  getNextDeadline(): { type: string; date: string; description: string } | null {
    const now = new Date();
    const deadlines = [
      {
        type: 'income_tax',
        date: this.rules.deadlines.incomeTaxFiling,
        description: 'Annual income tax return filing',
      },
      ...this.rules.deadlines.btwQuarterly.map((date: string, i: number) => ({
        type: 'btw',
        date,
        description: `BTW Q${i + 1} ${i === 0 ? '(Jan-Mar)' : i === 1 ? '(Apr-Jun)' : i === 2 ? '(Jul-Sep)' : '(Oct-Dec)'} filing`,
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
