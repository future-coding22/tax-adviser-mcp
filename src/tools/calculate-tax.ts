import type { ToolHandler, ToolDependencies } from './index.js';
import type {
  Config,
  CalculateTaxEstimateInput,
  CalculateTaxEstimateOutput,
} from '../types/index.js';

/**
 * Calculate Tax Estimate Tool
 * Performs comprehensive Dutch tax calculation based on user profile
 */
export class CalculateTaxEstimateTool implements ToolHandler {
  name = 'calculate_tax_estimate';
  description =
    'Calculate complete tax estimate including Box 1, 2, 3, BTW, and all applicable deductions and credits';
  inputSchema = {
    type: 'object',
    properties: {
      year: {
        type: 'number',
        description: 'Tax year to calculate (defaults to current year)',
      },
      incomeOverride: {
        type: 'object',
        description: 'Override income/assets for what-if scenarios',
        properties: {
          employment: { type: 'number' },
          freelance: { type: 'number' },
          other: { type: 'number' },
        },
      },
    },
  };

  constructor(
    private config: Config,
    private deps: ToolDependencies
  ) {}

  async execute(input: CalculateTaxEstimateInput): Promise<CalculateTaxEstimateOutput> {
    // Load personal profile
    const parsed = this.deps.personalLoader.load(this.config.paths.personal_data);
    const profile = parsed.profile;

    // Get tax year
    const year = input.year || this.config.tax.year || new Date().getFullYear();

    // Apply scenario overrides if provided
    const employmentIncome = Number(input.incomeOverride?.employment ?? profile.income.employment ?? 0) || 0;
    const freelanceIncome = Number(input.incomeOverride?.freelance ?? profile.income.freelance?.profit ?? 0) || 0;
    const otherIncome = Number(input.incomeOverride?.other ?? profile.income.other ?? 0) || 0;

    // Calculate assets and debts
    const totalAssets =
      Number(profile.assets.bankAccounts.savings || 0) +
      Number(profile.assets.bankAccounts.checking || 0) +
      Number(profile.assets.investments.stocksETFs || 0) +
      Number(profile.assets.investments.crypto || 0);

    const totalDebts =
      Number(profile.assets.debts.studentLoan || 0) + Number(profile.assets.debts.personalLoans || 0);

    // ===================
    // BOX 1: INCOME TAX
    // ===================
    const box1Breakdown = this.calculateBox1(
      employmentIncome,
      freelanceIncome,
      otherIncome,
      profile
    );

    // ===================
    // BOX 2: SUBSTANTIAL INTEREST
    // ===================
    const box2Income = 0; // Not typically applicable for most users
    const box2Tax = box2Income * 0.26; // 26% flat rate

    // ===================
    // BOX 3: WEALTH TAX
    // ===================
    const box3Calculation = this.deps.taxKnowledge.calculateBox3Tax(
      totalAssets,
      totalDebts,
      50, // Assume 50/50 split between savings and investments
      !!profile.basicInfo.taxPartner
    );

    // ===================
    // BTW (VAT)
    // ===================
    const btwBreakdown = this.calculateBTW(profile);

    // ===================
    // TOTAL TAX LIABILITY
    // ===================
    const totalIncomeTax = Math.max(0, box1Breakdown.netTax);
    const totalBox3Tax = box3Calculation.tax;
    const totalBTW = btwBreakdown.annualLiability;

    const totalTaxLiability = totalIncomeTax + box2Tax + totalBox3Tax;

    // ===================
    // EFFECTIVE TAX RATE
    // ===================
    const grossIncome = employmentIncome + freelanceIncome + otherIncome;
    const effectiveTaxRate = this.deps.taxKnowledge.calculateEffectiveRate(
      grossIncome,
      totalIncomeTax
    );

    // Build breakdown text summary
    const breakdownText = `
Tax Year: ${year}
Total Tax Liability: €${totalTaxLiability.toFixed(2)}
Effective Tax Rate: ${effectiveTaxRate.toFixed(2)}%

Box 1 (Income Tax): €${totalIncomeTax.toFixed(2)}
- Gross Income: €${grossIncome.toFixed(2)}
- Tax: €${box1Breakdown.grossTax.toFixed(2)}
- Credits: €${box1Breakdown.totalCredits.toFixed(2)}

Box 3 (Wealth Tax): €${totalBox3Tax.toFixed(2)}

BTW: €${totalBTW.toFixed(2)}/year
`;

    return {
      year,
      box1: {
        grossIncome,
        deductions: box1Breakdown.deductionsDetail || [],
        taxableIncome: box1Breakdown.taxableIncome,
        taxBeforeCredits: box1Breakdown.grossTax,
        credits: box1Breakdown.creditsDetail || [],
        taxDue: box1Breakdown.netTax,
      },
      box2: box2Income > 0 ? {
        dividendIncome: box2Income,
        taxDue: box2Tax,
      } : undefined,
      box3: totalBox3Tax > 0 ? {
        assets: totalAssets,
        debts: totalDebts,
        netAssets: totalAssets - totalDebts,
        exemption: box3Calculation.exemption || 0,
        taxableBase: box3Calculation.taxableBase,
        deemedReturn: box3Calculation.deemedReturn,
        taxDue: box3Calculation.tax,
      } : undefined,
      btw: btwBreakdown.annualLiability > 0 ? {
        estimatedRevenue: btwBreakdown.estimatedRevenue,
        estimatedBTWCollected: btwBreakdown.estimatedBTWCollected,
        estimatedBTWPaid: btwBreakdown.estimatedBTWPaid,
        estimatedBTWDue: btwBreakdown.estimatedBTWDue || btwBreakdown.annualLiability,
      } : undefined,
      totalEstimatedTax: totalTaxLiability,
      alreadyPaid: 0,
      remainingDue: totalTaxLiability,
      effectiveRate: effectiveTaxRate,
      breakdown: breakdownText,
    };
  }

  /**
   * Calculate Box 1 income tax with all deductions and credits
   */
  private calculateBox1(
    employmentIncome: number,
    freelanceIncome: number,
    otherIncome: number,
    profile: any
  ): any {
    const grossIncome = employmentIncome + freelanceIncome + otherIncome;

    // Calculate deductions
    const deductions: any[] = [];
    let totalDeductions = 0;

    // Self-employment deductions
    if (profile.income.freelance?.registered && profile.income.freelance.meetsHoursRequirement) {
      const zelfstandigenaftrek = this.deps.taxKnowledge.getZelfstandigenaftrek();
      deductions.push({
        name: 'Zelfstandigenaftrek',
        amount: zelfstandigenaftrek,
      });
      totalDeductions += zelfstandigenaftrek;

      // Startersaftrek (first 3 years)
      if (profile.income.freelance.yearsActive <= 3) {
        const startersaftrek = this.deps.taxKnowledge.getStartersaftrek();
        deductions.push({
          name: 'Startersaftrek',
          amount: startersaftrek,
        });
        totalDeductions += startersaftrek;
      }
    }

    // MKB-winstvrijstelling (applies to profit, not deduction from income)
    let mkbVrijstelling = 0;
    if (freelanceIncome > 0) {
      mkbVrijstelling = freelanceIncome * (this.deps.taxKnowledge.getMKBVrijstelling() / 100);
      deductions.push({
        name: 'MKB-winstvrijstelling',
        amount: mkbVrijstelling,
      });
    }

    // Mortgage interest deduction
    if (profile.assets.debts.mortgage) {
      const mortgageInterest = profile.assets.debts.mortgage * 0.03; // Estimate 3% interest
      const limits = this.deps.taxKnowledge.getDeductionLimits();
      const deductibleInterest = Math.min(mortgageInterest, limits.mortgage_interest.max);
      deductions.push({
        name: 'Hypotheekrenteaftrek',
        amount: deductibleInterest,
      });
      totalDeductions += deductibleInterest;
    }

    // Healthcare deduction (if applicable)
    const healthcareCosts = profile.deductibleExpenses?.healthcare || 0;
    if (healthcareCosts > 0) {
      const limits = this.deps.taxKnowledge.getDeductionLimits();
      const threshold = grossIncome * (limits.healthcare_expenses.threshold_percentage / 100);
      const deductibleHealthcare = Math.max(0, healthcareCosts - threshold);
      if (deductibleHealthcare > 0) {
        deductions.push({
          name: 'Zorgkosten (above threshold)',
          amount: deductibleHealthcare,
        });
        totalDeductions += deductibleHealthcare;
      }
    }

    // Calculate taxable income (excluding MKB vrijstelling which applies differently)
    const taxableIncome = Math.max(0, grossIncome - totalDeductions - mkbVrijstelling);

    // Calculate gross tax
    const grossTax = this.deps.taxKnowledge.calculateBox1Tax(taxableIncome);

    // Calculate tax credits
    const credits: any[] = [];
    let totalCredits = 0;

    // General tax credit (algemene heffingskorting)
    const generalCredit = this.deps.taxKnowledge.calculateGeneralCredit(grossIncome);
    credits.push({
      name: 'Algemene heffingskorting',
      amount: generalCredit,
    });
    totalCredits += generalCredit;

    // Labor tax credit (arbeidskorting)
    if (employmentIncome > 0 || freelanceIncome > 0) {
      const laborCredit = this.deps.taxKnowledge.calculateLaborCredit(
        employmentIncome + freelanceIncome
      );
      credits.push({
        name: 'Arbeidskorting',
        amount: laborCredit,
      });
      totalCredits += laborCredit;
    }

    // Calculate net tax
    const netTax = Math.max(0, grossTax - totalCredits);

    return {
      grossIncome,
      taxableIncome,
      grossTax,
      totalDeductions,
      totalCredits,
      netTax,
      creditsDetail: credits,
      deductionsDetail: deductions,
    };
  }

  /**
   * Calculate BTW liability
   */
  private calculateBTW(profile: any): any {
    if (!profile.income.freelance?.registered || !profile.income.freelance.btwNumber) {
      return {
        applicable: false,
        revenue: 0,
        collected: 0,
        paid: 0,
        annualLiability: 0,
      };
    }

    const revenue = profile.income.freelance.estimatedAnnualRevenue;
    const rates = this.deps.taxKnowledge.getBTWRates();

    // Estimate BTW collected (assume 80% at standard rate, 20% at reduced rate)
    const collectedStandard = revenue * 0.8 * (rates.standard / (100 + rates.standard));
    const collectedReduced = revenue * 0.2 * (rates.reduced / (100 + rates.reduced));
    const totalCollected = collectedStandard + collectedReduced;

    // Estimate BTW paid on expenses (assume 30% of revenue is expenses with BTW)
    const expenses = revenue * 0.3;
    const paidOnExpenses = expenses * (rates.standard / (100 + rates.standard));

    const annualLiability = totalCollected - paidOnExpenses;

    return {
      applicable: true,
      revenue,
      collected: totalCollected,
      paid: paidOnExpenses,
      annualLiability: Math.max(0, annualLiability),
      quarterly: Math.max(0, annualLiability) / 4,
    };
  }
}
