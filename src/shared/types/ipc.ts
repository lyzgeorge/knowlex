export interface IPCResult<T = unknown> {
  success: boolean
  data?: T
  error?: string
}

// Conversation IPC
export interface ConversationCreateRequest {
  title?: string
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
  limit?: number
}

// Settings IPC
export interface SettingsUpdateRequest {
  key: string
  value: unknown
}
