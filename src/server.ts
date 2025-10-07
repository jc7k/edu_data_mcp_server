/**
 * MCP server configuration and request handler wiring
 */

import { Server } from '@modelcontextprotocol/sdk/server/index.js';
import {
  CallToolRequestSchema,
  ListResourcesRequestSchema,
  ListResourceTemplatesRequestSchema,
  ListToolsRequestSchema,
  ReadResourceRequestSchema,
} from '@modelcontextprotocol/sdk/types.js';
import { TOOL_DEFINITIONS, handleToolCall } from './handlers/tools.js';
import { listResources, listResourceTemplates, readResource } from './handlers/resources.js';

/**
 * Create and configure the MCP server
 */
export function createServer(): Server {
  const server = new Server(
    {
      name: 'edu-data-mcp-server',
      version: '0.1.0',
    },
    {
      capabilities: {
        resources: {},
        tools: {},
      },
    },
  );

  // Register tool handlers
  server.setRequestHandler(ListToolsRequestSchema, async () => ({
    tools: TOOL_DEFINITIONS,
  }));

  server.setRequestHandler(CallToolRequestSchema, async (request) => {
    return handleToolCall(request.params.name, (request.params.arguments || {}) as Record<string, unknown>);
  });

  // Register resource handlers
  server.setRequestHandler(ListResourcesRequestSchema, async () => listResources());

  server.setRequestHandler(ListResourceTemplatesRequestSchema, async () =>
    listResourceTemplates(),
  );

  server.setRequestHandler(ReadResourceRequestSchema, async (request) =>
    readResource(request.params.uri),
  );

  return server;
}
