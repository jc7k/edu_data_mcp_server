# Feature Specification: IPEDS Data Download and API Service

**Feature Branch**: `002-download-the-excel`
**Created**: 2025-10-07
**Status**: Draft
**Input**: User description: "Download the Excel file for the most recent 5 years from https://nces.ed.gov/ipeds/use-the-data/download-access-database so we can create our own fastAPI for serving IPEDS data."

## User Scenarios & Testing *(mandatory)*

### User Story 1 - Access Recent IPEDS Data via API (Priority: P1)

As a data analyst or researcher, I need to query IPEDS (Integrated Postsecondary Education Data System) data for the most recent 5 years through a programmatic API, so that I can integrate education statistics into my applications without manually downloading and parsing Excel files.

**Why this priority**: This is the core value proposition - providing programmatic access to IPEDS data. Without this, the feature has no user-facing value.

**Independent Test**: Can be fully tested by making API requests for data from any of the 5 most recent years and verifying that valid IPEDS data is returned in a structured format.

**Acceptance Scenarios**:

1. **Given** the API service is running, **When** a user requests enrollment data for a specific university and year (within the most recent 5 years), **Then** the API returns the requested data in a structured format (JSON)
2. **Given** the API service has the most recent 5 years of data loaded, **When** a user queries for data from 6 years ago, **Then** the API returns an appropriate message indicating data is not available for that year
3. **Given** multiple concurrent users, **When** they make simultaneous API requests, **Then** all requests are served without timeout or error

---

### User Story 2 - Search and Filter IPEDS Data (Priority: P2)

As a researcher, I need to search and filter IPEDS data by multiple criteria (institution name, state, year, enrollment size, etc.), so that I can quickly find relevant institutions without processing the entire dataset myself.

**Why this priority**: Filtering capabilities make the API practical for real-world use. Without filters, users would need to retrieve and process large datasets client-side.

**Independent Test**: Can be tested by submitting API requests with various filter combinations and verifying that only matching records are returned.

**Acceptance Scenarios**:

1. **Given** the API contains 5 years of IPEDS data, **When** a user requests all universities in Florida with enrollment over 10,000 students, **Then** the API returns only institutions matching all criteria
2. **Given** a user searching for institutions by partial name, **When** they search for "Florida", **Then** the API returns all institutions with "Florida" in their name
3. **Given** multiple filter criteria applied, **When** no institutions match all criteria, **Then** the API returns an empty result set with appropriate messaging

---

### User Story 3 - Compare Institutions by Demographics (Priority: P2)

As an educational researcher, I need to retrieve demographic and enrollment data for multiple institutions simultaneously, so that I can perform comparative analysis across similar institutions.

**Why this priority**: This enables analytical use cases like finding peer institutions or studying trends across institution types.

**Independent Test**: Can be tested by requesting data for multiple institutions and verifying that demographic breakdowns are included and comparable across institutions.

**Acceptance Scenarios**:

1. **Given** multiple institutions specified in a request, **When** a user requests enrollment by race/ethnicity, **Then** the API returns demographic breakdowns for all requested institutions
2. **Given** institutions with different data availability, **When** demographic data is requested, **Then** the API indicates which fields are available for each institution
3. **Given** a request for institutions similar to a reference institution, **When** demographic criteria are specified, **Then** the API returns institutions matching the demographic profile within specified tolerance

---

### User Story 4 - Automated Data Refresh (Priority: P3)

As a system administrator, I need the local IPEDS dataset to be automatically updated when new annual data becomes available from NCES, so that the API always serves current data without manual intervention.

**Why this priority**: This is a maintenance and operational improvement that reduces long-term effort but is not essential for initial functionality.

**Independent Test**: Can be tested by simulating availability of new IPEDS data and verifying that the system detects, downloads, and loads the new data automatically.

**Acceptance Scenarios**:

1. **Given** new IPEDS data is published on the NCES website, **When** the automated check runs, **Then** the new data is downloaded and loaded into the API
2. **Given** the rolling 5-year window, **When** new data is added, **Then** data older than 5 years is archived or removed
3. **Given** a data update is in progress, **When** API requests are received, **Then** the service continues serving existing data without interruption

---

### Edge Cases

- What happens when the NCES website structure changes and the download URLs are no longer valid?
- How does the system handle corrupted or incomplete Excel files during download?
- What happens when an Excel file has a different schema than expected (missing columns, renamed fields)?
- How does the API handle requests during the data loading/updating process?
- What happens when disk space is insufficient to store 5 years of data?
- How does the system handle institutions that appear in some years but not others?
- What happens when a user requests data with invalid filters or parameters?

## Requirements *(mandatory)*

### Functional Requirements

- **FR-001**: System MUST download Excel files containing IPEDS data from the official NCES download page (https://nces.ed.gov/ipeds/use-the-data/download-access-database)
- **FR-002**: System MUST maintain data for the most recent 5 complete years available from NCES
- **FR-003**: System MUST parse downloaded Excel files and extract institution directory information, enrollment data, and demographic breakdowns
- **FR-004**: System MUST provide an API endpoint to query institution data by unique identifier (UNITID)
- **FR-005**: System MUST provide an API endpoint to search institutions by name (partial match supported)
- **FR-006**: System MUST provide filtering capabilities by state, year, institution type, and enrollment size
- **FR-007**: System MUST support querying enrollment data disaggregated by race/ethnicity and gender
- **FR-008**: System MUST return data in JSON format with clear field names and structure
- **FR-009**: System MUST handle missing or null values in the IPEDS data gracefully
- **FR-010**: System MUST provide API documentation describing available endpoints, parameters, and response formats
- **FR-011**: System MUST validate that downloaded files are authentic IPEDS data before processing [NEEDS CLARIFICATION: Should this include checksum validation or just schema validation?]
- **FR-012**: System MUST log all data download and update operations with timestamps
- **FR-013**: System MUST support pagination for queries returning large result sets

### Key Entities

- **Institution**: Represents a postsecondary education institution tracked by IPEDS. Key attributes include UNITID (unique identifier), institution name, address, state, control (public/private), institutional category, and operational status.

- **Enrollment Record**: Represents enrollment data for a specific institution and year. Includes total enrollment, full-time/part-time breakdowns, undergraduate/graduate splits, and first-time student counts.

- **Demographic Enrollment**: Represents enrollment disaggregated by demographic characteristics (race/ethnicity, gender) for a specific institution and year. Links to the institution and includes counts for each demographic category.

- **Academic Year**: Represents a specific year of IPEDS data collection (e.g., 2020-2021). Used to filter and organize time-series data.

## Success Criteria *(mandatory)*

### Measurable Outcomes

- **SC-001**: Users can retrieve institution data via API in under 500 milliseconds for single-institution queries
- **SC-002**: System successfully downloads and processes all available IPEDS Excel files for the most recent 5 years within 30 minutes of initial setup
- **SC-003**: API serves filtered queries (e.g., all institutions in a state) in under 2 seconds for result sets under 1000 records
- **SC-004**: System maintains 99% uptime for API queries during normal operations
- **SC-005**: 95% of API requests return valid results or appropriate error messages on first attempt
- **SC-006**: Data retrieval tasks that previously required manual Excel file downloads are completed 10x faster through the API
- **SC-007**: System successfully handles at least 100 concurrent API requests without degradation

## Assumptions *(mandatory)*

- NCES maintains a consistent structure for IPEDS Excel file downloads at the specified URL
- Excel files are in a standard format (.xlsx) that can be parsed programmatically
- IPEDS data schema remains relatively stable year-over-year (same core fields present)
- The system will have sufficient storage capacity for 5 years of IPEDS data (estimated 5-10 GB based on typical IPEDS dataset sizes)
- Users of the API have basic knowledge of IPEDS data structure and terminology
- Internet connectivity is available for downloading files from NCES
- The API will be deployed on infrastructure with adequate compute resources to handle expected query load

## Dependencies *(optional)*

- External dependency on NCES website availability and accessibility
- Availability of IPEDS data in Excel format (as opposed to only Access database format)
- Network access to download files from nces.ed.gov domain

## Out of Scope *(optional)*

- Historical IPEDS data beyond the most recent 5 years
- Real-time synchronization with NCES (updates will be periodic, not instant)
- Data visualization or analytics dashboards (API only provides data access)
- User authentication or access control (initial version will be open access)
- Data modification capabilities (read-only API)
- Integration with other education data sources beyond IPEDS
- Support for IPEDS data components beyond institution directory and enrollment (e.g., finance, completions, student aid)