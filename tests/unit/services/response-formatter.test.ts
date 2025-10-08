/**
 * Tests for response formatting and pagination
 */

import { describe, it, expect } from 'vitest';
import {
  calculatePaginationMetadata,
  formatPaginatedResponse,
  sliceApiPage,
  selectFields,
  estimateTokens,
} from '../../../src/services/response-formatter.js';
import { TOKEN_LIMITS } from '../../../src/config/constants.js';

describe('calculatePaginationMetadata', () => {
  it('should calculate metadata for first page', () => {
    const metadata = calculatePaginationMetadata(100, 1, 20, 20);

    expect(metadata).toEqual({
      total_count: 100,
      current_page: 1,
      page_size: 20,
      total_pages: 5,
      has_more: true,
      next_page: 2,
    });
  });

  it('should calculate metadata for middle page', () => {
    const metadata = calculatePaginationMetadata(100, 3, 20, 20);

    expect(metadata).toEqual({
      total_count: 100,
      current_page: 3,
      page_size: 20,
      total_pages: 5,
      has_more: true,
      next_page: 4,
    });
  });

  it('should calculate metadata for last page', () => {
    const metadata = calculatePaginationMetadata(100, 5, 20, 20);

    expect(metadata).toEqual({
      total_count: 100,
      current_page: 5,
      page_size: 20,
      total_pages: 5,
      has_more: false,
      next_page: null,
    });
  });

  it('should handle partial last page', () => {
    const metadata = calculatePaginationMetadata(95, 5, 20, 15);

    expect(metadata).toEqual({
      total_count: 95,
      current_page: 5,
      page_size: 15,
      total_pages: 5,
      has_more: false,
      next_page: null,
    });
  });

  it('should handle single page result', () => {
    const metadata = calculatePaginationMetadata(10, 1, 20, 10);

    expect(metadata).toEqual({
      total_count: 10,
      current_page: 1,
      page_size: 10,
      total_pages: 1,
      has_more: false,
      next_page: null,
    });
  });

  it('should handle empty results', () => {
    const metadata = calculatePaginationMetadata(0, 1, 20, 0);

    expect(metadata).toEqual({
      total_count: 0,
      current_page: 1,
      page_size: 0,
      total_pages: 0,
      has_more: false,
      next_page: null,
    });
  });

  it('should calculate correct total_pages with remainder', () => {
    const metadata = calculatePaginationMetadata(101, 1, 20, 20);

    expect(metadata).toEqual({
      total_count: 101,
      current_page: 1,
      page_size: 20,
      total_pages: 6, // Math.ceil(101 / 20) = 6
      has_more: true,
      next_page: 2,
    });
  });
});

describe('formatPaginatedResponse', () => {
  it('should format response with pagination metadata', () => {
    const records = [
      { id: 1, name: 'Record 1' },
      { id: 2, name: 'Record 2' },
    ];

    const response = formatPaginatedResponse(records, 100, 1, 20);

    expect(response.results).toEqual(records);
    expect(response.pagination).toEqual({
      total_count: 100,
      current_page: 1,
      page_size: 2,
      total_pages: 5,
      has_more: true,
      next_page: 2,
    });
  });

  it('should handle empty results array', () => {
    const response = formatPaginatedResponse([], 0, 1, 20);

    expect(response.results).toEqual([]);
    expect(response.pagination.total_count).toBe(0);
    expect(response.pagination.page_size).toBe(0);
  });
});

describe('sliceApiPage', () => {
  const apiResults = Array.from({ length: 100 }, (_, i) => ({ id: i, value: `item${i}` }));

  it('should slice first page from API results', () => {
    // User wants offset 0, limit 20 (first page)
    // API returns records 0-99 (apiOffset = 0)
    const sliced = sliceApiPage(apiResults, 0, 20, 0);

    expect(sliced).toHaveLength(20);
    expect(sliced[0]).toEqual({ id: 0, value: 'item0' });
    expect(sliced[19]).toEqual({ id: 19, value: 'item19' });
  });

  it('should slice middle section from API results', () => {
    // User wants offset 30, limit 20 (records 30-49)
    // API returns records 0-99 (apiOffset = 0)
    const sliced = sliceApiPage(apiResults, 30, 20, 0);

    expect(sliced).toHaveLength(20);
    expect(sliced[0]).toEqual({ id: 30, value: 'item30' });
    expect(sliced[19]).toEqual({ id: 49, value: 'item49' });
  });

  it('should handle offset beyond first API page', () => {
    // User wants offset 10050, limit 20
    // API page 2 returns records 10000-19999 (apiOffset = 10000)
    const apiPage2 = Array.from({ length: 100 }, (_, i) => ({
      id: 10000 + i,
      value: `item${10000 + i}`,
    }));

    const sliced = sliceApiPage(apiPage2, 10050, 20, 10000);

    expect(sliced).toHaveLength(20);
    expect(sliced[0]).toEqual({ id: 10050, value: 'item10050' });
    expect(sliced[19]).toEqual({ id: 10069, value: 'item10069' });
  });

  it('should handle partial page at end of results', () => {
    const smallApiResults = Array.from({ length: 15 }, (_, i) => ({ id: i, value: `item${i}` }));

    const sliced = sliceApiPage(smallApiResults, 0, 20, 0);

    expect(sliced).toHaveLength(15);
    expect(sliced[0]).toEqual({ id: 0, value: 'item0' });
    expect(sliced[14]).toEqual({ id: 14, value: 'item14' });
  });

  it('should return empty array when offset exceeds results', () => {
    const sliced = sliceApiPage(apiResults, 200, 20, 0);

    expect(sliced).toHaveLength(0);
  });
});

describe('selectFields', () => {
  const records = [
    { id: 1, name: 'Alice', age: 30, city: 'NYC' },
    { id: 2, name: 'Bob', age: 25, city: 'LA' },
  ];

  it('should select specified fields from records', () => {
    const selected = selectFields(records, ['id', 'name']);

    expect(selected).toEqual([
      { id: 1, name: 'Alice' },
      { id: 2, name: 'Bob' },
    ]);
  });

  it('should handle single field selection', () => {
    const selected = selectFields(records, ['name']);

    expect(selected).toEqual([{ name: 'Alice' }, { name: 'Bob' }]);
  });

  it('should handle all fields selection', () => {
    const selected = selectFields(records, ['id', 'name', 'age', 'city']);

    expect(selected).toEqual(records);
  });

  it('should return empty objects if no matching fields', () => {
    const selected = selectFields(records, ['nonexistent']);

    expect(selected).toEqual([{}, {}]);
  });

  it('should handle empty records array', () => {
    const selected = selectFields([], ['id', 'name']);

    expect(selected).toEqual([]);
  });

  it('should return original records when fields array is empty', () => {
    const selected = selectFields(records, []);

    expect(selected).toEqual(records);
  });
});

describe('estimateTokens', () => {
  it('should estimate tokens for small JSON string', () => {
    const jsonString = '{"id":1,"name":"test"}';
    const estimate = estimateTokens(jsonString);

    expect(estimate.character_count).toBe(jsonString.length);
    expect(estimate.estimated_tokens).toBe(Math.ceil(jsonString.length / TOKEN_LIMITS.CHARS_PER_TOKEN));
    expect(estimate.exceeds_limit).toBe(false);
  });

  it('should estimate tokens for large JSON string', () => {
    // Create a large JSON string (over 10K tokens)
    const largeData = Array.from({ length: 500 }, (_, i) => ({
      id: i,
      name: `record_${i}`,
      description: 'A'.repeat(100),
    }));
    const jsonString = JSON.stringify(largeData);

    const estimate = estimateTokens(jsonString);

    expect(estimate.character_count).toBe(jsonString.length);
    expect(estimate.exceeds_limit).toBe(true);
  });

  it('should respect custom max tokens threshold', () => {
    const jsonString = JSON.stringify({ data: 'x'.repeat(100) });
    const customMaxTokens = 10;

    const estimate = estimateTokens(jsonString, customMaxTokens);

    expect(estimate.exceeds_limit).toBe(true);
  });

  it('should use default max tokens when not specified', () => {
    const jsonString = JSON.stringify({ data: 'test' });

    const estimate = estimateTokens(jsonString);

    expect(estimate.estimated_tokens).toBeLessThan(TOKEN_LIMITS.MAX_RESPONSE_TOKENS);
    expect(estimate.exceeds_limit).toBe(false);
  });

  it('should handle empty string', () => {
    const estimate = estimateTokens('');

    expect(estimate.character_count).toBe(0);
    expect(estimate.estimated_tokens).toBe(0);
    expect(estimate.exceeds_limit).toBe(false);
  });

  it('should correctly calculate tokens at boundary', () => {
    // Create string that's exactly at the limit
    const charsAtLimit = TOKEN_LIMITS.MAX_RESPONSE_TOKENS * TOKEN_LIMITS.CHARS_PER_TOKEN;
    const jsonString = 'x'.repeat(charsAtLimit);

    const estimate = estimateTokens(jsonString);

    expect(estimate.estimated_tokens).toBe(TOKEN_LIMITS.MAX_RESPONSE_TOKENS);
    expect(estimate.exceeds_limit).toBe(false);
  });

  it('should detect exceeding limit by 1 token', () => {
    // Create string that's 1 token over the limit
    const charsOverLimit = TOKEN_LIMITS.MAX_RESPONSE_TOKENS * TOKEN_LIMITS.CHARS_PER_TOKEN + 1;
    const jsonString = 'x'.repeat(charsOverLimit);

    const estimate = estimateTokens(jsonString);

    expect(estimate.estimated_tokens).toBe(TOKEN_LIMITS.MAX_RESPONSE_TOKENS + 1);
    expect(estimate.exceeds_limit).toBe(true);
  });
});
