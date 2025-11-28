import { describe, it, expect, beforeEach } from 'vitest';
import { DutchTaxKnowledge } from '../src/context/dutch-tax-knowledge.js';

describe('DutchTaxKnowledge', () => {
  let taxKnowledge: DutchTaxKnowledge;

  beforeEach(() => {
    // Use mock tax rules data
    const mockRulesPath = './data/dutch-tax-rules.json';
    taxKnowledge = new DutchTaxKnowledge(mockRulesPath);
  });

  describe('calculateBox1Tax', () => {
    it('should calculate tax for income in first bracket', () => {
      const income = 50000;
      const tax = taxKnowledge.calculateBox1Tax(income);

      // First bracket: 36.97% of 50,000 = 18,485
      expect(tax).toBeCloseTo(18485, 0);
    });

    it('should calculate tax for income spanning both brackets', () => {
      const income = 100000;
      const tax = taxKnowledge.calculateBox1Tax(income);

      // First bracket: 36.97% of 75,518 = 27,918.81
      // Second bracket: 49.50% of 24,482 = 12,118.59
      // Total: ~40,037
      expect(tax).toBeGreaterThan(39000);
      expect(tax).toBeLessThan(41000);
    });

    it('should return 0 for no income', () => {
      const tax = taxKnowledge.calculateBox1Tax(0);
      expect(tax).toBe(0);
    });

    it('should handle negative income as 0', () => {
      const tax = taxKnowledge.calculateBox1Tax(-1000);
      expect(tax).toBe(0);
    });
  });

  describe('calculateGeneralCredit', () => {
    it('should return maximum credit for low income', () => {
      const credit = taxKnowledge.calculateGeneralCredit(20000);
      expect(credit).toBe(3362); // Maximum credit
    });

    it('should phase out credit for higher income', () => {
      const lowIncomeCredit = taxKnowledge.calculateGeneralCredit(20000);
      const highIncomeCredit = taxKnowledge.calculateGeneralCredit(50000);

      expect(highIncomeCredit).toBeLessThan(lowIncomeCredit);
      expect(highIncomeCredit).toBeGreaterThan(0);
    });

    it('should return 0 credit for very high income', () => {
      const credit = taxKnowledge.calculateGeneralCredit(100000);
      expect(credit).toBe(0);
    });
  });

  describe('calculateLaborCredit', () => {
    it('should calculate labor credit for employment income', () => {
      const credit = taxKnowledge.calculateLaborCredit(40000);
      expect(credit).toBeGreaterThan(0);
      expect(credit).toBeLessThanOrEqual(5000); // Reasonable upper bound
    });

    it('should return 0 for no income', () => {
      const credit = taxKnowledge.calculateLaborCredit(0);
      expect(credit).toBe(0);
    });

    it('should increase with income up to a maximum', () => {
      const credit1 = taxKnowledge.calculateLaborCredit(20000);
      const credit2 = taxKnowledge.calculateLaborCredit(40000);
      const credit3 = taxKnowledge.calculateLaborCredit(80000);

      expect(credit2).toBeGreaterThan(credit1);
      // Credit phases out at higher incomes
      expect(credit3).toBeLessThanOrEqual(credit2);
    });
  });

  describe('calculateBox3Tax', () => {
    it('should calculate Box 3 tax with no partner', () => {
      const result = taxKnowledge.calculateBox3Tax(
        100000, // assets
        0, // debts
        50, // 50% savings
        false // no partner
      );

      expect(result.taxableBase).toBeGreaterThan(0);
      expect(result.deemedReturn).toBeGreaterThan(0);
      expect(result.tax).toBeGreaterThan(0);
    });

    it('should use higher exemption with partner', () => {
      const resultNoPartner = taxKnowledge.calculateBox3Tax(100000, 0, 50, false);
      const resultWithPartner = taxKnowledge.calculateBox3Tax(100000, 0, 50, true);

      expect(resultWithPartner.taxableBase).toBeLessThan(resultNoPartner.taxableBase);
      expect(resultWithPartner.tax).toBeLessThan(resultNoPartner.tax);
    });

    it('should return 0 tax when assets below exemption', () => {
      const result = taxKnowledge.calculateBox3Tax(50000, 0, 50, false);

      expect(result.tax).toBe(0);
    });

    it('should subtract debts from assets', () => {
      const resultNoDebt = taxKnowledge.calculateBox3Tax(100000, 0, 50, false);
      const resultWithDebt = taxKnowledge.calculateBox3Tax(100000, 20000, 50, false);

      expect(resultWithDebt.taxableBase).toBeLessThan(resultNoDebt.taxableBase);
      expect(resultWithDebt.tax).toBeLessThan(resultNoDebt.tax);
    });

    it('should use different deemed return rates for savings vs investments', () => {
      const allSavings = taxKnowledge.calculateBox3Tax(200000, 0, 100, false);
      const allInvestments = taxKnowledge.calculateBox3Tax(200000, 0, 0, false);

      // Investments have higher deemed return (6.04% vs 1.03%)
      expect(allInvestments.deemedReturn).toBeGreaterThan(allSavings.deemedReturn);
      expect(allInvestments.tax).toBeGreaterThan(allSavings.tax);
    });
  });

  describe('calculateEffectiveRate', () => {
    it('should calculate effective tax rate as percentage', () => {
      const rate = taxKnowledge.calculateEffectiveRate(100000, 30000);
      expect(rate).toBe(30);
    });

    it('should return 0 for no income', () => {
      const rate = taxKnowledge.calculateEffectiveRate(0, 0);
      expect(rate).toBe(0);
    });

    it('should handle edge case of tax exceeding income', () => {
      const rate = taxKnowledge.calculateEffectiveRate(100, 200);
      expect(rate).toBe(200); // 200% - theoretically possible with penalties
    });
  });

  describe('getZelfstandigenaftrek', () => {
    it('should return the correct self-employment deduction', () => {
      const deduction = taxKnowledge.getZelfstandigenaftrek();
      expect(deduction).toBe(3750);
    });
  });

  describe('getStartersaftrek', () => {
    it('should return the correct starter deduction', () => {
      const deduction = taxKnowledge.getStartersaftrek();
      expect(deduction).toBeGreaterThan(0);
      expect(deduction).toBeLessThanOrEqual(3000); // Reasonable upper bound
    });
  });

  describe('getMKBVrijstelling', () => {
    it('should return the SME profit exemption percentage', () => {
      const percentage = taxKnowledge.getMKBVrijstelling();
      expect(percentage).toBe(13.31);
    });
  });

  describe('getBTWRates', () => {
    it('should return BTW rate structure', () => {
      const rates = taxKnowledge.getBTWRates();

      expect(rates.standard).toBe(21);
      expect(rates.reduced).toBe(9);
      expect(rates.zero).toBe(0);
    });
  });

  describe('getDeadlines', () => {
    it('should return tax deadlines for the year', () => {
      const deadlines = taxKnowledge.getDeadlines();

      expect(deadlines.income_tax).toBeDefined();
      expect(deadlines.btw_quarterly).toBeDefined();
      expect(deadlines.btw_quarterly.length).toBe(4);
    });
  });

  describe('getNextDeadline', () => {
    it('should return the next upcoming deadline', () => {
      const nextDeadline = taxKnowledge.getNextDeadline();

      expect(nextDeadline).toBeDefined();
      expect(nextDeadline.date).toBeDefined();
      expect(nextDeadline.type).toBeDefined();
      expect(nextDeadline.description).toBeDefined();
    });
  });
});
