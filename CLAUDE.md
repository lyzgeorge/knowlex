# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## 1. Development Commands

### Core Development Workflow
```bash
# Start development server
pnpm run dev

# Build the application
pnpm run build

# Run tests
pnpm run test
pnpm run test:ui      # Vitest UI interface
pnpm run test:coverage # Coverage report

# Type checking and linting
pnpm run typecheck    # TypeScript type checking
pnpm run lint         # ESLint with auto-fix
pnpm run format       # Prettier formatting

# Distribution builds
pnpm run dist         # Build distributable
pnpm run dist:win     # Windows build
pnpm run dist:mac     # macOS build
pnpm run dist:linux   # Linux build
```

### Path Aliases
The project uses TypeScript path mapping:
- `@shared/*` - Shared code between main and renderer processes
- `@main/*` - Main process code (Node.js + Electron)
- `@renderer/*` - Renderer process code (React)
- `@preload/*` - Preload script code

### Database Operations
- Database files are stored in user data directory
- Migrations run automatically on application start
- Use database queries from `@main/database/queries.ts`
- Entity operations through `@main/database/entity.ts`

### IPC Communication Pattern
All IPC follows the `IPCResult<T>` pattern:
```typescript
interface IPCResult<T = unknown> {
  success: boolean
  data?: T
  error?: string
}
```

IPC channels are organized by domain:
- `conversation:*` - Conversation operations
- `message:*` - Message operations  
- `file:*` - File operations
- `settings:*` - Settings operations
- `project:*` - Project operations

## 2. Overview and Architecture Principles

### 1.1 Project Vision

Knowlex is a cross-platform desktop application built with Electron that serves as a simple AI chat interface. The current MVP focuses on core conversation functionality with local data storage.

**Current MVP Features:**
- **Simple Chat Interface**: Direct conversations with AI models with streaming responses
- **Project Management**: Project-centric workspace with conversation organization
- **Message Branching**: Advanced conversation branching with tree-like message navigation
- **Temporary File Upload**: Upload files to individual conversations for context (no persistent storage)
- **Local Data Storage**: Conversations, messages, and projects stored locally using SQLite
- **Multiple AI Providers**: Support for different AI models through unified interface
- **Basic Settings Management**: Configure AI providers and application preferences

**Future Planned Features** (not yet implemented):
- Vector search and RAG capabilities  
- Knowledge accumulation and memory systems
- Advanced file processing and indexing
- Persistent file management

### 2.2 Architecture Design Principles

**Three-Layer Electron Architecture**:
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

**Core Design Principles:**
- **Simple AI Chat Interface**: Clean, focused chat experience with streaming responses
- **Zustand State Management**: Lightweight state management with persistence
- **Secure IPC Communication**: Type-safe communication between main and renderer processes
- **Local-First Architecture**: All data stored locally with SQLite database
- **Modular Service Layer**: Separated concerns for different functionality areas

### 1.3 IMPORTANT NOTICE

Your role:

```mark
name: electron-react-architect
description: Agent for Electron + React + Node.js architecture, code reviews, and implementation guidance for Electron apps.

----

You are an expert Electron + React + Node.js architect. Optimize for clean, maintainable, scalable structure.

Use when: designing features/modules, reviewing React/Electron code, or planning IPC/main–renderer integration.

Core principles:
- Readable, intention-revealing code
- Single Responsibility at module/component/function level
- Prefer simple, explicit implementations
- Keep files reasonably small (≈ <300 lines when practical)
- Understand current status through `docs/README.md`
- Document each module in `docs/` with purpose, usage, key decisions

Expertise:
- Electron main/renderer architecture & IPC
- React components, hooks, state management
- Node.js services, FS ops, API design
- TS/JS patterns, tooling, build & release for Electron

Working method:
1) Analyze requirements → small, focused modules  
2) Design first → outline components/modules & boundaries  
3) Implement cleanly → self-documenting names, minimal complexity  
4) Validate architecture → cohesion, clear contracts, IPC boundaries  
5) Document decisions → brief rationale + examples

Code standards:
- Descriptive names; small functions (~20–30 lines)
- Clear separation: UI vs business vs data access
- Graceful error handling with actionable messages
- Testable, debuggable structure (DI where helpful)

Communication:
- Use English for code/docs/comments
- Explain architectural choices succinctly
- Suggest improvements and viable alternatives
- Call out risks, trade-offs, and how to avoid issues

Proactive stance: flag architectural smells, propose refactors, and ensure designs scale with app growth.
```

## 2. System Architecture

### 2.1 Current Project Structure (MVP Implementation)

The project follows a standard Electron + React + TypeScript structure, organized for clarity and separation of concerns.

```tree
.
├── .github/                # CI/CD workflows
├── docs/                   # Project documentation
├── prd/                    # Product Requirement Documents
├── src/
│   ├── main/               # Main process (Node.js + Electron)
│   │   ├── database/       # SQLite database layer (schemas, queries, entities)
│   │   ├── ipc/            # IPC handlers for renderer-main communication
│   │   ├── services/       # Core business logic (AI, files, projects)
│   │   ├── utils/          # Main process utilities
│   │   ├── main.ts         # Application entry point
│   │   ├── preload.ts      # Preload script for secure IPC
│   │   └── window.ts       # Window management
│   │
│   ├── renderer/           # Renderer process (React UI)
│   │   ├── components/     # React components (features, layout, UI)
│   │   ├── hooks/          # Custom React hooks
│   │   ├── lib/            # Test setup and libraries
│   │   ├── pages/          # Top-level page components
│   │   ├── stores/         # Zustand state management stores
│   │   ├── styles/         # Global styles
│   │   ├── types/          # Renderer-specific types
│   │   ├── utils/          # Renderer utilities (theming, etc.)
│   │   ├── App.tsx         # Root React component
│   │   └── main.tsx        # React application entry point
│   │
│   └── shared/             # Code shared between main and renderer
│       ├── constants/      # Application-wide constants
│       ├── types/          # Shared type definitions (IPC, data models)
│       └── utils/          # Shared utility functions
│
├── electron.vite.config.ts # Vite configuration for Electron
├── package.json            # Project dependencies and scripts
└── tsconfig.json           # TypeScript configuration
```

**Design Principles:**
- Single responsibility and clear separation of concerns
- Modular design for easy testing and maintenance
- Avoid over-abstraction, keep code simple
- Prioritize readability and maintainability

### 2.2 Three-Layer Process Architecture

**Main Process (`src/main/`)**
- Application lifecycle management (windows, menus, system tray)
- SQLite database for local data storage (conversations, messages, settings)
- File processing for temporary uploads (text extraction, validation)
- AI service integration (OpenAI adapter, conversation management)
- Secure IPC communication bridge between processes

**Renderer Process (`src/renderer/`)**
- React user interface (chat interface, settings)
- Zustand state management (lightweight, with persistence)
- Chakra UI component library for consistent styling
- Real-time streaming response handling and display

**Shared Code (`src/shared/`)**
- Type definitions for cross-process communication
- Core data types (messages, conversations, files)
- Common utility functions and validation
- Constants and configuration values

### 2.3 Current Technology Stack (MVP)

| Category | Technology | Purpose |
|----------|------------|---------|
| **Application Framework** | Electron 28 | Cross-platform desktop application |
| **Frontend Framework** | React 18 + TypeScript | User interface development |
| **State Management** | Zustand 5.0 | Lightweight state management with persistence |
| **UI Component System** | Chakra UI 2.8 | Complete component library with theming |
| **Data Storage** | SQLite (@libsql/client) | Local database for conversations and messages |
| **AI Integration** | AI SDK (ai 5.0) | Unified AI provider integration with streaming |
| **AI Providers** | OpenAI, Anthropic, Google | Multiple AI model support |
| **File Processing** | Custom parsers (pdf-parse, officeparser) | Text extraction from common file formats |
| **Build Tool** | Vite (electron-vite) | Development and build tooling |
| **Testing** | Vitest + Testing Library | Unit and integration testing |

## 3. Key Architectural Patterns

### 3.1 IPC Communication Architecture
The application uses a structured IPC pattern with standardized error handling:

**Main Process Service → IPC Handler → Renderer**
```typescript
// IPC handlers use handleIPCCall wrapper for consistent error handling
export const handleIPCCall = async <T>(operation: () => Promise<T>): Promise<IPCResult<T>>

// Services are domain-specific (conversation, message, file, settings)
// Each service module exports business logic functions
// IPC handlers are thin wrappers that validate input and call services
```

### 3.2 Database Layer Architecture
**Entity-Based CRUD with Generic Operations**:
- `@main/database/entity.ts` - Generic CRUD base class
- `@main/database/schemas.ts` - Entity schemas and mappings
- `@main/database/queries.ts` - Optimized query functions
- Services use database queries, not direct entity access

### 3.3 AI Integration Architecture
**Unified AI Provider System**:
- `@main/services/openai-adapter.ts` - AI SDK integration
- `@main/services/assistant-service.ts` - Unified streaming logic
- Supports cancellation tokens for request management
- Real-time event emission to renderer during streaming

### 3.4 State Management Architecture
**Zustand Store Pattern**:
```typescript
// Stores are domain-specific and composable
// Located in @renderer/src/stores/
// Each store handles its own persistence
// Cross-store communication via direct imports
```

### 3.5 File Processing Architecture
**Temporary File System**:
- Files uploaded per-conversation (not globally stored)
- Text extraction via `@main/services/file-parser.ts`
- Support for PDF, Office docs, plain text, images
- File content becomes message parts in conversation context

### 3.6 Project Management Architecture
**Project-Centric Organization**:
- `@main/services/project-service.ts` - Project CRUD with validation
- `@main/ipc/project.ts` - Project IPC handlers
- `@renderer/stores/project.ts` - Project state management with Zustand
- `@renderer/hooks/useProjectManagement.ts` - Project operations hook
- Database enforced unique project names (case-insensitive)

### 3.7 Message Branching Architecture
**Tree-Like Conversation Navigation**:
- `@renderer/hooks/useMessageBranching.ts` - Advanced branching logic
- Supports conversation forking at any message
- Auto-switches to latest messages by default
- Remembers explicit user branch selections
- Cascading reset of downstream branches when switching

## 4. Current Implementation Status

### 4.1 Implemented Features (Current MVP)
- ✅ **Chat Interface**: Clean chat UI with message bubbles, user/assistant roles
- ✅ **Project Management**: Project-centric workspace with conversation organization
- ✅ **Message Branching**: Tree-like conversation navigation with branch switching
- ✅ **Conversation Management**: Create, delete, rename conversations via sidebar
- ✅ **Temporary File Upload**: Upload files to conversations for context (text extraction)
- ✅ **Streaming Responses**: Real-time AI response streaming with proper UI updates
- ✅ **Inline Editing**: Edit project/conversation names with validation
- ✅ **Settings Panel**: Configure OpenAI API settings, app preferences
- ✅ **Local Storage**: SQLite database for conversations, messages, and projects
- ✅ **Theme Support**: Dark/light mode with Chakra UI theming
- ✅ **Auto Title Generation**: Automatic conversation titles based on content
- ✅ **Responsive Design**: Desktop-optimized layout with resizable panels
- ✅ **Enhanced Sidebar**: Organized project and conversation sections

### 4.2 Recently Implemented Features
- ✅ **Project Management**: Project-centric workspace with conversation organization
- ✅ **Message Branching**: Tree-like conversation navigation with branch switching
- ✅ **Enhanced UI**: Improved sidebar with project/conversation sections
- ✅ **Inline Editing**: Edit project and conversation names inline
- ✅ **Project Pages**: Dedicated pages for project overview and conversation management

### 4.3 Planned Features (Not Yet Implemented)
- ❌ **Vector Search/RAG**: File indexing and semantic search capabilities  
- ❌ **Persistent File Management**: Long-term file storage and organization
- ❌ **Knowledge Accumulation**: Project memory and note-taking systems
- ❌ **Full-Text Search**: Search across conversations and content
- ❌ **Export/Import**: Data portability features

## 5. Important Architectural Guidelines

### 5.1 Code Organization
- Keep files under 300 lines when practical
- Use descriptive, intention-revealing names
- Separate UI, business logic, and data access concerns
- Prefer composition over inheritance
- Single responsibility at module/component/function level

### 5.2 Error Handling
- All IPC operations must use `handleIPCCall` wrapper
- Services should throw meaningful errors with context
- UI components should handle loading/error states
- Use cancellation tokens for long-running operations

### 5.3 Testing Strategy
- Unit tests for services and utilities using Vitest
- Integration tests for IPC communication
- Component tests for React components using Testing Library
- Mock Electron APIs in tests using vi.mock()

### 5.4 Performance Considerations
- Streaming responses for AI interactions
- Pagination for large data sets (conversations, messages)
- Lazy loading for components and modules
- Cancellation support for all async operations

### 5.5 Security Guidelines
- Never expose sensitive data through IPC
- Validate all input at IPC boundaries
- Use preload script for secure API exposure
- Store sensitive data (API keys) in encrypted settings
- src/shared/i18n/config.ts - Main i18n configuration
  - src/shared/i18n/types.ts - Type definitions
  - src/shared/i18n/init.ts - Initialization logic
  - src/shared/i18n/locales/en.json - English translations
  - src/shared/i18n/locales/zh.json - Chinese translations
  - src/renderer/hooks/useI18n.ts - React hook for i18n
  - src/renderer/components/ui/LanguageSelector.tsx - Language picker component
  - src/renderer/hooks/useLanguage.ts - Dedicated language management hook