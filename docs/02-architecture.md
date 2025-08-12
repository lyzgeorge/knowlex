# Application Architecture

This document provides a comprehensive overview of the Knowlex Desktop application's architecture.

## Three-Layer Architecture

Knowlex Desktop uses a three-layer architecture to separate concerns:

-   **Main Process (`src/main`)**: Handles system-level operations, data management, and native OS integration in a Node.js environment.
-   **Renderer Process (`src/renderer`)**: Manages the user interface, built with React and TypeScript in a sandboxed browser environment.
-   **Shared Code (`src/shared`)**: Contains code used by both processes, such as type definitions and constants.

Communication between the main and renderer processes is handled via asynchronous, type-safe Inter-Process Communication (IPC).

## Main Process Architecture

The main process is responsible for:
-   Application lifecycle and window management (`src/main/window.ts`, `src/main/main.ts`).
-   Business logic via services (e.g., project and conversation management in `src/main/services/`).
-   Database operations using `libsql` (`src/main/database/`).
-   AI model integration (`src/main/ai/`).
-   Handling IPC requests from the renderer process (`src/main/ipc/`).

## Renderer Process Architecture

The renderer process is built on a modern React foundation.

### State Management (Zustand)

Global state is managed using Zustand, with separate stores for different domains located in `src/renderer/src/stores/`:
-   **`useAppStore` (`app.ts`)**: Manages UI state like theme and layout.
-   **`useProjectStore` (`project.ts`)**: Handles project and file data.
-   **`useConversationStore` (`conversation.ts`)**: Manages chat sessions and messages.
-   **`useSettingsStore` (`settings.ts`)**: Stores user settings and API configurations.

Stores are designed with specific hooks (e.g., `useTheme()`, `useProjects()`) to give components access to only the state they need.

### Theming (Chakra UI)

The UI is built with Chakra UI and features a custom theme defined in `src/renderer/src/utils/theme/`:
-   **Semantic Tokens**: For consistent color usage (e.g., `background.primary`) in `colors.ts`.
-   **Light/Dark/System Modes**: Automatic theme switching based on user preference, managed in `colorMode.ts`.
-   **Custom Components**: Variants for core components to match the application's design language, defined in `components.ts`.

### Dual-Window Components

The application supports two primary top-level components, determined by a URL parameter (`?mode=debug`):
-   **`MainApp` (`src/renderer/src/pages/MainApp.tsx`)**: The primary, user-facing application interface.
-   **`DebugApp` (`src/renderer/src/pages/DebugApp.tsx`)**: A development-focused interface for diagnostics and testing.

## Data Flow

A typical data flow follows this pattern:
1.  A user action in a React component triggers a function in a custom hook.
2.  The hook calls an IPC function exposed on the `window` object via `src/preload/index.ts`.
3.  The main process receives the IPC call in `src/main/ipc/` and invokes the appropriate service from `src/main/services/`.
4.  The service interacts with the database (`src/main/database/queries.ts`) or other resources.
5.  The result is returned to the renderer process, which updates the UI via its state management stores in `src/renderer/src/stores/`.
