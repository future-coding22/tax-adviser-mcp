/**
 * Personal financial profile types
 */

export interface PersonalProfile {
  metadata: ProfileMetadata;
  basicInfo: BasicInformation;
  income: IncomeInfo;
  assets: AssetsInfo;
  deductions: DeductionsInfo;
  recurringPayments: RecurringPayments;
  notes: string[];
}

export interface ProfileMetadata {
  lastUpdated: Date;
  taxYear: number;
}

export interface BasicInformation {
  residentSince?: number;
  bsn?: string;
  taxPartner: boolean;
  thirtyPercentRuling: boolean;
  thirtyPercentRulingExpiry?: Date;
}

// =============================================================================
// Income
// =============================================================================

export interface IncomeInfo {
  employment?: EmploymentIncome;
  freelance?: FreelanceIncome;
  other?: OtherIncome;
}

export interface EmploymentIncome {
  employer: string;
  grossAnnualSalary: number;
  holidayAllowance?: number;
  thirteenthMonth?: boolean;
  companyCar?: boolean;
}

export interface FreelanceIncome {
  registered: boolean;
  kvkNumber?: string;
  btwNumber?: string;
  estimatedAnnualRevenue: number;
  businessType: string;
  btwScheme: 'regular' | 'kor' | 'margin';
  btwFrequency?: 'monthly' | 'quarterly' | 'annual';
}

export interface OtherIncome {
  dividends?: number;
  rentalIncome?: number;
  pension?: number;
  benefits?: number;
}

// =============================================================================
// Assets (Box 3)
// =============================================================================

export interface AssetsInfo {
  bankAccounts: BankAccounts;
  investments: Investments;
  property?: Property[];
  debts: Debts;
}

export interface BankAccounts {
  savings: number;
  checking: number;
}

export interface Investments {
  stocksETFs?: number;
  crypto?: number;
  bonds?: number;
  other?: number;
}

export interface Property {
  type: 'rental' | 'vacation' | 'investment';
  address: string;
  value: number;
  mortgage?: number;
  rentalIncome?: number;
}

export interface Debts {
  studentLoan?: number;
  personalLoans?: number;
  businessLoans?: number;
  other?: number;
}

// =============================================================================
// Deductions & Credits
// =============================================================================

export interface DeductionsInfo {
  mortgage?: MortgageDeduction;
  healthcare?: HealthcareDeduction;
  gifts?: GiftsDeduction;
  workRelated?: WorkRelatedDeduction;
  selfEmployment?: SelfEmploymentDeduction;
}

export interface MortgageDeduction {
  hasMortgage: boolean;
  interestPaid?: number;
  propertyValue?: number;
}

export interface HealthcareDeduction {
  deductibleMedicalExpenses?: number;
  specificCareCosts?: number;
}

export interface GiftsDeduction {
  annualCharitableDonations?: number;
  anbiRegistered?: boolean;
}

export interface WorkRelatedDeduction {
  homeOffice?: boolean;
  professionalDevelopment?: number;
  travelExpenses?: number;
  equipmentCosts?: number;
}

export interface SelfEmploymentDeduction {
  zelfstandigenaftrekEligible: boolean;
  startersaftrekEligible: boolean;
  hoursWorked?: number;
  mkbWinstvrijstellingEligible: boolean;
}

// =============================================================================
// Recurring Payments
// =============================================================================

export interface RecurringPayments {
  monthly: PaymentItem[];
  quarterly: PaymentItem[];
  annual: PaymentItem[];
}

export interface PaymentItem {
  id: string;
  description: string;
  amount: number | 'variable';
  dueDate: string | number; // Day of month or specific date
  autoPay: boolean;
  category: 'rent' | 'utilities' | 'insurance' | 'subscription' | 'tax' | 'other';
}

// =============================================================================
// Parsed Markdown Result
// =============================================================================

export interface ParsedPersonalData {
  profile: PersonalProfile;
  raw: string;
  warnings: string[];
  errors: string[];
}
