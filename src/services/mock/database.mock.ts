/**
 * Database Mock Service
 *
 * Provides mock database operations with predefined test scenarios
 * for development and testing purposes.
 */

import {
  Project,
  Conversation,
  Message,
  ProjectFile,
  ProjectMemory,
  ProjectKnowledge,
  VectorDocument,
  AppSetting,
  RerankSetting,
} from '@knowlex/types'

export interface DatabaseMockScenario {
  name: string
  description: string
  data: {
    projects: Project[]
    conversations: Conversation[]
    messages: Message[]
    files: ProjectFile[]
    memories: ProjectMemory[]
    knowledge: ProjectKnowledge[]
    vectorDocuments: VectorDocument[]
    settings: AppSetting[]
    rerankSettings: RerankSetting[]
  }
}

export interface QueryResult {
  rows: unknown[]
  changes?: number
  lastInsertRowid?: number
}

export class DatabaseMockService {
  private currentScenario: DatabaseMockScenario
  private transactionMode = false
  private transactionQueries: Array<{ _sql: string; _params?: unknown[] }> = []

  constructor() {
    this.currentScenario = this.getDefaultScenario()
  }

  /**
   * Switch to a different test scenario
   */
  switchScenario(scenarioName: string): void {
    const scenario = this.getScenario(scenarioName)
    if (scenario) {
      this.currentScenario = scenario
      // console.log(`[Database Mock] Switched to scenario: ${scenarioName}`)
    } else {
      // console.warn(`[Database Mock] Scenario not found: ${scenarioName}`)
    }
  }

  /**
   * Get available test scenarios
   */
  getAvailableScenarios(): string[] {
    return ['default', 'empty', 'large-dataset', 'corrupted-data', 'migration-test']
  }

  /**
   * Execute a SQL query
   */
  async query(_sql: string, _params: unknown[] = []): Promise<QueryResult> {
    // console.log(`[Database Mock] Query: ${_sql}`, _params)

    // Simulate database delay
    await this.delay(10 + Math.random() * 50)

    if (this.transactionMode) {
      this.transactionQueries.push({ _sql, _params })
      return { rows: [] }
    }

    return this.executeQuery(_sql, _params)
  }

  /**
   * Execute multiple queries in a transaction
   */
  async transaction(queries: Array<{ _sql: string; _params?: unknown[] }>): Promise<QueryResult[]> {
    // console.log(`[Database Mock] Transaction with ${queries.length} queries`)

    this.transactionMode = true
    this.transactionQueries = []

    try {
      const results: QueryResult[] = []

      for (const query of queries) {
        const result = await this.executeQuery(query._sql, query._params || [])
        results.push(result)
      }

      this.transactionMode = false
      this.transactionQueries = []

      // console.log('[Database Mock] Transaction committed')
      return results
    } catch (error) {
      this.transactionMode = false
      this.transactionQueries = []
      // console.log('[Database Mock] Transaction rolled back')
      throw error
    }
  }

  /**
   * Get database schema information
   */
  async getSchema(): Promise<any> {
    return {
      tables: [
        'projects',
        'conversations',
        'messages',
        'project_files',
        'project_memories',
        'project_knowledge',
        'vector_documents',
        'app_settings',
        'rerank_settings',
      ],
      version: '1.0.0',
      lastMigration: '2024-01-01T00:00:00Z',
    }
  }

  /**
   * Simulate database backup
   */
  async backup(path: string): Promise<{ success: boolean; size: number; path: string }> {
    // console.log(`[Database Mock] Creating backup at: ${path}`)
    await this.delay(1000) // Simulate backup time

    return {
      success: true,
      size: 1024 * 1024 * 5, // 5MB mock size
      path,
    }
  }

  /**
   * Simulate database restore
   */
  async restore(path: string): Promise<{ success: boolean; recordsRestored: number }> {
    // console.log(`[Database Mock] Restoring from: ${path}`)
    await this.delay(2000) // Simulate restore time

    return {
      success: true,
      recordsRestored: 1000,
    }
  }

  /**
   * Get database statistics
   */
  async getStats(): Promise<any> {
    const data = this.currentScenario.data

    return {
      totalProjects: data.projects.length,
      totalConversations: data.conversations.length,
      totalMessages: data.messages.length,
      totalFiles: data.files.length,
      totalMemories: data.memories.length,
      totalKnowledge: data.knowledge.length,
      totalVectorDocuments: data.vectorDocuments.length,
      databaseSize: '15.2 MB',
      lastVacuum: '2024-01-01T00:00:00Z',
      indexCount: 12,
      tableCount: 9,
    }
  }

  private async executeQuery(_sql: string, _params: unknown[]): Promise<QueryResult> {
    const sqlLower = _sql.toLowerCase().trim()

    // Handle SELECT queries
    if (sqlLower.startsWith('select')) {
      return this.handleSelectQuery(_sql, _params)
    }

    // Handle INSERT queries
    if (sqlLower.startsWith('insert')) {
      return this.handleInsertQuery(_sql, _params)
    }

    // Handle UPDATE queries
    if (sqlLower.startsWith('update')) {
      return this.handleUpdateQuery(_sql, _params)
    }

    // Handle DELETE queries
    if (sqlLower.startsWith('delete')) {
      return this.handleDeleteQuery(_sql, _params)
    }

    // Handle CREATE/ALTER/DROP queries
    if (
      sqlLower.startsWith('create') ||
      sqlLower.startsWith('alter') ||
      sqlLower.startsWith('drop')
    ) {
      return this.handleSchemaQuery(_sql, _params)
    }

    // Default response
    return { rows: [] }
  }

  private handleSelectQuery(_sql: string, _params: unknown[]): QueryResult {
    const sqlLower = _sql.toLowerCase()

    // Projects queries
    if (sqlLower.includes('from projects')) {
      if (sqlLower.includes('where _id = ?')) {
        const _id = _params[0]
        const project = this.currentScenario.data.projects.find(p => p._id === _id)
        return { rows: project ? [project] : [] }
      }
      return { rows: this.currentScenario.data.projects }
    }

    // Conversations queries
    if (sqlLower.includes('from conversations')) {
      if (sqlLower.includes('where project_id = ?')) {
        const projectId = _params[0]
        const conversations = this.currentScenario.data.conversations.filter(
          c => c.projectId === projectId
        )
        return { rows: conversations }
      }
      if (sqlLower.includes('where _id = ?')) {
        const _id = _params[0]
        const conversation = this.currentScenario.data.conversations.find(c => c._id === _id)
        return { rows: conversation ? [conversation] : [] }
      }
      return { rows: this.currentScenario.data.conversations }
    }

    // Messages queries
    if (sqlLower.includes('from messages')) {
      if (sqlLower.includes('where conversation_id = ?')) {
        const conversationId = _params[0]
        const messages = this.currentScenario.data.messages.filter(
          m => m.conversationId === conversationId
        )
        return { rows: messages }
      }
      return { rows: this.currentScenario.data.messages }
    }

    // Files queries
    if (sqlLower.includes('from project_files')) {
      if (sqlLower.includes('where project_id = ?')) {
        const projectId = _params[0]
        const files = this.currentScenario.data.files.filter(f => f.projectId === projectId)
        return { rows: files }
      }
      return { rows: this.currentScenario.data.files }
    }

    // Memories queries
    if (sqlLower.includes('from project_memories')) {
      if (sqlLower.includes('where project_id = ?')) {
        const projectId = _params[0]
        const memories = this.currentScenario.data.memories.filter(m => m.projectId === projectId)
        return { rows: memories }
      }
      return { rows: this.currentScenario.data.memories }
    }

    // Knowledge queries
    if (sqlLower.includes('from project_knowledge')) {
      if (sqlLower.includes('where project_id = ?')) {
        const projectId = _params[0]
        const knowledge = this.currentScenario.data.knowledge.filter(k => k.projectId === projectId)
        return { rows: knowledge }
      }
      return { rows: this.currentScenario.data.knowledge }
    }

    // Vector documents queries
    if (sqlLower.includes('from vector_documents')) {
      return { rows: this.currentScenario.data.vectorDocuments }
    }

    // Settings queries
    if (sqlLower.includes('from app_settings')) {
      return { rows: this.currentScenario.data.settings }
    }

    // Full-text search simulation
    if (sqlLower.includes('fts') || sqlLower.includes('match')) {
      const searchTerm = _params.find(p => typeof p === 'string' && p.length > 0) || 'search'
      return {
        rows: [
          {
            _id: 'conv-1',
            title: `Search result for "${searchTerm}"`,
            snippet: `This is a mock search result containing ${searchTerm}...`,
            rank: 0.95,
          },
        ],
      }
    }

    return { rows: [] }
  }

  private handleInsertQuery(_sql: string, _params: unknown[]): QueryResult {
    const newId = Date.now()

    // Simulate successful insert
    return {
      rows: [],
      changes: 1,
      lastInsertRowid: newId,
    }
  }

  private handleUpdateQuery(_sql: string, _params: unknown[]): QueryResult {
    // Simulate successful update
    return {
      rows: [],
      changes: 1,
    }
  }

  private handleDeleteQuery(_sql: string, _params: unknown[]): QueryResult {
    // Simulate successful delete
    return {
      rows: [],
      changes: 1,
    }
  }

  private handleSchemaQuery(_sql: string, _params: unknown[]): QueryResult {
    // Simulate successful schema operation
    return {
      rows: [],
      changes: 0,
    }
  }

  private async delay(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms))
  }

  private getDefaultScenario(): DatabaseMockScenario {
    return {
      name: 'default',
      description: 'Default scenario with sample data',
      data: {
        projects: [
          {
            _id: 1,
            name: 'AI Research Project',
            description: 'Research on artificial intelligence',
            createdAt: '2024-01-01T00:00:00Z',
            updatedAt: '2024-01-01T00:00:00Z',
          },
          {
            _id: 2,
            name: 'Web Development',
            description: 'Frontend and backend development',
            createdAt: '2024-01-02T00:00:00Z',
            updatedAt: '2024-01-02T00:00:00Z',
          },
        ],
        conversations: [
          {
            _id: 'conv-1',
            title: 'Introduction to AI',
            projectId: 1,
            createdAt: '2024-01-01T10:00:00Z',
            updatedAt: '2024-01-01T10:00:00Z',
          },
        ],
        messages: [
          {
            _id: 'msg-1',
            conversationId: 'conv-1',
            role: 'user',
            content: 'What is artificial intelligence?',
            createdAt: '2024-01-01T10:00:00Z',
            updatedAt: '2024-01-01T10:00:00Z',
          },
        ],
        files: [
          {
            _id: 1,
            projectId: 1,
            filename: 'research-paper.pdf',
            originalPath: '/mock/path/research-paper.pdf',
            pdfPath: '/mock/path/research-paper.pdf',
            fileSize: 1024000,
            md5Original: 'mock-md5-1',
            md5Pdf: 'mock-md5-pdf-1',
            _status: 'completed',
            createdAt: '2024-01-01T09:00:00Z',
            updatedAt: '2024-01-01T09:00:00Z',
          },
        ],
        memories: [
          {
            _id: 1,
            projectId: 1,
            content: 'This project focuses on machine learning',
            type: 'description',
            isSystem: true,
            createdAt: '2024-01-01T00:00:00Z',
            updatedAt: '2024-01-01T00:00:00Z',
          },
        ],
        knowledge: [
          {
            _id: 1,
            projectId: 1,
            title: 'AI Fundamentals',
            content: 'Key concepts in artificial intelligence...',
            createdAt: '2024-01-01T08:00:00Z',
            updatedAt: '2024-01-01T08:00:00Z',
          },
        ],
        vectorDocuments: [
          {
            _id: 'vec-1',
            fileId: 1,
            projectId: 1,
            chunkIndex: 0,
            content: 'Artificial intelligence is a branch of computer science...',
            filename: 'research-paper.pdf',
            chunkStart: 0,
            chunkEnd: 100,
            createdAt: '2024-01-01T09:30:00Z',
            embedding: new Array(1536).fill(0).map(() => Math.random() - 0.5),
          },
        ],
        settings: [
          {
            key: 'chat_api_key',
            value: 'mock-api-key',
            updatedAt: '2024-01-01T00:00:00Z',
          },
          {
            key: 'theme',
            value: 'light',
            updatedAt: '2024-01-01T00:00:00Z',
          },
        ],
        rerankSettings: [
          {
            _id: 1,
            modelName: 'rerank-english-v2.0',
            apiKey: 'mock-rerank-key',
            baseUrl: 'https://api.cohere.ai/v1',
            enabled: true,
            createdAt: '2024-01-01T00:00:00Z',
            updatedAt: '2024-01-01T00:00:00Z',
          },
        ],
      },
    }
  }

  private getScenario(name: string): DatabaseMockScenario | null {
    switch (name) {
      case 'default':
        return this.getDefaultScenario()

      case 'empty':
        return {
          name: 'empty',
          description: 'Empty database scenario',
          data: {
            projects: [],
            conversations: [],
            messages: [],
            files: [],
            memories: [],
            knowledge: [],
            vectorDocuments: [],
            settings: [],
            rerankSettings: [],
          },
        }

      case 'large-dataset':
        return this.generateLargeDatasetScenario()

      case 'corrupted-data':
        return this.getCorruptedDataScenario()

      case 'migration-test':
        return this.getMigrationTestScenario()

      default:
        return null
    }
  }

  private generateLargeDatasetScenario(): DatabaseMockScenario {
    const scenario = this.getDefaultScenario()
    scenario.name = 'large-dataset'
    scenario.description = 'Large dataset for performance testing'

    // Generate 100 projects
    for (let i = 3; i <= 100; i++) {
      scenario.data.projects.push({
        _id: i,
        name: `Project ${i}`,
        description: `Description for project ${i}`,
        createdAt: new Date(2024, 0, (i % 30) + 1).toISOString(),
        updatedAt: new Date(2024, 0, (i % 30) + 1).toISOString(),
      })
    }

    return scenario
  }

  private getCorruptedDataScenario(): DatabaseMockScenario {
    const scenario = this.getDefaultScenario()
    scenario.name = 'corrupted-data'
    scenario.description = 'Scenario with corrupted/invalid data'

    // Add some corrupted records
    scenario.data.projects.push({
      _id: 999,
      name: '', // Invalid empty name
      description: null as any,
      createdAt: 'invalid-date',
      updatedAt: '2024-01-01T00:00:00Z',
    })

    return scenario
  }

  private getMigrationTestScenario(): DatabaseMockScenario {
    const scenario = this.getDefaultScenario()
    scenario.name = 'migration-test'
    scenario.description = 'Scenario for testing database migrations'

    // Add legacy data structures
    scenario.data.settings.push({
      key: 'legacy_setting',
      value: 'old_value',
      updatedAt: '2023-01-01T00:00:00Z',
    })

    return scenario
  }
}

// Export singleton instance
export const databaseMockService = new DatabaseMockService()
