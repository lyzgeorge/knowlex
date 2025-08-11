export interface ProjectFile {
  id: string
  projectId: string
  filename: string
  filepath: string
  status: 'pending' | 'processing' | 'ready' | 'failed'
  chunkCount: number
  createdAt: string
  updatedAt: string
}
