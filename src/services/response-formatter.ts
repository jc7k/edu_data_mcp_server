/**
 * Response formatting service for pagination and field selection
 * Handles:
 * - Compact JSON formatting (no indentation)
 * - Pagination metadata calculation
 * - Token estimation
 * - Field selection filtering
 * - Slicing API pages into user-requested page sizes
 */

import type { PaginationMetadata, PaginatedResponse, TokenEstimate } from '../models/types.js';
import { TOKEN_LIMITS } from '../config/constants.js';

/**
 * Calculate pagination metadata for navigation
 */
export function calculatePaginationMetadata(
  totalCount: number,
  currentPage: number,
  limit: number,
  actualRecordsReturned: number,
): PaginationMetadata {
  const totalPages = Math.ceil(totalCount / limit);
  const hasMore = currentPage < totalPages;
  const nextPage = hasMore ? currentPage + 1 : null;

  return {
    total_count: totalCount,
    current_page: currentPage,
    page_size: actualRecordsReturned,
    total_pages: totalPages,
    has_more: hasMore,
    next_page: nextPage,
  };
}

/**
 * Estimate token count for JSON response using character-based approximation
 * Uses conservative ratio: 1 token ≈ 3 characters
 */
export function estimateTokens(jsonString: string, maxTokens: number = TOKEN_LIMITS.MAX_RESPONSE_TOKENS): TokenEstimate {
  const characterCount = jsonString.length;
  const estimatedTokens = Math.ceil(characterCount / TOKEN_LIMITS.CHARS_PER_TOKEN);

  return {
    estimated_tokens: estimatedTokens,
    character_count: characterCount,
    exceeds_limit: estimatedTokens > maxTokens,
  };
}

/**
 * Slice a large API response into the user's requested page
 * API returns 10K records per page; user may want 20 records per page
 *
 * @param apiResults - Full array from API (up to 10K records)
 * @param userOffset - User's requested offset (0-indexed)
 * @param userLimit - User's requested page size
 * @param apiOffset - Which API page this data came from (0, 10000, 20000, etc.)
 * @returns Sliced array for user's page
 */
export function sliceApiPage<T>(
  apiResults: T[],
  userOffset: number,
  userLimit: number,
  apiOffset: number = 0,
): T[] {
  // Calculate where user's request starts within this API page
  const startIndex = Math.max(0, userOffset - apiOffset);
  const endIndex = startIndex + userLimit;

  return apiResults.slice(startIndex, endIndex);
}

/**
 * Filter records to include only requested fields
 * Performs client-side field selection to reduce token usage
 *
 * @param records - Array of full records
 * @param fields - Optional array of field names to include
 * @returns Filtered records or original if no fields specified
 */
export function selectFields<T extends Record<string, unknown>>(
  records: T[],
  fields?: string[],
): Partial<T>[] | T[] {
  if (!fields || fields.length === 0) {
    return records; // No filtering, return all fields
  }

  return records.map((record) => {
    const filtered: Partial<T> = {};
    fields.forEach((field) => {
      if (field in record) {
        filtered[field as keyof T] = record[field as keyof T];
      }
    });
    return filtered;
  });
}

/**
 * Format API response with pagination metadata
 * Creates standardized paginated response structure
 *
 * @param records - Array of data records for current page
 * @param totalCount - Total records available (from API count field)
 * @param currentPage - Current page number (1-indexed)
 * @param limit - Records per page
 * @returns Paginated response with results and metadata
 */
export function formatPaginatedResponse<T>(
  records: T[],
  totalCount: number,
  currentPage: number,
  limit: number,
): PaginatedResponse<T> {
  const metadata = calculatePaginationMetadata(
    totalCount,
    currentPage,
    limit,
    records.length,
  );

  return {
    results: records,
    pagination: metadata,
  };
}

/**
 * Validate field names against available fields in records
 * Returns valid and invalid field lists for error reporting
 *
 * @param sampleRecord - First record to check field names against
 * @param requestedFields - Array of field names user requested
 * @returns Object with valid and invalid field arrays
 */
export function validateFields<T extends Record<string, unknown>>(
  sampleRecord: T,
  requestedFields: string[],
): { valid: string[]; invalid: string[] } {
  const availableFields = Object.keys(sampleRecord);
  const valid: string[] = [];
  const invalid: string[] = [];

  requestedFields.forEach((field) => {
    if (availableFields.includes(field)) {
      valid.push(field);
    } else {
      invalid.push(field);
    }
  });

  return { valid, invalid };
}
