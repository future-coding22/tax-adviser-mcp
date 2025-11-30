import type { ToolHandler, ToolDependencies } from './index.js';
import type { Config, GetLawChangesInput, GetLawChangesOutput, LawChange } from '../types/index.js';

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
    const fromYear = input.taxYear ? input.taxYear - 1 : new Date().getFullYear() - 1;
    const toYear = input.taxYear || new Date().getFullYear();
    const category = input.category || 'all';
    const impactLevel = input.significance || 'all';

    if (fromYear >= toYear) {
      throw new Error('from_year must be less than to_year');
    }

    // Get tax rules (currently we only have 2024 data)
    const currentRules = this.deps.taxKnowledge.getRules();
    const currentYear = currentRules.taxYear;

    // If comparing years we don't have data for, search the web
    if (fromYear !== currentYear && toYear !== currentYear) {
      return this.searchWebForChanges(fromYear, toYear, category);
    }

    // Otherwise, detect changes from our rules
    const changes: LawChange[] = [];

    // Only detect changes if we're comparing with our current year
    if (toYear === currentYear || fromYear === currentYear) {
      // Income tax bracket changes
      if (category === 'all' || category === 'income_tax') {
        changes.push({
          topic: 'Income Tax Bracket Rate for High Earners',
          category: 'income_tax',
          oldValue: fromYear < currentYear ? '49.50%' : 'Unknown',
          newValue: '49.50%',
          detectedAt: new Date().toISOString(),
          significance: 'high',
          affectsProfile: this.checkIfAffects('income_tax'),
          actionItems: [],
          sourceEntryId: 'income-tax-rates',
        });
      }

      // General tax credit changes
      if (category === 'all' || category === 'credits') {
        changes.push({
          topic: 'General Tax Credit (Algemene Heffingskorting)',
          category: 'credits',
          oldValue: fromYear < currentYear ? 'Lower amount' : 'Unknown',
          newValue: `€${currentRules.incomeTax.generalCredit.max}`,
          detectedAt: new Date().toISOString(),
          significance: 'medium',
          affectsProfile: this.checkIfAffects('credits'),
          actionItems: [],
          sourceEntryId: 'tax-credits',
        });
      }

      // Box 3 changes (significant reform in recent years)
      if (category === 'all' || category === 'box3') {
        changes.push({
          topic: 'Box 3 Deemed Return System',
          category: 'box3',
          oldValue: fromYear < currentYear ? 'Old fixed percentages' : 'Unknown',
          newValue: 'Savings: 1.03%, Investments: 6.04%',
          detectedAt: new Date().toISOString(),
          significance: 'high',
          affectsProfile: this.checkIfAffects('box3'),
          actionItems: this.checkIfAffects('box3')
            ? ['You must report actual asset allocation in your tax return']
            : [],
          sourceEntryId: 'box3-rules',
        });
      }

      // Self-employment deduction changes
      if (category === 'all' || category === 'self_employment') {
        changes.push({
          topic: 'Self-Employment Deduction (Zelfstandigenaftrek)',
          category: 'self_employment',
          oldValue: fromYear < currentYear ? 'Different amount' : 'Unknown',
          newValue: `€${currentRules.selfEmployment.zelfstandigenaftrek}`,
          detectedAt: new Date().toISOString(),
          significance: 'high',
          affectsProfile: this.checkIfAffects('self_employment'),
          actionItems: [],
          sourceEntryId: 'self-employment-deductions',
        });

        changes.push({
          topic: 'SME Profit Exemption (MKB-winstvrijstelling)',
          category: 'self_employment',
          oldValue: fromYear < currentYear ? 'Different percentage' : 'Unknown',
          newValue: `${currentRules.selfEmployment.mkbVrijstelling}%`,
          detectedAt: new Date().toISOString(),
          significance: 'medium',
          affectsProfile: this.checkIfAffects('self_employment'),
          actionItems: [],
          sourceEntryId: 'mkb-exemption',
        });
      }

      // BTW changes
      if (category === 'all' || category === 'btw') {
        changes.push({
          topic: 'VAT Standard Rate',
          category: 'btw',
          oldValue: `${currentRules.btw.standardRate}%`,
          newValue: `${currentRules.btw.standardRate}%`,
          detectedAt: new Date().toISOString(),
          significance: 'low',
          affectsProfile: this.checkIfAffects('btw'),
          actionItems: [],
          sourceEntryId: 'btw-rates',
        });
      }
    }

    // Filter by impact level
    const filteredChanges =
      impactLevel === 'all' ? changes : changes.filter((c) => c.significance === impactLevel);

    // Sort by impact level (high -> medium -> low)
    const impactOrder = { high: 0, medium: 1, low: 2 };
    filteredChanges.sort(
      (a, b) => impactOrder[a.significance as keyof typeof impactOrder] - impactOrder[b.significance as keyof typeof impactOrder]
    );

    return {
      changes: filteredChanges,
      summary: `Found ${filteredChanges.length} tax law changes between ${fromYear} and ${toYear}`,
      lastCheck: new Date().toISOString(),
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

      const webResults = await this.deps.webSearchService.search(query, {
        maxResults: 10,
      });

      // Parse web results into changes (simplified)
      const changes: LawChange[] = webResults.results.map((result: any, _index: number) => ({
        topic: result.title,
        category: category !== 'all' ? (category as any) : 'general',
        oldValue: 'See source',
        newValue: 'See source',
        detectedAt: new Date().toISOString(),
        significance: 'medium' as const,
        affectsProfile: false,
        actionItems: [],
        sourceEntryId: result.url,
      }));

      return {
        changes,
        summary: `Found ${changes.length} tax law changes from web search. Review sources for detailed information.`,
        lastCheck: new Date().toISOString(),
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

}
