# Tax Advisor MCP Server - Implementation Plan

## Project Overview

Building a Model Context Protocol (MCP) server that acts as a personal tax and financial advisor for Dutch residents, with proactive Telegram notifications.

---

## Phase 1: Project Foundation & Setup

**Branch**: `claude/tax-adviser-project-setup-01Au57JGb14KEqMYa49hDALt`

### Tasks:
- [ ] Initialize Node.js project with package.json
- [ ] Set up TypeScript configuration (tsconfig.json)
- [ ] Configure ESLint (eslint.config.js)
- [ ] Configure Prettier (prettier.config.js)
- [ ] Configure Vitest (vitest.config.ts)
- [ ] Create complete directory structure
- [ ] Set up .gitignore (exclude personal.md, config.yaml, .env)
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
- [ ] Implement config.yaml loader with validation (src/config/loader.ts)
- [ ] Create config.example.yaml with all settings documented
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
  - src/types/tools.ts
  - src/types/index.ts
- [ ] Write unit tests for config loader and personal profile parser

**Deliverables**:
- Validated configuration system
- Personal profile template and parser
- Complete Dutch tax knowledge base for 2024
- Type-safe data structures

**Commit Message**: `feat: implement configuration system and personal profile parser with Dutch tax data`

---

## Phase 3: Core Services

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
- [ ] Create embedded Dutch tax knowledge module (src/context/dutch-tax-knowledge.ts)
  - Load and expose tax rules JSON
  - Helper functions for tax calculations
  - Date utilities for tax year handling
- [ ] Write unit tests for all services
  - Mock Telegram API calls
  - Mock web search requests
  - Test error handling

**Deliverables**:
- Working Telegram notification service
- Web search integration for Dutch tax resources
- Reusable tax knowledge utilities

**Commit Message**: `feat: implement Telegram and web search services with Dutch tax knowledge utilities`

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
- [ ] Write tests for resource handlers
- [ ] Document resource URIs and schemas

**Deliverables**:
- Three working MCP resources exposing user profile and Dutch tax data
- Resource discovery and listing functionality

**Commit Message**: `feat: implement MCP resources for personal profile and Dutch tax data`

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

## Phase 6: MCP Tools - Part 2 (Advanced Tools)

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
- [ ] Implement search_dutch_tax_law tool (src/tools/search-tax-law.ts)
  - Use web search service
  - Query multiple authoritative sources
  - Rank and filter results
  - Generate AI summary of findings
  - Include disclaimer about seeking professional advice
- [ ] Implement get_spending_advice tool (src/tools/get-spending-advice.ts)
  - Analyze personal profile for optimization opportunities
  - Identify missed deductions
  - Suggest tax-saving strategies
  - Detect profile warnings (unusual patterns, missing info)
  - Provide actionable recommendations with effort estimates
- [ ] Write comprehensive tests for advanced tools
  - Test tax calculations against known examples
  - Validate against official Belastingdienst examples
  - Test edge cases (very high/low income, multiple income sources)
  - Mock web search responses

**Deliverables**:
- Three advanced MCP tools for tax calculation, law search, and financial advice
- Accurate Dutch tax calculation engine for 2024
- Comprehensive test coverage with validation against real scenarios

**Commit Message**: `feat: implement advanced MCP tools for tax calculation and financial advice`

---

## Phase 7: MCP Server & Integration

**Branch**: `claude/phase7-mcp-server-[session-id]`

### Tasks:
- [ ] Implement MCP server entry point (src/index.ts)
  - Initialize MCP server with SDK
  - Register all tools
  - Register all resources
  - Handle server lifecycle (start/stop)
  - Implement proper error handling
  - Add logging
- [ ] Integrate all components:
  - Load configuration on startup
  - Initialize services (Telegram, web search)
  - Load personal profile
  - Load tax knowledge base
  - Wire up all tools and resources
- [ ] Add server metadata and capabilities
- [ ] Implement graceful shutdown
- [ ] Add comprehensive error handling and logging
- [ ] Test full MCP server workflow:
  - Server initialization
  - Tool discovery
  - Resource discovery
  - Tool execution
  - Error scenarios

**Deliverables**:
- Fully functional MCP server
- All tools and resources integrated
- Proper error handling and logging
- Ready for Claude Desktop integration

**Commit Message**: `feat: implement MCP server with full tool and resource integration`

---

## Phase 8: Reminder Daemon

**Branch**: `claude/phase8-reminder-daemon-[session-id]`

### Tasks:
- [ ] Implement background daemon service (src/daemon.ts)
  - Load configuration
  - Initialize Telegram service
  - Set up cron schedule
  - Implement reminder check logic
  - Track sent reminders (to avoid duplicates)
- [ ] Create reminder logic:
  - Query upcoming dues
  - Filter items needing reminders
  - Calculate reminder timing based on config (7, 3, 1 days before)
  - Format notification messages
  - Send Telegram notifications
  - Mark reminders as sent
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

**Deliverables**:
- Working background reminder daemon
- Automated Telegram notifications for upcoming obligations
- Configurable reminder schedules

**Commit Message**: `feat: implement background reminder daemon with Telegram notifications`

---

## Phase 9: Scripts & Utilities

**Branch**: `claude/phase9-scripts-utilities-[session-id]`

### Tasks:
- [ ] Create interactive setup wizard (scripts/setup.ts)
  - Guide user through initial configuration
  - Collect Telegram bot token and chat ID
  - Create personal.md from template
  - Create config.yaml from example
  - Validate configuration
  - Test Telegram connection
- [ ] Create config validation script (scripts/validate-config.ts)
  - Validate config.yaml against schema
  - Validate personal.md format
  - Check for common issues
  - Provide helpful error messages
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
- [ ] Create helper scripts for common tasks:
  - Generate Telegram bot token instructions
  - Find Telegram chat ID
- [ ] Test all scripts

**Deliverables**:
- User-friendly setup wizard
- Configuration validation tools
- Complete set of npm scripts for development and deployment
- Helper scripts for common tasks

**Commit Message**: `feat: add setup wizard, validation scripts, and npm scripts`

---

## Phase 10: Testing & Documentation

**Branch**: `claude/phase10-testing-docs-[session-id]`

### Tasks:
- [ ] Complete test coverage:
  - Ensure all tools have unit tests
  - Add integration tests for full workflows
  - Add snapshot tests for output formats
  - Test with various personal.md scenarios
  - Validate tax calculations against official examples
  - Achieve >80% code coverage
- [ ] Create comprehensive README.md:
  - Project overview and features
  - Installation instructions
  - Configuration guide
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
- [ ] Add inline code documentation:
  - JSDoc comments for public APIs
  - Complex algorithm explanations
  - Configuration option descriptions
- [ ] Create usage examples:
  - Example conversations with Claude
  - Sample queries and responses
  - Common use cases
- [ ] Final testing:
  - Test complete setup from scratch
  - Test Claude Desktop integration
  - Test daemon deployment
  - Verify all examples in README work

**Deliverables**:
- Comprehensive test suite with high coverage
- Complete README with setup and usage instructions
- All documentation files
- Verified working examples

**Commit Message**: `docs: add comprehensive documentation and complete test coverage`

---

## Summary

### Total Phases: 10

### Estimated Complexity:
- **Phase 1**: Low (setup)
- **Phase 2**: Medium (data layer)
- **Phase 3**: Medium (services)
- **Phase 4**: Low (resources)
- **Phase 5**: Medium (basic tools)
- **Phase 6**: High (tax calculations)
- **Phase 7**: Medium (integration)
- **Phase 8**: Medium (daemon)
- **Phase 9**: Low (scripts)
- **Phase 10**: Medium (testing/docs)

### Key Milestones:
1. ✅ After Phase 1: Project buildable and linted
2. ✅ After Phase 3: All services testable independently
3. ✅ After Phase 5: Basic MCP functionality working
4. ✅ After Phase 6: Complete tax advisor capabilities
5. ✅ After Phase 7: Usable with Claude Desktop
6. ✅ After Phase 8: Autonomous reminder system
7. ✅ After Phase 10: Production-ready release

### Branching Strategy:
- Phase 1: Use existing branch `claude/tax-adviser-project-setup-01Au57JGb14KEqMYa49hDALt`
- Phase 2-10: Create new branches with session ID suffix
- After each phase: Commit and push to branch
- User reviews before proceeding to next phase

---

## Notes

- Each phase is designed to be independently testable
- Phases build upon previous work incrementally
- Configuration and example files included from start
- Privacy and security considered throughout
- Real Dutch tax data for 2024 included
- Comprehensive error handling at each layer
- Testing integrated throughout, not just at end

---

## Ready to Start?

Please review this implementation plan and let me know:
1. Do the phases make sense?
2. Would you like to adjust the scope of any phase?
3. Should we combine or split any phases?
4. Any specific concerns or requirements?

Once approved, we'll start with **Phase 1: Project Foundation & Setup** on the current branch.
