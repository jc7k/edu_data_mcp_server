/**
 * API client for the Urban Institute Education Data API
 *
 * Handles HTTP requests, URL construction, and basic error handling.
 * Preserves exact behavior from original index.ts implementation.
 */

import axios, { AxiosError } from 'axios';
import { API_BASE_URL, API_LIMITS } from '../config/constants.js';
import { ApiError } from '../utils/errors.js';
import type { EducationDataRequest, SummaryDataRequest } from '../models/types.js';

/**
 * Build URL for education data endpoint
 *
 * Correct API format: /api/v1/{level}/{source}/{topic}/{year}/[grade-X]/[race-X]/[sex-X]/?filters
 * Year must be in path (required). Grade, race, sex go in path if provided.
 * Other filters (fips, leaid, etc.) go in query params.
 */
export function buildEducationDataUrl(request: EducationDataRequest): string {
  // Extract year from filters (required in path)
  const filters = { ...(request.filters || {}) };
  const year = filters.year;

  if (!year) {
    throw new ApiError('Year is required in filters for Education Data API');
  }

  // Remove year from filters since it goes in the path
  delete filters.year;

  // Build base path: /level/source/topic/year
  let url = `${API_BASE_URL}/${request.level}/${request.source}/${request.topic}/${year}`;

  // Add grade/race/sex as path segments if provided (these are path specifiers, not query params)
  // These come from filters and must be in specific format: grade-X, race-X, sex-X
  const pathSpecifiers: string[] = [];

  if (filters.grade !== undefined) {
    pathSpecifiers.push(`grade-${filters.grade}`);
    delete filters.grade;
  }

  if (filters.race !== undefined) {
    pathSpecifiers.push(`race-${filters.race}`);
    delete filters.race;
  }

  if (filters.sex !== undefined) {
    pathSpecifiers.push(`sex-${filters.sex}`);
    delete filters.sex;
  }

  // Add subtopics if provided (these are also path segments)
  if (request.subtopic && Array.isArray(request.subtopic) && request.subtopic.length > 0) {
    request.subtopic.forEach(sub => pathSpecifiers.push(sub));
  }

  if (pathSpecifiers.length > 0) {
    url += `/${pathSpecifiers.join('/')}`;
  }

  // Add trailing slash (required by API)
  url += '/';

  // Add remaining filters as query parameters
  const queryParams = new URLSearchParams();
  queryParams.append('limit', String(request.limit || API_LIMITS.DEFAULT_LIMIT));

  if (request.add_labels) {
    queryParams.append('add_labels', 'true');
  }

  // Add remaining filters
  Object.entries(filters).forEach(([key, value]) => {
    if (Array.isArray(value)) {
      queryParams.append(key, value.join(','));
    } else {
      queryParams.append(key, String(value));
    }
  });

  // Add mode=R to match the R package behavior
  queryParams.append('mode', 'R');

  return `${url}?${queryParams.toString()}`;
}

/**
 * Build URL for summary data endpoint
 *
 * Format: /api/v1/{level}/{source}/{topic}/{year}/[subtopic]/summaries/?stat=X&var=Y&by=Z
 * Year is required in filters, stat/var/by are query params
 */
export function buildSummaryDataUrl(request: SummaryDataRequest): string {
  // Extract year from filters (required in path)
  const filters = { ...(request.filters || {}) };
  const year = filters.year;

  if (!year) {
    throw new ApiError('Year is required in filters for Education Data API summaries');
  }

  // Remove year from filters since it goes in the path
  delete filters.year;

  // Build base path: /level/source/topic/year
  let url = `${API_BASE_URL}/${request.level}/${request.source}/${request.topic}/${year}`;

  // Add subtopic if provided (path segment before /summaries)
  if (request.subtopic) {
    url += `/${request.subtopic}`;
  }

  // Add summaries endpoint
  url += '/summaries/';

  // Add query parameters
  const queryParams = new URLSearchParams();
  queryParams.append('stat', request.stat);
  queryParams.append('var', request.var);

  if (Array.isArray(request.by)) {
    queryParams.append('by', request.by.join(','));
  } else if (typeof request.by === 'string') {
    queryParams.append('by', request.by);
  } else {
    queryParams.append('by', String(request.by));
  }

  // Add remaining filters
  Object.entries(filters).forEach(([key, value]) => {
    if (Array.isArray(value)) {
      queryParams.append(key, value.join(','));
    } else {
      queryParams.append(key, String(value));
    }
  });

  // Add mode=R to match the R package behavior
  queryParams.append('mode', 'R');

  return `${url}?${queryParams.toString()}`;
}

/**
 * Fetch education data from the API
 * Preserves exact behavior from original implementation
 */
export async function fetchEducationData(request: EducationDataRequest): Promise<unknown> {
  const url = buildEducationDataUrl(request);

  try {
    const response = await axios.get(url);
    return response.data.results || response.data;
  } catch (error) {
    if (axios.isAxiosError(error)) {
      throw mapAxiosError(
        error,
        `${request.level}/${request.source}/${request.topic}`,
        'education data',
      );
    }
    throw new ApiError(`Unexpected error: ${error instanceof Error ? error.message : String(error)}`);
  }
}

/**
 * Fetch summary data from the API
 * Preserves exact behavior from original implementation
 */
export async function fetchSummaryData(request: SummaryDataRequest): Promise<unknown> {
  const url = buildSummaryDataUrl(request);

  try {
    const response = await axios.get(url);
    return response.data.results || response.data;
  } catch (error) {
    if (axios.isAxiosError(error)) {
      const endpointPath = request.subtopic
        ? `${request.level}/${request.source}/${request.topic}/${request.subtopic}/summaries`
        : `${request.level}/${request.source}/${request.topic}/summaries`;
      throw mapAxiosError(error, endpointPath, 'summary data');
    }
    throw new ApiError(`Unexpected error: ${error instanceof Error ? error.message : String(error)}`);
  }
}

/**
 * Map Axios errors to ApiError
 * Preserves exact error messages from original implementation
 */
function mapAxiosError(error: AxiosError, endpointPath: string, dataType: string): ApiError {
  const statusCode = error.response?.status;
  const message = error.response?.data
    ? (error.response.data as { message?: string }).message || error.message
    : error.message;

  if (statusCode === 404) {
    return new ApiError(`Endpoint not found: ${endpointPath}`, statusCode, false);
  }

  if (statusCode === 400) {
    return new ApiError(`API error: ${message}`, statusCode, false);
  }

  if (statusCode === 413) {
    return new ApiError(
      'Your requested query returned too many records. Consider limiting the scope of your query.',
      statusCode,
      false,
    );
  }

  // Other errors are potentially retryable (5xx, network errors)
  return new ApiError(`API error (${statusCode || 'unknown'}): ${message}`, statusCode, false);
}
