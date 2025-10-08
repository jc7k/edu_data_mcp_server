/**
 * Integration tests for pagination flow
 * Tests the full request → validation → API → formatting → response pipeline
 */

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import axios from 'axios';
import { handleGetEducationData, handleGetEducationDataSummary } from '../../src/handlers/tools.js';
import { API_LIMITS, TOKEN_LIMITS } from '../../src/config/constants.js';

// Mock axios
vi.mock('axios');
const mockedAxios = vi.mocked(axios, { deep: true });

describe('Pagination Flow - Education Data', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('should handle first page request (default pagination)', async () => {
    // Mock API response with 100 total records
    const mockApiResults = Array.from({ length: 20 }, (_, i) => ({
      id: i + 1,
      name: `School ${i + 1}`,
      enrollment: 1000 + i * 10,
    }));

    mockedAxios.get.mockResolvedValue({
      data: {
        results: mockApiResults,
        count: 100,
        next: 'http://api.example.com/next',
        previous: null,
      },
    });

    const args = {
      level: 'schools',
      source: 'ccd',
      topic: 'directory',
      filters: { year: 2020 },
    };

    const result = await handleGetEducationData(args);

    // Verify response structure
    expect(result.content).toHaveLength(1);
    expect(result.content[0].type).toBe('text');

    const response = JSON.parse(result.content[0].text);

    // Verify paginated response structure
    expect(response).toHaveProperty('results');
    expect(response).toHaveProperty('pagination');

    // Verify pagination metadata
    expect(response.pagination).toEqual({
      total_count: 100,
      current_page: 1,
      page_size: 20,
      total_pages: 5,
      has_more: true,
      next_page: 2,
    });

    // Verify results
    expect(response.results).toHaveLength(20);
    expect(response.results[0]).toEqual({ id: 1, name: 'School 1', enrollment: 1000 });
  });

  it('should handle page parameter correctly', async () => {
    // Page 2 with limit 20 = offset 20
    // Mock API returns all 100 records (they all fit in first API page)
    const mockApiResults = Array.from({ length: 100 }, (_, i) => ({
      id: i + 1,
      name: `School ${i + 1}`,
    }));

    mockedAxios.get.mockResolvedValue({
      data: {
        results: mockApiResults,
        count: 100,
        next: 'http://api.example.com/next',
        previous: null,
      },
    });

    const args = {
      level: 'schools',
      source: 'ccd',
      topic: 'directory',
      filters: { year: 2020 },
      page: 2,
      limit: 20,
    };

    const result = await handleGetEducationData(args);
    const response = JSON.parse(result.content[0].text);

    expect(response.pagination.current_page).toBe(2);
    expect(response.pagination.next_page).toBe(3);
    // Page 2 starts at offset 20, so first record is id 21
    expect(response.results[0].id).toBe(21);
    expect(response.results).toHaveLength(20);
  });

  it('should handle offset parameter correctly', async () => {
    // Offset 50 with limit 20 = page 3 (records 50-69)
    // Mock API returns all 100 records (they all fit in first API page)
    const mockApiResults = Array.from({ length: 100 }, (_, i) => ({
      id: i + 1,
      name: `School ${i + 1}`,
    }));

    mockedAxios.get.mockResolvedValue({
      data: {
        results: mockApiResults,
        count: 100,
        next: null,
        previous: null,
      },
    });

    const args = {
      level: 'schools',
      source: 'ccd',
      topic: 'directory',
      filters: { year: 2020 },
      offset: 50,
      limit: 20,
    };

    const result = await handleGetEducationData(args);
    const response = JSON.parse(result.content[0].text);

    // offset 50 with limit 20 = page 3
    expect(response.pagination.current_page).toBe(3);
    // Offset 50 means we start at record 51 (0-indexed offset to 1-indexed ID)
    expect(response.results[0].id).toBe(51);
    expect(response.results).toHaveLength(20);
  });

  it('should handle field selection correctly', async () => {
    const mockApiResults = Array.from({ length: 20 }, (_, i) => ({
      id: i + 1,
      name: `School ${i + 1}`,
      enrollment: 1000 + i * 10,
      city: 'NYC',
      state: 'NY',
    }));

    mockedAxios.get.mockResolvedValue({
      data: {
        results: mockApiResults,
        count: 100,
        next: null,
        previous: null,
      },
    });

    const args = {
      level: 'schools',
      source: 'ccd',
      topic: 'directory',
      filters: { year: 2020 },
      fields: ['id', 'name'],
    };

    const result = await handleGetEducationData(args);
    const response = JSON.parse(result.content[0].text);

    // Verify only requested fields are returned
    expect(response.results[0]).toEqual({ id: 1, name: 'School 1' });
    expect(response.results[0]).not.toHaveProperty('enrollment');
    expect(response.results[0]).not.toHaveProperty('city');
  });

  it('should handle multi-page API navigation (offset > 10K)', async () => {
    // Simulate fetching records at offset 15000 (API page 2)
    // API page 2 contains records 10000-19999, so offset 15000 is at index 5000 within this page
    const mockApiResults = Array.from({ length: 10000 }, (_, i) => ({
      id: 10000 + i,
      name: `School ${10000 + i}`,
    }));

    mockedAxios.get.mockResolvedValue({
      data: {
        results: mockApiResults,
        count: 20000,
        next: 'http://api.example.com/next',
        previous: 'http://api.example.com/prev',
      },
    });

    const args = {
      level: 'schools',
      source: 'ccd',
      topic: 'directory',
      filters: { year: 2020 },
      offset: 15000,
      limit: 20,
    };

    const result = await handleGetEducationData(args);
    const response = JSON.parse(result.content[0].text);

    // Verify correct API page was requested
    expect(mockedAxios.get).toHaveBeenCalledWith(
      expect.stringContaining('page=2'),
    );

    // Verify correct records were sliced (offset 15000 = index 5000 in API page 2)
    expect(response.results[0].id).toBe(15000);
    expect(response.results).toHaveLength(20);
  });

  it('should handle last page with partial results', async () => {
    // Page 5 with limit 20 = offset 80
    // Need 95 total records, so API returns records 0-94 (all fit in first API page)
    // We want records 80-94 (15 records)
    const mockApiResults = Array.from({ length: 95 }, (_, i) => ({
      id: i + 1,
      name: `School ${i + 1}`,
    }));

    mockedAxios.get.mockResolvedValue({
      data: {
        results: mockApiResults,
        count: 95,
        next: null,
        previous: null,
      },
    });

    const args = {
      level: 'schools',
      source: 'ccd',
      topic: 'directory',
      filters: { year: 2020 },
      page: 5,
      limit: 20,
    };

    const result = await handleGetEducationData(args);
    const response = JSON.parse(result.content[0].text);

    expect(response.pagination).toEqual({
      total_count: 95,
      current_page: 5,
      page_size: 15,
      total_pages: 5,
      has_more: false,
      next_page: null,
    });

    expect(response.results).toHaveLength(15);
    // Verify we got records 81-95 (offset 80, limit 20)
    expect(response.results[0].id).toBe(81);
    expect(response.results[14].id).toBe(95);
  });

  it('should handle empty results', async () => {
    mockedAxios.get.mockResolvedValue({
      data: {
        results: [],
        count: 0,
        next: null,
        previous: null,
      },
    });

    const args = {
      level: 'schools',
      source: 'ccd',
      topic: 'directory',
      filters: { year: 2020, fips: 99999 },
    };

    const result = await handleGetEducationData(args);
    const response = JSON.parse(result.content[0].text);

    expect(response.results).toEqual([]);
    expect(response.pagination.total_count).toBe(0);
    expect(response.pagination.page_size).toBe(0);
  });

  it('should reject invalid field names', async () => {
    const mockApiResults = Array.from({ length: 20 }, (_, i) => ({
      id: i + 1,
      name: `School ${i + 1}`,
    }));

    mockedAxios.get.mockResolvedValue({
      data: {
        results: mockApiResults,
        count: 100,
        next: null,
        previous: null,
      },
    });

    const args = {
      level: 'schools',
      source: 'ccd',
      topic: 'directory',
      filters: { year: 2020 },
      fields: ['id', 'nonexistent_field'],
    };

    await expect(handleGetEducationData(args)).rejects.toThrow();
  });

  it('should reject when both page and offset are provided', async () => {
    const args = {
      level: 'schools',
      source: 'ccd',
      topic: 'directory',
      filters: { year: 2020 },
      page: 1,
      offset: 0,
    };

    await expect(handleGetEducationData(args)).rejects.toThrow();
  });
});

describe('Pagination Flow - Summary Data', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('should handle summary data request with pagination', async () => {
    const mockSummaryResults = Array.from({ length: 20 }, (_, i) => ({
      year: 2020,
      race: i + 1,
      total_enrollment: 10000 + i * 100,
    }));

    mockedAxios.get.mockResolvedValue({
      data: {
        results: mockSummaryResults,
        count: 50,
        next: 'http://api.example.com/next',
        previous: null,
      },
    });

    const args = {
      level: 'schools',
      source: 'ccd',
      topic: 'enrollment',
      stat: 'sum',
      var: 'enrollment',
      by: ['race'],
      filters: { year: 2020 },
    };

    const result = await handleGetEducationDataSummary(args);
    const response = JSON.parse(result.content[0].text);

    expect(response.results).toHaveLength(20);
    expect(response.pagination).toEqual({
      total_count: 50,
      current_page: 1,
      page_size: 20,
      total_pages: 3,
      has_more: true,
      next_page: 2,
    });
  });

  it('should handle summary data with field selection', async () => {
    const mockSummaryResults = Array.from({ length: 20 }, (_, i) => ({
      year: 2020,
      race: i + 1,
      total_enrollment: 10000 + i * 100,
      avg_enrollment: 500 + i * 5,
    }));

    mockedAxios.get.mockResolvedValue({
      data: {
        results: mockSummaryResults,
        count: 50,
        next: null,
        previous: null,
      },
    });

    const args = {
      level: 'schools',
      source: 'ccd',
      topic: 'enrollment',
      stat: 'sum',
      var: 'enrollment',
      by: ['race'],
      filters: { year: 2020 },
      fields: ['year', 'race', 'total_enrollment'],
    };

    const result = await handleGetEducationDataSummary(args);
    const response = JSON.parse(result.content[0].text);

    expect(response.results[0]).toEqual({
      year: 2020,
      race: 1,
      total_enrollment: 10000,
    });
    expect(response.results[0]).not.toHaveProperty('avg_enrollment');
  });
});

describe('Token Limit Validation', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('should reject response exceeding token limit', async () => {
    // Create a large dataset that will exceed token limits
    const mockLargeResults = Array.from({ length: 1000 }, (_, i) => ({
      id: i,
      name: `School with very long name ${i}`.repeat(10),
      description: 'A'.repeat(500),
      address: 'B'.repeat(500),
      other_field: 'C'.repeat(500),
    }));

    mockedAxios.get.mockResolvedValue({
      data: {
        results: mockLargeResults,
        count: 1000,
        next: null,
        previous: null,
      },
    });

    const args = {
      level: 'schools',
      source: 'ccd',
      topic: 'directory',
      filters: { year: 2020 },
      limit: 1000,
    };

    await expect(handleGetEducationData(args)).rejects.toThrow(/Response too large|exceeds limit/i);
  });

  it('should accept response within token limit', async () => {
    const mockSmallResults = Array.from({ length: 10 }, (_, i) => ({
      id: i,
      name: `School ${i}`,
    }));

    mockedAxios.get.mockResolvedValue({
      data: {
        results: mockSmallResults,
        count: 10,
        next: null,
        previous: null,
      },
    });

    const args = {
      level: 'schools',
      source: 'ccd',
      topic: 'directory',
      filters: { year: 2020 },
    };

    const result = await handleGetEducationData(args);
    expect(result.content[0].text).toBeDefined();
  });
});
