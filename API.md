# 📖 API Reference

Complete reference for all MCP tools, resources, and prompts provided by the Tax Adviser server.

## Table of Contents

- [Tools](#tools)
- [Resources](#resources)
- [Prompts](#prompts)
- [Error Handling](#error-handling)
- [Rate Limits](#rate-limits)

---

## Tools

### get_tax_obligations

Get all applicable tax obligations based on your personal profile.

**Input Schema:**
```typescript
{
  year?: number  // Tax year (defaults to current year)
}
```

**Output:**
```typescript
{
  obligations: TaxObligation[],
  summary: {
    totalEstimated: number,
    nextDeadline: string,
    actionRequired: number
  }
}

interface TaxObligation {
  taxType: string,
  dutchName: string,
  filingDeadline: string,
  paymentDeadline?: string,
  estimatedAmount?: number,
  status: "upcoming" | "due_soon" | "overdue",
  daysUntil: number,
  actionRequired: string[]
}
```

**Example:**
```
Use get_tax_obligations
```

**Response:**
```json
{
  "obligations": [
    {
      "taxType": "income_tax",
      "dutchName": "Inkomstenbelasting",
      "filingDeadline": "2025-05-01",
      "estimatedAmount": 18500,
      "status": "upcoming",
      "daysUntil": 120,
      "actionRequired": [
        "Gather income statements",
        "Collect deduction receipts"
      ]
    }
  ]
}
```

---

### get_upcoming_dues

Track upcoming payments from your recurring payments schedule.

**Input Schema:**
```typescript
{
  days_ahead?: number,       // Days to look ahead (default: 90)
  category?: string,         // Filter by category
  include_autopay?: boolean  // Include auto-pay items (default: true)
}
```

**Categories:** `tax`, `insurance`, `subscription`, `utility`, `other`

**Output:**
```typescript
{
  upcoming: DuePayment[],
  summary: {
    totalAmount: number,
    totalPayments: number,
    byCategory: Record<string, {count: number, total: number}>,
    nextDue: {name: string, amount: number, dueDate: string, daysUntil: number} | null,
    requiresAction: Array<{name: string, amount: number, dueDate: string, daysUntil: number}>
  }
}
```

**Example:**
```
Use get_upcoming_dues with days_ahead 30 and include_autopay false
```

---

### send_reminder

Send a reminder notification via Telegram.

**Input Schema:**
```typescript
{
  message: string,                          // Required
  priority?: "low" | "normal" | "high" | "urgent",
  schedule_for?: string,                    // ISO datetime
  tags?: string[]
}
```

**Output:**
```typescript
{
  success: boolean,
  message?: string,
  sent_at?: string,
  scheduled_for?: string,
  error?: string,
  details?: {
    message: string,
    priority: string,
    tags: string[]
  }
}
```

**Example:**
```
Use send_reminder with message "File BTW return" and priority "high"
```

---

### calculate_tax_estimate

Comprehensive Dutch tax calculation including Box 1, 2, 3, and BTW.

**Input Schema:**
```typescript
{
  year?: number,
  scenario?: {
    employment_income?: number,
    freelance_income?: number,
    other_income?: number,
    assets?: number,
    debts?: number
  }
}
```

**Output:**
```typescript
{
  year: number,
  total_tax_liability: number,
  total_including_btw: number,
  effective_tax_rate: number,
  breakdown: {
    box1: {...},
    box2: {...},
    box3: {...},
    btw: {...}
  },
  monthly_breakdown: {...},
  credits_applied: Credit[],
  deductions_applied: Deduction[],
  recommendations: string[]
}
```

**Example:**
```
Use calculate_tax_estimate
```

**With Scenario:**
```
Use calculate_tax_estimate with scenario where employment_income is 70000
```

---

### search_dutch_tax_law

Cache-first search for Dutch tax laws and regulations.

**Input Schema:**
```typescript
{
  query: string,                            // Required
  category?: "income_tax" | "btw" | "box3" | "self_employment" | "deductions" | "credits" | "deadlines" | "general",
  year?: number,
  force_refresh?: boolean  // Skip cache (default: false)
}
```

**Output:**
```typescript
{
  query: string,
  category: string,
  year: number,
  source: "cache" | "web",
  results: SearchResult[],
  count: number,
  cache_hit: boolean,
  searched_sites?: string[]
}

interface SearchResult {
  id?: string,             // Present if cached
  title: string,
  summary: string,
  url?: string,            // Present if from web
  relevance_score: number,
  cached_at?: string,
  expires_at?: string
}
```

**Example:**
```
Use search_dutch_tax_law with query "Box 3 deemed return rates 2024"
```

---

### search_knowledge_base

Search only the local knowledge cache.

**Input Schema:**
```typescript
{
  query: string,                            // Required
  category?: string,
  year?: number,
  tags?: string[],
  include_expired?: boolean,  // Default: false
  limit?: number             // Default: 10
}
```

**Output:**
```typescript
{
  query: string,
  results: KnowledgeEntry[],
  count: number,
  stats: {
    total_results: number,
    by_category: Record<string, number>,
    by_confidence: Record<string, number>,
    expired_count: number
  }
}
```

**Example:**
```
Use search_knowledge_base with query "self-employment deduction" and category "self_employment"
```

---

### get_knowledge_entry

Retrieve a complete knowledge entry by ID.

**Input Schema:**
```typescript
{
  id: string  // Required
}
```

**Output:**
```typescript
{
  success: boolean,
  entry?: {
    id: string,
    title: string,
    summary: string,
    content: string,          // Full content
    category: string,
    taxYear: number,
    tags: string[],
    confidence: "low" | "medium" | "high",
    sources: string[],
    cachedAt: string,
    expiresAt: string,
    lastAccessed: string,
    accessCount: number,
    isExpired: boolean,
    daysUntilExpiry: number
  },
  warnings?: string[],
  error?: string
}
```

**Example:**
```
Use get_knowledge_entry with id "box3-deemed-return-2024"
```

---

### refresh_knowledge

Manually refresh cached knowledge entries.

**Input Schema:**
```typescript
{
  id?: string,                   // Refresh specific entry
  refresh_all_expired?: boolean, // Refresh all expired
  category?: string,             // Refresh by category
  force?: boolean               // Force refresh even if not expired
}
```

**Output:**
```typescript
{
  success: boolean,
  refreshed_count: number,
  failed_count: number,
  refreshed_entries: Array<{
    id: string,
    title: string,
    previous_expires_at: string,
    new_expires_at: string
  }>,
  failed_entries: Array<{
    id: string,
    error: string
  }>,
  error?: string
}
```

**Example:**
```
Use refresh_knowledge with refresh_all_expired true
```

---

### get_law_changes

Detect changes in Dutch tax laws between years.

**Input Schema:**
```typescript
{
  from_year: number,                        // Required
  to_year?: number,                         // Defaults to current year
  category?: "income_tax" | "btw" | "box3" | "self_employment" | "deductions" | "credits" | "all",
  impact_level?: "low" | "medium" | "high" | "all"
}
```

**Output:**
```typescript
{
  from_year: number,
  to_year: number,
  changes: TaxLawChange[],
  total_changes: number,
  affects_you_count: number,
  by_category: Record<string, number>,
  by_impact: Record<string, number>,
  requires_action: Array<{title: string, action: string}>
}

interface TaxLawChange {
  category: string,
  type: string,
  title: string,
  description: string,
  from_value: string,
  to_value: string,
  effective_date: string,
  impact_level: "low" | "medium" | "high",
  affects_you: boolean,
  source: string,
  action_required?: string
}
```

**Example:**
```
Use get_law_changes with from_year 2023
```

---

### get_spending_advice

Get personalized financial optimization and tax planning advice.

**Input Schema:**
```typescript
{
  focus_area?: "tax_reduction" | "wealth_building" | "retirement" | "debt_management" | "all",
  risk_tolerance?: "conservative" | "moderate" | "aggressive"
}
```

**Output:**
```typescript
{
  advice: SpendingAdviceItem[],
  total_recommendations: number,
  by_category: Record<string, number>,
  by_priority: Record<string, number>,
  total_potential_savings: number,
  focus_area: string
}

interface SpendingAdviceItem {
  category: string,
  title: string,
  description: string,
  priority: "low" | "medium" | "high",
  estimated_impact: number,       // In euros
  difficulty: "low" | "medium" | "high",
  timeline: string,
  action_steps: string[]
}
```

**Example:**
```
Use get_spending_advice with focus_area "tax_reduction"
```

---

## Resources

### personal://profile

Your complete personal tax profile.

**URI:** `personal://profile`

**Content:**
```typescript
{
  basicInfo: {...},
  income: {...},
  assets: {...},
  deductibleExpenses: {...},
  recurringPayments: [...]
}
```

---

### tax://calendar/{year}

Tax calendar with important dates and deadlines.

**URI:** `tax://calendar/2024`

**Content:**
```typescript
{
  year: number,
  important_dates: Array<{
    date: string,
    type: string,
    description: string
  }>,
  btw_deadlines: string[],
  next_deadline: {...}
}
```

---

### tax://rates/{year}

Tax rates for a specific year.

**URI:** `tax://rates/2024`

**Content:**
```typescript
{
  year: number,
  income_tax: {
    box1_brackets: [...],
    box2_rate: number,
    box3_rate: number
  },
  btw: {
    standard: number,
    reduced: number,
    zero: number
  }
}
```

---

### tax://deductions/{year}

Available tax deductions.

**URI:** `tax://deductions/2024`

**Content:**
```typescript
{
  year: number,
  self_employment: {...},
  mortgage_interest: {...},
  healthcare: {...},
  donations: {...},
  education: {...}
}
```

---

### tax://rules

Complete tax rules and regulations.

**URI:** `tax://rules`

**Content:**
Complete JSON of `dutch-tax-rules.json`

---

### knowledge://base

Knowledge cache index.

**URI:** `knowledge://base`

**Content:**
```typescript
{
  version: string,
  total_entries: number,
  entries: Array<{
    id: string,
    title: string,
    category: string,
    summary: string
  }>
}
```

---

### knowledge://stats

Knowledge cache statistics.

**URI:** `knowledge://stats`

**Content:**
```typescript
{
  total_entries: number,
  entries_by_category: {...},
  entries_by_confidence: {...},
  storage_size: number,
  most_accessed: [...]
}
```

---

### knowledge://categories

Entries organized by category.

**URI:** `knowledge://categories`

---

### knowledge://recent

Recently cached entries.

**URI:** `knowledge://recent`

---

### knowledge://expired

Expired entries needing refresh.

**URI:** `knowledge://expired`

---

## Prompts

### tax_planning_session

Start a comprehensive tax planning session.

**Arguments:**
- `focus_area` (optional): `tax_obligations`, `optimization`, `deadlines`, `all`

**Usage:**
```
Use prompt tax_planning_session
```

---

### deadline_check

Quick check of upcoming tax deadlines.

**Usage:**
```
Use prompt deadline_check
```

---

### tax_optimization

Get personalized tax optimization recommendations.

**Usage:**
```
Use prompt tax_optimization
```

---

## Error Handling

All tools return errors in a consistent format:

```typescript
{
  success: false,
  error: "Error message describing what went wrong"
}
```

Common error codes:
- **Configuration Error**: Service disabled or misconfigured
- **Validation Error**: Invalid input parameters
- **Not Found**: Resource or entry doesn't exist
- **Network Error**: Failed to fetch web results
- **Rate Limit**: Too many requests (Telegram)

---

## Rate Limits

### Telegram Notifications
- **Per hour**: 30 messages (configurable)
- **Per day**: 100 messages (configurable)
- **Quiet hours**: No messages between 22:00 - 08:00 (configurable)

### Web Search
- **Timeout**: 10 seconds per request
- **Retry**: Up to 3 attempts with exponential backoff
- **Max results**: 10 per query (configurable)

### Knowledge Cache
- **Max entries**: 1000 (configurable)
- **Auto-cleanup**: Removes oldest low-confidence entries when limit reached

---

## Best Practices

### 1. Use Cache-First Search

For tax law questions, use `search_dutch_tax_law` instead of `search_knowledge_base`. It checks the cache first, then falls back to web search.

### 2. Batch Operations

When refreshing knowledge, use category or expired filters instead of individual entries:

```
Use refresh_knowledge with refresh_all_expired true
```

### 3. Scenario Planning

Use `calculate_tax_estimate` with scenarios to explore "what-if" situations:

```
Use calculate_tax_estimate with scenario where freelance_income is 50000
```

### 4. Regular Health Checks

Periodically check knowledge cache health:

```
Use search_knowledge_base with query "" and include_expired true
```

---

## Support

For questions or issues:
- **GitHub Issues**: [Report a bug](https://github.com/yourusername/tax-adviser-mcp/issues)
- **Discussions**: [Ask a question](https://github.com/yourusername/tax-adviser-mcp/discussions)
- **Email**: support@example.com

---

**Last Updated**: 2024
