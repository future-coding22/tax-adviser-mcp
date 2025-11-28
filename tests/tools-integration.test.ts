import { describe, it, expect, beforeEach, vi } from 'vitest';
import { GetTaxObligationsTool } from '../src/tools/get-tax-obligations.js';
import { CalculateTaxEstimateTool } from '../src/tools/calculate-tax.js';
import { mockProfile, mockProfileEmployeeOnly } from './fixtures/mock-profile.js';
import type { Config } from '../src/types/index.js';

describe('Tool Integration Tests', () => {
  let mockConfig: Config;
  let mockDependencies: any;

  beforeEach(() => {
    mockConfig = {
      tax: { year: 2024 },
      paths: { personal_data: './data/personal.md' },
    } as Config;

    mockDependencies = {
      personalLoader: {
        load: vi.fn().mockReturnValue({
          profile: mockProfile,
          raw: '',
        }),
      },
      taxKnowledge: {
        calculateBox1Tax: vi.fn().mockReturnValue(20000),
        calculateGeneralCredit: vi.fn().mockReturnValue(3362),
        calculateLaborCredit: vi.fn().mockReturnValue(4500),
        calculateBox3Tax: vi.fn().mockReturnValue({
          taxableBase: 23000,
          deemedReturn: 800,
          tax: 256,
        }),
        calculateEffectiveRate: vi.fn().mockReturnValue(25.5),
        getZelfstandigenaftrek: vi.fn().mockReturnValue(3750),
        getStartersaftrek: vi.fn().mockReturnValue(2123),
        getMKBVrijstelling: vi.fn().mockReturnValue(13.31),
        getBTWRates: vi.fn().mockReturnValue({
          standard: 21,
          reduced: 9,
          zero: 0,
        }),
        getDeadlines: vi.fn().mockReturnValue({
          income_tax: '2025-05-01',
          btw_quarterly: ['2024-01-31', '2024-04-30', '2024-07-31', '2024-10-31'],
        }),
        getNextDeadline: vi.fn().mockReturnValue({
          date: '2025-01-31',
          type: 'btw',
          description: 'BTW Q4 2024 filing',
        }),
        getDeductionLimits: vi.fn().mockReturnValue({
          mortgage_interest: { max: 100000 },
          healthcare_expenses: { threshold_percentage: 1.75 },
        }),
        getRules: vi.fn().mockReturnValue({
          tax_year: 2024,
          income_tax: {
            general_credit: { max: 3362 },
          },
          self_employment: {
            zelfstandigenaftrek: { amount: 3750 },
            mkb_vrijstelling: { percentage: 13.31 },
          },
          btw: {
            standard_rate: 21,
            reduced_rate: 9,
          },
        }),
      },
    };
  });

  describe('GetTaxObligationsTool', () => {
    it('should identify all tax obligations for freelancer', async () => {
      const tool = new GetTaxObligationsTool(mockConfig, mockDependencies);
      const result = await tool.execute({ year: 2024 });

      expect(result.obligations).toBeDefined();
      expect(result.obligations.length).toBeGreaterThan(0);

      // Should include income tax
      const incomeTax = result.obligations.find((o) => o.taxType === 'income_tax');
      expect(incomeTax).toBeDefined();
      expect(incomeTax?.dutchName).toBe('Inkomstenbelasting');

      // Should include BTW for registered freelancer
      const btw = result.obligations.find((o) => o.taxType === 'btw');
      expect(btw).toBeDefined();

      expect(result.summary).toBeDefined();
      expect(result.summary.totalEstimated).toBeGreaterThan(0);
    });

    it('should not include BTW for employee-only profile', async () => {
      mockDependencies.personalLoader.load.mockReturnValue({
        profile: mockProfileEmployeeOnly,
        raw: '',
      });

      const tool = new GetTaxObligationsTool(mockConfig, mockDependencies);
      const result = await tool.execute({ year: 2024 });

      const btw = result.obligations.find((o) => o.taxType === 'btw');
      expect(btw).toBeUndefined();
    });

    it('should calculate days until deadline correctly', async () => {
      const tool = new GetTaxObligationsTool(mockConfig, mockDependencies);
      const result = await tool.execute({ year: 2024 });

      const incomeTax = result.obligations.find((o) => o.taxType === 'income_tax');
      expect(incomeTax?.daysUntil).toBeDefined();
      expect(typeof incomeTax?.daysUntil).toBe('number');
    });
  });

  describe('CalculateTaxEstimateTool', () => {
    it('should calculate comprehensive tax estimate', async () => {
      const tool = new CalculateTaxEstimateTool(mockConfig, mockDependencies);
      const result = await tool.execute({});

      expect(result.year).toBe(2024);
      expect(result.total_tax_liability).toBeGreaterThan(0);
      expect(result.effective_tax_rate).toBeGreaterThan(0);

      // Should have all breakdown sections
      expect(result.breakdown.box1).toBeDefined();
      expect(result.breakdown.box2).toBeDefined();
      expect(result.breakdown.box3).toBeDefined();
      expect(result.breakdown.btw).toBeDefined();

      // Monthly breakdown
      expect(result.monthly_breakdown).toBeDefined();
      expect(result.monthly_breakdown.income_tax).toBeGreaterThan(0);
    });

    it('should apply self-employment deductions for freelancer', async () => {
      const tool = new CalculateTaxEstimateTool(mockConfig, mockDependencies);
      const result = await tool.execute({});

      const deductions = result.deductions_applied;
      const zelfstandigenaftrek = deductions.find((d) => d.name === 'Zelfstandigenaftrek');

      expect(zelfstandigenaftrek).toBeDefined();
      expect(zelfstandigenaftrek?.amount).toBe(3750);
    });

    it('should calculate Box 3 tax when assets above exemption', async () => {
      const tool = new CalculateTaxEstimateTool(mockConfig, mockDependencies);
      const result = await tool.execute({});

      expect(result.breakdown.box3.assets).toBeGreaterThan(0);
      expect(result.breakdown.box3.tax).toBeGreaterThanOrEqual(0);
    });

    it('should handle scenario overrides', async () => {
      const tool = new CalculateTaxEstimateTool(mockConfig, mockDependencies);
      const result = await tool.execute({
        scenario: {
          employment_income: 80000,
          freelance_income: 0,
        },
      });

      // Should use scenario income instead of profile
      expect(result.breakdown.box1.gross_income).toBe(80000);
    });

    it('should provide tax optimization recommendations', async () => {
      const tool = new CalculateTaxEstimateTool(mockConfig, mockDependencies);
      const result = await tool.execute({});

      expect(result.recommendations).toBeDefined();
      expect(Array.isArray(result.recommendations)).toBe(true);
    });

    it('should calculate BTW liability for freelancers', async () => {
      const tool = new CalculateTaxEstimateTool(mockConfig, mockDependencies);
      const result = await tool.execute({});

      expect(result.breakdown.btw.applicable).toBe(true);
      expect(result.breakdown.btw.revenue).toBeGreaterThan(0);
      expect(result.breakdown.btw.annualLiability).toBeGreaterThanOrEqual(0);
    });

    it('should not calculate BTW for employee-only', async () => {
      mockDependencies.personalLoader.load.mockReturnValue({
        profile: mockProfileEmployeeOnly,
        raw: '',
      });

      const tool = new CalculateTaxEstimateTool(mockConfig, mockDependencies);
      const result = await tool.execute({});

      expect(result.breakdown.btw.applicable).toBe(false);
    });
  });

  describe('Tool Integration - End to End', () => {
    it('should work together: obligations → calculate → advice flow', async () => {
      // Step 1: Get tax obligations
      const obligationsTool = new GetTaxObligationsTool(mockConfig, mockDependencies);
      const obligations = await obligationsTool.execute({});

      expect(obligations.obligations.length).toBeGreaterThan(0);

      // Step 2: Calculate tax estimate
      const calculateTool = new CalculateTaxEstimateTool(mockConfig, mockDependencies);
      const estimate = await calculateTool.execute({});

      expect(estimate.total_tax_liability).toBeGreaterThan(0);

      // Step 3: Verify consistency
      // The obligations should match what calculate found
      const hasIncomeTax = obligations.obligations.some((o) => o.taxType === 'income_tax');
      const hasIncomeTaxEstimate = estimate.breakdown.box1.gross_income > 0;

      expect(hasIncomeTax).toBe(hasIncomeTaxEstimate);
    });
  });

  describe('Edge Cases', () => {
    it('should handle profile with no income', async () => {
      const noIncomeProfile = {
        ...mockProfile,
        income: {
          employment: 0,
          freelance: undefined,
          other: 0,
        },
      };

      mockDependencies.personalLoader.load.mockReturnValue({
        profile: noIncomeProfile,
        raw: '',
      });

      const tool = new CalculateTaxEstimateTool(mockConfig, mockDependencies);
      const result = await tool.execute({});

      expect(result.breakdown.box1.gross_income).toBe(0);
      expect(result.breakdown.box1.net_tax).toBe(0);
    });

    it('should handle profile with assets below Box 3 exemption', async () => {
      const lowAssetsProfile = {
        ...mockProfile,
        assets: {
          ...mockProfile.assets,
          bankAccounts: {
            checking: 5000,
            savings: 20000,
          },
          investments: {
            stocksETFs: 0,
            crypto: 0,
            realEstate: 0,
            other: 0,
          },
        },
      };

      mockDependencies.personalLoader.load.mockReturnValue({
        profile: lowAssetsProfile,
        raw: '',
      });

      mockDependencies.taxKnowledge.calculateBox3Tax.mockReturnValue({
        taxableBase: 0,
        deemedReturn: 0,
        tax: 0,
      });

      const tool = new CalculateTaxEstimateTool(mockConfig, mockDependencies);
      const result = await tool.execute({});

      expect(result.breakdown.box3.tax).toBe(0);
    });

    it('should handle negative scenario income as zero', async () => {
      const tool = new CalculateTaxEstimateTool(mockConfig, mockDependencies);
      const result = await tool.execute({
        scenario: {
          employment_income: -1000, // Invalid negative income
        },
      });

      // Should treat negative as 0
      expect(result.breakdown.box1.gross_income).toBeGreaterThanOrEqual(0);
    });
  });
});
