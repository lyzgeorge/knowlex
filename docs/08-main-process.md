# Main Process Architecture

This document provides comprehensive documentation for the main process architecture in Knowlex Desktop. The main process handles system-level operations, data management, AI integration, and secure communication with the renderer process.

## Architecture Overview

The main process implements a **4-layer architecture** with clear separation of concerns:

```
┌─────────────────────────────────────┐
│     Application Entry Layer        │
│   main.ts, window.ts, menu.ts      │
│    Application & Window Mgmt       │
├─────────────────────────────────────┤
│       Database Layer               │
│    database/ - libsql + FTS5       │
│   Migrations, Queries, Indexing    │
├─────────────────────────────────────┤
│       Service Layer                │
│  services/ - Business Logic        │
│  Project, Conversation, AI Chat     │
├─────────────────────────────────────┤
│    IPC Communication Layer         │
│  ipc/ - Type-safe Communication    │
│     Request Handling & Events      │
└─────────────────────────────────────┘
```

## Application Entry Layer

### Main Application (`main.ts`)

**File:** `src/main/main.ts`

**Responsibilities:**
- Application lifecycle management
- Database initialization and migrations
- IPC handler registration
- Development vs production environment handling

**Key Features:**
```typescript
class Application {
  // Singleton pattern for application instance
  private static instance: Application

  // Secure initialization sequence
  async initialize(): Promise<void>
  
  // Graceful shutdown with resource cleanup
  async shutdown(): Promise<void>
  
  // AI provider configuration
  async initializeAI(): Promise<void>
}
```

**Implementation Highlights:**
- **Secure Window Creation**: Prevents unauthorized window creation
- **Development Mode**: Debug window infrastructure (currently disabled)
- **Error Handling**: Comprehensive error logging and recovery
- **Auto-launch**: Database migrations and AI provider initialization

### Window Management (`window.ts`)

**File:** `src/main/window.ts`

**Responsibilities:**
- Secure window creation with proper preload scripts
- Cross-platform compatibility handling
- Theme adaptation and system integration
- External link security management

**Window Specifications:**
```typescript
interface WindowConfig {
  // Main Window
  main: {
    width: 1200,
    height: 800,
    minWidth: 800,
    minHeight: 600
  }
  
  // Debug Window (infrastructure ready)
  debug: {
    width: 1400,
    height: 900,
    minWidth: 1000,
    minHeight: 700
  }
}
```

**Security Features:**
- **Context Isolation**: Complete isolation between main and renderer processes
- **Node Integration**: Disabled for security
- **External Links**: Secure handling of external navigation
- **Preload Script**: Type-safe API exposure through `contextBridge`

### Application Menus (`menu.ts`)

**File:** `src/main/menu.ts`

**Features:**
- Cross-platform menu system (macOS, Windows, Linux)
- Standard application operations (File, Edit, View, Window, Help)
- Keyboard shortcuts and accelerators
- Context menus for enhanced productivity

### Preload Bridge (`preload.ts`)

**File:** `src/main/preload.ts`

**Purpose:**
- Secure API exposure to renderer process
- Type-safe IPC communication bridge
- Context bridge configuration

**Exposed APIs:**
```typescript
interface ElectronAPI {
  // Project Management
  project: ProjectAPI
  
  // Conversation Management  
  conversation: ConversationAPI
  
  // System Operations
  platform: string
  version: string
}
```

## Database Layer

### Database Connection (`database/index.ts`)

**File:** `src/main/database/index.ts`

**Implementation:**
- **libsql Client**: High-performance SQLite-compatible database
- **Environment Paths**: Development vs production database locations
- **Connection Pooling**: Efficient connection management
- **Error Handling**: Robust error recovery and logging

**Configuration:**
```typescript
interface DatabaseConfig {
  development: './data/knowlex.db'
  production: path.join(userData, 'knowlex.db')
  backup: Automated backup system
}
```

### Schema Migrations (`database/migrations.ts`)

**File:** `src/main/database/migrations.ts`

**Migration System:**
- **Version Control**: Sequential migration versioning
- **Rollback Support**: Safe schema rollback capabilities
- **Automatic Execution**: Migration runs on application startup
- **Error Recovery**: Failed migration handling and recovery

**Current Schema Versions:**

#### Migration 1: Core Schema
```sql
-- Projects table with metadata
CREATE TABLE projects (
  id TEXT PRIMARY KEY,
  name TEXT NOT NULL UNIQUE,
  description TEXT,
  settings TEXT, -- JSON
  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL
);

-- Conversations with optional project association
CREATE TABLE conversations (
  id TEXT PRIMARY KEY,
  project_id TEXT,
  title TEXT NOT NULL,
  settings TEXT, -- JSON
  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL,
  FOREIGN KEY (project_id) REFERENCES projects (id)
);

-- Multi-part messages with parent relationships
CREATE TABLE messages (
  id TEXT PRIMARY KEY,
  conversation_id TEXT NOT NULL,
  role TEXT NOT NULL CHECK (role IN ('user', 'assistant')),
  content TEXT NOT NULL, -- JSON array
  parent_id TEXT,
  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL,
  FOREIGN KEY (conversation_id) REFERENCES conversations (id),
  FOREIGN KEY (parent_id) REFERENCES messages (id)
);
```

#### Migration 2: Performance & Search
```sql
-- Performance indexes
CREATE INDEX IF NOT EXISTS idx_conversations_project ON conversations(project_id);
CREATE INDEX IF NOT EXISTS idx_messages_conversation ON messages(conversation_id);

-- Full-text search virtual table
CREATE VIRTUAL TABLE message_fts USING fts5(
  id UNINDEXED, 
  content, 
  content='messages', 
  content_rowid='rowid'
);

-- Project files for RAG functionality
CREATE TABLE project_files (
  id TEXT PRIMARY KEY,
  project_id TEXT NOT NULL,
  filename TEXT NOT NULL,
  original_path TEXT,
  content_hash TEXT,
  size INTEGER,
  mime_type TEXT,
  status TEXT DEFAULT 'pending', -- pending, processing, ready, failed
  error_message TEXT,
  chunk_count INTEGER DEFAULT 0,
  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL,
  FOREIGN KEY (project_id) REFERENCES projects (id)
);
```

#### Migration 3: Vector Storage
```sql
-- File chunks for vector embeddings
CREATE TABLE file_chunks (
  id TEXT PRIMARY KEY,
  file_id TEXT NOT NULL,
  content TEXT NOT NULL,
  embedding BLOB, -- Vector embedding
  chunk_index INTEGER,
  token_count INTEGER,
  created_at TEXT NOT NULL,
  FOREIGN KEY (file_id) REFERENCES project_files (id)
);

-- FTS5 trigger corrections
CREATE TRIGGER message_fts_insert AFTER INSERT ON messages BEGIN
  INSERT INTO message_fts(rowid, id, content) 
  VALUES (new.rowid, new.id, new.content);
END;
```

### Database Queries (`database/queries.ts`)

**File:** `src/main/database/queries.ts`

**Type-safe Query Interface:**
```typescript
interface DatabaseQueries {
  // Project Operations
  projects: {
    create(data: ProjectCreate): Promise<Project>
    findById(id: string): Promise<Project | null>
    list(): Promise<Project[]>
    update(id: string, data: Partial<Project>): Promise<Project>
    delete(id: string): Promise<void>
    getStats(id: string): Promise<ProjectStats>
  }
  
  // Conversation Operations
  conversations: {
    create(data: ConversationCreate): Promise<Conversation>
    findById(id: string): Promise<Conversation | null>
    list(projectId?: string): Promise<Conversation[]>
    update(id: string, data: Partial<Conversation>): Promise<Conversation>
    delete(id: string): Promise<void>
  }
  
  // Message Operations
  messages: {
    create(data: MessageCreate): Promise<Message>
    findById(id: string): Promise<Message | null>
    list(conversationId: string): Promise<Message[]>
    update(id: string, data: Partial<Message>): Promise<Message>
    delete(id: string): Promise<void>
  }
  
  // Settings Operations
  settings: {
    get(key: string): Promise<string | null>
    set(key: string, value: string): Promise<void>
    delete(key: string): Promise<void>
    list(): Promise<Record<string, string>>
  }
}
```

**Query Categories:**
- **Project Queries**: Full CRUD operations with statistics
- **Conversation Queries**: Session management with project linking
- **Message Queries**: Multi-part content handling
- **File Queries**: Document storage and processing status
- **Vector Queries**: Embedding storage and similarity search
- **Settings Queries**: Configuration management

## Service Layer

### Project Service (`services/project.ts`)

**File:** `src/main/services/project.ts`

**Business Logic:**
- **CRUD Operations**: Complete project lifecycle management
- **Validation**: Name uniqueness and data validation
- **Statistics**: Usage metrics and project insights
- **Duplication**: Project cloning functionality

**Key Functions:**
```typescript
class ProjectService {
  async createProject(data: ProjectCreate): Promise<Project>
  async getProject(id: string): Promise<Project>
  async listProjects(): Promise<Project[]>
  async updateProject(id: string, data: Partial<Project>): Promise<Project>
  async deleteProject(id: string): Promise<void>
  async getProjectStatistics(id: string): Promise<ProjectStats>
  async duplicateProject(id: string, newName: string): Promise<Project>
}
```

### Conversation Service (`services/conversation.ts`)

**File:** `src/main/services/conversation.ts`

**Business Logic:**
- **Session Management**: Conversation lifecycle and state
- **Project Association**: Linking conversations to projects
- **AI Title Generation**: Automatic conversation naming
- **Settings Management**: Per-conversation AI configuration

**Key Functions:**
```typescript
class ConversationService {
  async createConversation(data: ConversationCreate): Promise<Conversation>
  async generateTitle(conversationId: string): Promise<string>
  async moveToProject(conversationId: string, projectId: string): Promise<void>
  async forkConversation(conversationId: string, fromMessageId?: string): Promise<Conversation>
}
```

### Message Service (`services/message.ts`)

**File:** `src/main/services/message.ts`

**Content Handling:**
- **Multi-part Content**: Text, images, citations, tool calls
- **Validation**: Content type and structure validation
- **Convenience Methods**: Simplified message creation
- **Content Extraction**: Utilities for content processing

**Content Types:**
```typescript
type MessageContent = 
  | TextContent
  | ImageContent  
  | CitationContent
  | ToolCallContent

interface MessagePart {
  type: ContentType
  content: MessageContent
}
```

### AI Chat Service (`services/ai-chat.ts`)

**File:** `src/main/services/ai-chat.ts`

**AI Integration:**
- **Configuration Management**: API keys and model settings
- **Response Processing**: AI response handling and formatting
- **Error Handling**: Provider-specific error management
- **Configuration Testing**: Validation of API credentials

**Integration Points:**
```typescript
class AIChatService {
  async processMessage(
    messages: Message[],
    config: AIConfig
  ): Promise<AIResponse>
  
  async testConfiguration(config: AIConfig): Promise<boolean>
  
  async generateTitle(
    messages: Message[],
    config: AIConfig
  ): Promise<string>
}
```

## IPC Communication Layer

### Project IPC Handler (`ipc/project.ts`)

**File:** `src/main/ipc/project.ts`

**IPC Channels:**
- `project:create` - Create new project
- `project:get` - Retrieve project by ID
- `project:list` - List all projects
- `project:update` - Update project details
- `project:delete` - Delete project and data
- `project:stats` - Get project statistics
- `project:duplicate` - Clone project

**Implementation Pattern:**
```typescript
interface IPCHandler<TRequest, TResponse> {
  handle(event: IpcMainInvokeEvent, request: TRequest): Promise<TResponse>
  validate(request: unknown): request is TRequest
}
```

### Conversation IPC Handler (`ipc/conversation.ts`)

**File:** `src/main/ipc/conversation.ts`

**IPC Channels:**
- `conversation:create` - Create new conversation
- `conversation:list` - List conversations (with optional project filter)
- `conversation:get` - Get conversation with messages
- `conversation:update` - Update conversation details
- `conversation:delete` - Delete conversation
- `conversation:send-message` - Send message and get AI response
- `conversation:fork` - Fork conversation from message
- `conversation:move` - Move conversation to project

**Real-time Events:**
```typescript
interface ConversationEvents {
  'conversation:created': Conversation
  'conversation:updated': Conversation
  'conversation:deleted': string
  'message:created': Message
  'message:updated': Message
}
```

## AI Integration Architecture

### AI Manager (`ai/manager.ts`)

**File:** `src/main/ai/manager.ts`

**Provider Management:**
- **Registration System**: Dynamic provider registration
- **Model Caching**: LRU cache with TTL expiration
- **Capability Detection**: Model feature detection
- **Configuration Validation**: API key and model validation

**Cache Strategy:**
```typescript
interface ModelCache {
  cache: LRUCache<string, AIModel>
  ttl: number // 30 minutes
  maxSize: number // 10 models
  
  get(key: string): AIModel | undefined
  set(key: string, model: AIModel): void
  cleanup(): void
}
```

### Base AI Model (`ai/base.ts`)

**File:** `src/main/ai/base.ts`

**Abstract Interface:**
```typescript
abstract class BaseAIModel {
  abstract chat(
    messages: AIMessage[],
    options?: AIChatCompletionOptions
  ): Promise<AIChatCompletion>
  
  abstract stream(
    messages: AIMessage[],
    options?: AIChatCompletionOptions
  ): Promise<AsyncIterable<AIStreamChunk>>
  
  abstract getCapabilities(): ModelCapabilities
}
```

### Provider Implementations

#### OpenAI Provider (`ai/openai.ts`)

**File:** `src/main/ai/openai.ts`

**Features:**
- **GPT Models**: GPT-4o, GPT-4 Turbo, GPT-3.5 Turbo
- **Multimodal Support**: Text and image processing
- **Streaming Responses**: Real-time response generation
- **Tool Calling**: Function calling capabilities
- **Error Handling**: OpenAI-specific error processing

#### Claude Provider (`ai/claude.ts`)

**File:** `src/main/ai/claude.ts`

**Features:**
- **Claude Models**: Claude-3 Opus, Sonnet, Haiku
- **Reasoning Content**: Support for Claude's reasoning responses
- **Large Context**: Extended context window handling
- **Safety Features**: Content filtering and moderation
- **Anthropic SDK**: Official SDK integration

## Implementation Status & Gaps

### Fully Implemented ✅
- **Application Lifecycle**: Complete window and application management
- **Database Layer**: Full schema, migrations, and type-safe queries
- **Core Services**: Project, conversation, message, file-temp, settings, AI chat services
- **AI Integration**: OpenAI and Claude providers with caching, plus test integration
- **IPC Communication**: Project and conversation IPC handlers
- **Security**: Context isolation and secure preload bridge

### Partially Implemented ⚠️
- **Streaming Responses**: Infrastructure ready, not fully integrated
- **Debug Window**: Code exists but disabled
- **AI Configuration**: Basic implementation, needs UI integration

### Missing Implementation ❌
- **File Services**: `file-project.ts`, `embedding.ts`, `search.ts`
- **IPC Handlers**: File upload, search, and settings IPC
- **Utils Directory**: `src/main/utils/` exists but is completely empty
- **RAG System**: File chunking and vector search functionality
- **MCP Integration**: Model Context Protocol support

## Best Practices & Patterns

### Error Handling
```typescript
// Consistent error handling pattern
try {
  const result = await operation()
  return { success: true, data: result }
} catch (error) {
  console.error('Operation failed:', error)
  return { 
    success: false, 
    error: error instanceof Error ? error.message : 'Unknown error' 
  }
}
```

### Type Safety
```typescript
// Input validation with type guards
function isValidRequest(data: unknown): data is RequestType {
  return typeof data === 'object' && 
         data !== null && 
         'requiredField' in data
}
```

### Service Pattern
```typescript
// Consistent service structure
class ServiceBase {
  constructor(private db: Database) {}
  
  protected async validateInput<T>(data: unknown, validator: (data: unknown) => data is T): Promise<T> {
    if (!validator(data)) {
      throw new Error('Invalid input data')
    }
    return data
  }
}
```

## Security Considerations

### Context Isolation
- **Complete Process Separation**: Main and renderer processes fully isolated
- **No Node.js in Renderer**: Renderer process has no Node.js access
- **Secure Preload**: All APIs exposed through secure context bridge

### Data Validation
- **Input Sanitization**: All IPC inputs validated and sanitized
- **SQL Injection Prevention**: Parameterized queries throughout
- **Type Safety**: Runtime type checking for all external inputs

### File System Access
- **Controlled Access**: File operations only through secure APIs
- **Path Validation**: All file paths validated and sanitized
- **Sandbox Compliance**: All file operations respect platform sandboxing

## Performance Optimizations

### Database Performance
- **Indexes**: Comprehensive indexing strategy for all queries
- **FTS5**: High-performance full-text search
- **Connection Pooling**: Efficient database connection management
- **Query Optimization**: Optimized queries with proper joins and filters

### Memory Management
- **Model Caching**: LRU cache with automatic cleanup
- **Event Listeners**: Proper cleanup of event listeners
- **Resource Cleanup**: Graceful resource cleanup on shutdown

### IPC Optimization
- **Batch Operations**: Batch multiple operations when possible
- **Async Patterns**: Non-blocking IPC communication
- **Event Broadcasting**: Efficient real-time updates

The main process architecture demonstrates excellent engineering practices with robust error handling, comprehensive type safety, and extensible design patterns. It provides a solid foundation for the remaining features outlined in the project specifications.