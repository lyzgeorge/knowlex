export interface IPCResult<T = unknown> {
  success: boolean
  data?: T
  error?: string
}

// Project IPC
export interface ProjectCreateRequest {
  name: string
  description?: string
}

export interface ProjectUpdateRequest {
  id: string
  name?: string
  description?: string
}

// File IPC
export interface FileUploadRequest {
  projectId: string
  files: Array<{
    name: string
    path: string
    size: number
  }>
}

// Conversation IPC
export interface ConversationCreateRequest {
  projectId?: string
  title?: string
}

export interface MessageAddRequest {
  conversationId: string
  role: 'user' | 'assistant'
  content: MessageContent
}

// File IPC (for temp files only)
export interface TemporaryFileRequest {
  files: Array<{
    name: string
    path: string
    size: number
  }>
}

// Search IPC
export interface SearchRequest {
  query: string
  projectId?: string
  limit?: number
}

// Settings IPC
export interface SettingsUpdateRequest {
  key: string
  value: unknown
}

// Import MessageContent type
import type { MessageContent } from './message'
