# Tax Advisor MCP Server - Implementation Plan

## Project Overview

Building a Model Context Protocol (MCP) server that acts as a personal tax and financial advisor for Dutch residents, with proactive Telegram notifications and a **growing knowledge cache system** that learns and tracks Dutch tax law changes over time.

---

## Phase 1: Project Foundation & Setup

**Branch**: `claude/tax-adviser-project-setup-01Au57JGb14KEqMYa49hDALt`

### Tasks:
- [ ] Initialize Node.js project with package.json
- [ ] Set up TypeScript configuration (tsconfig.json)
- [ ] Configure ESLint (eslint.config.js)
- [ ] Configure Prettier (prettier.config.js)
- [ ] Configure Vitest (vitest.config.ts)
- [ ] Create complete directory structure (including `knowledge/` for cache)
- [ ] Set up .gitignore (exclude personal.md, config.yaml, .env, but track knowledge/)
- [ ] Create .env.example with template environment variables
- [ ] Install core dependencies:
  - @modelcontextprotocol/sdk
  - typescript
  - zod (for schema validation)
  - yaml
  - axios
  - node-cron
  - marked
  - gray-matter
- [ ] Install dev dependencies:
  - vitest
  - eslint
  - prettier
  - tsx (for development)
  - @types/node

**Deliverables**:
- Working TypeScript project with all tooling configured
- Complete directory structure matching specification
- All dependencies installed and configured

**Commit Message**: `feat: initial project setup with TypeScript, linting, and testing infrastructure`

---

## Phase 2: Configuration & Data Layer

**Branch**: `claude/phase2-config-data-layer-[session-id]`

### Tasks:
- [ ] Create Zod schemas for config validation (src/config/schema.ts)
  - Include knowledge cache settings schema
- [ ] Implement config.yaml loader with validation (src/config/loader.ts)
- [ ] Create config.example.yaml with all settings documented
  - Server configuration
  - Knowledge cache settings (enabled, auto_cache, expiry, categories, etc.)
  - Telegram integration
  - Reminder settings
  - Tax calculation settings
  - Web search settings
- [ ] Create personal.example.md template (data/personal.example.md)
- [ ] Create dutch-tax-rules.json with 2024 tax data (data/dutch-tax-rules.json)
  - Income tax brackets for Box 1
  - Box 3 exemptions and deemed return rates
  - BTW rates and thresholds
  - Self-employment deductions
  - Tax deadlines and important dates
  - Deduction limits
- [ ] Implement personal.md parser (src/context/personal-loader.ts)
  - Parse YAML frontmatter
  - Extract income sources
  - Extract assets and debts
  - Parse recurring payments tables
- [ ] Create TypeScript types for all data structures:
  - src/types/personal.ts
  - src/types/tax.ts
  - src/types/knowledge.ts (KnowledgeEntry, KnowledgeIndex, etc.)
  - src/types/tools.ts
  - src/types/index.ts
- [ ] Create initial knowledge cache structure:
  - knowledge/.index.json (empty index)
  - knowledge/README.md explaining the cache system
  - Example cached entry template
- [ ] Write unit tests for config loader and personal profile parser

**Deliverables**:
- Validated configuration system with knowledge cache support
- Personal profile template and parser
- Complete Dutch tax knowledge base for 2024
- Type-safe data structures including knowledge types
- Knowledge cache directory initialized

**Commit Message**: `feat: implement configuration system, personal profile parser, and knowledge cache foundation`

---

## Phase 3: Core Services & Knowledge Cache

**Branch**: `claude/phase3-core-services-[session-id]`

### Tasks:
- [ ] Implement Telegram Bot API wrapper (src/services/telegram.ts)
  - sendMessage method
  - Message formatting for tax/financial info
  - Priority-based notifications
  - Error handling and retry logic
  - Mock mode for testing (when bot token not provided)
- [ ] Implement web search service (src/services/web-search.ts)
  - Search belastingdienst.nl
  - Search wetten.nl
  - Search rijksoverheid.nl
  - Parse and extract relevant snippets
  - Return structured results
  - Handle rate limiting
- [ ] **Implement knowledge cache service** (src/services/knowledge-cache.ts)
  - **Core cache operations**:
    - Load and parse .index.json
    - Save knowledge entries as markdown with frontmatter
    - Update index when entries added/modified
    - Generate unique entry IDs from queries
  - **Search functionality**:
    - Full-text search across cached entries
    - Filter by category, tax year, tags
    - Sort by relevance score
  - **Cache management**:
    - Check if recent knowledge exists on a topic
    - Mark entries as expired
    - Track entry access frequency
    - Detect changes between old and new entries
  - **Maintenance operations**:
    - Prune old/unused entries
    - Export knowledge base
    - Generate statistics
- [ ] Implement knowledge loader (src/context/knowledge-loader.ts)
  - Load cached knowledge on startup
  - Parse markdown entries with frontmatter
  - Build searchable index
- [ ] Create embedded Dutch tax knowledge module (src/context/dutch-tax-knowledge.ts)
  - Load and expose tax rules JSON
  - Helper functions for tax calculations
  - Date utilities for tax year handling
- [ ] Write unit tests for all services
  - Mock Telegram API calls
  - Mock web search requests
  - Test knowledge cache CRUD operations
  - Test search and filtering
  - Test error handling

**Deliverables**:
- Working Telegram notification service
- Web search integration for Dutch tax resources
- **Fully functional knowledge cache system**
- Reusable tax knowledge utilities
- Knowledge loader for cached data

**Commit Message**: `feat: implement core services including Telegram, web search, and knowledge cache system`

---

## Phase 4: MCP Resources

**Branch**: `claude/phase4-mcp-resources-[session-id]`

### Tasks:
- [ ] Create resource registry (src/resources/index.ts)
- [ ] Implement personal://profile resource (src/resources/personal-profile.ts)
  - Expose parsed personal.md as JSON
  - Handle missing or invalid profile gracefully
- [ ] Implement tax://calendar/{year} resource (src/resources/tax-calendar.ts)
  - Generate calendar from dutch-tax-rules.json
  - Include all key deadlines
  - Support multiple years
- [ ] Implement tax://rates/{year} resource (included in tax-calendar.ts)
  - Expose tax brackets
  - Expose Box 3 rates
  - Expose BTW rates
  - Expose deduction limits
- [ ] **Implement knowledge://base resource** (src/resources/knowledge-base.ts)
  - Expose knowledge cache index
  - List all categories
  - Show cache statistics
  - Provide summary of available knowledge
- [ ] Write tests for resource handlers
- [ ] Document resource URIs and schemas

**Deliverables**:
- Four working MCP resources exposing user profile, Dutch tax data, and knowledge cache
- Resource discovery and listing functionality

**Commit Message**: `feat: implement MCP resources for personal profile, Dutch tax data, and knowledge cache`

---

## Phase 5: MCP Tools - Part 1 (Basic Tools)

**Branch**: `claude/phase5-basic-tools-[session-id]`

### Tasks:
- [ ] Create tool registry and handler framework (src/tools/index.ts)
- [ ] Implement get_tax_obligations tool (src/tools/get-tax-obligations.ts)
  - Analyze personal profile
  - Determine applicable taxes (income tax, BTW, etc.)
  - Calculate due dates
  - Estimate amounts
  - Return structured obligations list
- [ ] Implement get_upcoming_dues tool (src/tools/get-upcoming-dues.ts)
  - Parse recurring payments from personal.md
  - Calculate upcoming due dates
  - Filter by category and auto-pay status
  - Support configurable lookahead period
  - Return sorted list with totals
- [ ] Implement send_reminder tool (src/tools/send-reminder.ts)
  - Send immediate Telegram notification
  - Support scheduled reminders
  - Link to specific due items
  - Handle priority levels
- [ ] Write comprehensive tests for each tool
  - Test with various profile scenarios
  - Test edge cases (missing data, invalid dates)
  - Mock Telegram API

**Deliverables**:
- Three working MCP tools for basic tax tracking and reminders
- Tool input/output validation with Zod
- Comprehensive test coverage

**Commit Message**: `feat: implement basic MCP tools for tax obligations and reminders`

---

## Phase 6: MCP Tools - Part 2 (Advanced Tools & Knowledge Integration)

**Branch**: `claude/phase6-advanced-tools-[session-id]`

### Tasks:
- [ ] Implement calculate_tax_estimate tool (src/tools/calculate-tax.ts)
  - **Box 1 calculations**:
    - Sum employment and freelance income
    - Apply self-employment deductions (zelfstandigenaftrek, MKB-winstvrijstelling)
    - Calculate tax using progressive brackets
    - Apply algemene heffingskorting (general tax credit)
    - Apply arbeidskorting (labor credit with phase-out)
  - **Box 2 calculations** (if applicable):
    - Substantial interest income
  - **Box 3 calculations**:
    - Sum assets minus debts
    - Apply exemption
    - Calculate deemed return based on brackets
    - Apply flat tax rate
  - **BTW calculations** (for self-employed):
    - Estimate quarterly BTW obligations
  - Support income override for "what-if" scenarios
  - Provide detailed breakdown option
  - Format human-readable calculation steps
- [ ] **Implement search_dutch_tax_law tool** (src/tools/search-tax-law.ts) **with knowledge cache integration**
  - **Cache-first search flow**:
    1. Search local knowledge cache first
    2. If found and fresh, return cached result
    3. If not found or expired, perform web search
    4. Save web search results to cache
    5. Return results with cache metadata
  - Support force_refresh parameter to skip cache
  - Query multiple authoritative sources
  - Rank and filter results
  - Generate AI summary of findings
  - Include disclaimer about seeking professional advice
  - Track cache hit/miss statistics
- [ ] **Implement search_knowledge_base tool** (src/tools/search-knowledge.ts)
  - Search local knowledge cache directly (no web search)
  - Filter by category, tax year, tags
  - Support include_expired parameter
  - Return results with relevance scores
- [ ] **Implement get_knowledge_entry tool** (src/tools/get-knowledge-entry.ts)
  - Retrieve full content of specific knowledge entry by ID
  - Include all metadata and sources
  - Show related entries
- [ ] **Implement refresh_knowledge tool** (src/tools/refresh-knowledge.ts)
  - Manually refresh knowledge cache entries
  - Support filtering by category, entry ID, tax year
  - Detect changes between old and new data
  - Report refresh statistics
- [ ] **Implement get_law_changes tool** (src/tools/get-law-changes.ts)
  - Detect changes in Dutch tax law
  - Compare historical knowledge entries
  - Filter by category, tax year, significance
  - Check if changes affect user's profile
  - Provide action items for significant changes
- [ ] Implement get_spending_advice tool (src/tools/get-spending-advice.ts)
  - Analyze personal profile for optimization opportunities
  - **Load relevant cached knowledge** for context
  - Identify missed deductions
  - Suggest tax-saving strategies
  - Detect profile warnings (unusual patterns, missing info)
  - **Detect and notify about relevant law changes**
  - Provide actionable recommendations with effort estimates
  - Cite knowledge cache sources
- [ ] Write comprehensive tests for advanced tools
  - Test tax calculations against known examples
  - Validate against official Belastingdienst examples
  - Test edge cases (very high/low income, multiple income sources)
  - Mock web search responses
  - Test knowledge cache integration
  - Test cache hit/miss scenarios
  - Test change detection

**Deliverables**:
- Six advanced MCP tools for tax calculation, law search, and financial advice
- **Five knowledge-aware tools** (search, get entry, refresh, detect changes, spending advice)
- Accurate Dutch tax calculation engine for 2024
- **Cache-first search with automatic knowledge building**
- Comprehensive test coverage with validation against real scenarios

**Commit Message**: `feat: implement advanced MCP tools with knowledge cache integration and change detection`

---

## Phase 7: MCP Server & Integration

**Branch**: `claude/phase7-mcp-server-[session-id]`

### Tasks:
- [ ] Implement MCP server entry point (src/index.ts)
  - Initialize MCP server with SDK
  - Register all tools (including knowledge tools)
  - Register all resources (including knowledge resource)
  - Handle server lifecycle (start/stop)
  - Implement proper error handling
  - Add logging
- [ ] Integrate all components:
  - Load configuration on startup
  - Initialize services (Telegram, web search, **knowledge cache**)
  - Load personal profile
  - Load tax knowledge base
  - **Load knowledge cache index**
  - Wire up all tools and resources
- [ ] Add server metadata and capabilities
- [ ] Implement graceful shutdown
  - Save knowledge cache state
  - Flush pending cache writes
- [ ] Add comprehensive error handling and logging
- [ ] Test full MCP server workflow:
  - Server initialization
  - Tool discovery (verify all 11 tools registered)
  - Resource discovery (verify all 4 resources registered)
  - Tool execution
  - **Knowledge cache operations**
  - Error scenarios

**Deliverables**:
- Fully functional MCP server
- All tools and resources integrated
- Knowledge cache integrated into server lifecycle
- Proper error handling and logging
- Ready for Claude Desktop integration

**Commit Message**: `feat: implement MCP server with full tool, resource, and knowledge cache integration`

---

## Phase 8: Reminder Daemon

**Branch**: `claude/phase8-reminder-daemon-[session-id]`

### Tasks:
- [ ] Implement background daemon service (src/daemon.ts)
  - Load configuration
  - Initialize Telegram service
  - Initialize knowledge cache service
  - Set up cron schedules (reminders + knowledge refresh)
  - Implement reminder check logic
  - Track sent reminders (to avoid duplicates)
- [ ] Create reminder logic:
  - Query upcoming dues
  - Filter items needing reminders
  - Calculate reminder timing based on config (7, 3, 1 days before)
  - Format notification messages
  - Send Telegram notifications
  - Mark reminders as sent
- [ ] **Add knowledge cache maintenance**:
  - Schedule periodic refresh checks (weekly by default)
  - Identify expired entries
  - Refresh critical entries automatically
  - Detect and notify about tax law changes
  - Prune old/unused entries based on config
- [ ] Add persistence for reminder state:
  - Track which reminders have been sent
  - Use simple JSON file or in-memory with daily reset
- [ ] Implement daemon lifecycle management:
  - Start/stop functionality
  - Graceful shutdown
  - Error recovery
- [ ] Test daemon:
  - Mock cron triggers
  - Test reminder scheduling logic
  - Test notification sending
  - Test duplicate prevention
  - **Test knowledge refresh automation**

**Deliverables**:
- Working background reminder daemon
- Automated Telegram notifications for upcoming obligations
- **Automated knowledge cache maintenance and refresh**
- Configurable reminder schedules

**Commit Message**: `feat: implement background reminder daemon with knowledge cache automation`

---

## Phase 9: Scripts & Utilities

**Branch**: `claude/phase9-scripts-utilities-[session-id]`

### Tasks:
- [ ] Create interactive setup wizard (scripts/setup.ts)
  - Guide user through initial configuration
  - Collect Telegram bot token and chat ID
  - Create personal.md from template
  - Create config.yaml from example
  - Initialize knowledge cache directory
  - Validate configuration
  - Test Telegram connection
- [ ] Create config validation script (scripts/validate-config.ts)
  - Validate config.yaml against schema
  - Validate personal.md format
  - Check knowledge cache structure
  - Check for common issues
  - Provide helpful error messages
- [ ] **Create knowledge maintenance scripts**:
  - **scripts/knowledge-refresh.ts** - Manually refresh knowledge cache
  - **scripts/knowledge-stats.ts** - Display cache statistics and health
  - **scripts/knowledge-export.ts** - Export knowledge base for backup
  - **scripts/knowledge-prune.ts** - Clean up old/unused entries
  - **scripts/knowledge-changes.ts** - Detect changes in specific category/year
- [ ] Add helpful npm scripts to package.json:
  - `build`: Compile TypeScript
  - `start`: Run MCP server
  - `start:daemon`: Run reminder daemon
  - `dev`: Development mode with watch
  - `dev:daemon`: Daemon development mode
  - `test`: Run tests
  - `test:coverage`: Run tests with coverage
  - `lint`: Run ESLint
  - `format`: Run Prettier
  - `setup`: Run setup wizard
  - `validate`: Validate configuration
  - `inspector`: Run MCP inspector for debugging
  - **`knowledge:refresh`**: Refresh expired knowledge
  - **`knowledge:stats`**: Show knowledge cache stats
  - **`knowledge:export`**: Backup knowledge base
  - **`knowledge:prune`**: Clean up old entries
  - **`knowledge:changes`**: Detect law changes
- [ ] Create helper scripts for common tasks:
  - Generate Telegram bot token instructions
  - Find Telegram chat ID
- [ ] Test all scripts

**Deliverables**:
- User-friendly setup wizard
- Configuration validation tools
- **Knowledge cache maintenance toolkit**
- Complete set of npm scripts for development and deployment
- Helper scripts for common tasks

**Commit Message**: `feat: add setup wizard, validation scripts, and knowledge maintenance tools`

---

## Phase 10: Testing & Documentation

**Branch**: `claude/phase10-testing-docs-[session-id]`

### Tasks:
- [ ] Complete test coverage:
  - Ensure all tools have unit tests (11 tools total)
  - Add integration tests for full workflows
  - Add snapshot tests for output formats
  - Test with various personal.md scenarios
  - Validate tax calculations against official examples
  - **Test knowledge cache operations thoroughly**
  - **Test cache-first search flow**
  - **Test change detection logic**
  - Achieve >80% code coverage
- [ ] Create comprehensive README.md:
  - Project overview and features (highlight knowledge cache!)
  - Installation instructions
  - Configuration guide
  - **Knowledge cache explanation and benefits**
  - Usage examples
  - Claude Desktop integration instructions
  - VPS deployment guide
  - Troubleshooting section
  - FAQ
  - Links to resources
- [ ] Create additional documentation:
  - CONTRIBUTING.md
  - CHANGELOG.md
  - LICENSE
  - Security considerations and privacy notes
  - **KNOWLEDGE_CACHE.md** - Deep dive into cache system
- [ ] Add inline code documentation:
  - JSDoc comments for public APIs
  - Complex algorithm explanations
  - Configuration option descriptions
  - Knowledge cache service documentation
- [ ] Create usage examples:
  - Example conversations with Claude
  - Sample queries and responses
  - Common use cases
  - **Knowledge cache workflow examples**
  - **Law change detection examples**
- [ ] Create example knowledge entries:
  - 3-5 sample cached entries in knowledge/
  - Demonstrate different categories
  - Show proper markdown formatting
- [ ] Final testing:
  - Test complete setup from scratch
  - Test Claude Desktop integration
  - Test daemon deployment
  - **Test knowledge cache from empty to populated**
  - Verify all examples in README work

**Deliverables**:
- Comprehensive test suite with high coverage
- Complete README with setup and usage instructions
- All documentation files
- **Knowledge cache documentation and examples**
- Verified working examples

**Commit Message**: `docs: add comprehensive documentation, tests, and knowledge cache examples`

---

## Summary

### Total Phases: 10

### Tool Count: **11 MCP Tools**
1. get_tax_obligations
2. get_upcoming_dues
3. send_reminder
4. calculate_tax_estimate
5. search_dutch_tax_law (cache-integrated)
6. **search_knowledge_base** ⭐ NEW
7. **get_knowledge_entry** ⭐ NEW
8. **refresh_knowledge** ⭐ NEW
9. **get_law_changes** ⭐ NEW
10. get_spending_advice (knowledge-aware)

### Resource Count: **4 MCP Resources**
1. personal://profile
2. tax://calendar/{year}
3. tax://rates/{year}
4. **knowledge://base** ⭐ NEW

### Estimated Complexity:
- **Phase 1**: Low (setup)
- **Phase 2**: Medium (data layer + knowledge foundation)
- **Phase 3**: **High** (services + knowledge cache implementation)
- **Phase 4**: Low (resources)
- **Phase 5**: Medium (basic tools)
- **Phase 6**: **Very High** (tax calculations + knowledge integration)
- **Phase 7**: Medium (integration)
- **Phase 8**: Medium (daemon + knowledge automation)
- **Phase 9**: Medium (scripts + knowledge tools)
- **Phase 10**: Medium (testing/docs)

### Key Milestones:
1. ✅ After Phase 1: Project buildable and linted
2. ✅ After Phase 3: All services testable independently + **Knowledge cache operational**
3. ✅ After Phase 5: Basic MCP functionality working
4. ✅ After Phase 6: Complete tax advisor capabilities + **Knowledge-aware tools**
5. ✅ After Phase 7: Usable with Claude Desktop + **Knowledge cache integrated**
6. ✅ After Phase 8: Autonomous reminder system + **Self-updating knowledge base**
7. ✅ After Phase 10: Production-ready release with **growing knowledge system**

### Branching Strategy:
- Phase 1: Use existing branch `claude/tax-adviser-project-setup-01Au57JGb14KEqMYa49hDALt`
- Phase 2-10: Create new branches with session ID suffix
- After each phase: Commit and push to branch
- User reviews before proceeding to next phase

---

## Key Features of Knowledge Cache System

### 🧠 What It Does:
1. **Learns Over Time**: Automatically caches web search results as structured markdown entries
2. **Cache-First Search**: Checks local knowledge before expensive web searches
3. **Tracks Changes**: Detects when Dutch tax laws change by comparing old vs new entries
4. **Proactive Notifications**: Alerts user when relevant tax law changes are detected
5. **Contextual Advice**: Uses cached knowledge to provide richer, more informed recommendations
6. **Self-Maintaining**: Daemon automatically refreshes expired entries and prunes old data

### 📁 Knowledge Structure:
```
knowledge/
├── .index.json                 # Searchable index of all entries
├── income-tax/                 # Categorized by topic
│   ├── box1-brackets-2024.md
│   └── arbeidskorting-changes.md
├── box3/
│   ├── deemed-return-rates-2024.md
│   └── box3-reform-proposals.md
├── btw/
│   └── filing-deadlines.md
├── self-employment/
│   └── zelfstandigenaftrek-2024.md
└── deductions/
    └── charitable-gifts.md
```

### 🔄 Search Flow:
```
User Question → Check Local Cache → Found & Fresh? → Return Cached Result
                                   ↓
                            Not Found/Expired
                                   ↓
                            Web Search → Summarize → Save to Cache → Return Result
```

---

## Notes

- Each phase is designed to be independently testable
- Phases build upon previous work incrementally
- Configuration and example files included from start
- Privacy and security considered throughout
- Real Dutch tax data for 2024 included
- **Knowledge cache grows smarter over time**
- Comprehensive error handling at each layer
- Testing integrated throughout, not just at end
- **Knowledge cache is version-controlled** (gitignored in original plan, but should be tracked for shared learning)

---

## Ready to Start?

Please review this **updated implementation plan** with the knowledge cache system and let me know:

1. **Does the phased approach with knowledge cache integration make sense?**
2. **Should the knowledge cache be gitignored (private) or tracked (shared)?**
3. **Any adjustments needed to the scope or order?**
4. **Should we proceed with Phase 1: Project Foundation & Setup?**

Once approved, we'll start with **Phase 1** on the current branch: `claude/tax-adviser-project-setup-01Au57JGb14KEqMYa49hDALt`

### Key Decision Points:
- **Knowledge Cache Storage**: Track in git for shared learning, or gitignore for privacy?
- **Initial Knowledge Entries**: Should we seed the cache with 5-10 example entries in Phase 2?
- **Cache Refresh Strategy**: Weekly automatic refresh or on-demand only?
- **Change Notifications**: Telegram alerts for all law changes or only those affecting user's profile?
