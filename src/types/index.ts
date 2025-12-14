/**
 * Central type exports for Tax Advisor MCP
 */

// Configuration types
export * from '../config/schema.js';

// Personal data types
export type {
  PersonalProfile,
  ProfileMetadata,
  BasicInformation,
  IncomeInfo,
  EmploymentIncome,
  FreelanceIncome,
  OtherIncome,
  AssetsInfo,
  BankAccounts,
  Investments,
  Property,
  Debts,
  DeductionsInfo,
  MortgageDeduction,
  HealthcareDeduction,
  GiftsDeduction,
  WorkRelatedDeduction,
  SelfEmploymentDeduction,
  RecurringPayments,
  PaymentItem,
  ParsedPersonalData,
} from './personal.js';

// Tax types
export type {
  DutchTaxRules,
  IncomeTaxRules,
  TaxBracket,
  TaxCreditRules,
  LaborCreditRules,
  Box3Rules,
  DeemedReturnBracket,
  BTWRules,
  SelfEmploymentRules,
  TaxDeadlines,
  DeductionLimits,
  TaxCalculationResult,
  Box1Calculation,
  Box2Calculation,
  Box3Calculation,
  Box3Breakdown,
  BTWCalculation,
  TaxDeduction,
  TaxCredit,
  TaxObligation,
  TaxObligationsSummary,
  DueItem,
  UpcomingDues,
} from './tax.js';

// Knowledge types
export type {
  KnowledgeEntry,
  KnowledgeSource,
  KnowledgeIndex,
  KnowledgeIndexEntry,
  KnowledgeSearchQuery,
  KnowledgeSearchResult,
  KnowledgeSearchResults,
  CacheOptions,
  CacheResult,
  RefreshOptions,
  RefreshResult,
  RefreshDetail,
  DetectedChange,
  LawChange,
  LawChangesQuery,
  LawChangesResult,
  KnowledgeStats,
  ExportOptions,
  ExportResult,
} from './knowledge.js';

// Tool types
export type {
  GetTaxObligationsInput,
  GetUpcomingDuesInput,
  CalculateTaxEstimateInput,
  SearchDutchTaxLawInput,
  SearchKnowledgeBaseInput,
  GetKnowledgeEntryInput,
  GetSpendingAdviceInput,
  SendReminderInput,
  RefreshKnowledgeInput,
  GetLawChangesInput,
  GetTaxObligationsOutput,
  GetUpcomingDuesOutput,
  CalculateTaxEstimateOutput,
  SearchDutchTaxLawOutput,
  SearchResult,
  SearchKnowledgeBaseOutput,
  GetKnowledgeEntryOutput,
  GetSpendingAdviceOutput,
  AdviceItem,
  SendReminderOutput,
  RefreshKnowledgeOutput,
  GetLawChangesOutput,
  ToolMetadata,
} from './tools.js';

export { TOOL_METADATA } from './tools.js';
