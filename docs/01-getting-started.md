# Getting Started

This guide provides instructions for setting up the Knowlex Desktop development environment.

## Prerequisites

- **Node.js**: v18.0.0 or higher
- **pnpm**: Recommended package manager
- **Git**: Version control

## Initial Setup

1.  **Clone the repository and install dependencies**:
    ```bash
    git clone <repository-url>
    cd knowlex
    pnpm install
    ```

2.  **Run the development server**:
    ```bash
    pnpm run dev
    ```
    This will launch the Electron application with hot reloading enabled.

## Available Scripts

-   `pnpm dev`: Starts the development server.
-   `pnpm build`: Builds the application for production.
-   `pnpm dist`: Packages the application for distribution.
-   `pnpm lint`: Lints the codebase for errors.
-   `pnpm format`: Formats the code using Prettier.
-   `pnpm test`: Runs the test suite.

## Project Structure Overview

The application is organized into three main layers:

-   `src/main`: The Electron main process, handling system-level operations, data storage, and AI services.
-   `src/renderer`: The user interface, built with React and TypeScript.
-   `src/shared`: Code shared between the main and renderer processes, such as types and constants.

For more details, see the [Architecture](./02-architecture.md) document.
