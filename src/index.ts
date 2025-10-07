#!/usr/bin/env node

/**
 * Education Data MCP Server
 * 
 * This MCP server provides access to the Urban Institute's Education Data API,
 * similar to the functionality provided by the educationdata R package.
 * 
 * It allows:
 * - Retrieving detailed education data via the get_education_data tool
 * - Retrieving aggregated education data via the get_education_data_summary tool
 * - Browsing available endpoints via resources
 */

import { Server } from "@modelcontextprotocol/sdk/server/index.js";
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
import {
  CallToolRequestSchema,
  ListResourcesRequestSchema,
  ListResourceTemplatesRequestSchema,
  ListToolsRequestSchema,
  ReadResourceRequestSchema,
  ErrorCode,
  McpError,
} from "@modelcontextprotocol/sdk/types.js";
import axios from "axios";

// Base URL for the Education Data API
const API_BASE_URL = "https://educationdata.urban.org/api/v1";

// Define types for API responses
interface ApiEndpoint {
  level: string;
  source: string;
  topic: string;
  subtopic?: string[];
  mainFilters: string[];
  yearsAvailable: string;
}

// In-memory cache of available endpoints
let availableEndpoints: ApiEndpoint[] | null = null;

/**
 * Create an MCP server with capabilities for resources and tools
 */
const server = new Server(
  {
    name: "edu-data-mcp-server",
    version: "0.1.0",
  },
  {
    capabilities: {
      resources: {},
      tools: {},
    },
  }
);

/**
 * Fetch available endpoints from the API
 */
async function fetchAvailableEndpoints(): Promise<ApiEndpoint[]> {
  if (availableEndpoints) {
    return availableEndpoints;
  }

  try {
    // This is a simplified approach - in a real implementation, we would parse
    // the actual API documentation or use an endpoint that returns available endpoints
    const endpoints: ApiEndpoint[] = [
      {
        level: "schools",
        source: "ccd",
        topic: "enrollment",
        subtopic: ["race", "sex", "race, sex"],
        mainFilters: ["year", "grade"],
        yearsAvailable: "1986–2022"
      },
      {
        level: "schools",
        source: "ccd",
        topic: "directory",
        mainFilters: ["year"],
        yearsAvailable: "1986–2022"
      },
      {
        level: "school-districts",
        source: "ccd",
        topic: "enrollment",
        subtopic: ["race", "sex", "race, sex"],
        mainFilters: ["year", "grade"],
        yearsAvailable: "1986–2022"
      },
      {
        level: "college-university",
        source: "ipeds",
        topic: "directory",
        mainFilters: ["year"],
        yearsAvailable: "1980, 1984–2022"
      },
      // Add more endpoints as needed
    ];

    availableEndpoints = endpoints;
    return endpoints;
  } catch (error) {
    console.error("Error fetching available endpoints:", error);
    throw new McpError(
      ErrorCode.InternalError,
      "Failed to fetch available endpoints"
    );
  }
}

/**
 * Handler for listing available endpoints as resources
 */
server.setRequestHandler(ListResourcesRequestSchema, async () => {
  const endpoints = await fetchAvailableEndpoints();
  
  return {
    resources: endpoints.map(endpoint => {
      const subtopicStr = endpoint.subtopic ? ` (subtopics: ${endpoint.subtopic.join(", ")})` : "";
      const uri = `edu-data://endpoints/${endpoint.level}/${endpoint.source}/${endpoint.topic}`;
      
      return {
        uri,
        mimeType: "application/json",
        name: `${endpoint.level}/${endpoint.source}/${endpoint.topic}`,
        description: `Education data endpoint${subtopicStr}. Years: ${endpoint.yearsAvailable}. Main filters: ${endpoint.mainFilters.join(", ")}`
      };
    })
  };
});

/**
 * Handler for resource templates
 */
server.setRequestHandler(ListResourceTemplatesRequestSchema, async () => {
  return {
    resourceTemplates: [
      {
        uriTemplate: "edu-data://endpoints/{level}/{source}/{topic}",
        name: "Education Data Endpoint",
        mimeType: "application/json",
        description: "Information about a specific education data endpoint"
      }
    ]
  };
});

/**
 * Handler for reading endpoint details
 */
server.setRequestHandler(ReadResourceRequestSchema, async (request) => {
  const match = request.params.uri.match(/^edu-data:\/\/endpoints\/([^\/]+)\/([^\/]+)\/([^\/]+)$/);
  
  if (!match) {
    throw new McpError(
      ErrorCode.InvalidRequest,
      `Invalid URI format: ${request.params.uri}`
    );
  }
  
  const [, level, source, topic] = match;
  const endpoints = await fetchAvailableEndpoints();
  
  const endpoint = endpoints.find(e => 
    e.level === level && e.source === source && e.topic === topic
  );
  
  if (!endpoint) {
    throw new McpError(
      ErrorCode.InvalidRequest,
      `Endpoint not found: ${level}/${source}/${topic}`
    );
  }
  
  return {
    contents: [
      {
        uri: request.params.uri,
        mimeType: "application/json",
        text: JSON.stringify(endpoint, null, 2)
      }
    ]
  };
});

/**
 * Handler for listing available tools
 */
server.setRequestHandler(ListToolsRequestSchema, async () => {
  return {
    tools: [
      {
        name: "get_education_data",
        description: "Retrieve education data from the Urban Institute's Education Data API",
        inputSchema: {
          type: "object",
          properties: {
            level: {
              type: "string",
              description: "API data level to query (e.g., 'schools', 'school-districts', 'college-university')"
            },
            source: {
              type: "string",
              description: "API data source to query (e.g., 'ccd', 'ipeds', 'crdc')"
            },
            topic: {
              type: "string",
              description: "API data topic to query (e.g., 'enrollment', 'directory')"
            },
            subtopic: {
              type: "array",
              items: {
                type: "string"
              },
              description: "Optional list of grouping parameters (e.g., ['race', 'sex'])"
            },
            filters: {
              type: "object",
              description: "Optional query filters (e.g., {year: 2008, grade: [9,10,11,12]})"
            },
            add_labels: {
              type: "boolean",
              description: "Add variable labels when applicable (default: false)"
            },
            limit: {
              type: "number",
              description: "Limit the number of results (default: 100)"
            }
          },
          required: ["level", "source", "topic"]
        }
      },
      {
        name: "get_education_data_summary",
        description: "Retrieve aggregated education data from the Urban Institute's Education Data API",
        inputSchema: {
          type: "object",
          properties: {
            level: {
              type: "string",
              description: "API data level to query"
            },
            source: {
              type: "string",
              description: "API data source to query"
            },
            topic: {
              type: "string",
              description: "API data topic to query"
            },
            subtopic: {
              type: "string",
              description: "Optional additional parameters (only applicable to certain endpoints)"
            },
            stat: {
              type: "string",
              description: "Summary statistic to calculate (e.g., 'sum', 'avg', 'count', 'median')"
            },
            var: {
              type: "string",
              description: "Variable to be summarized"
            },
            by: {
              type: "array",
              items: {
                type: "string"
              },
              description: "Variables to group results by"
            },
            filters: {
              type: "object",
              description: "Optional query filters"
            }
          },
          required: ["level", "source", "topic", "stat", "var", "by"]
        }
      }
    ]
  };
});

/**
 * Handler for tool calls
 */
server.setRequestHandler(CallToolRequestSchema, async (request) => {
  switch (request.params.name) {
    case "get_education_data": {
      const { level, source, topic, subtopic, filters, add_labels, limit = 100 } = request.params.arguments || {};
      
      if (!level || !source || !topic) {
        throw new McpError(
          ErrorCode.InvalidParams,
          "Missing required parameters: level, source, and topic are required"
        );
      }
      
      try {
        // Construct the API URL
        let url = `${API_BASE_URL}/${level}/${source}/${topic}`;
        
        // Add subtopics if provided
        if (subtopic && Array.isArray(subtopic) && subtopic.length > 0) {
          url += `/${subtopic.join("/")}`;
        }
        
        // Add query parameters
        const queryParams = new URLSearchParams();
        queryParams.append("limit", String(limit));
        
        if (add_labels) {
          queryParams.append("add_labels", "true");
        }
        
        // Add filters
        if (filters && typeof filters === "object") {
          Object.entries(filters).forEach(([key, value]) => {
            if (Array.isArray(value)) {
              queryParams.append(key, value.join(","));
            } else {
              queryParams.append(key, String(value));
            }
          });
        }
        
        // Add mode=R to match the R package behavior
        queryParams.append("mode", "R");
        
        // Make the API request
        const response = await axios.get(`${url}?${queryParams.toString()}`);
        
        // Return the results
        return {
          content: [
            {
              type: "text",
              text: JSON.stringify(response.data.results || response.data, null, 2)
            }
          ]
        };
      } catch (error) {
        if (axios.isAxiosError(error)) {
          const statusCode = error.response?.status;
          const message = error.response?.data?.message || error.message;
          
          if (statusCode === 404) {
            throw new McpError(
              ErrorCode.InvalidRequest,
              `Endpoint not found: ${level}/${source}/${topic}`
            );
          } else if (statusCode === 400) {
            throw new McpError(
              ErrorCode.InvalidParams,
              `API error: ${message}`
            );
          } else if (statusCode === 413) {
            throw new McpError(
              ErrorCode.InvalidParams,
              "Your requested query returned too many records. Consider limiting the scope of your query."
            );
          }
          
          throw new McpError(
            ErrorCode.InternalError,
            `API error (${statusCode}): ${message}`
          );
        }
        
        throw new McpError(
          ErrorCode.InternalError,
          `Error: ${error instanceof Error ? error.message : String(error)}`
        );
      }
    }
    
    case "get_education_data_summary": {
      const args = request.params.arguments || {};
      const level = String(args.level || '');
      const source = String(args.source || '');
      const topic = String(args.topic || '');
      const subtopic = args.subtopic ? String(args.subtopic) : undefined;
      const stat = String(args.stat || '');
      const variable = String(args.var || '');
      const by = args.by;
      const filters = args.filters || {};

      const hasGrouping = Array.isArray(by)
        ? by.length > 0
        : typeof by === "string"
          ? by.trim().length > 0
          : by !== undefined && by !== null;

      if (!level || !source || !topic || !stat || !variable || !hasGrouping) {
        throw new McpError(
          ErrorCode.InvalidParams,
          "Missing required parameters: level, source, topic, stat, var, and by are required"
        );
      }
      
      try {
        // Construct the API URL
        let url = `${API_BASE_URL}/${level}/${source}/${topic}`;
        
        // Add subtopic if provided
        if (subtopic) {
          url += `/${subtopic}`;
        }
        
        // Add summaries endpoint
        url += "/summaries";
        
        // Add query parameters
        const queryParams = new URLSearchParams();
        queryParams.append("stat", stat);
        queryParams.append("var", variable);
        
        if (Array.isArray(by)) {
          queryParams.append("by", by.join(","));
        } else if (typeof by === "string") {
          queryParams.append("by", by);
        } else {
          queryParams.append("by", String(by));
        }
        
        // Add filters
        if (filters && typeof filters === "object") {
          Object.entries(filters).forEach(([key, value]) => {
            if (Array.isArray(value)) {
              queryParams.append(key, value.join(","));
            } else {
              queryParams.append(key, String(value));
            }
          });
        }
        
        // Add mode=R to match the R package behavior
        queryParams.append("mode", "R");
        
        // Make the API request
        const response = await axios.get(`${url}?${queryParams.toString()}`);
        
        // Return the results
        return {
          content: [
            {
              type: "text",
              text: JSON.stringify(response.data.results || response.data, null, 2)
            }
          ]
        };
      } catch (error) {
        if (axios.isAxiosError(error)) {
          const statusCode = error.response?.status;
          const message = error.response?.data?.message || error.message;
          
          if (statusCode === 404) {
            throw new McpError(
              ErrorCode.InvalidRequest,
              `Summary endpoint not found: ${level}/${source}/${topic}${subtopic ? `/${subtopic}` : ''}/summaries`
            );
          } else if (statusCode === 400) {
            throw new McpError(
              ErrorCode.InvalidParams,
              `API error: ${message}`
            );
          }
          
          throw new McpError(
            ErrorCode.InternalError,
            `API error (${statusCode}): ${message}`
          );
        }
        
        throw new McpError(
          ErrorCode.InternalError,
          `Error: ${error instanceof Error ? error.message : String(error)}`
        );
      }
    }
    
    default:
      throw new McpError(
        ErrorCode.MethodNotFound,
        `Unknown tool: ${request.params.name}`
      );
  }
});

/**
 * Start the server using stdio transport
 */
async function main() {
  const transport = new StdioServerTransport();
  await server.connect(transport);
  console.error("Education Data MCP server running on stdio");
}

main().catch((error) => {
  console.error("Server error:", error);
  process.exit(1);
});
