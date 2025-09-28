export interface CitationEvidence {
  fileId: string
  filename: string
  content: string
  similarity: number
  pageNumber?: number
  metadata?: Record<string, unknown>
}
