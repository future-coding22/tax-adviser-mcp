import type { PersonalProfile } from '../../src/types/personal.js';

/**
 * Mock personal profile for testing
 */
export const mockProfile: PersonalProfile = {
  basicInfo: {
    name: 'Jan de Vries',
    dateOfBirth: '1985-06-15',
    bsn: '123456789',
    address: {
      street: 'Hoofdstraat 123',
      city: 'Amsterdam',
      postalCode: '1012 AB',
      country: 'Netherlands',
    },
    taxPartner: false,
  },
  income: {
    employment: 60000,
    freelance: {
      registered: true,
      kvkNumber: '12345678',
      btwNumber: 'NL123456789B01',
      registered_since: '2020-01-01',
      meetsHoursRequirement: true,
      yearsActive: 4,
      profit: 30000,
      estimatedAnnualRevenue: 40000,
    },
    other: 0,
  },
  assets: {
    bankAccounts: {
      checking: 5000,
      savings: 45000,
    },
    investments: {
      stocksETFs: 30000,
      crypto: 5000,
      realEstate: 0,
      other: 0,
    },
    debts: {
      mortgage: 250000,
      studentLoan: 15000,
      personalLoans: 0,
    },
  },
  deductibleExpenses: {
    healthcare: 2000,
    donations: 500,
    education: 1000,
    homeOffice: 800,
  },
  recurringPayments: [
    {
      name: 'Health Insurance',
      category: 'insurance',
      amount: 150,
      frequency: 'monthly',
      autoPay: true,
      startDate: '2024-01-01',
      lastPaid: '2024-10-01',
    },
    {
      name: 'Accountant Fee',
      category: 'tax',
      amount: 800,
      frequency: 'yearly',
      autoPay: false,
      startDate: '2024-01-15',
      lastPaid: '2024-01-15',
      notes: 'Annual tax filing assistance',
    },
    {
      name: 'BTW Quarterly Payment',
      category: 'tax',
      amount: 2000,
      frequency: 'quarterly',
      autoPay: false,
      startDate: '2024-01-31',
      lastPaid: '2024-10-31',
    },
  ],
};

/**
 * Mock profile with no freelance income
 */
export const mockProfileEmployeeOnly: PersonalProfile = {
  ...mockProfile,
  income: {
    employment: 60000,
    freelance: undefined,
    other: 0,
  },
};

/**
 * Mock profile with tax partner
 */
export const mockProfileWithPartner: PersonalProfile = {
  ...mockProfile,
  basicInfo: {
    ...mockProfile.basicInfo,
    taxPartner: true,
  },
};

/**
 * Mock profile with high assets (Box 3 applicable)
 */
export const mockProfileHighAssets: PersonalProfile = {
  ...mockProfile,
  assets: {
    bankAccounts: {
      checking: 10000,
      savings: 80000,
    },
    investments: {
      stocksETFs: 150000,
      crypto: 20000,
      realEstate: 0,
      other: 0,
    },
    debts: {
      mortgage: 300000,
      studentLoan: 0,
      personalLoans: 0,
    },
  },
};
