# Knowlex Development Guide for Claude Code

This document provides essential development instructions for working with the Knowlex application. For comprehensive technical details including complete module documentation, refer to `docs/source-code-documentation.md`.

## 1. Project Overview

**Knowlex** is a cross-platform desktop AI chat application built with **Electron**, **React**, and **TypeScript**. The current MVP focuses on providing a simple, robust chat interface with local data persistence via SQLite.

### 1.1. Core Features

- **Project-Centric Workflow**: Organize conversations within distinct projects
- **Simple Chat Interface**: Clean UI with streaming AI responses and collapsible sidebar
- **Message Branching & Regeneration**: Navigate complex conversation trees and regenerate AI responses
- **Message Editing**: Edit user messages with advanced branching capabilities
- **Attachment Uploads**: Provide contextual files for conversations (10MB per file, 100MB total)
- **Local-First Storage**: All data stored locally in SQLite database
- **Multi-Provider Support**: Integrates with various AI models (OpenAI, Anthropic, Google)
- **Internationalization**: Full i18n support with English and Chinese locales

### 1.2. Architectural Principles

- **Three-Layer Architecture**: Strict separation between **Main** (Node.js), **Renderer** (React), and **Shared** processes
- **Local-First**: Data resides on user's machine for privacy and offline capability
- **Secure & Type-Safe IPC**: All inter-process communication uses standardized `IPCResult<T>` pattern
- **Modular Service Layer**: Business logic organized into domain-specific services
- **Lightweight State Management**: Zustand for efficient state management in Renderer process

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
- **Attachment Lifecycle**: Complete workflow from upload → validation → parsing → cleanup with comprehensive error handling.

### 4.6. Message System Architecture

Advanced message handling with multi-part content and branching capabilities.

- **Multi-Part Content**: Support for text, attachment, citation, tool-call, and image content parts within a single message.
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

**For comprehensive module documentation including detailed function signatures, parameters, and implementation notes, refer to `docs/source-code-documentation.md`.**

### 6.1. Quick Reference

The codebase is organized into three primary layers:

- **Main Process** (`src/main/`): Node.js backend with services, database, and IPC handlers
- **Renderer Process** (`src/renderer/`): React frontend with components, hooks, and stores  
- **Shared Code** (`src/shared/`): Types, constants, and utilities used by both processes

Key directories:
- `@main/services/`: Core business logic (AI, files, projects, conversations)
- `@main/database/`: SQLite layer with migrations and ORM-like entity system
- `@main/ipc/`: Type-safe IPC handlers for renderer communication
- `@renderer/stores/`: Zustand state management with persistence
- `@renderer/hooks/`: Custom React hooks for complex UI logic
- `@renderer/components/`: UI components organized by features/, layout/, ui/
- `@shared/types/`: Comprehensive TypeScript type definitions
- `@shared/utils/`: Shared utilities including message branching and validation

## 7. Key Architectural Patterns

**For detailed implementation information, see `docs/source-code-documentation.md` sections on "关键架构模式" and "Advanced Features & Patterns".**

### 7.1. Core Patterns

- **Message Branching System**: Sophisticated conversation tree navigation with branch creation/switching/merging
- **Real-Time Streaming**: Chunk-based streaming with `TEXT` and `REASONING` events, cancellation management
- **File Processing Pipeline**: Multi-stage validation, format detection, parser extensibility
- **3-Layer Model Resolution**: Explicit → conversation → user default → system default priority system
- **Batch Stream Emitting**: Reduces IPC pressure by merging text and reasoning chunks
- **One-Shot Title Generation**: Idempotent conversation title generation after first exchange

## 8. Development Workflow & Debugging

**For detailed development tasks and debugging procedures, see `docs/source-code-documentation.md` section 8.**

### 8.1. Common Development Tasks

#### Adding New Features
1. Start with type definitions in `@shared/types/`
2. Implement service logic in `@main/services/` with proper validation
3. Add IPC handlers in `@main/ipc/` using `handleIPCCall` wrapper
4. Create or update Zustand stores in `@renderer/stores/`
5. Build UI components following the `features/` → `layout/` → `ui/` hierarchy
6. Add tests for all layers with appropriate mocking strategies

#### Quick Development Patterns
- **File Processing Extensions**: Add to `SUPPORTED_FILE_TYPES`, create parser class, register in factory
- **IPC Channels**: Define types, implement service functions, create handlers, add store actions
- **UI Components**: Use Chakra UI, follow theme tokens, leverage custom hooks for complex logic

### 8.2. Common Issues & Solutions

- **IPC Problems**: Check `handleIPCCall` logs, verify type definitions match
- **Database Issues**: Use `getCurrentDatabasePath()`, check migration status with `getMigrationHistory()`  
- **File Processing**: Verify constraints in `FILE_CONSTRAINTS`, check parser support
- **State Management**: Verify store persistence, check IPC event listeners
