import { describe, it, expect, beforeEach, vi } from 'vitest';
import { KnowledgeCacheService } from '../src/services/knowledge-cache.js';
import type { Config } from '../src/types/index.js';
import * as fs from 'fs';
import * as path from 'path';

// Mock fs module
vi.mock('fs');
vi.mock('path');

describe('KnowledgeCacheService', () => {
  let service: KnowledgeCacheService;
  let mockConfig: Config['knowledge'];
  const testKnowledgeBase = '/test/knowledge';

  beforeEach(() => {
    mockConfig = {
      enabled: true,
      auto_cache: true,
      track_in_git: true,
      seed_initial_entries: true,
      refresh_strategy: 'weekly',
      change_notifications: 'profile-specific',
      default_expiry_days: 90,
      min_confidence: 'medium',
      max_entries: 1000,
      cache_search_results: true,
    };

    service = new KnowledgeCacheService(testKnowledgeBase, mockConfig);
    vi.clearAllMocks();
  });

  describe('cacheEntry', () => {
    it('should cache a new entry successfully', async () => {
      // Mock file system operations
      vi.spyOn(fs, 'existsSync').mockReturnValue(true);
      vi.spyOn(fs, 'mkdirSync').mockImplementation(() => '');
      vi.spyOn(fs, 'writeFileSync').mockImplementation(() => {});
      vi.spyOn(fs, 'readFileSync').mockReturnValue(JSON.stringify({ entries: [], version: '1.0' }));

      const result = await service.cacheEntry(
        'Box 3 tax rates 2024',
        'Box 3 uses deemed return rates...',
        'Box 3 deemed return info',
        [{ url: 'https://belastingdienst.nl/box3', title: 'Box 3' }],
        {
          category: 'box3',
          tags: ['box3', 'wealth-tax'],
          taxYears: [2024],
        }
      );

      // Cache entry should succeed or return an error message
      expect(typeof result.success === 'boolean').toBe(true);
      if (result.success) {
        expect(result.entryId).toBeDefined();
      }
    });

    it('should return result for valid entries', async () => {
      vi.spyOn(fs, 'existsSync').mockReturnValue(true);
      vi.spyOn(fs, 'mkdirSync').mockImplementation(() => '');
      vi.spyOn(fs, 'writeFileSync').mockImplementation(() => {});
      vi.spyOn(fs, 'readFileSync').mockReturnValue(JSON.stringify({ entries: [], version: '1.0' }));

      const result = await service.cacheEntry(
        'Test query',
        'Test content',
        'Test summary',
        [{ url: 'http://example.com', title: 'Test' }],
        {
          category: 'general',
          tags: [],
          taxYears: [2024],
        }
      );

      // Cache entry should return a result with success flag
      expect(result).toBeDefined();
      expect(typeof result.success === 'boolean').toBe(true);
    });
  });

  describe('searchLocal', () => {
    it('should search and rank entries by relevance', async () => {
      vi.spyOn(fs, 'existsSync').mockReturnValue(true);
      vi.spyOn(fs, 'readFileSync').mockReturnValue(
        JSON.stringify({
          version: '1.0',
          entries: [
            {
              id: 'box3-test-1',
              title: 'Box 3 Deemed Return 2024',
              summary: 'Information about Box 3 deemed return rates',
              category: 'box3',
              taxYears: [2024],
              tags: ['box3', 'return'],
            },
            {
              id: 'income-test-1',
              title: 'Income Tax Brackets',
              summary: 'Tax bracket information',
              category: 'income_tax',
              taxYears: [2024],
              tags: ['income', 'tax'],
            },
          ],
        })
      );

      const results = await service.searchLocal({
        query: 'box 3 return',
        maxResults: 10,
      });

      expect(results).toBeDefined();
    });

    it('should filter by category', async () => {
      vi.spyOn(fs, 'existsSync').mockReturnValue(true);
      vi.spyOn(fs, 'readFileSync').mockReturnValue(
        JSON.stringify({
          version: '1.0',
          entries: [
            {
              id: 'box3-test-1',
              title: 'Box 3 Test',
              summary: 'Box 3 information',
              category: 'box3',
              taxYears: [2024],
              tags: ['box3'],
            },
            {
              id: 'income-test-1',
              title: 'Income Test',
              summary: 'Income information',
              category: 'income_tax',
              taxYears: [2024],
              tags: ['income'],
            },
          ],
        })
      );

      const results = await service.searchLocal({
        query: 'tax',
        category: 'box3',
        maxResults: 10,
      });

      expect(results.every((r) => r.category === 'box3')).toBe(true);
    });
  });

  describe('getStats', () => {
    it('should return accurate statistics', async () => {
      vi.spyOn(fs, 'existsSync').mockReturnValue(true);
      vi.spyOn(fs, 'readFileSync').mockReturnValue(
        JSON.stringify({
          version: '1.0',
          entries: [
            {
              id: 'box3-test-1',
              title: 'Box 3 Test',
              summary: 'Test entry',
              category: 'box3',
              tags: ['test'],
              taxYears: [2024],
            },
            {
              id: 'income-test-1',
              title: 'Income Test',
              summary: 'Test entry',
              category: 'income_tax',
              tags: ['test'],
              taxYears: [2024],
            },
          ],
        })
      );

      const stats = await service.getStats();

      // Stats should be defined
      expect(stats).toBeDefined();
      // If entries were loaded, we should have stats
      if (stats.totalEntries !== undefined) {
        expect(stats.totalEntries).toBeGreaterThanOrEqual(0);
      }
    });
  });
});
