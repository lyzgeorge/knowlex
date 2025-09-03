export interface Conversation {
  id: string
  title: string
  createdAt: string
  updatedAt: string
  // Optional project association; null means uncategorized
  projectId?: string | null
  // Reference to selected model configuration
  modelConfigId?: string | null
  settings?: SessionSettings
}

export interface SessionSettings {
  systemPrompt?: string
  temperature?: number
}
