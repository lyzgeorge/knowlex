export interface Conversation {
  id: string
  title: string
  createdAt: string
  updatedAt: string
  // Optional project association; null means uncategorized
  projectId?: string | null
  settings?: SessionSettings
}

export interface SessionSettings {
  systemPrompt?: string
  modelConfig?: ModelConfig
  temperature?: number
}

export interface ModelConfig {
  provider: string
  model: string
  apiKey?: string
  baseURL?: string
  maxTokens?: number
}
