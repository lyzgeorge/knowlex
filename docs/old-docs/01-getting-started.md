# 1. Getting Started

This guide provides essential instructions for setting up and running the Knowlex Desktop development environment.

## Prerequisites

Ensure you have the following installed:

*   **Node.js**: Version 18.0.0 or higher.
*   **pnpm**: The recommended package manager for this project.
*   **Git**: For version control.

## Initial Setup

Follow these steps to get the project running locally:

1.  **Clone the repository and install dependencies**:
    ```bash
    git clone <repository-url> # Replace with the actual repository URL
    cd knowlex
    pnpm install
    ```

2.  **Run the development server**:
    ```bash
    pnpm run dev
    ```
    This command will launch the Electron application in development mode, with hot reloading enabled for efficient development.

## Available Development Scripts

The `package.json` defines several useful scripts for development and maintenance:

*   `pnpm dev`: Starts the application in development mode.
*   `pnpm build`: Compiles the application for production.
*   `pnpm dist`: Packages the compiled application for distribution (e.g., as an installer).
*   `pnpm lint`: Runs linting checks to identify code style and quality issues.
*   `pnpm format`: Automatically formats the codebase using Prettier.
*   `pnpm test`: Executes the project's test suite.

## Project Structure Overview

The Knowlex Desktop application is logically divided into three primary layers:

*   **`src/main`**: Contains the Electron main process code. This layer handles all backend functionalities, including system-level operations, data storage, and integration with AI services.
*   **`src/renderer`**: Houses the user interface (UI) code. This layer is built using React and TypeScript, responsible for rendering the application's visual elements and managing user interactions.
*   **`src/shared`**: Holds code that is common to both the main and renderer processes. This includes shared type definitions, constants, and utility functions, ensuring consistency across the application.

For a more detailed understanding of the application's architecture, refer to the [Architecture Overview](./02-architecture.md) document.