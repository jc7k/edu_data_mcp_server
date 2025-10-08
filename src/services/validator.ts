/**
 * Input validation and sanitization service
 *
 * Validates and sanitizes all user inputs using Zod schemas
 * Prevents SQL injection, XSS, path traversal, and other attacks
 */

import { ZodError } from 'zod';
import {
  EducationDataRequestSchema,
  SummaryDataRequestSchema,
  PaginationParamsSchema,
  type ValidatedEducationDataRequest,
  type ValidatedSummaryDataRequest,
} from '../models/schemas.js';
import { ValidationError, PaginationError, FieldSelectionError } from '../utils/errors.js';
import { findEndpoint } from '../config/endpoints.js';
import type { PaginationParams } from '../models/types.js';
import { API_LIMITS } from '../config/constants.js';

/**
 * Sanitize a string by removing/escaping potentially dangerous characters
 * Prevents XSS, SQL injection, and path traversal attacks
 */
export function sanitizeString(input: string): string {
  return (
    input
      // Normalize Unicode to prevent homograph attacks
      .normalize('NFKC')
      // Trim whitespace
      .trim()
      // Remove null bytes and control characters (except newlines/tabs in some contexts)
      .replace(/[\x00-\x08\x0B\x0C\x0E-\x1F\x7F]/g, '')
  );
}

/**
 * Validate education data request
 * Throws ValidationError if validation fails
 */
export function validateEducationDataRequest(input: unknown): ValidatedEducationDataRequest {
  try {
    // Parse and validate with Zod
    const validated = EducationDataRequestSchema.parse(input);

    // Additional custom validation: sanitize string fields
    const sanitized = {
      ...validated,
      level: sanitizeString(validated.level),
      source: sanitizeString(validated.source),
      topic: sanitizeString(validated.topic),
      subtopic: validated.subtopic?.map(sanitizeString),
    };

    // Validate endpoint exists
    validateEndpoint(sanitized.level, sanitized.source, sanitized.topic);

    return sanitized;
  } catch (error) {
    if (error instanceof ZodError) {
      // Convert Zod error to ValidationError
      const firstIssue = error.issues[0];
      const received = 'received' in firstIssue ? firstIssue.received : undefined;
      throw new ValidationError(
        firstIssue.message,
        firstIssue.path.join('.'),
        firstIssue.message,
        received,
      );
    }
    throw error;
  }
}

/**
 * Validate summary data request
 * Throws ValidationError if validation fails
 */
export function validateSummaryDataRequest(input: unknown): ValidatedSummaryDataRequest {
  try {
    // Parse and validate with Zod
    const validated = SummaryDataRequestSchema.parse(input);

    // Additional custom validation: sanitize string fields
    const sanitized = {
      ...validated,
      level: sanitizeString(validated.level),
      source: sanitizeString(validated.source),
      topic: sanitizeString(validated.topic),
      subtopic: validated.subtopic ? sanitizeString(validated.subtopic) : undefined,
      stat: sanitizeString(validated.stat),
      var: sanitizeString(validated.var),
      by: validated.by.map(sanitizeString),
    };

    // Validate endpoint exists (note: summary endpoints have /summaries suffix)
    validateEndpoint(sanitized.level, sanitized.source, sanitized.topic);

    return sanitized;
  } catch (error) {
    if (error instanceof ZodError) {
      // Convert Zod error to ValidationError
      const firstIssue = error.issues[0];
      const received = 'received' in firstIssue ? firstIssue.received : undefined;
      throw new ValidationError(
        firstIssue.message,
        firstIssue.path.join('.'),
        firstIssue.message,
        received,
      );
    }
    throw error;
  }
}

/**
 * Validate that endpoint exists in available endpoints
 * Throws ValidationError if endpoint not found
 */
export function validateEndpoint(level: string, source: string, topic: string): void {
  const endpoint = findEndpoint(level, source, topic);

  if (!endpoint) {
    throw new ValidationError(
      `Invalid endpoint: ${level}/${source}/${topic}`,
      'endpoint',
      'Valid endpoint from available endpoints list',
      `${level}/${source}/${topic}`,
    );
  }
}

/**
 * Validate pagination parameters and convert between page/offset
 * Returns normalized pagination params with calculated offset and page
 *
 * @param params - Pagination parameters from request
 * @returns Normalized pagination params with both page and offset calculated
 */
export function validatePaginationParams(params: PaginationParams): {
  page: number;
  offset: number;
  limit: number;
} {
  try {
    // Validate with Zod schema (checks mutual exclusivity, ranges, etc.)
    const validated = PaginationParamsSchema.parse(params);

    // Apply defaults
    const limit = validated.limit ?? API_LIMITS.DEFAULT_LIMIT;

    // Calculate offset and page based on what was provided
    let page: number;
    let offset: number;

    if (validated.page !== undefined) {
      // Page-based: calculate offset from page
      page = validated.page;
      offset = (page - 1) * limit;
    } else if (validated.offset !== undefined) {
      // Offset-based: calculate page from offset
      offset = validated.offset;
      page = Math.floor(offset / limit) + 1;
    } else {
      // Neither provided: default to page 1
      page = 1;
      offset = 0;
    }

    return { page, offset, limit };
  } catch (error) {
    if (error instanceof ZodError) {
      const firstIssue = error.issues[0];
      throw new PaginationError(firstIssue.message, firstIssue.path.join('.'));
    }
    throw error;
  }
}

/**
 * Validate field names against available fields in a sample record
 * Throws FieldSelectionError if any fields are invalid
 *
 * @param requestedFields - Array of field names user requested
 * @param sampleRecord - Sample record to validate against
 */
export function validateFieldNames<T extends Record<string, unknown>>(
  requestedFields: string[],
  sampleRecord: T,
): void {
  if (!requestedFields || requestedFields.length === 0) {
    return; // No validation needed if no fields requested
  }

  const availableFields = Object.keys(sampleRecord);
  const invalidFields: string[] = [];

  requestedFields.forEach((field) => {
    if (!availableFields.includes(field)) {
      invalidFields.push(field);
    }
  });

  if (invalidFields.length > 0) {
    throw new FieldSelectionError(
      `Unknown field(s) in fields parameter`,
      invalidFields,
      availableFields,
    );
  }
}
