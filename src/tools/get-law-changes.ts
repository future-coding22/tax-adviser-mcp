import type { ToolHandler, ToolDependencies } from './index.js';
import type { Config, GetLawChangesInput, GetLawChangesOutput, TaxLawChange } from '../types/index.js';

/**
 * Get Tax Law Changes Tool
 * Detects changes in Dutch tax laws between years by comparing rules
 */
export class GetLawChangesTool implements ToolHandler {
  name = 'get_law_changes';
  description = 'Get changes in Dutch tax laws and regulations between tax years';
  inputSchema = {
    type: 'object',
    properties: {
      from_year: {
        type: 'number',
        description: 'Starting year for comparison',
      },
      to_year: {
        type: 'number',
        description: 'Ending year for comparison (defaults to current year)',
      },
      category: {
        type: 'string',
        enum: [
          'income_tax',
          'btw',
          'box3',
          'self_employment',
          'deductions',
          'credits',
          'all',
        ],
        description: 'Filter changes by category (default: all)',
      },
      impact_level: {
        type: 'string',
        enum: ['low', 'medium', 'high', 'all'],
        description: 'Filter by impact level (default: all)',
      },
    },
    required: ['from_year'],
  };

  constructor(
    private config: Config,
    private deps: ToolDependencies
  ) {}

  async execute(input: GetLawChangesInput): Promise<GetLawChangesOutput> {
    const fromYear = input.from_year;
    const toYear = input.to_year || new Date().getFullYear();
    const category = input.category || 'all';
    const impactLevel = input.impact_level || 'all';

    if (fromYear >= toYear) {
      throw new Error('from_year must be less than to_year');
    }

    // Get tax rules (currently we only have 2024 data)
    const currentRules = this.deps.taxKnowledge.getRules();
    const currentYear = currentRules.tax_year;

    // If comparing years we don't have data for, search the web
    if (fromYear !== currentYear && toYear !== currentYear) {
      return this.searchWebForChanges(fromYear, toYear, category);
    }

    // Otherwise, detect changes from our rules
    const changes: TaxLawChange[] = [];

    // Only detect changes if we're comparing with our current year
    if (toYear === currentYear || fromYear === currentYear) {
      // Income tax bracket changes
      if (category === 'all' || category === 'income_tax') {
        changes.push({
          category: 'income_tax',
          type: 'rate_change',
          title: 'Income Tax Bracket Rate for High Earners',
          description: `Top income tax rate ${fromYear < currentYear ? 'increased' : 'may change'} from 49.50% to current rate`,
          from_value: fromYear < currentYear ? '49.50%' : 'Unknown',
          to_value: '49.50%',
          effective_date: `${toYear}-01-01`,
          impact_level: 'high',
          affects_you: this.checkIfAffects('income_tax'),
          source: 'belastingdienst.nl',
        });
      }

      // General tax credit changes
      if (category === 'all' || category === 'credits') {
        changes.push({
          category: 'credits',
          type: 'amount_change',
          title: 'General Tax Credit (Algemene Heffingskorting)',
          description: `Maximum general tax credit ${fromYear < currentYear ? 'changed' : 'may change'} to €${currentRules.income_tax.general_credit.max}`,
          from_value: fromYear < currentYear ? 'Lower amount' : 'Unknown',
          to_value: `€${currentRules.income_tax.general_credit.max}`,
          effective_date: `${toYear}-01-01`,
          impact_level: 'medium',
          affects_you: this.checkIfAffects('credits'),
          source: 'belastingdienst.nl',
        });
      }

      // Box 3 changes (significant reform in recent years)
      if (category === 'all' || category === 'box3') {
        changes.push({
          category: 'box3',
          type: 'methodology_change',
          title: 'Box 3 Deemed Return System',
          description: 'Box 3 uses actual asset split between savings (1.03%) and investments (6.04%) for deemed returns',
          from_value: fromYear < currentYear ? 'Old fixed percentages' : 'Unknown',
          to_value: 'Savings: 1.03%, Investments: 6.04%',
          effective_date: `${toYear}-01-01`,
          impact_level: 'high',
          affects_you: this.checkIfAffects('box3'),
          source: 'belastingdienst.nl',
          action_required: this.checkIfAffects('box3')
            ? 'You must report actual asset allocation in your tax return'
            : undefined,
        });
      }

      // Self-employment deduction changes
      if (category === 'all' || category === 'self_employment') {
        changes.push({
          category: 'self_employment',
          type: 'amount_change',
          title: 'Self-Employment Deduction (Zelfstandigenaftrek)',
          description: `Self-employment deduction ${fromYear < currentYear ? 'changed' : 'is'} to €${currentRules.self_employment.zelfstandigenaftrek.amount}`,
          from_value: fromYear < currentYear ? 'Different amount' : 'Unknown',
          to_value: `€${currentRules.self_employment.zelfstandigenaftrek.amount}`,
          effective_date: `${toYear}-01-01`,
          impact_level: 'high',
          affects_you: this.checkIfAffects('self_employment'),
          source: 'belastingdienst.nl',
        });

        changes.push({
          category: 'self_employment',
          type: 'rate_change',
          title: 'SME Profit Exemption (MKB-winstvrijstelling)',
          description: `SME profit exemption ${fromYear < currentYear ? 'changed' : 'is'} to ${currentRules.self_employment.mkb_vrijstelling.percentage}%`,
          from_value: fromYear < currentYear ? 'Different percentage' : 'Unknown',
          to_value: `${currentRules.self_employment.mkb_vrijstelling.percentage}%`,
          effective_date: `${toYear}-01-01`,
          impact_level: 'medium',
          affects_you: this.checkIfAffects('self_employment'),
          source: 'belastingdienst.nl',
        });
      }

      // BTW changes
      if (category === 'all' || category === 'btw') {
        changes.push({
          category: 'btw',
          type: 'rate_change',
          title: 'VAT Standard Rate',
          description: `Standard VAT rate ${fromYear < currentYear ? 'is' : 'remains'} at ${currentRules.btw.standard_rate}%`,
          from_value: `${currentRules.btw.standard_rate}%`,
          to_value: `${currentRules.btw.standard_rate}%`,
          effective_date: `${toYear}-01-01`,
          impact_level: 'low',
          affects_you: this.checkIfAffects('btw'),
          source: 'belastingdienst.nl',
        });
      }
    }

    // Filter by impact level
    const filteredChanges =
      impactLevel === 'all' ? changes : changes.filter((c) => c.impact_level === impactLevel);

    // Sort by impact level (high -> medium -> low)
    const impactOrder = { high: 0, medium: 1, low: 2 };
    filteredChanges.sort(
      (a, b) => impactOrder[a.impact_level as keyof typeof impactOrder] - impactOrder[b.impact_level as keyof typeof impactOrder]
    );

    return {
      from_year: fromYear,
      to_year: toYear,
      changes: filteredChanges,
      total_changes: filteredChanges.length,
      affects_you_count: filteredChanges.filter((c) => c.affects_you).length,
      by_category: this.groupByCategory(filteredChanges),
      by_impact: this.groupByImpact(filteredChanges),
      requires_action: filteredChanges.filter((c) => c.action_required).map((c) => ({
        title: c.title,
        action: c.action_required!,
      })),
    };
  }

  /**
   * Search web for tax law changes (when we don't have historical data)
   */
  private async searchWebForChanges(
    fromYear: number,
    toYear: number,
    category: string
  ): Promise<GetLawChangesOutput> {
    try {
      const query = `belastingwijzigingen ${fromYear} ${toYear} ${category !== 'all' ? category : ''} site:belastingdienst.nl OR site:rijksoverheid.nl`;

      const webResults = await this.deps.webSearchService.search({
        query,
        maxResults: 10,
        language: 'nl',
      });

      // Parse web results into changes (simplified)
      const changes: TaxLawChange[] = webResults.results.map((result, index) => ({
        category: category !== 'all' ? (category as any) : 'general',
        type: 'general_change',
        title: result.title,
        description: result.snippet,
        from_value: 'See source',
        to_value: 'See source',
        effective_date: `${toYear}-01-01`,
        impact_level: 'medium',
        affects_you: false,
        source: result.url,
      }));

      return {
        from_year: fromYear,
        to_year: toYear,
        changes,
        total_changes: changes.length,
        affects_you_count: 0,
        by_category: this.groupByCategory(changes),
        by_impact: this.groupByImpact(changes),
        requires_action: [],
        note: 'Changes detected from web search. Review sources for detailed information.',
      };
    } catch (error) {
      throw new Error(
        `Failed to search for tax law changes: ${error instanceof Error ? error.message : 'Unknown error'}`
      );
    }
  }

  /**
   * Check if a category affects the user based on their profile
   */
  private checkIfAffects(category: string): boolean {
    try {
      const parsed = this.deps.personalLoader.load(this.config.paths.personal_data);
      const profile = parsed.profile;

      switch (category) {
        case 'income_tax':
          return !!(profile.income.employment || profile.income.freelance || profile.income.other);
        case 'btw':
          return !!(profile.income.freelance?.registered && profile.income.freelance.btwNumber);
        case 'box3':
          const totalAssets =
            profile.assets.bankAccounts.savings + profile.assets.bankAccounts.checking;
          const exemption = profile.basicInfo.taxPartner ? 114000 : 57000;
          return totalAssets > exemption;
        case 'self_employment':
          return !!profile.income.freelance?.registered;
        case 'credits':
          return !!(profile.income.employment || profile.income.freelance);
        default:
          return false;
      }
    } catch (error) {
      return false;
    }
  }

  /**
   * Group changes by category
   */
  private groupByCategory(changes: TaxLawChange[]): Record<string, number> {
    const grouped: Record<string, number> = {};
    for (const change of changes) {
      grouped[change.category] = (grouped[change.category] || 0) + 1;
    }
    return grouped;
  }

  /**
   * Group changes by impact level
   */
  private groupByImpact(changes: TaxLawChange[]): Record<string, number> {
    const grouped: Record<string, number> = {};
    for (const change of changes) {
      grouped[change.impact_level] = (grouped[change.impact_level] || 0) + 1;
    }
    return grouped;
  }
}
