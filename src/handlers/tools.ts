/**
 * MCP tool handlers
 *
 * Handles get_education_data and get_education_data_summary tool calls
 */

import { ErrorCode, McpError } from '@modelcontextprotocol/sdk/types.js';
import { fetchEducationData, fetchSummaryData } from '../services/api-client.js';
import { ApiError, ValidationError, formatErrorForClient } from '../utils/errors.js';
import { validateEducationDataRequest, validateSummaryDataRequest } from '../services/validator.js';
import type { EducationDataRequest, SummaryDataRequest } from '../models/types.js';

/**
 * Tool definitions for MCP server
 */
export const TOOL_DEFINITIONS = [
  {
    name: 'get_education_data',
    description: "Retrieve education data from the Urban Institute's Education Data API",
    inputSchema: {
      type: 'object',
      properties: {
        level: {
          type: 'string',
          description:
            "API data level to query (e.g., 'schools', 'school-districts', 'college-university')",
        },
        source: {
          type: 'string',
          description: "API data source to query (e.g., 'ccd', 'ipeds', 'crdc')",
        },
        topic: {
          type: 'string',
          description: "API data topic to query (e.g., 'enrollment', 'directory')",
        },
        subtopic: {
          type: 'array',
          items: {
            type: 'string',
          },
          description: "Optional list of grouping parameters (e.g., ['race', 'sex'])",
        },
        filters: {
          type: 'object',
          description: 'Optional query filters (e.g., {year: 2008, grade: [9,10,11,12]})',
        },
        add_labels: {
          type: 'boolean',
          description: 'Add variable labels when applicable (default: false)',
        },
        limit: {
          type: 'number',
          description: 'Limit the number of results (default: 100)',
        },
      },
      required: ['level', 'source', 'topic'],
    },
  },
  {
    name: 'get_education_data_summary',
    description:
      "Retrieve aggregated education data from the Urban Institute's Education Data API",
    inputSchema: {
      type: 'object',
      properties: {
        level: {
          type: 'string',
          description: 'API data level to query',
        },
        source: {
          type: 'string',
          description: 'API data source to query',
        },
        topic: {
          type: 'string',
          description: 'API data topic to query',
        },
        subtopic: {
          type: 'string',
          description: 'Optional additional parameters (only applicable to certain endpoints)',
        },
        stat: {
          type: 'string',
          description: "Summary statistic to calculate (e.g., 'sum', 'avg', 'count', 'median')",
        },
        var: {
          type: 'string',
          description: 'Variable to be summarized',
        },
        by: {
          type: 'array',
          items: {
            type: 'string',
          },
          description: 'Variables to group results by',
        },
        filters: {
          type: 'object',
          description: 'Optional query filters',
        },
      },
      required: ['level', 'source', 'topic', 'stat', 'var', 'by'],
    },
  },
];

/**
 * Handle get_education_data tool call
 */
export async function handleGetEducationData(
  args: Record<string, unknown>,
): Promise<{ content: Array<{ type: string; text: string }> }> {
  try {
    // Validate and sanitize input
    const validatedRequest = validateEducationDataRequest(args);

    // Fetch data from API
    const data = await fetchEducationData(validatedRequest);

    return {
      content: [
        {
          type: 'text',
          text: JSON.stringify(data, null, 2),
        },
      ],
    };
  } catch (error) {
    // Handle validation errors
    if (error instanceof ValidationError) {
      throw new McpError(ErrorCode.InvalidParams, formatErrorForClient(error));
    }

    // Handle API errors
    if (error instanceof ApiError) {
      if (error.statusCode === 404) {
        throw new McpError(ErrorCode.InvalidRequest, error.message);
      } else if (error.statusCode === 400 || error.statusCode === 413) {
        throw new McpError(ErrorCode.InvalidParams, error.message);
      }
      throw new McpError(ErrorCode.InternalError, error.message);
    }

    // Handle unexpected errors
    throw new McpError(
      ErrorCode.InternalError,
      `Error: ${error instanceof Error ? error.message : String(error)}`,
    );
  }
}

/**
 * Handle get_education_data_summary tool call
 */
export async function handleGetEducationDataSummary(
  args: Record<string, unknown>,
): Promise<{ content: Array<{ type: string; text: string }> }> {
  try {
    // Validate and sanitize input
    const validatedRequest = validateSummaryDataRequest(args);

    // Fetch data from API
    const data = await fetchSummaryData(validatedRequest);

    return {
      content: [
        {
          type: 'text',
          text: JSON.stringify(data, null, 2),
        },
      ],
    };
  } catch (error) {
    // Handle validation errors
    if (error instanceof ValidationError) {
      throw new McpError(ErrorCode.InvalidParams, formatErrorForClient(error));
    }

    // Handle API errors
    if (error instanceof ApiError) {
      if (error.statusCode === 404) {
        throw new McpError(ErrorCode.InvalidRequest, error.message);
      } else if (error.statusCode === 400) {
        throw new McpError(ErrorCode.InvalidParams, error.message);
      }
      throw new McpError(ErrorCode.InternalError, error.message);
    }

    // Handle unexpected errors
    throw new McpError(
      ErrorCode.InternalError,
      `Error: ${error instanceof Error ? error.message : String(error)}`,
    );
  }
}

/**
 * Route tool call to appropriate handler
 */
export async function handleToolCall(
  name: string,
  args: Record<string, unknown>,
): Promise<{ content: Array<{ type: string; text: string }> }> {
  switch (name) {
    case 'get_education_data':
      return handleGetEducationData(args);
    case 'get_education_data_summary':
      return handleGetEducationDataSummary(args);
    default:
      throw new McpError(ErrorCode.MethodNotFound, `Unknown tool: ${name}`);
  }
}
