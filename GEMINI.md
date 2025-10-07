# Gemini Code Assistant Context

This document provides context for the Gemini Code Assistant to understand and effectively assist with the **Education Data MCP Server** project.

## Project Overview

This is a TypeScript-based MCP (Model Context Protocol) server that provides access to the Urban Institute's Education Data API. The server is designed to be used with large language models like Gemini to enable easy access to a wide range of education data.

**Key Technologies:**

*   **TypeScript:** The primary programming language.
*   **Node.js:** The runtime environment.
*   **@modelcontextprotocol/sdk:** The core library for creating the MCP server.
*   **axios:** Used for making HTTP requests to the Education Data API.

**Architecture:**

The project consists of a single MCP server that exposes two main tools:

*   `get_education_data`: Retrieves detailed education data from the API.
*   `get_education_data_summary`: Retrieves aggregated education data from the API.

The server also provides resources for browsing available API endpoints.

## Building and Running

The following commands are used to build, run, and test the project:

*   **Install dependencies:**
    ```bash
    npm install
    ```
*   **Build the server:**
    ```bash
    npm run build
    ```
*   **Run the server:**
    ```bash
    npm start
    ```
*   **Run the server in watch mode (for development):**
    ```bash
    npm run watch
    ```
*   **Inspect the server's capabilities:**
    ```bash
    npm run inspector
    ```
*   **Make the server available for npx:**
    ```bash
    npm link
    ```

## Development Conventions

*   **Coding Style:** The project follows standard TypeScript and Node.js conventions.
*   **Testing:** There are no explicit testing frameworks configured in `package.json`.
*   **Contribution:** There are no explicit contribution guidelines in the repository.
