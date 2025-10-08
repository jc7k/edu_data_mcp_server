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
- **Smart pagination** for large datasets (default 20 records per page)
- **Field selection** to reduce token usage by requesting only needed fields
- **Automatic token limit validation** prevents responses exceeding context windows
- Navigate through millions of records with page-based or offset-based pagination

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

### For Claude Code (Local Development)

If you're developing and contributing to this project, you can configure Claude Code to use your local build instead of the published package.

Create or edit `.claude/mcp_config.json` in the project root:

```json
{
  "mcpServers": {
    "edu-data": {
      "command": "node",
      "args": ["./build/index.js"]
    }
  }
}
```

This configuration:
- Uses your local `build/index.js` directly
- Automatically picks up changes when you rebuild (`npm run build`)
- Perfect for testing changes before publishing
- Use `/mcp` command in Claude Code to reconnect after rebuilding

**Development Workflow:**
1. Make changes to source code in `src/`
2. Run `npm run build` to compile
3. Type `/mcp` in Claude Code to reconnect
4. Test your changes immediately

## Available Tools

### get_education_data

Retrieves detailed education data from the API with pagination support.

**Parameters:**
- `level` (required): API data level to query (e.g., 'schools', 'school-districts', 'college-university')
- `source` (required): API data source to query (e.g., 'ccd', 'ipeds', 'crdc')
- `topic` (required): API data topic to query (e.g., 'enrollment', 'directory')
- `subtopic` (optional): List of grouping parameters (e.g., ['race', 'sex'])
- `filters` (optional): Query filters (e.g., {year: 2008, grade: [9,10,11,12]})
- `add_labels` (optional): Add variable labels when applicable (default: false)

**Pagination Parameters:**
- `limit` (optional): Records per page (default: 20, max: 1000)
- `page` (optional): Page number, 1-indexed (mutually exclusive with `offset`)
- `offset` (optional): Record offset, 0-indexed (mutually exclusive with `page`)
- `fields` (optional): Array of field names to include in response (reduces token usage)

**Response Structure:**
```json
{
  "results": [ /* array of records */ ],
  "pagination": {
    "total_count": 1000,
    "current_page": 1,
    "page_size": 20,
    "total_pages": 50,
    "has_more": true,
    "next_page": 2
  }
}
```

**Basic Example:**
```json
{
  "level": "schools",
  "source": "ccd",
  "topic": "enrollment",
  "filters": {
    "year": 2020,
    "fips": 6
  },
  "limit": 20
}
```

**Pagination Example:**
```json
{
  "level": "schools",
  "source": "ccd",
  "topic": "directory",
  "filters": { "year": 2020 },
  "page": 2,
  "limit": 50
}
```

**Field Selection Example:**
```json
{
  "level": "schools",
  "source": "ccd",
  "topic": "directory",
  "filters": { "year": 2020 },
  "fields": ["ncessch", "school_name", "city", "state_location"],
  "limit": 100
}
```

### get_education_data_summary

Retrieves aggregated education data from the API with pagination support.

**Parameters:**
- `level` (required): API data level to query
- `source` (required): API data source to query
- `topic` (required): API data topic to query
- `subtopic` (optional): Additional parameters (only applicable to certain endpoints)
- `stat` (required): Summary statistic to calculate (e.g., 'sum', 'avg', 'count', 'median')
- `var` (required): Variable to be summarized
- `by` (required): Variables to group results by
- `filters` (optional): Query filters

**Pagination Parameters:**
- `limit` (optional): Records per page (default: 20, max: 1000)
- `page` (optional): Page number, 1-indexed (mutually exclusive with `offset`)
- `offset` (optional): Record offset, 0-indexed (mutually exclusive with `page`)
- `fields` (optional): Array of field names to include in response

**Response Structure:** Same paginated format as `get_education_data`

**Example:**
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
  },
  "limit": 20
}
```

## Pagination Guide

### Why Pagination?

The Education Data API can return datasets with millions of records. Without pagination, responses could exceed 4M tokens, far beyond LLM context windows. This server implements smart pagination to:
- Keep responses under 10K tokens by default
- Enable navigation through large datasets
- Reduce token costs with field selection

### Page vs Offset

Choose the pagination style that fits your use case:

**Page-based (recommended for browsing):**
```json
{
  "page": 1,
  "limit": 20
}
```

**Offset-based (for precise positioning):**
```json
{
  "offset": 100,
  "limit": 20
}
```

**Note:** You cannot specify both `page` and `offset` in the same request.

### Field Selection

Dramatically reduce token usage by requesting only needed fields:

```json
{
  "level": "schools",
  "source": "ccd",
  "topic": "directory",
  "filters": { "year": 2020, "fips": 6 },
  "fields": ["ncessch", "school_name", "enrollment"],
  "limit": 100
}
```

Field selection can reduce response size by 50-97% depending on the dataset.

### Navigating Large Datasets

Use pagination metadata to navigate through results:

```json
{
  "results": [...],
  "pagination": {
    "total_count": 50000,
    "current_page": 1,
    "page_size": 20,
    "total_pages": 2500,
    "has_more": true,
    "next_page": 2
  }
}
```

- `has_more`: Check if more results exist
- `next_page`: Next page number (or `null` if on last page)
- `total_pages`: Total pages available

### Best Practices

1. **Start with default limit (20)** - Prevents token overflow
2. **Use field selection** - Request only needed fields
3. **Add filters** - Narrow results before increasing limit
4. **Check `has_more`** - Determine if more pages exist
5. **Monitor token usage** - Server validates responses stay under 10K tokens

### Multi-Page Navigation

The server automatically handles datasets beyond the API's 10K record page limit:

```json
{
  "offset": 15000,
  "limit": 20
}
```

This will:
1. Fetch API page 2 (records 10000-19999)
2. Slice to your requested records (15000-15019)
3. Return paginated response

You can navigate through millions of records seamlessly.

## Migration Guide (v0.0.x → v0.1.0)

### Breaking Changes

**1. Response Structure Changed**

Before (v0.0.x):
```json
[
  { "id": 1, "name": "School A" },
  { "id": 2, "name": "School B" }
]
```

After (v0.1.0):
```json
{
  "results": [
    { "id": 1, "name": "School A" },
    { "id": 2, "name": "School B" }
  ],
  "pagination": {
    "total_count": 100,
    "current_page": 1,
    "page_size": 2,
    "total_pages": 50,
    "has_more": true,
    "next_page": 2
  }
}
```

**2. Default Limit Reduced**

- Before: 100 records per request
- After: 20 records per request

**Why:** Prevents 4M token responses that exceed LLM context windows.

**3. New Required Response Parsing**

Update your code to access results:

```javascript
// Before
const schools = response;

// After
const schools = response.results;
const totalCount = response.pagination.total_count;
```

### Upgrade Path

1. **Update response parsing** - Access `response.results` instead of treating response as array
2. **Adjust expectations** - Default returns 20 records instead of 100
3. **Add pagination** - Use `page` or `offset` parameters to navigate
4. **Consider field selection** - Use `fields` parameter to reduce token usage

## Available Resources

The server provides resources for browsing available endpoints:

- `edu-data://endpoints/{level}/{source}/{topic}`: Information about a specific education data endpoint

## Supported Endpoints

The server validates requests against a comprehensive whitelist of verified Urban Institute API endpoints. This ensures security while providing access to all major education data sources.

### CCD Endpoints (K-12 Schools)
- `schools/ccd/enrollment` - Student enrollment data with race/sex breakdowns
- `schools/ccd/directory` - School directory information
- `school-districts/ccd/enrollment` - District-level enrollment data
- `school-districts/ccd/directory` - School district directory information

### IPEDS Endpoints (Higher Education)
The server supports comprehensive IPEDS data access with the following endpoints:

- `college-university/ipeds/directory` - Institution directory and basic information
- `college-university/ipeds/institutional-characteristics` - Detailed institutional data
- `college-university/ipeds/fall-enrollment` - Fall term enrollment counts (FTE and headcount)
- `college-university/ipeds/enrollment` - General enrollment data with demographics
- `college-university/ipeds/enrollment-full-time-equivalent` - FTE enrollment calculations
- `college-university/ipeds/admissions-enrollment` - Admissions and first-year enrollment data
- `college-university/ipeds/admissions-requirements` - Admissions policies and requirements
- `college-university/ipeds/completions-cip-2` - Degrees awarded by 2-digit CIP code (broad fields)
- `college-university/ipeds/completions-cip-6` - Degrees awarded by 6-digit CIP code (detailed programs)
- `college-university/ipeds/outcome-measures` - Graduation and retention rates
- `college-university/ipeds/sfa-grants-and-net-price` - Financial aid and net price data
- `college-university/ipeds/finance` - Institutional financial data

All endpoints support year-based filtering, with IPEDS data generally available from 1980, 1984-2022 (varies by endpoint).

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