import { z } from 'zod';

// =============================================================================
// Helper Schemas
// =============================================================================

const cronScheduleSchema = z
  .string()
  .regex(/^(\*|[0-5]?\d) (\*|[01]?\d|2[0-3]) (\*|[012]?\d|3[01]) (\*|[01]?\d) (\*|[0-6])$/, {
    message: 'Invalid cron schedule format',
  });

const timeSchema = z.string().regex(/^([01]?\d|2[0-3]):[0-5]\d$/, {
  message: 'Invalid time format (expected HH:MM)',
});

const environmentVariableSchema = z
  .string()
  .regex(/^\${[a-zA-Z0-9_]+}$/, {
    message: 'Environment variable must use ${VAR_NAME} format',
  })
  .or(z.string().min(1));

// =============================================================================
// Server Configuration
// =============================================================================

const serverLoggingSchema = z.object({
  level: z.enum(['debug', 'info', 'warn', 'error']).default('info'),
  file: z.string().nullable().default('./logs/server.log'),
  max_file_size: z.string().default('10MB'),
  max_files: z.number().int().positive().default(5),
  include_timestamps: z.boolean().default(true),
  format: z.enum(['json', 'text']).default('json'),
});

const serverPerformanceSchema = z.object({
  max_concurrent_operations: z.number().int().positive().default(5),
  request_timeout_ms: z.number().int().positive().default(30000),
  cache_size_mb: z.number().int().positive().default(50),
});

const serverSchema = z.object({
  name: z.string().default('tax-advisor'),
  version: z.string().default('1.0.0'),
  logging: serverLoggingSchema.default({}),
  performance: serverPerformanceSchema.default({}),
});

// =============================================================================
// Country & Localization
// =============================================================================

const countrySchema = z.object({
  code: z.string().length(2).toUpperCase().default('NL'),
  timezone: z.string().default('Europe/Amsterdam'),
  currency: z.string().length(3).toUpperCase().default('EUR'),
  date_format: z.string().default('DD-MM-YYYY'),
  language: z.enum(['nl', 'en']).default('nl'),
});

// =============================================================================
// Paths
// =============================================================================

const pathsSchema = z.object({
  personal_data: z.string().default('./data/personal.md'),
  tax_rules: z.string().default('./data/dutch-tax-rules.json'),
  knowledge_base: z.string().default('./knowledge'),
  logs: z.string().default('./logs'),
  backups: z.string().default('./backups'),
  temp: z.string().default('./tmp'),
});

// =============================================================================
// Knowledge Cache
// =============================================================================

const knowledgeSchema = z.object({
  // Core settings
  enabled: z.boolean().default(true),
  auto_cache: z.boolean().default(true),

  // Cache behavior
  default_expiry_days: z.number().int().positive().default(90),
  min_confidence: z.enum(['low', 'medium', 'high']).default('medium'),
  min_relevance_score: z.number().int().min(0).max(100).default(50),

  // Storage options
  track_in_git: z.boolean().default(true),
  seed_initial_entries: z.boolean().default(true),
  export_format: z.enum(['markdown', 'json', 'both']).default('markdown'),

  // Refresh strategy
  refresh_strategy: z.enum(['weekly', 'on-demand', 'disabled']).default('weekly'),
  refresh_schedule: cronScheduleSchema.default('0 3 * * 0'),
  auto_refresh_expired: z.boolean().default(true),

  // Change detection
  change_notifications: z.enum(['all', 'profile-specific', 'disabled']).default('profile-specific'),
  detect_law_changes: z.boolean().default(true),
  change_significance_threshold: z.enum(['low', 'medium', 'high']).default('medium'),

  // Cache maintenance
  auto_prune_enabled: z.boolean().default(true),
  prune_schedule: cronScheduleSchema.default('0 2 1 * *'),
  max_entries: z.number().int().positive().default(500),
  min_access_count_to_keep: z.number().int().nonnegative().default(2),

  // Categories
  categories: z.array(z.string()).default([
    'income-tax',
    'box3',
    'btw',
    'self-employment',
    'deductions',
    'general',
  ]),

  // Backup
  auto_backup: z.boolean().default(true),
  backup_frequency: z.enum(['daily', 'weekly', 'monthly']).default('weekly'),
  backup_retention_days: z.number().int().positive().default(90),
});

// =============================================================================
// Telegram
// =============================================================================

const telegramQuietHoursSchema = z.object({
  enabled: z.boolean().default(false),
  start: timeSchema.default('22:00'),
  end: timeSchema.default('08:00'),
  timezone: z.string().default('Europe/Amsterdam'),
});

const telegramRateLimitSchema = z.object({
  enabled: z.boolean().default(true),
  max_per_minute: z.number().int().positive().default(10),
  max_per_hour: z.number().int().positive().default(50),
});

const telegramSchema = z.object({
  // Core
  enabled: z.boolean().default(true),

  // Authentication
  bot_token: environmentVariableSchema,
  chat_id: environmentVariableSchema,

  // Message formatting
  message_format: z.enum(['markdown', 'html', 'plain']).default('markdown'),
  include_emojis: z.boolean().default(true),
  max_message_length: z.number().int().positive().default(4000),

  // Notification settings
  notification_level: z.enum(['all', 'important', 'critical']).default('all'),
  quiet_hours: telegramQuietHoursSchema.default({}),

  // Delivery settings
  retry_attempts: z.number().int().min(0).max(10).default(3),
  retry_delay_seconds: z.number().int().positive().default(5),
  timeout_seconds: z.number().int().positive().default(10),

  // Rate limiting
  rate_limit: telegramRateLimitSchema.default({}),
});

// =============================================================================
// Reminders
// =============================================================================

const remindersSchema = z.object({
  // Core
  enabled: z.boolean().default(true),

  // Scheduling
  check_schedule: cronScheduleSchema.default('0 9 * * *'),
  timezone: z.string().default('Europe/Amsterdam'),

  // Reminder timing
  default_days_before: z.array(z.number().int().positive()).default([7, 3, 1]),
  include_weekends: z.boolean().default(true),

  // Reminder content
  format: z.enum(['brief', 'detailed']).default('detailed'),
  include_amounts: z.boolean().default(true),
  include_actions: z.boolean().default(true),
  consolidate_daily: z.boolean().default(true),
  max_per_day: z.number().int().positive().default(5),

  // Tracking
  state_file: z.string().default('./.reminder-state.json'),
  mark_sent: z.boolean().default(true),
  prevent_duplicates: z.boolean().default(true),
});

// =============================================================================
// Tax Calculation
// =============================================================================

const taxBox1Schema = z.object({
  include_employment: z.boolean().default(true),
  include_self_employment: z.boolean().default(true),
  include_benefits: z.boolean().default(true),
});

const taxBox3Schema = z.object({
  split_savings_investments: z.boolean().default(true),
  include_crypto: z.boolean().default(true),
  include_property: z.boolean().default(true),
});

const taxSchema = z.object({
  // Tax year
  year: z.number().int().min(2020).max(2030).default(2024),
  use_provisional_rates: z.boolean().default(true),

  // Calculation behavior
  default_filing_status: z.enum(['single', 'married', 'partners']).default('single'),
  include_estimates: z.boolean().default(true),
  rounding_method: z.enum(['standard', 'up', 'down']).default('standard'),
  currency: z.string().length(3).toUpperCase().default('EUR'),

  // Display options
  show_breakdown: z.boolean().default(true),
  show_comparisons: z.boolean().default(true),
  include_disclaimers: z.boolean().default(true),

  // Box-specific settings
  box1: taxBox1Schema.default({}),
  box3: taxBox3Schema.default({}),
});

// =============================================================================
// Web Search
// =============================================================================

const searchRateLimitSchema = z.object({
  enabled: z.boolean().default(true),
  delay_between_requests_ms: z.number().int().nonnegative().default(1000),
  max_concurrent_requests: z.number().int().positive().default(2),
});

const searchSchema = z.object({
  // Core
  enabled: z.boolean().default(true),

  // Search sources
  sources: z.array(z.string()).default(['belastingdienst.nl', 'wetten.nl', 'rijksoverheid.nl']),

  // Search behavior
  max_results: z.number().int().positive().default(10),
  timeout_seconds: z.number().int().positive().default(15),
  user_agent: z.string().default('TaxAdvisorMCP/1.0'),

  // Rate limiting
  rate_limit: searchRateLimitSchema.default({}),

  // Result filtering
  min_relevance: z.number().min(0).max(1).default(0.5),
  exclude_outdated: z.boolean().default(true),
  max_age_days: z.number().int().positive().default(365),

  // Caching
  cache_results: z.boolean().default(true),
  cache_duration_hours: z.number().int().positive().default(24),
});

// =============================================================================
// Personal Data
// =============================================================================

const personalDataSchema = z.object({
  // Validation
  validate_on_load: z.boolean().default(true),
  require_bsn: z.boolean().default(false),
  require_kvk: z.boolean().default(false),

  // Privacy
  encryption_enabled: z.boolean().default(false),
  encryption_key_file: z.string().default('./data/.encryption.key'),

  // Backup
  auto_backup: z.boolean().default(true),
  backup_on_change: z.boolean().default(true),
  backup_location: z.string().default('./backups/personal/'),
  backup_retention_days: z.number().int().positive().default(365),

  // Parsing
  strict_mode: z.boolean().default(false),
  auto_fix_formatting: z.boolean().default(true),
});

// =============================================================================
// MCP Server
// =============================================================================

const mcpToolsSchema = z.object({
  enabled: z.boolean().default(true),
  timeout_seconds: z.number().int().positive().default(30),
});

const mcpResourcesSchema = z.object({
  enabled: z.boolean().default(true),
  cache_resources: z.boolean().default(true),
});

const mcpPromptsSchema = z.object({
  enabled: z.boolean().default(false),
});

const mcpSchema = z.object({
  name: z.string().default('tax-advisor'),
  description: z.string().default('Personal tax and financial advisor for Dutch residents'),

  tools: mcpToolsSchema.default({}),
  resources: mcpResourcesSchema.default({}),
  prompts: mcpPromptsSchema.default({}),
});

// =============================================================================
// Development
// =============================================================================

const developmentSchema = z.object({
  // Debug mode
  debug: z.boolean().default(false),
  verbose_logging: z.boolean().default(false),

  // Mock services
  mock_telegram: z.boolean().default(false),
  mock_web_search: z.boolean().default(false),

  // Testing
  test_mode: z.boolean().default(false),
  bypass_validation: z.boolean().default(false),
});

// =============================================================================
// Advanced Settings
// =============================================================================

const advancedFeaturesSchema = z.object({
  multi_currency: z.boolean().default(false),
  receipt_scanning: z.boolean().default(false),
  bank_integration: z.boolean().default(false),
  ai_summaries: z.boolean().default(true),
  smart_deductions: z.boolean().default(true),
});

const advancedSchema = z.object({
  // Error handling
  retry_on_failure: z.boolean().default(true),
  max_retry_attempts: z.number().int().min(0).max(10).default(3),
  exponential_backoff: z.boolean().default(true),

  // Resource limits
  max_memory_mb: z.number().int().positive().default(512),
  max_disk_usage_mb: z.number().int().positive().default(1024),

  // Concurrency
  enable_parallel_operations: z.boolean().default(true),
  worker_threads: z.number().int().positive().default(2),

  // Feature flags
  features: advancedFeaturesSchema.default({}),
});

// =============================================================================
// Main Configuration Schema
// =============================================================================

export const configSchema = z.object({
  server: serverSchema.default({}),
  country: countrySchema.default({}),
  paths: pathsSchema.default({}),
  knowledge: knowledgeSchema.default({}),
  telegram: telegramSchema,
  reminders: remindersSchema.default({}),
  tax: taxSchema.default({}),
  search: searchSchema.default({}),
  personal_data: personalDataSchema.default({}),
  mcp: mcpSchema.default({}),
  development: developmentSchema.default({}),
  advanced: advancedSchema.default({}),
});

// =============================================================================
// Exported Types
// =============================================================================

export type Config = z.infer<typeof configSchema>;
export type ServerConfig = z.infer<typeof serverSchema>;
export type CountryConfig = z.infer<typeof countrySchema>;
export type PathsConfig = z.infer<typeof pathsSchema>;
export type KnowledgeConfig = z.infer<typeof knowledgeSchema>;
export type TelegramConfig = z.infer<typeof telegramSchema>;
export type RemindersConfig = z.infer<typeof remindersSchema>;
export type TaxConfig = z.infer<typeof taxSchema>;
export type SearchConfig = z.infer<typeof searchSchema>;
export type PersonalDataConfig = z.infer<typeof personalDataSchema>;
export type McpConfig = z.infer<typeof mcpSchema>;
export type DevelopmentConfig = z.infer<typeof developmentSchema>;
export type AdvancedConfig = z.infer<typeof advancedSchema>;
