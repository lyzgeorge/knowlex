# Database and Storage System

This document provides comprehensive documentation for the database and storage system in Knowlex Desktop. The system uses libsql (SQLite-compatible) with advanced features including full-text search, vector storage capabilities, and a robust migration system.

## Architecture Overview

The database system implements a **layered architecture** with clear separation of concerns:

```
┌─────────────────────────────────────┐
│       Application Layer             │
│   Services using query functions    │
│  Project, Conversation, Message     │
├─────────────────────────────────────┤
│       Query Interface Layer         │
│   Type-safe query functions         │
│    database/queries.ts              │
├─────────────────────────────────────┤
│      Migration Layer                │
│   Versioned schema migrations       │
│    database/migrations.ts           │
├─────────────────────────────────────┤
│      Connection Layer               │
│   libsql client management          │
│    database/index.ts                │
└─────────────────────────────────────┘
```

**Key Features:**
- **libsql Database**: High-performance SQLite-compatible database with modern features
- **Migration System**: Versioned schema evolution with rollback support  
- **Full-Text Search**: FTS5 virtual tables with automatic indexing
- **Vector Storage**: Ready for embedding storage with BLOB columns
- **Type Safety**: Comprehensive TypeScript interfaces for all operations
- **Performance Optimization**: Strategic indexing and query optimization

## Database Connection Management

### Connection Setup (`src/main/database/index.ts`)

**File:** `src/main/database/index.ts`

**Environment-Aware Configuration:**
```typescript
import { createClient, Client } from '@libsql/client'
import path from 'path'
import { app } from 'electron'

// Global database client
let db: Client | null = null

// Environment-specific database paths
const getDatabasePath = (): string => {
  if (process.env.NODE_ENV === 'development') {
    return './data/knowlex.db'
  } else {
    const userDataPath = app.getPath('userData')
    return path.join(userDataPath, 'knowlex.db')
  }
}

// Initialize database connection
export const getDB = async (): Promise<Client> => {
  if (!db) {
    const dbPath = getDatabasePath()
    
    db = createClient({
      url: `file:${dbPath}`,
      authToken: undefined
    })
    
    console.log(`Database initialized at: ${dbPath}`)
    
    // Run migrations on initialization
    await runMigrations()
  }
  
  return db
}

// Graceful database closure
export const closeDB = async (): Promise<void> => {
  if (db) {
    await db.close()
    db = null
    console.log('Database connection closed')
  }
}

// Database health check
export const isDatabaseHealthy = async (): Promise<boolean> => {
  try {
    const client = await getDB()
    const result = await client.execute('SELECT 1 as health')
    return result.rows.length > 0
  } catch (error) {
    console.error('Database health check failed:', error)
    return false
  }
}
```

**Connection Features:**
- **Lazy Initialization**: Database connection created on first access
- **Environment Awareness**: Different paths for development vs production
- **Automatic Migrations**: Schema migrations run on connection
- **Graceful Cleanup**: Proper connection closure on app shutdown
- **Health Monitoring**: Database connectivity verification

## Schema Design and Migrations

### Migration System (`src/main/database/migrations.ts`)

**File:** `src/main/database/migrations.ts`

**Migration Framework:**
```typescript
interface Migration {
  version: number
  description: string
  up: string[]     // Forward migration SQL
  down?: string[]  // Rollback SQL (optional)
}

// Current schema version
const CURRENT_VERSION = 3

// All migrations in order
const MIGRATIONS: Migration[] = [
  {
    version: 1,
    description: 'Initial schema - core tables',
    up: [
      // Core tables creation SQL
    ]
  },
  {
    version: 2,
    description: 'Performance indexes and FTS5',
    up: [
      // Performance optimization SQL
    ]
  },
  {
    version: 3,
    description: 'Vector storage and FTS5 fixes',
    up: [
      // Vector storage and fixes SQL
    ]
  }
]

// Migration execution engine
export const runMigrations = async (): Promise<void> => {
  const db = await getDB()
  
  // Ensure schema_migrations table exists
  await db.execute(`
    CREATE TABLE IF NOT EXISTS schema_migrations (
      version INTEGER PRIMARY KEY,
      description TEXT NOT NULL,
      applied_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
    )
  `)
  
  // Get current version
  const result = await db.execute(`
    SELECT COALESCE(MAX(version), 0) as current_version 
    FROM schema_migrations
  `)
  
  const currentVersion = result.rows[0].current_version as number
  
  // Apply pending migrations
  for (const migration of MIGRATIONS) {
    if (migration.version > currentVersion) {
      console.log(`Applying migration ${migration.version}: ${migration.description}`)
      
      try {
        // Execute migration SQL in transaction
        await db.execute('BEGIN TRANSACTION')
        
        for (const sql of migration.up) {
          await db.execute(sql)
        }
        
        // Record successful migration
        await db.execute(`
          INSERT INTO schema_migrations (version, description) 
          VALUES (?, ?)
        `, [migration.version, migration.description])
        
        await db.execute('COMMIT')
        console.log(`✅ Migration ${migration.version} applied successfully`)
        
      } catch (error) {
        await db.execute('ROLLBACK')
        console.error(`❌ Migration ${migration.version} failed:`, error)
        throw error
      }
    }
  }
}

// Migration rollback (for development)
export const rollbackMigration = async (targetVersion: number): Promise<void> => {
  // Implementation for rolling back migrations
  // Used primarily in development for schema iteration
}
```

### Schema Evolution

#### Migration 1: Core Schema
```sql
-- Projects table - central project management
CREATE TABLE projects (
  id TEXT PRIMARY KEY,
  name TEXT NOT NULL UNIQUE,
  description TEXT,
  settings TEXT, -- JSON serialized project settings
  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL
);

-- Conversations table - chat sessions
CREATE TABLE conversations (
  id TEXT PRIMARY KEY,
  project_id TEXT,                    -- Optional project association
  title TEXT NOT NULL,
  settings TEXT,                      -- JSON serialized AI settings
  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL,
  FOREIGN KEY (project_id) REFERENCES projects (id) ON DELETE SET NULL
);

-- Messages table - multi-part message content
CREATE TABLE messages (
  id TEXT PRIMARY KEY,
  conversation_id TEXT NOT NULL,
  role TEXT NOT NULL CHECK (role IN ('user', 'assistant')),
  content TEXT NOT NULL,              -- JSON array of content parts
  parent_id TEXT,                     -- For conversation threading
  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL,
  FOREIGN KEY (conversation_id) REFERENCES conversations (id) ON DELETE CASCADE,
  FOREIGN KEY (parent_id) REFERENCES messages (id) ON DELETE SET NULL
);

-- Project files table - RAG document storage
CREATE TABLE project_files (
  id TEXT PRIMARY KEY,
  project_id TEXT NOT NULL,
  filename TEXT NOT NULL,
  original_path TEXT,
  content_hash TEXT,                  -- SHA-256 hash for deduplication
  size INTEGER,
  mime_type TEXT,
  status TEXT DEFAULT 'pending',     -- pending, processing, ready, failed
  error_message TEXT,                 -- Error details for failed processing
  chunk_count INTEGER DEFAULT 0,
  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL,
  FOREIGN KEY (project_id) REFERENCES projects (id) ON DELETE CASCADE
);

-- Project memories table - AI context storage
CREATE TABLE project_memories (
  id TEXT PRIMARY KEY,
  project_id TEXT NOT NULL,
  title TEXT NOT NULL,
  content TEXT NOT NULL,
  type TEXT DEFAULT 'memory',        -- memory, note, insight
  importance INTEGER DEFAULT 5,     -- 1-10 importance ranking
  tags TEXT,                         -- JSON array of tags
  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL,
  FOREIGN KEY (project_id) REFERENCES projects (id) ON DELETE CASCADE
);

-- Settings table - application configuration
CREATE TABLE app_settings (
  key TEXT PRIMARY KEY,
  value TEXT NOT NULL,
  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL
);
```

#### Migration 2: Performance and Search
```sql
-- Performance indexes for common queries
CREATE INDEX IF NOT EXISTS idx_conversations_project ON conversations(project_id);
CREATE INDEX IF NOT EXISTS idx_conversations_updated ON conversations(updated_at DESC);
CREATE INDEX IF NOT EXISTS idx_messages_conversation ON messages(conversation_id);
CREATE INDEX IF NOT EXISTS idx_messages_created ON messages(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_project_files_project ON project_files(project_id);
CREATE INDEX IF NOT EXISTS idx_project_files_status ON project_files(status);
CREATE INDEX IF NOT EXISTS idx_project_memories_project ON project_memories(project_id);
CREATE INDEX IF NOT EXISTS idx_project_memories_importance ON project_memories(importance DESC);

-- Full-text search virtual table for messages
CREATE VIRTUAL TABLE message_fts USING fts5(
  id UNINDEXED,                      -- Don't index ID for search
  content,                           -- Searchable content
  content='messages',                -- Source table
  content_rowid='rowid'              -- Link to source table
);

-- Populate FTS table with existing data
INSERT INTO message_fts(rowid, id, content) 
SELECT rowid, id, content FROM messages;

-- FTS trigger for automatic indexing
CREATE TRIGGER message_fts_insert AFTER INSERT ON messages BEGIN
  INSERT INTO message_fts(rowid, id, content) 
  VALUES (new.rowid, new.id, new.content);
END;

CREATE TRIGGER message_fts_update AFTER UPDATE ON messages BEGIN
  UPDATE message_fts 
  SET content = new.content 
  WHERE rowid = new.rowid;
END;

CREATE TRIGGER message_fts_delete AFTER DELETE ON messages BEGIN
  DELETE FROM message_fts WHERE rowid = old.rowid;
END;
```

#### Migration 3: Vector Storage and Fixes
```sql
-- File chunks table for vector embeddings
CREATE TABLE file_chunks (
  id TEXT PRIMARY KEY,
  file_id TEXT NOT NULL,
  content TEXT NOT NULL,
  embedding BLOB,                    -- Vector embedding as binary data
  chunk_index INTEGER,               -- Position within file
  token_count INTEGER,               -- Approximate token count
  created_at TEXT NOT NULL,
  FOREIGN KEY (file_id) REFERENCES project_files (id) ON DELETE CASCADE
);

-- Indexes for vector operations
CREATE INDEX IF NOT EXISTS idx_file_chunks_file ON file_chunks(file_id);
CREATE INDEX IF NOT EXISTS idx_file_chunks_index ON file_chunks(file_id, chunk_index);

-- Fix FTS5 triggers (corrected from migration 2)
DROP TRIGGER IF EXISTS message_fts_insert;
DROP TRIGGER IF EXISTS message_fts_update;
DROP TRIGGER IF EXISTS message_fts_delete;

CREATE TRIGGER message_fts_insert AFTER INSERT ON messages BEGIN
  INSERT INTO message_fts(rowid, id, content) 
  VALUES (new.rowid, new.id, new.content);
END;

CREATE TRIGGER message_fts_update AFTER UPDATE OF content ON messages BEGIN
  UPDATE message_fts 
  SET content = new.content 
  WHERE rowid = new.rowid;
END;

CREATE TRIGGER message_fts_delete AFTER DELETE ON messages BEGIN
  DELETE FROM message_fts WHERE rowid = old.rowid;
END;
```

## Type-Safe Query Interface

### Query Functions (`src/main/database/queries.ts`)

**File:** `src/main/database/queries.ts`

The query interface provides type-safe functions for all database operations:

#### Project Queries
```typescript
// Project CRUD operations
export const createProject = async (data: ProjectCreate): Promise<Project> => {
  const db = await getDB()
  const id = generateId()
  const now = new Date().toISOString()
  
  await db.execute(`
    INSERT INTO projects (id, name, description, settings, created_at, updated_at)
    VALUES (?, ?, ?, ?, ?, ?)
  `, [
    id,
    data.name,
    data.description || '',
    JSON.stringify(data.settings || {}),
    now,
    now
  ])
  
  return getProject(id) as Promise<Project>
}

export const getProject = async (id: string): Promise<Project | null> => {
  const db = await getDB()
  const result = await db.execute(`
    SELECT * FROM projects WHERE id = ?
  `, [id])
  
  if (result.rows.length === 0) return null
  
  const row = result.rows[0]
  return {
    id: row.id as string,
    name: row.name as string,
    description: row.description as string,
    settings: JSON.parse(row.settings as string || '{}'),
    created_at: row.created_at as string,
    updated_at: row.updated_at as string
  }
}

export const listProjects = async (): Promise<Project[]> => {
  const db = await getDB()
  const result = await db.execute(`
    SELECT p.*, 
           COUNT(DISTINCT c.id) as conversation_count,
           COUNT(DISTINCT m.id) as message_count,
           COUNT(DISTINCT pf.id) as file_count,
           COALESCE(SUM(pf.size), 0) as total_file_size
    FROM projects p
    LEFT JOIN conversations c ON c.project_id = p.id
    LEFT JOIN messages m ON m.conversation_id = c.id
    LEFT JOIN project_files pf ON pf.project_id = p.id
    GROUP BY p.id
    ORDER BY p.updated_at DESC
  `)
  
  return result.rows.map(row => ({
    id: row.id as string,
    name: row.name as string,
    description: row.description as string,
    settings: JSON.parse(row.settings as string || '{}'),
    created_at: row.created_at as string,
    updated_at: row.updated_at as string,
    stats: {
      conversationCount: Number(row.conversation_count),
      messageCount: Number(row.message_count),
      fileCount: Number(row.file_count),
      totalFileSize: Number(row.total_file_size)
    }
  }))
}

export const updateProject = async (id: string, data: Partial<ProjectUpdate>): Promise<Project> => {
  const db = await getDB()
  const now = new Date().toISOString()
  
  const updates: string[] = []
  const values: any[] = []
  
  if (data.name !== undefined) {
    updates.push('name = ?')
    values.push(data.name)
  }
  
  if (data.description !== undefined) {
    updates.push('description = ?')
    values.push(data.description)
  }
  
  if (data.settings !== undefined) {
    updates.push('settings = ?')
    values.push(JSON.stringify(data.settings))
  }
  
  updates.push('updated_at = ?')
  values.push(now)
  values.push(id)
  
  await db.execute(`
    UPDATE projects 
    SET ${updates.join(', ')}
    WHERE id = ?
  `, values)
  
  return getProject(id) as Promise<Project>
}

export const deleteProject = async (id: string): Promise<void> => {
  const db = await getDB()
  
  // Cascading deletes handled by foreign key constraints
  await db.execute('DELETE FROM projects WHERE id = ?', [id])
}
```

#### Conversation Queries
```typescript
export const createConversation = async (data: ConversationCreate): Promise<Conversation> => {
  const db = await getDB()
  const id = generateId()
  const now = new Date().toISOString()
  
  await db.execute(`
    INSERT INTO conversations (id, project_id, title, settings, created_at, updated_at)
    VALUES (?, ?, ?, ?, ?, ?)
  `, [
    id,
    data.project_id || null,
    data.title,
    JSON.stringify(data.settings || {}),
    now,
    now
  ])
  
  return getConversation(id) as Promise<Conversation>
}

export const getConversationWithMessages = async (id: string): Promise<ConversationWithMessages | null> => {
  const conversation = await getConversation(id)
  if (!conversation) return null
  
  const messages = await getMessages(id)
  
  return {
    ...conversation,
    messages
  }
}

export const listConversations = async (projectId?: string): Promise<Conversation[]> => {
  const db = await getDB()
  
  let sql = `
    SELECT c.*, COUNT(m.id) as message_count
    FROM conversations c
    LEFT JOIN messages m ON m.conversation_id = c.id
  `
  const params: any[] = []
  
  if (projectId) {
    sql += ' WHERE c.project_id = ?'
    params.push(projectId)
  }
  
  sql += `
    GROUP BY c.id
    ORDER BY c.updated_at DESC
  `
  
  const result = await db.execute(sql, params)
  
  return result.rows.map(row => ({
    id: row.id as string,
    project_id: row.project_id as string | null,
    title: row.title as string,
    settings: JSON.parse(row.settings as string || '{}'),
    created_at: row.created_at as string,
    updated_at: row.updated_at as string,
    message_count: Number(row.message_count)
  }))
}
```

#### Message Queries
```typescript
export const addMessage = async (data: MessageCreate): Promise<Message> => {
  const db = await getDB()
  const id = generateId()
  const now = new Date().toISOString()
  
  await db.execute(`
    INSERT INTO messages (id, conversation_id, role, content, parent_id, created_at, updated_at)
    VALUES (?, ?, ?, ?, ?, ?, ?)
  `, [
    id,
    data.conversation_id,
    data.role,
    JSON.stringify(data.content),
    data.parent_id || null,
    now,
    now
  ])
  
  // Update conversation timestamp
  await db.execute(`
    UPDATE conversations 
    SET updated_at = ? 
    WHERE id = ?
  `, [now, data.conversation_id])
  
  return getMessage(id) as Promise<Message>
}

export const getMessages = async (conversationId: string): Promise<Message[]> => {
  const db = await getDB()
  const result = await db.execute(`
    SELECT * FROM messages 
    WHERE conversation_id = ? 
    ORDER BY created_at ASC
  `, [conversationId])
  
  return result.rows.map(row => ({
    id: row.id as string,
    conversation_id: row.conversation_id as string,
    role: row.role as 'user' | 'assistant',
    content: JSON.parse(row.content as string),
    parent_id: row.parent_id as string | null,
    created_at: row.created_at as string,
    updated_at: row.updated_at as string
  }))
}

export const updateMessage = async (id: string, data: Partial<MessageUpdate>): Promise<Message> => {
  const db = await getDB()
  const now = new Date().toISOString()
  
  const updates: string[] = []
  const values: any[] = []
  
  if (data.content !== undefined) {
    updates.push('content = ?')
    values.push(JSON.stringify(data.content))
  }
  
  updates.push('updated_at = ?')
  values.push(now)
  values.push(id)
  
  await db.execute(`
    UPDATE messages 
    SET ${updates.join(', ')}
    WHERE id = ?
  `, values)
  
  return getMessage(id) as Promise<Message>
}

export const deleteMessage = async (id: string): Promise<void> => {
  const db = await getDB()
  
  // Handle cascading deletes for child messages
  await db.execute(`
    UPDATE messages 
    SET parent_id = (
      SELECT parent_id FROM messages WHERE id = ?
    )
    WHERE parent_id = ?
  `, [id, id])
  
  await db.execute('DELETE FROM messages WHERE id = ?', [id])
}
```

## Full-Text Search System

### FTS5 Implementation
The database includes a sophisticated full-text search system using SQLite's FTS5 extension:

```typescript
// Full-text search across messages
export const searchMessages = async (
  query: string, 
  options: SearchOptions = {}
): Promise<SearchResult[]> => {
  const db = await getDB()
  
  const {
    projectId,
    conversationId,
    limit = 50,
    offset = 0
  } = options
  
  let sql = `
    SELECT 
      m.id,
      m.conversation_id,
      m.role,
      m.content,
      m.created_at,
      c.title as conversation_title,
      c.project_id,
      p.name as project_name,
      snippet(message_fts, 1, '<mark>', '</mark>', '...', 32) as snippet,
      rank as score
    FROM message_fts 
    JOIN messages m ON message_fts.rowid = m.rowid
    JOIN conversations c ON m.conversation_id = c.id
    LEFT JOIN projects p ON c.project_id = p.id
    WHERE message_fts MATCH ?
  `
  
  const params: any[] = [query]
  
  if (projectId) {
    sql += ' AND c.project_id = ?'
    params.push(projectId)
  }
  
  if (conversationId) {
    sql += ' AND m.conversation_id = ?'
    params.push(conversationId)
  }
  
  sql += `
    ORDER BY rank
    LIMIT ? OFFSET ?
  `
  params.push(limit, offset)
  
  const result = await db.execute(sql, params)
  
  return result.rows.map(row => ({
    id: row.id as string,
    conversation_id: row.conversation_id as string,
    role: row.role as 'user' | 'assistant',
    content: JSON.parse(row.content as string),
    created_at: row.created_at as string,
    conversation_title: row.conversation_title as string,
    project_id: row.project_id as string | null,
    project_name: row.project_name as string | null,
    snippet: row.snippet as string,
    score: Number(row.score)
  }))
}

// Advanced search with filters
export const advancedSearch = async (params: AdvancedSearchParams): Promise<SearchResult[]> => {
  const {
    query,
    role,
    dateFrom,
    dateTo,
    projectIds,
    sortBy = 'relevance',
    limit = 50,
    offset = 0
  } = params
  
  // Build dynamic query based on filters
  // Implementation handles complex filtering and sorting
}
```

## Vector Storage System

### Embedding Storage
The database includes infrastructure for vector embeddings to support RAG functionality:

```typescript
// File chunk storage for RAG
export const createFileChunk = async (data: FileChunkCreate): Promise<FileChunk> => {
  const db = await getDB()
  const id = generateId()
  const now = new Date().toISOString()
  
  await db.execute(`
    INSERT INTO file_chunks (
      id, file_id, content, embedding, chunk_index, token_count, created_at
    ) VALUES (?, ?, ?, ?, ?, ?, ?)
  `, [
    id,
    data.file_id,
    data.content,
    data.embedding ? Buffer.from(data.embedding) : null,
    data.chunk_index,
    data.token_count,
    now
  ])
  
  return getFileChunk(id) as Promise<FileChunk>
}

// Vector similarity search (placeholder for future implementation)
export const vectorSearch = async (
  embedding: Float32Array, 
  options: VectorSearchOptions = {}
): Promise<VectorSearchResult[]> => {
  // Future implementation will use vector similarity
  // Currently returns empty array - needs vector extension
  
  const {
    limit = 10,
    threshold = 0.7,
    projectId
  } = options
  
  // Placeholder implementation
  return []
}

// Batch insert for efficient chunk processing
export const batchCreateFileChunks = async (chunks: FileChunkCreate[]): Promise<FileChunk[]> => {
  const db = await getDB()
  
  // Use transaction for batch insert
  await db.execute('BEGIN TRANSACTION')
  
  try {
    const results: FileChunk[] = []
    
    for (const chunkData of chunks) {
      const chunk = await createFileChunk(chunkData)
      results.push(chunk)
    }
    
    await db.execute('COMMIT')
    return results
    
  } catch (error) {
    await db.execute('ROLLBACK')
    throw error
  }
}
```

## Performance Optimization

### Indexing Strategy
The database uses strategic indexing for optimal query performance:

```sql
-- Core entity indexes
CREATE INDEX idx_conversations_project ON conversations(project_id);
CREATE INDEX idx_conversations_updated ON conversations(updated_at DESC);
CREATE INDEX idx_messages_conversation ON messages(conversation_id);
CREATE INDEX idx_messages_created ON messages(created_at DESC);

-- File processing indexes
CREATE INDEX idx_project_files_project ON project_files(project_id);
CREATE INDEX idx_project_files_status ON project_files(status);

-- Vector search indexes
CREATE INDEX idx_file_chunks_file ON file_chunks(file_id);
CREATE INDEX idx_file_chunks_index ON file_chunks(file_id, chunk_index);

-- Memory and importance indexes
CREATE INDEX idx_project_memories_project ON project_memories(project_id);
CREATE INDEX idx_project_memories_importance ON project_memories(importance DESC);
```

### Query Optimization
Common query patterns are optimized for performance:

```typescript
// Optimized conversation list with message counts
export const getConversationSummaries = async (projectId?: string): Promise<ConversationSummary[]> => {
  const db = await getDB()
  
  // Single query with joins for efficiency
  const sql = `
    SELECT 
      c.id,
      c.title,
      c.updated_at,
      COUNT(m.id) as message_count,
      MAX(m.created_at) as last_message_at,
      SUBSTR(
        json_extract(
          (SELECT content FROM messages 
           WHERE conversation_id = c.id 
           ORDER BY created_at DESC 
           LIMIT 1), 
          '$[0].text'
        ), 1, 100
      ) as last_message_preview
    FROM conversations c
    LEFT JOIN messages m ON m.conversation_id = c.id
    ${projectId ? 'WHERE c.project_id = ?' : ''}
    GROUP BY c.id
    ORDER BY c.updated_at DESC
  `
  
  const params = projectId ? [projectId] : []
  const result = await db.execute(sql, params)
  
  return result.rows.map(row => ({
    id: row.id as string,
    title: row.title as string,
    updated_at: row.updated_at as string,
    message_count: Number(row.message_count),
    last_message_at: row.last_message_at as string,
    last_message_preview: row.last_message_preview as string
  }))
}
```

## Settings Management

### Configuration Storage
Application settings are stored in a flexible key-value system:

```typescript
// Settings operations
export const getSetting = async (key: string): Promise<string | null> => {
  const db = await getDB()
  const result = await db.execute(`
    SELECT value FROM app_settings WHERE key = ?
  `, [key])
  
  return result.rows.length > 0 ? result.rows[0].value as string : null
}

export const setSetting = async (key: string, value: string): Promise<void> => {
  const db = await getDB()
  const now = new Date().toISOString()
  
  await db.execute(`
    INSERT INTO app_settings (key, value, created_at, updated_at)
    VALUES (?, ?, ?, ?)
    ON CONFLICT(key) DO UPDATE SET
      value = excluded.value,
      updated_at = excluded.updated_at
  `, [key, value, now, now])
}

export const getAllSettings = async (): Promise<Record<string, string>> => {
  const db = await getDB()
  const result = await db.execute(`
    SELECT key, value FROM app_settings
  `)
  
  const settings: Record<string, string> = {}
  result.rows.forEach(row => {
    settings[row.key as string] = row.value as string
  })
  
  return settings
}

export const deleteSetting = async (key: string): Promise<void> => {
  const db = await getDB()
  await db.execute('DELETE FROM app_settings WHERE key = ?', [key])
}
```

## Error Handling and Recovery

### Database Error Handling
```typescript
// Comprehensive error handling for database operations
export const withDatabaseErrorHandling = async <T>(
  operation: () => Promise<T>,
  context: string
): Promise<T> => {
  try {
    return await operation()
  } catch (error) {
    console.error(`Database error in ${context}:`, error)
    
    if (error.message.includes('UNIQUE constraint')) {
      throw new DatabaseError('A record with this information already exists')
    } else if (error.message.includes('FOREIGN KEY constraint')) {
      throw new DatabaseError('Referenced record does not exist')
    } else if (error.message.includes('database is locked')) {
      throw new DatabaseError('Database is temporarily unavailable. Please try again.')
    } else {
      throw new DatabaseError(`Database operation failed: ${error.message}`)
    }
  }
}

// Database backup and recovery
export const createBackup = async (): Promise<string> => {
  const db = await getDB()
  const backupPath = `${getDatabasePath()}.backup.${Date.now()}`
  
  // Implementation for database backup
  // Could use SQLite backup API or file copy
  
  return backupPath
}

export const restoreFromBackup = async (backupPath: string): Promise<void> => {
  // Implementation for database restoration
  // Validate backup before restoration
}
```

## Future Enhancements

### Planned Features
1. **Vector Extensions**: Integration with SQLite vector extensions for true vector similarity search
2. **Connection Pooling**: Multiple database connections for improved concurrency
3. **Read Replicas**: Read-only replicas for improved query performance
4. **Data Archiving**: Automatic archiving of old conversations and messages
5. **Encryption**: Database encryption for sensitive data protection

### Performance Improvements
1. **Query Caching**: In-memory caching of frequently accessed queries
2. **Lazy Loading**: Pagination and lazy loading for large datasets
3. **Background Optimization**: Periodic VACUUM and ANALYZE operations
4. **Write Batching**: Batch multiple write operations for better performance

### Monitoring and Analytics
1. **Query Performance Monitoring**: Track slow queries and optimization opportunities
2. **Storage Analytics**: Database size monitoring and growth tracking
3. **Usage Patterns**: Analysis of data access patterns for optimization
4. **Health Checks**: Comprehensive database health monitoring

The database system provides a robust, performant foundation for Knowlex with comprehensive schema management, full-text search capabilities, and preparation for advanced features like vector search. The type-safe query interface ensures reliable data operations while the migration system enables safe schema evolution.