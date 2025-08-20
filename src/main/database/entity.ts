/**
 * Generic Database Entity CRUD utilities
 * Eliminates repetitive CRUD patterns and provides type-safe database operations
 */

import { executeQuery } from './index'

/**
 * Field mapping configuration for entity schemas
 */
export interface FieldMapping {
  /** Entity property name */
  property: string
  /** Database column name */
  column: string
  /** Whether to apply JSON serialization */
  isJson?: boolean
  /** Whether field is required for creation */
  required?: boolean
  /** Whether field can be updated */
  updatable?: boolean
}

/**
 * Entity schema definition
 */
export interface EntitySchema<T = Record<string, any>> {
  /** Database table name */
  tableName: string
  /** Primary key column name */
  primaryKey: string
  /** Field mappings between entity and database */
  fields: FieldMapping[]
  /** Default values for list ordering */
  defaultOrder?: {
    column: string
    direction: 'ASC' | 'DESC'
  }
  /** Type marker (not used at runtime, helps with TypeScript inference) */
  _entityType?: T
}

/**
 * Generic database entity class providing type-safe CRUD operations
 */
export class DatabaseEntity<T extends { id: string; createdAt: string; updatedAt: string }> {
  constructor(private schema: EntitySchema<T>) {}

  /**
   * Creates a new entity record
   */
  async create(data: Omit<T, 'createdAt' | 'updatedAt'>): Promise<void> {
    const insertFields: string[] = []
    const placeholders: string[] = []
    const values: any[] = []

    // Add required fields
    for (const field of this.schema.fields) {
      if (field.required !== false) {
        insertFields.push(field.column)
        placeholders.push('?')

        const value = (data as any)[field.property]
        if (field.isJson && value !== null && value !== undefined) {
          values.push(JSON.stringify(value))
        } else {
          values.push(value || null)
        }
      }
    }

    const sql = `
      INSERT INTO ${this.schema.tableName} (${insertFields.join(', ')})
      VALUES (${placeholders.join(', ')})
    `

    await executeQuery(sql, values)
  }

  /**
   * Retrieves a single entity by ID
   */
  async get(id: string): Promise<T | null> {
    const selectFields = this.schema.fields.map((f) => f.column).join(', ')

    const result = await executeQuery(
      `SELECT ${selectFields} FROM ${this.schema.tableName} WHERE ${this.schema.primaryKey} = ?`,
      [id]
    )

    if (result.rows.length === 0) return null

    return this.mapRowToEntity(result.rows[0])
  }

  /**
   * Lists all entities with optional ordering
   */
  async list(options?: {
    orderBy?: string
    direction?: 'ASC' | 'DESC'
    limit?: number
    where?: { column: string; value: any }
  }): Promise<T[]> {
    const selectFields = this.schema.fields.map((f) => f.column).join(', ')
    let sql = `SELECT ${selectFields} FROM ${this.schema.tableName}`
    const values: any[] = []

    // Add WHERE clause if specified
    if (options?.where) {
      sql += ` WHERE ${options.where.column} = ?`
      values.push(options.where.value)
    }

    // Add ORDER BY clause
    const orderBy = options?.orderBy || this.schema.defaultOrder?.column || this.schema.primaryKey
    const direction = options?.direction || this.schema.defaultOrder?.direction || 'ASC'
    sql += ` ORDER BY ${orderBy} ${direction}`

    // Add LIMIT if specified
    if (options?.limit) {
      sql += ` LIMIT ?`
      values.push(options.limit)
    }

    const result = await executeQuery(sql, values)
    return result.rows.map((row) => this.mapRowToEntity(row))
  }

  /**
   * Updates an existing entity
   */
  async update(
    id: string,
    updates: Partial<Omit<T, 'id' | 'createdAt' | 'updatedAt'>>
  ): Promise<void> {
    const setParts: string[] = []
    const values: any[] = []

    // Build dynamic SET clause
    for (const [property, value] of Object.entries(updates)) {
      if (value === undefined) continue

      const field = this.schema.fields.find((f) => f.property === property)
      if (!field || field.updatable === false) continue

      setParts.push(`${field.column} = ?`)

      if (field.isJson && value !== null) {
        values.push(JSON.stringify(value))
      } else {
        values.push(value)
      }
    }

    if (setParts.length === 0) return

    // Always update the updated_at timestamp
    setParts.push("updated_at = datetime('now')")
    values.push(id)

    const sql = `
      UPDATE ${this.schema.tableName}
      SET ${setParts.join(', ')}
      WHERE ${this.schema.primaryKey} = ?
    `

    await executeQuery(sql, values)
  }

  /**
   * Deletes an entity by ID
   */
  async delete(id: string): Promise<void> {
    await executeQuery(`DELETE FROM ${this.schema.tableName} WHERE ${this.schema.primaryKey} = ?`, [
      id
    ])
  }

  /**
   * Maps a database row to an entity object
   */
  private mapRowToEntity(row: any): T {
    const entity: any = {}

    for (const field of this.schema.fields) {
      const dbValue = row[field.column]

      if (field.isJson && dbValue !== null && dbValue !== undefined) {
        try {
          entity[field.property] = JSON.parse(dbValue)
        } catch (e) {
          entity[field.property] = null
        }
      } else {
        entity[field.property] = dbValue === null ? undefined : dbValue
      }
    }

    return entity as T
  }

  /**
   * Executes a custom query with entity mapping
   */
  async executeCustomQuery(sql: string, params: any[] = []): Promise<T[]> {
    const result = await executeQuery(sql, params)
    return result.rows.map((row) => this.mapRowToEntity(row))
  }
}

/**
 * Utility function to create field mappings with common patterns
 */
export function createFieldMapping(
  property: string,
  column?: string,
  options?: {
    isJson?: boolean
    required?: boolean
    updatable?: boolean
  }
): FieldMapping {
  return {
    property,
    column: column || property,
    isJson: options?.isJson || false,
    required: options?.required !== false,
    updatable: options?.updatable !== false
  }
}

/**
 * Helper to create snake_case column name from camelCase property
 */
export function toSnakeCase(camelCase: string): string {
  return camelCase.replace(/[A-Z]/g, (letter) => `_${letter.toLowerCase()}`)
}
