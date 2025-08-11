# Knowlex Desktop Architecture Documentation

## Overview

Knowlex Desktop is built with a three-layer Electron architecture that separates concerns between system operations, user interface, and shared business logic. This architecture promotes maintainability, testability, and clear separation of responsibilities.

## Three-Layer Architecture

```
┌─────────────────────────────────────┐
│        Renderer Process             │
│    React + TypeScript + Zustand    │
│         UI and Interactions         │
├─────────────────────────────────────┤
│        Main Process                 │
│   Node.js + Electron + libsql      │
│     System Services & Data          │
├─────────────────────────────────────┤
│        Shared Code                  │
│   AI Models + Types + Constants    │
│        Cross-Process Logic          │
└─────────────────────────────────────┘
```

### Main Process (src/main/)

The main process handles system-level operations and data management:

- **Application Lifecycle**: Window creation, menu setup, app lifecycle management
- **Data Storage**: libsql database operations, file system access
- **System Integration**: File processing, IPC handlers, system APIs
- **Security**: Secure API key storage, file access validation

### Renderer Process (src/renderer/)

The renderer process provides the user interface:

- **UI Components**: React components with Chakra UI design system
- **State Management**: Zustand stores for application state
- **User Interactions**: Event handling, form management, real-time updates
- **Communication**: IPC client for main process communication

### Shared Code (src/shared/)

Shared code provides common functionality across processes:

- **Type Definitions**: TypeScript interfaces and types
- **Constants**: Configuration values and constraints
- **Utilities**: Helper functions for validation, formatting, ID generation
- **AI Models**: Abstract base classes and model interfaces

## Directory Structure and Responsibilities

### Main Process Structure

```
src/main/
├── main.ts              # Application entry point and lifecycle
├── preload.ts           # IPC bridge and security context
├── window.ts            # Window management and configuration
├── menu.ts              # Application menus and shortcuts
├── database/            # Data storage and management
│   ├── index.ts         # Database connection and lifecycle
│   ├── migrations.ts    # Schema versioning and updates
│   └── queries.ts       # Typed query functions
├── services/            # Business logic services
│   ├── project.ts       # Project CRUD operations
│   ├── conversation.ts  # Conversation management
│   ├── message.ts       # Message processing
│   ├── file-temp.ts     # Temporary file handling
│   ├── file-project.ts  # Project file management
│   ├── embedding.ts     # Vector processing service
│   ├── search.ts        # Search and retrieval
│   └── settings.ts      # Application settings
├── ai/                  # AI model implementations
│   ├── base.ts          # Abstract model interface
│   ├── openai.ts        # OpenAI integration
│   ├── claude.ts        # Anthropic Claude integration
│   └── manager.ts       # Model registry and management
├── ipc/                 # IPC request handlers
│   ├── project.ts       # Project-related IPC
│   ├── conversation.ts  # Conversation IPC handlers
│   ├── file.ts          # File operation handlers
│   ├── search.ts        # Search IPC handlers
│   └── settings.ts      # Settings IPC handlers
└── utils/               # Main process utilities
    ├── file.ts          # File system operations
    ├── text.ts          # Text processing
    └── validation.ts    # Input validation
```

### Renderer Process Structure

```
src/renderer/
├── index.html           # Application HTML template
└── src/
    ├── main.tsx         # React application entry
    ├── App.tsx          # Main app component and routing
    ├── components/      # Reusable UI components
    │   ├── ui/          # Basic UI components
    │   │   ├── Button.tsx       # Button variants
    │   │   ├── Input.tsx        # Form inputs
    │   │   ├── Modal.tsx        # Modal dialogs
    │   │   ├── FileCard.tsx     # File display cards
    │   │   └── MessageBubble.tsx # Chat message display
    │   ├── layout/      # Layout components
    │   │   ├── Sidebar.tsx      # Navigation sidebar
    │   │   ├── Header.tsx       # Application header
    │   │   └── MainLayout.tsx   # Main layout wrapper
    │   └── features/    # Feature-specific components
    │       ├── chat/
    │       │   ├── ChatInterface.tsx   # Main chat UI
    │       │   ├── MessageList.tsx     # Message display
    │       │   ├── InputBox.tsx        # Message input
    │       │   └── FileUpload.tsx      # File upload UI
    │       ├── project/
    │       │   ├── ProjectList.tsx     # Project overview
    │       │   ├── ProjectDetail.tsx   # Project details
    │       │   ├── FileManager.tsx     # File management
    │       │   └── MemoryManager.tsx   # Project memory
    │       └── settings/
    │           ├── SettingsPanel.tsx   # Settings container
    │           ├── APISettings.tsx     # API configuration
    │           └── GeneralSettings.tsx # General preferences
    ├── stores/          # State management
    │   ├── app.ts       # Application state (theme, UI)
    │   ├── project.ts   # Project and file state
    │   ├── conversation.ts # Chat state and messages
    │   └── settings.ts  # User preferences
    ├── hooks/           # Custom React hooks
    │   ├── useIPC.ts    # IPC communication
    │   ├── useChat.ts   # Chat functionality
    │   ├── useFiles.ts  # File operations
    │   └── useSearch.ts # Search operations
    ├── pages/           # Page components
    │   ├── ChatPage.tsx     # Main chat interface
    │   ├── ProjectPage.tsx  # Project management
    │   └── SettingsPage.tsx # Application settings
    └── utils/           # Frontend utilities
        ├── format.ts    # Display formatting
        ├── theme.ts     # Theme utilities
        └── constants.ts # UI constants
```

### Shared Code Structure

```
src/shared/
├── types/               # TypeScript definitions
│   ├── project.ts       # Project and file types
│   ├── conversation.ts  # Chat and session types
│   ├── message.ts       # Message content types
│   ├── file.ts          # File processing types
│   ├── ipc.ts           # IPC request/response types
│   ├── ai.ts            # AI model interfaces
│   └── index.ts         # Type exports
├── constants/           # Application constants
│   ├── app.ts           # App configuration
│   ├── file.ts          # File constraints
│   ├── ai.ts            # AI model settings
│   └── index.ts         # Constant exports
└── utils/               # Shared utilities
    ├── id.ts            # ID generation
    ├── time.ts          # Date/time formatting
    ├── validation.ts    # Data validation
    └── index.ts         # Utility exports
```

## Module Dependency Diagram

```
┌─────────────────┐    ┌─────────────────┐    ┌─────────────────┐
│   Renderer      │────│     Shared      │────│      Main       │
│   Process       │    │     Code        │    │    Process      │
└─────────────────┘    └─────────────────┘    └─────────────────┘
         │                       │                       │
         │                       ├─── Types ────────────┤
         │                       ├─── Constants ────────┤
         │                       └─── Utils ───────────┤
         │                                               │
         └─────────── IPC Communication ───────────────┘

Components Dependencies:
┌─────────────┐    ┌─────────────┐    ┌─────────────┐
│    Pages    │───▶│ Components  │───▶│   Stores    │
└─────────────┘    └─────────────┘    └─────────────┘
                           │                   │
                           ▼                   ▼
                   ┌─────────────┐    ┌─────────────┐
                   │    Hooks    │───▶│    IPC      │
                   └─────────────┘    └─────────────┘

Services Dependencies:
┌─────────────┐    ┌─────────────┐    ┌─────────────┐
│ IPC Handler │───▶│   Service   │───▶│  Database   │
└─────────────┘    └─────────────┘    └─────────────┘
                           │                   │
                           ▼                   ▼
                   ┌─────────────┐    ┌─────────────┐
                   │ AI Models   │    │ File System │
                   └─────────────┘    └─────────────┘
```

## Development Standards and Conventions

### Code Organization Principles

1. **Single Responsibility**: Each module has one clear purpose
2. **Clear Naming**: Function and variable names express intent
3. **Small Functions**: Prefer functions under 30 lines
4. **File Size**: Keep files under 300 lines when practical
5. **Error Handling**: All operations include proper error handling

### TypeScript Standards

- **Strict Mode**: Full TypeScript strict mode enabled
- **Type Safety**: No `any` types in production code
- **Interface First**: Define interfaces before implementations
- **Type Guards**: Use type guards for runtime validation
- **Generic Types**: Leverage generics for reusable code

### Component Architecture

- **Composition**: Prefer composition over inheritance
- **Props Interface**: Every component has a typed props interface
- **State Colocation**: Keep state close to where it's used
- **Custom Hooks**: Extract reusable logic to custom hooks
- **Error Boundaries**: Wrap components with error boundaries

### Service Layer Pattern

- **Interface Segregation**: Small, focused service interfaces
- **Dependency Injection**: Services receive dependencies via constructor
- **Error Handling**: Services return Result<T, Error> pattern
- **Async/Await**: Use async/await over Promise chains
- **Transaction Support**: Database operations support transactions

### IPC Communication Pattern

```typescript
// Request/Response pattern
interface IPCResult<T = unknown> {
  success: boolean
  data?: T
  error?: string
}

// Type-safe channels
const channels = {
  'project:create': (data: ProjectCreateRequest) => Promise<IPCResult<Project>>,
  'conversation:list': (projectId?: string) => Promise<IPCResult<Conversation[]>>,
}
```

### File Organization Rules

1. **Index Exports**: Each directory has an index.ts that exports public API
2. **Barrel Exports**: Use barrel exports to simplify imports
3. **Relative Imports**: Use relative imports within the same module
4. **Absolute Imports**: Use path mapping for cross-module imports
5. **Circular Dependencies**: Avoid circular import dependencies

### Testing Strategy

- **Unit Tests**: Test individual functions and classes
- **Integration Tests**: Test service interactions
- **Component Tests**: Test React component behavior
- **E2E Tests**: Test complete user workflows
- **Mock Strategy**: Mock external dependencies and APIs

### Performance Guidelines

- **Lazy Loading**: Load components and data on demand
- **Virtual Scrolling**: Use virtual scrolling for large lists
- **Debouncing**: Debounce user input and API calls
- **Memoization**: Memoize expensive calculations
- **Bundle Optimization**: Code splitting and tree shaking

### Security Practices

- **Input Validation**: Validate all user inputs
- **SQL Injection**: Use parameterized queries
- **XSS Prevention**: Sanitize rendered content
- **API Key Security**: Store API keys in secure storage
- **File Access**: Validate file paths and permissions

## Communication Patterns

### IPC Message Flow

1. **User Action** → UI Component
2. **Component** → Custom Hook
3. **Hook** → IPC Channel
4. **Main Process** → IPC Handler
5. **Handler** → Service Layer
6. **Service** → Database/AI/FileSystem
7. **Response** ← Reverse path

### State Management Flow

1. **Action** → Store Action
2. **Action** → State Update
3. **State** → Component Re-render
4. **Side Effect** → Service Call
5. **Result** → State Update

### Error Handling Strategy

- **Main Process**: Log errors and return structured error responses
- **Renderer Process**: Display user-friendly error messages
- **Shared**: Validate data at boundaries and provide clear error types
- **Recovery**: Implement retry logic and graceful degradation

This architecture ensures maintainable, testable, and scalable code while providing clear boundaries between different concerns in the application.