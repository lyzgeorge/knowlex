import Database from 'better-sqlite3'
import * as path from 'path'
import * as fs from 'fs'
import { app } from 'electron'

export interface DatabaseConfig {
  dbPath: string
  enableWAL: boolean
  enableForeignKeys: boolean
  busyTimeout: number
}

export interface MigrationInfo {
  version: number
  name: string
  sql: string
  rollback?: string
}

export class SQLiteManager {
  private db: Database.Database | null = null
  private config: DatabaseConfig
  private isInitialized = false
  private writeLock = false

  constructor(config?: Partial<DatabaseConfig>) {
    const userDataPath = app.getPath('userData')
    const defaultDbPath = path.join(userDataPath, 'knowlex.db')

    this.config = {
      dbPath: defaultDbPath,
      enableWAL: true,
      enableForeignKeys: true,
      busyTimeout: 30000,
      ...config,
    }
  }

  async initialize(): Promise<void> {
    if (this.isInitialized) {
      return
    }

    try {
      // Ensure database directory exists
      const dbDir = path.dirname(this.config.dbPath)
      if (!fs.existsSync(dbDir)) {
        fs.mkdirSync(dbDir, { recursive: true })
      }

      // Open database connection
      this.db = new Database(this.config.dbPath)

      // Configure database settings
      await this.configureDatabase()

      // Run migrations
      await this.runMigrations()

      // Verify database integrity
      await this.checkIntegrity()

      this.isInitialized = true
      console.log('SQLite database initialized successfully')
    } catch (error) {
      console.error('Failed to initialize SQLite database:', error)
      throw error
    }
  }

  private async configureDatabase(): Promise<void> {
    if (!this.db) throw new Error('Database not initialized')

    // Enable WAL mode for better concurrency
    if (this.config.enableWAL) {
      this.db.pragma('journal_mode = WAL')
    }

    // Enable foreign key constraints
    if (this.config.enableForeignKeys) {
      this.db.pragma('foreign_keys = ON')
    }

    // Set busy timeout
    this.db.pragma(`busy_timeout = ${this.config.busyTimeout}`)

    // Optimize performance settings
    this.db.pragma('synchronous = NORMAL')
    this.db.pragma('cache_size = -64000') // 64MB cache
    this.db.pragma('temp_store = MEMORY')
    this.db.pragma('mmap_size = 268435456') // 256MB mmap

    console.log('Database configuration applied')
  }

  private async runMigrations(): Promise<void> {
    if (!this.db) throw new Error('Database not initialized')

    // Create migrations table if it doesn't exist
    this.db.exec(`
      CREATE TABLE IF NOT EXISTS migrations (
        version INTEGER PRIMARY KEY,
        name TEXT NOT NULL,
        applied_at DATETIME DEFAULT CURRENT_TIMESTAMP
      )
    `)

    const migrations = this.getMigrations()
    const appliedMigrations = this.db
      .prepare('SELECT version FROM migrations ORDER BY version')
      .all() as { version: number }[]

    const appliedVersions = new Set(appliedMigrations.map(m => m.version))

    for (const migration of migrations) {
      if (!appliedVersions.has(migration.version)) {
        console.log(`Applying migration ${migration.version}: ${migration.name}`)

        const transaction = this.db.transaction(() => {
          this.db!.exec(migration.sql)
          this.db!.prepare('INSERT INTO migrations (version, name) VALUES (?, ?)').run(
            migration.version,
            migration.name
          )
        })

        try {
          transaction()
          console.log(`Migration ${migration.version} applied successfully`)
        } catch (error) {
          console.error(`Failed to apply migration ${migration.version}:`, error)
          throw error
        }
      }
    }
  }

  private getMigrations(): MigrationInfo[] {
    return [
      {
        version: 1,
        name: 'initial_schema',
        sql: `
          -- Projects table
          CREATE TABLE projects (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            name TEXT NOT NULL UNIQUE,
            created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
            updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
          );

          -- Conversations table
          CREATE TABLE conversations (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            title TEXT NOT NULL DEFAULT 'Untitled Chat',
            project_id INTEGER,
            created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
            updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
            FOREIGN KEY (project_id) REFERENCES projects(id) ON DELETE SET NULL
          );

          -- Messages table
          CREATE TABLE messages (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            conversation_id INTEGER NOT NULL,
            role TEXT NOT NULL CHECK (role IN ('user', 'assistant', 'system', 'tool')),
            content TEXT NOT NULL,
            file_references TEXT,
            tool_calls TEXT,
            metadata TEXT,
            created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
            FOREIGN KEY (conversation_id) REFERENCES conversations(id) ON DELETE CASCADE
          );

          -- Files table
          CREATE TABLE files (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            project_id INTEGER NOT NULL,
            filename TEXT NOT NULL,
            original_path TEXT NOT NULL,
            pdf_path TEXT NOT NULL,
            file_size INTEGER NOT NULL,
            md5_original TEXT NOT NULL,
            md5_pdf TEXT NOT NULL,
            status TEXT NOT NULL DEFAULT 'processing' CHECK (status IN ('processing', 'completed', 'failed')),
            created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
            FOREIGN KEY (project_id) REFERENCES projects(id) ON DELETE CASCADE
          );

          -- Project memories table
          CREATE TABLE project_memories (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            project_id INTEGER NOT NULL,
            content TEXT NOT NULL,
            type TEXT NOT NULL DEFAULT 'memory' CHECK (type IN ('memory', 'description')),
            is_system BOOLEAN DEFAULT FALSE,
            created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
            FOREIGN KEY (project_id) REFERENCES projects(id) ON DELETE CASCADE
          );

          -- Project knowledge table
          CREATE TABLE project_knowledge (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            project_id INTEGER NOT NULL,
            title TEXT NOT NULL,
            content TEXT NOT NULL,
            created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
            updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
            FOREIGN KEY (project_id) REFERENCES projects(id) ON DELETE CASCADE
          );

          -- App settings table
          CREATE TABLE app_settings (
            key TEXT PRIMARY KEY,
            value TEXT NOT NULL,
            updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
          );

          -- Rerank settings table
          CREATE TABLE rerank_settings (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            model_name TEXT NOT NULL,
            api_key TEXT,
            base_url TEXT,
            enabled BOOLEAN DEFAULT FALSE,
            created_at DATETIME DEFAULT CURRENT_TIMESTAMP
          );
        `,
      },
      {
        version: 2,
        name: 'create_indexes',
        sql: `
          -- Create indexes for better performance
          CREATE INDEX idx_conversations_project_id ON conversations(project_id);
          CREATE INDEX idx_conversations_updated_at ON conversations(updated_at DESC);
          CREATE INDEX idx_messages_conversation_id ON messages(conversation_id);
          CREATE INDEX idx_messages_created_at ON messages(created_at DESC);
          CREATE INDEX idx_files_project_id ON files(project_id);
          CREATE INDEX idx_files_md5_original ON files(md5_original);
          CREATE INDEX idx_project_memories_project_id ON project_memories(project_id);
          CREATE INDEX idx_project_knowledge_project_id ON project_knowledge(project_id);
          CREATE INDEX idx_project_knowledge_updated_at ON project_knowledge(updated_at DESC);
        `,
      },
      {
        version: 3,
        name: 'create_fts_tables',
        sql: `
          -- Create FTS5 virtual table for full-text search
          CREATE VIRTUAL TABLE messages_fts USING fts5(
            content,
            content='messages',
            content_rowid='id',
            tokenize='unicode61 remove_diacritics 2'
          );

          -- Populate FTS table with existing data
          INSERT INTO messages_fts(rowid, content) 
          SELECT id, content FROM messages;

          -- Create triggers to keep FTS table in sync
          CREATE TRIGGER messages_ai AFTER INSERT ON messages BEGIN
            INSERT INTO messages_fts(rowid, content) VALUES (new.id, new.content);
          END;

          CREATE TRIGGER messages_ad AFTER DELETE ON messages BEGIN
            INSERT INTO messages_fts(messages_fts, rowid, content) VALUES('delete', old.id, old.content);
          END;

          CREATE TRIGGER messages_au AFTER UPDATE ON messages BEGIN
            INSERT INTO messages_fts(messages_fts, rowid, content) VALUES('delete', old.id, old.content);
            INSERT INTO messages_fts(rowid, content) VALUES (new.id, new.content);
          END;
        `,
      },
    ]
  }

  async checkIntegrity(): Promise<boolean> {
    if (!this.db) throw new Error('Database not initialized')

    try {
      const result = this.db.prepare('PRAGMA integrity_check').get() as { integrity_check: string }

      if (result.integrity_check === 'ok') {
        console.log('Database integrity check passed')
        return true
      } else {
        console.error('Database integrity check failed:', result.integrity_check)
        return false
      }
    } catch (error) {
      console.error('Database integrity check error:', error)
      return false
    }
  }

  async repairDatabase(): Promise<boolean> {
    if (!this.db) throw new Error('Database not initialized')

    try {
      console.log('Attempting database repair...')

      // Try to repair using VACUUM
      this.db.exec('VACUUM')

      // Recheck integrity
      const isIntact = await this.checkIntegrity()

      if (isIntact) {
        console.log('Database repair successful')
        return true
      } else {
        console.error('Database repair failed')
        return false
      }
    } catch (error) {
      console.error('Database repair error:', error)
      return false
    }
  }

  async acquireWriteLock(): Promise<void> {
    while (this.writeLock) {
      await new Promise(resolve => setTimeout(resolve, 10))
    }
    this.writeLock = true
  }

  releaseWriteLock(): void {
    this.writeLock = false
  }

  async executeInTransaction<T>(callback: () => T): Promise<T> {
    if (!this.db) throw new Error('Database not initialized')

    await this.acquireWriteLock()

    try {
      const transaction = this.db.transaction(callback)
      return transaction()
    } finally {
      this.releaseWriteLock()
    }
  }

  prepare(sql: string): Database.Statement {
    if (!this.db) throw new Error('Database not initialized')
    return this.db.prepare(sql)
  }

  exec(sql: string): Database.RunResult {
    if (!this.db) throw new Error('Database not initialized')
    return this.db.exec(sql)
  }

  async query<T = any>(sql: string, params?: any[]): Promise<T[]> {
    if (!this.db) throw new Error('Database not initialized')

    const stmt = this.db.prepare(sql)
    return params ? (stmt.all(...params) as T[]) : (stmt.all() as T[])
  }

  async queryOne<T = any>(sql: string, params?: any[]): Promise<T | null> {
    if (!this.db) throw new Error('Database not initialized')

    const stmt = this.db.prepare(sql)
    const result = params ? (stmt.get(...params) as T) : (stmt.get() as T)
    return result || null
  }

  async run(sql: string, params?: any[]): Promise<Database.RunResult> {
    if (!this.db) throw new Error('Database not initialized')

    await this.acquireWriteLock()

    try {
      const stmt = this.db.prepare(sql)
      return params ? stmt.run(...params) : stmt.run()
    } finally {
      this.releaseWriteLock()
    }
  }

  async close(): Promise<void> {
    if (this.db) {
      this.db.close()
      this.db = null
      this.isInitialized = false
      console.log('Database connection closed')
    }
  }

  getDatabase(): Database.Database {
    if (!this.db) throw new Error('Database not initialized')
    return this.db
  }

  isReady(): boolean {
    return this.isInitialized && this.db !== null
  }
}
