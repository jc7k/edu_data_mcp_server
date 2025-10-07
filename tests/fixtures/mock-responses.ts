/**
 * Mock API responses for testing
 */

/**
 * Mock successful response for get_education_data
 */
export const mockEducationDataResponse = {
  results: [
    {
      year: 2020,
      grade: 9,
      enrollment: 3876543,
      fips: 1,
      leaid: '0100005',
    },
    {
      year: 2020,
      grade: 10,
      enrollment: 3654321,
      fips: 1,
      leaid: '0100005',
    },
  ],
  count: 2,
};

/**
 * Mock successful response for get_education_data_summary
 */
export const mockSummaryDataResponse = {
  results: [
    {
      year: 2020,
      value: 15430864,
    },
    {
      year: 2019,
      value: 15234567,
    },
  ],
  count: 2,
};

/**
 * Mock error response - 404 Not Found
 */
export const mock404Response = {
  error: 'Not Found',
  message: 'The requested endpoint does not exist',
  status: 404,
};

/**
 * Mock error response - 429 Rate Limit
 */
export const mock429Response = {
  error: 'Too Many Requests',
  message: 'Rate limit exceeded. Please try again later.',
  status: 429,
};

/**
 * Mock error response - 500 Internal Server Error
 */
export const mock500Response = {
  error: 'Internal Server Error',
  message: 'An unexpected error occurred on the server',
  status: 500,
};

/**
 * Mock error response - 503 Service Unavailable
 */
export const mock503Response = {
  error: 'Service Unavailable',
  message: 'The service is temporarily unavailable',
  status: 503,
};

/**
 * Mock response with labels
 */
export const mockResponseWithLabels = {
  results: [
    {
      year: { value: 2020, label: '2020' },
      grade: { value: 9, label: 'Grade 9' },
      enrollment: { value: 3876543, label: '3,876,543 students' },
    },
  ],
  count: 1,
};

/**
 * Mock empty response
 */
export const mockEmptyResponse = {
  results: [],
  count: 0,
};
