/**
 * Dutch Tax Knowledge Implementation
 *
 * Implements ITaxKnowledge interface for Netherlands tax system.
 * Uses glossary system and existing Dutch tax calculation logic.
 */

import { DutchTaxKnowledge as LegacyDutchTaxKnowledge } from '../context/dutch-tax-knowledge.js';
import { GlossaryLoader } from '../services/glossary-loader.js';
import {
  ITaxKnowledge,
  TaxCalculationResult,
  TaxObligation,
  PersonalTaxProfile,
} from './ITaxKnowledge.js';
import {
  TaxBracket,
  TaxCredit,
  Deduction,
  VATRates,
  SelfEmploymentRules,
  TaxDeadline,
  BusinessStructure,
  CountryInfo,
  TaxAuthority,
} from '../types/glossary.js';

/**
 * Dutch implementation of ITaxKnowledge
 */
export class DutchTaxKnowledge implements ITaxKnowledge {
  private glossary: GlossaryLoader;
  private legacy: LegacyDutchTaxKnowledge;
  private countryCode = 'NL';

  constructor(glossaryLoader: GlossaryLoader, taxRulesPath: string) {
    this.glossary = glossaryLoader;
    this.legacy = new LegacyDutchTaxKnowledge(taxRulesPath);
  }

  async getCountryInfo(): Promise<CountryInfo> {
    return await this.glossary.getCountryInfo(this.countryCode);
  }

  async getTaxAuthority(): Promise<TaxAuthority> {
    return await this.glossary.getTaxAuthority(this.countryCode);
  }

  async getIncomeTaxBrackets(year: number): Promise<TaxBracket[]> {
    const rules = this.legacy.getRules();
    return rules.income_tax.box1_brackets.map(bracket => ({
      from: bracket.from,
      to: bracket.to,
      rate: bracket.rate,
    }));
  }

  async calculateIncomeTax(income: number, year: number): Promise<number> {
    return this.legacy.calculateBox1Tax(income);
  }

  async getTaxCredits(profile: PersonalTaxProfile, year: number): Promise<TaxCredit[]> {
    const credits: TaxCredit[] = [];
    const totalIncome = (profile.employmentIncome || 0) + (profile.businessIncome || 0);

    // General tax credit (Algemene heffingskorting)
    const generalCredit = this.legacy.calculateGeneralCredit(totalIncome);
    if (generalCredit > 0) {
      credits.push({
        name: 'Algemene heffingskorting',
        amount: generalCredit,
        description: 'General tax credit available to all taxpayers',
        concept_id: 'general_tax_credit',
      });
    }

    // Labor tax credit (Arbeidskorting)
    const laborIncome = (profile.employmentIncome || 0) + (profile.businessIncome || 0);
    if (laborIncome > 0) {
      const laborCredit = this.legacy.calculateLaborCredit(laborIncome);
      if (laborCredit > 0) {
        credits.push({
          name: 'Arbeidskorting',
          amount: laborCredit,
          description: 'Labor tax credit for employment income',
          concept_id: 'labor_tax_credit',
        });
      }
    }

    return credits;
  }

  async getTaxDeductions(profile: PersonalTaxProfile, year: number): Promise<Deduction[]> {
    const deductions: Deduction[] = [];

    // Self-employment deductions
    if (profile.selfEmployed && profile.businessHours && profile.businessHours >= 1225) {
      const zelfstandigenaftrek = this.legacy.getZelfstandigenaftrek();
      deductions.push({
        name: 'Zelfstandigenaftrek',
        amount: zelfstandigenaftrek,
        description: 'Self-employment deduction (requires 1,225 hours)',
        concept_id: 'business_expenses',
      });

      // Startersaftrek (if applicable)
      const startersaftrek = this.legacy.getStartersaftrek();
      if (startersaftrek > 0 && profile.yearsInBusiness && profile.yearsInBusiness <= 3) {
        deductions.push({
          name: 'Startersaftrek',
          amount: startersaftrek,
          description: "Starter's deduction for new entrepreneurs (first 3 years)",
          concept_id: 'business_expenses',
        });
      }
    }

    // MKB profit exemption
    if (profile.businessIncome && profile.businessIncome > 0) {
      const mkbPercentage = this.legacy.getMKBVrijstelling();
      const mkbAmount = profile.businessIncome * (mkbPercentage / 100);
      deductions.push({
        name: 'MKB-winstvrijstelling',
        amount: mkbAmount,
        description: `SME profit exemption (${mkbPercentage}%)`,
        concept_id: 'business_expenses',
      });
    }

    // Mortgage interest deduction
    if (profile.homeOwnership?.mortgageInterest) {
      const limits = this.legacy.getDeductionLimits();
      const deductibleInterest = Math.min(
        profile.homeOwnership.mortgageInterest,
        limits.mortgage_interest?.max || profile.homeOwnership.mortgageInterest
      );
      if (deductibleInterest > 0) {
        deductions.push({
          name: 'Hypotheekrenteaftrek',
          amount: deductibleInterest,
          description: 'Mortgage interest deduction',
          concept_id: 'mortgage_interest_deduction',
        });
      }
    }

    return deductions;
  }

  async calculateTotalTax(profile: PersonalTaxProfile, year: number): Promise<TaxCalculationResult> {
    const totalIncome = (profile.employmentIncome || 0) + (profile.businessIncome || 0);

    // Get deductions and credits
    const deductions = await this.getTaxDeductions(profile, year);
    const credits = await this.getTaxCredits(profile, year);

    const totalDeductions = deductions.reduce((sum, d) => sum + d.amount, 0);
    const totalCredits = credits.reduce((sum, c) => sum + c.amount, 0);

    // Calculate Box 1 income tax
    const taxableIncome = Math.max(0, totalIncome - totalDeductions);
    const grossTax = await this.calculateIncomeTax(taxableIncome, year);
    const netIncomeTax = Math.max(0, grossTax - totalCredits);

    // Calculate Box 3 wealth tax
    const assets = profile.assets || 0;
    const debts = profile.debts || 0;
    const box3Result = this.legacy.calculateBox3Tax(assets, debts, 50, false);

    // Total tax
    const totalTax = netIncomeTax + box3Result.tax;

    // Calculate rates
    const effectiveRate = totalIncome > 0 ? (totalTax / totalIncome) * 100 : 0;
    const bracket = this.legacy.getTaxBracket(taxableIncome);
    const marginalRate = bracket.rate;

    return {
      totalTax,
      breakdown: {
        incomeTax: netIncomeTax,
        wealthTax: box3Result.tax,
      },
      credits,
      deductions,
      effectiveRate,
      marginalRate,
      details: {
        box1: {
          grossIncome: totalIncome,
          taxableIncome,
          grossTax,
          netTax: netIncomeTax,
        },
        box3: {
          assets,
          debts,
          netAssets: assets - debts,
          taxableBase: box3Result.taxableBase,
          deemedReturn: box3Result.deemedReturn,
          tax: box3Result.tax,
        },
      },
    };
  }

  async getVATRates(year: number): Promise<VATRates> {
    const rates = this.legacy.getBTWRates();
    return {
      standard: rates.standard,
      reduced: rates.reduced,
      zero: rates.zero,
    };
  }

  async calculateVAT(
    amount: number,
    rate: 'standard' | 'reduced' | 'zero',
    year: number
  ): Promise<number> {
    const rates = await this.getVATRates(year);
    const vatRate = rates[rate];
    return (amount * vatRate) / (100 + vatRate);
  }

  async getSelfEmploymentRules(year: number): Promise<SelfEmploymentRules> {
    const zelfstandigenaftrek = this.legacy.getZelfstandigenaftrek();
    const startersaftrek = this.legacy.getStartersaftrek();
    const hoursRequirement = this.legacy.getHoursRequirement();
    const mkbPercentage = this.legacy.getMKBVrijstelling();

    return {
      deductions: [
        {
          name: 'Zelfstandigenaftrek',
          amount: zelfstandigenaftrek,
          description: 'Self-employment deduction',
          concept_id: 'business_expenses',
        },
        {
          name: 'Startersaftrek',
          amount: startersaftrek,
          description: "Starter's deduction (first 3 years)",
          concept_id: 'business_expenses',
        },
        {
          name: 'MKB-winstvrijstelling',
          amount: mkbPercentage,
          description: 'SME profit exemption (percentage of profit)',
          concept_id: 'business_expenses',
        },
      ],
      required_hours: hoursRequirement,
      small_business_schemes: ['Kleineondernemersregeling (KOR)'],
    };
  }

  async getTaxObligations(profile: PersonalTaxProfile, year: number): Promise<TaxObligation[]> {
    const obligations: TaxObligation[] = [];
    const glossary = await this.glossary.loadCountryGlossary(this.countryCode);
    const deadlines = glossary.calendar?.deadlines || [];

    // Income tax (everyone)
    obligations.push({
      id: 'income_tax',
      name: 'Inkomstenbelasting',
      translation: 'Income Tax',
      description: 'Annual income tax return (Box 1, 2, 3)',
      applicable: true,
      deadlines: deadlines.filter(d => d.concept_id === 'annual_tax_return'),
    });

    // VAT (if self-employed with VAT number)
    if (profile.selfEmployed && profile.vatRegistered) {
      obligations.push({
        id: 'vat',
        name: 'BTW-aangifte',
        translation: 'VAT Return',
        description: 'Quarterly VAT return',
        applicable: true,
        deadlines: deadlines.filter(d => d.concept_id === 'quarterly_vat_return'),
        rates: await this.getVATRates(year),
      });
    }

    // Social security (AOW/ANW)
    obligations.push({
      id: 'social_security',
      name: 'AOW/ANW premies',
      translation: 'Social Security Contributions',
      description: 'Included in income tax (Box 1)',
      applicable: true,
      deadlines: [],
    });

    // Health insurance
    obligations.push({
      id: 'health_insurance_mandatory',
      name: 'Zorgverzekering',
      translation: 'Health Insurance',
      description: 'Mandatory health insurance for all residents',
      applicable: true,
      deadlines: [],
    });

    return obligations;
  }

  async getTaxDeadlines(year: number): Promise<TaxDeadline[]> {
    const glossary = await this.glossary.loadCountryGlossary(this.countryCode);
    return glossary.calendar?.deadlines || [];
  }

  async getBusinessStructures(): Promise<BusinessStructure[]> {
    const glossary = await this.glossary.loadCountryGlossary(this.countryCode);
    return glossary.business_structures || [];
  }

  async searchTaxTerms(query: string): Promise<Array<{
    term: string;
    translation: string;
    description: string;
    conceptId: string;
  }>> {
    const glossary = await this.glossary.loadCountryGlossary(this.countryCode);
    const searchLower = query.toLowerCase();

    return glossary.terms
      .filter(t =>
        t.local_term.toLowerCase().includes(searchLower) ||
        t.translation.toLowerCase().includes(searchLower) ||
        t.contextual_meaning.toLowerCase().includes(searchLower) ||
        t.search_terms.some(s => s.toLowerCase().includes(searchLower))
      )
      .map(t => ({
        term: t.local_term,
        translation: t.translation,
        description: t.contextual_meaning,
        conceptId: t.concept_id,
      }));
  }

  async getTaxConceptInfo(conceptId: string): Promise<{
    localTerm: string;
    translation: string;
    description: string;
    officialPage?: string;
    currentValues?: any;
    warnings?: string[];
  } | null> {
    const glossary = await this.glossary.loadCountryGlossary(this.countryCode);
    const term = glossary.terms.find(t => t.concept_id === conceptId);

    if (!term) {
      return null;
    }

    return {
      localTerm: term.local_term,
      translation: term.translation,
      description: term.contextual_meaning,
      officialPage: term.official_page,
      currentValues: term.current_values,
      warnings: term.warnings,
    };
  }

  async estimateTaxRefund(
    profile: PersonalTaxProfile,
    taxesPaid: number,
    year: number
  ): Promise<{ refund: number; payment: number; net: number }> {
    const calculation = await this.calculateTotalTax(profile, year);
    const difference = taxesPaid - calculation.totalTax;

    return {
      refund: Math.max(0, difference),
      payment: Math.max(0, -difference),
      net: difference,
    };
  }

  async getTaxPlanningSuggestions(profile: PersonalTaxProfile, year: number): Promise<string[]> {
    const suggestions: string[] = [];
    const totalIncome = (profile.employmentIncome || 0) + (profile.businessIncome || 0);

    // Self-employment hours
    if (profile.selfEmployed && profile.businessHours && profile.businessHours < 1225) {
      const hoursNeeded = 1225 - profile.businessHours;
      suggestions.push(
        `You need ${hoursNeeded} more hours to qualify for zelfstandigenaftrek (€${this.legacy.getZelfstandigenaftrek()} deduction). Track your business hours carefully.`
      );
    }

    // Box 3 optimization
    const assets = profile.assets || 0;
    const debts = profile.debts || 0;
    const box3Result = this.legacy.calculateBox3Tax(assets, debts, 50, false);
    if (box3Result.tax > 1000) {
      suggestions.push(
        `Your Box 3 wealth tax is €${Math.round(box3Result.tax)}. Consider using debts strategically to reduce net assets, or consult about optimal asset allocation.`
      );
    }

    // VAT small business scheme
    if (profile.selfEmployed && !profile.vatRegistered && profile.estimatedRevenue && profile.estimatedRevenue < 20000) {
      suggestions.push(
        'You may be eligible for Kleineondernemersregeling (KOR) - VAT exemption for small businesses with revenue below €20,000.'
      );
    }

    // High effective rate
    const calculation = await this.calculateTotalTax(profile, year);
    if (calculation.effectiveRate > 40) {
      suggestions.push(
        `Your effective tax rate is ${calculation.effectiveRate.toFixed(1)}%. Consider maximizing pension contributions and business deductions to reduce taxable income.`
      );
    }

    // Mortgage interest
    if (profile.homeOwnership?.mortgageDebt && !profile.homeOwnership.mortgageInterest) {
      suggestions.push(
        'If you have a mortgage, make sure to claim the mortgage interest deduction (hypotheekrenteaftrek) in Box 1.'
      );
    }

    return suggestions;
  }

  async validateProfile(profile: PersonalTaxProfile): Promise<{
    valid: boolean;
    errors: string[];
    warnings: string[];
  }> {
    const errors: string[] = [];
    const warnings: string[] = [];

    // Check for negative values
    if (profile.employmentIncome && profile.employmentIncome < 0) {
      errors.push('Employment income cannot be negative');
    }
    if (profile.businessIncome && profile.businessIncome < 0) {
      errors.push('Business income cannot be negative');
    }
    if (profile.assets && profile.assets < 0) {
      errors.push('Assets cannot be negative');
    }
    if (profile.debts && profile.debts < 0) {
      errors.push('Debts cannot be negative');
    }

    // Check self-employment consistency
    if (profile.selfEmployed) {
      if (!profile.businessHours) {
        warnings.push('Business hours not specified - required for zelfstandigenaftrek');
      } else if (profile.businessHours < 1225) {
        warnings.push('Business hours below 1,225 - will not qualify for zelfstandigenaftrek');
      }

      if (!profile.businessIncome) {
        warnings.push('Self-employed but no business income specified');
      }
    }

    // Check VAT registration consistency
    if (profile.vatRegistered && !profile.selfEmployed) {
      warnings.push('VAT registered but not marked as self-employed');
    }

    return {
      valid: errors.length === 0,
      errors,
      warnings,
    };
  }
}
