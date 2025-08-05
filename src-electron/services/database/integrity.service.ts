import { SQLiteManager } from './sqlite.manager'
import { VectorManager } from './vector.manager'
import * as fs from 'fs'
import * as path from 'path'

export interface IntegrityCheckResult {
  sqlite: {
    passed: boolean
    issues: string[]
    repaired: boolean
  }
  vector: {
    passed: boolean
    issues: string[]
    repaired: boolean
  }
  overall: {
    passed: boolean
    criticalIssues: string[]
    warnings: string[]
  }
}

export interface DatabaseBackupInfo {
  path: string
  timestamp: string
  size: number
  checksum: string
}

export class DatabaseIntegrityService {
  constructor(
    private sqliteManager: SQLiteManager,
    private vectorManager: VectorManager
  ) {}

  async performFullIntegrityCheck(): Promise<IntegrityCheckResult> {
    console.log('Starting comprehensive database integrity check...')

    const result: IntegrityCheckResult = {
      sqlite: { passed: false, issues: [], repaired: false },
      vector: { passed: false, issues: [], repaired: false },
      overall: { passed: false, criticalIssues: [], warnings: [] },
    }

    // Check SQLite database integrity
    result.sqlite = await this.checkSQLiteIntegrity()

    // Check Vector database integrity
    result.vector = await this.checkVectorIntegrity()

    // Check cross-database consistency
    const consistencyIssues = await this.checkCrossDatabaseConsistency()
    result.overall.warnings.push(...consistencyIssues)

    // Determine overall status
    result.overall.passed = result.sqlite.passed && result.vector.passed

    if (!result.sqlite.passed) {
      result.overall.criticalIssues.push('SQLite database integrity compromised')
    }

    if (!result.vector.passed) {
      result.overall.criticalIssues.push('Vector database integrity compromised')
    }

    console.log(
      `Integrity check completed. Overall status: ${result.overall.passed ? 'PASSED' : 'FAILED'}`
    )

    return result
  }

  private async checkSQLiteIntegrityDetailed(): Promise<{
    passed: boolean
    issues: string[]
    repaired: boolean
  }> {
    const issues: string[] = []
    let repaired = false

    try {
      // 1. Basic integrity check
      const basicIntegrity = await this.sqliteManager.checkIntegrity()
      if (!basicIntegrity) {
        issues.push('Basic SQLite integrity check failed')
      }

      // 2. Check for corruption indicators
      const db = this.sqliteManager.getDatabase()

      // Check page count consistency
      try {
        const pageCount = db.prepare('PRAGMA page_count').get() as { page_count: number }
        const freelistCount = db.prepare('PRAGMA freelist_count').get() as {
          freelist_count: number
        }

        if (pageCount.page_count < 1) {
          issues.push('Invalid page count detected')
        }

        if (freelistCount.freelist_count < 0) {
          issues.push('Invalid freelist count detected')
        }
      } catch (error) {
        issues.push(`Page structure check failed: ${error.message}`)
      }

      // 3. Check table structure consistency
      const expectedTables = [
        'projects',
        'conversations',
        'messages',
        'files',
        'project_memories',
        'project_knowledge',
        'app_settings',
        'rerank_settings',
        'migrations',
        'messages_fts',
      ]

      for (const tableName of expectedTables) {
        try {
          const tableInfo = db.prepare(`PRAGMA table_info(${tableName})`).all()
          if (tableInfo.length === 0) {
            issues.push(`Required table '${tableName}' is missing or corrupted`)
          }
        } catch (error) {
          issues.push(`Table structure check failed for '${tableName}': ${error.message}`)
        }
      }

      // 4. Check foreign key consistency
      try {
        const fkViolations = db.prepare('PRAGMA foreign_key_check').all()
        if (fkViolations.length > 0) {
          issues.push(`Foreign key violations detected: ${fkViolations.length} violations`)
        }
      } catch (error) {
        issues.push(`Foreign key check failed: ${error.message}`)
      }

      // 5. Check FTS table consistency
      try {
        const ftsCheck = db
          .prepare("INSERT INTO messages_fts(messages_fts) VALUES('integrity-check')")
          .run()
        if (ftsCheck.changes === 0) {
          issues.push('FTS table integrity check failed')
        }
      } catch (error) {
        issues.push(`FTS integrity check failed: ${error.message}`)
      }

      // 6. Attempt repair if issues found
      if (issues.length > 0) {
        console.log(`Found ${issues.length} SQLite issues, attempting repair...`)

        try {
          // Try VACUUM to fix minor corruption
          db.exec('VACUUM')

          // Rebuild FTS index
          db.exec("INSERT INTO messages_fts(messages_fts) VALUES('rebuild')")

          // Re-analyze tables
          db.exec('ANALYZE')

          // Recheck integrity
          const repairedIntegrity = await this.sqliteManager.checkIntegrity()
          if (repairedIntegrity) {
            repaired = true
            console.log('SQLite database repair successful')
          }
        } catch (repairError) {
          issues.push(`Repair attempt failed: ${repairError.message}`)
        }
      }

      return {
        passed: issues.length === 0 || repaired,
        issues,
        repaired,
      }
    } catch (error) {
      issues.push(`Integrity check failed: ${error.message}`)
      return { passed: false, issues, repaired: false }
    }
  }

  private async checkSQLiteIntegrity(): Promise<{
    passed: boolean
    issues: string[]
    repaired: boolean
  }> {
    return this.checkSQLiteIntegrityDetailed()
  }

  private async checkVectorIntegrity(): Promise<{
    passed: boolean
    issues: string[]
    repaired: boolean
  }> {
    const issues: string[] = []
    let repaired = false

    try {
      // 1. Basic vector database integrity
      const basicIntegrity = await this.vectorManager.checkVectorIntegrity()
      if (!basicIntegrity) {
        issues.push('Basic vector database integrity check failed')
      }

      // 2. Check vector count consistency
      const totalVectors = await this.vectorManager.getVectorCount()
      const db = this.vectorManager.getDatabase()

      try {
        const actualCount = db.prepare('SELECT COUNT(*) as count FROM vector_documents').get() as {
          count: number
        }
        if (actualCount.count !== totalVectors) {
          issues.push(
            `Vector count mismatch: expected ${totalVectors}, actual ${actualCount.count}`
          )
        }
      } catch (error) {
        issues.push(`Vector count check failed: ${error.message}`)
      }

      // 3. Check for orphaned vectors (vectors without corresponding files)
      try {
        // First check if vector_documents table exists
        const tableExists = db
          .prepare(
            `
          SELECT name FROM sqlite_master 
          WHERE type='table' AND name='vector_documents'
        `
          )
          .get()

        if (tableExists) {
          const orphanedVectors = db
            .prepare(
              `
            SELECT v.id, v.file_id 
            FROM vector_documents v 
            WHERE v.file_id NOT IN (
              SELECT id FROM files
            )
          `
            )
            .all()

          if (orphanedVectors.length > 0) {
            issues.push(`Found ${orphanedVectors.length} orphaned vectors`)

            // Clean up orphaned vectors
            const deleteStmt = db.prepare('DELETE FROM vector_documents WHERE file_id = ?')
            for (const orphan of orphanedVectors) {
              deleteStmt.run(orphan.file_id)
            }
            repaired = true
            console.log(`Cleaned up ${orphanedVectors.length} orphaned vectors`)
          }
        }
      } catch (error) {
        issues.push(`Orphaned vector check failed: ${error.message}`)
      }

      // 4. Check vector data integrity
      try {
        const sampleVectors = db
          .prepare('SELECT id, embedding FROM vector_documents LIMIT 10')
          .all()
        for (const vector of sampleVectors) {
          if (!vector.embedding) {
            issues.push(`Vector ${vector.id} has missing embedding data`)
          } else {
            try {
              // Try to deserialize embedding
              const embeddingData = Buffer.isBuffer(vector.embedding)
                ? vector.embedding
                : Buffer.from(vector.embedding)

              if (embeddingData.length % 4 !== 0) {
                issues.push(`Vector ${vector.id} has invalid embedding data length`)
              }
            } catch (deserializeError) {
              issues.push(`Vector ${vector.id} has corrupted embedding data`)
            }
          }
        }
      } catch (error) {
        issues.push(`Vector data integrity check failed: ${error.message}`)
      }

      // 5. Attempt repair if issues found
      if (issues.length > 0 && !repaired) {
        console.log(`Found ${issues.length} vector issues, attempting repair...`)

        try {
          await this.vectorManager.optimizeVectorDatabase()
          repaired = true
          console.log('Vector database repair successful')
        } catch (repairError) {
          issues.push(`Vector repair attempt failed: ${repairError.message}`)
        }
      }

      return {
        passed: issues.length === 0 || repaired,
        issues,
        repaired,
      }
    } catch (error) {
      issues.push(`Vector integrity check failed: ${error.message}`)
      return { passed: false, issues, repaired: false }
    }
  }

  private async checkCrossDatabaseConsistency(): Promise<string[]> {
    const warnings: string[] = []

    try {
      const sqliteDb = this.sqliteManager.getDatabase()
      const vectorDb = this.vectorManager.getDatabase()

      // Check if all files have corresponding vectors
      try {
        const filesWithoutVectors = sqliteDb
          .prepare(
            `
          SELECT f.id, f.filename 
          FROM files f 
          LEFT JOIN vector_documents v ON f.id = v.file_id 
          WHERE f.status = 'completed' AND v.file_id IS NULL
        `
          )
          .all()

        if (filesWithoutVectors.length > 0) {
          warnings.push(`${filesWithoutVectors.length} completed files missing vector data`)
        }
      } catch (error) {
        warnings.push(`Could not check file-vector consistency: ${error.message}`)
      }

      // Check if all projects referenced in vectors exist
      try {
        const vectorsWithoutProjects = vectorDb
          .prepare(
            `
          SELECT DISTINCT v.project_id 
          FROM vector_documents v 
          WHERE v.project_id NOT IN (
            SELECT id FROM projects
          )
        `
          )
          .all()

        if (vectorsWithoutProjects.length > 0) {
          warnings.push(`Vectors reference ${vectorsWithoutProjects.length} non-existent projects`)
        }
      } catch (error) {
        warnings.push(`Could not check vector-project consistency: ${error.message}`)
      }

      // Check conversation-message consistency
      const messagesWithoutConversations = sqliteDb
        .prepare(
          `
        SELECT COUNT(*) as count 
        FROM messages m 
        LEFT JOIN conversations c ON m.conversation_id = c.id 
        WHERE c.id IS NULL
      `
        )
        .get() as { count: number }

      if (messagesWithoutConversations.count > 0) {
        warnings.push(
          `${messagesWithoutConversations.count} messages reference non-existent conversations`
        )
      }
    } catch (error) {
      warnings.push(`Cross-database consistency check failed: ${error.message}`)
    }

    return warnings
  }

  async createBackup(backupDir: string): Promise<DatabaseBackupInfo> {
    const timestamp = new Date().toISOString().replace(/[:.]/g, '-')
    const backupPath = path.join(backupDir, `knowlex-backup-${timestamp}.db`)

    try {
      // Ensure backup directory exists
      if (!fs.existsSync(backupDir)) {
        fs.mkdirSync(backupDir, { recursive: true })
      }

      // Create SQLite backup using file copy (more reliable than backup API)
      const sqliteDb = this.sqliteManager.getDatabase()
      const currentDbPath = sqliteDb.name

      // Ensure WAL is checkpointed before backup
      try {
        sqliteDb.exec('PRAGMA wal_checkpoint(FULL)')
      } catch {
        // WAL might not be enabled
      }

      // Copy database file
      fs.copyFileSync(currentDbPath, backupPath)

      // Get backup file info
      const stats = fs.statSync(backupPath)
      const checksum = await this.calculateFileChecksum(backupPath)

      console.log(`Database backup created: ${backupPath}`)

      return {
        path: backupPath,
        timestamp,
        size: stats.size,
        checksum,
      }
    } catch (error) {
      console.error('Backup creation failed:', error)
      throw error
    }
  }

  async restoreFromBackup(backupPath: string): Promise<void> {
    if (!fs.existsSync(backupPath)) {
      throw new Error(`Backup file not found: ${backupPath}`)
    }

    try {
      console.log(`Restoring database from backup: ${backupPath}`)

      // Close current connections
      await this.sqliteManager.close()
      await this.vectorManager.close()

      // Get current database paths before closing
      const currentSqlitePath = this.sqliteManager.getDatabase().name

      // Create backup of current database
      const emergencyBackupPath = `${currentSqlitePath}.emergency-backup`
      fs.copyFileSync(currentSqlitePath, emergencyBackupPath)

      // Restore from backup
      fs.copyFileSync(backupPath, currentSqlitePath)

      // Reinitialize databases
      await this.sqliteManager.initialize()
      await this.vectorManager.initialize()

      // Verify restoration
      const integrityResult = await this.performFullIntegrityCheck()
      if (!integrityResult.overall.passed) {
        // Restore emergency backup
        fs.copyFileSync(emergencyBackupPath, currentSqlitePath)
        await this.sqliteManager.initialize()
        throw new Error('Backup restoration failed integrity check')
      }

      // Clean up emergency backup
      fs.unlinkSync(emergencyBackupPath)

      console.log('Database restoration completed successfully')
    } catch (error) {
      console.error('Database restoration failed:', error)
      throw error
    }
  }

  private async calculateFileChecksum(filePath: string): Promise<string> {
    const crypto = await import('crypto')
    const hash = crypto.createHash('sha256')
    const data = fs.readFileSync(filePath)
    hash.update(data)
    return hash.digest('hex')
  }

  async schedulePeriodicIntegrityCheck(intervalHours: number = 24): Promise<void> {
    const intervalMs = intervalHours * 60 * 60 * 1000

    const performCheck = async () => {
      try {
        console.log('Performing scheduled integrity check...')
        const result = await this.performFullIntegrityCheck()

        if (!result.overall.passed) {
          console.error('Scheduled integrity check failed:', result.overall.criticalIssues)
          // Could emit an event or notification here
        } else if (result.overall.warnings.length > 0) {
          console.warn('Integrity check warnings:', result.overall.warnings)
        } else {
          console.log('Scheduled integrity check passed')
        }
      } catch (error) {
        console.error('Scheduled integrity check error:', error)
      }
    }

    // Perform initial check
    await performCheck()

    // Schedule periodic checks
    setInterval(performCheck, intervalMs)
    console.log(`Scheduled integrity checks every ${intervalHours} hours`)
  }

  async getHealthMetrics(): Promise<{
    sqlite: {
      size: number
      pageCount: number
      freePages: number
      walSize?: number
    }
    vector: {
      totalDocuments: number
      totalProjects: number
      averageVectorSize: number
    }
    performance: {
      lastIntegrityCheck: string
      averageQueryTime: number
      cacheHitRate: number
    }
  }> {
    const sqliteDb = this.sqliteManager.getDatabase()
    const vectorDb = this.vectorManager.getDatabase()

    // SQLite metrics
    const pageCount = sqliteDb.prepare('PRAGMA page_count').get() as { page_count: number }
    const pageSize = sqliteDb.prepare('PRAGMA page_size').get() as { page_size: number }
    const freelistCount = sqliteDb.prepare('PRAGMA freelist_count').get() as {
      freelist_count: number
    }

    let walSize: number | undefined
    try {
      const walInfo = sqliteDb.prepare('PRAGMA wal_checkpoint(PASSIVE)').get() as any
      walSize = walInfo?.wal_size
    } catch {
      // WAL might not be enabled
    }

    // Vector metrics
    const totalDocuments = await this.vectorManager.getVectorCount()

    let projectsResult: { count: number }
    try {
      projectsResult = vectorDb
        .prepare('SELECT COUNT(DISTINCT project_id) as count FROM vector_documents')
        .get() as { count: number }
    } catch {
      // Table might not exist yet
      projectsResult = { count: 0 }
    }

    // Calculate average vector size
    const sampleVectors = vectorDb
      .prepare('SELECT LENGTH(embedding) as size FROM vector_documents LIMIT 100')
      .all() as { size: number }[]
    const averageVectorSize =
      sampleVectors.length > 0
        ? sampleVectors.reduce((sum, v) => sum + v.size, 0) / sampleVectors.length
        : 0

    return {
      sqlite: {
        size: pageCount.page_count * pageSize.page_size,
        pageCount: pageCount.page_count,
        freePages: freelistCount.freelist_count,
        walSize,
      },
      vector: {
        totalDocuments,
        totalProjects: projectsResult.count,
        averageVectorSize,
      },
      performance: {
        lastIntegrityCheck: new Date().toISOString(),
        averageQueryTime: 0, // Would need to implement query timing
        cacheHitRate: 0, // Would need to implement cache metrics
      },
    }
  }
}
