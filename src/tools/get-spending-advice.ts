import type { ToolHandler, ToolDependencies } from './index.js';
import type {
  Config,
  GetSpendingAdviceInput,
  GetSpendingAdviceOutput,
  AdviceItem,
} from '../types/index.js';

/**
 * Get Spending Advice Tool
 * Provides personalized financial and tax optimization advice based on user profile
 */
export class GetSpendingAdviceTool implements ToolHandler {
  name = 'get_spending_advice';
  description =
    'Get personalized financial optimization and tax planning advice based on your profile';
  inputSchema = {
    type: 'object',
    properties: {
      focus_area: {
        type: 'string',
        enum: ['tax_reduction', 'wealth_building', 'retirement', 'debt_management', 'all'],
        description: 'Area to focus advice on (default: all)',
      },
      risk_tolerance: {
        type: 'string',
        enum: ['conservative', 'moderate', 'aggressive'],
        description: 'Risk tolerance for investment advice (default: moderate)',
      },
    },
  };

  constructor(
    private config: Config,
    private deps: ToolDependencies
  ) {}

  async execute(input: GetSpendingAdviceInput): Promise<GetSpendingAdviceOutput> {
    // Load personal profile
    const parsed = this.deps.personalLoader.load(this.config.paths.personal_data);
    const profile = parsed.profile;

    const focusArea = input.focus || 'general';

    const advice: AdviceItem[] = [];

    // ===================
    // TAX REDUCTION
    // ===================
    if (focusArea === 'general' || focusArea === 'tax_optimization') {
      advice.push(...this.getTaxReductionAdvice(profile));
    }

    // ===================
    // WEALTH BUILDING
    // ===================
    if (focusArea === 'general' || focusArea === 'savings') {
      advice.push(...this.getWealthBuildingAdvice(profile));
    }

    // ===================
    // DEDUCTIONS
    // ===================
    if (focusArea === 'general' || focusArea === 'deductions') {
      advice.push(...this.getDebtManagementAdvice(profile));
    }

    return {
      advice,
      profileWarnings: [],
      missingInformation: [],
    };
  }

  /**
   * Get tax reduction advice
   */
  private getTaxReductionAdvice(profile: any): AdviceItem[] {
    const advice: AdviceItem[] = [];

    // Self-employment hours requirement
    if (
      profile.income.freelance?.registered &&
      !profile.income.freelance.meetsHoursRequirement
    ) {
      advice.push({
        category: 'tax_reduction',
        suggestion: 'Meet 1225 Hours Requirement for Self-Employment Deduction - You need to work 1225 hours per year as a self-employed person to claim the €3,750 zelfstandigenaftrek.',
        potentialSavings: 3750,
        effort: 'medium',
        deadline: new Date(new Date().getFullYear(), 11, 31).toISOString(),
        links: ['https://www.belastingdienst.nl/zelfstandigenaftrek'],
      });
    }

    // Box 3 optimization
    const totalAssets =
      profile.assets.bankAccounts.savings +
      profile.assets.bankAccounts.checking +
      (profile.assets.investments.stocksETFs || 0);
    const totalDebts = profile.assets.debts.studentLoan || 0 + profile.assets.debts.personalLoans || 0;
    const netAssets = totalAssets - totalDebts;
    const exemption = profile.basicInfo.taxPartner ? 114000 : 57000;

    if (netAssets > exemption) {
      const excessAssets = netAssets - exemption;
      const estimatedBox3Tax = excessAssets * 0.01 * 0.32; // Rough estimate

      advice.push({
        category: 'tax_reduction',
        suggestion: `Optimize Box 3 Tax - Your assets exceed the Box 3 exemption by €${excessAssets.toLocaleString()}. Consider optimizing asset allocation.`,
        potentialSavings: Math.round(estimatedBox3Tax * 0.3),
        effort: 'medium',
        deadline: new Date(new Date().getFullYear(), 11, 31).toISOString(),
        links: ['https://www.belastingdienst.nl/box3'],
      });
    }

    // Pension contributions
    const grossIncome =
      (profile.income.employment || 0) +
      (profile.income.freelance?.profit || 0) +
      (profile.income.other || 0);

    if (grossIncome > 50000) {
      advice.push({
        category: 'tax_reduction',
        suggestion: 'Maximize Pension Contributions - With your income level, maximizing pension contributions can provide significant tax savings.',
        potentialSavings: Math.round(grossIncome * 0.15 * 0.4),
        effort: 'low',
        deadline: new Date(new Date().getFullYear(), 11, 31).toISOString(),
      });
    }

    return advice;
  }

  /**
   * Get wealth building advice
   */
  private getWealthBuildingAdvice(profile: any): AdviceItem[] {
    const advice: AdviceItem[] = [];

    const savings = profile.assets.bankAccounts.savings;
    const monthlyIncome =
      (profile.income.employment || 0) / 12 +
      (profile.income.freelance?.profit || 0) / 12 +
      (profile.income.other || 0) / 12;

    // Emergency fund
    const emergencyFundTarget = monthlyIncome * 6;
    if (savings < emergencyFundTarget) {
      advice.push({
        category: 'savings',
        suggestion: `Build Emergency Fund - Your emergency fund should cover 6 months of expenses (€${emergencyFundTarget.toLocaleString()}). Current: €${savings.toLocaleString()}.`,
        potentialSavings: 'varies',
        effort: 'medium',
      });
    }


    return advice;
  }

  /**
   * Get debt management advice
   */
  private getDebtManagementAdvice(profile: any): AdviceItem[] {
    const advice: AdviceItem[] = [];

    // High-interest debt
    const personalLoans = profile.assets.debts.personalLoans || 0;
    if (personalLoans > 0) {
      advice.push({
        category: 'deductions',
        suggestion: `Prioritize Paying Off High-Interest Debt - Pay off personal loans (€${personalLoans.toLocaleString()}) before investing.`,
        potentialSavings: Math.round(personalLoans * 0.05),
        effort: 'medium',
      });
    }

    // Mortgage optimization
    const mortgage = profile.assets.debts.mortgage || 0;
    if (mortgage > 0) {
      advice.push({
        category: 'deductions',
        suggestion: 'Review Mortgage Terms - Review your mortgage to ensure competitive terms. Mortgage interest is tax-deductible.',
        potentialSavings: Math.round(mortgage * 0.005),
        effort: 'medium',
      });
    }

    return advice;
  }
}
