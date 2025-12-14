/**
 * Knowledge cache system types
 */

// =============================================================================
// Knowledge Entry
// =============================================================================

export interface KnowledgeEntry {
  id: string;
  title: string;
  category: string;
  tags: string[];
  sources: KnowledgeSource[];
  content: string;
  summary: string;
  taxYears: number[];
  createdAt: Date;
  updatedAt: Date;
  expiresAt?: Date;
  confidence: 'low' | 'medium' | 'high';
  supersedes?: string; // ID of entry this replaces
  relatedEntries?: string[]; // IDs of related entries
}

export interface KnowledgeSource {
  url: string;
  title: string;
  accessedAt: string; // ISO date
}

// =============================================================================
// Knowledge Index
// =============================================================================

export interface KnowledgeIndex {
  version: string;
  lastUpdated: string; // ISO date
  entries: KnowledgeIndexEntry[];
  categories: string[];
  totalEntries: number;
}

export interface KnowledgeIndexEntry {
  id: string;
  filePath: string; // Relative path from knowledge/
  title: string;
  category: string;
  tags: string[];
  sources: KnowledgeSource[];
  createdAt: string; // ISO date
  updatedAt: string; // ISO date
  expiresAt?: string; // ISO date
  supersedes?: string;
  relevanceScore: number; // 0-100
  taxYears: number[];
  summary: string;
}

// =============================================================================
// Knowledge Search
// =============================================================================

export interface KnowledgeSearchQuery {
  query: string;
  category?: string;
  taxYear?: number;
  tags?: string[];
  maxResults?: number;
  includeExpired?: boolean;
  minRelevance?: number;
}

export interface KnowledgeSearchResult {
  entry: KnowledgeIndexEntry;
  relevance: number; // 0-1
  matchedFields: string[]; // Which fields matched the query
  excerpt?: string; // Relevant excerpt from content
}

export interface KnowledgeSearchResults {
  results: KnowledgeSearchResult[];
  totalMatches: number;
  categoriesSearched: string[];
  query: string;
}

// =============================================================================
// Knowledge Cache Operations
// =============================================================================

export interface CacheOptions {
  category: string;
  tags?: string[];
  taxYears?: number[];
  expiresIn?: number; // Days until expiration
  confidence?: 'low' | 'medium' | 'high';
  supersedes?: string; // ID of entry to replace
}

export interface CacheResult {
  success: boolean;
  entryId?: string;
  error?: string;
}

// =============================================================================
// Knowledge Maintenance
// =============================================================================

export interface RefreshOptions {
  category?: string;
  entryId?: string;
  expiredOnly?: boolean;
  taxYear?: number;
  force?: boolean;
}

export interface RefreshResult {
  refreshed: number;
  failed: number;
  skipped: number;
  details: RefreshDetail[];
}

export interface RefreshDetail {
  id: string;
  status: 'refreshed' | 'failed' | 'skipped' | 'unchanged';
  reason?: string;
  changesDetected?: boolean;
  changes?: DetectedChange[];
}

export interface DetectedChange {
  field: string;
  oldValue: string;
  newValue: string;
  significance: 'low' | 'medium' | 'high';
}

// =============================================================================
// Law Changes Detection
// =============================================================================

export interface LawChange {
  topic: string;
  category: string;
  oldValue: string;
  newValue: string;
  detectedAt: string; // ISO date
  significance: 'low' | 'medium' | 'high';
  affectsProfile: boolean;
  actionItems: string[];
  sourceEntryId: string;
}

export interface LawChangesQuery {
  category?: string;
  taxYear?: number;
  sinceDate?: string; // ISO date
  significance?: 'all' | 'high' | 'medium';
}

export interface LawChangesResult {
  changes: LawChange[];
  summary: string;
  lastCheck: string; // ISO date
}

// =============================================================================
// Knowledge Statistics
// =============================================================================

export interface KnowledgeStats {
  totalEntries: number;
  entriesByCategory: Record<string, number>;
  entriesByConfidence: Record<string, number>;
  expiredEntries: number;
  recentlyUpdated: number; // Last 30 days
  averageAge: number; // Days
  mostAccessed: KnowledgeIndexEntry[];
  oldestEntry?: KnowledgeIndexEntry;
  newestEntry?: KnowledgeIndexEntry;
  storageSize: string; // Human-readable (e.g., "2.5 MB")
}

// =============================================================================
// Knowledge Export
// =============================================================================

export interface ExportOptions {
  format: 'markdown' | 'json' | 'both';
  includeExpired: boolean;
  categories?: string[];
  destination?: string;
}

export interface ExportResult {
  success: boolean;
  filesCreated: string[];
  entriesExported: number;
  error?: string;
}
