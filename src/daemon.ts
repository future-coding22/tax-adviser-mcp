#!/usr/bin/env node

import cron from 'node-cron';
import { loadConfig } from './config/loader.js';
import { personalProfileLoader } from './context/personal-loader.js';
import { createDutchTaxKnowledge } from './context/dutch-tax-knowledge.js';
import { KnowledgeCacheService } from './services/knowledge-cache.js';
import { TelegramService } from './services/telegram.js';
import { WebSearchService } from './services/web-search.js';
import type { Config, TaxObligation, DuePayment } from './types/index.js';

/**
 * Tax Adviser Daemon
 * Runs background tasks: reminders, knowledge refresh, deadline notifications
 */
class TaxAdviserDaemon {
  private config!: Config;
  private taxKnowledge!: any;
  private knowledgeCache!: KnowledgeCacheService;
  private telegramService!: TelegramService;
  private webSearchService!: WebSearchService;
  private cronJobs: cron.ScheduledTask[] = [];
  private isRunning = false;

  constructor() {
    this.setupSignalHandlers();
  }

  /**
   * Initialize daemon with configuration and services
   */
  async initialize(): Promise<void> {
    try {
      console.log('[Daemon] Initializing Tax Adviser Daemon...');

      // Load configuration
      this.config = await loadConfig();

      // Initialize services
      this.taxKnowledge = createDutchTaxKnowledge(this.config.paths.tax_rules);
      this.knowledgeCache = new KnowledgeCacheService(
        this.config.paths.knowledge_base,
        this.config.knowledge
      );
      this.telegramService = new TelegramService(this.config.telegram);
      this.webSearchService = new WebSearchService(this.config.web_search);

      // Initialize knowledge cache
      if (this.config.knowledge.enabled) {
        await this.knowledgeCache.initialize();
      }

      console.log('[Daemon] Initialization complete');
    } catch (error) {
      console.error('[Daemon] Failed to initialize:', error);
      throw error;
    }
  }

  /**
   * Start the daemon and schedule all cron jobs
   */
  async start(): Promise<void> {
    if (this.isRunning) {
      console.warn('[Daemon] Daemon is already running');
      return;
    }

    console.log('[Daemon] Starting Tax Adviser Daemon...');

    // Schedule jobs based on configuration
    this.scheduleDeadlineReminders();
    this.scheduleKnowledgeRefresh();
    this.scheduleDuePaymentReminders();
    this.scheduleLawChangeMonitoring();

    this.isRunning = true;
    console.log('[Daemon] All cron jobs scheduled');
    console.log('[Daemon] Daemon is running. Press Ctrl+C to stop.');

    // Run initial checks
    await this.runInitialChecks();
  }

  /**
   * Run initial checks on startup
   */
  private async runInitialChecks(): Promise<void> {
    console.log('[Daemon] Running initial checks...');

    try {
      // Check for immediate deadlines
      await this.checkDeadlines();

      // Check for due payments in next 7 days
      await this.checkDuePayments();

      console.log('[Daemon] Initial checks complete');
    } catch (error) {
      console.error('[Daemon] Error during initial checks:', error);
    }
  }

  /**
   * Schedule tax deadline reminder checks
   * Runs daily at 9:00 AM
   */
  private scheduleDeadlineReminders(): void {
    const schedule = this.config.reminders.deadline_check_time || '0 9 * * *'; // Daily at 9 AM

    const job = cron.schedule(schedule, async () => {
      console.log('[Daemon] Running deadline check...');
      await this.checkDeadlines();
    });

    this.cronJobs.push(job);
    console.log(`[Daemon] Scheduled deadline reminders: ${schedule}`);
  }

  /**
   * Schedule knowledge cache refresh
   * Frequency based on config: weekly, on-demand, or disabled
   */
  private scheduleKnowledgeRefresh(): void {
    if (!this.config.knowledge.enabled) {
      console.log('[Daemon] Knowledge cache disabled, skipping refresh schedule');
      return;
    }

    const strategy = this.config.knowledge.refresh_strategy;

    if (strategy === 'disabled' || strategy === 'on-demand') {
      console.log(`[Daemon] Knowledge refresh strategy: ${strategy}, skipping automatic refresh`);
      return;
    }

    // Default: weekly on Sunday at 3 AM
    const schedule = strategy === 'weekly' ? '0 3 * * 0' : '0 3 * * 0';

    const job = cron.schedule(schedule, async () => {
      console.log('[Daemon] Running knowledge cache refresh...');
      await this.refreshKnowledgeCache();
    });

    this.cronJobs.push(job);
    console.log(`[Daemon] Scheduled knowledge refresh: ${schedule} (${strategy})`);
  }

  /**
   * Schedule due payment reminders
   * Runs daily at 10:00 AM
   */
  private scheduleDuePaymentReminders(): void {
    const schedule = '0 10 * * *'; // Daily at 10 AM

    const job = cron.schedule(schedule, async () => {
      console.log('[Daemon] Running due payment check...');
      await this.checkDuePayments();
    });

    this.cronJobs.push(job);
    console.log(`[Daemon] Scheduled due payment reminders: ${schedule}`);
  }

  /**
   * Schedule tax law change monitoring
   * Runs weekly on Monday at 8:00 AM
   */
  private scheduleLawChangeMonitoring(): void {
    const schedule = '0 8 * * 1'; // Weekly on Monday at 8 AM

    const job = cron.schedule(schedule, async () => {
      console.log('[Daemon] Running tax law change check...');
      await this.checkLawChanges();
    });

    this.cronJobs.push(job);
    console.log(`[Daemon] Scheduled law change monitoring: ${schedule}`);
  }

  /**
   * Check tax deadlines and send reminders
   */
  private async checkDeadlines(): Promise<void> {
    if (!this.config.telegram.enabled) {
      console.log('[Daemon] Telegram disabled, skipping deadline notifications');
      return;
    }

    try {
      const parsed = personalProfileLoader.load(this.config.paths.personal_data);
      const profile = parsed.profile;

      // Get tax obligations
      const obligations: TaxObligation[] = [];
      const year = this.config.tax.year || new Date().getFullYear();
      const today = new Date();

      // Check income tax deadline
      const hasIncome =
        profile.income.employment || profile.income.freelance || profile.income.other;

      if (hasIncome) {
        const deadline = new Date(`${year}-05-01`);
        const daysUntil = Math.floor(
          (deadline.getTime() - today.getTime()) / (1000 * 60 * 60 * 24)
        );

        if (daysUntil > 0 && daysUntil <= 30) {
          await this.telegramService.sendMessage({
            message: `📋 *Tax Deadline Reminder*\n\nIncome tax filing deadline in ${daysUntil} days (${deadline.toLocaleDateString('nl-NL')})\n\nDon't forget to file your tax return!`,
            priority: daysUntil <= 7 ? 'urgent' : daysUntil <= 14 ? 'high' : 'normal',
            parseMode: 'Markdown',
          });
        }
      }

      // Check BTW deadlines
      if (profile.income.freelance?.registered && profile.income.freelance.btwNumber) {
        const btwDeadlines = this.taxKnowledge.getDeadlines().btw_quarterly;

        for (const deadline of btwDeadlines) {
          const deadlineDate = new Date(deadline);
          const daysUntil = Math.floor(
            (deadlineDate.getTime() - today.getTime()) / (1000 * 60 * 60 * 24)
          );

          if (daysUntil > 0 && daysUntil <= 14) {
            await this.telegramService.sendMessage({
              message: `💶 *BTW Deadline Reminder*\n\nBTW quarterly filing in ${daysUntil} days (${deadlineDate.toLocaleDateString('nl-NL')})\n\nPrepare your BTW return!`,
              priority: daysUntil <= 7 ? 'urgent' : 'high',
              parseMode: 'Markdown',
            });
          }
        }
      }

      console.log('[Daemon] Deadline check complete');
    } catch (error) {
      console.error('[Daemon] Error checking deadlines:', error);
    }
  }

  /**
   * Check due payments and send reminders
   */
  private async checkDuePayments(): Promise<void> {
    if (!this.config.telegram.enabled) {
      console.log('[Daemon] Telegram disabled, skipping payment notifications');
      return;
    }

    try {
      const parsed = personalProfileLoader.load(this.config.paths.personal_data);
      const profile = parsed.profile;

      const today = new Date();
      const recurringPayments = profile.recurringPayments || [];

      for (const payment of recurringPayments) {
        // Skip auto-pay payments
        if (payment.autoPay) continue;

        // Calculate next due date
        const lastPaid = payment.lastPaid
          ? new Date(payment.lastPaid)
          : new Date(payment.startDate);
        const nextDue = new Date(lastPaid);

        switch (payment.frequency) {
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

        const daysUntil = Math.floor((nextDue.getTime() - today.getTime()) / (1000 * 60 * 60 * 24));

        // Send reminder 7 days before and 1 day before
        if (daysUntil === 7 || daysUntil === 1) {
          await this.telegramService.sendMessage({
            message: `💳 *Payment Due Reminder*\n\n${payment.name}\nAmount: €${payment.amount.toLocaleString()}\nDue in: ${daysUntil} day${daysUntil > 1 ? 's' : ''} (${nextDue.toLocaleDateString('nl-NL')})\n\nCategory: ${payment.category}`,
            priority: daysUntil === 1 ? 'high' : 'normal',
            parseMode: 'Markdown',
          });
        }
      }

      console.log('[Daemon] Due payment check complete');
    } catch (error) {
      console.error('[Daemon] Error checking due payments:', error);
    }
  }

  /**
   * Refresh expired knowledge cache entries
   */
  private async refreshKnowledgeCache(): Promise<void> {
    if (!this.config.knowledge.enabled) {
      return;
    }

    try {
      const stats = await this.knowledgeCache.getStats();
      const allEntries = await this.knowledgeCache.getAllEntries();

      const expiredEntries = allEntries.filter((entry: any) => {
        const expiresAt = new Date(entry.expiresAt);
        return expiresAt < new Date();
      });

      console.log(`[Daemon] Found ${expiredEntries.length} expired entries to refresh`);

      let refreshed = 0;
      let failed = 0;

      for (const entry of expiredEntries) {
        try {
          // Search web for updated information
          const query = entry.originalQuery || entry.title;
          const webResults = await this.webSearchService.search({
            query: `${query} ${entry.category} ${entry.taxYear} site:belastingdienst.nl`,
            maxResults: 1,
            language: 'nl',
          });

          if (webResults.results.length > 0) {
            const result = webResults.results[0];

            // Update cache entry
            await this.knowledgeCache.updateEntry(entry.id, {
              content: result.content || result.snippet,
              summary: result.snippet,
              sources: [result.url],
              confidence: 'high',
              expiresAt: new Date(Date.now() + 90 * 24 * 60 * 60 * 1000).toISOString(), // 90 days
            });

            refreshed++;
          } else {
            failed++;
          }
        } catch (error) {
          console.error(`[Daemon] Failed to refresh entry ${entry.id}:`, error);
          failed++;
        }
      }

      console.log(`[Daemon] Knowledge refresh complete: ${refreshed} refreshed, ${failed} failed`);

      // Send notification if enabled
      if (
        this.config.knowledge.change_notifications !== 'disabled' &&
        this.config.telegram.enabled &&
        refreshed > 0
      ) {
        await this.telegramService.sendMessage({
          message: `📚 *Knowledge Cache Updated*\n\n${refreshed} entries refreshed with latest information.\n\nYour tax knowledge base is now up to date!`,
          priority: 'low',
          parseMode: 'Markdown',
        });
      }
    } catch (error) {
      console.error('[Daemon] Error refreshing knowledge cache:', error);
    }
  }

  /**
   * Check for tax law changes
   */
  private async checkLawChanges(): Promise<void> {
    if (!this.config.telegram.enabled) {
      return;
    }

    try {
      const currentYear = new Date().getFullYear();
      const lastYear = currentYear - 1;

      // Search for tax changes
      const query = `belastingwijzigingen ${currentYear} site:belastingdienst.nl OR site:rijksoverheid.nl`;
      const results = await this.webSearchService.search({
        query,
        maxResults: 3,
        language: 'nl',
      });

      if (results.results.length > 0) {
        const changes = results.results
          .map((r) => `• ${r.title}\n  ${r.url}`)
          .join('\n\n');

        await this.telegramService.sendMessage({
          message: `⚖️ *Tax Law Updates Detected*\n\nFound ${results.results.length} recent tax law changes:\n\n${changes}\n\nReview these changes to ensure compliance.`,
          priority: 'normal',
          parseMode: 'Markdown',
        });
      }

      console.log('[Daemon] Law change check complete');
    } catch (error) {
      console.error('[Daemon] Error checking law changes:', error);
    }
  }

  /**
   * Set up signal handlers for graceful shutdown
   */
  private setupSignalHandlers(): void {
    process.on('SIGINT', async () => {
      await this.stop();
      process.exit(0);
    });

    process.on('SIGTERM', async () => {
      await this.stop();
      process.exit(0);
    });
  }

  /**
   * Stop the daemon and clean up
   */
  async stop(): Promise<void> {
    if (!this.isRunning) {
      return;
    }

    console.log('[Daemon] Stopping Tax Adviser Daemon...');

    // Stop all cron jobs
    for (const job of this.cronJobs) {
      job.stop();
    }

    this.cronJobs = [];
    this.isRunning = false;

    console.log('[Daemon] Daemon stopped');
  }

  /**
   * Get daemon status
   */
  getStatus(): {
    running: boolean;
    scheduledJobs: number;
    config: {
      telegram_enabled: boolean;
      knowledge_enabled: boolean;
      refresh_strategy: string;
    };
  } {
    return {
      running: this.isRunning,
      scheduledJobs: this.cronJobs.length,
      config: {
        telegram_enabled: this.config.telegram.enabled,
        knowledge_enabled: this.config.knowledge.enabled,
        refresh_strategy: this.config.knowledge.refresh_strategy,
      },
    };
  }
}

/**
 * Main entry point
 */
async function main() {
  try {
    const daemon = new TaxAdviserDaemon();
    await daemon.initialize();
    await daemon.start();

    // Keep the process running
    process.stdin.resume();
  } catch (error) {
    console.error('[Daemon] Fatal error:', error);
    process.exit(1);
  }
}

// Run if executed directly
if (import.meta.url === `file://${process.argv[1]}`) {
  main();
}

export { TaxAdviserDaemon };
