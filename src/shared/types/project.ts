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
