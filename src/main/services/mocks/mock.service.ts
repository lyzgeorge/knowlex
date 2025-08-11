import type {
  Project,
  Conversation,
  Message,
  ProjectFile,
  TextChunk,
  ProjectMemory,
  KnowledgeCard,
  AppSettings,
  RAGResult,
  StreamResponse,
  DatabaseStats,
  SystemInfo,
  ProjectStats,
  SearchResult,
  FileProcessProgress,
  ConnectionTestResult,
  IPCError
} from '@shared'
import { IPC_ERROR_CODES } from '@shared'

// Mock 数据生成器接口
export interface MockDataGenerator<T> {
  generate(count?: number, options?: Record<string, unknown>): T[]
  generateOne(options?: Record<string, unknown>): T
}

// Mock 场景定义
export interface MockScenario {
  id: string
  name: string
  description: string
  data: {
    projects: Project[]
    conversations: Conversation[]
    messages: Message[]
    files: ProjectFile[]
    chunks: TextChunk[]
    memories: ProjectMemory[]
    knowledgeCards: KnowledgeCard[]
    settings: AppSettings[]
  }
}

// Mock 配置
export interface MockConfig {
  enabled: boolean
  scenario: string
  delays: {
    short: number // 100-300ms
    medium: number // 500-1000ms
    long: number // 1000-3000ms
  }
  errorRate: number // 0-1, 错误发生概率
  streamingChunkSize: number
  streamingDelay: number
}

// 默认 Mock 配置
const DEFAULT_MOCK_CONFIG: MockConfig = {
  enabled: true,
  scenario: 'default',
  delays: {
    short: 200,
    medium: 800,
    long: 2000
  },
  errorRate: 0.05, // 5% 错误率
  streamingChunkSize: 10,
  streamingDelay: 50
}

// Mock 数据生成器实现
class ProjectMockGenerator implements MockDataGenerator<Project> {
  generate(count = 5): Project[] {
    return Array.from({ length: count }, (_, i) => this.generateOne({ index: i }))
  }

  generateOne(options: { index?: number } = {}): Project {
    const { index = 0 } = options
    const now = new Date().toISOString()

    const projectNames = [
      'AI Research Project',
      'Web Development',
      'Data Analysis',
      'Machine Learning Study',
      'Product Documentation',
      'Technical Writing',
      'Software Architecture',
      'User Experience Design'
    ]

    const descriptions = [
      'Exploring the latest developments in artificial intelligence and machine learning.',
      'Building modern web applications with React and TypeScript.',
      'Analyzing large datasets to extract meaningful insights.',
      'Learning and implementing machine learning algorithms.',
      'Creating comprehensive documentation for our products.',
      'Writing technical articles and tutorials.',
      'Designing scalable software architecture patterns.',
      'Researching and improving user experience design.'
    ]

    return {
      id: `project-${index + 1}`,
      name: projectNames[index % projectNames.length],
      description: descriptions[index % descriptions.length],
      created_at: new Date(Date.now() - Math.random() * 30 * 24 * 60 * 60 * 1000).toISOString(),
      updated_at: now
    }
  }
}

class ConversationMockGenerator implements MockDataGenerator<Conversation> {
  generate(count = 10, options: { projectIds?: string[] } = {}): Conversation[] {
    return Array.from({ length: count }, (_, i) => this.generateOne({ index: i, ...options }))
  }

  generateOne(options: { index?: number; projectIds?: string[] } = {}): Conversation {
    const { index = 0, projectIds = [] } = options
    const now = new Date().toISOString()

    const titles = [
      'Getting Started with AI',
      'Vector Database Implementation',
      'React Component Design',
      'TypeScript Best Practices',
      'Database Optimization',
      'User Interface Improvements',
      'Performance Analysis',
      'Security Considerations',
      'Testing Strategies',
      'Deployment Planning'
    ]

    return {
      id: `conversation-${index + 1}`,
      project_id:
        projectIds.length > 0
          ? Math.random() > 0.3
            ? projectIds[Math.floor(Math.random() * projectIds.length)]
            : undefined
          : undefined,
      title: titles[index % titles.length],
      created_at: new Date(Date.now() - Math.random() * 7 * 24 * 60 * 60 * 1000).toISOString(),
      updated_at: now
    }
  }
}

class MessageMockGenerator implements MockDataGenerator<Message> {
  generate(count = 20, options: { conversationIds?: string[] } = {}): Message[] {
    return Array.from({ length: count }, (_, i) => this.generateOne({ index: i, ...options }))
  }

  generateOne(options: { index?: number; conversationIds?: string[] } = {}): Message {
    const { index = 0, conversationIds = ['conversation-1'] } = options

    const userMessages = [
      'How do I implement vector search in my application?',
      'What are the best practices for React component design?',
      'Can you explain how TypeScript interfaces work?',
      'How do I optimize database queries?',
      'What are the security considerations for web applications?',
      'How do I implement user authentication?',
      'What testing strategies should I use?',
      'How do I deploy my application to production?'
    ]

    const assistantMessages = [
      "Vector search can be implemented using embedding models and similarity calculations. Here's how you can get started...",
      'React component design follows several key principles: single responsibility, composition over inheritance, and proper state management...',
      'TypeScript interfaces define the shape of objects and provide compile-time type checking. They help ensure type safety...',
      'Database optimization involves several strategies: proper indexing, query optimization, connection pooling, and caching...',
      'Web application security requires attention to authentication, authorization, input validation, and protection against common attacks...',
      'User authentication can be implemented using various strategies: JWT tokens, session-based auth, OAuth, or third-party providers...',
      'Effective testing strategies include unit tests, integration tests, and end-to-end tests. Each serves a different purpose...',
      'Production deployment involves several considerations: environment configuration, monitoring, logging, and rollback strategies...'
    ]

    const isUser = index % 2 === 0
    const role = isUser ? 'user' : 'assistant'
    const content = isUser
      ? userMessages[Math.floor(index / 2) % userMessages.length]
      : assistantMessages[Math.floor(index / 2) % assistantMessages.length]

    return {
      id: `message-${index + 1}`,
      conversation_id: conversationIds[Math.floor(Math.random() * conversationIds.length)],
      role,
      content,
      files: isUser && Math.random() > 0.8 ? ['sample.txt'] : undefined,
      created_at: new Date(Date.now() - Math.random() * 24 * 60 * 60 * 1000).toISOString()
    }
  }
}

class ProjectFileMockGenerator implements MockDataGenerator<ProjectFile> {
  generate(count = 15, options: { projectIds?: string[] } = {}): ProjectFile[] {
    return Array.from({ length: count }, (_, i) => this.generateOne({ index: i, ...options }))
  }

  generateOne(options: { index?: number; projectIds?: string[] } = {}): ProjectFile {
    const { index = 0, projectIds = ['project-1'] } = options
    const now = new Date().toISOString()

    const filenames = [
      'README.md',
      'architecture.md',
      'api-documentation.md',
      'user-guide.md',
      'technical-specs.txt',
      'meeting-notes.md',
      'project-plan.md',
      'requirements.txt',
      'design-patterns.md',
      'troubleshooting.md'
    ]

    const statuses: ('processing' | 'completed' | 'failed')[] = [
      'completed',
      'completed',
      'completed',
      'processing',
      'failed'
    ]

    return {
      id: `file-${index + 1}`,
      project_id: projectIds[Math.floor(Math.random() * projectIds.length)],
      filename: filenames[index % filenames.length],
      filepath: `/projects/${projectIds[0]}/files/${filenames[index % filenames.length]}`,
      file_size: Math.floor(Math.random() * 50000) + 1000,
      file_hash: `hash-${index + 1}-${Math.random().toString(36).substring(7)}`,
      status: statuses[index % statuses.length],
      created_at: new Date(Date.now() - Math.random() * 14 * 24 * 60 * 60 * 1000).toISOString(),
      updated_at: now
    }
  }
}

class TextChunkMockGenerator implements MockDataGenerator<TextChunk> {
  generate(count = 50, options: { fileIds?: string[] } = {}): TextChunk[] {
    return Array.from({ length: count }, (_, i) => this.generateOne({ index: i, ...options }))
  }

  generateOne(options: { index?: number; fileIds?: string[] } = {}): TextChunk {
    const { index = 0, fileIds = ['file-1'] } = options

    const contents = [
      'Vector databases are specialized databases designed to store and query high-dimensional vectors efficiently.',
      'Machine learning models often produce embeddings as dense vector representations of data.',
      'Similarity search is a fundamental operation in vector databases, typically using cosine similarity or Euclidean distance.',
      'RAG (Retrieval-Augmented Generation) combines information retrieval with language generation.',
      'Embedding models convert text, images, or other data into numerical vector representations.',
      'Semantic search goes beyond keyword matching to understand the meaning and context of queries.',
      'Vector indexing techniques like HNSW and IVF enable fast approximate nearest neighbor search.',
      'Chunking strategies affect the quality of retrieval in RAG systems.',
      'Context window limitations require careful management of retrieved information.',
      'Fine-tuning embedding models can improve domain-specific search performance.'
    ]

    // Generate random embedding vector (384 dimensions for text-embedding-3-small)
    const embedding = Array.from({ length: 384 }, () => Math.random() * 2 - 1)

    return {
      id: `chunk-${index + 1}`,
      file_id: fileIds[Math.floor(Math.random() * fileIds.length)],
      content: contents[index % contents.length],
      chunk_index: index,
      embedding,
      metadata: {
        tokens: Math.floor(Math.random() * 100) + 50,
        language: 'en'
      },
      created_at: new Date().toISOString()
    }
  }
}

class ProjectMemoryMockGenerator implements MockDataGenerator<ProjectMemory> {
  generate(count = 8, options: { projectIds?: string[] } = {}): ProjectMemory[] {
    return Array.from({ length: count }, (_, i) => this.generateOne({ index: i, ...options }))
  }

  generateOne(options: { index?: number; projectIds?: string[] } = {}): ProjectMemory {
    const { index = 0, projectIds = ['project-1'] } = options
    const now = new Date().toISOString()

    const memories = [
      'This project focuses on building a desktop AI assistant with vector search capabilities.',
      'We are using libsql for the database with native vector support.',
      'The application is built with Electron, React, and TypeScript.',
      'RAG functionality is a core feature for contextual AI responses.',
      'All user data is stored locally for privacy and security.',
      'The UI follows atomic design principles with Chakra UI.',
      'We support both light and dark themes with internationalization.',
      'File processing includes text chunking and vectorization.'
    ]

    return {
      id: `memory-${index + 1}`,
      project_id: projectIds[Math.floor(Math.random() * projectIds.length)],
      type: index === 0 ? 'system' : 'user',
      content: memories[index % memories.length],
      created_at: new Date(Date.now() - Math.random() * 21 * 24 * 60 * 60 * 1000).toISOString(),
      updated_at: now
    }
  }
}

class KnowledgeCardMockGenerator implements MockDataGenerator<KnowledgeCard> {
  generate(count = 12, options: { projectIds?: string[] } = {}): KnowledgeCard[] {
    return Array.from({ length: count }, (_, i) => this.generateOne({ index: i, ...options }))
  }

  generateOne(options: { index?: number; projectIds?: string[] } = {}): KnowledgeCard {
    const { index = 0, projectIds = ['project-1'] } = options
    const now = new Date().toISOString()

    const titles = [
      'Vector Search Fundamentals',
      'RAG Implementation Guide',
      'Electron Architecture',
      'React Best Practices',
      'TypeScript Patterns',
      'Database Design',
      'UI/UX Principles',
      'Performance Optimization',
      'Security Guidelines',
      'Testing Strategies',
      'Deployment Checklist',
      'Troubleshooting Guide'
    ]

    const contents = [
      '# Vector Search Fundamentals\n\nVector search enables semantic similarity matching by converting data into high-dimensional vectors.\n\n## Key Concepts\n- Embeddings\n- Similarity metrics\n- Indexing strategies',
      '# RAG Implementation Guide\n\nRetrieval-Augmented Generation combines information retrieval with language generation.\n\n## Steps\n1. Document chunking\n2. Vector embedding\n3. Similarity search\n4. Context injection',
      '# Electron Architecture\n\nElectron enables cross-platform desktop apps using web technologies.\n\n## Process Model\n- Main process\n- Renderer process\n- Preload scripts',
      '# React Best Practices\n\nModern React development patterns and conventions.\n\n## Principles\n- Component composition\n- State management\n- Performance optimization',
      '# TypeScript Patterns\n\nCommon TypeScript patterns for better type safety.\n\n## Features\n- Interfaces\n- Generics\n- Utility types',
      '# Database Design\n\nPrinciples for designing efficient database schemas.\n\n## Considerations\n- Normalization\n- Indexing\n- Performance'
    ]

    const tagSets = [
      ['vector', 'search', 'embedding'],
      ['rag', 'retrieval', 'generation'],
      ['electron', 'desktop', 'architecture'],
      ['react', 'frontend', 'components'],
      ['typescript', 'types', 'patterns'],
      ['database', 'schema', 'design']
    ]

    return {
      id: `knowledge-${index + 1}`,
      project_id: projectIds[Math.floor(Math.random() * projectIds.length)],
      title: titles[index % titles.length],
      content:
        contents[index % contents.length] ||
        `# ${titles[index % titles.length]}\n\nContent for ${titles[index % titles.length]}`,
      tags: tagSets[index % tagSets.length],
      created_at: new Date(Date.now() - Math.random() * 28 * 24 * 60 * 60 * 1000).toISOString(),
      updated_at: now
    }
  }
}

// Mock 场景管理器
export class MockScenarioManager {
  private scenarios: Map<string, MockScenario> = new Map()
  private generators = {
    projects: new ProjectMockGenerator(),
    conversations: new ConversationMockGenerator(),
    messages: new MessageMockGenerator(),
    files: new ProjectFileMockGenerator(),
    chunks: new TextChunkMockGenerator(),
    memories: new ProjectMemoryMockGenerator(),
    knowledgeCards: new KnowledgeCardMockGenerator()
  }

  constructor() {
    this.initializeDefaultScenarios()
  }

  private initializeDefaultScenarios(): void {
    // 默认场景 - 中等数据量
    const defaultProjects = this.generators.projects.generate(5)
    const defaultConversations = this.generators.conversations.generate(15, {
      projectIds: defaultProjects.map((p) => p.id)
    })
    const defaultMessages = this.generators.messages.generate(60, {
      conversationIds: defaultConversations.map((c) => c.id)
    })
    const defaultFiles = this.generators.files.generate(20, {
      projectIds: defaultProjects.map((p) => p.id)
    })
    const defaultChunks = this.generators.chunks.generate(100, {
      fileIds: defaultFiles.map((f) => f.id)
    })
    const defaultMemories = this.generators.memories.generate(15, {
      projectIds: defaultProjects.map((p) => p.id)
    })
    const defaultKnowledgeCards = this.generators.knowledgeCards.generate(25, {
      projectIds: defaultProjects.map((p) => p.id)
    })

    this.scenarios.set('default', {
      id: 'default',
      name: 'Default Scenario',
      description: 'Medium-sized dataset with realistic content',
      data: {
        projects: defaultProjects,
        conversations: defaultConversations,
        messages: defaultMessages,
        files: defaultFiles,
        chunks: defaultChunks,
        memories: defaultMemories,
        knowledgeCards: defaultKnowledgeCards,
        settings: [
          {
            id: 'theme',
            key: 'theme',
            value: JSON.stringify('system'),
            updated_at: new Date().toISOString()
          },
          {
            id: 'language',
            key: 'language',
            value: JSON.stringify('en'),
            updated_at: new Date().toISOString()
          }
        ]
      }
    })

    // 空场景 - 新用户体验
    this.scenarios.set('empty', {
      id: 'empty',
      name: 'Empty Scenario',
      description: 'Clean slate for new user experience',
      data: {
        projects: [],
        conversations: [],
        messages: [],
        files: [],
        chunks: [],
        memories: [],
        knowledgeCards: [],
        settings: [
          {
            id: 'theme',
            key: 'theme',
            value: JSON.stringify('light'),
            updated_at: new Date().toISOString()
          },
          {
            id: 'language',
            key: 'language',
            value: JSON.stringify('zh'),
            updated_at: new Date().toISOString()
          }
        ]
      }
    })

    // 大数据场景 - 性能测试
    const largeProjects = this.generators.projects.generate(20)
    const largeConversations = this.generators.conversations.generate(100, {
      projectIds: largeProjects.map((p) => p.id)
    })
    const largeMessages = this.generators.messages.generate(500, {
      conversationIds: largeConversations.map((c) => c.id)
    })
    const largeFiles = this.generators.files.generate(80, {
      projectIds: largeProjects.map((p) => p.id)
    })
    const largeChunks = this.generators.chunks.generate(1000, {
      fileIds: largeFiles.map((f) => f.id)
    })

    this.scenarios.set('large', {
      id: 'large',
      name: 'Large Dataset',
      description: 'Large dataset for performance testing',
      data: {
        projects: largeProjects,
        conversations: largeConversations,
        messages: largeMessages,
        files: largeFiles,
        chunks: largeChunks,
        memories: this.generators.memories.generate(60, {
          projectIds: largeProjects.map((p) => p.id)
        }),
        knowledgeCards: this.generators.knowledgeCards.generate(120, {
          projectIds: largeProjects.map((p) => p.id)
        }),
        settings: [
          {
            id: 'theme',
            key: 'theme',
            value: JSON.stringify('dark'),
            updated_at: new Date().toISOString()
          }
        ]
      }
    })

    // 错误场景 - 错误处理测试
    this.scenarios.set('error', {
      id: 'error',
      name: 'Error Scenario',
      description: 'Scenario with various error conditions',
      data: {
        projects: this.generators.projects.generate(3),
        conversations: this.generators.conversations.generate(5),
        messages: this.generators.messages.generate(10),
        files: this.generators.files.generate(5).map((f) => ({ ...f, status: 'failed' as const })),
        chunks: [],
        memories: [],
        knowledgeCards: [],
        settings: []
      }
    })
  }

  getScenario(id: string): MockScenario | undefined {
    return this.scenarios.get(id)
  }

  getAllScenarios(): MockScenario[] {
    return Array.from(this.scenarios.values())
  }

  addScenario(scenario: MockScenario): void {
    this.scenarios.set(scenario.id, scenario)
  }

  removeScenario(id: string): boolean {
    return this.scenarios.delete(id)
  }
}

// Mock 服务主类
export class MockService {
  private static instance: MockService
  private config: MockConfig = DEFAULT_MOCK_CONFIG
  private scenarioManager = new MockScenarioManager()
  private currentScenario: MockScenario

  private constructor() {
    this.currentScenario =
      this.scenarioManager.getScenario(this.config.scenario) ||
      this.scenarioManager.getScenario('default')!
  }

  static getInstance(): MockService {
    if (!MockService.instance) {
      MockService.instance = new MockService()
    }
    return MockService.instance
  }

  // 配置管理
  getConfig(): MockConfig {
    return { ...this.config }
  }

  updateConfig(updates: Partial<MockConfig>): void {
    this.config = { ...this.config, ...updates }

    if (updates.scenario && updates.scenario !== this.currentScenario.id) {
      const newScenario = this.scenarioManager.getScenario(updates.scenario)
      if (newScenario) {
        this.currentScenario = newScenario
      }
    }
  }

  // 场景管理
  getCurrentScenario(): MockScenario {
    return this.currentScenario
  }

  switchScenario(scenarioId: string): boolean {
    const scenario = this.scenarioManager.getScenario(scenarioId)
    if (scenario) {
      this.currentScenario = scenario
      this.config.scenario = scenarioId
      return true
    }
    return false
  }

  getAvailableScenarios(): MockScenario[] {
    return this.scenarioManager.getAllScenarios()
  }

  // 延迟模拟
  async simulateDelay(type: 'short' | 'medium' | 'long' = 'medium'): Promise<void> {
    const baseDelay = this.config.delays[type]
    const variation = baseDelay * 0.3 // ±30% variation
    const delay = baseDelay + (Math.random() - 0.5) * variation

    await new Promise((resolve) => setTimeout(resolve, Math.max(50, delay)))
  }

  // 错误模拟
  shouldSimulateError(): boolean {
    return Math.random() < this.config.errorRate
  }

  generateMockError(code?: string, message?: string): IPCError {
    const errorCodes = [
      IPC_ERROR_CODES.DB_CONNECTION_ERROR,
      IPC_ERROR_CODES.DB_QUERY_ERROR,
      IPC_ERROR_CODES.LLM_API_ERROR,
      IPC_ERROR_CODES.FILE_NOT_FOUND,
      IPC_ERROR_CODES.TIMEOUT
    ]

    const errorMessages = [
      'Database connection failed',
      'Query execution error',
      'LLM API request failed',
      'File not found',
      'Request timeout'
    ]

    const randomIndex = Math.floor(Math.random() * errorCodes.length)

    return {
      code: code || errorCodes[randomIndex],
      message: message || errorMessages[randomIndex],
      details: {
        timestamp: new Date().toISOString(),
        mockError: true
      }
    }
  }

  // 数据访问方法
  getProjects(): Project[] {
    return [...this.currentScenario.data.projects]
  }

  getProject(id: string): Project | undefined {
    return this.currentScenario.data.projects.find((p) => p.id === id)
  }

  getConversations(projectId?: string): Conversation[] {
    const conversations = this.currentScenario.data.conversations
    if (projectId) {
      return conversations.filter((c) => c.project_id === projectId)
    }
    return [...conversations]
  }

  getConversation(id: string): Conversation | undefined {
    return this.currentScenario.data.conversations.find((c) => c.id === id)
  }

  getMessages(conversationId: string): Message[] {
    return this.currentScenario.data.messages.filter((m) => m.conversation_id === conversationId)
  }

  getMessage(id: string): Message | undefined {
    return this.currentScenario.data.messages.find((m) => m.id === id)
  }

  getProjectFiles(projectId: string): ProjectFile[] {
    return this.currentScenario.data.files.filter((f) => f.project_id === projectId)
  }

  getProjectFile(id: string): ProjectFile | undefined {
    return this.currentScenario.data.files.find((f) => f.id === id)
  }

  getTextChunks(fileId: string): TextChunk[] {
    return this.currentScenario.data.chunks.filter((c) => c.file_id === fileId)
  }

  getProjectMemories(projectId: string): ProjectMemory[] {
    return this.currentScenario.data.memories.filter((m) => m.project_id === projectId)
  }

  getKnowledgeCards(projectId: string): KnowledgeCard[] {
    return this.currentScenario.data.knowledgeCards.filter((k) => k.project_id === projectId)
  }

  getSettings(): AppSettings[] {
    return [...this.currentScenario.data.settings]
  }

  getSetting(key: string): AppSettings | undefined {
    return this.currentScenario.data.settings.find((s) => s.key === key)
  }

  // 统计信息生成
  generateDatabaseStats(): DatabaseStats {
    const data = this.currentScenario.data

    return {
      totalProjects: data.projects.length,
      totalConversations: data.conversations.length,
      totalMessages: data.messages.length,
      totalFiles: data.files.length,
      totalChunks: data.chunks.length,
      totalMemories: data.memories.length,
      totalKnowledgeCards: data.knowledgeCards.length,
      databaseSize: Math.floor(Math.random() * 100000000) + 10000000, // 10-110MB
      indexHealth: {
        vectorIndex: true,
        ftsIndex: true,
        primaryIndexes: true
      },
      lastOptimized: new Date(Date.now() - Math.random() * 7 * 24 * 60 * 60 * 1000).toISOString()
    }
  }

  generateSystemInfo(): SystemInfo {
    return {
      name: 'Knowlex Desktop',
      version: '0.1.0',
      platform: process.platform,
      arch: process.arch,
      nodeVersion: process.versions.node,
      electronVersion: process.versions.electron || '28.1.0',
      uptime: Math.floor(Math.random() * 86400), // 0-24 hours
      memoryUsage: {
        used: Math.floor(Math.random() * 500000000) + 100000000, // 100-600MB
        total: 8000000000, // 8GB
        free: Math.floor(Math.random() * 2000000000) + 1000000000 // 1-3GB
      },
      storageUsage: {
        used: Math.floor(Math.random() * 50000000000) + 10000000000, // 10-60GB
        total: 500000000000, // 500GB
        available: Math.floor(Math.random() * 100000000000) + 50000000000 // 50-150GB
      }
    }
  }

  generateProjectStats(projectId: string): ProjectStats {
    const conversations = this.getConversations(projectId)
    const files = this.getProjectFiles(projectId)
    const memories = this.getProjectMemories(projectId)
    const knowledgeCards = this.getKnowledgeCards(projectId)

    return {
      conversationCount: conversations.length,
      fileCount: files.length,
      memoryCount: memories.length,
      knowledgeCount: knowledgeCards.length,
      totalSize: files.reduce((sum, f) => sum + f.file_size, 0),
      lastActivity:
        conversations.length > 0
          ? conversations.sort(
              (a, b) => new Date(b.updated_at).getTime() - new Date(a.updated_at).getTime()
            )[0].updated_at
          : undefined
    }
  }

  // 搜索模拟
  simulateSearch(query: string, limit = 10): SearchResult[] {
    const results: SearchResult[] = []
    const data = this.currentScenario.data

    // 搜索消息
    data.messages.forEach((message) => {
      if (message.content.toLowerCase().includes(query.toLowerCase())) {
        const conversation = data.conversations.find((c) => c.id === message.conversation_id)
        const project = conversation?.project_id
          ? data.projects.find((p) => p.id === conversation.project_id)
          : undefined

        results.push({
          id: message.id,
          type: 'message',
          title: conversation?.title || 'Untitled Conversation',
          content: message.content,
          highlight: this.highlightQuery(message.content, query),
          score: this.calculateSearchScore(message.content, query),
          projectId: project?.id,
          projectName: project?.name,
          timestamp: message.created_at,
          metadata: {
            role: message.role,
            conversationId: message.conversation_id
          }
        })
      }
    })

    // 搜索知识卡片
    data.knowledgeCards.forEach((card) => {
      if (
        card.title.toLowerCase().includes(query.toLowerCase()) ||
        card.content.toLowerCase().includes(query.toLowerCase())
      ) {
        const project = data.projects.find((p) => p.id === card.project_id)

        results.push({
          id: card.id,
          type: 'knowledge',
          title: card.title,
          content: card.content.substring(0, 200) + '...',
          highlight: this.highlightQuery(card.title + ' ' + card.content, query),
          score: this.calculateSearchScore(card.title + ' ' + card.content, query),
          projectId: project?.id,
          projectName: project?.name,
          timestamp: card.updated_at,
          metadata: {
            tags: card.tags
          }
        })
      }
    })

    // 按分数排序并限制结果数量
    return results.sort((a, b) => (b.score || 0) - (a.score || 0)).slice(0, limit)
  }

  private highlightQuery(text: string, query: string): string {
    const regex = new RegExp(`(${query})`, 'gi')
    return text.replace(regex, '<mark>$1</mark>')
  }

  private calculateSearchScore(text: string, query: string): number {
    const lowerText = text.toLowerCase()
    const lowerQuery = query.toLowerCase()

    // 简单的评分算法
    let score = 0

    // 完全匹配
    if (lowerText.includes(lowerQuery)) {
      score += 10
    }

    // 单词匹配
    const queryWords = lowerQuery.split(' ')
    queryWords.forEach((word) => {
      if (lowerText.includes(word)) {
        score += 5
      }
    })

    // 位置权重（越靠前分数越高）
    const index = lowerText.indexOf(lowerQuery)
    if (index !== -1) {
      score += Math.max(0, 5 - index / 10)
    }

    return score
  }

  // RAG 搜索模拟
  simulateRAGSearch(queryEmbedding: number[], projectId?: string, limit = 10): RAGResult[] {
    const chunks = projectId
      ? this.currentScenario.data.chunks.filter((c) => {
          const file = this.currentScenario.data.files.find((f) => f.id === c.file_id)
          return file?.project_id === projectId
        })
      : this.currentScenario.data.chunks

    const results = chunks
      .filter((chunk) => chunk.embedding)
      .map((chunk) => {
        const file = this.currentScenario.data.files.find((f) => f.id === chunk.file_id)!
        const similarity = this.calculateCosineSimilarity(queryEmbedding, chunk.embedding!)

        return {
          content: chunk.content,
          filename: file.filename,
          score: similarity,
          chunk_index: chunk.chunk_index,
          fileId: chunk.file_id,
          projectId: file.project_id
        }
      })
      .sort((a, b) => b.score - a.score)
      .slice(0, limit)

    return results
  }

  private calculateCosineSimilarity(a: number[], b: number[]): number {
    if (a.length !== b.length) return 0

    let dotProduct = 0
    let normA = 0
    let normB = 0

    for (let i = 0; i < a.length; i++) {
      dotProduct += a[i] * b[i]
      normA += a[i] * a[i]
      normB += b[i] * b[i]
    }

    return dotProduct / (Math.sqrt(normA) * Math.sqrt(normB))
  }

  // 流式响应模拟
  async *simulateStreamingResponse(prompt: string): AsyncGenerator<StreamResponse> {
    const responses = [
      "I understand you're asking about ",
      prompt.substring(0, 20) + '... ',
      'Let me provide you with a comprehensive answer.\n\n',
      'Based on the context and information available, ',
      'here are the key points to consider:\n\n',
      '1. **First Point**: This is an important aspect that ',
      'relates directly to your question about the topic.\n\n',
      '2. **Second Point**: Another crucial element is ',
      'the way this integrates with existing systems.\n\n',
      "3. **Third Point**: Finally, it's worth noting that ",
      'best practices suggest implementing this approach ',
      'with careful consideration of performance and scalability.\n\n',
      'I hope this helps clarify the topic for you. ',
      'Feel free to ask if you need more specific details!'
    ]

    const id = `stream-${Date.now()}`

    for (let i = 0; i < responses.length; i++) {
      await this.simulateDelay('short')

      if (this.shouldSimulateError() && i > 5) {
        yield {
          id,
          type: 'error',
          error: this.generateMockError(IPC_ERROR_CODES.LLM_API_ERROR, 'Streaming response failed')
        }
        return
      }

      yield {
        id,
        type: 'token',
        content: responses[i],
        metadata: {
          index: i,
          total: responses.length
        }
      }
    }

    yield {
      id,
      type: 'complete',
      metadata: {
        totalTokens: responses.join('').length,
        completionTime: Date.now()
      }
    }
  }

  // 文件处理进度模拟
  async *simulateFileProcessing(filename: string): AsyncGenerator<FileProcessProgress> {
    const fileId = `file-${Date.now()}`
    const stages = [
      { status: 'uploading' as const, stage: 'Uploading file', progress: 0 },
      { status: 'processing' as const, stage: 'Processing file', progress: 25 },
      { status: 'chunking' as const, stage: 'Chunking text', progress: 50 },
      { status: 'vectorizing' as const, stage: 'Generating embeddings', progress: 75 },
      { status: 'completed' as const, stage: 'Processing complete', progress: 100 }
    ]

    for (let i = 0; i < stages.length; i++) {
      await this.simulateDelay('medium')

      if (this.shouldSimulateError() && i === 3) {
        yield {
          fileId,
          filename,
          status: 'failed',
          progress: stages[i].progress,
          error: 'Vectorization failed: API rate limit exceeded',
          stage: stages[i].stage,
          totalStages: stages.length,
          currentStage: i + 1
        }
        return
      }

      yield {
        fileId,
        filename,
        status: stages[i].status,
        progress: stages[i].progress,
        stage: stages[i].stage,
        totalStages: stages.length,
        currentStage: i + 1
      }
    }
  }

  // 连接测试模拟
  async simulateConnectionTest(config: any): Promise<ConnectionTestResult> {
    await this.simulateDelay('medium')

    if (this.shouldSimulateError()) {
      return {
        success: false,
        error: 'Connection failed: Invalid API key or network error',
        details: {
          statusCode: 401,
          timestamp: new Date().toISOString()
        }
      }
    }

    return {
      success: true,
      latency: Math.floor(Math.random() * 500) + 100, // 100-600ms
      details: {
        model: config.model || 'gpt-3.5-turbo',
        provider: 'openai',
        timestamp: new Date().toISOString()
      }
    }
  }
}
