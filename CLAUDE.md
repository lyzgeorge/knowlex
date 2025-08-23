## 1. Overview and Architecture Principles

### 1.1 Project Vision

Knowlex is a cross-platform desktop application built with Electron that serves as a simple AI chat interface. The current MVP focuses on core conversation functionality with local data storage.

**Current MVP Features:**
- **Simple Chat Interface**: Direct conversations with AI models with streaming responses
- **Temporary File Upload**: Upload files to individual conversations for context (no persistent storage)
- **Local Data Storage**: Conversations and messages stored locally using SQLite
- **Multiple AI Providers**: Support for different AI models through unified interface
- **Basic Settings Management**: Configure AI providers and application preferences

**Future Planned Features** (not yet implemented):
- Project-centric workspace with file management
- Vector search and RAG capabilities  
- Knowledge accumulation and memory systems
- Advanced file processing and indexing

### 1.2 Architecture Design Principles

**Three-Layer Electron Architecture** (inspired by Chatbox):
```
┌─────────────────────────────────────┐
│        Renderer Process             │
│    React + TypeScript + Jotai      │
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

**Design Principles:**
- Single responsibility and clear separation of concerns
- Modular design for easy testing and maintenance
- Avoid over-abstraction, keep code simple
- Prioritize readability and maintainability

```
knowlex/
├── src/
│   ├── main/                     # Main Process (Node.js + Electron)
│   │   ├── main.ts               # App entry: window creation, lifecycle management
│   │   ├── preload.ts            # IPC bridge: secure API exposure
│   │   ├── window.ts             # Window management: creation, theme adaptation
│   │   ├── menu.ts               # Menu management: application menu, shortcuts
│   │   ├── database/             # Database module
│   │   │   ├── index.ts          # Database connection: getDB(), closeDB()
│   │   │   ├── migrations.ts     # Database migrations: schema versioning
│   │   │   ├── schemas.ts        # Entity schemas: conversation, message mappings
│   │   │   ├── queries.ts        # Common queries: predefined query functions
│   │   │   └── entity.ts         # Entity base class for database operations
│   │   ├── services/             # Business services
│   │   │   ├── conversation.ts   # Conversation management: CRUD operations
│   │   │   ├── message.ts        # Message management: CRUD, streaming
│   │   │   ├── file-temp.ts      # Temporary file processing: text extraction
│   │   │   ├── file-parser.ts    # File parsing: content extraction utilities
│   │   │   ├── settings.ts       # Settings management: config read/write
│   │   │   ├── assistant-service.ts  # AI service integration
│   │   │   ├── openai-adapter.ts     # OpenAI API adapter
│   │   │   └── title-generation.ts  # Auto title generation for conversations
│   │   ├── ipc/                  # IPC handlers
│   │   │   ├── common.ts         # Common IPC utilities
│   │   │   ├── conversation.ts   # Conversation IPC: 'conversation:*' channels
│   │   │   ├── file.ts           # File IPC: 'file:*' channels  
│   │   │   └── settings.ts       # Settings IPC: 'settings:*' channels
│   │   └── utils/                # Utility functions
│   │       └── cancellation.ts   # Request cancellation utilities
│   │
│   ├── renderer/                 # Renderer Process (React + TypeScript)
│   │   ├── src/
│   │   │   ├── main.tsx          # React entry: app mounting
│   │   │   ├── App.tsx           # Main app component: routing, global state
│   │   │   ├── components/       # UI Components
│   │   │   │   ├── ui/           # Basic UI components
│   │   │   │   │   ├── Button.tsx           # Button component
│   │   │   │   │   ├── Input.tsx            # Input component
│   │   │   │   │   ├── Modal.tsx            # Modal component
│   │   │   │   │   ├── Notification.tsx    # Notification system
│   │   │   │   │   ├── UserMessage.tsx     # User message bubble
│   │   │   │   │   ├── AssistantMessage.tsx # Assistant message bubble
│   │   │   │   │   ├── ReasoningBox.tsx    # AI reasoning display
│   │   │   │   │   └── MessageContentRenderer.tsx # Message content rendering
│   │   │   │   ├── layout/       # Layout components
│   │   │   │   │   ├── Sidebar.tsx       # Sidebar: conversation navigation
│   │   │   │   │   └── MainLayout.tsx    # Main layout: sidebar + content
│   │   │   │   └── features/     # Feature components
│   │   │   │       └── chat/
│   │   │   │           ├── ChatInterface.tsx    # Chat interface: main chat UI
│   │   │   │           ├── MessageList.tsx      # Message list: conversation display
│   │   │   │           ├── ChatInputBox.tsx     # Input box: message composition
│   │   │   │           ├── TempFileCard.tsx     # Temporary file display
│   │   │   │           ├── MessageActionIcons.tsx # Message actions (edit, delete)
│   │   │   │           └── MessageEditModal.tsx   # Message editing modal
│   │   │   ├── stores/           # State management (Zustand)
│   │   │   │   ├── app.ts        # App state: theme, sidebar visibility
│   │   │   │   ├── conversation.ts # Conversation state: messages, streaming
│   │   │   │   ├── navigation.ts # Navigation state: view management
│   │   │   │   ├── settings.ts   # Settings state: API config, preferences
│   │   │   │   └── index.ts      # Store exports and composition
│   │   │   ├── hooks/            # Custom hooks
│   │   │   │   ├── useFileUpload.ts     # File upload handling
│   │   │   │   ├── useAutoScroll.ts     # Auto scroll for chat
│   │   │   │   └── useNotifications.ts  # Notification system
│   │   │   ├── pages/            # Page components
│   │   │   │   └── MainApp.tsx   # Main app page: primary UI container
│   │   │   ├── utils/            # Frontend utilities
│   │   │   │   ├── markdownComponents.tsx # Markdown rendering components
│   │   │   │   └── theme/        # Theme system
│   │   │   │       ├── index.ts      # Theme provider and configuration
│   │   │   │       ├── colors.ts     # Color definitions
│   │   │   │       ├── components.ts # Component theme overrides
│   │   │   │       └── [other theme files]
│   │   │   └── types/
│   │   │       └── global.d.ts   # Global type definitions
│   │   └── index.html            # HTML entry point
│   │
│   └── shared/                   # Shared code between processes
│       ├── types/                # Type definitions
│       │   ├── conversation.ts   # Conversation types: Conversation, SessionSettings
│       │   ├── message.ts        # Message types: Message, MessageContent
│       │   ├── file.ts           # File types: TemporaryFile, FileConstraints
│       │   ├── ai.ts             # AI types: model configurations
│       │   ├── ipc.ts            # IPC types: channel definitions
│       │   └── notification.ts   # Notification types
│       ├── constants/            # Constants
│       │   ├── app.ts            # App constants: version, config
│       │   ├── file.ts           # File constants: supported formats, limits
│       │   └── ai.ts             # AI constants: model lists, defaults
│       └── utils/                # Shared utilities
│           ├── id.ts             # ID generation: UUID, short IDs
│           ├── time.ts           # Time utilities: formatting, relative time
│           └── validation.ts     # Validation utilities: data validation
│
├── electron.vite.config.ts       # Vite configuration
├── tsconfig.json                 # TypeScript configuration
└── package.json                  # Project configuration
```

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
| **Application Framework** | Electron | Cross-platform desktop application |
| **Frontend Framework** | React 18 + TypeScript | User interface development |
| **State Management** | Zustand | Lightweight state management with persistence |
| **UI Component System** | Chakra UI | Complete component library with theming |
| **Data Storage** | SQLite (better-sqlite3) | Local database for conversations and messages |
| **AI Integration** | Custom OpenAI adapter | Direct OpenAI API integration with streaming |
| **File Processing** | Custom parsers | Text extraction from common file formats |
| **Build Tool** | Vite (electron-vite) | Development and build tooling |

## 3. Current Implementation Status

### 3.1 Implemented Features (MVP)
- ✅ **Chat Interface**: Clean chat UI with message bubbles, user/assistant roles
- ✅ **Conversation Management**: Create, delete, rename conversations via sidebar
- ✅ **Temporary File Upload**: Upload files to conversations for context (text extraction)
- ✅ **Streaming Responses**: Real-time AI response streaming with proper UI updates
- ✅ **Message Actions**: Edit, delete, copy messages with inline controls
- ✅ **Settings Panel**: Configure OpenAI API settings, app preferences
- ✅ **Local Storage**: SQLite database for conversations and messages
- ✅ **Theme Support**: Dark/light mode with Chakra UI theming
- ✅ **Auto Title Generation**: Automatic conversation titles based on content
- ✅ **Responsive Design**: Desktop-optimized layout with resizable panels

### 3.2 Planned Features (Not Yet Implemented)
- ❌ **Project Management**: Project-centric workspace (database schema exists)
- ❌ **Vector Search/RAG**: File indexing and semantic search capabilities
- ❌ **Multiple AI Providers**: Support for Claude, other AI models
- ❌ **Persistent File Management**: Long-term file storage and organization
- ❌ **Knowledge Accumulation**: Project memory and note-taking systems
- ❌ **Full-Text Search**: Search across conversations and content
- ❌ **Export/Import**: Data portability features