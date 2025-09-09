import { executeQuery, executeTransaction } from './index'

/**
 * Simplified single-file migration for Knowlex.
 *
 * Rationale: the app will be rebuilt and the DB file removed, so keep one
 * idempotent migration that creates the full, final schema. This is safer
 * for fresh installs and simpler to maintain during the rebuild.
 */

export interface Migration {
  version: number
  name: string
  up: string[]
}

// Consolidated migration: contains the final schema and indexes/triggers.
const migrations: Migration[] = [
  {
    version: 1,
    name: 'initial_full_schema',
    up: [
      // Schema version tracking
      `CREATE TABLE IF NOT EXISTS schema_version (
        version INTEGER PRIMARY KEY,
        applied_at TEXT NOT NULL DEFAULT (datetime('now'))
      )`,

      // Projects
      `CREATE TABLE IF NOT EXISTS projects (
        id TEXT PRIMARY KEY,
        name TEXT NOT NULL,
        description TEXT NOT NULL DEFAULT '',
        created_at TEXT NOT NULL DEFAULT (datetime('now')),
        updated_at TEXT NOT NULL DEFAULT (datetime('now'))
      )`,

      // Conversations and messages
      `CREATE TABLE IF NOT EXISTS conversations (
        id TEXT PRIMARY KEY,
        project_id TEXT,
        title TEXT NOT NULL,
        created_at TEXT NOT NULL DEFAULT (datetime('now')),
        updated_at TEXT NOT NULL DEFAULT (datetime('now')),
        settings TEXT,
        model_config_id TEXT NULL REFERENCES model_configs(id) ON DELETE SET NULL,
        FOREIGN KEY (project_id) REFERENCES projects (id) ON DELETE SET NULL
      )`,

      `CREATE TABLE IF NOT EXISTS messages (
        id TEXT PRIMARY KEY,
        conversation_id TEXT NOT NULL,
        role TEXT NOT NULL CHECK (role IN ('user', 'assistant')),
        content TEXT NOT NULL,
        reasoning TEXT,
        created_at TEXT NOT NULL DEFAULT (datetime('now')),
        updated_at TEXT NOT NULL DEFAULT (datetime('now')),
        parent_message_id TEXT,
        FOREIGN KEY (conversation_id) REFERENCES conversations (id) ON DELETE CASCADE,
        FOREIGN KEY (parent_message_id) REFERENCES messages (id) ON DELETE SET NULL
      )`,

      // Model configs
      `CREATE TABLE IF NOT EXISTS model_configs (
        id TEXT PRIMARY KEY,
        name TEXT NOT NULL,
        api_endpoint TEXT NOT NULL,
        api_key TEXT NULL,
        model_id TEXT NOT NULL,
        temperature REAL NULL,
        top_p REAL NULL,
        frequency_penalty REAL NULL,
        presence_penalty REAL NULL,
        supports_reasoning INTEGER NOT NULL DEFAULT 0,
        supports_vision INTEGER NOT NULL DEFAULT 0,
        supports_tool_use INTEGER NOT NULL DEFAULT 0,
        supports_web_search INTEGER NOT NULL DEFAULT 0,
        created_at TEXT NOT NULL DEFAULT (datetime('now')),
        updated_at TEXT NOT NULL DEFAULT (datetime('now'))
      )`,

      // App settings
      `CREATE TABLE IF NOT EXISTS app_settings (
        key TEXT PRIMARY KEY,
        value TEXT NOT NULL,
        updated_at TEXT NOT NULL DEFAULT (datetime('now'))
      )`,

      // Indexes
      // removed indexes for unimplemented features: project_files, memories, notes
      'CREATE INDEX IF NOT EXISTS idx_conversations_project_id ON conversations (project_id)',
      'CREATE INDEX IF NOT EXISTS idx_conversations_updated_at ON conversations (updated_at DESC)',
      'CREATE INDEX IF NOT EXISTS idx_messages_conversation_id ON messages (conversation_id)',
      'CREATE INDEX IF NOT EXISTS idx_messages_created_at ON messages (conversation_id, created_at)',
      // removed indexes for file_chunks and project_vectors
      'CREATE UNIQUE INDEX IF NOT EXISTS idx_model_configs_name_lower ON model_configs (LOWER(name))',
      'CREATE INDEX IF NOT EXISTS idx_model_configs_created_at ON model_configs(created_at)',
      'CREATE INDEX IF NOT EXISTS idx_model_configs_updated_at ON model_configs(updated_at)',
      'CREATE INDEX IF NOT EXISTS idx_messages_role ON messages(role)',
      'CREATE INDEX IF NOT EXISTS idx_messages_parent_id ON messages(parent_message_id)',
      'CREATE INDEX IF NOT EXISTS idx_messages_updated_at ON messages(updated_at DESC)',
      'CREATE INDEX IF NOT EXISTS idx_app_settings_key ON app_settings(key)',
      'CREATE INDEX IF NOT EXISTS idx_projects_name ON projects(name)',
      'CREATE INDEX IF NOT EXISTS idx_projects_updated_at ON projects(updated_at DESC)',

      // Full-text search removed (messages_fts and triggers not included)

      // Ensure foreign keys are enabled
      'PRAGMA foreign_keys=ON'
    ]
  },
  {
    version: 2,
    name: 'add_max_input_tokens_to_model_configs',
    up: [
      // Add max_input_tokens column to existing model_configs table
      `ALTER TABLE model_configs ADD COLUMN max_input_tokens INTEGER NULL DEFAULT 131072`
    ]
  }
]

/**
 * Returns the current applied schema version or 0 when not present.
 * Because we expect fresh DBs during the rebuild, this quietly handles
 * missing schema_version table.
 */
export async function getCurrentVersion(): Promise<number> {
  try {
    const result = await executeQuery('SELECT MAX(version) as version FROM schema_version')
    if (!result || !result.rows || result.rows.length === 0) return 0
    const row = result.rows[0] as { version: number | null }
    return row?.version || 0
  } catch (err) {
    // Missing table is treated as version 0
    return 0
  }
}

async function applyMigration(migration: Migration): Promise<void> {
  const queries = migration.up.map((sql) => ({ sql }))
  await executeTransaction(queries)
  // record the applied version; ignore duplicate insert errors
  try {
    await executeQuery('INSERT INTO schema_version (version) VALUES (?)', [migration.version])
  } catch (e) {
    // if schema_version already has this version (or table missing), ignore
  }
}

export async function runMigrations(): Promise<void> {
  const currentVersion = await getCurrentVersion()
  const latestVersion = Math.max(...migrations.map((m) => m.version))
  if (currentVersion >= latestVersion) return
  // Apply only the latest consolidated migration when DB is fresh.
  for (const m of migrations
    .filter((x) => x.version > currentVersion)
    .sort((a, b) => a.version - b.version)) {
    await applyMigration(m)
  }
}

// Rollback is intentionally not supported in this simplified migration file.
export async function rollbackToVersion(_targetVersion: number): Promise<void> {
  throw new Error('rollbackToVersion is not supported in simplified migrations')
}

export async function getMigrationHistory(): Promise<
  Array<{ version: number; appliedAt: string }>
> {
  try {
    const result = await executeQuery(
      'SELECT version, applied_at FROM schema_version ORDER BY version'
    )
    return (result.rows || []).map((r: any) => ({ version: r.version, appliedAt: r.applied_at }))
  } catch (e) {
    return []
  }
}
