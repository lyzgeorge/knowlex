export interface ProjectFile {
  id: string
  projectId: string
  filename: string
  filepath: string
  status: FileStatus
  chunkCount: number
  size: number
  mimeType: string
  createdAt: string
  updatedAt: string
  error?: string
}

// Attachment types used for message-scoped, non-persistent files
export interface Attachment {
  id: string
  filename: string
  content: string
  size: number
  mimeType: string
  error?: string
}

export interface AttachmentResult {
  filename: string
  content: string
  size: number
  mimeType: string
  error: string | undefined
}

export interface ProcessingResult {
  success: boolean
  chunkCount?: number
  error?: string
}

export interface SearchResult {
  content: string
  filename: string
  fileId: string
  similarity: number
  metadata?: Record<string, unknown>
}

export type FileStatus = 'pending' | 'processing' | 'ready' | 'failed'

export interface FileConstraints {
  maxFileSize: number // in bytes
  supportedTypes: string[]
}
