/**
 * Tax calculation and Dutch tax system types
 */

// =============================================================================
// Dutch Tax Rules
// =============================================================================

export interface DutchTaxRules {
  taxYear: number;
  lastUpdated: string;
  incomeTax: IncomeTaxRules;
  box3: Box3Rules;
  btw: BTWRules;
  selfEmployment: SelfEmploymentRules;
  deadlines: TaxDeadlines;
  deductionLimits: DeductionLimits;
}

export interface IncomeTaxRules {
  box1Brackets: TaxBracket[];
  generalCredit: TaxCreditRules;
  laborCredit: LaborCreditRules;
}

export interface TaxBracket {
  from: number;
  to: number | null; // null means no upper limit
  rate: number; // Percentage (e.g., 36.97)
}

export interface TaxCreditRules {
  max: number;
  phaseOutStart: number;
  phaseOutRate: number; // Percentage
}

export interface LaborCreditRules {
  max: number;
  brackets: {
    from: number;
    to: number | null;
    rate: number; // Percentage or fixed amount calculation
  }[];
  phaseOutStart: number;
  phaseOutRate: number;
}

export interface Box3Rules {
  exemption: number;
  exemptionPartners: number;
  deemedReturnBrackets: DeemedReturnBracket[];
  taxRate: number; // Flat rate (e.g., 32%)
}

export interface DeemedReturnBracket {
  from: number;
  to: number | null;
  savingsRate: number; // Percentage
  investmentRate: number; // Percentage
}

export interface BTWRules {
  standardRate: number; // 21%
  reducedRate: number; // 9%
  zeroRateApplies: string[];
  smallBusinessThreshold: number; // KOR threshold
}

export interface SelfEmploymentRules {
  zelfstandigenaftrek: number;
  startersaftrek: number;
  mkbVrijstelling: number; // Percentage (13.31%)
  hoursRequirement: number; // 1,225 hours
}

export interface TaxDeadlines {
  incomeTaxFiling: string; // ISO date or "May 1"
  incomeTaxExtension: string;
  btwQuarterly: string[];
  provisionalAssessment: string[];
}

export interface DeductionLimits {
  giftsMinimum: number;
  giftsMaximumPercentage: number;
  medicalThresholdPercentage: number;
  mortgageInterestMaxPercentage: number;
}

// =============================================================================
// Tax Calculation Results
// =============================================================================

export interface TaxCalculationResult {
  year: number;
  box1: Box1Calculation;
  box2?: Box2Calculation;
  box3?: Box3Calculation;
  btw?: BTWCalculation;
  totalEstimatedTax: number;
  alreadyPaid: number;
  remainingDue: number;
  effectiveRate: number; // Percentage
  breakdown?: string; // Human-readable explanation
}

export interface Box1Calculation {
  grossIncome: number;
  deductions: TaxDeduction[];
  taxableIncome: number;
  taxBeforeCredits: number;
  credits: TaxCredit[];
  taxDue: number;
}

export interface Box2Calculation {
  dividendIncome: number;
  taxDue: number;
}

export interface Box3Calculation {
  assets: number;
  debts: number;
  netAssets: number;
  exemption: number;
  taxableBase: number;
  deemedReturn: number;
  taxDue: number;
  breakdown?: Box3Breakdown;
}

export interface Box3Breakdown {
  savingsPortion: number;
  investmentPortion: number;
  savingsReturn: number;
  investmentReturn: number;
}

export interface BTWCalculation {
  estimatedRevenue: number;
  estimatedBTWCollected: number;
  estimatedBTWPaid: number;
  estimatedBTWDue: number;
}

export interface TaxDeduction {
  name: string;
  amount: number;
  category: string;
}

export interface TaxCredit {
  name: string;
  amount: number;
  category: string;
}

// =============================================================================
// Tax Obligations
// =============================================================================

export interface TaxObligation {
  taxType: string;
  dutchName: string;
  description: string;
  appliesBecause: string;
  estimatedAmount?: number;
  filingDeadline: string; // ISO date
  paymentDeadline: string; // ISO date
  frequency: 'annual' | 'quarterly' | 'monthly';
  status: 'upcoming' | 'due_soon' | 'overdue' | 'filed';
}

export interface TaxObligationsSummary {
  obligations: TaxObligation[];
  summary: {
    totalEstimated: number;
    nextDeadline: string;
    actionRequired: string[];
  };
}

// =============================================================================
// Upcoming Dues
// =============================================================================

export interface DueItem {
  id: string;
  description: string;
  amount: number | 'variable';
  dueDate: string; // ISO date
  daysUntil: number;
  category: 'tax' | 'bill' | 'subscription';
  autoPay: boolean;
  actionRequired: boolean;
  reminderSent: boolean;
}

export interface UpcomingDues {
  dues: DueItem[];
  totals: {
    fixed: number;
    variableEstimated: number;
    autoPay: number;
    manualPay: number;
  };
}
