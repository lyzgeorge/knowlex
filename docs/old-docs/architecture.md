# Architecture Guide

This document provides a comprehensive overview of Knowlex Desktop's system architecture, technology choices, and design principles.

## System Overview

Knowlex Desktop is a cross-platform desktop application that integrates AI-powered conversations, project management, and knowledge accumulation into a unified workspace.

### Core Value Propositions
- **Dual-Mode RAG System**: Project-internal mode with vector search and project memory, plus project-external mode for lightweight conversations with temporary file uploads
- **Project-Centric Workspace**: Aggregates conversations, files, memory, and notes into structured project environments
- **Complete Local Privacy**: All data stored locally using libsql (SQLite) for both structured and vector data
- **Multi-Modal Conversations**: Support for text, images, citations with streaming responses

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
│   AI Model System + Core Types     │
│        Cross-Process Logic          │
└─────────────────────────────────────┘
```

### Process Separation
- **Security First**: Complete process isolation with no Node.js access in renderer
- **Type Safety**: Shared type definitions ensure consistency across processes
- **Secure Communication**: All IPC communication validated and type-checked

## Technology Stack

| Category | Technology | Purpose |
|----------|------------|---------|
| **Application Framework** | Electron | Cross-platform desktop application |
| **Frontend Framework** | React 18 + TypeScript | User interface development |
| **State Management** | Zustand + Immer | Modular state management with persistence |
| **UI Component System** | Chakra UI | Complete component library with theming |
| **Data Storage** | libsql (SQLite) | Local database with native vector support |
| **Vector Database** | File chunks with BLOB embeddings | Vector storage and similarity search |
| **AI Integration** | Vercel AI SDK | Unified interface for multiple AI providers with streaming and reasoning support |
| **Build Tool** | electron-vite | Development and build tooling |

## Main Process Architecture

The main process handles system-level operations, data management, AI integration, and secure communication.

### Layer Structure

```
┌─────────────────────────────────────┐
│     Application Entry Layer        │
│   main.ts, window.ts, menu.ts      │
│    Application & Window Mgmt       │
├─────────────────────────────────────┤
│       Service Layer                │
│  services/ - Business Logic        │
│  Project, Conversation, AI Chat     │
├─────────────────────────────────────┤
│       Database Layer               │
│    database/ - libsql + FTS5       │
│   Migrations, Queries, Indexing    │
├─────────────────────────────────────┤
│    IPC Communication Layer         │
│  ipc/ - Type-safe Communication    │
│     Request Handling & Events      │
└─────────────────────────────────────┘
```

### Core Services

**Project Service** (`src/main/services/project.ts`)
- Complete CRUD operations for project management
- Statistics tracking and project insights
- Validation and duplication functionality

**Conversation Service** (`src/main/services/conversation.ts`)  
- Session management with AI title generation
- Project association and conversation forking
- Settings management per conversation

**Message Service** (`src/main/services/message.ts`)
- Multi-part content handling (text, images, citations, tool calls)
- Content validation and extraction utilities

**AI Chat Service** (`src/main/services/ai-chat.ts`)
- Vercel AI SDK integration with OpenAI and compatible providers
- Streaming support with reasoning capabilities
- Configuration management and testing

**File Services**
- `file-temp.ts`: Temporary file processing for chat (✅ Implemented)
- `file-project.ts`: Project file processing with RAG (❌ Not implemented)
- `embedding.ts`: Vector embedding generation (❌ Not implemented)
- `search.ts`: Vector and full-text search (❌ Not implemented)

### Database System

**Schema Design**: Three migrations implementing core tables, performance indexes, and vector storage

**Migration 1**: Core tables (projects, conversations, messages, project_files, project_memories, app_settings)

**Migration 2**: Performance indexes and FTS5 full-text search

**Migration 3**: Vector storage with file_chunks table and embedding BLOB columns

**Query Interface**: Type-safe functions in `src/main/database/queries.ts` with comprehensive error handling

**Search Capabilities**: FTS5 virtual tables for full-text search with automatic indexing triggers

## Renderer Process Architecture

The renderer process implements a modern React application with comprehensive state management.

### Component Architecture

```
┌─────────────────────────────────────┐
│        Application Layer            │
│   main.tsx, App.tsx, index.html     │
│    Bootstrap & Entry Points         │
├─────────────────────────────────────┤
│         State Layer                 │
│   stores/ - Zustand State Mgmt     │
│  App, Project, Conversation, Set    │
├─────────────────────────────────────┤
│       Component Layer               │
│  components/ - React Components     │
│  Layout, Features, UI Components    │
├─────────────────────────────────────┤
│     Theming & Utils Layer           │
│  theme/ - Chakra UI Customization  │
│  utils/ - Helper Functions          │
└─────────────────────────────────────┘
```

### State Management (Zustand)

**App Store** (`stores/app.ts`)
- Theme management with cross-window synchronization
- UI state (sidebar width, fullscreen, window mode)
- Network status monitoring

**Conversation Store** (`stores/conversation.ts`)
- Real-time streaming state management
- Optimistic updates with server synchronization
- Event-driven updates through IPC events
- Pending conversation handling

**Project Store** (`stores/project.ts`)
- Project data and file management
- Upload progress tracking
- Statistics and memory management

**Settings Store** (`stores/settings.ts`)
- API provider configurations
- Application preferences with validation
- Persistent storage management

### Component System

**Base UI Components** (`components/ui/`)
- Button, Input, Modal with accessibility and theming
- FileCard for file display with status indicators
- MessageBubble for multi-part message content

**Layout Components** (`components/layout/`)
- MainLayout with Electron integration (draggable regions)
- Sidebar with advanced navigation (760+ lines, virtual scrolling, search)

**Feature Components** (`components/features/`)
- **Chat Components** (✅ Fully implemented):
  - ChatInterface, MessageList, ChatInputBox
  - MessageActionIcons, MessageEditModal, FilePreview
- **Project Components** (❌ Missing): ProjectList, ProjectDetail, FileManager
- **Settings Components** (❌ Missing): SettingsPanel, APISettings

### Theming System

**Comprehensive Chakra UI customization** with semantic color tokens, component overrides, and advanced theme coordination using ThemeManager for cross-window synchronization.

## Shared Code Architecture

Domain-driven design with three layers:

### Type System (`shared/types/`)

**Project Domain** (`project.ts`)
- Project, ProjectFile, ProjectMemory interfaces
- File status tracking and constraints
- Project settings and statistics

**Conversation Domain** (`conversation.ts`)
- Conversation and session settings
- Model configuration interfaces

**Message Domain** (`message.ts`)
- Multi-part message content system
- Support for text, images, citations, tool calls

**IPC Types** (`ipc.ts`)
- Standardized IPCResult wrapper
- Request/response type definitions

### Constants System (`shared/constants/`)

**File Constraints** (`file.ts`)
- Temporary files: 10 files max, 1MB each, .txt/.md only
- Project files: 1000 files max, 50MB each, comprehensive format support

**AI Configuration** (`ai.ts`)
- Model definitions and capabilities
- Default configurations and cost information

### Utilities (`shared/utils/`)

**ID Generation** (`id.ts`)
- generateId(), generateShortId(), generateUUID()

**Time Management** (`time.ts`)
- formatRelativeTime() for "2h ago" formatting
- getCurrentTimestamp() for ISO strings

**Validation** (`validation.ts`)
- File validation with context-aware constraints
- Email, URL, and general input validation

## Communication Patterns

### IPC System

**Three-Layer Communication**:
1. **Renderer Process**: React components and stores
2. **Preload Bridge**: contextBridge.exposeInMainWorld for secure API exposure
3. **Main Process**: ipcMain.handle() endpoints with validation

**Type Safety**: All IPC calls use shared types with runtime validation

**Event System**: Real-time updates through Electron's event system for project/conversation/message events

**Streaming Support**: Special handling for AI response streaming with reasoning phases

### AI Integration

**Vercel AI SDK Integration** with support for:
- OpenAI official API (GPT-4o, o1 models with reasoning)
- OpenAI-compatible APIs (SiliconFlow, Groq)
- Streaming responses with reasoning display
- Configuration management with validation

## Security Model

### Process Isolation
- **Context Isolation**: Complete separation between main and renderer processes
- **No Node.js in Renderer**: Renderer has no direct system access
- **Secure Bridge**: All APIs exposed through validated contextBridge

### Data Protection
- **Local Storage**: All data stored locally, no cloud dependencies
- **Input Validation**: Comprehensive validation at all entry points
- **SQL Injection Prevention**: Parameterized queries throughout
- **File System Security**: Controlled access with path validation

### Network Security
- **API Key Management**: Secure environment-based configuration
- **Error Handling**: No sensitive information in error messages
- **Content Validation**: AI responses validated and sanitized

## Performance Considerations

### Database Performance
- **Strategic Indexing**: Comprehensive indexes for all common query patterns
- **FTS5 Search**: High-performance full-text search
- **Connection Management**: Efficient database connection handling
- **Query Optimization**: Optimized queries with proper joins

### Frontend Performance
- **Virtual Scrolling**: For large message and conversation lists
- **Selective Subscriptions**: Zustand stores with optimized re-renders
- **Memoization**: React.memo and useCallback for expensive operations
- **Lazy Loading**: Components loaded on demand

### AI Performance
- **Model Caching**: LRU cache with TTL for model instances
- **Streaming**: Real-time response generation without blocking
- **Batch Processing**: Efficient handling of multiple requests

## Development Environment

### Dual-Window Architecture
- **Main Window**: User interface with MainApp component
- **Debug Window**: Development tools with DebugApp component (infrastructure ready)
- **URL Routing**: Access via `?mode=debug` parameter

### Hot Reloading
- Full hot reload support for both main and renderer processes
- Automatic database migrations on startup
- Development-specific mock data system

## Deployment Architecture

### Build System
- **electron-vite**: Modern build tooling with TypeScript support
- **Cross-Platform**: Automated builds for macOS, Windows, Linux
- **Code Signing**: Platform-specific signing and notarization
- **Auto-Updates**: Infrastructure ready for automatic updates

### Distribution
- **Native Packages**: Platform-specific installers and packages
- **Portable Builds**: Standalone executables
- **Development Builds**: Debug-enabled versions for testing

This architecture provides a robust, secure, and scalable foundation for the Knowlex Desktop application, with clear separation of concerns and modern development practices throughout.