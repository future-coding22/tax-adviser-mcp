# 🏦 Tax Adviser MCP Server

A comprehensive **Model Context Protocol (MCP)** server providing intelligent multi-country tax assistance through Claude Desktop. Features include tax calculations, deadline tracking, knowledge caching, automated reminders, and autonomous country discovery.

## ✨ Features

### 🌍 Multi-Country Support (NEW!)
- **Glossary-Based Architecture** with 54+ universal tax concepts
- **Netherlands Fully Implemented** (Box 1/2/3, BTW, 2024 rates)
- **Autonomous Country Discovery** via `add_country` tool
- **Extensible Framework** for adding new countries
- **See [Multi-Country Guide](./docs/MULTI_COUNTRY.md)** for details

### 📊 Core Capabilities
- **11 MCP Tools** for tax calculations, searches, advice, and country setup
- **11 MCP Resources** exposing tax data and knowledge
- **3 Built-in Prompts** for common tax workflows
- **Country-Agnostic Interface** for future expansion

### 🧠 Knowledge Cache System
- **Cache-first search** for instant answers
- **Automatic web scraping** from official Dutch tax sites
- **Expiration management** with configurable refresh
- **Git tracking** for version control
- **Smart relevance scoring** for search results

### 🔔 Automated Reminders
- **Tax deadline notifications** (income tax, BTW, etc.)
- **Recurring payment tracking** (insurance, subscriptions)
- **Telegram integration** with quiet hours
- **Automatic knowledge refresh** (weekly, configurable)
- **Tax law change monitoring** (weekly checks)

### 🧮 Tax Calculations
- **Box 1**: Income tax with all deductions and credits
- **Box 2**: Substantial interest taxation
- **Box 3**: Wealth tax with deemed return
- **BTW**: VAT calculations for self-employed
- **Scenario planning** for what-if analysis

## 🚀 Quick Start

### Prerequisites
- Node.js 18+ and npm
- Claude Desktop (for MCP integration)
- Optional: Telegram bot (for notifications)

### Installation

```bash
# Clone the repository
git clone https://github.com/yourusername/tax-adviser-mcp.git
cd tax-adviser-mcp

# Install dependencies
npm install

# Run setup wizard
npm run setup

# Build the project
npm run build

# Start the MCP server
npm start
```

### Claude Desktop Integration

Add to your Claude Desktop config (`claude_desktop_config.json`):

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

Restart Claude Desktop and the server will be available!

## 📚 Documentation

- **[SETUP.md](./SETUP.md)** - Detailed setup and configuration guide
- **[API.md](./API.md)** - Complete tool and resource reference
- **[ARCHITECTURE.md](./docs/ARCHITECTURE.md)** - System architecture overview
- **[MULTI_COUNTRY.md](./docs/MULTI_COUNTRY.md)** ⭐ - Multi-country support guide (NEW!)

## 🛠️ Available Tools

| Tool | Description |
|------|-------------|
| `get_tax_obligations` | Get all applicable tax obligations with deadlines |
| `get_upcoming_dues` | Track upcoming payments from recurring schedule |
| `send_reminder` | Send Telegram notifications with scheduling |
| `calculate_tax_estimate` | Comprehensive tax calculation (Box 1/2/3, BTW for NL) |
| `search_dutch_tax_law` | Cache-first web search for tax laws |
| `search_knowledge_base` | Search local knowledge cache |
| `get_knowledge_entry` | Retrieve full knowledge entry by ID |
| `refresh_knowledge` | Manually refresh cached entries |
| `get_law_changes` | Detect tax law changes between years |
| `get_spending_advice` | Personalized financial optimization advice |
| **`add_country`** ⭐ | **Autonomously discover and set up new country support** |

## 📦 Available Resources

| Resource URI | Description |
|--------------|-------------|
| `personal://profile` | Your personal tax profile |
| `tax://calendar/{year}` | Tax calendar with important dates |
| `tax://rates/{year}` | Tax rates for specific year |
| `tax://deductions/{year}` | Available deductions |
| `tax://rules` | Complete tax rules and regulations |
| `knowledge://base` | Knowledge cache index |
| `knowledge://stats` | Cache statistics |
| `knowledge://categories` | Entries by category |
| `knowledge://recent` | Recently cached entries |
| `knowledge://expired` | Expired entries needing refresh |

## 🤖 Background Daemon

The daemon runs scheduled tasks for automation:

```bash
# Start the daemon
npm run daemon:start

# Stop the daemon
npm run daemon:stop

# Check daemon status
npm run daemon:status
```

### Scheduled Jobs
- **Daily 9 AM**: Tax deadline reminders
- **Daily 10 AM**: Due payment reminders
- **Sunday 3 AM**: Knowledge cache refresh
- **Monday 8 AM**: Tax law change monitoring

## 🔧 Utility Scripts

```bash
# Knowledge management
npm run knowledge:stats    # View cache statistics
npm run knowledge:refresh  # Refresh expired entries

# Configuration
npm run validate           # Validate configuration
npm run setup              # Re-run setup wizard

# Testing
npm test                   # Run all tests
npm run test:watch         # Run tests in watch mode
npm run test:coverage      # Generate coverage report
```

## ⚙️ Configuration

Configuration is managed through `data/config.yaml`. Key sections:

```yaml
# Enable/disable features
telegram:
  enabled: true
  bot_token: "your-bot-token"
  chat_id: "your-chat-id"

# Knowledge cache settings
knowledge:
  enabled: true
  auto_cache: true
  refresh_strategy: weekly
  default_expiry_days: 90

# Tax year
tax:
  year: 2024
  country: NL

# Reminder schedule
reminders:
  enabled: true
  deadline_check_time: "0 9 * * *"  # Daily at 9 AM
```

See `data/config.example.yaml` for all 80+ configuration options.

## 📝 Personal Data

Your personal tax information is stored in `data/personal.md`:

```markdown
---
name: Your Name
date_of_birth: 1990-01-01
bsn: 123456789
---

## Income
- Employment: €60,000/year
- Freelance: €30,000/year (registered, BTW number: NL123...)

## Assets
- Savings: €50,000
- Investments: €30,000
- Mortgage: €250,000

## Recurring Payments
| Name | Amount | Frequency | Auto-pay |
|------|--------|-----------|----------|
| Health Insurance | €150 | Monthly | Yes |
| BTW Quarterly | €2,000 | Quarterly | No |
```

See `data/personal.example.md` for a complete template.

## 🧪 Testing

```bash
# Run all tests
npm test

# Watch mode
npm run test:watch

# Coverage report
npm run test:coverage

# Specific test file
npm test knowledge-cache
```

## 📊 Knowledge Cache

The knowledge cache learns and improves over time:

```bash
# View statistics
npm run knowledge:stats

# Sample output:
# ═══════════════════════════════════════
#   OVERVIEW
# ═══════════════════════════════════════
#   Total Entries:        47
#   Storage Size:         156 KB
#
# ═══════════════════════════════════════
#   BY CATEGORY
# ═══════════════════════════════════════
#   box3                 12 (25.5%)
#   self_employment      8 (17.0%)
#   income_tax           7 (14.9%)
```

## 🔒 Privacy & Security

- **Local-first**: All data stored locally on your machine
- **No cloud sync**: Personal data never leaves your computer
- **Git tracking**: Optional version control for knowledge cache
- **Encrypted communication**: Telegram uses end-to-end encryption
- **Open source**: Full transparency, audit the code yourself

## 🤝 Contributing

Contributions are welcome! Please read [CONTRIBUTING.md](./CONTRIBUTING.md) first.

### Development Setup

```bash
# Install dependencies
npm install

# Run in development mode
npm run dev

# Run linter
npm run lint

# Format code
npm run format

# Type checking
npm run type-check
```

## 📄 License

MIT License - see [LICENSE](./LICENSE) for details.

## 🙏 Acknowledgments

- Built with [Model Context Protocol](https://modelcontextprotocol.io/)
- Uses official Dutch tax data from [Belastingdienst](https://www.belastingdienst.nl/)
- Powered by Claude (Anthropic)

## 🆘 Support

- **Issues**: [GitHub Issues](https://github.com/yourusername/tax-adviser-mcp/issues)
- **Discussions**: [GitHub Discussions](https://github.com/yourusername/tax-adviser-mcp/discussions)
- **Email**: support@example.com

## 🗺️ Roadmap

- [ ] Phase 11: Multi-country support (US, UK, Germany, etc.)
- [ ] Web interface for configuration
- [ ] Export tax reports to PDF
- [ ] Integration with Dutch tax authorities API
- [ ] Mobile app for reminders
- [ ] AI-powered tax optimization recommendations

## ⚠️ Disclaimer

This software is for informational purposes only and does not constitute professional tax advice. Always consult with a qualified tax advisor or accountant for your specific situation. The developers are not responsible for any financial decisions made based on this software.

---

**Made with ❤️ for the Dutch tax community**
