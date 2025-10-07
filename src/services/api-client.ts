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
 * Preserves exact behavior from original implementation
 */
export function buildEducationDataUrl(request: EducationDataRequest): string {
  let url = `${API_BASE_URL}/${request.level}/${request.source}/${request.topic}`;

  // Add subtopics if provided
  if (request.subtopic && Array.isArray(request.subtopic) && request.subtopic.length > 0) {
    url += `/${request.subtopic.join('/')}`;
  }

  // Add query parameters
  const queryParams = new URLSearchParams();
  queryParams.append('limit', String(request.limit || API_LIMITS.DEFAULT_LIMIT));

  if (request.add_labels) {
    queryParams.append('add_labels', 'true');
  }

  // Add filters
  if (request.filters && typeof request.filters === 'object') {
    Object.entries(request.filters).forEach(([key, value]) => {
      if (Array.isArray(value)) {
        queryParams.append(key, value.join(','));
      } else {
        queryParams.append(key, String(value));
      }
    });
  }

  // Add mode=R to match the R package behavior
  queryParams.append('mode', 'R');

  return `${url}?${queryParams.toString()}`;
}

/**
 * Build URL for summary data endpoint
 * Preserves exact behavior from original implementation
 */
export function buildSummaryDataUrl(request: SummaryDataRequest): string {
  let url = `${API_BASE_URL}/${request.level}/${request.source}/${request.topic}`;

  // Add subtopic if provided
  if (request.subtopic) {
    url += `/${request.subtopic}`;
  }

  // Add summaries endpoint
  url += '/summaries';

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

  // Add filters
  if (request.filters && typeof request.filters === 'object') {
    Object.entries(request.filters).forEach(([key, value]) => {
      if (Array.isArray(value)) {
        queryParams.append(key, value.join(','));
      } else {
        queryParams.append(key, String(value));
      }
    });
  }

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
