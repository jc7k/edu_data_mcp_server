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
