### **Knowlex Technical Overview for Senior Engineers**

This guide provides a high-level overview of the Knowlex desktop application, focusing on architecture, key patterns, and development workflow.

---

### **1. Core Concept**

Knowlex is a local-first, cross-platform AI chat application built with **Electron, React, and TypeScript**. It organizes conversations into projects and stores all data locally in a SQLite database.

**Key Features:**
*   **Project-based workflow** for organizing chats.
*   **Local-First Storage** via SQLite.
*   **Advanced Chat:** Message branching, regeneration, and editing.
*   **Contextual File Uploads:** Temporary files per conversation.
*   **Multi-Provider AI Support:** Pluggable AI model integration.

---

### **2. Tech Stack & Architecture**

The application follows a strict three-layer architecture: **Main** (Node.js), **Renderer** (React), and **Shared** code.

| Category             | Technology                  | Purpose                                     |
| -------------------- | --------------------------- | ------------------------------------------- |
| **Framework**        | Electron, React, TypeScript | Core application structure                  |
| **State Management** | Zustand                     | Lightweight, persistent state for React     |
| **Database**         | SQLite (`@libsql/client`)   | Local data storage                          |
| **AI Integration**   | Vercel AI SDK               | Unified interface for AI provider streaming |
| **Build Tool**       | Vite (`electron-vite`)      | Fast development and build process          |
| **Testing**          | Vitest, React Testing Lib   | Unit, integration, and component testing    |

### **3. Project Structure**

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
│   ├── hooks/      # Custom React hooks (including message editing, branching)
│   ├── pages/      # Top-level page components
│   └── stores/     # Zustand state management stores
│
└── shared/     # Shared Code (Types, Constants, Utils)
    ├── types/      # Shared type definitions (IPC, data models)
    ├── i18n/       # Internationalization config and locales
    └── utils/      # Shared utilities including message branching
```

---

### **4. Development Workflow**

Use `pnpm` for all commands.

*   `pnpm install`: Install dependencies.
*   `pnpm dev`: Start the dev server with hot-reloading.
*   `pnpm build`: Build for production.
*   `pnpm lint` / `format` / `typecheck`: Run quality checks.

**Path Aliases:**
*   `@main/*`: Main process (Node.js/Electron)
*   `@renderer/*`: Renderer process (React)
*   `@shared/*`: Code shared between processes

---

### **5. Key Architectural Patterns**

#### **A. Type-Safe IPC Communication**
*   **Standardized Wrapper:** All IPC calls use a generic `handleIPCCall` wrapper for consistent error handling and typing.
*   **Payload:** Communication follows a standard `IPCResult<T>` structure (`{ success, data?, error? }`).
*   **Security:** A minimal, whitelisted API is exposed to the renderer via a `preload.ts` script.

#### **B. Database Layer (No Heavy ORM)**
*   **Generic Entity Class:** A lightweight `DatabaseEntity` class provides generic CRUD operations (`create`, `get`, `list`, `update`, `delete`).
*   **Schema Mapping:** A `createFieldMapping` utility handles model-to-table mapping, including `camelCase` to `snake_case` conversion and JSON serialization.
*   **Raw SQL Queries:** Optimized, raw SQL queries are centralized for complex operations.
*   **Migrations:** Versioned SQL migration files manage schema changes.

#### **C. State Management (Zustand)**
*   **Domain-Specific Stores:** State is managed in modular stores (`projectStore`, `conversationStore`, etc.).
*   **Persistence:** UI state (e.g., sidebar visibility) is persisted to `localStorage` using Zustand's `persist` middleware.
*   **IPC Sync:** Stores listen to IPC events for real-time data synchronization from the main process.

#### **D. AI Integration (Adapter Pattern)**
*   **Unified Adapter:** An adapter service provides a consistent interface for multiple AI providers, integrating with the Vercel AI SDK.
*   **Streaming & Cancellation:** The system supports real-time response streaming and robust request cancellation.

---

### **6. Module Documentation**

This section provides a high-level summary of key modules in the `src/` directory.

#### **6.1. Main Process (`src/main`)**

**Services (`@main/services`)**
Core business logic resides here. Services are self-contained and handle a specific domain.

| **Module**             | **Description**                                              |
| ---------------------- | ------------------------------------------------------------ |
| `project-service.ts`   | Manages project CRUD operations with case-insensitive name uniqueness validation and cascade deletes of conversations. |
| `conversation.ts`      | Handles conversation CRUD, pagination, project associations, and auto-title generation triggers. |
| `message.ts`           | Manages message CRUD with multi-part content support (text, files, images, citations), content validation, and temporary file integration. |
| `assistant-service.ts` | Orchestrates AI response generation with streaming events, cancellation management, and real-time IPC broadcasting. |
| `file-temp.ts`         | Processes temporary file uploads with comprehensive validation, text extraction, and image optimization (data URLs). |
| `file-parser.ts`       | Factory pattern for parsing multiple file types (PDF, Office, plain text) with encoding detection and metadata extraction. |
| `title-generation.ts`  | Automatically generates conversation titles using AI after detecting first user-assistant exchange. |
| `settings.ts`          | Manages application configuration from `app.env` with provider-specific settings and runtime updates. |
| `openai-adapter.ts`    | Adapts application message format to AI SDK with streaming support, error enhancement, and configuration validation. |

**Database (`@main/database`)**
The data persistence layer with advanced ORM-like functionality.

| **Module**      | **Description**                                              |
| --------------- | ------------------------------------------------------------ |
| `index.ts`      | Manages the `libsql` client connection, transaction helpers, and query execution with error handling. |
| `entity.ts`     | Generic `DatabaseEntity` class with field mapping, JSON serialization, and automatic timestamp management. |
| `queries.ts`    | Optimized SQL queries for all entities, including FTS search and pagination support. |
| `schemas.ts`    | Entity-to-table mapping with `createFieldMapping` for property translation and JSON field configuration. |
| `migrations.ts` | Versioned schema migrations with bidirectional `up`/`down` scripts and rollback capabilities. |

**IPC (`@main/ipc`)**
The communication bridge to the renderer process with comprehensive validation.

| **Module**        | **Description**                                              |
| ----------------- | ------------------------------------------------------------ |
| `project.ts`      | Exposes project service functions with validation and error handling for all project operations. |
| `conversation.ts` | Exposes conversation and message services with event broadcasting and real-time synchronization. |
| `file.ts`         | Exposes temporary file processing with content and path-based handling modes. |
| `settings.ts`     | Exposes settings service with read/update capabilities for configuration management. |
| `common.ts`       | Provides `handleIPCCall` wrapper, validation patterns, and type guard utilities for secure IPC communication. |

#### **6.2. Renderer Process (`src/renderer`)**

**Stores (`@renderer/stores`)**
Zustand stores for managing frontend state with persistence and real-time synchronization.

| **Module**        | **Description**                                              |
| ----------------- | ------------------------------------------------------------ |
| `project.ts`      | Manages project data with persistent expand/collapse state via localStorage, loading states, and project IPC interactions. |
| `conversation.ts` | Manages active conversation, message lists, streaming state, and real-time message events with IPC synchronization. |
| `navigation.ts`   | Controls application views (home, project, conversation) with coordinated state transitions and current selection tracking. |
| `settings.ts`     | Caches application settings, language preferences, and AI provider configurations with main process synchronization. |
| `app.ts`          | Manages global initialization status, sidebar collapse state (persistent), and application-wide UI preferences. |

**Hooks (`@renderer/hooks`)**
Reusable UI logic encapsulated in custom React hooks with sophisticated state management.

| **Module**                     | **Description**                                              |
| ------------------------------ | ------------------------------------------------------------ |
| `useProjectManagement.ts`      | Encapsulates project UI logic with form state management, validation, and local UI state for create/edit/delete operations. |
| `useConversationManagement.ts` | Manages conversation list with infinite scroll using `IntersectionObserver`, delete confirmations, and loading states. |
| `useMessageBranching.ts`       | Handles complex conversation tree navigation with branch creation, switching, merging, and deletion with state synchronization. |
| `useEditableMessage.ts`        | Manages editable message state with text editing, file attachment modification, undo/redo, and branch creation integration. |
| `useMessageBranch.ts`          | Simplified API for message branch navigation with automatic state sync and higher-level abstractions. |
| `useMessageContentDiff.ts`     | Efficient content comparison with text and file change detection, memoized for performance optimization. |
| `useFileUpload.ts`             | Client-side file validation with debouncing (100ms), base64 encoding for binary files, and IPC integration for processing. |
| `useInlineEdit.ts`             | Inline editing state management for titles with start/cancel/confirm workflows and validation. |
| `useAutoScroll.ts`             | Smart scrolling with streaming follow control, user override detection, and smooth scroll animations. |
| `useI18n.ts`                   | Internationalization with dynamic translation loading, parameter interpolation, and language preference persistence. |
| `useNotifications.ts`          | Application notification queue management with auto-dismiss, different severity levels, and action button support. |

#### **6.3. Shared Code (`src/shared`)**

Code used by both the Main and Renderer processes with comprehensive type safety and utilities.

| **Module**   | **Description**                                              |
| ------------ | ------------------------------------------------------------ |
| `types/`     | Complete TypeScript type definitions for data models, IPC payloads, message content parts, AI configurations, and i18n types with string literal unions. |
| `i18n/`      | Comprehensive internationalization system with dynamic loading, type-safe translation keys, parameter interpolation, and fallback strategies (EN/ZH). |
| `utils/`     | Shared utility functions including ID generation (UUID, short IDs), validation (email, file types), time formatting, and message branching algorithms. |
| `constants/` | Application-wide constants for file constraints (10MB per file, 100MB total), AI defaults, supported file types with MIME mappings, and chunk sizes. |

---

### **7. Advanced Feature Highlights**

*   **Message Branching System:** A sophisticated conversation tree model allows users to explore different chat paths. The core logic is shared in `@shared/utils/message-branching.ts`.
*   **Real-Time Streaming:** AI responses are streamed in chunks (`TEXT` and `REASONING`) for a responsive UI, with robust cancellation management.
*   **Extensible File Parser:** A factory pattern (`FileParserFactory`) supports multiple file types (PDF, Office, text) and can be easily extended.
