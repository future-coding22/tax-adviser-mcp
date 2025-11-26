/**
 * MCP Tool input and output types
 */

import type {
  TaxObligationsSummary,
  UpcomingDues,
  TaxCalculationResult,
} from './tax.js';
import type {
  KnowledgeSearchResults,
  KnowledgeEntry,
  RefreshResult,
  LawChangesResult,
} from './knowledge.js';

// =============================================================================
// Tool Inputs
// =============================================================================

export interface GetTaxObligationsInput {
  year?: number;
}

export interface GetUpcomingDuesInput {
  daysAhead?: number;
  includeAutoPay?: boolean;
  category?: 'tax' | 'bills' | 'all';
}

export interface CalculateTaxEstimateInput {
  year?: number;
  incomeOverride?: {
    employment?: number;
    freelance?: number;
    other?: number;
  };
  showBreakdown?: boolean;
}

export interface SearchDutchTaxLawInput {
  query: string;
  sources?: Array<'belastingdienst' | 'wetten' | 'rijksoverheid'>;
  maxResults?: number;
  forceRefresh?: boolean;
  cacheResult?: boolean;
}

export interface SearchKnowledgeBaseInput {
  query: string;
  category?: string;
  taxYear?: number;
  maxResults?: number;
  includeExpired?: boolean;
}

export interface GetKnowledgeEntryInput {
  id: string;
}

export interface GetSpendingAdviceInput {
  focus?: 'tax_optimization' | 'savings' | 'deductions' | 'general';
}

export interface SendReminderInput {
  message: string;
  dueId?: string;
  priority?: 'low' | 'normal' | 'high';
  schedule?: string; // ISO datetime
}

export interface RefreshKnowledgeInput {
  category?: string;
  entryId?: string;
  expiredOnly?: boolean;
  taxYear?: number;
}

export interface GetLawChangesInput {
  category?: string;
  taxYear?: number;
  sinceDate?: string; // ISO date
  significance?: 'all' | 'high' | 'medium';
}

// =============================================================================
// Tool Outputs
// =============================================================================

export interface GetTaxObligationsOutput extends TaxObligationsSummary {}

export interface GetUpcomingDuesOutput extends UpcomingDues {}

export interface CalculateTaxEstimateOutput extends TaxCalculationResult {}

export interface SearchDutchTaxLawOutput {
  results: SearchResult[];
  answerSummary?: string;
  fromCache: boolean;
  cacheId?: string;
  cacheAgeDays?: number;
  disclaimer: string;
}

export interface SearchResult {
  title: string;
  source: string;
  url: string;
  snippet: string;
  relevance: number;
  lastUpdated?: string;
}

export interface SearchKnowledgeBaseOutput extends KnowledgeSearchResults {}

export interface GetKnowledgeEntryOutput extends KnowledgeEntry {
  relatedEntries: Array<{
    id: string;
    title: string;
    category: string;
  }>;
}

export interface GetSpendingAdviceOutput {
  advice: AdviceItem[];
  profileWarnings: string[];
  missingInformation: string[];
  basedOnKnowledge?: Array<{
    id: string;
    title: string;
  }>;
  recentChanges?: Array<{
    topic: string;
    significance: string;
  }>;
}

export interface AdviceItem {
  category: string;
  suggestion: string;
  potentialSavings: number | 'varies';
  effort: 'low' | 'medium' | 'high';
  deadline?: string;
  links?: string[];
}

export interface SendReminderOutput {
  success: boolean;
  messageId?: string;
  scheduledFor?: string;
  error?: string;
}

export interface RefreshKnowledgeOutput extends RefreshResult {}

export interface GetLawChangesOutput extends LawChangesResult {}

// =============================================================================
// Tool Metadata
// =============================================================================

export interface ToolMetadata {
  name: string;
  description: string;
  inputSchema: Record<string, any>;
  category: 'tax' | 'knowledge' | 'reminders' | 'advice';
  requiresPersonalData: boolean;
  requiresInternetConnection: boolean;
}

export const TOOL_METADATA: Record<string, ToolMetadata> = {
  get_tax_obligations: {
    name: 'get_tax_obligations',
    description: 'Get all taxes you are liable for based on your profile',
    inputSchema: {},
    category: 'tax',
    requiresPersonalData: true,
    requiresInternetConnection: false,
  },
  get_upcoming_dues: {
    name: 'get_upcoming_dues',
    description: 'List all upcoming financial obligations',
    inputSchema: {},
    category: 'tax',
    requiresPersonalData: true,
    requiresInternetConnection: false,
  },
  calculate_tax_estimate: {
    name: 'calculate_tax_estimate',
    description: 'Calculate estimated tax liability',
    inputSchema: {},
    category: 'tax',
    requiresPersonalData: true,
    requiresInternetConnection: false,
  },
  search_dutch_tax_law: {
    name: 'search_dutch_tax_law',
    description: 'Search Dutch tax regulations (cache-first)',
    inputSchema: {},
    category: 'knowledge',
    requiresPersonalData: false,
    requiresInternetConnection: true,
  },
  search_knowledge_base: {
    name: 'search_knowledge_base',
    description: 'Search local knowledge cache',
    inputSchema: {},
    category: 'knowledge',
    requiresPersonalData: false,
    requiresInternetConnection: false,
  },
  get_knowledge_entry: {
    name: 'get_knowledge_entry',
    description: 'Get full knowledge entry by ID',
    inputSchema: {},
    category: 'knowledge',
    requiresPersonalData: false,
    requiresInternetConnection: false,
  },
  get_spending_advice: {
    name: 'get_spending_advice',
    description: 'Get financial optimization suggestions',
    inputSchema: {},
    category: 'advice',
    requiresPersonalData: true,
    requiresInternetConnection: false,
  },
  send_reminder: {
    name: 'send_reminder',
    description: 'Send a Telegram notification',
    inputSchema: {},
    category: 'reminders',
    requiresPersonalData: false,
    requiresInternetConnection: true,
  },
  refresh_knowledge: {
    name: 'refresh_knowledge',
    description: 'Manually refresh knowledge cache entries',
    inputSchema: {},
    category: 'knowledge',
    requiresPersonalData: false,
    requiresInternetConnection: true,
  },
  get_law_changes: {
    name: 'get_law_changes',
    description: 'Detect changes in Dutch tax law',
    inputSchema: {},
    category: 'knowledge',
    requiresPersonalData: false,
    requiresInternetConnection: false,
  },
};
