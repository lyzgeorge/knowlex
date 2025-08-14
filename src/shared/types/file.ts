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

export interface TemporaryFile {
  id: string
  filename: string
  content: string
  size: number
  mimeType: string
  error?: string
}

export interface TemporaryFileResult {
  filename: string
  content: string
  size: number
  mimeType: string
  error?: string
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
  maxTotalSize: number // in bytes
  maxFileCount: number
  supportedTypes: string[]
}
