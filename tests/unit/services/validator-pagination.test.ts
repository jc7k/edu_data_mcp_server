/**
 * Tests for pagination parameter validation
 */

import { describe, it, expect } from 'vitest';
import { validatePaginationParams, validateFieldNames } from '../../../src/services/validator.js';
import { PaginationError, FieldSelectionError } from '../../../src/utils/errors.js';
import { API_LIMITS } from '../../../src/config/constants.js';

describe('validatePaginationParams', () => {
  describe('page parameter', () => {
    it('should accept valid page parameter', () => {
      const result = validatePaginationParams({ page: 1, limit: 20 });

      expect(result).toEqual({
        page: 1,
        offset: 0,
        limit: 20,
      });
    });

    it('should accept page > 1', () => {
      const result = validatePaginationParams({ page: 5, limit: 20 });

      expect(result).toEqual({
        page: 5,
        offset: 80, // (5-1) * 20
        limit: 20,
      });
    });

    it('should reject page < 1', () => {
      expect(() => validatePaginationParams({ page: 0, limit: 20 })).toThrow(PaginationError);
    });

    it('should reject negative page', () => {
      expect(() => validatePaginationParams({ page: -1, limit: 20 })).toThrow(PaginationError);
    });

    it('should reject non-integer page', () => {
      expect(() => validatePaginationParams({ page: 1.5, limit: 20 })).toThrow(PaginationError);
    });
  });

  describe('offset parameter', () => {
    it('should accept valid offset parameter', () => {
      const result = validatePaginationParams({ offset: 0, limit: 20 });

      expect(result).toEqual({
        page: 1,
        offset: 0,
        limit: 20,
      });
    });

    it('should accept offset > 0', () => {
      const result = validatePaginationParams({ offset: 100, limit: 20 });

      expect(result).toEqual({
        page: 6, // Math.floor(100/20) + 1
        offset: 100,
        limit: 20,
      });
    });

    it('should reject negative offset', () => {
      expect(() => validatePaginationParams({ offset: -1, limit: 20 })).toThrow(PaginationError);
    });

    it('should reject non-integer offset', () => {
      expect(() => validatePaginationParams({ offset: 10.5, limit: 20 })).toThrow(PaginationError);
    });

    it('should convert offset to page correctly', () => {
      const result1 = validatePaginationParams({ offset: 0, limit: 20 });
      expect(result1.page).toBe(1);

      const result2 = validatePaginationParams({ offset: 20, limit: 20 });
      expect(result2.page).toBe(2);

      const result3 = validatePaginationParams({ offset: 19, limit: 20 });
      expect(result3.page).toBe(1);

      const result4 = validatePaginationParams({ offset: 21, limit: 20 });
      expect(result4.page).toBe(2);
    });
  });

  describe('limit parameter', () => {
    it('should use default limit when not provided', () => {
      const result = validatePaginationParams({ page: 1 });

      expect(result.limit).toBe(API_LIMITS.DEFAULT_LIMIT);
    });

    it('should accept valid limit', () => {
      const result = validatePaginationParams({ page: 1, limit: 100 });

      expect(result.limit).toBe(100);
    });

    it('should accept limit = 1', () => {
      const result = validatePaginationParams({ page: 1, limit: 1 });

      expect(result.limit).toBe(1);
    });

    it('should accept limit = MAX_USER_LIMIT', () => {
      const result = validatePaginationParams({ page: 1, limit: API_LIMITS.MAX_USER_LIMIT });

      expect(result.limit).toBe(API_LIMITS.MAX_USER_LIMIT);
    });

    it('should reject limit > MAX_USER_LIMIT', () => {
      expect(() =>
        validatePaginationParams({ page: 1, limit: API_LIMITS.MAX_USER_LIMIT + 1 }),
      ).toThrow(PaginationError);
    });

    it('should reject limit < 1', () => {
      expect(() => validatePaginationParams({ page: 1, limit: 0 })).toThrow(PaginationError);
    });

    it('should reject negative limit', () => {
      expect(() => validatePaginationParams({ page: 1, limit: -10 })).toThrow(PaginationError);
    });

    it('should reject non-integer limit', () => {
      expect(() => validatePaginationParams({ page: 1, limit: 10.5 })).toThrow(PaginationError);
    });
  });

  describe('mutual exclusivity', () => {
    it('should reject when both page and offset are provided', () => {
      expect(() => validatePaginationParams({ page: 1, offset: 0, limit: 20 })).toThrow(
        PaginationError,
      );
      expect(() => validatePaginationParams({ page: 1, offset: 0, limit: 20 })).toThrow(
        /Cannot specify both page and offset/,
      );
    });

    it('should allow page without offset', () => {
      expect(() => validatePaginationParams({ page: 1, limit: 20 })).not.toThrow();
    });

    it('should allow offset without page', () => {
      expect(() => validatePaginationParams({ offset: 0, limit: 20 })).not.toThrow();
    });

    it('should allow neither page nor offset (default to page 1)', () => {
      const result = validatePaginationParams({ limit: 20 });

      expect(result).toEqual({
        page: 1,
        offset: 0,
        limit: 20,
      });
    });
  });

  describe('default values', () => {
    it('should default to page 1, offset 0 when no pagination params provided', () => {
      const result = validatePaginationParams({});

      expect(result).toEqual({
        page: 1,
        offset: 0,
        limit: API_LIMITS.DEFAULT_LIMIT,
      });
    });
  });

  describe('page/offset conversion', () => {
    it('should correctly convert page to offset', () => {
      const result1 = validatePaginationParams({ page: 1, limit: 20 });
      expect(result1.offset).toBe(0);

      const result2 = validatePaginationParams({ page: 2, limit: 20 });
      expect(result2.offset).toBe(20);

      const result3 = validatePaginationParams({ page: 10, limit: 50 });
      expect(result3.offset).toBe(450);
    });

    it('should correctly convert offset to page', () => {
      const result1 = validatePaginationParams({ offset: 0, limit: 20 });
      expect(result1.page).toBe(1);

      const result2 = validatePaginationParams({ offset: 20, limit: 20 });
      expect(result2.page).toBe(2);

      const result3 = validatePaginationParams({ offset: 450, limit: 50 });
      expect(result3.page).toBe(10);
    });
  });
});

describe('validateFieldNames', () => {
  const sampleRecord = {
    id: 1,
    name: 'Test',
    age: 30,
    city: 'NYC',
  };

  it('should accept valid field names', () => {
    expect(() => validateFieldNames(['id', 'name'], sampleRecord)).not.toThrow();
  });

  it('should accept single valid field', () => {
    expect(() => validateFieldNames(['name'], sampleRecord)).not.toThrow();
  });

  it('should accept all fields', () => {
    expect(() => validateFieldNames(['id', 'name', 'age', 'city'], sampleRecord)).not.toThrow();
  });

  it('should throw FieldSelectionError for invalid field', () => {
    expect(() => validateFieldNames(['nonexistent'], sampleRecord)).toThrow(FieldSelectionError);
  });

  it('should throw FieldSelectionError for partially invalid fields', () => {
    expect(() => validateFieldNames(['id', 'invalid', 'name'], sampleRecord)).toThrow(
      FieldSelectionError,
    );
  });

  it('should include invalid fields in error', () => {
    try {
      validateFieldNames(['id', 'invalid1', 'invalid2'], sampleRecord);
      expect.fail('Should have thrown FieldSelectionError');
    } catch (error) {
      expect(error).toBeInstanceOf(FieldSelectionError);
      if (error instanceof FieldSelectionError) {
        expect(error.invalidFields).toEqual(['invalid1', 'invalid2']);
      }
    }
  });

  it('should include available fields in error', () => {
    try {
      validateFieldNames(['invalid'], sampleRecord);
      expect.fail('Should have thrown FieldSelectionError');
    } catch (error) {
      expect(error).toBeInstanceOf(FieldSelectionError);
      if (error instanceof FieldSelectionError) {
        expect(error.availableFields).toEqual(['id', 'name', 'age', 'city']);
      }
    }
  });

  it('should handle empty fields array', () => {
    expect(() => validateFieldNames([], sampleRecord)).not.toThrow();
  });

  it('should be case-sensitive', () => {
    expect(() => validateFieldNames(['ID'], sampleRecord)).toThrow(FieldSelectionError);
    expect(() => validateFieldNames(['Name'], sampleRecord)).toThrow(FieldSelectionError);
  });
});
