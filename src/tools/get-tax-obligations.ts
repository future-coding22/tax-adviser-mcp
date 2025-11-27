import type { ToolHandler, ToolDependencies } from './index.js';
import type {
  Config,
  GetTaxObligationsInput,
  GetTaxObligationsOutput,
  TaxObligation,
} from '../types/index.js';

/**
 * Get Tax Obligations Tool
 * Returns all taxes the user is liable for based on their profile
 */
export class GetTaxObligationsTool implements ToolHandler {
  name = 'get_tax_obligations';
  description = 'Get all taxes you are liable for based on your financial profile';
  inputSchema = {
    type: 'object',
    properties: {
      year: {
        type: 'number',
        description: 'Tax year (defaults to current year)',
      },
    },
  };

  constructor(
    private config: Config,
    private deps: ToolDependencies
  ) {}

  async execute(input: GetTaxObligationsInput): Promise<GetTaxObligationsOutput> {
    // Load personal profile
    const parsed = this.deps.personalLoader.load(this.config.paths.personal_data);
    const profile = parsed.profile;

    // Get tax year
    const year = input.year || this.config.tax.year || new Date().getFullYear();

    // Determine obligations
    const obligations: TaxObligation[] = [];

    // 1. Income Tax (Inkomstenbelasting) - Everyone must file
    const hasIncome =
      profile.income.employment || profile.income.freelance || profile.income.other;

    if (hasIncome) {
      obligations.push({
        taxType: 'income_tax',
        dutchName: 'Inkomstenbelasting',
        description: 'Annual income tax on Box 1 (employment/business), Box 2 (substantial interest), and Box 3 (savings/investments)',
        appliesBecause: 'You have taxable income from employment, self-employment, or other sources',
        filingDeadline: `${year}-05-01`,
        paymentDeadline: `${year}-05-01`,
        frequency: 'annual',
        status: this.getStatus(`${year}-05-01`),
      });
    }

    // 2. BTW (VAT) - If self-employed and above threshold
    if (profile.income.freelance?.registered) {
      const revenue = profile.income.freelance.estimatedAnnualRevenue;
      const threshold = this.deps.taxKnowledge.getBTWThreshold();

      if (revenue > threshold || profile.income.freelance.btwNumber) {
        obligations.push({
          taxType: 'btw',
          dutchName: 'BTW (Belasting over de Toegevoegde Waarde)',
          description: 'Value Added Tax - quarterly filing and payment',
          appliesBecause: `You are registered for BTW (revenue €${revenue.toLocaleString()} exceeds threshold of €${threshold.toLocaleString()})`,
          filingDeadline: this.getNextBTWDeadline(year),
          paymentDeadline: this.getNextBTWDeadline(year),
          frequency: 'quarterly',
          status: this.getStatus(this.getNextBTWDeadline(year)),
        });
      }
    }

    // 3. Box 3 (Vermogensrendementsheffing) - If assets above exemption
    const totalAssets =
      profile.assets.bankAccounts.savings +
      profile.assets.bankAccounts.checking +
      (profile.assets.investments.stocksETFs || 0) +
      (profile.assets.investments.crypto || 0);

    const totalDebts =
      (profile.assets.debts.studentLoan || 0) +
      (profile.assets.debts.personalLoans || 0);

    const netAssets = totalAssets - totalDebts;
    const exemption = profile.basicInfo.taxPartner ? 114000 : 57000;

    if (netAssets > exemption) {
      obligations.push({
        taxType: 'box3',
        dutchName: 'Box 3 (Vermogensrendementsheffing)',
        description: 'Wealth tax on savings and investments above exemption threshold',
        appliesBecause: `Your net assets (€${netAssets.toLocaleString()}) exceed the exemption (€${exemption.toLocaleString()})`,
        filingDeadline: `${year}-05-01`,
        paymentDeadline: `${year}-05-01`,
        frequency: 'annual',
        status: this.getStatus(`${year}-05-01`),
      });
    }

    // 4. Provisional Assessment (Voorlopige aanslag)
    if (profile.income.freelance || profile.income.other) {
      obligations.push({
        taxType: 'provisional_assessment',
        dutchName: 'Voorlopige aanslag',
        description: 'Provisional tax payments throughout the year',
        appliesBecause: 'You have income from self-employment or other sources requiring advance payments',
        filingDeadline: 'Quarterly',
        paymentDeadline: 'Quarterly',
        frequency: 'quarterly',
        status: 'upcoming',
      });
    }

    // 5. Municipal taxes (Gemeentebelasting) - Everyone pays if resident
    if (profile.basicInfo.residentSince) {
      obligations.push({
        taxType: 'municipal_tax',
        dutchName: 'Gemeentebelasting',
        description: 'Municipal property and waste taxes',
        appliesBecause: 'You are a resident in the Netherlands',
        estimatedAmount: 400,
        filingDeadline: `${year}-02-28`,
        paymentDeadline: `${year}-02-28`,
        frequency: 'annual',
        status: this.getStatus(`${year}-02-28`),
      });
    }

    // 6. Water board tax (Waterschapsbelasting)
    if (profile.basicInfo.residentSince) {
      obligations.push({
        taxType: 'water_board_tax',
        dutchName: 'Waterschapsbelasting',
        description: 'Water board tax for water management',
        appliesBecause: 'You are a resident in the Netherlands',
        estimatedAmount: 150,
        filingDeadline: `${year}-03-31`,
        paymentDeadline: `${year}-03-31`,
        frequency: 'annual',
        status: this.getStatus(`${year}-03-31`),
      });
    }

    // Calculate total estimated tax
    const totalEstimated = obligations
      .filter((o) => o.estimatedAmount)
      .reduce((sum, o) => sum + o.estimatedAmount!, 0);

    // Find next deadline
    const today = new Date();
    const upcomingDeadlines = obligations
      .filter((o) => new Date(o.filingDeadline) > today)
      .sort((a, b) => new Date(a.filingDeadline).getTime() - new Date(b.filingDeadline).getTime());

    const nextDeadline = upcomingDeadlines[0]?.filingDeadline || 'No upcoming deadlines';

    // Action items
    const actionRequired: string[] = [];
    obligations.forEach((o) => {
      if (o.status === 'due_soon') {
        actionRequired.push(`${o.dutchName} filing deadline in less than 30 days`);
      } else if (o.status === 'overdue') {
        actionRequired.push(`${o.dutchName} is OVERDUE - file immediately!`);
      }
    });

    return {
      obligations,
      summary: {
        totalEstimated,
        nextDeadline,
        actionRequired,
      },
    };
  }

  /**
   * Get status based on deadline
   */
  private getStatus(deadline: string): TaxObligation['status'] {
    const deadlineDate = new Date(deadline);
    const today = new Date();
    const daysUntil = Math.floor(
      (deadlineDate.getTime() - today.getTime()) / (1000 * 60 * 60 * 24)
    );

    if (daysUntil < 0) return 'overdue';
    if (daysUntil <= 30) return 'due_soon';
    return 'upcoming';
  }

  /**
   * Get next BTW deadline
   */
  private getNextBTWDeadline(year: number): string {
    const deadlines = this.deps.taxKnowledge.getDeadlines().btw_quarterly;
    const today = new Date();

    for (const deadline of deadlines) {
      if (new Date(deadline) > today) {
        return deadline;
      }
    }

    // If all deadlines passed, return first deadline of next year
    return `${year + 1}-01-31`;
  }
}
