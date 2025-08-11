# Database Module Documentation

## Overview

The database module provides a centralized data storage layer for Knowlex using libsql (SQLite with vector capabilities). It handles database connections, schema migrations, and provides type-safe query operations.

## Architecture

The database module consists of three main components:

```
src/main/database/
├── index.ts      # Connection management and query execution
├── migrations.ts # Schema versioning and table creation
└── queries.ts    # Type-safe database operations
```

## Core Components

### Connection Management (`index.ts`)

**Purpose**: Manages libsql client lifecycle and provides query execution utilities.

**Key Functions**:

- `getDB()`: Creates and returns database client instance
- `closeDB()`: Gracefully closes database connection
- `executeQuery(sql, params)`: Executes single SQL query with error handling
- `executeTransaction(queries)`: Executes multiple queries atomically
- `isDatabaseReady()`: Checks connection status

**Database Location**:
- **Development**: `./data/knowlex.db` (project root)
- **Production**: `{userData}/knowlex.db` (user data directory)

**Usage Example**:
```typescript
import { getDB, executeQuery } from '../database'

// Execute a simple query
const result = await executeQuery('SELECT * FROM projects WHERE id = ?', [projectId])

// Execute transaction
await executeTransaction([
  { sql: 'INSERT INTO projects ...', params: [...] },
  { sql: 'INSERT INTO conversations ...', params: [...] }
])
```

### Migration System (`migrations.ts`)

**Purpose**: Manages database schema evolution through versioned migrations.

**Key Functions**:

- `runMigrations()`: Applies all pending migrations
- `getCurrentVersion()`: Gets current schema version
- `rollbackToVersion(version)`: Rolls back to specific version (dev only)
- `getMigrationHistory()`: Returns applied migration list

**Migration Structure**:
```typescript
interface Migration {
  version: number
  name: string
  up: string[]      // Upgrade SQL statements
  down?: string[]   // Rollback SQL statements (optional)
}
```

**Current Migrations**:

1. **Version 1 - Initial Schema**:
   - Creates core tables: projects, conversations, messages, files
   - Sets up basic relationships and constraints
   - Includes vector storage table for RAG

2. **Version 2 - Indexes and FTS**:
   - Adds performance indexes
   - Creates FTS5 table for full-text search
   - Sets up automatic FTS synchronization triggers

**Usage Example**:
```typescript
import { runMigrations } from '../database/migrations'

// Apply pending migrations on app startup
await runMigrations()
```

### Query Interface (`queries.ts`)

**Purpose**: Provides type-safe, predefined database operations for all data entities.

**Key Features**:
- Full TypeScript type safety
- Automatic JSON serialization/deserialization
- Consistent error handling
- Optimized query patterns

**Supported Operations**:

#### Project Operations
- `createProject(project)` - Create new project
- `getProject(id)` - Get project by ID
- `listProjects()` - List all projects
- `updateProject(id, updates)` - Update project fields
- `deleteProject(id)` - Delete project (cascade)
- `getProjectStats(id)` - Get project statistics

#### File Operations
- `createProjectFile(file)` - Add file to project
- `listProjectFiles(projectId)` - List project files
- `updateProjectFileStatus(id, status, error?)` - Update processing status
- `updateProjectFileChunks(id, count)` - Update chunk count
- `deleteProjectFile(id)` - Remove file

#### Conversation Operations
- `createConversation(conversation)` - Create conversation
- `getConversation(id)` - Get conversation with settings
- `listConversations(projectId?)` - List conversations (optionally filtered)
- `updateConversation(id, updates)` - Update conversation
- `deleteConversation(id)` - Delete conversation

#### Message Operations
- `createMessage(message)` - Add message to conversation
- `getMessage(id)` - Get message with parsed content
- `listMessages(conversationId)` - Get conversation messages
- `updateMessage(id, content)` - Update message content
- `deleteMessage(id)` - Delete message

#### RAG/Vector Operations
- `createFileChunk(chunk)` - Store text chunk with embedding
- `listFileChunks(fileId)` - Get file chunks
- `deleteFileChunks(fileId)` - Remove all file chunks

#### Search Operations
- `searchMessages(query, limit)` - Full-text search across messages

#### Settings Operations
- `getSetting(key)` - Get application setting
- `setSetting(key, value)` - Set application setting
- `deleteSetting(key)` - Remove setting

**Usage Example**:
```typescript
import { createProject, listProjects } from '../database/queries'

// Create a new project
await createProject({
  id: generateId(),
  name: 'My Project',
  description: 'Project description'
})

// List all projects
const projects = await listProjects()
```

## Database Schema

### Core Tables

#### Projects
```sql
CREATE TABLE projects (
  id TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  description TEXT NOT NULL DEFAULT '',
  created_at TEXT NOT NULL DEFAULT (datetime('now')),
  updated_at TEXT NOT NULL DEFAULT (datetime('now'))
)
```

#### Conversations
```sql
CREATE TABLE conversations (
  id TEXT PRIMARY KEY,
  project_id TEXT,
  title TEXT NOT NULL,
  created_at TEXT NOT NULL DEFAULT (datetime('now')),
  updated_at TEXT NOT NULL DEFAULT (datetime('now')),
  settings TEXT, -- JSON SessionSettings
  FOREIGN KEY (project_id) REFERENCES projects (id) ON DELETE SET NULL
)
```

#### Messages
```sql
CREATE TABLE messages (
  id TEXT PRIMARY KEY,
  conversation_id TEXT NOT NULL,
  role TEXT NOT NULL CHECK (role IN ('user', 'assistant')),
  content TEXT NOT NULL, -- JSON MessageContent
  created_at TEXT NOT NULL DEFAULT (datetime('now')),
  updated_at TEXT NOT NULL DEFAULT (datetime('now')),
  parent_message_id TEXT,
  FOREIGN KEY (conversation_id) REFERENCES conversations (id) ON DELETE CASCADE,
  FOREIGN KEY (parent_message_id) REFERENCES messages (id) ON DELETE SET NULL
)
```

#### Project Files
```sql
CREATE TABLE project_files (
  id TEXT PRIMARY KEY,
  project_id TEXT NOT NULL,
  filename TEXT NOT NULL,
  filepath TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'pending',
  chunk_count INTEGER NOT NULL DEFAULT 0,
  size INTEGER NOT NULL DEFAULT 0,
  mime_type TEXT NOT NULL DEFAULT '',
  created_at TEXT NOT NULL DEFAULT (datetime('now')),
  updated_at TEXT NOT NULL DEFAULT (datetime('now')),
  error TEXT,
  FOREIGN KEY (project_id) REFERENCES projects (id) ON DELETE CASCADE
)
```

#### File Chunks (Vector Storage)
```sql
CREATE TABLE file_chunks (
  id TEXT PRIMARY KEY,
  file_id TEXT NOT NULL,
  content TEXT NOT NULL,
  chunk_index INTEGER NOT NULL,
  embedding BLOB, -- Vector embedding
  metadata TEXT, -- JSON metadata
  created_at TEXT NOT NULL DEFAULT (datetime('now')),
  FOREIGN KEY (file_id) REFERENCES project_files (id) ON DELETE CASCADE
)
```

### Search Tables

#### Full-Text Search (FTS5)
```sql
CREATE VIRTUAL TABLE messages_fts USING fts5(
  message_id,
  content,
  conversation_title,
  project_name,
  content='messages',
  content_rowid='id'
)
```

## Performance Features

### Indexing Strategy
- Primary indexes on all foreign keys
- Composite indexes for common query patterns
- Specialized indexes for time-based sorting

### Full-Text Search
- FTS5 virtual table for fast message search
- Automatic synchronization with triggers
- Ranked results with relevance scoring

### Vector Storage
- BLOB storage for embeddings (future: libsql vector functions)
- Chunk-based text storage for RAG retrieval
- Metadata support for search optimization

## Error Handling

### Connection Errors
- Automatic retry with exponential backoff
- Graceful degradation on connection loss
- Detailed error logging with context

### Query Errors
- Type-safe parameter binding
- SQL injection prevention
- Transaction rollback on error

### Migration Errors
- Rollback capability for failed migrations
- Version consistency checking
- Detailed migration history tracking

## Best Practices

### Type Safety
```typescript
// Always use typed queries
const projects: Project[] = await listProjects()

// Avoid raw SQL execution
// Use: createProject(projectData)
// Not: executeQuery('INSERT INTO projects ...')
```

### Transaction Usage
```typescript
// Group related operations
await executeTransaction([
  { sql: 'INSERT INTO projects ...', params: [...] },
  { sql: 'INSERT INTO project_memories ...', params: [...] }
])
```

### Connection Management
```typescript
// Database connections are managed automatically
// Call closeDB() only during app shutdown
app.on('before-quit', async () => {
  await closeDB()
})
```

## Integration Points

### Main Process Services
- Project service uses project/file queries
- Conversation service uses conversation/message queries
- Search service uses FTS and vector queries

### Migration Timing
- Run migrations on app startup
- Before any database operations
- Handle migration failures gracefully

### Settings Storage
- Use settings queries for persistent configuration
- JSON serialization for complex settings
- Environment-specific defaults

## Future Enhancements

### Vector Search
- Integrate libsql vector functions when available
- Cosine similarity search for RAG
- Embedding index optimization

### Performance Optimization
- Query result caching layer
- Connection pooling for heavy workloads
- Batch operation optimization

### Data Export
- JSON export functionality
- Markdown conversation export
- Project backup/restore capability