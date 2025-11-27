# 🔧 Setup Guide

Complete guide to setting up the Tax Adviser MCP Server.

## Table of Contents

1. [Prerequisites](#prerequisites)
2. [Installation](#installation)
3. [Configuration](#configuration)
4. [Personal Data Setup](#personal-data-setup)
5. [Telegram Setup](#telegram-setup)
6. [Claude Desktop Integration](#claude-desktop-integration)
7. [Daemon Setup](#daemon-setup)
8. [Verification](#verification)
9. [Troubleshooting](#troubleshooting)

## Prerequisites

### Required

- **Node.js** 18.0.0 or higher
- **npm** 9.0.0 or higher
- **Claude Desktop** (latest version)
- **Git** (for cloning the repository)

### Optional

- **Telegram account** (for notifications)
- **Brave Search API key** (for enhanced web search)

### System Requirements

- **OS**: macOS, Linux, or Windows (WSL recommended)
- **RAM**: 512 MB minimum
- **Disk**: 100 MB for installation + knowledge cache

## Installation

### Step 1: Clone the Repository

```bash
git clone https://github.com/yourusername/tax-adviser-mcp.git
cd tax-adviser-mcp
```

### Step 2: Install Dependencies

```bash
npm install
```

This will install all required packages including:
- `@modelcontextprotocol/sdk` - MCP protocol implementation
- `zod` - Configuration validation
- `yaml` - Configuration file parsing
- `gray-matter` - Personal data parsing
- `node-cron` - Scheduled tasks
- And more...

### Step 3: Run the Setup Wizard

```bash
npm run setup
```

The interactive wizard will guide you through:
1. Personal data file location
2. Telegram configuration
3. Web search provider
4. Knowledge cache settings
5. Tax year selection

### Step 4: Build the Project

```bash
npm run build
```

This compiles TypeScript to JavaScript in the `dist/` directory.

## Configuration

### Configuration File

The setup wizard creates `data/config.yaml`. You can also create it manually using the example:

```bash
cp data/config.example.yaml data/config.yaml
```

### Key Configuration Sections

#### 1. Server Settings

```yaml
server:
  name: tax-adviser-mcp
  version: 1.0.0
  log_level: info  # debug, info, warn, error
```

#### 2. Telegram Notifications

```yaml
telegram:
  enabled: true
  bot_token: "YOUR_BOT_TOKEN"  # From @BotFather
  chat_id: "YOUR_CHAT_ID"      # From @userinfobot
  quiet_hours:
    enabled: true
    start: "22:00"  # 10 PM
    end: "08:00"    # 8 AM
  rate_limit:
    max_per_hour: 30
    max_per_day: 100
```

#### 3. Web Search

```yaml
web_search:
  provider: duckduckgo  # or 'brave'
  brave_api_key: ""     # Required if using Brave
  max_results: 10
  timeout: 10000        # ms
  retry:
    max_attempts: 3
    delay: 2000         # ms
```

#### 4. Knowledge Cache

```yaml
knowledge:
  enabled: true
  auto_cache: true              # Auto-save web search results
  track_in_git: true           # Git commit knowledge changes
  seed_initial_entries: true   # Load seed knowledge on first run
  refresh_strategy: weekly     # weekly, on-demand, disabled
  change_notifications: profile-specific  # all, profile-specific, disabled
  default_expiry_days: 90
  min_confidence: medium       # low, medium, high
  max_entries: 1000
```

#### 5. Tax Year

```yaml
tax:
  year: 2024
  country: NL
  currency: EUR
```

#### 6. Reminders

```yaml
reminders:
  enabled: true
  deadline_check_time: "0 9 * * *"   # Daily at 9 AM (cron format)
  payment_check_time: "0 10 * * *"   # Daily at 10 AM
  advance_notice_days:
    income_tax: 30  # Remind 30 days before
    btw: 14         # Remind 14 days before
    other: 7        # Remind 7 days before
```

#### 7. File Paths

```yaml
paths:
  personal_data: ./data/personal.md
  tax_rules: ./data/dutch-tax-rules.json
  knowledge_base: ./knowledge
  config: ./data/config.yaml
```

### Validate Configuration

```bash
npm run validate
```

This checks:
- Configuration file syntax
- Required files existence
- Telegram credentials (if enabled)
- Web search provider settings
- Tax year validity

## Personal Data Setup

### Step 1: Create Personal Data File

```bash
cp data/personal.example.md data/personal.md
```

### Step 2: Edit Personal Information

Open `data/personal.md` and fill in your information:

```markdown
---
name: Jan de Vries
date_of_birth: 1985-06-15
bsn: 123456789
tax_partner: false
---

# Personal Tax Profile

## Basic Information
- Address: Hoofdstraat 123, 1012 AB Amsterdam
- Contact: jan@example.com

## Income

### Employment
- Employer: Tech Company BV
- Annual Salary: €60,000
- Employment Start: 2020-01-01

### Freelance (if applicable)
- Registered: Yes
- KVK Number: 12345678
- BTW Number: NL123456789B01
- Registered Since: 2020-01-01
- Meets Hours Requirement: Yes
- Years Active: 4
- Annual Profit: €30,000
- Annual Revenue: €40,000

### Other Income
- Rental Income: €0
- Investment Income: €0

## Assets

### Bank Accounts
- Checking Account: €5,000
- Savings Account: €45,000

### Investments
- Stocks/ETFs: €30,000
- Crypto: €5,000
- Real Estate: €0
- Other: €0

### Debts
- Mortgage: €250,000
- Student Loan: €15,000
- Personal Loans: €0

## Deductible Expenses

- Healthcare (above threshold): €2,000
- Charitable Donations: €500
- Education/Training: €1,000
- Home Office Expenses: €800

## Recurring Payments

| Name | Category | Amount | Frequency | Auto-pay | Start Date | Last Paid | Notes |
|------|----------|--------|-----------|----------|------------|-----------|-------|
| Health Insurance | insurance | €150 | monthly | yes | 2024-01-01 | 2024-10-01 | Basic coverage |
| Accountant Fee | tax | €800 | yearly | no | 2024-01-15 | 2024-01-15 | Annual filing |
| BTW Quarterly | tax | €2,000 | quarterly | no | 2024-01-31 | 2024-10-31 | VAT payment |
```

### Important Notes

- **BSN**: Keep your BSN private, this file stays on your machine
- **Accuracy**: Ensure all amounts are accurate for correct calculations
- **Updates**: Update this file when your financial situation changes
- **Backup**: Consider backing up this file securely

## Telegram Setup

### Step 1: Create a Telegram Bot

1. Open Telegram and search for `@BotFather`
2. Send `/newbot` command
3. Follow the prompts to create your bot
4. Copy the **bot token** (format: `123456789:ABCdefGHIjklMNOpqrsTUVwxyz`)

### Step 2: Get Your Chat ID

1. Search for `@userinfobot` in Telegram
2. Send `/start` command
3. Copy your **chat ID** (format: `123456789`)

### Step 3: Start Your Bot

1. Search for your bot by name in Telegram
2. Send `/start` to activate it

### Step 4: Update Configuration

Add to `data/config.yaml`:

```yaml
telegram:
  enabled: true
  bot_token: "123456789:ABCdefGHIjklMNOpqrsTUVwxyz"
  chat_id: "123456789"
```

### Step 5: Test Notifications

```bash
# Start the server
npm start

# In Claude Desktop, use:
# send_reminder with message "Test notification"
```

You should receive a message in Telegram!

## Claude Desktop Integration

### Step 1: Locate Claude Desktop Config

**macOS**:
```bash
~/Library/Application Support/Claude/claude_desktop_config.json
```

**Linux**:
```bash
~/.config/Claude/claude_desktop_config.json
```

**Windows**:
```bash
%APPDATA%\Claude\claude_desktop_config.json
```

### Step 2: Add MCP Server Configuration

Edit the config file:

```json
{
  "mcpServers": {
    "tax-adviser": {
      "command": "node",
      "args": ["/absolute/path/to/tax-adviser-mcp/dist/index.js"]
    }
  }
}
```

**Important**: Use the **absolute path** to your installation!

To get the absolute path:
```bash
cd tax-adviser-mcp
pwd
# Copy the output and append /dist/index.js
```

### Step 3: Restart Claude Desktop

Completely quit and restart Claude Desktop for changes to take effect.

### Step 4: Verify Integration

In Claude Desktop, ask:
> "What MCP tools are available?"

You should see the Tax Adviser tools listed!

## Daemon Setup

The daemon runs background tasks for automation.

### Using PM2 (Recommended for Production)

```bash
# Install PM2 globally
npm install -g pm2

# Start the daemon
pm2 start dist/daemon.js --name tax-adviser-daemon

# Check status
pm2 status

# View logs
pm2 logs tax-adviser-daemon

# Stop the daemon
pm2 stop tax-adviser-daemon

# Restart the daemon
pm2 restart tax-adviser-daemon

# Auto-start on system boot
pm2 startup
pm2 save
```

### Using npm Scripts (Development)

```bash
# Start the daemon
npm run daemon:start

# In another terminal, check if it's running
ps aux | grep daemon

# Stop the daemon
npm run daemon:stop
```

### Daemon Scheduled Tasks

Once running, the daemon will:

- **Daily at 9 AM**: Check tax deadlines, send reminders
- **Daily at 10 AM**: Check due payments, send reminders
- **Sunday at 3 AM**: Refresh expired knowledge entries
- **Monday at 8 AM**: Check for tax law changes

### Customize Schedule

Edit `data/config.yaml`:

```yaml
reminders:
  deadline_check_time: "0 9 * * *"   # Cron format: min hour day month weekday
  payment_check_time: "0 10 * * *"

# Cron format examples:
# "0 9 * * *"      - Every day at 9:00 AM
# "0 9 * * 1"      - Every Monday at 9:00 AM
# "0 */6 * * *"    - Every 6 hours
# "30 8 * * 1-5"   - Weekdays at 8:30 AM
```

## Verification

### 1. Validate Configuration

```bash
npm run validate
```

Should show: ✅ Configuration is valid

### 2. Check Knowledge Cache

```bash
npm run knowledge:stats
```

Should show initial seed entries (if enabled)

### 3. Test MCP Server

```bash
npm start
```

Should show: `Tax Adviser MCP Server running on stdio`

### 4. Test in Claude Desktop

Ask Claude:
> "Use get_tax_obligations to show my tax obligations"

Should return your personalized tax obligations!

### 5. Test Telegram Notifications

In Claude:
> "Use send_reminder to send me a test message"

Should receive a Telegram notification!

## Troubleshooting

### Issue: "Configuration file not found"

**Solution**:
```bash
npm run setup
# Or manually:
cp data/config.example.yaml data/config.yaml
```

### Issue: "Personal data file not found"

**Solution**:
```bash
cp data/personal.example.md data/personal.md
# Then edit the file with your information
```

### Issue: Telegram notifications not working

**Checklist**:
1. Bot token is correct (check for extra spaces)
2. Chat ID is correct
3. You've sent `/start` to your bot
4. `telegram.enabled` is `true` in config
5. No firewall blocking outbound connections

**Test**:
```bash
# Test the bot token directly
curl https://api.telegram.org/bot<YOUR_BOT_TOKEN>/getMe
```

### Issue: MCP server not appearing in Claude Desktop

**Checklist**:
1. Config file is valid JSON (no trailing commas)
2. Path is absolute, not relative
3. `dist/index.js` file exists (run `npm run build`)
4. Claude Desktop was fully restarted

**Debug**:
```bash
# Check if file exists
ls -la /absolute/path/to/tax-adviser-mcp/dist/index.js

# Test running the server directly
node /absolute/path/to/tax-adviser-mcp/dist/index.js
```

### Issue: "Module not found" errors

**Solution**:
```bash
# Clean install
rm -rf node_modules package-lock.json
npm install
npm run build
```

### Issue: Daemon not starting

**Check logs**:
```bash
# If using PM2
pm2 logs tax-adviser-daemon

# If using npm script
# Check console output
```

**Common causes**:
- Telegram enabled but credentials invalid
- Port conflicts (shouldn't happen with this daemon)
- Permission issues with knowledge directory

### Issue: Knowledge cache not updating

**Check**:
```bash
# View current stats
npm run knowledge:stats

# Force refresh
npm run knowledge:refresh --all

# Check configuration
cat data/config.yaml | grep -A 5 knowledge
```

### Issue: Build failures

**Solution**:
```bash
# Check TypeScript version
npx tsc --version

# Clean build
npm run clean
npm run build

# Check for type errors
npm run type-check
```

## Next Steps

After successful setup:

1. **Customize your profile**: Edit `data/personal.md` with your exact information
2. **Explore tools**: Try different tools in Claude Desktop
3. **Set up daemon**: Enable background automation
4. **Review knowledge**: Check `npm run knowledge:stats`
5. **Read API docs**: See [API.md](./API.md) for complete tool reference

## Support

If you encounter issues not covered here:

1. Check [GitHub Issues](https://github.com/yourusername/tax-adviser-mcp/issues)
2. Review [API.md](./API.md) for tool usage
3. Open a new issue with:
   - Error message
   - Steps to reproduce
   - Your configuration (remove sensitive data!)
   - Output of `npm run validate`

---

**Happy tax planning! 🏦**
