import { readFileSync, existsSync } from 'fs';
import { resolve } from 'path';
import matter from 'gray-matter';
import type { PersonalProfile, ParsedPersonalData } from '../types/index.js';

/**
 * Parse personal.md file into structured data
 */
export class PersonalProfileLoader {
  /**
   * Load and parse personal.md file
   * @param filePath - Path to personal.md
   * @returns Parsed personal profile data
   */
  load(filePath: string): ParsedPersonalData {
    const absolutePath = resolve(filePath);

    if (!existsSync(absolutePath)) {
      throw new Error(
        `Personal data file not found: ${absolutePath}\n` +
          'Please copy data/personal.example.md to data/personal.md and fill in your information.'
      );
    }

    try {
      const fileContents = readFileSync(absolutePath, 'utf-8');
      return this.parse(fileContents);
    } catch (error) {
      if (error instanceof Error) {
        throw new Error(`Failed to load personal data: ${error.message}`);
      }
      throw error;
    }
  }

  /**
   * Parse markdown content with frontmatter
   * @param content - Raw markdown content
   * @returns Parsed data with profile, warnings, and errors
   */
  parse(content: string): ParsedPersonalData {
    const warnings: string[] = [];
    const errors: string[] = [];

    try {
      // Parse YAML frontmatter
      const { data: frontmatter, content: markdown } = matter(content);

      // Initialize profile with metadata
      const profile: PersonalProfile = {
        metadata: {
          lastUpdated: this.parseDate(frontmatter.last_updated),
          taxYear: frontmatter.tax_year || new Date().getFullYear(),
        },
        basicInfo: this.parseBasicInfo(markdown, warnings),
        income: this.parseIncome(markdown, warnings),
        assets: this.parseAssets(markdown, warnings),
        deductions: this.parseDeductions(markdown, warnings),
        recurringPayments: this.parseRecurringPayments(markdown, warnings),
        notes: this.parseNotes(markdown),
      };

      return {
        profile,
        raw: content,
        warnings,
        errors,
      };
    } catch (error) {
      errors.push(error instanceof Error ? error.message : 'Unknown parsing error');
      throw new Error(`Failed to parse personal data: ${errors.join(', ')}`);
    }
  }

  /**
   * Parse basic information section
   */
  private parseBasicInfo(markdown: string, _warnings: string[]): PersonalProfile['basicInfo'] {
    const basicInfo: PersonalProfile['basicInfo'] = {
      taxPartner: false,
      thirtyPercentRuling: false,
    };

    // Extract basic info (simplified - will be enhanced in Phase 3)
    const residentMatch = markdown.match(/\*\*Resident since\*\*:\s*(\d{4})/);
    if (residentMatch) {
      basicInfo.residentSince = parseInt(residentMatch[1]);
    }

    const bsnMatch = markdown.match(/\*\*BSN\*\*:\s*(.+)/);
    if (bsnMatch && !bsnMatch[1].includes('[Your BSN')) {
      basicInfo.bsn = bsnMatch[1].trim();
    }

    const partnerMatch = markdown.match(/\*\*Tax partner\*\*:\s*(Yes|No)/i);
    if (partnerMatch) {
      basicInfo.taxPartner = partnerMatch[1].toLowerCase() === 'yes';
    }

    const rulingMatch = markdown.match(/\*\*30% ruling\*\*:\s*(Yes|No)/i);
    if (rulingMatch) {
      basicInfo.thirtyPercentRuling = rulingMatch[1].toLowerCase() === 'yes';
    }

    return basicInfo;
  }

  /**
   * Parse income section
   */
  private parseIncome(markdown: string, _warnings: string[]): PersonalProfile['income'] {
    const income: PersonalProfile['income'] = {};

    // Employment income
    const salaryMatch = markdown.match(/\*\*Gross annual salary\*\*:\s*€([\d,]+)/);
    if (salaryMatch) {
      const employerMatch = markdown.match(/\*\*Employer\*\*:\s*(.+)/);
      income.employment = {
        employer: employerMatch ? employerMatch[1].trim() : 'Unknown',
        grossAnnualSalary: this.parseAmount(salaryMatch[1]),
      };
    }

    // Freelance income
    const revenueMatch = markdown.match(/\*\*Estimated annual revenue\*\*:\s*€([\d,]+)/);
    if (revenueMatch) {
      const kvkMatch = markdown.match(/\*\*KVK number\*\*:\s*(\d+)/);
      const btwMatch = markdown.match(/\*\*BTW number\*\*:\s*(NL\d+B\d+)/);
      const typeMatch = markdown.match(/\*\*Business type\*\*:\s*(.+)/);

      income.freelance = {
        registered: true,
        estimatedAnnualRevenue: this.parseAmount(revenueMatch[1]),
        businessType: typeMatch ? typeMatch[1].trim() : 'Unknown',
        btwScheme: 'regular',
      };

      if (kvkMatch) income.freelance.kvkNumber = kvkMatch[1];
      if (btwMatch) income.freelance.btwNumber = btwMatch[1];
    }

    // Other income (simplified)
    income.other = {};
    const dividendsMatch = markdown.match(/\*\*Dividends\*\*:\s*€([\d,]+)/);
    if (dividendsMatch) {
      income.other.dividends = this.parseAmount(dividendsMatch[1]);
    }

    return income;
  }

  /**
   * Parse assets section (Box 3)
   */
  private parseAssets(markdown: string, _warnings: string[]): PersonalProfile['assets'] {
    const savingsMatch = markdown.match(/\*\*Savings\*\*:\s*€([\d,]+)/);
    const checkingMatch = markdown.match(/\*\*Checking\*\*:\s*~?€([\d,]+)/);
    const stocksMatch = markdown.match(/\*\*Stocks\/ETFs\*\*:\s*€([\d,]+)/);
    const cryptoMatch = markdown.match(/\*\*Crypto\*\*:\s*€([\d,]+)/);
    const studentLoanMatch = markdown.match(/\*\*Student loan\*\*:\s*€([\d,]+)/);

    return {
      bankAccounts: {
        savings: savingsMatch ? this.parseAmount(savingsMatch[1]) : 0,
        checking: checkingMatch ? this.parseAmount(checkingMatch[1]) : 0,
      },
      investments: {
        stocksETFs: stocksMatch ? this.parseAmount(stocksMatch[1]) : 0,
        crypto: cryptoMatch ? this.parseAmount(cryptoMatch[1]) : 0,
      },
      debts: {
        studentLoan: studentLoanMatch ? this.parseAmount(studentLoanMatch[1]) : 0,
      },
    };
  }

  /**
   * Parse deductions section
   */
  private parseDeductions(markdown: string, _warnings: string[]): PersonalProfile['deductions'] {
    const deductions: PersonalProfile['deductions'] = {};

    // Mortgage
    const mortgageMatch = markdown.match(/\*\*Status\*\*:\s*(.+)/);
    deductions.mortgage = {
      hasMortgage: mortgageMatch ? !mortgageMatch[1].includes('Renter') : false,
    };

    // Healthcare
    const medicalMatch = markdown.match(/\*\*Deductible medical expenses\*\*:\s*~?€([\d,]+)/);
    if (medicalMatch) {
      deductions.healthcare = {
        deductibleMedicalExpenses: this.parseAmount(medicalMatch[1]),
      };
    }

    // Gifts
    const giftsMatch = markdown.match(/\*\*Annual charitable donations\*\*:\s*€([\d,]+)/);
    if (giftsMatch) {
      deductions.gifts = {
        annualCharitableDonations: this.parseAmount(giftsMatch[1]),
        anbiRegistered: markdown.includes('ANBI registered'),
      };
    }

    // Self-employment
    const zelfstandigenMatch = markdown.match(/\*\*Zelfstandigenaftrek\*\*:\s*Eligible/);
    if (zelfstandigenMatch) {
      deductions.selfEmployment = {
        zelfstandigenaftrekEligible: true,
        startersaftrekEligible: markdown.includes('Startersaftrek**: Yes'),
        mkbWinstvrijstellingEligible: markdown.includes('MKB-winstvrijstelling'),
      };
    }

    return deductions;
  }

  /**
   * Parse recurring payments section
   * Note: Simplified version - table parsing will be enhanced in Phase 3
   */
  private parseRecurringPayments(
    _markdown: string,
    warnings: string[]
  ): PersonalProfile['recurringPayments'] {
    warnings.push('Recurring payments parsing is simplified in this version');

    return {
      monthly: [],
      quarterly: [],
      annual: [],
    };
  }

  /**
   * Parse notes section
   */
  private parseNotes(markdown: string): string[] {
    const notesMatch = markdown.match(/## Notes\s+([\s\S]+?)(?=##|$)/);
    if (!notesMatch) return [];

    return notesMatch[1]
      .split('\n')
      .filter((line) => line.trim().startsWith('-'))
      .map((line) => line.trim().substring(1).trim());
  }

  /**
   * Helper: Parse date string
   */
  private parseDate(dateStr: string | undefined): Date {
    if (!dateStr) return new Date();
    return new Date(dateStr);
  }

  /**
   * Helper: Parse amount string (removes commas, converts to number)
   */
  private parseAmount(amountStr: string): number {
    return parseFloat(amountStr.replace(/,/g, ''));
  }
}

/**
 * Singleton instance
 */
export const personalProfileLoader = new PersonalProfileLoader();

/**
 * Convenience function to load personal profile
 */
export function loadPersonalProfile(filePath: string = './data/personal.md'): ParsedPersonalData {
  return personalProfileLoader.load(filePath);
}
