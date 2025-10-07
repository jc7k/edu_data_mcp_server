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
  type ValidatedEducationDataRequest,
  type ValidatedSummaryDataRequest,
} from '../models/schemas.js';
import { ValidationError } from '../utils/errors.js';
import { findEndpoint } from '../config/endpoints.js';

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
