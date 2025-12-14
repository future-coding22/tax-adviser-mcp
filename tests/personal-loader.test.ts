import { describe, it, expect, vi, beforeEach } from 'vitest';
import { PersonalProfileLoader } from '../src/context/personal-loader.js';
import * as fs from 'fs';

vi.mock('fs');

describe('PersonalProfileLoader', () => {
  let loader: PersonalProfileLoader;

  beforeEach(() => {
    loader = new PersonalProfileLoader();
    vi.clearAllMocks();
  });

  describe('load', () => {
    it('should parse valid personal.md file', () => {
      const mockContent = `---
name: Jan de Vries
date_of_birth: 1985-06-15
bsn: 123456789
tax_partner: false
---

# Personal Tax Profile

## Income

### Employment
- Annual Salary: €60,000

### Freelance
- Registered: Yes
- KVK Number: 12345678
- BTW Number: NL123456789B01
- Annual Profit: €30,000

## Assets

### Bank Accounts
- Checking: €5,000
- Savings: €45,000

### Investments
- Stocks/ETFs: €30,000

### Debts
- Mortgage: €250,000
`;

      vi.spyOn(fs, 'existsSync').mockReturnValue(true);
      vi.spyOn(fs, 'readFileSync').mockReturnValue(mockContent);

      const result = loader.load('./data/personal.md');

      expect(result.profile).toBeDefined();
      expect(result.profile.basicInfo).toBeDefined();
    });

    it('should handle missing freelance section', () => {
      const mockContent = `---
name: Employee Only
date_of_birth: 1990-01-01
bsn: 987654321
---

## Income

### Employment
- Annual Salary: €50,000

## Assets

### Bank Accounts
- Savings: €20,000
`;

      vi.spyOn(fs, 'existsSync').mockReturnValue(true);
      vi.spyOn(fs, 'readFileSync').mockReturnValue(mockContent);

      const result = loader.load('./data/personal.md');

      expect(result.profile).toBeDefined();
      expect(result.profile.income).toBeDefined();
    });

    it('should parse recurring payments table', () => {
      const mockContent = `---
name: Test User
date_of_birth: 1990-01-01
---

## Recurring Payments

| Name | Category | Amount | Frequency | Auto-pay | Start Date |
|------|----------|--------|-----------|----------|------------|
| Health Insurance | insurance | €150 | monthly | yes | 2024-01-01 |
| BTW Quarterly | tax | €2,000 | quarterly | no | 2024-01-31 |
`;

      vi.spyOn(fs, 'existsSync').mockReturnValue(true);
      vi.spyOn(fs, 'readFileSync').mockReturnValue(mockContent);

      const result = loader.load('./data/personal.md');

      expect(result.profile).toBeDefined();
    });

    it('should handle euro symbols and formatting', () => {
      const mockContent = `---
name: Test
date_of_birth: 1990-01-01
---

## Income
- Employment: €60,000
- Freelance: €30,000

## Assets
- Savings: €45,000
- Investments: €30,000
`;

      vi.spyOn(fs, 'existsSync').mockReturnValue(true);
      vi.spyOn(fs, 'readFileSync').mockReturnValue(mockContent);

      const result = loader.load('./data/personal.md');

      expect(result.profile).toBeDefined();
    });

    it('should throw error for missing file', () => {
      vi.spyOn(fs, 'existsSync').mockReturnValue(false);

      expect(() => {
        loader.load('./nonexistent.md');
      }).toThrow('Personal data file not found');
    });

    it('should handle malformed frontmatter gracefully', () => {
      const mockContent = `---
name: Test
date_of_birth: invalid-date
---

## Income
- Employment: €50,000
`;

      vi.spyOn(fs, 'existsSync').mockReturnValue(true);
      vi.spyOn(fs, 'readFileSync').mockReturnValue(mockContent);

      const result = loader.load('./data/personal.md');

      expect(result.profile).toBeDefined();
    });
  });
});
