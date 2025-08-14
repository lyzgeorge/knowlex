# 2. Application Architecture

This document provides a high-level overview of the Knowlex Desktop application's architecture, explaining how its different parts work together.

## Core Three-Layer Architecture

Knowlex Desktop is built upon a clear three-layer architecture to ensure modularity, maintainability, and separation of concerns:

*   **Main Process (`src/main`)**:
    *   **Role**: Acts as the application's backend, handling all system-level operations, data management, and native operating system (OS) integrations within a Node.js environment.
    *   **Key Responsibilities**: Application lifecycle, window management, business logic, database interactions, and AI model integration.

*   **Renderer Process (`src/renderer`)**:
    *   **Role**: Manages the entire user interface (UI). It operates in a sandboxed browser environment, focusing solely on rendering the UI and responding to user interactions.
    *   **Technology**: Built using React and TypeScript.

*   **Shared Code (`src/shared`)**:
    *   **Role**: Contains common definitions, constants, and utility functions that are utilized by both the Main and Renderer processes.
    *   **Benefit**: Ensures consistency and type safety across the entire application.

### Inter-Process Communication (IPC)

Communication between the Main and Renderer processes is exclusively handled via **asynchronous, type-safe Inter-Process Communication (IPC)**. This communication is facilitated through a secure preload script (`src/preload/index.ts`), which exposes a controlled API from the Main process to the Renderer.

## Main Process Deep Dive (`src/main`)

The Main process is the control center of the application. Its primary responsibilities include:

*   **Application Lifecycle & Window Management**: Handled by `src/main/main.ts` and `src/main/window.ts`.
*   **Business Logic**: Implemented through various services located in `src/main/services/` (e.g., `project.ts`, `conversation.ts`).
*   **Database Operations**: Managed by the `libsql` client and related modules in `src/main/database/`.
*   **AI Model Integration**: Orchestrated by the modules within `src/main/ai/`.
*   **IPC Request Handling**: Processes requests from the Renderer process via handlers in `src/main/ipc/`.

For more detailed information, refer to the [Main Process Architecture](./08-main-process.md) document.

## Renderer Process Deep Dive (`src/renderer`)

The Renderer process is where the user experience comes to life, built on a modern React foundation.

### State Management (Zustand)

Global and domain-specific state is managed using [Zustand](https://zustand-bear.github.io/zustand/), with dedicated stores in `src/renderer/src/stores/`:

*   **`app.ts` (`useAppStore`)**: Manages UI-related state, such as theme settings and layout configurations.
*   **`project.ts` (`useProjectStore`)**: Handles data and state related to projects and associated files.
*   **`conversation.ts` (`useConversationStore`)**: Manages chat sessions, messages, and real-time conversation state.
*   **`settings.ts` (`useSettingsStore`)**: Stores user preferences and API configurations.

These stores are designed with specific hooks to ensure components only access the state they require.

### Theming (Chakra UI)

The application's UI is styled using [Chakra UI](https://chakra-ui.com/), with a custom theme defined in `src/renderer/src/utils/theme/`:

*   **`colors.ts`**: Defines semantic color tokens for consistent color usage across the application.
*   **`colorMode.ts`**: Manages automatic theme switching (Light, Dark, System modes) based on user preferences.
*   **`components.ts`**: Contains custom component variants to align with the application's unique design language.

### Dual-Window Components

Knowlex Desktop supports two primary top-level UI components, which can be accessed via a URL parameter (`?mode=debug`):

*   **`MainApp` (`src/renderer/src/pages/MainApp.tsx`)**: The standard, user-facing application interface.
*   **`DebugApp` (`src/renderer/src/pages/DebugApp.tsx`)**: A specialized interface for development, diagnostics, and testing purposes.

For more detailed information, refer to the [Renderer Process Architecture](./09-renderer-process.md) document.

## Typical Data Flow

A common interaction and data flow within the application follows this pattern:

1.  **User Action**: A user interacts with a React component in the Renderer process (e.g., sending a message).
2.  **IPC Call**: The component (often via a custom hook) triggers an IPC function exposed on the `window.electronAPI` object (defined in `src/preload/index.ts`).
3.  **Main Process Handling**: The Main process receives the IPC call via its handlers in `src/main/ipc/`. It then invokes the appropriate business logic service from `src/main/services/`.
4.  **Data Interaction**: The service performs necessary operations, such as interacting with the database (`src/main/database/queries.ts`) or communicating with external AI models (`src/main/ai/`).
5.  **Result & UI Update**: The result is returned from the Main process back to the Renderer. The Renderer's Zustand stores (`src/renderer/src/stores/`) are updated, which in turn triggers a re-render of the relevant UI components.