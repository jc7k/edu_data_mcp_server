/**
 * MCP resource handlers
 *
 * Handles ListResources, ListResourceTemplates, and ReadResource requests
 */

import { ErrorCode, McpError } from '@modelcontextprotocol/sdk/types.js';
import { AVAILABLE_ENDPOINTS, type ApiEndpoint } from '../config/endpoints.js';

/**
 * Resource template definitions
 */
export const RESOURCE_TEMPLATES = [
  {
    uriTemplate: 'edu-data://endpoints/{level}/{source}/{topic}',
    name: 'Education Data Endpoint',
    mimeType: 'application/json',
    description: 'Information about a specific education data endpoint',
  },
];

/**
 * List all available endpoints as resources
 */
export function listResources(): {
  resources: Array<{
    uri: string;
    mimeType: string;
    name: string;
    description: string;
  }>;
} {
  return {
    resources: AVAILABLE_ENDPOINTS.map((endpoint) => {
      const subtopicStr = endpoint.subtopic
        ? ` (subtopics: ${endpoint.subtopic.join(', ')})`
        : '';
      const uri = `edu-data://endpoints/${endpoint.level}/${endpoint.source}/${endpoint.topic}`;

      return {
        uri,
        mimeType: 'application/json',
        name: `${endpoint.level}/${endpoint.source}/${endpoint.topic}`,
        description: `Education data endpoint${subtopicStr}. Years: ${endpoint.yearsAvailable}. Main filters: ${endpoint.mainFilters.join(', ')}`,
      };
    }),
  };
}

/**
 * List resource templates
 */
export function listResourceTemplates(): {
  resourceTemplates: Array<{
    uriTemplate: string;
    name: string;
    mimeType: string;
    description: string;
  }>;
} {
  return {
    resourceTemplates: RESOURCE_TEMPLATES,
  };
}

/**
 * Read a specific endpoint resource
 */
export function readResource(uri: string): {
  contents: Array<{
    uri: string;
    mimeType: string;
    text: string;
  }>;
} {
  const match = uri.match(/^edu-data:\/\/endpoints\/([^/]+)\/([^/]+)\/([^/]+)$/);

  if (!match) {
    throw new McpError(ErrorCode.InvalidRequest, `Invalid URI format: ${uri}`);
  }

  const [, level, source, topic] = match;

  const endpoint = AVAILABLE_ENDPOINTS.find(
    (e) => e.level === level && e.source === source && e.topic === topic,
  );

  if (!endpoint) {
    throw new McpError(ErrorCode.InvalidRequest, `Endpoint not found: ${level}/${source}/${topic}`);
  }

  return {
    contents: [
      {
        uri,
        mimeType: 'application/json',
        text: JSON.stringify(endpoint, null, 2),
      },
    ],
  };
}
