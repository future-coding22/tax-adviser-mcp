import type { ToolHandler, ToolDependencies } from './index.js';
import type { Config, GetUpcomingDuesInput, GetUpcomingDuesOutput, DueItem } from '../types/index.js';

/**
 * Get Upcoming Dues Tool
 * Tracks all upcoming payments from recurring payments table
 */
export class GetUpcomingDuesTool implements ToolHandler {
  name = 'get_upcoming_dues';
  description = 'Get all upcoming payments and dues from your recurring payments schedule';
  inputSchema = {
    type: 'object',
    properties: {
      days_ahead: {
        type: 'number',
        description: 'Number of days to look ahead (default: 90)',
      },
      category: {
        type: 'string',
        description: 'Filter by category (tax, insurance, subscription, utility, other)',
      },
      include_autopay: {
        type: 'boolean',
        description: 'Include payments with auto-pay enabled (default: true)',
      },
    },
  };

  constructor(
    private config: Config,
    private deps: ToolDependencies
  ) {}

  async execute(input: GetUpcomingDuesInput): Promise<GetUpcomingDuesOutput> {
    // Load personal profile
    const parsed = this.deps.personalLoader.load(this.config.paths.personal_data);
    const profile = parsed.profile;

    // Get parameters
    const daysAhead = input.daysAhead || 90;
    const includeAutopay = input.includeAutoPay !== false;
    const categoryFilter = input.category;

    // Calculate date range
    const today = new Date();
    const endDate = new Date(today);
    endDate.setDate(endDate.getDate() + daysAhead);

    // Get all recurring payments
    const recurringPayments = profile.recurringPayments || [];
    const upcomingDues: DueItem[] = [];

    for (const payment of recurringPayments) {
      // Filter by auto-pay
      if (!includeAutopay && payment.autoPay) {
        continue;
      }

      // Filter by category
      if (categoryFilter && payment.category !== categoryFilter) {
        continue;
      }

      // Calculate next due dates within the range
      const nextDueDates = this.calculateNextDueDates(payment, today, endDate);

      for (const dueDate of nextDueDates) {
        upcomingDues.push({
          id: `${payment.name}-${dueDate.getTime()}`,
          description: payment.name,
          amount: payment.amount,
          dueDate: this.formatDate(dueDate),
          daysUntil: this.calculateDaysUntil(dueDate, today),
          category: payment.category === 'tax' ? 'tax' : payment.category === 'insurance' ? 'bill' : 'subscription',
          autoPay: payment.autoPay || false,
          actionRequired: !payment.autoPay,
          reminderSent: false,
        });
      }
    }

    // Sort by due date
    upcomingDues.sort((a, b) => new Date(a.dueDate).getTime() - new Date(b.dueDate).getTime());

    // Calculate summary
    const totalAmount = upcomingDues.reduce((sum, payment) => sum + (typeof payment.amount === 'number' ? payment.amount : 0), 0);

    const autoPayTotal = upcomingDues.filter((d) => d.autoPay).reduce((sum, d) => sum + (typeof d.amount === 'number' ? d.amount : 0), 0);
    const manualPayTotal = upcomingDues.filter((d) => !d.autoPay).reduce((sum, d) => sum + (typeof d.amount === 'number' ? d.amount : 0), 0);

    return {
      dues: upcomingDues,
      totals: {
        fixed: totalAmount,
        variableEstimated: 0,
        autoPay: autoPayTotal,
        manualPay: manualPayTotal,
      },
    };
  }

  /**
   * Calculate next due dates for a recurring payment
   */
  private calculateNextDueDates(payment: any, startDate: Date, endDate: Date): Date[] {
    const dueDates: Date[] = [];
    const lastPaid = payment.lastPaid ? new Date(payment.lastPaid) : new Date(payment.startDate);

    let nextDue = new Date(lastPaid);

    // Calculate next occurrence based on frequency
    switch (payment.frequency) {
      case 'weekly':
        nextDue.setDate(nextDue.getDate() + 7);
        break;
      case 'monthly':
        nextDue.setMonth(nextDue.getMonth() + 1);
        break;
      case 'quarterly':
        nextDue.setMonth(nextDue.getMonth() + 3);
        break;
      case 'yearly':
        nextDue.setFullYear(nextDue.getFullYear() + 1);
        break;
    }

    // Generate all due dates within range
    while (nextDue <= endDate) {
      if (nextDue >= startDate) {
        dueDates.push(new Date(nextDue));
      }

      // Move to next occurrence
      switch (payment.frequency) {
        case 'weekly':
          nextDue.setDate(nextDue.getDate() + 7);
          break;
        case 'monthly':
          nextDue.setMonth(nextDue.getMonth() + 1);
          break;
        case 'quarterly':
          nextDue.setMonth(nextDue.getMonth() + 3);
          break;
        case 'yearly':
          nextDue.setFullYear(nextDue.getFullYear() + 1);
          break;
      }

      // Safety break to avoid infinite loops
      if (dueDates.length > 100) break;
    }

    return dueDates;
  }

  /**
   * Format date as YYYY-MM-DD
   */
  private formatDate(date: Date): string {
    return date.toISOString().split('T')[0];
  }

  /**
   * Calculate days until due date
   */
  private calculateDaysUntil(dueDate: Date, today: Date): number {
    const diffTime = dueDate.getTime() - today.getTime();
    return Math.ceil(diffTime / (1000 * 60 * 60 * 24));
  }

}
