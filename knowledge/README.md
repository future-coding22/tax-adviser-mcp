# Knowledge Cache

This directory contains the **knowledge cache** - a growing database of Dutch tax information that improves over time.

## How It Works

### 🧠 Automatic Learning
- When you search for Dutch tax law information, results are automatically cached here
- Each cache entry is a markdown file with metadata (sources, dates, tax years)
- The `.index.json` file maintains a searchable index of all entries

### 🔍 Cache-First Search
The system follows this flow:
1. Check local cache for relevant information
2. If found and not expired, return cached result (fast!)
3. If not found or expired, perform web search
4. Save new information to cache for future use
5. Return result

### 📁 Directory Structure

```
knowledge/
├── .index.json              # Index of all cached knowledge
├── income-tax/              # Income tax (Box 1, 2)
├── box3/                    # Wealth tax (Box 3)
├── btw/                     # VAT (BTW) for self-employed
├── self-employment/         # Freelancer deductions & obligations
├── deductions/              # Tax deductions and credits
└── general/                 # General tax information
```

### 📄 Entry Format

Each knowledge entry is a markdown file with YAML frontmatter:

```markdown
---
id: "box3-deemed-return-2024"
title: "Box 3 Deemed Return Rates for 2024"
category: "box3"
tags: ["box3", "vermogensrendementsheffing", "rates", "2024"]
sources:
  - url: "https://www.belastingdienst.nl/..."
    title: "Belastingdienst - Box 3"
    accessed_at: "2024-01-15T10:30:00Z"
created_at: "2024-01-15T10:35:00Z"
updated_at: "2024-01-15T10:35:00Z"
expires_at: "2025-01-01T00:00:00Z"
tax_years: [2024]
confidence: "high"
---

# Box 3 Deemed Return Rates for 2024

[Content here...]
```

### 🔄 Maintenance

The daemon automatically:
- Refreshes expired entries weekly
- Detects changes in Dutch tax law
- Sends Telegram alerts for relevant changes
- Prunes old/unused entries based on config

### 🛠️ Manual Operations

```bash
# View cache statistics
npm run knowledge:stats

# Manually refresh expired entries
npm run knowledge:refresh

# Export knowledge base (backup)
npm run knowledge:export

# Clean up old entries
npm run knowledge:prune

# Detect law changes
npm run knowledge:changes -- --category=box3
```

### ⚙️ Configuration

Knowledge cache behavior is controlled in `config.yaml`:

```yaml
knowledge:
  enabled: true
  auto_cache: true              # Automatically cache web search results
  default_expiry_days: 90       # How long entries stay fresh
  refresh_schedule: "0 3 * * 0" # Weekly refresh (Sunday 3 AM)
  max_entries: 500              # Maximum before pruning
  min_confidence: "medium"      # Minimum confidence to cache
```

### 🎯 Benefits

1. **Faster Responses**: No web search needed for cached info
2. **Offline Capable**: Works even when websites are down
3. **Change Tracking**: Automatically detects when tax laws change
4. **Growing Intelligence**: Gets smarter with every query
5. **Collaborative**: Share knowledge cache across team/machines

### 🔒 Privacy

- Knowledge cache contains **public tax law information only**
- Your personal financial data (`personal.md`) is **never** cached
- Safe to track in git and share with others

---

**Last Updated**: 2024-01-15
