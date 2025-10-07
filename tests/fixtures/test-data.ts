/**
 * Test input data for validation and testing
 */

import type { EducationDataRequest, SummaryDataRequest } from '../../src/models/types.js';

/**
 * Valid education data requests
 */
export const validEducationDataRequests: EducationDataRequest[] = [
  {
    level: 'schools',
    source: 'ccd',
    topic: 'enrollment',
    limit: 100,
  },
  {
    level: 'school-districts',
    source: 'ccd',
    topic: 'directory',
    filters: { year: 2020, fips: 1 },
    add_labels: true,
    limit: 50,
  },
  {
    level: 'college-university',
    source: 'ipeds',
    topic: 'enrollment',
    subtopic: ['race', 'sex'],
    filters: { year: [2018, 2019, 2020] },
  },
];

/**
 * Valid summary data requests
 */
export const validSummaryDataRequests: SummaryDataRequest[] = [
  {
    level: 'schools',
    source: 'ccd',
    topic: 'enrollment',
    stat: 'sum',
    var: 'enrollment',
    by: ['year'],
  },
  {
    level: 'school-districts',
    source: 'ccd',
    topic: 'enrollment',
    stat: 'avg',
    var: 'enrollment',
    by: ['year', 'grade'],
    filters: { fips: 1 },
  },
];

/**
 * Invalid education data requests - missing required fields
 */
export const invalidEducationDataRequests = [
  {
    // Missing level
    source: 'ccd',
    topic: 'enrollment',
  },
  {
    level: 'schools',
    // Missing source
    topic: 'enrollment',
  },
  {
    level: 'schools',
    source: 'ccd',
    // Missing topic
  },
];

/**
 * Invalid education data requests - invalid types
 */
export const invalidTypeRequests = [
  {
    level: 123, // Should be string
    source: 'ccd',
    topic: 'enrollment',
  },
  {
    level: 'schools',
    source: 'ccd',
    topic: 'enrollment',
    limit: 'invalid', // Should be number
  },
  {
    level: 'schools',
    source: 'ccd',
    topic: 'enrollment',
    add_labels: 'yes', // Should be boolean
  },
];

/**
 * Invalid education data requests - security concerns
 */
export const securityTestRequests = [
  {
    level: 'schools',
    source: "ccd'; DROP TABLE schools; --", // SQL injection attempt
    topic: 'enrollment',
  },
  {
    level: '<script>alert("xss")</script>', // XSS attempt
    source: 'ccd',
    topic: 'enrollment',
  },
  {
    level: '../../../etc/passwd', // Path traversal attempt
    source: 'ccd',
    topic: 'enrollment',
  },
  {
    level: 'schools',
    source: 'ccd',
    topic: 'enrollment\x00\x01\x02', // Control characters
  },
  {
    level: 'a'.repeat(200), // Excessive length (>100 chars)
    source: 'ccd',
    topic: 'enrollment',
  },
];

/**
 * Edge case requests - boundary values
 */
export const edgeCaseRequests = [
  {
    level: 'schools',
    source: 'ccd',
    topic: 'enrollment',
    limit: 10000, // Max limit
  },
  {
    level: 'schools',
    source: 'ccd',
    topic: 'enrollment',
    limit: 1, // Min limit
  },
  {
    level: 'a', // Min length
    source: 'b',
    topic: 'c',
  },
];

/**
 * Invalid summary data requests
 */
export const invalidSummaryDataRequests = [
  {
    // Missing required 'by' field
    level: 'schools',
    source: 'ccd',
    topic: 'enrollment',
    stat: 'sum',
    var: 'enrollment',
  },
  {
    level: 'schools',
    source: 'ccd',
    topic: 'enrollment',
    stat: 'invalid_stat', // Invalid stat value
    var: 'enrollment',
    by: ['year'],
  },
];
