# GEMINI.md: Project tax-advisor-mcp

This document provides a comprehensive overview of the `tax-advisor-mcp` project, its purpose, architecture, and development conventions.

## Project Overview

`tax-advisor-mcp` is a Model Context Protocol (MCP) server designed to act as a personal tax and financial advisor for residents of the Netherlands. It is a TypeScript-based Node.js project.

The core features of this project include:

*   **Tax & Financial Advice:** Provides tools to calculate tax estimates, get spending advice, and understand tax obligations.
*   **Knowledge Cache:** A key feature is the self-improving knowledge cache. The system learns from web searches about Dutch tax law, storing structured information locally. This allows for faster responses, offline capabilities, and tracking changes in tax laws over time.
*   **Proactive Notifications:** Integrates with Telegram to send reminders for upcoming dues and notifications about relevant changes in tax law.
*   **MCP Server:** Exposes its capabilities through the Model Context Protocol, allowing language models to interact with its tools and resources.
*   **Personalization:** The advisor tailors its responses based on a user's financial profile, which is provided in a `personal.md` file.

## Architecture

The project is structured into several key directories:

*   `src/`: The main source code of the application.
    *   `config/`: Handles loading and validation of the application configuration.
    *   `context/`: Manages the loading of personal data and the knowledge base.
    *   `resources/`: Implements the MCP resources, providing access to data like the tax calendar and knowledge base index.
    *   `services/`: Contains services for interacting with external APIs like Telegram and for performing web searches. It also includes the core logic for the knowledge cache.
    *   `tools/`: Implements the MCP tools, which represent the core "actions" the advisor can take (e.g., `calculate-tax`, `search-knowledge`).
    *   `types/`: Contains all TypeScript type definitions for the project.
*   `data/`: Contains data files, including the Dutch tax rules and example user profiles.
*   `knowledge/`: The directory where the knowledge cache is stored as a collection of Markdown files.
*   `scripts/`: Contains utility scripts for tasks like setup and knowledge base maintenance.

## Building and Running

### Prerequisites

*   Node.js (>=20.0.0)
*   npm

### Installation

```bash
npm install
```

### Running the Application

There are two main processes: the MCP server and the reminder daemon.

*   **MCP Server:**
    *   To build and run the server:
        ```bash
        npm run build
        npm start
        ```
    *   To run in development mode with hot-reloading:
        ```bash
        npm run dev
        ```
*   **Reminder Daemon:**
    *   To run the daemon:
        ```bash
        npm run start:daemon
        ```
    *   To run in development mode:
        ```bash
        npm run dev:daemon
        ```

### Testing and Linting

*   **Run tests:**
    ```bash
    npm test
    ```
*   **Run tests with coverage:**
    ```bash
    npm run test:coverage
    ```
*   **Lint the code:**
    ```bash
    npm run lint
    ```
*   **Automatically format the code:**
    ```bash
    npm run format
    ```

## Development Conventions

*   **TypeScript:** The project is written entirely in TypeScript and uses strict mode.
*   **Modularity:** The code is organized into distinct modules for services, tools, and resources, following the separation of concerns principle.
*   **Configuration:** Application configuration is managed through a `config.yaml` file, with validation provided by Zod schemas.
*   **Knowledge Cache:** The knowledge cache is a central part of the architecture. New tools that involve searching for tax information should be designed to interact with the cache first.
*   **Immutability:** Where possible, data structures are treated as immutable.
*   **Error Handling:** The project aims for robust error handling, with services and tools returning clear error messages.
*   **MCP:** Tools and resources are designed to be consumed by a language model via the Model Context Protocol. Tool inputs and outputs are validated using Zod.
*   **Commit Messages:** The `IMPLEMENTATION_PLAN.md` suggests a convention for commit messages (e.g., `feat: ...`, `docs: ...`).
