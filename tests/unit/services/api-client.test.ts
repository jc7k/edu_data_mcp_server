/**
 * Tests for API client pagination functions
 */

import { describe, it, expect } from 'vitest';
import { calculateApiPage, buildEducationDataUrl, buildSummaryDataUrl } from '../../../src/services/api-client.js';
import { API_LIMITS } from '../../../src/config/constants.js';
import type { EducationDataRequest, SummaryDataRequest } from '../../../src/models/types.js';

describe('calculateApiPage', () => {
  it('should return page 1 for offset 0', () => {
    const result = calculateApiPage(0);

    expect(result).toEqual({
      apiPage: 1,
      apiOffset: 0,
    });
  });

  it('should return page 1 for offsets 0-9999', () => {
    expect(calculateApiPage(0).apiPage).toBe(1);
    expect(calculateApiPage(5000).apiPage).toBe(1);
    expect(calculateApiPage(9999).apiPage).toBe(1);
  });

  it('should return page 2 for offsets 10000-19999', () => {
    const result = calculateApiPage(10000);

    expect(result).toEqual({
      apiPage: 2,
      apiOffset: 10000,
    });

    expect(calculateApiPage(15000).apiPage).toBe(2);
    expect(calculateApiPage(19999).apiPage).toBe(2);
  });

  it('should return page 3 for offsets 20000-29999', () => {
    const result = calculateApiPage(20000);

    expect(result).toEqual({
      apiPage: 3,
      apiOffset: 20000,
    });

    expect(calculateApiPage(25000).apiPage).toBe(3);
    expect(calculateApiPage(29999).apiPage).toBe(3);
  });

  it('should handle large offsets correctly', () => {
    const result = calculateApiPage(100000);

    expect(result).toEqual({
      apiPage: 11,
      apiOffset: 100000,
    });
  });

  it('should calculate correct apiOffset for each page', () => {
    expect(calculateApiPage(0).apiOffset).toBe(0);
    expect(calculateApiPage(10000).apiOffset).toBe(10000);
    expect(calculateApiPage(20000).apiOffset).toBe(20000);
    expect(calculateApiPage(50000).apiOffset).toBe(50000);
  });

  it('should handle offset in middle of API page', () => {
    const result = calculateApiPage(12345);

    expect(result).toEqual({
      apiPage: 2,
      apiOffset: 10000,
    });
  });
});

describe('buildEducationDataUrl', () => {
  const baseRequest: EducationDataRequest = {
    level: 'schools',
    source: 'ccd',
    topic: 'directory',
    filters: { year: 2020 },
  };

  it('should build URL with year in path', () => {
    const url = buildEducationDataUrl(baseRequest);

    expect(url).toContain('/schools/ccd/directory/2020/');
    expect(url).toContain('mode=R');
    expect(url).toContain(`limit=${API_LIMITS.MAX_LIMIT}`);
  });

  it('should throw error if year is missing', () => {
    const requestWithoutYear = {
      level: 'schools',
      source: 'ccd',
      topic: 'directory',
      filters: {},
    };

    expect(() => buildEducationDataUrl(requestWithoutYear)).toThrow('Year is required');
  });

  it('should include page parameter for page > 1', () => {
    const url = buildEducationDataUrl(baseRequest, 2);

    expect(url).toContain('page=2');
  });

  it('should not include page parameter for page 1', () => {
    const url = buildEducationDataUrl(baseRequest, 1);

    expect(url).not.toContain('page=');
  });

  it('should always request MAX_LIMIT (10000)', () => {
    const url = buildEducationDataUrl(baseRequest);

    expect(url).toContain(`limit=${API_LIMITS.MAX_LIMIT}`);
  });

  it('should add grade to path when provided', () => {
    const requestWithGrade = {
      ...baseRequest,
      filters: { year: 2020, grade: 9 },
    };

    const url = buildEducationDataUrl(requestWithGrade);

    expect(url).toContain('/2020/grade-9/');
    expect(url).not.toContain('grade=');
  });

  it('should add race to path when provided', () => {
    const requestWithRace = {
      ...baseRequest,
      filters: { year: 2020, race: 1 },
    };

    const url = buildEducationDataUrl(requestWithRace);

    expect(url).toContain('/2020/race-1/');
    expect(url).not.toContain('race=');
  });

  it('should add sex to path when provided', () => {
    const requestWithSex = {
      ...baseRequest,
      filters: { year: 2020, sex: 1 },
    };

    const url = buildEducationDataUrl(requestWithSex);

    expect(url).toContain('/2020/sex-1/');
    expect(url).not.toContain('sex=');
  });

  it('should add subtopic to path when provided', () => {
    const requestWithSubtopic = {
      ...baseRequest,
      subtopic: ['race', 'sex'],
    };

    const url = buildEducationDataUrl(requestWithSubtopic);

    expect(url).toContain('/2020/race/sex/');
  });

  it('should add other filters as query params', () => {
    const requestWithFilters = {
      ...baseRequest,
      filters: { year: 2020, fips: 1, leaid: 123 },
    };

    const url = buildEducationDataUrl(requestWithFilters);

    expect(url).toContain('fips=1');
    expect(url).toContain('leaid=123');
  });

  it('should add add_labels parameter when true', () => {
    const requestWithLabels = {
      ...baseRequest,
      add_labels: true,
    };

    const url = buildEducationDataUrl(requestWithLabels);

    expect(url).toContain('add_labels=true');
  });

  it('should handle array filter values', () => {
    const requestWithArrayFilter = {
      ...baseRequest,
      filters: { year: 2020, grade: [9, 10, 11, 12] },
    };

    const url = buildEducationDataUrl(requestWithArrayFilter);

    // Arrays in path segments are comma-separated (not URL encoded)
    expect(url).toContain('grade-9,10,11,12');
  });
});

describe('buildSummaryDataUrl', () => {
  const baseSummaryRequest: SummaryDataRequest = {
    level: 'schools',
    source: 'ccd',
    topic: 'enrollment',
    stat: 'sum',
    var: 'enrollment',
    by: ['year'],
    filters: { year: 2020 },
  };

  it('should build summary URL with year in path', () => {
    const url = buildSummaryDataUrl(baseSummaryRequest);

    expect(url).toContain('/schools/ccd/enrollment/2020/summaries/');
    expect(url).toContain('mode=R');
    expect(url).toContain(`limit=${API_LIMITS.MAX_LIMIT}`);
  });

  it('should throw error if year is missing', () => {
    const requestWithoutYear = {
      ...baseSummaryRequest,
      filters: {},
    };

    expect(() => buildSummaryDataUrl(requestWithoutYear)).toThrow('Year is required');
  });

  it('should include page parameter for page > 1', () => {
    const url = buildSummaryDataUrl(baseSummaryRequest, 2);

    expect(url).toContain('page=2');
  });

  it('should not include page parameter for page 1', () => {
    const url = buildSummaryDataUrl(baseSummaryRequest, 1);

    expect(url).not.toContain('page=');
  });

  it('should always request MAX_LIMIT (10000)', () => {
    const url = buildSummaryDataUrl(baseSummaryRequest);

    expect(url).toContain(`limit=${API_LIMITS.MAX_LIMIT}`);
  });

  it('should add subtopic to path before summaries', () => {
    const requestWithSubtopic = {
      ...baseSummaryRequest,
      subtopic: 'race',
    };

    const url = buildSummaryDataUrl(requestWithSubtopic);

    expect(url).toContain('/2020/race/summaries/');
  });

  it('should add stat parameter', () => {
    const url = buildSummaryDataUrl(baseSummaryRequest);

    expect(url).toContain('stat=sum');
  });

  it('should add var parameter', () => {
    const url = buildSummaryDataUrl(baseSummaryRequest);

    expect(url).toContain('var=enrollment');
  });

  it('should add by parameter as comma-separated string', () => {
    const requestWithMultipleBy = {
      ...baseSummaryRequest,
      by: ['year', 'race', 'sex'],
    };

    const url = buildSummaryDataUrl(requestWithMultipleBy);

    expect(url).toContain('by=year%2Crace%2Csex'); // URL encoded commas
  });

  it('should handle by as single string', () => {
    const requestWithStringBy = {
      ...baseSummaryRequest,
      by: 'year' as unknown as string[],
    };

    const url = buildSummaryDataUrl(requestWithStringBy);

    expect(url).toContain('by=year');
  });

  it('should add additional filters as query params', () => {
    const requestWithFilters = {
      ...baseSummaryRequest,
      filters: { year: 2020, fips: 1 },
    };

    const url = buildSummaryDataUrl(requestWithFilters);

    expect(url).toContain('fips=1');
  });
});
