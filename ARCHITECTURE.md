# Architecture Documentation

This document describes the architecture, design decisions, and technical implementation of the Tax Adviser MCP Server.

## Table of Contents

- [Overview](#overview)
- [System Architecture](#system-architecture)
- [Core Components](#core-components)
- [Data Flow](#data-flow)
- [Design Patterns](#design-patterns)
- [Technology Stack](#technology-stack)
- [Performance Considerations](#performance-considerations)
- [Security](#security)
- [Future Enhancements](#future-enhancements)

## Overview

The Tax Adviser MCP Server is a **Model Context Protocol (MCP)** server that provides comprehensive Dutch tax assistance through Claude Desktop. It follows a layered architecture with clear separation of concerns.

### Design Goals

1. **Modularity**: Each component is independent and replaceable
2. **Extensibility**: Easy to add new tools, resources, and country support
3. **Testability**: Components are mockable and unit-testable
4. **Performance**: Cache-first strategy for fast responses
5. **Reliability**: Comprehensive error handling and validation

## System Architecture

```
┌─────────────────────────────────────────────────────────────┐
│                      Claude Desktop                         │
└────────────────────┬────────────────────────────────────────┘
                     │ MCP Protocol (stdio)
                     │
┌────────────────────▼────────────────────────────────────────┐
│                    MCP Server (src/index.ts)                │
│  ┌───────────────┬──────────────────┬───────────────────┐  │
│  │  Tool Registry│ Resource Registry│ Prompt Registry   │  │
│  └───────┬───────┴────────┬─────────┴─────────┬─────────┘  │
│          │                 │                    │            │
│  ┌───────▼──────┐ ┌───────▼────────┐ ┌────────▼──────────┐ │
│  │   10 Tools   │ │  11 Resources  │ │   3 Prompts       │ │
│  └───────┬──────┘ └───────┬────────┘ └───────────────────┘ │
│          │                 │                                 │
│  ┌───────▼─────────────────▼───────────────────┐           │
│  │         Dependency Container                 │           │
│  │  ┌─────────────┐  ┌──────────────────────┐  │           │
│  │  │ Tax         │  │ Personal             │  │           │
│  │  │ Knowledge   │  │ Profile Loader       │  │           │
│  │  └─────────────┘  └──────────────────────┘  │           │
│  │  ┌─────────────┐  ┌──────────────────────┐  │           │
│  │  │ Knowledge   │  │ Telegram             │  │           │
│  │  │ Cache       │  │ Service              │  │           │
│  │  └─────────────┘  └──────────────────────┘  │           │
│  │  ┌─────────────┐  ┌──────────────────────┐  │           │
│  │  │ Web Search  │  │ Knowledge            │  │           │
│  │  │ Service     │  │ Loader               │  │           │
│  │  └─────────────┘  └──────────────────────┘  │           │
│  └──────────────────────────────────────────────┘           │
└─────────────────────────────────────────────────────────────┘

┌─────────────────────────────────────────────────────────────┐
│               Background Daemon (src/daemon.ts)             │
│  ┌──────────────────────────────────────────────────────┐  │
│  │                  Cron Scheduler                       │  │
│  │  ┌────────────┐ ┌────────────┐ ┌──────────────────┐  │  │
│  │  │ Deadline   │ │ Payment    │ │ Knowledge        │  │  │
│  │  │ Reminders  │ │ Reminders  │ │ Refresh          │  │  │
│  │  │ (Daily 9AM)│ │ (Daily 10) │ │ (Sunday 3AM)     │  │  │
│  │  └────────────┘ └────────────┘ └──────────────────┘  │  │
│  │  ┌────────────────────────────────────────────────┐  │  │
│  │  │ Tax Law Change Monitoring (Monday 8AM)         │  │  │
│  │  └────────────────────────────────────────────────┘  │  │
│  └──────────────────────────────────────────────────────┘  │
└─────────────────────────────────────────────────────────────┘

┌─────────────────────────────────────────────────────────────┐
│                     Data Layer                              │
│  ┌──────────────┐ ┌──────────────┐ ┌──────────────────────┐│
│  │ Config       │ │ Personal     │ │ Tax Rules            ││
│  │ (YAML)       │ │ Profile (MD) │ │ (JSON)               ││
│  └──────────────┘ └──────────────┘ └──────────────────────┘│
│  ┌────────────────────────────────────────────────────────┐ │
│  │          Knowledge Cache (Markdown + JSON)             │ │
│  └────────────────────────────────────────────────────────┘ │
└─────────────────────────────────────────────────────────────┘

┌─────────────────────────────────────────────────────────────┐
│                  External Services                          │
│  ┌──────────────┐ ┌──────────────────────────────────────┐ │
│  │ Telegram API │ │ Web Search (DuckDuckGo/Brave)        │ │
│  └──────────────┘ └──────────────────────────────────────┘ │
└─────────────────────────────────────────────────────────────┘
```

## Core Components

### 1. MCP Server (`src/index.ts`)

**Responsibility**: Main entry point, handles MCP protocol communication

**Key Features**:
- Stdio transport for Claude Desktop integration
- Request routing to tools/resources/prompts
- Dependency injection setup
- Error handling and logging

**Communication**:
```typescript
Claude Desktop → stdio → MCP Server → Tool/Resource → Response → Claude Desktop
```

### 2. Tool Registry (`src/tools/index.ts`)

**Responsibility**: Manages all MCP tools

**Pattern**: Registry pattern with dependency injection

**Structure**:
```typescript
class ToolRegistry {
  private tools: Map<string, ToolHandler>;

  register(tool: ToolHandler): void;
  listTools(): Tool[];
  executeTool(name: string, input: any): Promise<any>;
}
```

**Tools** (10 total):
- Tax calculations
- Knowledge searches
- Reminders
- Financial advice

### 3. Resource Registry (`src/resources/index.ts`)

**Responsibility**: Exposes data through URI-based resources

**Pattern**: Resource-oriented architecture

**URI Scheme**:
- `personal://profile` - User's tax profile
- `tax://calendar/2024` - Tax calendar
- `knowledge://stats` - Cache statistics

### 4. Knowledge Cache Service (`src/services/knowledge-cache.ts`)

**Responsibility**: Manages cached tax knowledge

**Architecture**:
```
┌──────────────────────────────────────────┐
│        Knowledge Cache Service           │
├──────────────────────────────────────────┤
│                                          │
│  ┌────────────────────────────────────┐ │
│  │    Index (.index.json)             │ │
│  │    - Fast metadata lookup          │ │
│  │    - Relevance scoring             │ │
│  └────────────────────────────────────┘ │
│                                          │
│  ┌────────────────────────────────────┐ │
│  │    Entries (*.md files)            │ │
│  │    - Full content                  │ │
│  │    - YAML frontmatter              │ │
│  │    - Markdown body                 │ │
│  └────────────────────────────────────┘ │
│                                          │
│  ┌────────────────────────────────────┐ │
│  │    Operations                      │ │
│  │    - searchLocal()                 │ │
│  │    - cacheEntry()                  │ │
│  │    - getStats()                    │ │
│  │    - updateEntry()                 │ │
│  └────────────────────────────────────┘ │
└──────────────────────────────────────────┘
```

**Search Algorithm**:
1. Parse query into keywords
2. Search index for matching entries
3. Calculate relevance score:
   - Title match: +10 points
   - Summary match: +5 points
   - Tags match: +3 points
   - Category match: +2 points
4. Filter by confidence, year, category
5. Sort by relevance
6. Return top N results

### 5. Dutch Tax Knowledge (`src/context/dutch-tax-knowledge.ts`)

**Responsibility**: Tax calculation engine

**Calculations**:
- **Box 1**: Progressive income tax
- **Box 2**: Substantial interest (flat 26%)
- **Box 3**: Wealth tax with deemed return
- **Credits**: General credit, labor credit
- **Deductions**: Self-employment, mortgage, healthcare

**Formula Examples**:

**Box 1 Progressive Tax**:
```
Tax = 0
For each bracket:
  taxable_in_bracket = min(income, bracket.to) - bracket.from
  Tax += taxable_in_bracket * bracket.rate
```

**Box 3 Deemed Return**:
```
net_assets = assets - debts - exemption
taxable_base = max(0, net_assets)

deemed_return = (
  (taxable_base * savings_percent / 100) * 0.0103 +
  (taxable_base * (100 - savings_percent) / 100) * 0.0604
)

tax = deemed_return * 0.32
```

### 6. Personal Profile Loader (`src/context/personal-loader.ts`)

**Responsibility**: Parse personal.md files

**Format**: Markdown with YAML frontmatter

**Parsing Strategy**:
1. Split frontmatter and body using `gray-matter`
2. Extract structured data from frontmatter
3. Parse markdown tables for recurring payments
4. Extract amounts from markdown lists
5. Normalize data into TypeScript types

### 7. Background Daemon (`src/daemon.ts`)

**Responsibility**: Scheduled background tasks

**Architecture**:
```
Daemon Start
    ↓
Initialize Services
    ↓
Schedule Cron Jobs ← ─ ─ ─ ─ ─ ┐
    │                          │
    ├→ Deadline Check (Daily)  │
    ├→ Payment Check (Daily)   │ Cron Scheduler
    ├→ Knowledge Refresh       │ Manages timing
    └→ Law Change Monitor      │
         ↓                     │
    Execute Job  ─ ─ ─ ─ ─ ─ ─ ┘
         ↓
    Send Telegram Notification
         ↓
    Log Result
```

## Data Flow

### Example: Tax Calculation Request

```
1. User asks Claude: "Calculate my tax estimate"
                ↓
2. Claude calls MCP tool: calculate_tax_estimate
                ↓
3. MCP Server receives request
                ↓
4. Tool Registry routes to CalculateTaxEstimateTool
                ↓
5. Tool loads dependencies:
   - Personal Profile Loader → reads personal.md
   - Dutch Tax Knowledge → loads tax-rules.json
                ↓
6. Tool executes calculation:
   - Calculate Box 1 tax
   - Calculate Box 2 tax
   - Calculate Box 3 tax
   - Calculate BTW
   - Apply credits and deductions
                ↓
7. Tool formats result
                ↓
8. MCP Server returns JSON to Claude
                ↓
9. Claude presents formatted result to user
```

### Example: Cache-First Search

```
1. User asks: "What are Box 3 rates for 2024?"
                ↓
2. Tool: search_dutch_tax_law
                ↓
3. Knowledge Cache Service:
   - searchLocal(query: "box 3 rates 2024")
   - Calculate relevance scores
   - Filter valid, non-expired entries
                ↓
4. Cache Hit? ─── YES ──→ Return cached results
       │                      ↓
       NO                   Done
       │
       ↓
5. Web Search Service:
   - Build optimized query
   - Search belastingdienst.nl
   - Parse results
       ↓
6. Knowledge Cache Service:
   - cacheEntry() for each result
   - Update index
   - Set expiry date
       ↓
7. Return fresh results
```

## Design Patterns

### 1. Dependency Injection

All tools receive dependencies through constructor:

```typescript
class MyTool implements ToolHandler {
  constructor(
    private config: Config,
    private deps: ToolDependencies
  ) {}
}
```

**Benefits**:
- Easy testing (mock dependencies)
- Loose coupling
- Clear dependencies

### 2. Registry Pattern

Tools, resources, and prompts use registries:

```typescript
class ToolRegistry {
  private tools = new Map<string, ToolHandler>();

  register(tool: ToolHandler): void {
    this.tools.set(tool.name, tool);
  }
}
```

**Benefits**:
- Dynamic tool discovery
- Easy to add new tools
- Centralized management

### 3. Strategy Pattern

Web search supports multiple providers:

```typescript
class WebSearchService {
  private strategy: SearchStrategy;

  constructor(config: WebSearchConfig) {
    this.strategy = config.provider === 'brave'
      ? new BraveSearchStrategy()
      : new DuckDuckGoSearchStrategy();
  }
}
```

### 4. Repository Pattern

Knowledge cache acts as a repository:

```typescript
interface KnowledgeRepository {
  getEntry(id: string): Promise<KnowledgeEntry>;
  searchLocal(query: KnowledgeSearchQuery): Promise<SearchResult[]>;
  cacheEntry(entry: CacheEntryInput): Promise<CacheResult>;
}
```

### 5. Observer Pattern

Daemon uses cron for scheduled observations:

```typescript
cron.schedule('0 9 * * *', async () => {
  await this.checkDeadlines();
});
```

## Technology Stack

### Core Technologies

- **TypeScript 5.x**: Type-safe development
- **Node.js 18+**: Runtime environment
- **Zod**: Schema validation
- **YAML**: Configuration format

### MCP Integration

- **@modelcontextprotocol/sdk**: Official MCP SDK
- **stdio transport**: Communication with Claude Desktop

### Data Processing

- **gray-matter**: Markdown frontmatter parsing
- **node-cron**: Scheduled tasks

### Testing

- **Vitest**: Fast unit test framework
- **Node test mocks**: File system mocking

### External APIs

- **Telegram Bot API**: Notifications
- **DuckDuckGo/Brave**: Web search

## Performance Considerations

### 1. Cache-First Strategy

**Problem**: Slow web searches for repeated queries

**Solution**: Local knowledge cache with index

**Impact**:
- First query: ~2-3 seconds (web search)
- Cached query: ~50ms (local search)

### 2. Index-Based Search

**Problem**: Searching through all markdown files is slow

**Solution**: Maintain `.index.json` with metadata

**Structure**:
```json
{
  "version": "1.0",
  "entries": [
    {
      "id": "entry-id",
      "title": "Title",
      "category": "box3",
      "keywords": ["box3", "wealth", "tax"]
    }
  ]
}
```

**Benefits**:
- O(n) search instead of O(n * file_size)
- ~10x faster for 100+ entries

### 3. Lazy Loading

Tax rules loaded once and cached in memory:

```typescript
class DutchTaxKnowledge {
  private rules: TaxRules | null = null;

  private getRules(): TaxRules {
    if (!this.rules) {
      this.rules = JSON.parse(fs.readFileSync(...));
    }
    return this.rules;
  }
}
```

### 4. Concurrent Operations

Use Promise.all for independent operations:

```typescript
// Good: Parallel (faster)
const [profile, rules, cache] = await Promise.all([
  loadProfile(),
  loadRules(),
  loadCache()
]);

// Avoid: Sequential (slower)
const profile = await loadProfile();
const rules = await loadRules();
const cache = await loadCache();
```

## Security

### 1. Data Privacy

- **Local-first**: All personal data stays on user's machine
- **No cloud sync**: Never transmitted to external servers
- **Git tracking optional**: User controls versioning

### 2. Input Validation

All inputs validated with Zod schemas:

```typescript
const inputSchema = z.object({
  year: z.number().min(2000).max(2100).optional(),
  category: z.enum(['box1', 'box2', 'box3']).optional(),
});
```

### 3. API Key Protection

Configuration stored locally:

```yaml
telegram:
  bot_token: "SENSITIVE"  # Never committed to git
```

### 4. Safe File Operations

- Path validation
- No shell execution
- Sandboxed file access

## Future Enhancements

### Phase 11: Multi-Country Support

**Architecture Changes**:

```
src/
├── context/
│   ├── tax-knowledge/
│   │   ├── factory.ts          # Country factory
│   │   ├── dutch-tax.ts        # Existing
│   │   ├── us-tax.ts           # New
│   │   └── uk-tax.ts           # New
│   └── tax-knowledge-interface.ts  # Common interface
```

**Interface**:
```typescript
interface ITaxKnowledge {
  calculateIncomeTax(income: number): number;
  getDeadlines(): Deadline[];
  // ... common methods
}

class DutchTaxKnowledge implements ITaxKnowledge {}
class USTaxKnowledge implements ITaxKnowledge {}
```

### Scalability

For high-volume scenarios:

1. **Database backend**: Replace file-based cache with SQLite/PostgreSQL
2. **Redis caching**: Add Redis layer for distributed caching
3. **API server**: Convert to REST API for multiple clients
4. **Microservices**: Split into separate services

### AI Integration

Future AI enhancements:

1. **Embeddings**: Use vector embeddings for semantic search
2. **LLM summarization**: Auto-summarize long tax documents
3. **Personalization**: Learn from user interactions

---

**Last Updated**: 2024
**Version**: 1.0.0
