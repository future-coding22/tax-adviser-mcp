import { readFileSync, existsSync } from 'fs';
import { resolve } from 'path';
import matter from 'gray-matter';
import type { PersonalProfile, ParsedPersonalData } from '../types/index.js';
import type { PaymentItem } from '../types/personal.js';

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
   */
  private parseRecurringPayments(
    markdown: string,
    warnings: string[]
  ): PersonalProfile['recurringPayments'] {
    const recurringPayments: PersonalProfile['recurringPayments'] = {
      monthly: [],
      quarterly: [],
      annual: [],
    };

    const monthlyTable = this.extractTable(markdown, '### Monthly');
    if (monthlyTable) {
      recurringPayments.monthly = this.parseMarkdownTable(monthlyTable, warnings);
    } else {
      warnings.push('Monthly recurring payments table not found or malformed.');
    }

    const quarterlyTable = this.extractTable(markdown, '### Quarterly');
    if (quarterlyTable) {
      recurringPayments.quarterly = this.parseMarkdownTable(quarterlyTable, warnings);
    } else {
      warnings.push('Quarterly recurring payments table not found or malformed.');
    }

    const annualTable = this.extractTable(markdown, '### Annual');
    if (annualTable) {
      recurringPayments.annual = this.parseMarkdownTable(annualTable, warnings);
    } else {
      warnings.push('Annual recurring payments table not found or malformed.');
    }

    return recurringPayments;
  }

  /**
   * Helper: Extract a markdown table following a heading
   */
  private extractTable(markdown: string, heading: string): string | null {
    const regex = new RegExp(`${heading}\\s*\\n\\|(.+)\\|\\n\\|(.+)\\|\\n((?:\\|.*\\|\\n)*)`, 'm');
    const match = markdown.match(regex);
    if (match) {
      return `|${match[1]}|\n|${match[2]}|\n${match[3]}`;
    }
    return null;
  }

  /**
   * Helper: Parse a markdown table into PaymentItem[]
   */
  private parseMarkdownTable(tableMarkdown: string, warnings: string[]): PaymentItem[] {
    const lines = tableMarkdown.trim().split('\n');
    if (lines.length < 2) return []; // Need at least header and separator

    const header = lines[0].split('|').map(h => h.trim().toLowerCase()).filter(h => h);
    const dataRows = lines.slice(2); // Skip header and separator line

    const payments: PaymentItem[] = [];

    for (const row of dataRows) {
      const cells = row.split('|').map(c => c.trim()).filter(c => c);
      if (cells.length !== header.length) {
        warnings.push(`Skipping malformed row in recurring payments table: ${row}`);
        continue;
      }

      const payment: Partial<PaymentItem> = {};
      for (let i = 0; i < header.length; i++) {
        const key = header[i];
        const value = cells[i];

        switch (key) {
          case 'item':
            payment.description = value;
            break;
          case 'amount':
            payment.amount = value.startsWith('€') ? this.parseAmount(value.substring(1)) : value as 'variable';
            break;
          case 'due date':
            payment.dueDate = value; // Can be '1st', '15th', or 'May 1' etc. - keep as string for now
            break;
          case 'auto-pay':
            payment.autoPay = value.toLowerCase() === 'yes';
            break;
          case 'category': // This column isn't in personal.md example, so default to 'other'
            payment.category = value.toLowerCase() as PaymentItem['category'];
            break;
        }
      }

      if (payment.description && payment.amount !== undefined && payment.dueDate) {
        // Assign a default category if not present in markdown
        if (!payment.category) {
            if (payment.description.toLowerCase().includes('rent')) payment.category = 'rent';
            else if (payment.description.toLowerCase().includes('insurance') || payment.description.toLowerCase().includes('zorgverzekering')) payment.category = 'insurance';
            else if (payment.description.toLowerCase().includes('utilities') || payment.description.toLowerCase().includes('vattenfall')) payment.category = 'utilities';
            else if (payment.description.toLowerCase().includes('internet') || payment.description.toLowerCase().includes('kpn')) payment.category = 'utilities';
            else if (payment.description.toLowerCase().includes('phone')) payment.category = 'utilities';
            else if (payment.description.toLowerCase().includes('btw')) payment.category = 'tax';
            else if (payment.description.toLowerCase().includes('tax')) payment.category = 'tax';
            else if (payment.description.toLowerCase().includes('municipal taxes') || payment.description.toLowerCase().includes('gemeentebelasting')) payment.category = 'tax';
            else if (payment.description.toLowerCase().includes('water board tax') || payment.description.toLowerCase().includes('waterschapsbelasting')) payment.category = 'tax';
            else payment.category = 'other';
        }

        payments.push({
          id: `${payment.description}-${payment.dueDate}`,
          description: payment.description,
          amount: payment.amount,
          dueDate: payment.dueDate,
          autoPay: payment.autoPay || false,
          category: payment.category,
        });
      } else {
        warnings.push(`Skipping incomplete payment item: ${JSON.stringify(payment)}`);
      }
    }

    return payments;
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
