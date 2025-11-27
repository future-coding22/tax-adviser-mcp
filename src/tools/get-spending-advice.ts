import type { ToolHandler, ToolDependencies } from './index.js';
import type {
  Config,
  GetSpendingAdviceInput,
  GetSpendingAdviceOutput,
  SpendingAdviceItem,
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

    const focusArea = input.focus_area || 'all';
    const riskTolerance = input.risk_tolerance || 'moderate';

    const advice: SpendingAdviceItem[] = [];

    // ===================
    // TAX REDUCTION
    // ===================
    if (focusArea === 'all' || focusArea === 'tax_reduction') {
      advice.push(...this.getTaxReductionAdvice(profile));
    }

    // ===================
    // WEALTH BUILDING
    // ===================
    if (focusArea === 'all' || focusArea === 'wealth_building') {
      advice.push(...this.getWealthBuildingAdvice(profile, riskTolerance));
    }

    // ===================
    // RETIREMENT PLANNING
    // ===================
    if (focusArea === 'all' || focusArea === 'retirement') {
      advice.push(...this.getRetirementAdvice(profile));
    }

    // ===================
    // DEBT MANAGEMENT
    // ===================
    if (focusArea === 'all' || focusArea === 'debt_management') {
      advice.push(...this.getDebtManagementAdvice(profile));
    }

    // Sort by priority (high -> medium -> low)
    const priorityOrder = { high: 0, medium: 1, low: 2 };
    advice.sort(
      (a, b) => priorityOrder[a.priority as keyof typeof priorityOrder] - priorityOrder[b.priority as keyof typeof priorityOrder]
    );

    // Calculate potential savings
    const totalPotentialSavings = advice
      .filter((a) => a.estimated_impact)
      .reduce((sum, a) => sum + a.estimated_impact!, 0);

    return {
      advice,
      total_recommendations: advice.length,
      by_category: this.groupByCategory(advice),
      by_priority: this.groupByPriority(advice),
      total_potential_savings: totalPotentialSavings,
      focus_area: focusArea,
    };
  }

  /**
   * Get tax reduction advice
   */
  private getTaxReductionAdvice(profile: any): SpendingAdviceItem[] {
    const advice: SpendingAdviceItem[] = [];

    // Self-employment hours requirement
    if (
      profile.income.freelance?.registered &&
      !profile.income.freelance.meetsHoursRequirement
    ) {
      advice.push({
        category: 'tax_reduction',
        title: 'Meet 1225 Hours Requirement for Self-Employment Deduction',
        description:
          'You need to work 1225 hours per year as a self-employed person to claim the €3,750 zelfstandigenaftrek. Track your hours carefully and ensure you meet this threshold.',
        priority: 'high',
        estimated_impact: 3750,
        difficulty: 'medium',
        timeline: 'ongoing',
        action_steps: [
          'Implement time tracking system for self-employment hours',
          'Review current hours worked this year',
          'Plan to meet 1225 hours requirement by year end',
          'Keep detailed records for tax authority',
        ],
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
        title: 'Optimize Box 3 Tax with Strategic Asset Allocation',
        description: `Your assets exceed the Box 3 exemption by €${excessAssets.toLocaleString()}. Consider using deductible debts or optimizing your asset allocation between savings and investments to minimize deemed return.`,
        priority: 'medium',
        estimated_impact: estimatedBox3Tax * 0.3, // Potential 30% reduction
        difficulty: 'medium',
        timeline: 'before year end',
        action_steps: [
          'Review current split between savings and investments',
          'Savings are taxed at 1.03% deemed return, investments at 6.04%',
          'Consider using your mortgage or other deductible debts to reduce Box 3 base',
          'Consult with financial advisor for personalized strategy',
        ],
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
        title: 'Maximize Pension Contributions for Tax Benefit',
        description:
          'With your income level, maximizing pension contributions can provide significant tax savings while building retirement wealth.',
        priority: 'high',
        estimated_impact: grossIncome * 0.15 * 0.4, // Estimate 15% contribution at 40% marginal rate
        difficulty: 'low',
        timeline: 'before year end',
        action_steps: [
          'Review current pension contribution percentage',
          'Calculate maximum deductible pension contribution',
          'Consider increasing contributions if below maximum',
          'Pension contributions reduce taxable income in highest bracket',
        ],
      });
    }

    return advice;
  }

  /**
   * Get wealth building advice
   */
  private getWealthBuildingAdvice(profile: any, riskTolerance: string): SpendingAdviceItem[] {
    const advice: SpendingAdviceItem[] = [];

    const savings = profile.assets.bankAccounts.savings;
    const monthlyIncome =
      (profile.income.employment || 0) / 12 +
      (profile.income.freelance?.profit || 0) / 12 +
      (profile.income.other || 0) / 12;

    // Emergency fund
    const emergencyFundTarget = monthlyIncome * 6;
    if (savings < emergencyFundTarget) {
      advice.push({
        category: 'wealth_building',
        title: 'Build Emergency Fund (6 Months Expenses)',
        description: `Your emergency fund should cover 6 months of expenses (€${emergencyFundTarget.toLocaleString()}). Current savings: €${savings.toLocaleString()}.`,
        priority: 'high',
        estimated_impact: 0, // Defensive measure
        difficulty: 'medium',
        timeline: '6-12 months',
        action_steps: [
          `Save €${Math.round((emergencyFundTarget - savings) / 12).toLocaleString()} per month for 12 months`,
          'Keep emergency fund in accessible savings account',
          'Separate from investment accounts',
          'Only use for true emergencies',
        ],
      });
    }

    // Investment strategy
    const investableAssets = Math.max(0, savings - emergencyFundTarget);
    if (investableAssets > 10000) {
      const strategy =
        riskTolerance === 'aggressive'
          ? '80% stocks, 20% bonds'
          : riskTolerance === 'moderate'
            ? '60% stocks, 40% bonds'
            : '40% stocks, 60% bonds';

      advice.push({
        category: 'wealth_building',
        title: 'Optimize Investment Portfolio Allocation',
        description: `With €${investableAssets.toLocaleString()} in investable assets beyond emergency fund, consider a ${strategy} allocation matching your ${riskTolerance} risk tolerance.`,
        priority: 'medium',
        estimated_impact: investableAssets * 0.06, // Assume 6% average return
        difficulty: 'medium',
        timeline: 'next 3 months',
        action_steps: [
          'Review current investment allocation',
          `Target allocation: ${strategy}`,
          'Consider low-cost index funds or ETFs',
          'Rebalance annually',
          'Dollar-cost average for new investments',
        ],
      });
    }

    return advice;
  }

  /**
   * Get retirement planning advice
   */
  private getRetirementAdvice(profile: any): SpendingAdviceItem[] {
    const advice: SpendingAdviceItem[] = [];

    const age = new Date().getFullYear() - new Date(profile.basicInfo.dateOfBirth).getFullYear();
    const yearsToRetirement = Math.max(0, 67 - age); // Dutch retirement age is 67

    if (yearsToRetirement > 0 && yearsToRetirement < 40) {
      const grossIncome =
        (profile.income.employment || 0) +
        (profile.income.freelance?.profit || 0) +
        (profile.income.other || 0);

      advice.push({
        category: 'retirement',
        title: 'Increase Retirement Savings Rate',
        description: `With ${yearsToRetirement} years until retirement, aim to save 15-20% of gross income for retirement. This provides both tax benefits now and security later.`,
        priority: 'medium',
        estimated_impact: grossIncome * 0.15, // 15% savings
        difficulty: 'medium',
        timeline: 'ongoing',
        action_steps: [
          'Calculate current retirement savings rate',
          'Target 15-20% of gross income for retirement',
          'Maximize employer pension match if applicable',
          'Consider additional voluntary pension contributions',
          'Review pension projections from employer and government (AOW)',
        ],
      });
    }

    return advice;
  }

  /**
   * Get debt management advice
   */
  private getDebtManagementAdvice(profile: any): SpendingAdviceItem[] {
    const advice: SpendingAdviceItem[] = [];

    // High-interest debt
    const personalLoans = profile.assets.debts.personalLoans || 0;
    if (personalLoans > 0) {
      advice.push({
        category: 'debt_management',
        title: 'Prioritize Paying Off High-Interest Debt',
        description: `Pay off personal loans (€${personalLoans.toLocaleString()}) before investing, as the interest rate likely exceeds investment returns.`,
        priority: 'high',
        estimated_impact: personalLoans * 0.05, // Assume 5% interest rate
        difficulty: 'medium',
        timeline: '12-24 months',
        action_steps: [
          'List all debts with interest rates',
          'Pay minimums on all debts',
          'Put extra payments toward highest interest debt',
          'Consider debt consolidation if multiple high-interest debts',
        ],
      });
    }

    // Mortgage optimization
    const mortgage = profile.assets.debts.mortgage || 0;
    if (mortgage > 0) {
      advice.push({
        category: 'debt_management',
        title: 'Review Mortgage Terms and Rates',
        description:
          'With interest rates fluctuating, review your mortgage to ensure you have competitive terms. Mortgage interest is tax-deductible.',
        priority: 'low',
        estimated_impact: mortgage * 0.005, // Potential 0.5% rate improvement
        difficulty: 'medium',
        timeline: 'next 6 months',
        action_steps: [
          'Review current mortgage rate and terms',
          'Compare with current market rates',
          'Consider refinancing if rate is 0.5%+ above market',
          'Remember: mortgage interest is tax-deductible',
          'Extra payments reduce Box 3 wealth tax base',
        ],
      });
    }

    return advice;
  }

  /**
   * Group advice by category
   */
  private groupByCategory(advice: SpendingAdviceItem[]): Record<string, number> {
    const grouped: Record<string, number> = {};
    for (const item of advice) {
      grouped[item.category] = (grouped[item.category] || 0) + 1;
    }
    return grouped;
  }

  /**
   * Group advice by priority
   */
  private groupByPriority(advice: SpendingAdviceItem[]): Record<string, number> {
    const grouped: Record<string, number> = {};
    for (const item of advice) {
      grouped[item.priority] = (grouped[item.priority] || 0) + 1;
    }
    return grouped;
  }
}
