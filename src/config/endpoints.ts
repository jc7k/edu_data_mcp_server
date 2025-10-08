/**
 * Available Education Data API endpoints
 *
 * This is a simplified static list. In a production system, this could be:
 * - Fetched from an API discovery endpoint
 * - Parsed from API documentation
 * - Loaded from a configuration file
 */

import type { EndpointMetadata } from '../models/types.js';

/**
 * Legacy endpoint structure from original implementation
 * Kept for backward compatibility during migration
 */
export interface ApiEndpoint {
  level: string;
  source: string;
  topic: string;
  subtopic?: string[];
  mainFilters: string[];
  yearsAvailable: string;
}

/**
 * Available API endpoints with metadata
 */
export const AVAILABLE_ENDPOINTS: ApiEndpoint[] = [
  // CCD Endpoints (K-12 Schools)
  {
    level: 'schools',
    source: 'ccd',
    topic: 'enrollment',
    subtopic: ['race', 'sex', 'race, sex'],
    mainFilters: ['year', 'grade'],
    yearsAvailable: '1986–2022',
  },
  {
    level: 'schools',
    source: 'ccd',
    topic: 'directory',
    mainFilters: ['year'],
    yearsAvailable: '1986–2022',
  },
  {
    level: 'school-districts',
    source: 'ccd',
    topic: 'enrollment',
    subtopic: ['race', 'sex', 'race, sex'],
    mainFilters: ['year', 'grade'],
    yearsAvailable: '1986–2022',
  },
  {
    level: 'school-districts',
    source: 'ccd',
    topic: 'directory',
    mainFilters: ['year'],
    yearsAvailable: '1986–2022',
  },

  // IPEDS Endpoints (Higher Education)
  {
    level: 'college-university',
    source: 'ipeds',
    topic: 'directory',
    mainFilters: ['year'],
    yearsAvailable: '1980, 1984–2022',
  },
  {
    level: 'college-university',
    source: 'ipeds',
    topic: 'institutional-characteristics',
    mainFilters: ['year', 'unitid'],
    yearsAvailable: '1980, 1984–2022',
  },
  {
    level: 'college-university',
    source: 'ipeds',
    topic: 'fall-enrollment',
    mainFilters: ['year', 'unitid', 'level_of_study'],
    yearsAvailable: '1980, 1984–2022',
  },
  {
    level: 'college-university',
    source: 'ipeds',
    topic: 'enrollment-full-time-equivalent',
    mainFilters: ['year', 'unitid'],
    yearsAvailable: '1980, 1984–2022',
  },
  {
    level: 'college-university',
    source: 'ipeds',
    topic: 'completions-cip-2',
    subtopic: ['award_level', 'race', 'sex'],
    mainFilters: ['year', 'unitid', 'cipcode', 'award_level'],
    yearsAvailable: '1980, 1984–2022',
  },
  {
    level: 'college-university',
    source: 'ipeds',
    topic: 'completions-cip-6',
    subtopic: ['award_level', 'race', 'sex'],
    mainFilters: ['year', 'unitid', 'cipcode', 'award_level'],
    yearsAvailable: '1980, 1984–2022',
  },
  {
    level: 'college-university',
    source: 'ipeds',
    topic: 'sfa-grants-and-net-price',
    mainFilters: ['year', 'unitid'],
    yearsAvailable: '1980, 1984–2022',
  },
  {
    level: 'college-university',
    source: 'ipeds',
    topic: 'admissions-enrollment',
    mainFilters: ['year', 'unitid', 'sex'],
    yearsAvailable: '1980, 1984–2022',
  },
  {
    level: 'college-university',
    source: 'ipeds',
    topic: 'admissions-requirements',
    mainFilters: ['year', 'unitid'],
    yearsAvailable: '1980, 1984–2022',
  },
  {
    level: 'college-university',
    source: 'ipeds',
    topic: 'outcome-measures',
    mainFilters: ['year', 'unitid'],
    yearsAvailable: '2015–2022',
  },
  {
    level: 'college-university',
    source: 'ipeds',
    topic: 'finance',
    mainFilters: ['year', 'unitid'],
    yearsAvailable: '1980, 1984–2022',
  },
  {
    level: 'college-university',
    source: 'ipeds',
    topic: 'enrollment',
    subtopic: ['race', 'sex'],
    mainFilters: ['year', 'unitid'],
    yearsAvailable: '1980, 1984–2022',
  },
  // Additional endpoints can be added here as discovered
];

/**
 * Convert legacy endpoint format to simplified metadata format
 */
export function toEndpointMetadata(endpoint: ApiEndpoint): EndpointMetadata {
  const subtopicStr = endpoint.subtopic ? ` (subtopics: ${endpoint.subtopic.join(', ')})` : '';
  const description = `Education data endpoint${subtopicStr}. Years: ${endpoint.yearsAvailable}. Main filters: ${endpoint.mainFilters.join(', ')}`;

  return {
    level: endpoint.level,
    source: endpoint.source,
    topic: endpoint.topic,
    endpoint: `${endpoint.level}/${endpoint.source}/${endpoint.topic}`,
    description,
  };
}

/**
 * Get all endpoints as simplified metadata
 */
export function getAllEndpointMetadata(): EndpointMetadata[] {
  return AVAILABLE_ENDPOINTS.map(toEndpointMetadata);
}

/**
 * Find a specific endpoint by level, source, and topic
 */
export function findEndpoint(
  level: string,
  source: string,
  topic: string,
): ApiEndpoint | undefined {
  return AVAILABLE_ENDPOINTS.find(
    (e) => e.level === level && e.source === source && e.topic === topic,
  );
}
