# Quickstart Guide: Pagination and Response Size Optimization

**Feature**: 002-implement-response-size
**For**: AI agents and users of the Education Data MCP server
**Updated**: 2025-10-07

## What's New

The Education Data MCP server now supports:

✅ **Pagination** - Get results in manageable chunks (default: 20 records)
✅ **Field Selection** - Request only the fields you need
✅ **Token Optimization** - Responses are 99% smaller (from 4.4M to <10K tokens)

---

## Quick Examples

### Example 1: Basic Paginated Query (Default Behavior)

**Request**:
```json
{
  "level": "schools",
  "source": "ccd",
  "topic": "directory",
  "filters": {
    "year": 2020,
    "state_location": "AL"
  }
}
```

**Response** (new structure):
```json
{
  "results": [
    {
      "ncessch": "010000500871",
      "name": "Albertville Elementary School",
      "enrollment": 684,
      "city": "Albertville",
      "state_location": "AL"
      // ... all other fields
    }
    // ... 19 more schools (20 total)
  ],
  "pagination": {
    "total_count": 1234,
    "current_page": 1,
    "page_size": 20,
    "total_pages": 62,
    "has_more": true,
    "next_page": 2
  }
}
```

**What changed**:
- Previously returned 100 records by default
- Now returns 20 records by default
- Response includes pagination metadata

---

### Example 2: Request More Records Per Page

**Request**:
```json
{
  "level": "schools",
  "source": "ccd",
  "topic": "enrollment",
  "filters": {
    "year": 2020
  },
  "limit": 50
}
```

**Response**: Returns 50 records instead of 20

**Note**: Maximum limit is 1000 records per page.

---

### Example 3: Navigate to Next Page

**Request**:
```json
{
  "level": "schools",
  "source": "ccd",
  "topic": "directory",
  "filters": {
    "year": 2020
  },
  "page": 2,
  "limit": 20
}
```

**Response**: Returns records 21-40

**Navigation tip**: Use `pagination.next_page` from the previous response:
```javascript
if (response.pagination.has_more) {
  const nextPageNumber = response.pagination.next_page; // 2
  // Make new request with page=nextPageNumber
}
```

---

### Example 4: Use Offset Instead of Page

**Request**:
```json
{
  "level": "schools",
  "source": "ccd",
  "topic": "enrollment",
  "filters": {
    "year": 2020
  },
  "offset": 100,
  "limit": 25
}
```

**Response**: Returns records 101-125

**When to use offset**:
- When you need precise record positioning
- When implementing "skip N records" logic
- Alternative to page-based navigation

**Note**: Cannot use both `page` and `offset` in the same request.

---

### Example 5: Field Selection (Reduce Token Usage)

**Request**:
```json
{
  "level": "schools",
  "source": "ccd",
  "topic": "directory",
  "filters": {
    "year": 2020,
    "state_location": "CA"
  },
  "limit": 20,
  "fields": ["name", "enrollment", "city"]
}
```

**Response** (only requested fields):
```json
{
  "results": [
    {
      "name": "Alameda High School",
      "enrollment": 2145,
      "city": "Alameda"
    },
    {
      "name": "Berkeley High School",
      "enrollment": 3145,
      "city": "Berkeley"
    }
    // ... 18 more (20 total)
  ],
  "pagination": {
    "total_count": 10450,
    "current_page": 1,
    "page_size": 20,
    "total_pages": 523,
    "has_more": true,
    "next_page": 2
  }
}
```

**Token savings**:
- Full record: ~3000 tokens per record
- 3 fields only: ~100 tokens per record
- **97% reduction!**

---

## Common Workflows

### Workflow 1: Get First 100 Schools (Like Old Default)

To match previous behavior (100 records):

```json
{
  "level": "schools",
  "source": "ccd",
  "topic": "directory",
  "filters": {
    "year": 2020
  },
  "limit": 100
}
```

---

### Workflow 2: Iterate Through All Results

```typescript
let currentPage = 1;
let hasMore = true;
const allResults = [];

while (hasMore) {
  const response = await getEducationData({
    level: "schools",
    source: "ccd",
    topic: "directory",
    filters: { year: 2020 },
    page: currentPage,
    limit: 50
  });

  allResults.push(...response.results);

  hasMore = response.pagination.has_more;
  currentPage = response.pagination.next_page;

  console.log(`Fetched ${allResults.length} of ${response.pagination.total_count}`);
}

console.log(`Complete! Retrieved ${allResults.length} schools.`);
```

---

### Workflow 3: Process Large Dataset Efficiently

For datasets with 10K+ records, use pagination with field selection:

```typescript
const batchSize = 100;
let currentPage = 1;
let hasMore = true;

while (hasMore) {
  const response = await getEducationData({
    level: "schools",
    source: "ccd",
    topic: "enrollment",
    filters: { year: 2020, grade: 9 },
    page: currentPage,
    limit: batchSize,
    fields: ["ncessch", "enrollment"] // Only fields needed for analysis
  });

  // Process this batch
  response.results.forEach(school => {
    analyzeEnrollment(school);
  });

  hasMore = response.pagination.has_more;
  currentPage++;

  // Progress indicator
  const progress = (currentPage * batchSize / response.pagination.total_count * 100).toFixed(1);
  console.log(`Progress: ${progress}%`);
}
```

---

### Workflow 4: Jump to Specific Page Range

Get records 1000-1100:

```typescript
const response = await getEducationData({
  level: "schools",
  source: "ccd",
  topic: "directory",
  filters: { year: 2020 },
  offset: 1000,
  limit: 100
});

// Returns records 1001-1100
```

---

## Pagination Parameters

### page (optional, default: 1)

- **Type**: integer
- **Min**: 1
- **Description**: Page number (1-indexed)
- **Mutually exclusive with**: `offset`

**Examples**:
```json
{ "page": 1 }     // First page
{ "page": 10 }    // Tenth page
{ "page": 0 }     // ❌ ERROR: Must be >= 1
```

---

### limit (optional, default: 20)

- **Type**: integer
- **Min**: 1
- **Max**: 1000
- **Description**: Records per page

**Examples**:
```json
{ "limit": 20 }    // Default
{ "limit": 100 }   // Like old default
{ "limit": 1000 }  // Maximum allowed
{ "limit": 5000 }  // ❌ ERROR: Exceeds maximum
```

---

### offset (optional, default: 0)

- **Type**: integer
- **Min**: 0
- **Description**: Record offset (0-indexed)
- **Mutually exclusive with**: `page`

**Examples**:
```json
{ "offset": 0 }    // Start at first record
{ "offset": 100 }  // Skip first 100 records
{ "offset": -10 }  // ❌ ERROR: Must be >= 0
```

**Converting between page and offset**:
```javascript
// Page to offset
const offset = (page - 1) * limit;

// Offset to page
const page = Math.floor(offset / limit) + 1;
```

---

### fields (optional, default: all fields)

- **Type**: array of strings
- **Description**: Field names to include in response
- **Case sensitive**: Field names must match exactly

**Examples**:
```json
{ "fields": ["name", "enrollment"] }
{ "fields": ["ncessch", "name", "city", "state_location"] }
{ "fields": ["invalid_field"] }  // ❌ ERROR: Unknown field
```

**To get available field names**:
1. Make a request without `fields` parameter
2. Inspect first result to see all available fields
3. Use those field names in subsequent requests

---

## Pagination Metadata

Every response includes pagination metadata:

```typescript
interface PaginationMetadata {
  total_count: number;      // Total records matching filters
  current_page: number;     // Current page (1-indexed)
  page_size: number;        // Records in this response
  total_pages: number;      // Total pages available
  has_more: boolean;        // More results exist?
  next_page: number | null; // Next page number or null
}
```

### Key Fields Explained

**total_count**: Total records available across all pages
```json
{"total_count": 101662}  // 101,662 schools match your filters
```

**current_page**: The page you requested
```json
{"current_page": 5}  // You're viewing page 5
```

**page_size**: Actual number of records in this response
```json
{"page_size": 20}  // This response contains 20 records
```
Note: May be less than `limit` on the last page.

**total_pages**: How many pages exist
```json
{"total_pages": 523}  // 523 pages total with current limit
```

**has_more**: Boolean for easy checking
```json
{"has_more": true}  // More pages available
{"has_more": false} // This is the last page
```

**next_page**: What page to request next
```json
{"next_page": 6}     // Request page 6 next
{"next_page": null}  // No more pages (last page)
```

---

## Error Handling

### Error: Both page and offset specified

```json
{
  "error": "invalid_params",
  "message": "Cannot specify both page and offset parameters",
  "details": {
    "suggestion": "Use either page or offset, not both"
  }
}
```

**Fix**: Choose one navigation method:
```json
// Option 1: Page-based
{"page": 2, "limit": 20}

// Option 2: Offset-based
{"offset": 20, "limit": 20}
```

---

### Error: Response too large

```json
{
  "error": "response_too_large",
  "message": "Response too large: ~15,000 tokens (limit: 10,000)",
  "estimated_tokens": 15000,
  "limit": 10000,
  "suggestions": [
    "Reduce limit parameter (currently: 100)",
    "Use field selection to request specific fields",
    "Add more filters to reduce total_count"
  ]
}
```

**Fix options**:
1. **Reduce limit**:
   ```json
   {"limit": 20}  // Instead of 100
   ```

2. **Use field selection**:
   ```json
   {"limit": 100, "fields": ["name", "enrollment"]}
   ```

3. **Add filters**:
   ```json
   {
     "filters": {
       "year": 2020,
       "state_location": "CA",  // Narrow down results
       "grade": 9
     }
   }
   ```

---

### Error: Invalid field name

```json
{
  "error": "invalid_params",
  "message": "Unknown field 'invalid_field'. Available fields: ncessch, name, enrollment, city, state_location, ..."
}
```

**Fix**: Use field names from the error message:
```json
{"fields": ["ncessch", "name", "enrollment"]}
```

---

### Error: Page out of range

```json
{
  "results": [],
  "pagination": {
    "total_count": 1234,
    "current_page": 9999,
    "page_size": 0,
    "total_pages": 62,
    "has_more": false,
    "next_page": null
  }
}
```

This is not an error, just an empty result. Check `total_pages` to see the valid range.

**Fix**: Request a page within range:
```json
{"page": 62, "limit": 20}  // Last page
```

---

## Performance Tips

### 1. Use field selection for repeated queries

If you're making many requests and only need specific fields:

```json
{
  "fields": ["name", "enrollment"],
  "limit": 100
}
```

**Token savings**: ~97% reduction per request

---

### 2. Batch processing with optimal page size

For processing large datasets:
- **Small limit (20-50)**: Lower token usage per request, more requests
- **Large limit (500-1000)**: Fewer requests, higher token usage

**Recommended**: 100-200 records per page for batch processing

---

### 3. Check has_more before making next request

```typescript
if (response.pagination.has_more) {
  // Safe to request next page
  nextPage = response.pagination.next_page;
} else {
  // Done, no more results
}
```

Avoids unnecessary API calls for empty pages.

---

### 4. Use filters to reduce total_count

Instead of paginating through 100K records:

```json
{
  "filters": {
    "year": 2020,
    "state_location": "CA",
    "grade": 12  // Narrow down to specific grade
  }
}
```

Smaller datasets paginate faster.

---

## Migration from v0.1.0

### Old Behavior (v0.1.0)

**Request**:
```json
{
  "level": "schools",
  "source": "ccd",
  "topic": "directory",
  "filters": {"year": 2020}
}
```

**Response** (array directly):
```json
[
  {"ncessch": "...", "name": "..."},
  // ... 99 more (100 total, default limit)
]
```

### New Behavior (v0.2.0)

**Request** (same):
```json
{
  "level": "schools",
  "source": "ccd",
  "topic": "directory",
  "filters": {"year": 2020}
}
```

**Response** (with pagination wrapper):
```json
{
  "results": [
    {"ncessch": "...", "name": "..."},
    // ... 19 more (20 total, new default)
  ],
  "pagination": {
    "total_count": 101662,
    "current_page": 1,
    "page_size": 20,
    "total_pages": 5084,
    "has_more": true,
    "next_page": 2
  }
}
```

### Migration Checklist

✅ **Update response parsing**:
```typescript
// Old
const schools = response;

// New
const schools = response.results;
const metadata = response.pagination;
```

✅ **Adjust for new default limit** (100 → 20):
```json
// To get old behavior
{"limit": 100}
```

✅ **Use pagination for large datasets**:
```typescript
// Instead of getting first 100 and assuming that's all
while (response.pagination.has_more) {
  // Fetch next page
}
```

---

## FAQ

### Q: How do I get all results at once?

**A**: You can't. Maximum limit is 1000 records per request. For larger datasets, use pagination:

```typescript
const allResults = [];
let page = 1;

while (true) {
  const response = await getData({ page, limit: 1000 });
  allResults.push(...response.results);

  if (!response.pagination.has_more) break;
  page++;
}
```

### Q: Why is the default limit now 20 instead of 100?

**A**: To prevent massive token usage. Previous default (100 records) could generate 300K+ tokens. New default (20 records) stays under 10K tokens, making the server usable for AI agents.

### Q: Can I still get 100 records like before?

**A**: Yes! Just specify `limit: 100`:

```json
{"limit": 100}
```

### Q: What's the difference between page and offset?

**A**:
- **page**: Human-friendly (page 1, page 2, page 3)
- **offset**: Developer-friendly (skip N records)

They're interchangeable:
- `page=2, limit=20` = `offset=20, limit=20`
- `page=5, limit=50` = `offset=200, limit=50`

### Q: How do I know which fields are available?

**A**: Make a request without `fields` parameter and inspect the first result:

```json
{
  "limit": 1  // Just get one record to see structure
}
```

Then use those field names in subsequent requests.

### Q: Does field selection make the API faster?

**A**: No, but it reduces token usage. The API still returns all fields; we filter them client-side. Benefits:
- ✅ Faster response parsing (less data)
- ✅ 50-97% token reduction
- ❌ Doesn't reduce API response time

---

## Further Reading

- **[Data Model](./data-model.md)**: Detailed type definitions
- **[API Contract](./contracts/pagination-api.yaml)**: OpenAPI schema
- **[Implementation Plan](./plan.md)**: Technical architecture

---

**Questions?** Check the error messages - they include suggestions for fixing common issues!
