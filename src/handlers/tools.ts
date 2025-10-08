/**
 * MCP tool handlers
 *
 * Handles get_education_data and get_education_data_summary tool calls
 */

import { ErrorCode, McpError } from '@modelcontextprotocol/sdk/types.js';
import { fetchEducationData, fetchSummaryData } from '../services/api-client.js';
import {
  ApiError,
  ValidationError,
  TokenLimitError,
  PaginationError,
  FieldSelectionError,
  formatErrorForClient,
} from '../utils/errors.js';
import {
  validateEducationDataRequest,
  validateSummaryDataRequest,
  validatePaginationParams,
  validateFieldNames,
} from '../services/validator.js';
import {
  formatPaginatedResponse,
  sliceApiPage,
  selectFields,
  estimateTokens,
} from '../services/response-formatter.js';
import type { EducationDataRequest, SummaryDataRequest } from '../models/types.js';
import { TOKEN_LIMITS } from '../config/constants.js';

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
          description: 'Records per page (default: 20, max: 1000). Reduced from 100 to prevent token overflow.',
        },
        page: {
          type: 'number',
          description: 'Page number (1-indexed). Mutually exclusive with offset.',
        },
        offset: {
          type: 'number',
          description: 'Record offset (0-indexed). Mutually exclusive with page.',
        },
        fields: {
          type: 'array',
          items: {
            type: 'string',
          },
          description: 'Optional array of field names to include in response (reduces token usage).',
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
        limit: {
          type: 'number',
          description: 'Records per page (default: 20, max: 1000)',
        },
        page: {
          type: 'number',
          description: 'Page number (1-indexed). Mutually exclusive with offset.',
        },
        offset: {
          type: 'number',
          description: 'Record offset (0-indexed). Mutually exclusive with page.',
        },
        fields: {
          type: 'array',
          items: {
            type: 'string',
          },
          description: 'Optional array of field names to include in response',
        },
      },
      required: ['level', 'source', 'topic', 'stat', 'var', 'by'],
    },
  },
];

/**
 * Handle get_education_data tool call with pagination support
 */
export async function handleGetEducationData(
  args: Record<string, unknown>,
): Promise<{ content: Array<{ type: string; text: string }> }> {
  try {
    // Validate and sanitize input
    const validatedRequest = validateEducationDataRequest(args);

    // Validate and normalize pagination parameters
    const pagination = validatePaginationParams({
      page: validatedRequest.page,
      offset: validatedRequest.offset,
      limit: validatedRequest.limit,
    });

    // Fetch data from API (returns full API response with count, results, etc.)
    const apiResponse = await fetchEducationData(validatedRequest);

    // Slice API results to user's requested page
    // API returns up to 10K records; user may want 20 records starting at offset X
    const slicedRecords = sliceApiPage(
      apiResponse.results as Record<string, unknown>[],
      pagination.offset,
      pagination.limit,
      0, // API offset (we're on API page 1 for now; multi-page support in Phase 4)
    );

    // Validate and apply field selection if requested
    let finalRecords: unknown[] = slicedRecords;
    if (validatedRequest.fields && validatedRequest.fields.length > 0 && slicedRecords.length > 0) {
      // Validate field names against first record
      validateFieldNames(validatedRequest.fields, slicedRecords[0]);
      // Apply field selection
      finalRecords = selectFields(slicedRecords, validatedRequest.fields);
    }

    // Format as paginated response
    const paginatedResponse = formatPaginatedResponse(
      finalRecords,
      apiResponse.count,
      pagination.page,
      pagination.limit,
    );

    // Convert to compact JSON (no indentation to save tokens)
    const jsonResponse = JSON.stringify(paginatedResponse);

    // Validate token count
    const tokenEstimate = estimateTokens(jsonResponse, TOKEN_LIMITS.MAX_RESPONSE_TOKENS);
    if (tokenEstimate.exceeds_limit) {
      throw new TokenLimitError(
        `Response size exceeds limit`,
        tokenEstimate.estimated_tokens,
        TOKEN_LIMITS.MAX_RESPONSE_TOKENS,
        [
          `Reduce limit (current: ${pagination.limit})`,
          `Use field selection to request specific fields`,
          `Add more filters to narrow results`,
        ],
      );
    }

    return {
      content: [
        {
          type: 'text',
          text: jsonResponse,
        },
      ],
    };
  } catch (error) {
    // Handle pagination errors
    if (error instanceof PaginationError) {
      throw new McpError(ErrorCode.InvalidParams, formatErrorForClient(error));
    }

    // Handle field selection errors
    if (error instanceof FieldSelectionError) {
      throw new McpError(ErrorCode.InvalidParams, formatErrorForClient(error));
    }

    // Handle token limit errors
    if (error instanceof TokenLimitError) {
      throw new McpError(ErrorCode.InvalidParams, formatErrorForClient(error));
    }

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
 * Handle get_education_data_summary tool call with pagination support
 */
export async function handleGetEducationDataSummary(
  args: Record<string, unknown>,
): Promise<{ content: Array<{ type: string; text: string }> }> {
  try {
    // Validate and sanitize input
    const validatedRequest = validateSummaryDataRequest(args);

    // Validate and normalize pagination parameters
    const pagination = validatePaginationParams({
      page: validatedRequest.page,
      offset: validatedRequest.offset,
      limit: validatedRequest.limit,
    });

    // Fetch data from API (returns full API response with count, results, etc.)
    const apiResponse = await fetchSummaryData(validatedRequest);

    // Slice API results to user's requested page
    const slicedRecords = sliceApiPage(
      apiResponse.results as Record<string, unknown>[],
      pagination.offset,
      pagination.limit,
      0,
    );

    // Validate and apply field selection if requested
    let finalRecords: unknown[] = slicedRecords;
    if (validatedRequest.fields && validatedRequest.fields.length > 0 && slicedRecords.length > 0) {
      validateFieldNames(validatedRequest.fields, slicedRecords[0]);
      finalRecords = selectFields(slicedRecords, validatedRequest.fields);
    }

    // Format as paginated response
    const paginatedResponse = formatPaginatedResponse(
      finalRecords,
      apiResponse.count,
      pagination.page,
      pagination.limit,
    );

    // Convert to compact JSON
    const jsonResponse = JSON.stringify(paginatedResponse);

    // Validate token count
    const tokenEstimate = estimateTokens(jsonResponse, TOKEN_LIMITS.MAX_RESPONSE_TOKENS);
    if (tokenEstimate.exceeds_limit) {
      throw new TokenLimitError(
        `Response size exceeds limit`,
        tokenEstimate.estimated_tokens,
        TOKEN_LIMITS.MAX_RESPONSE_TOKENS,
        [
          `Reduce limit (current: ${pagination.limit})`,
          `Use field selection to request specific fields`,
          `Add more filters to narrow results`,
        ],
      );
    }

    return {
      content: [
        {
          type: 'text',
          text: jsonResponse,
        },
      ],
    };
  } catch (error) {
    // Handle pagination errors
    if (error instanceof PaginationError) {
      throw new McpError(ErrorCode.InvalidParams, formatErrorForClient(error));
    }

    // Handle field selection errors
    if (error instanceof FieldSelectionError) {
      throw new McpError(ErrorCode.InvalidParams, formatErrorForClient(error));
    }

    // Handle token limit errors
    if (error instanceof TokenLimitError) {
      throw new McpError(ErrorCode.InvalidParams, formatErrorForClient(error));
    }

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
