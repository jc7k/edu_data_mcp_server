/**
 * Custom error classes and error handling utilities
 */

import type { LogContext } from '../models/types.js';

/**
 * Validation error thrown when input validation fails
 */
export class ValidationError extends Error {
  constructor(
    message: string,
    public field?: string,
    public expected?: string,
    public received?: unknown,
  ) {
    super(message);
    this.name = 'ValidationError';
    Object.setPrototypeOf(this, ValidationError.prototype);
  }
}

/**
 * API error thrown when external API calls fail
 */
export class ApiError extends Error {
  constructor(
    message: string,
    public statusCode?: number,
    public isRetryable = false,
    public originalError?: Error,
  ) {
    super(message);
    this.name = 'ApiError';
    Object.setPrototypeOf(this, ApiError.prototype);
  }
}

/**
 * Token limit error thrown when response exceeds token threshold
 */
export class TokenLimitError extends Error {
  constructor(
    message: string,
    public estimatedTokens: number,
    public limit: number,
    public suggestions?: string[],
  ) {
    super(message);
    this.name = 'TokenLimitError';
    Object.setPrototypeOf(this, TokenLimitError.prototype);
  }
}

/**
 * Pagination error thrown when pagination parameters are invalid
 */
export class PaginationError extends Error {
  constructor(
    message: string,
    public parameterName?: string,
    public suggestions?: string[],
  ) {
    super(message);
    this.name = 'PaginationError';
    Object.setPrototypeOf(this, PaginationError.prototype);
  }
}

/**
 * Field selection error thrown when requested fields are invalid
 */
export class FieldSelectionError extends Error {
  constructor(
    message: string,
    public invalidFields: string[],
    public availableFields?: string[],
  ) {
    super(message);
    this.name = 'FieldSelectionError';
    Object.setPrototypeOf(this, FieldSelectionError.prototype);
  }
}

/**
 * Format error for returning to MCP client
 * Sanitizes sensitive information and provides user-friendly messages
 */
export function formatErrorForClient(error: unknown): string {
  if (error instanceof ValidationError) {
    const parts = [`Validation error: ${error.message}`];
    if (error.field) {
      parts.push(`Field: ${error.field}`);
    }
    if (error.expected) {
      parts.push(`Expected: ${error.expected}`);
    }
    if (error.received !== undefined) {
      // Sanitize received value - truncate if too long
      const receivedStr = String(error.received);
      const sanitized = receivedStr.length > 100 ? receivedStr.slice(0, 100) + '...' : receivedStr;
      parts.push(`Received: ${sanitized}`);
    }
    return parts.join('. ');
  }

  if (error instanceof ApiError) {
    const parts = [`API error: ${error.message}`];
    if (error.statusCode) {
      parts.push(`Status: ${error.statusCode}`);
    }
    if (error.isRetryable) {
      parts.push('This error may be temporary. Please try again.');
    }
    return parts.join('. ');
  }

  if (error instanceof TokenLimitError) {
    const parts = [
      `Response too large: ~${error.estimatedTokens.toLocaleString()} tokens`,
      `(limit: ${error.limit.toLocaleString()})`,
    ];
    if (error.suggestions && error.suggestions.length > 0) {
      parts.push('Suggestions:');
      error.suggestions.forEach(s => parts.push(`- ${s}`));
    }
    return parts.join(' ');
  }

  if (error instanceof PaginationError) {
    const parts = [error.message];
    if (error.suggestions && error.suggestions.length > 0) {
      parts.push('Suggestions:');
      error.suggestions.forEach(s => parts.push(`- ${s}`));
    }
    return parts.join(' ');
  }

  if (error instanceof FieldSelectionError) {
    const parts = [error.message];
    if (error.invalidFields.length > 0) {
      parts.push(`Invalid fields: ${error.invalidFields.join(', ')}`);
    }
    if (error.availableFields && error.availableFields.length > 0) {
      const fieldList = error.availableFields.slice(0, 20).join(', ');
      parts.push(`Available fields: ${fieldList}${error.availableFields.length > 20 ? ', ...' : ''}`);
    }
    return parts.join('. ');
  }

  if (error instanceof Error) {
    return `Error: ${error.message}`;
  }

  return 'An unexpected error occurred';
}

/**
 * Log error with context information
 * Returns a sanitized error object suitable for structured logging
 */
export function logErrorWithContext(
  error: unknown,
  context: LogContext,
): {
  message: string;
  name: string;
  context: LogContext;
  stack?: string;
  statusCode?: number;
  isRetryable?: boolean;
  field?: string;
} {
  const baseLog = {
    message: error instanceof Error ? error.message : String(error),
    name: error instanceof Error ? error.name : 'UnknownError',
    context,
  };

  if (error instanceof ApiError) {
    return {
      ...baseLog,
      stack: error.stack,
      statusCode: error.statusCode,
      isRetryable: error.isRetryable,
    };
  }

  if (error instanceof ValidationError) {
    return {
      ...baseLog,
      stack: error.stack,
      field: error.field,
    };
  }

  if (error instanceof Error) {
    return {
      ...baseLog,
      stack: error.stack,
    };
  }

  return baseLog;
}

/**
 * Check if an error is retryable based on status code or error type
 */
export function isRetryableError(error: unknown): boolean {
  if (error instanceof ApiError) {
    return error.isRetryable;
  }

  // Network errors and timeouts are retryable
  if (error instanceof Error) {
    const message = error.message.toLowerCase();
    return (
      message.includes('timeout') ||
      message.includes('network') ||
      message.includes('econnreset') ||
      message.includes('econnrefused')
    );
  }

  return false;
}
