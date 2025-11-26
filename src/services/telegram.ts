import axios, { AxiosInstance } from 'axios';
import type { TelegramConfig } from '../types/index.js';

/**
 * Telegram Bot API wrapper for sending notifications
 */
export class TelegramService {
  private readonly config: TelegramConfig;
  private readonly client: AxiosInstance;
  private messageCount = { perMinute: 0, perHour: 0 };
  private lastReset = { minute: Date.now(), hour: Date.now() };

  constructor(config: TelegramConfig) {
    this.config = config;

    // Create axios client
    this.client = axios.create({
      baseURL: `https://api.telegram.org/bot${config.bot_token}`,
      timeout: config.timeout_seconds * 1000,
    });
  }

  /**
   * Send a message via Telegram
   */
  async sendMessage(options: SendMessageOptions): Promise<SendMessageResult> {
    // Check if enabled
    if (!this.config.enabled) {
      return {
        success: false,
        error: 'Telegram notifications are disabled in configuration',
      };
    }

    // Check quiet hours
    if (this.isQuietHours()) {
      return {
        success: false,
        error: 'Message not sent (quiet hours)',
        skipped: true,
      };
    }

    // Check rate limits
    if (!this.checkRateLimit()) {
      return {
        success: false,
        error: 'Rate limit exceeded',
      };
    }

    // Format message
    const formattedMessage = this.formatMessage(options.message, options.priority);

    // Prepare request
    const payload = {
      chat_id: this.config.chat_id,
      text: formattedMessage,
      parse_mode: this.getParseMode(),
      disable_notification: options.priority === 'low',
    };

    // Send with retry logic
    return this.sendWithRetry(payload, options.priority || 'normal');
  }

  /**
   * Send message with retry logic
   */
  private async sendWithRetry(
    payload: any,
    priority: 'low' | 'normal' | 'high'
  ): Promise<SendMessageResult> {
    let lastError: Error | undefined;

    for (let attempt = 1; attempt <= this.config.retry_attempts; attempt++) {
      try {
        const response = await this.client.post('/sendMessage', payload);

        // Increment rate limit counters
        this.incrementRateLimitCounters();

        return {
          success: true,
          messageId: response.data.result.message_id.toString(),
        };
      } catch (error) {
        lastError = error as Error;

        // Don't retry on certain errors
        if (axios.isAxiosError(error)) {
          const status = error.response?.status;
          if (status === 401 || status === 403 || status === 404) {
            // Authentication or permission errors - don't retry
            return {
              success: false,
              error: `Telegram API error: ${error.message}`,
            };
          }
        }

        // Wait before retry (exponential backoff)
        if (attempt < this.config.retry_attempts) {
          const delay = this.config.retry_delay_seconds * 1000 * attempt;
          await this.sleep(delay);
        }
      }
    }

    return {
      success: false,
      error: `Failed after ${this.config.retry_attempts} attempts: ${lastError?.message}`,
    };
  }

  /**
   * Format message based on priority and configuration
   */
  private formatMessage(message: string, priority?: 'low' | 'normal' | 'high'): string {
    let formatted = message;

    // Add emoji prefix if enabled
    if (this.config.include_emojis) {
      const emoji = this.getPriorityEmoji(priority);
      if (emoji) {
        formatted = `${emoji} ${formatted}`;
      }
    }

    // Truncate if too long
    if (formatted.length > this.config.max_message_length) {
      formatted = formatted.substring(0, this.config.max_message_length - 3) + '...';
    }

    return formatted;
  }

  /**
   * Get emoji for priority level
   */
  private getPriorityEmoji(priority?: 'low' | 'normal' | 'high'): string {
    switch (priority) {
      case 'high':
        return '🚨';
      case 'normal':
        return '💼';
      case 'low':
        return 'ℹ️';
      default:
        return '';
    }
  }

  /**
   * Get Telegram parse mode from config
   */
  private getParseMode(): 'Markdown' | 'HTML' | undefined {
    switch (this.config.message_format) {
      case 'markdown':
        return 'Markdown';
      case 'html':
        return 'HTML';
      case 'plain':
      default:
        return undefined;
    }
  }

  /**
   * Check if currently in quiet hours
   */
  private isQuietHours(): boolean {
    if (!this.config.quiet_hours.enabled) {
      return false;
    }

    const now = new Date();
    const hours = now.getHours();
    const minutes = now.getMinutes();
    const currentTime = hours * 60 + minutes;

    const start = this.parseTime(this.config.quiet_hours.start);
    const end = this.parseTime(this.config.quiet_hours.end);

    // Handle overnight quiet hours (e.g., 22:00 to 08:00)
    if (start > end) {
      return currentTime >= start || currentTime < end;
    } else {
      return currentTime >= start && currentTime < end;
    }
  }

  /**
   * Parse time string (HH:MM) to minutes since midnight
   */
  private parseTime(timeStr: string): number {
    const [hours, minutes] = timeStr.split(':').map(Number);
    return hours * 60 + minutes;
  }

  /**
   * Check rate limits
   */
  private checkRateLimit(): boolean {
    if (!this.config.rate_limit.enabled) {
      return true;
    }

    this.resetRateLimitCounters();

    const { perMinute, perHour } = this.messageCount;
    const { max_per_minute, max_per_hour } = this.config.rate_limit;

    return perMinute < max_per_minute && perHour < max_per_hour;
  }

  /**
   * Increment rate limit counters
   */
  private incrementRateLimitCounters(): void {
    this.messageCount.perMinute++;
    this.messageCount.perHour++;
  }

  /**
   * Reset rate limit counters if time windows have passed
   */
  private resetRateLimitCounters(): void {
    const now = Date.now();

    // Reset per-minute counter
    if (now - this.lastReset.minute >= 60000) {
      this.messageCount.perMinute = 0;
      this.lastReset.minute = now;
    }

    // Reset per-hour counter
    if (now - this.lastReset.hour >= 3600000) {
      this.messageCount.perHour = 0;
      this.lastReset.hour = now;
    }
  }

  /**
   * Sleep helper for retry delays
   */
  private sleep(ms: number): Promise<void> {
    return new Promise((resolve) => setTimeout(resolve, ms));
  }

  /**
   * Test connection to Telegram
   */
  async testConnection(): Promise<{ success: boolean; error?: string; botInfo?: any }> {
    if (!this.config.enabled) {
      return {
        success: false,
        error: 'Telegram is disabled in configuration',
      };
    }

    try {
      const response = await this.client.get('/getMe');
      return {
        success: true,
        botInfo: response.data.result,
      };
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error',
      };
    }
  }
}

/**
 * Mock Telegram service for testing
 */
export class MockTelegramService extends TelegramService {
  private messages: Array<{ message: string; priority?: string; timestamp: Date }> = [];

  async sendMessage(options: SendMessageOptions): Promise<SendMessageResult> {
    this.messages.push({
      message: options.message,
      priority: options.priority,
      timestamp: new Date(),
    });

    return {
      success: true,
      messageId: `mock-${Date.now()}`,
    };
  }

  getMessages() {
    return this.messages;
  }

  clearMessages() {
    this.messages = [];
  }
}

// =============================================================================
// Types
// =============================================================================

export interface SendMessageOptions {
  message: string;
  priority?: 'low' | 'normal' | 'high';
  dueId?: string;
  schedule?: string; // ISO datetime for future feature
}

export interface SendMessageResult {
  success: boolean;
  messageId?: string;
  scheduledFor?: string;
  error?: string;
  skipped?: boolean; // True if skipped due to quiet hours, etc.
}

/**
 * Factory function to create appropriate service based on config
 */
export function createTelegramService(config: TelegramConfig, mock = false): TelegramService {
  return mock ? new MockTelegramService(config) : new TelegramService(config);
}
