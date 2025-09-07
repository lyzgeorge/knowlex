# Knowlex Onboarding Guide for Senior Engineers

This document provides a comprehensive technical overview of the Knowlex application, designed for senior software engineers. It covers the project's architecture, development workflow, key patterns, and module-level details.

## 1. Project Vision & Core Principles

**Knowlex** is a cross-platform desktop AI chat application built with **Electron**, **React**, and **TypeScript**. The current MVP focuses on providing a simple, robust chat interface with local data persistence via SQLite.

### 1.1. Key Features (MVP)

- **Project-Centric Workflow**: Organize conversations within distinct projects.
- **Simple Chat Interface**: Clean UI with streaming AI responses and collapsible sidebar for focused work.
- **Message Branching & Regeneration**: Navigate complex conversation trees and regenerate AI responses for better exploration.
- **Message Editing**: Edit user messages with advanced branching and content comparison capabilities.
- **Temporary File Uploads**: Provide contextual files for individual conversations (10MB per file, 100MB total).
- **Local-First Storage**: All data (projects, conversations, messages) is stored locally in a SQLite database.
- **Multi-Provider Support**: Integrates with various AI models (OpenAI, Anthropic, Google).
- **Internationalization**: Full i18n support with English and Chinese locales.

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

### 2.3. Development Best Practices

When working with this codebase, follow these established patterns:

#### Main Process Development
- Use the `handleIPCCall` wrapper for all IPC handlers to ensure consistent error handling.
- Implement business logic in services (`@main/services/`) before exposing via IPC.
- Validate all inputs at IPC boundaries using `ValidationPatterns` and type guards.
- Use `DatabaseEntity` for standard CRUD operations and custom queries for complex operations.
- Implement proper cancellation for long-running operations using `CancellationManager`.

#### Renderer Development
- Encapsulate complex UI logic in custom hooks rather than components.
- Use Zustand stores for state management with `persist` middleware for UI preferences.
- Leverage the established component hierarchy: `features/` → `layout/` → `ui/`.
- Implement proper loading and error states for all async operations.
- Use `useFileUpload` for file handling with built-in validation and processing.

#### Testing Approach
- Write unit tests for services with mocked dependencies and sample fixtures.
- Test IPC communication end-to-end with mocked environments.
- Use global mocks for `window.knowlex` API in component tests.
- Ensure cross-layer integration testing for data flow validation.

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
│   ├── hooks/      # Custom React hooks (including message editing, branching)
│   ├── pages/      # Top-level page components
│   └── stores/     # Zustand state management stores
│
└── shared/     # Shared Code (Types, Constants, Utils)
    ├── types/      # Shared type definitions (IPC, data models)
    ├── i18n/       # Internationalization config and locales
    └── utils/      # Shared utilities including message branching
```

### 3.2. Technology Stack

|

| **Category**         | **Technology**                       | **Purpose**                                 |
| -------------------- | ------------------------------------ | ------------------------------------------- |
| **Framework**        | Electron, React, Node.js, TypeScript | Core application structure                  |
| **State Management** | Zustand                              | Lightweight, persistent state for React     |
| **UI Components**    | Chakra UI                            | Theming and component library               |
| **Icons**            | Heroicons v2 (`react-icons/hi2`)    | Consistent icon system                      |
| **Database**         | SQLite (`@libsql/client`)            | Local data storage                          |
| **AI Integration**   | AI SDK (`ai` package)                | Unified interface for AI provider streaming |
| **Internationalization** | Custom i18n system               | Multi-language support (EN/ZH)             |
| **Build Tool**       | Vite (via `electron-vite`)           | Fast development and build process          |
| **Testing**          | Vitest, React Testing Library        | Unit, integration, and component testing    |

## 4. Key Architectural Patterns

### 4.1. IPC Communication

All inter-process communication follows a standardized, type-safe pattern to ensure reliability and maintainability.

- **Pattern**: `IPCResult<T> = { success: boolean; data?: T; error?: string; }`
- **Implementation**: A generic `handleIPCCall` wrapper in `@main/ipc/common.ts` provides consistent error handling for all IPC channels.
- **Channels**: IPC channels are namespaced by domain (e.g., `project:create`, `project:list`, `conversation:*`, `message:*`, `file:*`).
- **Event Broadcasting**: Real-time synchronization via `sendConversationEvent` and `sendMessageEvent` functions that broadcast to all windows.
- **Validation**: Comprehensive request validation using type guards and predefined `ValidationPatterns` for IDs, roles, and content.
- **Security**: Minimal API exposure through `preload.ts` with a whitelisted `window.knowlex` interface.

### 4.2. Database Layer

The database architecture is designed for maintainability and directness, avoiding complex ORMs.

- **Generic Entity Class**: A `DatabaseEntity` class in `@main/database/entity.ts` provides generic CRUD operations (`create`, `get`, `list`, `update`, `delete`) with automatic timestamp management.
- **Field Mapping System**: Uses `createFieldMapping` for property-to-column translation with automatic JSON serialization and camelCase to snake_case conversion.
- **Schemas**: Entity schemas in `@main/database/schemas.ts` define the mapping between application models and database tables, including JSON serialization for complex fields like message content.
- **Queries**: Optimized, raw SQL queries are centralized in `@main/database/queries.ts`. Services use these query functions rather than accessing the `DatabaseEntity` directly.
- **Migrations**: Simplified "consolidated" unidirectional upgrades with versioned SQL migration files tracked in `schema_version` table. Early FTS/Search and file chunking/vector tables removed for streamlined approach.
- **Transactions**: Atomic multi-query operations via `executeTransaction` with automatic rollback on failure.
- **Connection Management**: Uses `@libsql/client` with connection pooling, timeout handling, and graceful shutdown via `closeDB()`.

### 4.3. State Management (Zustand)

State in the renderer is managed through domain-specific Zustand stores.

- **Location**: `@renderer/stores/`
- **Pattern**: Each store manages a specific slice of state (e.g., `projectStore`, `conversationStore`).
- **Persistence**: Stores that require it (e.g., UI state like expanded sidebars) use Zustand's `persist` middleware to save to `localStorage`.
- **Communication**: Stores can be composed or imported directly to interact with other stores.
- **Event Synchronization**: Stores listen to IPC events for real-time synchronization with the main process.
- **Loading State Management**: Centralized loading states with error handling across all stores.
- **Single Task Management**: Only one task should be `in_progress` at a time for optimal performance.

### 4.4. AI Integration

The system uses an adapter pattern to provide a unified interface for multiple AI providers.

- **Adapter**: `@main/services/openai-adapter.ts` integrates with the Vercel AI SDK and handles message format transformation with unified `createOpenAICompatible` for official and OpenAI-compatible providers.
- **Service**: `@main/services/assistant-service.ts` manages streaming responses with internal batch emitter to reduce IPC pressure by merging text and reasoning chunks.
- **Model Resolution**: 3-layer priority system (explicit → conversation → user default → system default) handled internally by the adapter.
- **Cancellation**: A `CancellationManager` (`@main/utils/cancellation.ts`) provides robust cancellation tokens with registration, cleanup, and active task tracking.
- **Streaming Architecture**: Real-time streaming with `TEXT` and `REASONING` chunk events sent via IPC, using `TEXT_CONSTANTS.ZERO_WIDTH_SPACE` as placeholder.
- **Auto-Title Generation**: One-shot, idempotent title generation triggered after first user-assistant exchange when title is placeholder.
- **Error Enhancement**: AI errors are enhanced with user-friendly context and debugging information.
- **Configuration Management**: Unified parameter builder with optional reasoning and smooth streaming configuration.

### 4.5. File Processing System

Comprehensive file handling with validation, parsing, and security measures.

- **Multi-Format Support**: `FileParserFactory` supports PDF, Office documents, and plain text with extensible parser architecture.
- **Validation Pipeline**: Client and server-side validation for file constraints (10MB per file, 100MB total, supported extensions).
- **Binary vs Text Processing**: Automatic detection and appropriate handling of binary vs text files.
- **Image Optimization**: Special handling for images with data URL conversion and base64 encoding for embedding.
- **Temporary File Lifecycle**: Complete workflow from upload → validation → parsing → cleanup with comprehensive error handling.

### 4.6. Message System Architecture

Advanced message handling with multi-part content and branching capabilities.

- **Multi-Part Content**: Support for text, temporary-file, citation, tool-call, and image content parts within a single message.
- **Message Branching**: Complete conversation tree navigation with branch creation, merging, switching, and deletion.
- **Content Validation**: Strict validation ensuring at least one meaningful content part per message.
- **Citation System**: Support for file references with similarity scores, page numbers, and contextual metadata.
- **Edit Integration**: Seamless conversion between temporary files and message content parts during editing.

## 5. Architectural & Code Guidelines

- **Single Responsibility**: Modules, components, and functions should have a single, clear purpose.
- **File Size**: Keep files under 300 lines where practical.
- **Naming**: Use descriptive, intention-revealing names for variables, functions, and files.
- **Error Handling**: Use the `handleIPCCall` wrapper for all IPC. Services should throw meaningful, contextual errors. UI components must handle loading and error states gracefully.
- **Security**: Never expose sensitive Node.js APIs to the renderer. Use the `preload.ts` script to expose a limited, secure API. Validate all data at IPC boundaries.

### 5.1. Development Patterns

- **Hook Composition**: Complex UI logic is encapsulated in custom React hooks for reusability and testability.
- **Performance Optimization**: Debounced operations (100ms for file uploads), content diffing, and smart re-rendering patterns.
- **Type Safety**: Comprehensive TypeScript types with string literal unions for translation keys and validation patterns.
- **Testing Strategy**: End-to-end IPC testing, service unit tests with mocked dependencies, and component testing with global mocks.

### 5.2. Code Organization

- **Component Hierarchy**: Strict separation between `features/` (domain-specific), `layout/` (structural), and `ui/` (reusable primitives).
- **Service Layer**: Domain-specific services that encapsulate business logic and validation before database operations.
- **Shared Utilities**: Common functionality in `@shared/utils/` for ID generation, validation, time formatting, and message branching algorithms.

## 6. Module Documentation

This section provides a high-level summary of key modules in the `src/` directory.

### 6.1. Main Process (`src/main`)

#### Services (`@main/services`)

Core business logic resides here. Services are self-contained and handle a specific domain.

| **Module**             | **Description**                                              | **Key Functions**                                            |
| ---------------------- | ------------------------------------------------------------ | ------------------------------------------------------------ |
| `project-service.ts`   | Manages project CRUD operations with case-insensitive name uniqueness validation and cascade deletes of conversations. | `createProject`, `getProjectById`, `getAllProjects`, `updateProjectById`, `deleteProjectById`, `getProjectConversations` |
| `conversation.ts`      | Handles conversation CRUD, pagination, project associations, and auto-title generation triggers. | `createConversation`, `listConversationsPaginated`, `generateConversationTitle`, `moveConversation` |
| `message.ts`           | Manages message CRUD with multi-part content support (text, files, images, citations), content validation, and temporary file integration. | `addMessage`, `addTextMessage`, `addMultiPartMessage`, `convertTemporaryFilesToMessageParts`, `extractTextContent` |
| `assistant-service.ts` | Orchestrates AI response generation with streaming events, cancellation management, and real-time IPC broadcasting. Uses internal batch emitter to reduce IPC pressure. | `streamAssistantReply`, `generateReplyForNewMessage`, `regenerateReply` |
| `file-temp.ts`         | Processes temporary file uploads with comprehensive validation, text extraction, and image optimization (data URLs). | `processTemporaryFiles`, `processTemporaryFileContents`, `validateTemporaryFileConstraints`, `extractFileTextContent`, `cleanupTemporaryFiles` |
| `file-parser.ts`       | Factory pattern for parsing multiple file types (PDF, Office, plain text) with encoding detection and metadata extraction. | `FileParser` (abstract), `PlainTextParser`, `PDFParser`, `OfficeParser`, `FileParserFactory`, `parseFile` |
| `title-generation.ts`  | Automatically generates conversation titles using AI after detecting first user-assistant exchange. One-shot, idempotent strategy. | `generateTitleForConversation`, `attemptInitialTitleGeneration`, `isPlaceholderTitle` |
| `settings.ts`          | Manages application configuration with SettingsService class for complete configuration management. | `SettingsService` class, `getSettings`, `updateSettings`, `settingsService` singleton |
| `openai-adapter.ts`    | Adapts application message format to AI SDK with streaming support, error enhancement, and configuration validation. Unified OpenAI-compatible provider support. | `streamAIResponse`, `generateAIResponseOnce`, `testOpenAIConfig`, `getOpenAIConfigFromEnv`, `validateOpenAIConfig` |
| `model-config-service.ts` | Comprehensive model configuration management with Zod validation and connection testing. | `ModelConfigService` class with `list`, `create`, `update`, `delete`, `testConnection`, `resolveDefaultModel` |

#### Database (`@main/database`)

The data persistence layer with advanced ORM-like functionality.

| **Module**      | **Description**                                              | **Key Functions**                                            |
| --------------- | ------------------------------------------------------------ | ------------------------------------------------------------ |
| `index.ts`      | Manages the `libsql` client connection, transaction helpers, and query execution with error handling. | `getDB`, `closeDB`, `executeQuery`, `executeTransaction`, `isDatabaseReady`, `getCurrentDatabasePath` |
| `entity.ts`     | Generic `DatabaseEntity` class with field mapping, JSON serialization, and automatic timestamp management. | `DatabaseEntity<T>` class with `create`, `get`, `list`, `update`, `delete` methods, `createFieldMapping` helper |
| `queries.ts`    | Optimized SQL queries for all entities using generic CRUD tools. FTS-related queries removed in simplified migration. | `createConversation`, `listConversations`, `createMessage`, `createProject` (FTS search queries removed) |
| `schemas.ts`    | Entity-to-table mapping with `createFieldMapping` for property translation and JSON field configuration. | `conversationSchema`, `messageSchema` (with JSON content), `projectSchema`, `modelConfigSchema` |
| `migrations.ts` | Simplified "consolidated" unidirectional schema upgrades. Early FTS/Search and file chunking features removed for streamlined approach. | `runMigrations`, `getCurrentVersion`, `rollbackToVersion` (throws error), `getMigrationHistory` |

#### IPC (`@main/ipc`)

The communication bridge to the renderer process with comprehensive validation.

| **Module**        | **Description**                                              | **Key Functions**                                            |
| ----------------- | ------------------------------------------------------------ | ------------------------------------------------------------ |
| `project.ts`      | Exposes project service functions with validation and error handling for all project operations. | `registerProjectIPCHandlers`, `unregisterProjectIPCHandlers` |
| `conversation.ts` | Exposes conversation and message services with event broadcasting and real-time synchronization. | `registerConversationIPCHandlers`, `sendConversationEvent`, `sendMessageEvent` |
| `file.ts`         | Exposes temporary file processing with content and path-based handling modes. | `registerFileIPCHandlers`, `unregisterFileIPCHandlers`      |
| `settings.ts`     | Exposes settings service with read/update capabilities for configuration management. | `registerSettingsIPCHandlers`, `unregisterSettingsIPCHandlers` |
| `model-config.ts` | Model configuration IPC with change broadcasting to all windows. | `registerModelConfigIPCHandlers`, `unregisterModelConfigIPCHandlers` |
| `common.ts`       | Provides `handleIPCCall` wrapper, validation patterns, and type guard utilities for secure IPC communication. | `handleIPCCall`, `validateId`, `requireValidId`, `ValidationPatterns`, `ErrorMessages` |

#### Utils (`@main/utils`)

Utility modules for cross-cutting concerns.

| **Module**        | **Description**                                              | **Key Functions**                                            |
| ----------------- | ------------------------------------------------------------ | ------------------------------------------------------------ |
| `cancellation.ts` | Cancellation token system for long-running operations with ID-based token management. | `CancellationToken` class (`isCancelled`, `cancel`, `onCancel`), `CancellationManager` class (`createToken`) |

### 6.2. Renderer Process (`src/renderer`)

#### Stores (`@renderer/stores`)

Zustand stores for managing frontend state with persistence and real-time synchronization.

| **Module**        | **Description**                                              | **Key Features**                                             |
| ----------------- | ------------------------------------------------------------ | ------------------------------------------------------------ |
| `project.ts`      | Manages project data with persistent expand/collapse state via localStorage, loading states, and project IPC interactions. | `useProjects`, `useProjectExpansion` selectors             |
| `conversation/`   | Modular conversation state management split across multiple files for maintainability. | `store.ts` (main Zustand store), `data.ts` (persistence), `events.ts` (IPC sync), `streaming.ts` (AI responses), `hooks.ts` (selectors), `utils.ts` (helpers) |
| `navigation.ts`   | Controls application views (home, project, conversation) with coordinated state transitions and current selection tracking. | `useCurrentView`, `useCanGoBack` selectors                  |
| `settings.ts`     | Caches application settings, language preferences, and AI provider configurations with main process synchronization. | `useDefaultModel` selector for AI preferences               |
| `model-config.ts` | AI model configuration management with real-time updates.   | `useModelConfigs`, `useDefaultModel` selectors             |
| `app.ts`          | Manages global initialization status, sidebar collapse state (persistent), and application-wide UI preferences. | `useTheme`, `useLanguage`, `useSidebarState` selectors     |
| `index.ts`        | Central store coordination with unified initialization and error handling. | `initializeStores`, `resetAllStores` functions             |

#### Hooks (`@renderer/hooks`)

Reusable UI logic encapsulated in custom React hooks with sophisticated state management.

| **Module**                     | **Description**                                              | **Key Returns**                                              |
| ------------------------------ | ------------------------------------------------------------ | ------------------------------------------------------------ |
| `useProjectManagement.ts`      | Encapsulates project UI logic with form state management, validation, and local UI state for create/edit/delete operations. | Form state, validation, CRUD operations                     |
| `useConversationManagement.ts` | Manages conversation list with infinite scroll using `IntersectionObserver`, delete confirmations, and loading states. | Infinite scroll management, delete confirmations            |
| `useMessageBranching.ts`       | Handles complex conversation tree navigation with branch creation, switching, merging, and deletion with state synchronization. | Tree traversal, branch operations, branch info data         |
| `useEditableMessage.ts`        | Manages editable message state with text editing, file attachment modification, undo/redo, and branch creation integration. | Edit state, content validation, file attachment handling    |
| `useMessageContentDiff.ts`     | Efficient content comparison with text and file change detection, memoized for performance optimization. | Memoized content comparison, change detection               |
| `useFileUpload.ts`             | Client-side file validation with debouncing (100ms), base64 encoding for binary files, and IPC integration for processing. | File validation, drag-drop support, upload processing       |
| `useInlineEdit.ts`             | Inline editing state management for titles with start/cancel/confirm workflows and validation. | Start/cancel/confirm workflow, validation                   |
| `useAutoScroll.ts`             | Smart scrolling with streaming follow control, user override detection, and smooth scroll animations. | Auto-scroll with user override detection                    |
| `useI18n.ts`                   | Internationalization with dynamic translation loading, parameter interpolation, and language preference persistence. | Translation functions, parameter interpolation              |
| `useModelCapabilities.ts`      | Centralized model capability detection with caching.        | Cached capability resolution for model features             |
| `useThemeSync.ts`              | Synchronizes app theme with OS theme, handling persistence and updates. | Theme synchronization, OS theme detection                   |
| `useNotifications.ts`          | Application notification queue management with auto-dismiss, different severity levels, and 15 predefined notification presets. | `notify`, `success/error/warning/info`, `preset`, specific helpers like `messageCopied`, `aiGenerating`, `fileValidationError` |

#### Components (`@renderer/components`)

The UI is built from a combination of feature-specific, layout, and general-purpose UI components with sophisticated interaction patterns.

| **Category**      | **Path**                | **Key Components**                                           |
| ----------------- | ----------------------- | ------------------------------------------------------------ |
| **Feature Pages** | `features/chat/`        | `ConversationPage` (message flow, branching), `ChatInputBox` (file upload, auto-resize), `MainPage` (layout orchestration) |
| **Feature Pages** | `features/projects/`    | `ProjectPage` (project details, conversation cards)          |
| **Layout**        | `layout/`               | `MainLayout`, `Sidebar`, `ProjectsSection` (expandable projects), `ConversationsSection` (infinite scroll) |
| **UI Primitives** | `ui/`                   | `Button`, `Modal`, `MarkdownContent`, `TempFileCard`, `AssistantMessage`, `UserMessage`, `ReasoningBox` |

##### Component Development Guidelines

Frontend engineers should adhere to the following principles when developing components:

- **Utilize the Design System**: Build UIs using the established **Chakra UI** component library and `react-icons/hi2` for icons. Avoid creating custom one-off components where a themed primitive exists.
- **Follow Theme Configuration**: All colors, fonts, spacing, and shadows should use tokens defined in the theme configuration (`@renderer/utils/theme/`). This ensures visual consistency across the application and simplifies theme updates.
- **Prioritize Accessibility**: Ensure all interactive components are fully accessible via keyboard navigation and screen readers. Use semantic HTML and provide appropriate ARIA attributes where necessary.
- **Ensure Responsiveness**: While the application is desktop-first, components should be designed to gracefully adapt to different window sizes and panel configurations.
- **Hook Integration**: Leverage custom hooks for complex state management (editing, branching, file uploads) rather than implementing logic directly in components.
- **Performance Patterns**: Use content diffing, memoization, and debouncing where appropriate to optimize rendering and user interactions.

### 6.3. Shared Code (`src/shared`)

Code used by both the Main and Renderer processes with comprehensive type safety and utilities.

#### Constants (`@shared/constants`)

| **Module**   | **Description**                                              | **Key Exports**                                              |
| ------------ | ------------------------------------------------------------ | ------------------------------------------------------------ |
| `app.ts`     | Application metadata and configuration constants.            | `APP_NAME`, `APP_VERSION`, `WINDOW_CONFIG`, `DATABASE_CONFIG` |
| `ai.ts`      | AI model definitions and configuration constants for OpenAI and Claude providers. | `AI_MODELS` (7 predefined models), `DEFAULT_AI_CONFIG`, `EMBEDDING_CONFIG`, `RAG_CONFIG` |
| `file.ts`    | File handling constraints and supported formats with different limits for temporary vs project files. | `FILE_CONSTRAINTS` (temp: 10MB/100MB/10 files, project: 50MB/500MB/100 files), `SUPPORTED_FILE_TYPES`, `MIME_TYPES` |
| `text.ts`    | Text-related constants for placeholder and formatting.      | `TEXT_CONSTANTS` with `ZERO_WIDTH_SPACE`                    |

#### Types (`@shared/types`)

| **Module**        | **Description**                                              | **Key Exports**                                              |
| ----------------- | ------------------------------------------------------------ | ------------------------------------------------------------ |
| `ai.ts`           | AI model integration interfaces supporting multi-modal content and streaming. | `AIModel`, `AIMessage`, `AIResponse`, `AIStreamChunk`, `ModelCapabilities` |
| `conversation.ts` | Conversation data structures with project associations.     | `Conversation`, `SessionSettings`                            |
| `file.ts`         | File processing types for temporary and project files.      | `ProjectFile`, `TemporaryFile`, `ProcessingResult`, `FileStatus` |
| `ipc.ts`          | IPC communication structures for main-renderer process communication. | `IPCResult<T>`, `ConversationCreateRequest`, `TemporaryFileRequest` |
| `message.ts`      | Complex message structures supporting multi-part content and branching. | `Message`, `MessageContent`, `MessageContentPart`, `ContentType`, `CitationContent` |
| `models.ts`       | Model configuration types with privacy-aware public/private separation. | `ModelConfigPublic`, `ModelConfig`, `isPrivateModelConfig`, `toPublicModelConfig` |
| `notification.ts` | Notification system with 15 predefined presets for common scenarios. | `NotificationType`, `NotificationOptions`, `NOTIFICATION_PRESETS`, `NotificationPresetKey` |
| `project.ts`      | Simple project data structures.                             | `Project`, `CreateProjectData`                               |

#### Utils (`@shared/utils`)

| **Module**             | **Description**                                              | **Key Exports**                                              |
| ---------------------- | ------------------------------------------------------------ | ------------------------------------------------------------ |
| `id.ts`                | Cryptographically secure ID generation using 32-character hex IDs. | `generateId`                                                 |
| `message-branching.ts` | Conversation tree branching logic for alternative conversation paths. | `BranchSendOptions`, `buildUserMessageBranchSendOptions`, `canCreateBranch` |
| `model-resolution.ts`  | Centralized model resolution service with 3-layer priority system. | `resolveModelContext`, `getModelCapabilities` (1min TTL cache), `getActiveModelId`, `validateModelResolution` |
| `time.ts`              | Unified time management supporting SQLite timestamps and internationalization. | `formatTime` (using Intl.DateTimeFormat), `formatRelativeTime` |
| `validation.ts`        | Comprehensive validation utilities for files, constraints, and data formats. | `isValidFileType`, `isValidFileSize`, `validateFileConstraints`, `formatBytes`, `isValidEmail`, `sanitizeFilename` |

#### I18n (`@shared/i18n`)

| **Module**   | **Description**                                              | **Key Exports**                                              |
| ------------ | ------------------------------------------------------------ | ------------------------------------------------------------ |
| `config.ts`  | i18next configuration with React integration and resource loading. | `i18n` instance                                              |
| `types.ts`   | Language type definitions and supported language mappings.  | `Language` ('en' \| 'zh-CN'), `SUPPORTED_LANGUAGES`          |
| `init.ts`    | Asynchronous initialization logic for setting initial language. | `initializeI18n`                                             |
| `locales/`   | JSON translation files for all supported languages.         | Translation resources for EN/ZH                             |

#### Schemas (`@shared/schemas`)

| **Module**          | **Description**                                              | **Key Exports**                                              |
| ------------------- | ------------------------------------------------------------ | ------------------------------------------------------------ |
| `model-config.ts`   | Zod-based model configuration validation schemas.           | `BooleanishSchema`, `ModelConfigSchema`, `validateModelConfig`, `formatValidationError` |

## 7. Advanced Features & Patterns

### 7.1. Message Branching System

The application implements a sophisticated conversation tree system:

- **Branch Navigation**: Users can create alternative conversation paths at any message point.
- **Tree Visualization**: Visual representation of conversation branches with navigation controls.
- **Branch Operations**: Create, switch, merge, and delete branches with state preservation.
- **Content Comparison**: Diff algorithms for comparing different branch versions.
- **Shared Utilities**: Common branching logic in `@shared/utils/message-branching.ts` used by both processes.

### 7.2. Real-Time Streaming Architecture

Advanced streaming implementation for AI responses:

- **Chunk-Based Streaming**: Separate handling of `TEXT` and `REASONING` chunks for progressive display.
- **Cancellation Management**: Robust cancellation with token registration, cleanup, and active task tracking.
- **Event Broadcasting**: Real-time updates across all application windows via IPC events.
- **Error Recovery**: Graceful fallback and error handling during streaming with user feedback.

### 7.3. File Processing Pipeline

Enterprise-grade file handling:

- **Multi-Stage Validation**: Client-side pre-validation followed by server-side processing and constraint checking.
- **Format Detection**: Automatic binary vs text detection with appropriate processing strategies.
- **Parser Extensibility**: Factory pattern for easy addition of new file format support.
- **Memory Management**: Efficient handling of large files with streaming and temporary file cleanup.

### 7.4. Testing Strategy

Comprehensive testing approach:

- **IPC Testing**: End-to-end testing of IPC communication with mocked environments.
- **Service Testing**: Unit tests with dependency injection and sample file fixtures.
- **Component Testing**: Global mock setup for secure API testing with `window.knowlex` mocks.
- **Integration Testing**: Cross-layer testing to ensure proper data flow and state synchronization.

## 8. Development Workflow & Debugging

### 8.1. Common Development Tasks

#### Adding New Features
1. Start with type definitions in `@shared/types/`
2. Implement service logic in `@main/services/` with proper validation
3. Add IPC handlers in `@main/ipc/` using `handleIPCCall` wrapper
4. Create or update Zustand stores in `@renderer/stores/`
5. Build UI components following the `features/` → `layout/` → `ui/` hierarchy
6. Add tests for all layers with appropriate mocking strategies

#### File Processing Extensions
1. Add new file type to `SUPPORTED_FILE_TYPES` in `@shared/constants/file.ts`
2. Create parser class extending `FileParser` in `@main/services/file-parser.ts`
3. Register parser in `FileParserFactory.createParser()`
4. Update validation logic in `file-temp.ts` if needed
5. Test with sample files in `@main/services/__tests__/`

#### Adding IPC Channels
1. Define types in `@shared/types/ipc.ts`
2. Implement service functions with proper error handling
3. Create IPC handlers using `handleIPCCall` and validation patterns
4. Register handlers in main process initialization
5. Add corresponding store actions and state management
6. Write end-to-end IPC tests

### 8.2. Debugging Guidelines

#### IPC Communication Issues
- Check `handleIPCCall` wrapper logs for error details
- Verify type definitions match between main and renderer
- Ensure proper registration/unregistration of IPC handlers
- Monitor event broadcasting for real-time synchronization issues

#### Database Problems
- Use `getCurrentDatabasePath()` to verify database location
- Check migration status with `getMigrationHistory()`
- Review entity schemas for field mapping issues
- Monitor transaction rollbacks in `executeTransaction`

#### File Processing Errors
- Verify file constraints in `FILE_CONSTRAINTS`
- Check parser support with `FileParserFactory.isSupported()`
- Monitor temporary file cleanup and memory usage
- Review encoding detection for text files

#### State Management Issues
- Verify store persistence configuration
- Check IPC event listeners for synchronization
- Monitor loading states and error propagation
- Review cross-store communication patterns
