# Knowlex Onboarding Guide for Senior Engineers

This document provides a comprehensive technical overview of the Knowlex application, designed for senior software engineers. It covers the project's architecture, development workflow, key patterns, and module-level details.

## 1. Project Vision & Core Principles

**Knowlex** is a cross-platform desktop AI chat application built with **Electron**, **React**, and **TypeScript**. The current MVP focuses on providing a simple, robust chat interface with local data persistence via SQLite.

### 1.1. Key Features (MVP)

- **Project-Centric Workflow**: Organize conversations within distinct projects.
- **Simple Chat Interface**: Clean UI with streaming AI responses.
- **Message Branching**: Navigate complex conversation trees.
- **Temporary File Uploads**: Provide contextual files for individual conversations.
- **Local-First Storage**: All data (projects, conversations, messages) is stored locally in a SQLite database.
- **Multi-Provider Support**: Integrates with various AI models (OpenAI, Anthropic, Google).

### 1.2. Architectural Principles

- **Three-Layer Architecture**: Strict separation of concerns between the **Main** (Node.js), **Renderer** (React), and **Shared** processes.
- **Local-First**: Data resides primarily on the user's machine, ensuring privacy and offline capability.
- **Secure & Type-Safe IPC**: All communication between processes is strictly typed and follows a standardized `IPCResult<T>` pattern.
- **Modular Service Layer**: Business logic is organized into domain-specific services (e.g., `ProjectService`, `ConversationService`).
- **Lightweight State Management**: Zustand is used for efficient and persistent state management in the Renderer process.

## 2. Getting Started: Development Workflow

### 2.1. Core Commands

Use `pnpm` for all package management and script execution.

```
# Install dependencies
pnpm install

# Start the development server with hot-reloading
pnpm run dev

# Build the application for production
pnpm run build

# Run linters and formatters
pnpm run lint   # ESLint with auto-fix
pnpm run format # Prettier formatting
pnpm run typecheck # TypeScript type checking
```

### 2.2. Path Aliases

The project uses TypeScript path aliases for clean imports:

- `@main/*`: Main process code (Node.js/Electron).
- `@renderer/*`: Renderer process code (React).
- `@preload/*`: Preload script for secure IPC.
- `@shared/*`: Code shared between processes.

## 3. System Architecture

### 3.1. Project Structure

The codebase is organized into three primary directories within `src/`:

```
src/
├── main/       # Main Process (Node.js + Electron)
│   ├── database/ # SQLite layer (schemas, queries, migrations)
│   ├── ipc/      # IPC handlers for renderer communication
│   └── services/ # Core business logic (AI, files, projects)
│
├── renderer/   # Renderer Process (React UI)
│   ├── components/ # React components
│   ├── hooks/      # Custom React hooks
│   ├── pages/      # Top-level page components
│   └── stores/     # Zustand state management stores
│
└── shared/     # Shared Code (Types, Constants, Utils)
    ├── types/      # Shared type definitions (IPC, data models)
    └── i1n/       # Internationalization config and locales
```

### 3.2. Technology Stack

|

| **Category**         | **Technology**                       | **Purpose**                                 |
| -------------------- | ------------------------------------ | ------------------------------------------- |
| **Framework**        | Electron, React, Node.js, TypeScript | Core application structure                  |
| **State Management** | Zustand                              | Lightweight, persistent state for React     |
| **UI Components**    | Chakra UI                            | Theming and component library               |
| **Database**         | SQLite (`@libsql/client`)            | Local data storage                          |
| **AI Integration**   | AI SDK (`ai` package)                | Unified interface for AI provider streaming |
| **Build Tool**       | Vite (via `electron-vite`)           | Fast development and build process          |
| **Testing**          | Vitest, React Testing Library        | Unit, integration, and component testing    |

## 4. Key Architectural Patterns

### 4.1. IPC Communication

All inter-process communication follows a standardized, type-safe pattern to ensure reliability and maintainability.

- **Pattern**: `IPCResult<T> = { success: boolean; data?: T; error?: string; }`
- **Implementation**: A generic `handleIPCCall` wrapper in `@main/ipc/common.ts` provides consistent error handling for all IPC channels.
- **Channels**: IPC channels are namespaced by domain (e.g., `project:*`, `conversation:*`, `file:*`).

### 4.2. Database Layer

The database architecture is designed for maintainability and directness, avoiding complex ORMs.

- **Generic Entity Class**: A `DatabaseEntity` class in `@main/database/entity.ts` provides generic CRUD operations (`create`, `get`, `list`, `update`, `delete`).
- **Schemas**: Entity schemas in `@main/database/schemas.ts` define the mapping between application models and database tables, including JSON serialization for complex fields.
- **Queries**: Optimized, raw SQL queries are centralized in `@main/database/queries.ts`. Services use these query functions rather than accessing the `DatabaseEntity` directly.
- **Migrations**: Schema changes are managed through versioned SQL migration files in `@main/migrations.ts`.

### 4.3. State Management (Zustand)

State in the renderer is managed through domain-specific Zustand stores.

- **Location**: `@renderer/stores/`
- **Pattern**: Each store manages a specific slice of state (e.g., `projectStore`, `conversationStore`).
- **Persistence**: Stores that require it (e.g., UI state like expanded sidebars) use Zustand's `persist` middleware to save to `localStorage`.
- **Communication**: Stores can be composed or imported directly to interact with other stores.

### 4.4. AI Integration

The system uses an adapter pattern to provide a unified interface for multiple AI providers.

- **Adapter**: `@main/services/openai-adapter.ts` integrates with the Vercel AI SDK.
- **Service**: `@main/services/assistant-service.ts` manages the core logic for streaming responses, handling events, and managing cancellation.
- **Cancellation**: A `CancellationManager` (`@main/utils/cancellation.ts`) provides robust cancellation tokens for long-running AI requests.

## 5. Architectural & Code Guidelines

- **Single Responsibility**: Modules, components, and functions should have a single, clear purpose.
- **File Size**: Keep files under 300 lines where practical.
- **Naming**: Use descriptive, intention-revealing names for variables, functions, and files.
- **Error Handling**: Use the `handleIPCCall` wrapper for all IPC. Services should throw meaningful, contextual errors. UI components must handle loading and error states gracefully.
- **Security**: Never expose sensitive Node.js APIs to the renderer. Use the `preload.ts` script to expose a limited, secure API. Validate all data at IPC boundaries.

## 6. Module Documentation

This section provides a high-level summary of key modules in the `src/` directory.

### 6.1. Main Process (`src/main`)

#### Services (`@main/services`)

Core business logic resides here. Services are self-contained and handle a specific domain.

| **Module**             | **Description**                                              |
| ---------------------- | ------------------------------------------------------------ |
| `project-service.ts`   | Manages project CRUD operations, ensuring name uniqueness and handling cascade deletes of conversations. |
| `conversation.ts`      | Handles conversation CRUD, pagination, and project associations. |
| `message.ts`           | Manages message CRUD, including support for multi-part content (text, files, images, citations). |
| `assistant-service.ts` | Orchestrates AI response generation, streaming, event emission, and cancellation. |
| `file-temp.ts`         | Processes temporary file uploads, performing validation and text extraction. |
| `file-parser.ts`       | A factory for parsing various file types (PDF, Office documents, plain text). |
| `title-generation.ts`  | Automatically generates conversation titles by calling an AI service after the first turn. |
| `settings.ts`          | Manages application configuration loaded from environment variables. |
| `openai-adapter.ts`    | Adapts the application's message format to the AI SDK and handles streaming logic. |

#### Database (`@main/database`)

The data persistence layer.

| **Module**      | **Description**                                              |
| --------------- | ------------------------------------------------------------ |
| `index.ts`      | Manages the `libsql` client connection and provides transaction helpers. |
| `entity.ts`     | A generic class providing base CRUD operations for database entities. |
| `queries.ts`    | A collection of specific, optimized SQL queries for all entities. |
| `schemas.ts`    | Defines the mapping between TypeScript models and database table schemas. |
| `migrations.ts` | Manages versioned database schema migrations with `up` and `down` SQL scripts. |

#### IPC (`@main/ipc`)

The communication bridge to the renderer process.

| **Module**        | **Description**                                              |
| ----------------- | ------------------------------------------------------------ |
| `project.ts`      | Exposes `project-service` functions securely to the renderer. |
| `conversation.ts` | Exposes `conversation-service` and `message-service` functions. |
| `file.ts`         | Exposes `file-temp-service` functions.                       |
| `common.ts`       | Provides the `handleIPCCall` wrapper and common validation utilities. |

### 6.2. Renderer Process (`src/renderer`)

#### Stores (`@renderer/stores`)

Zustand stores for managing frontend state.

| **Module**        | **Description**                                              |
| ----------------- | ------------------------------------------------------------ |
| `project.ts`      | Manages project data, UI state (e.g., expanded folders), and interactions with the project IPC. |
| `conversation.ts` | Manages the active conversation, message list, streaming state, and interactions with conversation IPC. |
| `navigation.ts`   | Controls the current view (e.g., active project or conversation page). |
| `settings.ts`     | Caches application settings fetched from the main process.   |
| `app.ts`          | Manages global application state, such as initialization status (`isLoading`, `isReady`). |

#### Hooks (`@renderer/hooks`)

Reusable UI logic encapsulated in custom React hooks.

| **Module**                     | **Description**                                              |
| ------------------------------ | ------------------------------------------------------------ |
| `useProjectManagement.ts`      | Encapsulates all UI logic for creating, renaming, and deleting projects in the sidebar. |
| `useConversationManagement.ts` | Manages the logic for the conversation list, including infinite scroll and delete confirmations. |
| `useMessageBranching.ts`       | Handles the complex state and logic for navigating and managing conversation branches. |
| `useFileUpload.ts`             | Manages client-side file validation, reading file contents, and calling the file processing IPC. |
| `useInlineEdit.ts`             | Provides state and handlers for inline editing of project and conversation titles. |
| `useAutoScroll.ts`             | Implements smart scrolling for the chat view, with options to follow streaming responses. |

#### Components (`@renderer/components`)

The UI is built from a combination of feature-specific, layout, and general-purpose UI components.

| **Category**      | **Path**    | **Description**                                              |
| ----------------- | ----------- | ------------------------------------------------------------ |
| **Feature Pages** | `features/` | Top-level components like `ProjectPage` and `ConversationPage`. |
| **Layout**        | `layout/`   | Structural components like `MainLayout`, `Sidebar`, and `ProjectsSection`. |
| **UI Primitives** | `ui/`       | Reusable components like `Button`, `Modal`, and `MarkdownContent`. |

##### Component Development Guidelines

Frontend engineers should adhere to the following principles when developing components:

- **Utilize the Design System**: Build UIs using the established **Chakra UI** component library and `react-icons/hi2` for icons. Avoid creating custom one-off components where a themed primitive exists.
- **Follow Theme Configuration**: All colors, fonts, spacing, and shadows should use tokens defined in the theme configuration (`@renderer/utils/theme/`). This ensures visual consistency across the application and simplifies theme updates.
- **Prioritize Accessibility**: Ensure all interactive components are fully accessible via keyboard navigation and screen readers. Use semantic HTML and provide appropriate ARIA attributes where necessary.
- **Ensure Responsiveness**: While the application is desktop-first, components should be designed to gracefully adapt to different window sizes and panel configurations.

### 6.3. Shared Code (`src/shared`)

Code used by both the Main and Renderer processes.

| **Module**   | **Description**                                              |
| ------------ | ------------------------------------------------------------ |
| `types/`     | Contains all shared TypeScript type definitions for data models and IPC payloads. |
| `i18n/`      | Handles internationalization setup, configuration, and translation files (JSON). |
| `utils/`     | Shared utility functions for tasks like ID generation and validation. |
| `constants/` | Application-wide constants for file constraints, AI defaults, etc. |