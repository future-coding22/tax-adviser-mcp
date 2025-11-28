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
      const mockEntry = {
        query: 'Box 3 tax rates 2024',
        content: 'Box 3 uses deemed return rates...',
        summary: 'Box 3 deemed return info',
        sources: ['https://belastingdienst.nl/box3'],
        category: 'box3',
        taxYear: 2024,
        confidence: 'high' as const,
        tags: ['box3', 'wealth-tax'],
      };

      // Mock file system operations
      vi.spyOn(fs, 'existsSync').mockReturnValue(true);
      vi.spyOn(fs, 'mkdirSync').mockImplementation(() => undefined);
      vi.spyOn(fs, 'writeFileSync').mockImplementation(() => undefined);
      vi.spyOn(fs, 'readFileSync').mockReturnValue(JSON.stringify({ entries: [], version: '1.0' }));

      const result = await service.cacheEntry(mockEntry);

      expect(result.success).toBe(true);
      expect(result.entry).toBeDefined();
      expect(result.entry?.id).toMatch(/^box3-/);
      expect(result.entry?.category).toBe('box3');
    });

    it('should reject low confidence entries when min_confidence is medium', async () => {
      const mockEntry = {
        query: 'Test query',
        content: 'Test content',
        summary: 'Test summary',
        sources: ['http://example.com'],
        category: 'general',
        taxYear: 2024,
        confidence: 'low' as const,
        tags: [],
      };

      const result = await service.cacheEntry(mockEntry);

      expect(result.success).toBe(false);
      expect(result.error).toContain('confidence level');
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
              taxYear: 2024,
            },
            {
              id: 'income-test-1',
              title: 'Income Tax Brackets',
              summary: 'Tax bracket information',
              category: 'income_tax',
              taxYear: 2024,
            },
          ],
        })
      );

      const results = await service.searchLocal({
        query: 'box 3 return',
        limit: 10,
      });

      expect(results).toBeDefined();
      expect(results.length).toBeGreaterThan(0);
      expect(results[0].relevanceScore).toBeGreaterThanOrEqual(0);
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
              category: 'box3',
              taxYear: 2024,
            },
            {
              id: 'income-test-1',
              title: 'Income Test',
              category: 'income_tax',
              taxYear: 2024,
            },
          ],
        })
      );

      const results = await service.searchLocal({
        query: 'tax',
        category: 'box3',
        limit: 10,
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
              category: 'box3',
              confidence: 'high',
              accessCount: 5,
            },
            {
              id: 'income-test-1',
              category: 'income_tax',
              confidence: 'medium',
              accessCount: 3,
            },
          ],
        })
      );

      const stats = await service.getStats();

      expect(stats.totalEntries).toBe(2);
      expect(stats.entriesByCategory).toHaveProperty('box3');
      expect(stats.entriesByCategory).toHaveProperty('income_tax');
      expect(stats.entriesByConfidence).toHaveProperty('high');
      expect(stats.entriesByConfidence).toHaveProperty('medium');
    });
  });
});
