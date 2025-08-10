// IPC 通信接口定义
export interface IPCRequest<T = any> {
  id: string
  channel: string
  data: T
  timestamp: number
  version?: string
}

export interface IPCResponse<T = any> {
  id: string
  success: boolean
  data?: T
  error?: IPCError
  timestamp: number
  version?: string
}

// IPC 错误接口
export interface IPCError {
  code: string
  message: string
  details?: any
  stack?: string
}

// IPC 流式数据接口
export interface IPCStreamData<T = any> {
  id: string
  channel: string
  type: 'start' | 'data' | 'end' | 'error'
  data?: T
  error?: IPCError
  timestamp: number
}

// IPC 事件接口
export interface IPCEvent<T = any> {
  channel: string
  data: T
  timestamp: number
}

// IPC 通道定义
export const IPC_CHANNELS = {
  // 系统相关
  PING: 'system:ping',
  GET_APP_INFO: 'system:app-info',

  // 数据库相关
  DB_HEALTH_CHECK: 'database:health-check',
  DB_STATS: 'database:stats',
  DB_INSERT_VECTOR: 'database:insert-vector',
  DB_SEARCH_VECTORS: 'database:search-vectors',
  DB_DELETE_VECTOR: 'database:delete-vector',
  DB_CREATE_SAMPLE: 'database:create-sample-data',
  DB_CLEAR_ALL: 'database:clear-all-data',
  DB_RESET: 'database:reset-database',

  // 项目相关
  PROJECT_CREATE: 'project:create',
  PROJECT_LIST: 'project:list',
  PROJECT_GET: 'project:get',
  PROJECT_UPDATE: 'project:update',
  PROJECT_DELETE: 'project:delete',
  PROJECT_STATS: 'project:stats',

  // 对话相关
  CONVERSATION_CREATE: 'conversation:create',
  CONVERSATION_LIST: 'conversation:list',
  CONVERSATION_GET: 'conversation:get',
  CONVERSATION_UPDATE: 'conversation:update',
  CONVERSATION_DELETE: 'conversation:delete',
  CONVERSATION_MOVE: 'conversation:move',

  // 消息相关
  MESSAGE_SEND: 'message:send',
  MESSAGE_LIST: 'message:list',
  MESSAGE_EDIT: 'message:edit',
  MESSAGE_DELETE: 'message:delete',
  MESSAGE_REGENERATE: 'message:regenerate',

  // 文件相关
  FILE_UPLOAD: 'file:upload',
  FILE_LIST: 'file:list',
  FILE_GET: 'file:get',
  FILE_DELETE: 'file:delete',
  FILE_PREVIEW: 'file:preview',

  // LLM 相关
  LLM_CHAT: 'llm:chat',
  LLM_STREAM: 'llm:stream',
  LLM_EMBEDDING: 'llm:embedding',
  LLM_TEST_CONNECTION: 'llm:test-connection',

  // RAG 相关
  RAG_SEARCH: 'rag:search',
  RAG_PROCESS_FILE: 'rag:process-file',

  // 知识管理相关
  MEMORY_CREATE: 'memory:create',
  MEMORY_LIST: 'memory:list',
  MEMORY_UPDATE: 'memory:update',
  MEMORY_DELETE: 'memory:delete',

  KNOWLEDGE_CREATE: 'knowledge:create',
  KNOWLEDGE_LIST: 'knowledge:list',
  KNOWLEDGE_UPDATE: 'knowledge:update',
  KNOWLEDGE_DELETE: 'knowledge:delete',

  // 搜索相关
  SEARCH_GLOBAL: 'search:global',

  // 设置相关
  SETTINGS_GET: 'settings:get',
  SETTINGS_SET: 'settings:set',
  SETTINGS_GET_ALL: 'settings:get-all',

  // Mock 管理相关 (开发模式)
  MOCK_STATUS: 'mock:status',
  MOCK_HEALTH: 'mock:health',
  MOCK_SWITCH_SCENARIO: 'mock:switch-scenario',
  MOCK_LIST_SCENARIOS: 'mock:list-scenarios',
  MOCK_EXECUTE_COMMAND: 'mock:execute-command'
} as const

// IPC 流式通道定义
export const IPC_STREAM_CHANNELS = {
  // LLM 流式响应
  LLM_STREAM_RESPONSE: 'stream:llm-response',

  // 文件处理进度
  FILE_PROCESS_PROGRESS: 'stream:file-progress',

  // 向量化进度
  VECTOR_PROCESS_PROGRESS: 'stream:vector-progress',

  // 搜索进度
  SEARCH_PROGRESS: 'stream:search-progress'
} as const

// IPC 事件通道定义
export const IPC_EVENT_CHANNELS = {
  // 数据库事件
  DB_CONNECTED: 'event:db-connected',
  DB_DISCONNECTED: 'event:db-disconnected',

  // 文件事件
  FILE_UPLOADED: 'event:file-uploaded',
  FILE_PROCESSED: 'event:file-processed',
  FILE_DELETED: 'event:file-deleted',

  // 项目事件
  PROJECT_CREATED: 'event:project-created',
  PROJECT_UPDATED: 'event:project-updated',
  PROJECT_DELETED: 'event:project-deleted',

  // 对话事件
  CONVERSATION_CREATED: 'event:conversation-created',
  CONVERSATION_UPDATED: 'event:conversation-updated',
  CONVERSATION_DELETED: 'event:conversation-deleted',

  // 系统事件
  APP_READY: 'event:app-ready',
  THEME_CHANGED: 'event:theme-changed'
} as const

// 数据库实体类型
export interface Project {
  id: string
  name: string
  description?: string
  created_at: string
  updated_at: string
}

export interface Conversation {
  id: string
  project_id?: string
  title: string
  created_at: string
  updated_at: string
}

export interface Message {
  id: string
  conversation_id: string
  role: 'user' | 'assistant'
  content: string
  files?: string[]
  created_at: string
}

export interface ProjectFile {
  id: string
  project_id: string
  filename: string
  filepath: string
  file_size: number
  file_hash: string
  status: 'processing' | 'completed' | 'failed'
  created_at: string
  updated_at: string
}

export interface TextChunk {
  id: string
  file_id: string
  content: string
  chunk_index: number
  embedding?: number[] // Will be stored as VECTOR type in libsql
  metadata?: Record<string, any>
  created_at: string
}

export interface ProjectMemory {
  id: string
  project_id: string
  type: 'user' | 'system'
  content: string
  created_at: string
  updated_at: string
}

export interface KnowledgeCard {
  id: string
  project_id: string
  title: string
  content: string
  tags?: string[]
  created_at: string
  updated_at: string
}

export interface AppSettings {
  id: string
  key: string
  value: string
  updated_at: string
}

// API 配置类型
export interface OpenAIConfig {
  apiKey: string
  baseURL?: string
  model: string
  embeddingModel: string
  timeout?: number
  maxRetries?: number
}

// 应用配置类型
export interface AppConfig {
  theme: 'light' | 'dark' | 'system'
  language: 'zh' | 'en'
  openai: OpenAIConfig
  features: {
    ragEnabled: boolean
    streamingEnabled: boolean
    debugMode: boolean
  }
  storage: {
    maxFileSize: number
    maxFilesPerProject: number
    cacheSize: number
  }
}

// 聊天相关类型
export interface ChatMessage {
  role: 'user' | 'assistant' | 'system'
  content: string
  files?: FileInfo[]
  metadata?: Record<string, any>
}

export interface FileInfo {
  name: string
  content: string
  size: number
  type?: string
  lastModified?: number
}

// RAG 相关类型
export interface RAGResult {
  content: string
  filename: string
  score: number
  chunk_index: number
  fileId: string
  projectId: string
}

// 流式响应数据类型
export interface StreamResponse {
  id: string
  type: 'token' | 'complete' | 'error'
  content?: string
  error?: IPCError
  metadata?: Record<string, any>
}

// 错误类型
export interface KnowlexError {
  code: string
  message: string
  details?: any
}

// IPC 验证错误类型
export const IPC_ERROR_CODES = {
  // 通用错误
  UNKNOWN_ERROR: 'UNKNOWN_ERROR',
  INVALID_REQUEST: 'INVALID_REQUEST',
  INVALID_CHANNEL: 'INVALID_CHANNEL',
  INVALID_DATA: 'INVALID_DATA',
  TIMEOUT: 'TIMEOUT',

  // 数据库错误
  DB_CONNECTION_ERROR: 'DB_CONNECTION_ERROR',
  DB_QUERY_ERROR: 'DB_QUERY_ERROR',
  DB_MIGRATION_ERROR: 'DB_MIGRATION_ERROR',

  // 文件错误
  FILE_NOT_FOUND: 'FILE_NOT_FOUND',
  FILE_PERMISSION_ERROR: 'FILE_PERMISSION_ERROR',
  FILE_SIZE_EXCEEDED: 'FILE_SIZE_EXCEEDED',
  FILE_TYPE_NOT_SUPPORTED: 'FILE_TYPE_NOT_SUPPORTED',

  // LLM 错误
  LLM_API_ERROR: 'LLM_API_ERROR',
  LLM_RATE_LIMIT: 'LLM_RATE_LIMIT',
  LLM_INVALID_CONFIG: 'LLM_INVALID_CONFIG',

  // RAG 错误
  RAG_PROCESSING_ERROR: 'RAG_PROCESSING_ERROR',
  RAG_SEARCH_ERROR: 'RAG_SEARCH_ERROR',

  // 权限错误
  PERMISSION_DENIED: 'PERMISSION_DENIED',
  AUTHENTICATION_REQUIRED: 'AUTHENTICATION_REQUIRED'
} as const

export type IPCErrorCode = (typeof IPC_ERROR_CODES)[keyof typeof IPC_ERROR_CODES]

// IPC 处理器接口
export interface IPCHandler<TRequest = any, TResponse = any> {
  handle(data: TRequest): Promise<TResponse> | TResponse
  validate?(data: TRequest): boolean
}

// IPC 流式处理器接口
export interface IPCStreamHandler<TRequest = any, TData = any> {
  handle(
    data: TRequest,
    emit: (data: TData) => void,
    complete: () => void,
    error: (error: IPCError) => void
  ): Promise<void> | void
  validate?(data: TRequest): boolean
}

// IPC 中间件接口
export interface IPCMiddleware {
  before?(request: IPCRequest): Promise<IPCRequest> | IPCRequest
  after?(response: IPCResponse): Promise<IPCResponse> | IPCResponse
  error?(error: Error, request: IPCRequest): Promise<IPCResponse> | IPCResponse
}

// IPC 配置接口
export interface IPCConfig {
  timeout?: number
  retries?: number
  middleware?: IPCMiddleware[]
  validateRequests?: boolean
  enableLogging?: boolean
}

// 业务数据类型
export interface CreateProjectRequest {
  name: string
  description?: string
}

export interface UpdateProjectRequest {
  id: string
  name?: string
  description?: string
}

export interface CreateConversationRequest {
  projectId?: string
  title?: string
}

export interface SendMessageRequest {
  conversationId: string
  content: string
  files?: FileInfo[]
  metadata?: {
    parentMessageId?: string
    temperature?: number
    maxTokens?: number
  }
}

export interface EditMessageRequest {
  messageId: string
  content: string
  files?: FileInfo[]
}

export interface RegenerateMessageRequest {
  messageId: string
  temperature?: number
  maxTokens?: number
}

export interface UploadFileRequest {
  projectId: string
  files: { name: string; content: Buffer | string; size: number; path?: string }[]
  options?: {
    overwrite?: boolean
    processImmediately?: boolean
  }
}

export interface SearchRequest {
  query: string
  type?: 'global' | 'project' | 'files' | 'knowledge'
  projectId?: string
  limit?: number
  offset?: number
  filters?: {
    fileTypes?: string[]
    dateRange?: {
      start: string
      end: string
    }
    minScore?: number
  }
}

export interface EmbeddingRequest {
  texts: string[]
  model?: string
  options?: {
    dimensions?: number
    encodingFormat?: 'float' | 'base64'
  }
}

export interface ChatRequest {
  messages: ChatMessage[]
  model?: string
  temperature?: number
  maxTokens?: number
  stream?: boolean
  projectId?: string
  conversationId?: string
}

// 响应数据类型
export interface ProjectStats {
  conversationCount: number
  fileCount: number
  memoryCount: number
  knowledgeCount: number
  totalSize: number
  lastActivity?: string
}

export interface SearchResult {
  id: string
  type: 'conversation' | 'message' | 'file' | 'knowledge'
  title: string
  content: string
  highlight: string
  score?: number
  projectId?: string
  projectName?: string
  timestamp: string
  metadata?: Record<string, any>
}

export interface FileProcessProgress {
  fileId: string
  filename: string
  status: 'uploading' | 'processing' | 'chunking' | 'vectorizing' | 'completed' | 'failed'
  progress: number
  error?: string
  stage?: string
  totalStages?: number
  currentStage?: number
}

export interface DatabaseStats {
  totalProjects: number
  totalConversations: number
  totalMessages: number
  totalFiles: number
  totalChunks: number
  totalMemories: number
  totalKnowledgeCards: number
  databaseSize: number
  indexHealth: {
    vectorIndex: boolean
    ftsIndex: boolean
    primaryIndexes: boolean
  }
  lastOptimized?: string
}

export interface SystemInfo {
  name: string
  version: string
  platform: string
  arch: string
  nodeVersion: string
  electronVersion: string
  uptime: number
  memoryUsage: {
    used: number
    total: number
    free: number
  }
  storageUsage: {
    used: number
    total: number
    available: number
  }
}

export interface ValidationResult {
  valid: boolean
  errors: string[]
  warnings?: string[]
}

export interface BackupInfo {
  id: string
  timestamp: string
  size: number
  type: 'manual' | 'automatic'
  description?: string
}

export interface ConnectionTestResult {
  success: boolean
  latency?: number
  error?: string
  details?: Record<string, any>
}
