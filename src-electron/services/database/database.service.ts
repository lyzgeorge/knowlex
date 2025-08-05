import { SQLiteManager } from './sqlite.manager'
import { VectorManager } from './vector.manager'
import * as path from 'path'
import { app } from 'electron'

export interface DatabaseServiceConfig {
  sqliteConfig?: {
    dbPath?: string
    enableWAL?: boolean
    enableForeignKeys?: boolean
    busyTimeout?: number
  }
  vectorConfig?: {
    dbPath?: string
    dimension?: number
    maxElements?: number
    efConstruction?: number
    m?: number
  }
}

export class DatabaseService {
  private sqliteManager: SQLiteManager
  private vectorManager: VectorManager
  private isInitialized = false

  constructor(config?: DatabaseServiceConfig) {
    const userDataPath = app.getPath('userData')

    this.sqliteManager = new SQLiteManager({
      dbPath: path.join(userDataPath, 'knowlex.db'),
      enableWAL: true,
      enableForeignKeys: true,
      busyTimeout: 30000,
      ...config?.sqliteConfig,
    })

    this.vectorManager = new VectorManager({
      dbPath: path.join(userDataPath, 'knowlex_vectors.db'),
      dimension: 768,
      maxElements: 1000000,
      efConstruction: 200,
      m: 16,
      ...config?.vectorConfig,
    })
  }

  async initialize(): Promise<void> {
    if (this.isInitialized) {
      return
    }

    try {
      console.log('Initializing database service...')

      // Initialize SQLite database
      await this.sqliteManager.initialize()

      // Initialize Vector database
      await this.vectorManager.initialize()

      // Run integrity checks
      await this.performIntegrityChecks()

      this.isInitialized = true
      console.log('Database service initialized successfully')
    } catch (error) {
      console.error('Failed to initialize database service:', error)
      throw error
    }
  }

  private async performIntegrityChecks(): Promise<void> {
    console.log('Performing database integrity checks...')

    // Check SQLite integrity
    const sqliteIntegrity = await this.sqliteManager.checkIntegrity()
    if (!sqliteIntegrity) {
      console.warn('SQLite integrity check failed, attempting repair...')
      const repaired = await this.sqliteManager.repairDatabase()
      if (!repaired) {
        throw new Error('SQLite database repair failed')
      }
    }

    // Check Vector database integrity
    const vectorIntegrity = await this.vectorManager.checkVectorIntegrity()
    if (!vectorIntegrity) {
      console.warn('Vector database integrity check failed, attempting optimization...')
      await this.vectorManager.optimizeVectorDatabase()
    }

    console.log('Database integrity checks completed')
  }

  async performMaintenance(): Promise<void> {
    if (!this.isInitialized) {
      throw new Error('Database service not initialized')
    }

    console.log('Starting database maintenance...')

    try {
      // SQLite maintenance
      await this.sqliteManager.executeInTransaction(() => {
        const db = this.sqliteManager.getDatabase()

        // Analyze tables for better query planning
        db.exec('ANALYZE')

        // Update table statistics
        db.exec('PRAGMA optimize')

        return true
      })

      // Vector database maintenance
      await this.vectorManager.optimizeVectorDatabase()

      // Verify integrity after maintenance
      await this.performIntegrityChecks()

      console.log('Database maintenance completed successfully')
    } catch (error) {
      console.error('Database maintenance failed:', error)
      throw error
    }
  }

  async getStatistics(): Promise<{
    sqlite: {
      totalSize: number
      pageCount: number
      pageSize: number
      walSize?: number
    }
    vector: {
      totalDocuments: number
      totalProjects: number
    }
  }> {
    if (!this.isInitialized) {
      throw new Error('Database service not initialized')
    }

    const sqliteDb = this.sqliteManager.getDatabase()

    // Get SQLite statistics
    const pageCount = sqliteDb.prepare('PRAGMA page_count').get() as { page_count: number }
    const pageSize = sqliteDb.prepare('PRAGMA page_size').get() as { page_size: number }

    let walSize: number | undefined
    try {
      const walInfo = sqliteDb.prepare('PRAGMA wal_checkpoint(PASSIVE)').get() as any
      walSize = walInfo ? walInfo.wal_size : undefined
    } catch {
      // WAL might not be enabled
    }

    // Get vector statistics
    const totalDocuments = await this.vectorManager.getVectorCount()
    const projectsResult = await this.sqliteManager.queryOne<{ count: number }>(
      'SELECT COUNT(DISTINCT project_id) as count FROM vector_documents'
    )

    return {
      sqlite: {
        totalSize: pageCount.page_count * pageSize.page_size,
        pageCount: pageCount.page_count,
        pageSize: pageSize.page_size,
        walSize,
      },
      vector: {
        totalDocuments,
        totalProjects: projectsResult?.count || 0,
      },
    }
  }

  async backup(backupPath: string): Promise<void> {
    if (!this.isInitialized) {
      throw new Error('Database service not initialized')
    }

    console.log(`Creating database backup at ${backupPath}`)

    try {
      const sqliteDb = this.sqliteManager.getDatabase()

      // Create backup using SQLite's backup API
      const backup = sqliteDb.backup(backupPath)

      // Perform the backup
      let remaining = -1
      while (remaining !== 0) {
        remaining = backup.step(100) // Copy 100 pages at a time
        console.log(`Backup progress: ${backup.pageCount - remaining}/${backup.pageCount} pages`)
      }

      backup.finish()
      console.log('Database backup completed successfully')
    } catch (error) {
      console.error('Database backup failed:', error)
      throw error
    }
  }

  async close(): Promise<void> {
    if (!this.isInitialized) {
      return
    }

    console.log('Closing database service...')

    try {
      await this.vectorManager.close()
      await this.sqliteManager.close()

      this.isInitialized = false
      console.log('Database service closed successfully')
    } catch (error) {
      console.error('Error closing database service:', error)
      throw error
    }
  }

  // Getters for accessing individual managers
  getSQLiteManager(): SQLiteManager {
    if (!this.isInitialized) {
      throw new Error('Database service not initialized')
    }
    return this.sqliteManager
  }

  getVectorManager(): VectorManager {
    if (!this.isInitialized) {
      throw new Error('Database service not initialized')
    }
    return this.vectorManager
  }

  isReady(): boolean {
    return this.isInitialized && this.sqliteManager.isReady() && this.vectorManager.isReady()
  }
}
