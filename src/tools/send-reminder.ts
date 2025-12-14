import type { ToolHandler, ToolDependencies } from './index.js';
import type { Config, SendReminderInput, SendReminderOutput } from '../types/index.js';

/**
 * Send Reminder Tool
 * Sends a reminder notification via Telegram
 */
export class SendReminderTool implements ToolHandler {
  name = 'send_reminder';
  description = 'Send a reminder notification to your Telegram';
  inputSchema = {
    type: 'object',
    properties: {
      message: {
        type: 'string',
        description: 'The reminder message to send',
      },
      priority: {
        type: 'string',
        enum: ['low', 'normal', 'high', 'urgent'],
        description: 'Priority level of the reminder (default: normal)',
      },
      schedule_for: {
        type: 'string',
        description: 'ISO datetime to schedule the reminder for (optional, sends immediately if not provided)',
      },
      tags: {
        type: 'array',
        items: { type: 'string' },
        description: 'Tags for categorizing the reminder',
      },
    },
    required: ['message'],
  };

  constructor(
    private config: Config,
    private deps: ToolDependencies
  ) {}

  async execute(input: SendReminderInput): Promise<SendReminderOutput> {
    // Check if Telegram is enabled
    if (!this.config.telegram.enabled) {
      return {
        success: false,
        error: 'Telegram notifications are disabled in config',
      };
    }

    // Check if scheduled
    const scheduleFor = input.schedule ? new Date(input.schedule) : null;
    const now = new Date();

    if (scheduleFor && scheduleFor > now) {
      // Schedule for future (would be handled by daemon in production)
      return {
        success: true,
        scheduledFor: scheduleFor.toISOString(),
      };
    }

    // Send immediately
    try {
      const priority = (input.priority || 'normal') as 'low' | 'normal' | 'high';

      const result = await this.deps.telegramService.sendMessage({
        message: input.message,
        priority,
        dueId: input.dueId,
      });

      if (result.success) {
        return {
          success: true,
          messageId: result.messageId,
        };
      } else {
        return {
          success: false,
          error: result.error || 'Failed to send reminder',
        };
      }
    } catch (error) {
      return {
        success: false,
        error: `Failed to send reminder: ${error instanceof Error ? error.message : 'Unknown error'}`,
      };
    }
  }
}
