export interface Project {
  id: string
  name: string
  description: string
  createdAt: string
  updatedAt: string
  stats?: ProjectStats
}

export interface ProjectStats {
  conversationCount: number
  messageCount: number
  fileCount: number
  totalFileSize: number
}

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

export interface ProjectMemory {
  id: string
  projectId: string
  content: string
  priority: number
  createdAt: string
  updatedAt: string
}

export interface ProjectNote {
  id: string
  projectId: string
  title: string
  content: string
  tags: string[]
  createdAt: string
  updatedAt: string
}

export type FileStatus = 'pending' | 'processing' | 'ready' | 'failed'
