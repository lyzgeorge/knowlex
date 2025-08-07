# GEMINI.md: AI-Powered Project Context

This file provides an AI-friendly context for the **Knowlex Desktop App**, an intelligent assistant built with Electron, React, and TypeScript.

## Project Overview

Knowlex is a cross-platform desktop application that serves as a smart assistant. Its core features include an intelligent chat interface, project management capabilities, file processing with Retrieval-Augmented Generation (RAG), and knowledge management.

The application is structured as a monorepo using pnpm workspaces. The frontend is built with **React 18** and **TypeScript**, using **Chakra UI** for components and **Zustand** for state management. The desktop application framework is **Electron**, which allows for a single codebase to be deployed on macOS, Windows, and Linux.

The backend logic, running in the Electron main process, handles AI integration with the **OpenAI Agents JS SDK**, local data persistence using **SQLite** and **hnswsqlite** for vector search, and communication with the frontend via Electron's IPC mechanism.

## Building and Running

The project is managed with `pnpm`. The following commands are essential for development and building:

*   **Install Dependencies:**
    ```bash
    pnpm install
    ```

*   **Run in Development Mode:**
    This command starts the Vite development server for the React frontend and launches the Electron application in development mode.
    ```bash
    pnpm run dev
    ```

*   **Run Tests:**
    The project uses Jest for testing.
    ```bash
    # Run all tests once
    pnpm test

    # Run tests in watch mode
    pnpm run test:watch
    ```

*   **Build for Production:**
    This command builds the React frontend and the Electron application for the current platform.
    ```bash
    pnpm run build
    ```

*   **Package for Distribution:**
    This command packages the application into a distributable format (e.g., `.dmg` for macOS, `.exe` for Windows).
    ```bash
    pnpm run electron:pack
    ```

## Development Conventions

*   **Code Style:** The project uses **ESLint** for linting and **Prettier** for code formatting. A pre-commit hook is set up with **Husky** and **lint-staged** to automatically format code before committing.
*   **Type Checking:** **TypeScript** is used throughout the project for static type checking. Run `pnpm run type-check` to check for type errors.
*   **Component-Based Architecture:** The frontend is built with React functional components and hooks. Reusable UI components are located in `src/components/ui`.
*   **State Management:** Global state is managed with **Zustand**.
*   **IPC Communication:** The frontend and backend communicate via Electron's IPC. Type-safe channels and message formats are defined in `packages/types/src/ipc.types.ts`. The `ipcManager` in `src-electron/handlers/ipc.manager.ts` handles the registration and execution of IPC handlers.
*   **Internationalization:** The application supports multiple languages using `react-i18next`. Language files are located in `src/i18n/locales`.
*   **Theming:** The application uses **Chakra UI** for theming, with custom theme tokens defined in `src/theme/tokens.ts`. A `ThemeProvider` allows for easy switching between light and dark modes.
