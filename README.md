# Education Data MCP Server

This repository contains an MCP (Model Context Protocol) server that provides access to the Urban Institute's Education Data API. The server is designed to be used with Claude to enable easy access to education data.

## Repository Structure

- `education-data-package-r/`: The original R package for accessing the Education Data API (for reference)
- `src/`: The MCP server source code
- `build/`: The compiled MCP server

## About the Education Data API

The Urban Institute's [Education Data API](https://educationdata.urban.org/) provides access to a wide range of education data, including:

- School and district enrollment data
- College and university data
- Assessment data
- Financial data
- And much more

The API is organized by levels (schools, school-districts, college-university), sources (ccd, ipeds, crdc, etc.), and topics (enrollment, directory, finance, etc.).

## Features

- Retrieve detailed education data via the `get_education_data` tool
- Retrieve aggregated education data via the `get_education_data_summary` tool
- Browse available endpoints via resources

## Installation

1. Clone this repository:
   ```
   git clone https://github.com/yourusername/edu-data-mcp-server.git
   cd edu-data-mcp-server
   ```

2. Install dependencies:
   ```
   npm install
   ```

3. Build the server:
   ```
   npm run build
   ```

4. Make the server available for npx:
   ```
   npm link
   ```

## Configuring the MCP Server

To use this MCP server with Claude, you need to add it to your MCP settings configuration file.

### For Claude Desktop App (macOS)

Edit `~/Library/Application Support/Claude/claude_desktop_config.json`:

```json
{
  "mcpServers": {
    "edu-data": {
      "command": "npx",
      "args": ["edu-data-mcp-server"],
      "disabled": false,
      "alwaysAllow": []
    }
  }
}
```

### For Claude in VSCode

Edit `/home/codespace/.vscode-remote/data/User/globalStorage/rooveterinaryinc.roo-cline/settings/cline_mcp_settings.json`:

```json
{
  "mcpServers": {
    "edu-data": {
      "command": "npx",
      "args": ["edu-data-mcp-server"],
      "disabled": false,
      "alwaysAllow": []
    }
  }
}
```

## Available Tools

### get_education_data

Retrieves detailed education data from the API.

Parameters:
- `level` (required): API data level to query (e.g., 'schools', 'school-districts', 'college-university')
- `source` (required): API data source to query (e.g., 'ccd', 'ipeds', 'crdc')
- `topic` (required): API data topic to query (e.g., 'enrollment', 'directory')
- `subtopic` (optional): List of grouping parameters (e.g., ['race', 'sex'])
- `filters` (optional): Query filters (e.g., {year: 2008, grade: [9,10,11,12]})
- `add_labels` (optional): Add variable labels when applicable (default: false)
- `limit` (optional): Limit the number of results (default: 100)

Example:
```json
{
  "level": "schools",
  "source": "ccd",
  "topic": "enrollment",
  "subtopic": ["race", "sex"],
  "filters": {
    "year": 2008,
    "grade": [9, 10, 11, 12]
  },
  "add_labels": true,
  "limit": 50
}
```

### get_education_data_summary

Retrieves aggregated education data from the API.

Parameters:
- `level` (required): API data level to query
- `source` (required): API data source to query
- `topic` (required): API data topic to query
- `subtopic` (optional): Additional parameters (only applicable to certain endpoints)
- `stat` (required): Summary statistic to calculate (e.g., 'sum', 'avg', 'count', 'median')
- `var` (required): Variable to be summarized
- `by` (required): Variables to group results by
- `filters` (optional): Query filters

Example:
```json
{
  "level": "schools",
  "source": "ccd",
  "topic": "enrollment",
  "stat": "sum",
  "var": "enrollment",
  "by": ["fips"],
  "filters": {
    "fips": [6, 7, 8],
    "year": [2004, 2005]
  }
}
```

## Available Resources

The server provides resources for browsing available endpoints:

- `edu-data://endpoints/{level}/{source}/{topic}`: Information about a specific education data endpoint

## Example Usage with Claude

Once the MCP server is configured, you can use it with Claude to access education data:

```
Can you show me the enrollment data for high schools in California for 2020?
```

Claude can then use the MCP server to retrieve and analyze the data:

```
use_mcp_tool
server_name: edu-data
tool_name: get_education_data
arguments: {
  "level": "schools",
  "source": "ccd",
  "topic": "enrollment",
  "filters": {
    "year": 2020,
    "fips": 6,
    "grade": [9, 10, 11, 12]
  },
  "limit": 10
}
```

## Development

To run the server directly:

```
npm start
```

To run the server in watch mode during development:

```
npm run watch
```

To inspect the server's capabilities:

```
npm run inspector
```

To run the server using npx:

```
npx edu-data-mcp-server
```

## License

MIT