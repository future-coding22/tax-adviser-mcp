import type { ResourceHandler, MCPResource, ResourceContent } from './index.js';
import { personalProfileLoader } from '../context/personal-loader.js';

/**
 * Personal profile resource handler
 * Exposes user's financial profile as MCP resource
 */
export class PersonalProfileResource implements ResourceHandler {
  private profilePath: string = './data/personal.md';

  /**
   * Set profile path (for testing or custom locations)
   */
  setProfilePath(path: string): void {
    this.profilePath = path;
  }

  /**
   * List available personal profile resources
   */
  async list(): Promise<MCPResource[]> {
    return [
      {
        uri: 'personal://profile',
        name: 'Personal Financial Profile',
        description: 'Your complete financial profile including income, assets, deductions, and recurring payments',
        mimeType: 'application/json',
      },
      {
        uri: 'personal://profile/raw',
        name: 'Personal Financial Profile (Raw)',
        description: 'Raw markdown content of your personal.md file',
        mimeType: 'text/markdown',
      },
    ];
  }

  /**
   * Read personal profile resource
   */
  async read(uri: string): Promise<ResourceContent> {
    try {
      const parsed = personalProfileLoader.load(this.profilePath);

      if (uri === 'personal://profile/raw') {
        // Return raw markdown
        return {
          uri,
          mimeType: 'text/markdown',
          content: parsed.raw,
        };
      }

      // Return structured JSON
      return {
        uri,
        mimeType: 'application/json',
        content: {
          profile: this.sanitizeProfile(parsed.profile),
          metadata: {
            lastUpdated: parsed.profile.metadata.lastUpdated,
            taxYear: parsed.profile.metadata.taxYear,
          },
          warnings: parsed.warnings,
          errors: parsed.errors,
        },
      };
    } catch (error) {
      throw new Error(
        `Failed to read personal profile: ${error instanceof Error ? error.message : 'Unknown error'}`
      );
    }
  }

  /**
   * Sanitize profile (remove sensitive data if configured)
   */
  private sanitizeProfile(profile: any): any {
    // For now, return as-is
    // In production, could mask BSN, account numbers, etc. based on config
    return profile;
  }
}
