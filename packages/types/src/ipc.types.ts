/**
 * IPC communication types and channel definitions
 */

import { Project, Conversation, Message, ProjectFile } from './database.types'
import { AppSettings, TestAPIRequest, TestAPIResponse } from './api.types'
import { APIResponse, PaginatedResponse, FileMetadata } from './common.types'

// Base IPC message structure
export interface IPCMessage<T = unknown> {
  id: string
  timestamp: number
  data: T
  version?: string
}

export interface IPCResponse<T = unknown> {
  id: string
  success: boolean
  data?: T
  error?: IPCError
  timestamp: number
  version?: string
}

export interface IPCError {
  code: string
  message: string
  details?: unknown
}

// Stream control types
export interface StreamChunk<T = unknown> {
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

// Request/Response types for each IPC channel

// Chat requests
export interface SendMessageRequest {
  conversationId?: string
  projectId?: number
  message: string
  files?: FileMetadata[]
  ragEnabled?: boolean
  systemPrompt?: string
}

export interface StreamResponseChunk {
  conversationId: string
  messageId: string
  content: string
  isComplete: boolean
  sources?: Array<{
    fileId: number
    filename: string
    snippet: string
    score: number
  }>
}

export interface GenerateTitleRequest {
  conversationId: string
  messages: Message[]
}

export interface GenerateSummaryRequest {
  conversationId: string
  messages: Message[]
  maxTokens?: number
}

// Project requests
export interface CreateProjectRequest {
  name: string
  description?: string
}

export interface UpdateProjectRequest {
  id: number
  name?: string
  description?: string
}

export interface DeleteProjectRequest {
  id: number
}

// Conversation requests
export interface UpdateConversationRequest {
  id: string
  title?: string
  projectId?: number
}

export interface MoveConversationRequest {
  id: string
  projectId?: number
}

// File requests
export interface FileUploadRequest {
  projectId: number
  files: FileMetadata[]
}

export interface FileDeleteRequest {
  id: number
}

export interface FilePreviewRequest {
  id: number
}

// Memory and Knowledge requests
export interface CreateMemoryRequest {
  projectId: number
  content: string
  type?: 'memory' | 'description'
}

export interface UpdateMemoryRequest {
  id: number
  content: string
}

export interface CreateKnowledgeRequest {
  projectId: number
  title: string
  content: string
}

export interface UpdateKnowledgeRequest {
  id: number
  title?: string
  content?: string
}

// Search requests
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

// Database requests
export interface DatabaseQuery {
  sql: string
  params?: unknown[]
}

export interface DatabaseTransaction {
  queries: DatabaseQuery[]
}

// Settings requests
export interface GetSettingsRequest {
  keys?: string[]
}

export interface SetSettingsRequest {
  settings: Partial<AppSettings>
}

// System requests
export interface SystemInfo {
  platform: string
  arch: string
  version: string
  appVersion: string
  dataPath: string
}

// IPC Channel definitions with versioning
export const IPC_CHANNELS = {
  // Chat channels (v1.0.0)
  CHAT_SEND_MESSAGE: 'chat:send-message@v1.0.0',
  CHAT_STREAM_RESPONSE: 'chat:stream-response@v1.0.0',
  CHAT_GENERATE_TITLE: 'chat:generate-title@v1.0.0',
  CHAT_GENERATE_SUMMARY: 'chat:generate-summary@v1.0.0',
  CHAT_STOP_STREAM: 'chat:stop-stream@v1.0.0',

  // Project channels (v1.0.0)
  PROJECT_CREATE: 'project:create@v1.0.0',
  PROJECT_LIST: 'project:list@v1.0.0',
  PROJECT_GET: 'project:get@v1.0.0',
  PROJECT_UPDATE: 'project:update@v1.0.0',
  PROJECT_DELETE: 'project:delete@v1.0.0',

  // Conversation channels (v1.0.0)
  CONVERSATION_LIST: 'conversation:list@v1.0.0',
  CONVERSATION_GET: 'conversation:get@v1.0.0',
  CONVERSATION_UPDATE: 'conversation:update@v1.0.0',
  CONVERSATION_DELETE: 'conversation:delete@v1.0.0',
  CONVERSATION_MOVE: 'conversation:move@v1.0.0',

  // File channels (v1.0.0)
  FILE_UPLOAD: 'file:upload@v1.0.0',
  FILE_LIST: 'file:list@v1.0.0',
  FILE_DELETE: 'file:delete@v1.0.0',
  FILE_PROCESS_STATUS: 'file:process-status@v1.0.0',
  FILE_PREVIEW: 'file:preview@v1.0.0',

  // Memory and Knowledge channels (v1.0.0)
  MEMORY_LIST: 'memory:list@v1.0.0',
  MEMORY_CREATE: 'memory:create@v1.0.0',
  MEMORY_UPDATE: 'memory:update@v1.0.0',
  MEMORY_DELETE: 'memory:delete@v1.0.0',
  KNOWLEDGE_LIST: 'knowledge:list@v1.0.0',
  KNOWLEDGE_CREATE: 'knowledge:create@v1.0.0',
  KNOWLEDGE_UPDATE: 'knowledge:update@v1.0.0',
  KNOWLEDGE_DELETE: 'knowledge:delete@v1.0.0',

  // Database channels (v1.0.0)
  DB_QUERY: 'db:query@v1.0.0',
  DB_TRANSACTION: 'db:transaction@v1.0.0',

  // Settings channels (v1.0.0)
  SETTINGS_GET: 'settings:get@v1.0.0',
  SETTINGS_SET: 'settings:set@v1.0.0',
  SETTINGS_TEST_API: 'settings:test-api@v1.0.0',

  // Search channels (v1.0.0)
  SEARCH_FULLTEXT: 'search:fulltext@v1.0.0',
  SEARCH_VECTOR: 'search:vector@v1.0.0',

  // System channels (v1.0.0)
  SYSTEM_GET_INFO: 'system:get-info@v1.0.0',
  SYSTEM_GET_LOGS: 'system:get-logs@v1.0.0',
  SYSTEM_CLEAR_CACHE: 'system:clear-cache@v1.0.0',

  // Test channels (development only)
  TEST_ECHO: 'test:echo@v1.0.0',
  TEST_PING: 'test:ping@v1.0.0',
  TEST_ERROR: 'test:error@v1.0.0',
  TEST_VALIDATION: 'test:validation@v1.0.0',
  TEST_STREAM: 'test:stream@v1.0.0',
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

// Response type mappings for type safety
export interface IPCChannelMap {
  [IPC_CHANNELS.CHAT_SEND_MESSAGE]: {
    request: SendMessageRequest
    response: APIResponse<{ conversationId: string; messageId: string }>
  }
  [IPC_CHANNELS.CHAT_GENERATE_TITLE]: {
    request: GenerateTitleRequest
    response: APIResponse<{ title: string }>
  }
  [IPC_CHANNELS.CHAT_GENERATE_SUMMARY]: {
    request: GenerateSummaryRequest
    response: APIResponse<{ summary: string }>
  }
  [IPC_CHANNELS.PROJECT_CREATE]: {
    request: CreateProjectRequest
    response: APIResponse<Project>
  }
  [IPC_CHANNELS.PROJECT_LIST]: {
    request: void
    response: APIResponse<Project[]>
  }
  [IPC_CHANNELS.PROJECT_GET]: {
    request: { id: number }
    response: APIResponse<Project>
  }
  [IPC_CHANNELS.PROJECT_UPDATE]: {
    request: UpdateProjectRequest
    response: APIResponse<Project>
  }
  [IPC_CHANNELS.PROJECT_DELETE]: {
    request: DeleteProjectRequest
    response: APIResponse<void>
  }
  [IPC_CHANNELS.CONVERSATION_LIST]: {
    request: { projectId?: number }
    response: APIResponse<Conversation[]>
  }
  [IPC_CHANNELS.CONVERSATION_GET]: {
    request: { id: string }
    response: APIResponse<{ conversation: Conversation; messages: Message[] }>
  }
  [IPC_CHANNELS.FILE_UPLOAD]: {
    request: FileUploadRequest
    response: APIResponse<ProjectFile[]>
  }
  [IPC_CHANNELS.FILE_LIST]: {
    request: { projectId: number }
    response: APIResponse<ProjectFile[]>
  }
  [IPC_CHANNELS.SETTINGS_GET]: {
    request: GetSettingsRequest
    response: APIResponse<AppSettings>
  }
  [IPC_CHANNELS.SETTINGS_SET]: {
    request: SetSettingsRequest
    response: APIResponse<void>
  }
  [IPC_CHANNELS.SETTINGS_TEST_API]: {
    request: TestAPIRequest
    response: APIResponse<TestAPIResponse>
  }
  [IPC_CHANNELS.SEARCH_FULLTEXT]: {
    request: FullTextSearchRequest
    response: APIResponse<PaginatedResponse<SearchResult>>
  }
  [IPC_CHANNELS.SYSTEM_GET_INFO]: {
    request: void
    response: APIResponse<SystemInfo>
  }
}
