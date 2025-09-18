export type SmartNotesChunk = { id: number; lines: number[] }

export type SmartNotesV1_1 = {
  summary: string
  abstract: string
  keywords: string[]
  chunks: SmartNotesChunk[]
}

// Persisted status should only reflect terminal states.
export type ProjectFileRow = {
  id: string
  project_id: string
  filename: string
  file_size: number
  file_hash: string
  file_path: string | null
  content_path: string | null
  mime_type: string
  smart_notes: SmartNotesV1_1 | null
  smart_notes_status: 'completed' | 'failed' | 'pending'
  smart_notes_generated_at: string | null
  smart_notes_schema_version: string
  error: string | null
  upload_time: string
  created_at: string
  updated_at: string
}
