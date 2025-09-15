export interface IPCResult<T = unknown> {
  success: boolean
  data?: T
  error?: string
}

// Conversation IPC
export interface ConversationCreateRequest {
  title?: string
  projectId?: string | null
}

// Attachment processing IPC
export interface AttachmentProcessRequest {
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
