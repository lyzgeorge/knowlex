import { executeQuery, executeTransaction } from './index'

/**
 * Database migration system for Knowlex
 * Handles schema versioning, table creation, and data migration
 */

export interface Migration {
  version: number
  name: string
  up: string[]
  down?: string[]
}

/**
 * Database schema version history
 * Each migration includes SQL statements to upgrade and optionally downgrade
 */
const migrations: Migration[] = [
  {
    version: 1,
    name: 'initial_schema',
    up: [
      // Create schema version tracking table
      `CREATE TABLE IF NOT EXISTS schema_version (
        version INTEGER PRIMARY KEY,
        applied_at TEXT NOT NULL DEFAULT (datetime('now'))
      )`,

      // Projects table
      `CREATE TABLE IF NOT EXISTS projects (
        id TEXT PRIMARY KEY,
        name TEXT NOT NULL,
        description TEXT NOT NULL DEFAULT '',
        created_at TEXT NOT NULL DEFAULT (datetime('now')),
        updated_at TEXT NOT NULL DEFAULT (datetime('now'))
      )`,

      // Project files table
      `CREATE TABLE IF NOT EXISTS project_files (
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
      )`,

      // Project memory table (system prompts)
      `CREATE TABLE IF NOT EXISTS project_memories (
        id TEXT PRIMARY KEY,
        project_id TEXT NOT NULL,
        content TEXT NOT NULL,
        priority INTEGER NOT NULL DEFAULT 0,
        created_at TEXT NOT NULL DEFAULT (datetime('now')),
        updated_at TEXT NOT NULL DEFAULT (datetime('now')),
        FOREIGN KEY (project_id) REFERENCES projects (id) ON DELETE CASCADE
      )`,

      // Project notes table
      `CREATE TABLE IF NOT EXISTS project_notes (
        id TEXT PRIMARY KEY,
        project_id TEXT NOT NULL,
        title TEXT NOT NULL,
        content TEXT NOT NULL,
        tags TEXT NOT NULL DEFAULT '[]',
        created_at TEXT NOT NULL DEFAULT (datetime('now')),
        updated_at TEXT NOT NULL DEFAULT (datetime('now')),
        FOREIGN KEY (project_id) REFERENCES projects (id) ON DELETE CASCADE
      )`,

      // Conversations table
      `CREATE TABLE IF NOT EXISTS conversations (
        id TEXT PRIMARY KEY,
        project_id TEXT,
        title TEXT NOT NULL,
        created_at TEXT NOT NULL DEFAULT (datetime('now')),
        updated_at TEXT NOT NULL DEFAULT (datetime('now')),
        settings TEXT, -- JSON string for SessionSettings
        FOREIGN KEY (project_id) REFERENCES projects (id) ON DELETE SET NULL
      )`,

      // Messages table
      `CREATE TABLE IF NOT EXISTS messages (
        id TEXT PRIMARY KEY,
        conversation_id TEXT NOT NULL,
        role TEXT NOT NULL CHECK (role IN ('user', 'assistant')),
        content TEXT NOT NULL, -- JSON string for MessageContent
        created_at TEXT NOT NULL DEFAULT (datetime('now')),
        updated_at TEXT NOT NULL DEFAULT (datetime('now')),
        parent_message_id TEXT,
        FOREIGN KEY (conversation_id) REFERENCES conversations (id) ON DELETE CASCADE,
        FOREIGN KEY (parent_message_id) REFERENCES messages (id) ON DELETE SET NULL
      )`,

      // File chunks table for RAG (vector storage)
      `CREATE TABLE IF NOT EXISTS file_chunks (
        id TEXT PRIMARY KEY,
        file_id TEXT NOT NULL,
        content TEXT NOT NULL,
        chunk_index INTEGER NOT NULL,
        embedding BLOB, -- Vector embedding (will be enhanced with libsql vector functions)
        metadata TEXT, -- JSON string for additional metadata
        created_at TEXT NOT NULL DEFAULT (datetime('now')),
        FOREIGN KEY (file_id) REFERENCES project_files (id) ON DELETE CASCADE
      )`,

      // Application settings table
      `CREATE TABLE IF NOT EXISTS app_settings (
        key TEXT PRIMARY KEY,
        value TEXT NOT NULL,
        updated_at TEXT NOT NULL DEFAULT (datetime('now'))
      )`
    ],
    down: [
      'DROP TABLE IF EXISTS app_settings',
      'DROP TABLE IF EXISTS file_chunks',
      'DROP TABLE IF EXISTS messages',
      'DROP TABLE IF EXISTS conversations',
      'DROP TABLE IF EXISTS project_notes',
      'DROP TABLE IF EXISTS project_memories',
      'DROP TABLE IF EXISTS project_files',
      'DROP TABLE IF EXISTS projects',
      'DROP TABLE IF EXISTS schema_version'
    ]
  },

  {
    version: 2,
    name: 'add_indexes_and_fts',
    up: [
      // Create indexes for better performance
      'CREATE INDEX IF NOT EXISTS idx_project_files_project_id ON project_files (project_id)',
      'CREATE INDEX IF NOT EXISTS idx_project_files_status ON project_files (status)',
      'CREATE INDEX IF NOT EXISTS idx_project_memories_project_id ON project_memories (project_id)',
      'CREATE INDEX IF NOT EXISTS idx_project_memories_priority ON project_memories (project_id, priority DESC)',
      'CREATE INDEX IF NOT EXISTS idx_project_notes_project_id ON project_notes (project_id)',
      'CREATE INDEX IF NOT EXISTS idx_conversations_project_id ON conversations (project_id)',
      'CREATE INDEX IF NOT EXISTS idx_conversations_updated_at ON conversations (updated_at DESC)',
      'CREATE INDEX IF NOT EXISTS idx_messages_conversation_id ON messages (conversation_id)',
      'CREATE INDEX IF NOT EXISTS idx_messages_created_at ON messages (conversation_id, created_at)',
      'CREATE INDEX IF NOT EXISTS idx_file_chunks_file_id ON file_chunks (file_id)',

      // Create FTS5 table for full-text search
      `CREATE VIRTUAL TABLE IF NOT EXISTS messages_fts USING fts5(
        message_id,
        content,
        conversation_title,
        project_name,
        content='messages',
        content_rowid='id'
      )`,

      // Create triggers to keep FTS table synchronized
      `CREATE TRIGGER IF NOT EXISTS messages_fts_insert AFTER INSERT ON messages BEGIN
        INSERT INTO messages_fts (message_id, content, conversation_title, project_name)
        SELECT 
          NEW.id,
          NEW.content,
          c.title,
          COALESCE(p.name, '')
        FROM conversations c
        LEFT JOIN projects p ON c.project_id = p.id
        WHERE c.id = NEW.conversation_id;
      END`,

      `CREATE TRIGGER IF NOT EXISTS messages_fts_update AFTER UPDATE ON messages BEGIN
        UPDATE messages_fts SET
          content = NEW.content,
          conversation_title = (
            SELECT title FROM conversations WHERE id = NEW.conversation_id
          ),
          project_name = COALESCE((
            SELECT p.name FROM conversations c
            LEFT JOIN projects p ON c.project_id = p.id
            WHERE c.id = NEW.conversation_id
          ), '')
        WHERE message_id = NEW.id;
      END`,

      `CREATE TRIGGER IF NOT EXISTS messages_fts_delete AFTER DELETE ON messages BEGIN
        DELETE FROM messages_fts WHERE message_id = OLD.id;
      END`
    ],
    down: [
      'DROP TRIGGER IF EXISTS messages_fts_delete',
      'DROP TRIGGER IF EXISTS messages_fts_update',
      'DROP TRIGGER IF EXISTS messages_fts_insert',
      'DROP TABLE IF EXISTS messages_fts',
      'DROP INDEX IF EXISTS idx_file_chunks_file_id',
      'DROP INDEX IF EXISTS idx_messages_created_at',
      'DROP INDEX IF EXISTS idx_messages_conversation_id',
      'DROP INDEX IF EXISTS idx_conversations_updated_at',
      'DROP INDEX IF EXISTS idx_conversations_project_id',
      'DROP INDEX IF EXISTS idx_project_notes_project_id',
      'DROP INDEX IF EXISTS idx_project_memories_priority',
      'DROP INDEX IF EXISTS idx_project_memories_project_id',
      'DROP INDEX IF EXISTS idx_project_files_status',
      'DROP INDEX IF EXISTS idx_project_files_project_id'
    ]
  }
]

/**
 * Gets the current schema version from database
 * Returns 0 if no version is found (fresh database)
 */
export async function getCurrentVersion(): Promise<number> {
  try {
    const result = await executeQuery('SELECT MAX(version) as version FROM schema_version')

    if (result.rows.length === 0 || !result.rows[0]) {
      return 0
    }

    const row = result.rows[0] as { version: number | null }
    return row.version || 0
  } catch (error) {
    // If schema_version table doesn't exist, this is a fresh database
    console.log('Schema version table not found, assuming fresh database')
    return 0
  }
}

/**
 * Applies a single migration
 * Executes all UP statements in a transaction
 */
async function applyMigration(migration: Migration): Promise<void> {
  console.log(`Applying migration ${migration.version}: ${migration.name}`)

  try {
    // Execute all migration statements in a transaction
    const queries = migration.up.map((sql) => ({ sql }))
    await executeTransaction(queries)

    // Record the migration as applied
    await executeQuery('INSERT INTO schema_version (version) VALUES (?)', [migration.version])

    console.log(`Migration ${migration.version} applied successfully`)
  } catch (error) {
    console.error(`Failed to apply migration ${migration.version}:`, error)
    throw new Error(
      `Migration ${migration.version} failed: ${error instanceof Error ? error.message : 'Unknown error'}`
    )
  }
}

/**
 * Runs all pending migrations
 * Upgrades database to the latest schema version
 */
export async function runMigrations(): Promise<void> {
  try {
    const currentVersion = await getCurrentVersion()
    const latestVersion = Math.max(...migrations.map((m) => m.version))

    console.log(`Current database version: ${currentVersion}`)
    console.log(`Latest available version: ${latestVersion}`)

    if (currentVersion === latestVersion) {
      console.log('Database is up to date')
      return
    }

    // Apply pending migrations in order
    const pendingMigrations = migrations
      .filter((m) => m.version > currentVersion)
      .sort((a, b) => a.version - b.version)

    if (pendingMigrations.length === 0) {
      console.log('No pending migrations found')
      return
    }

    console.log(`Applying ${pendingMigrations.length} pending migrations...`)

    for (const migration of pendingMigrations) {
      await applyMigration(migration)
    }

    console.log('All migrations applied successfully')
  } catch (error) {
    console.error('Migration failed:', error)
    throw new Error(
      `Database migration failed: ${error instanceof Error ? error.message : 'Unknown error'}`
    )
  }
}

/**
 * Rolls back to a specific version (optional feature)
 * Note: Only use in development/testing environments
 */
export async function rollbackToVersion(targetVersion: number): Promise<void> {
  const currentVersion = await getCurrentVersion()

  if (targetVersion >= currentVersion) {
    throw new Error('Target version must be lower than current version')
  }

  console.log(`Rolling back from version ${currentVersion} to ${targetVersion}`)

  // Get migrations to rollback (in reverse order)
  const migrationsToRollback = migrations
    .filter((m) => m.version > targetVersion && m.version <= currentVersion)
    .sort((a, b) => b.version - a.version) // Descending order

  for (const migration of migrationsToRollback) {
    if (!migration.down) {
      throw new Error(`Migration ${migration.version} has no rollback statements`)
    }

    console.log(`Rolling back migration ${migration.version}: ${migration.name}`)

    try {
      // Execute rollback statements
      const queries = migration.down.map((sql) => ({ sql }))
      await executeTransaction(queries)

      // Remove migration record
      await executeQuery('DELETE FROM schema_version WHERE version = ?', [migration.version])

      console.log(`Migration ${migration.version} rolled back successfully`)
    } catch (error) {
      console.error(`Failed to rollback migration ${migration.version}:`, error)
      throw new Error(
        `Rollback failed: ${error instanceof Error ? error.message : 'Unknown error'}`
      )
    }
  }

  console.log(`Rollback to version ${targetVersion} completed`)
}

/**
 * Gets migration history from database
 * Returns list of applied migrations with timestamps
 */
export async function getMigrationHistory(): Promise<
  Array<{ version: number; appliedAt: string }>
> {
  try {
    const result = await executeQuery(
      'SELECT version, applied_at FROM schema_version ORDER BY version'
    )

    return result.rows.map((row) => {
      const r = row as { version: number; applied_at: string }
      return {
        version: r.version,
        appliedAt: r.applied_at
      }
    })
  } catch (error) {
    console.error('Failed to get migration history:', error)
    return []
  }
}
