import { createClient, Client, InArgs } from '@libsql/client'
import { app } from 'electron'
import * as path from 'path'
import * as fs from 'fs'

/**
 * Database connection manager for Knowlex
 * Handles libsql client creation, connection management, and graceful shutdown
 */

let db: Client | null = null
let dbPath: string | null = null

/**
 * Gets the database file path based on environment
 * In development: uses project root /data directory
 * In production: uses user data directory
 */
function getDatabasePath(): string {
  if (dbPath) return dbPath

  const isDev = process.env.NODE_ENV === 'development'

  if (isDev) {
    // Development: use project root /data directory
    const projectRoot = process.cwd()
    const dataDir = path.join(projectRoot, 'data')

    // Ensure data directory exists
    if (!fs.existsSync(dataDir)) {
      fs.mkdirSync(dataDir, { recursive: true })
    }

    dbPath = path.join(dataDir, 'knowlex.db')
  } else {
    // Production: use user data directory
    const userDataPath = app.getPath('userData')
    dbPath = path.join(userDataPath, 'knowlex.db')
  }

  return dbPath
}

/**
 * Creates and returns a database client instance
 * Initializes libsql client with file-based storage
 */
export async function getDB(): Promise<Client> {
  if (db) {
    return db
  }

  try {
    const databasePath = getDatabasePath()
    console.log(`Initializing database at: ${databasePath}`)

    // Create libsql client with file-based storage
    db = createClient({
      url: `file:${databasePath}`
    })

    // Test the connection
    await db.execute('SELECT 1')
    console.log('Database connection established successfully')

    return db
  } catch (error) {
    console.error('Failed to initialize database:', error)
    throw new Error(
      `Database initialization failed: ${error instanceof Error ? error.message : 'Unknown error'}`
    )
  }
}

/**
 * Closes the database connection gracefully
 * Should be called during app shutdown
 */
export async function closeDB(): Promise<void> {
  if (db) {
    try {
      await db.close()
      console.log('Database connection closed')
    } catch (error) {
      console.error('Error closing database:', error)
    } finally {
      db = null
      dbPath = null
    }
  }
}

/**
 * Executes a database query with error handling
 * Provides a consistent interface for database operations
 */
export async function executeQuery(
  sql: string,
  params?: InArgs
): Promise<{ rows: unknown[]; rowsAffected: number }> {
  const database = await getDB()

  try {
    const result = await database.execute({
      sql,
      args: params || []
    })

    return {
      rows: result.rows || [],
      rowsAffected: result.rowsAffected || 0
    }
  } catch (error) {
    console.error('Database query failed:', { sql, params, error })
    throw new Error(
      `Query execution failed: ${error instanceof Error ? error.message : 'Unknown error'}`
    )
  }
}

/**
 * Executes a transaction with multiple queries
 * Ensures atomicity for related database operations
 */
export async function executeTransaction(
  queries: Array<{ sql: string; params?: InArgs }>
): Promise<void> {
  const database = await getDB()

  try {
    // Begin transaction
    await database.execute('BEGIN TRANSACTION')

    // Execute each query in sequence
    for (const query of queries) {
      await database.execute({
        sql: query.sql,
        args: query.params || []
      })
    }

    // Commit transaction
    await database.execute('COMMIT')
  } catch (error) {
    // Rollback on error
    try {
      await database.execute('ROLLBACK')
    } catch (rollbackError) {
      console.error('Failed to rollback transaction:', rollbackError)
    }

    console.error('Transaction failed:', { queries, error })
    throw new Error(
      `Transaction failed: ${error instanceof Error ? error.message : 'Unknown error'}`
    )
  }
}

/**
 * Checks if database is connected and ready
 */
export function isDatabaseReady(): boolean {
  return db !== null
}

/**
 * Gets current database file path (for debugging/info purposes)
 */
export function getCurrentDatabasePath(): string | null {
  return dbPath
}
