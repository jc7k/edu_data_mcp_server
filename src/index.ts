#!/usr/bin/env node

/**
 * Education Data MCP Server
 *
 * Entry point for the MCP server that provides access to the
 * Urban Institute's Education Data API.
 *
 * This server allows:
 * - Retrieving detailed education data via the get_education_data tool
 * - Retrieving aggregated education data via the get_education_data_summary tool
 * - Browsing available endpoints via resources
 */

import { StdioServerTransport } from '@modelcontextprotocol/sdk/server/stdio.js';
import { createServer } from './server.js';

/**
 * Start the server using stdio transport
 */
async function main(): Promise<void> {
  const server = createServer();
  const transport = new StdioServerTransport();
  await server.connect(transport);
  console.error('Education Data MCP server running on stdio');
}

main().catch((error) => {
  console.error('Fatal error in main():', error);
  process.exit(1);
});
