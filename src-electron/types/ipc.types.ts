/**
 * IPC Types and Interfaces
 *
 * This file defines all IPC channel interfaces, message types, and communication protocols
 * for the Knowlex desktop application.
 */

// Base IPC message structure
export interface IPCMessage<T = any> {
  id: string
  timestamp: number
  data: T
}

export interface IPCResponse<T = any> {
  id: string
  success: boolean
  data?: T
  error?: IPCError
  timestamp: number
}

export interface IPCError {
  code: string
  message: string
  details?: any
}

// Stream control types
export interface StreamChunk<T = any> {
  id: string
  sequence: number
  data: T
  isLast: boolean
  timestamp: number
}

export interface StreamControl {
  chunkSize: number
  throttleMs: number
  maxBufferSize: number
}

// Chat-related types
export interface ChatMessage {
  id: string
  conversationId: string
  role: 'user' | 'assistant' | 'system' | 'tool'
  content: string
  fileReferences?: string[]
  toolCalls?: any[]
  metadata?: Record<string, any>
  createdAt: string
}

export interface SendMessageRequest {
  conversationId?: string
  projectId?: number
  message: string
  files?: File[]
  ragEnabled?: boolean
  systemPrompt?: string
}

export interface StreamResponseChunk {
  conversationId: string
  messageId: string
  content: string
  isComplete: boolean
  sources?: string[]
}

// Project-related types
export interface Project {
  id: number
  name: string
  description?: string
  createdAt: string
  updatedAt: string
}

export interface CreateProjectRequest {
  name: string
  description?: string
}

export interface UpdateProjectRequest {
  id: number
  name?: string
  description?: string
}

// File-related types
export interface ProjectFile {
  id: number
  projectId: number
  filename: string
  originalPath: string
  pdfPath: string
  fileSize: number
  md5Original: string
  md5Pdf: string
  status: 'processing' | 'completed' | 'failed'
  createdAt: string
}

export interface FileUploadRequest {
  projectId: number
  files: File[]
}

export interface FileProcessStatus {
  fileId: number
  status: 'processing' | 'completed' | 'failed'
  progress?: number
  error?: string
}

// Database-related types
export interface DatabaseQuery {
  sql: string
  params?: any[]
}

export interface DatabaseTransaction {
  queries: DatabaseQuery[]
}

// Settings-related types
export interface AppSettings {
  chatApi: {
    apiKey: string
    baseUrl: string
    model: string
  }
  embeddingApi: {
    apiKey: string
    baseUrl: string
    model: string
  }
  theme: 'light' | 'dark' | 'system'
  language: 'en' | 'zh'
  ragSettings: {
    enabled: boolean
    topK: number
    threshold: number
  }
  rerankSettings?: {
    enabled: boolean
    modelName: string
    apiKey: string
    baseUrl: string
  }
}

export interface TestAPIRequest {
  type: 'chat' | 'embedding' | 'rerank'
  config: {
    apiKey: string
    baseUrl: string
    model: string
  }
}

// Search-related types
export interface FullTextSearchRequest {
  query: string
  limit?: number
  offset?: number
}

export interface VectorSearchRequest {
  query: string
  projectId: number
  topK?: number
  threshold?: number
}

export interface SearchResult {
  conversationId: string
  title: string
  projectId?: number
  projectName?: string
  snippet: string
  createdAt: string
}

// Memory and Knowledge types
export interface ProjectMemory {
  id: number
  projectId: number
  content: string
  type: 'memory' | 'description'
  isSystem: boolean
  createdAt: string
}

export interface ProjectKnowledge {
  id: number
  projectId: number
  title: string
  content: string
  createdAt: string
  updatedAt: string
}

// IPC Channel definitions
export const IPC_CHANNELS = {
  // Chat channels
  CHAT_SEND_MESSAGE: 'chat:send-message',
  CHAT_STREAM_RESPONSE: 'chat:stream-response',
  CHAT_GENERATE_TITLE: 'chat:generate-title',
  CHAT_GENERATE_SUMMARY: 'chat:generate-summary',
  CHAT_STOP_STREAM: 'chat:stop-stream',

  // Project channels
  PROJECT_CREATE: 'project:create',
  PROJECT_LIST: 'project:list',
  PROJECT_GET: 'project:get',
  PROJECT_UPDATE: 'project:update',
  PROJECT_DELETE: 'project:delete',

  // Conversation channels
  CONVERSATION_LIST: 'conversation:list',
  CONVERSATION_GET: 'conversation:get',
  CONVERSATION_UPDATE: 'conversation:update',
  CONVERSATION_DELETE: 'conversation:delete',
  CONVERSATION_MOVE: 'conversation:move',

  // File channels
  FILE_UPLOAD: 'file:upload',
  FILE_LIST: 'file:list',
  FILE_DELETE: 'file:delete',
  FILE_PROCESS_STATUS: 'file:process-status',
  FILE_PREVIEW: 'file:preview',

  // Memory and Knowledge channels
  MEMORY_LIST: 'memory:list',
  MEMORY_CREATE: 'memory:create',
  MEMORY_UPDATE: 'memory:update',
  MEMORY_DELETE: 'memory:delete',
  KNOWLEDGE_LIST: 'knowledge:list',
  KNOWLEDGE_CREATE: 'knowledge:create',
  KNOWLEDGE_UPDATE: 'knowledge:update',
  KNOWLEDGE_DELETE: 'knowledge:delete',

  // Database channels
  DB_QUERY: 'db:query',
  DB_TRANSACTION: 'db:transaction',

  // Settings channels
  SETTINGS_GET: 'settings:get',
  SETTINGS_SET: 'settings:set',
  SETTINGS_TEST_API: 'settings:test-api',

  // Search channels
  SEARCH_FULLTEXT: 'search:fulltext',
  SEARCH_VECTOR: 'search:vector',

  // System channels
  SYSTEM_GET_INFO: 'system:get-info',
  SYSTEM_GET_LOGS: 'system:get-logs',
  SYSTEM_CLEAR_CACHE: 'system:clear-cache',
} as const

export type IPCChannel = (typeof IPC_CHANNELS)[keyof typeof IPC_CHANNELS]

// Stream event types
export const STREAM_EVENTS = {
  DATA: 'stream:data',
  ERROR: 'stream:error',
  END: 'stream:end',
  PAUSE: 'stream:pause',
  RESUME: 'stream:resume',
} as const

export type StreamEvent = (typeof STREAM_EVENTS)[keyof typeof STREAM_EVENTS]
