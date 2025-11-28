import { describe, it, expect, vi } from 'vitest';
import { personalProfileLoader } from '../src/context/personal-loader.js';
import * as fs from 'fs';

vi.mock('fs');

describe('PersonalProfileLoader', () => {
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

      vi.spyOn(fs, 'readFileSync').mockReturnValue(mockContent);

      const result = personalProfileLoader.load('./data/personal.md');

      expect(result.profile.basicInfo.name).toBe('Jan de Vries');
      expect(result.profile.basicInfo.bsn).toBe('123456789');
      expect(result.profile.income.employment).toBe(60000);
      expect(result.profile.income.freelance?.profit).toBe(30000);
      expect(result.profile.assets.bankAccounts.savings).toBe(45000);
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

      vi.spyOn(fs, 'readFileSync').mockReturnValue(mockContent);

      const result = personalProfileLoader.load('./data/personal.md');

      expect(result.profile.income.employment).toBe(50000);
      expect(result.profile.income.freelance).toBeUndefined();
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

      vi.spyOn(fs, 'readFileSync').mockReturnValue(mockContent);

      const result = personalProfileLoader.load('./data/personal.md');

      expect(result.profile.recurringPayments).toBeDefined();
      expect(result.profile.recurringPayments?.length).toBe(2);
      expect(result.profile.recurringPayments?.[0].name).toBe('Health Insurance');
      expect(result.profile.recurringPayments?.[0].amount).toBe(150);
      expect(result.profile.recurringPayments?.[0].autoPay).toBe(true);
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

      vi.spyOn(fs, 'readFileSync').mockReturnValue(mockContent);

      const result = personalProfileLoader.load('./data/personal.md');

      expect(result.profile.income.employment).toBe(60000);
      expect(result.profile.assets.bankAccounts.savings).toBe(45000);
    });

    it('should throw error for missing file', () => {
      vi.spyOn(fs, 'readFileSync').mockImplementation(() => {
        throw new Error('File not found');
      });

      expect(() => {
        personalProfileLoader.load('./nonexistent.md');
      }).toThrow();
    });

    it('should handle malformed frontmatter gracefully', () => {
      const mockContent = `---
name: Test
date_of_birth: invalid-date
---

## Income
- Employment: €50,000
`;

      vi.spyOn(fs, 'readFileSync').mockReturnValue(mockContent);

      const result = personalProfileLoader.load('./data/personal.md');

      expect(result.profile.basicInfo.name).toBe('Test');
      // Should still parse income even with invalid date
      expect(result.profile.income.employment).toBe(50000);
    });
  });
});
