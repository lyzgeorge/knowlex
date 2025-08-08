// IPC 通信接口定义
export interface IPCRequest<T = any> {
  id: string
  channel: string
  data: T
  timestamp: number
}

export interface IPCResponse<T = any> {
  id: string
  success: boolean
  data?: T
  error?: string
  timestamp: number
}

// 数据库实体类型
export interface Project {
  id: string
  name: string
  description?: string
  created_at: string
  updated_at: string
}

export interface Conversation {
  id: string
  project_id?: string
  title: string
  created_at: string
  updated_at: string
}

export interface Message {
  id: string
  conversation_id: string
  role: 'user' | 'assistant'
  content: string
  files?: string[]
  created_at: string
}

export interface ProjectFile {
  id: string
  project_id: string
  filename: string
  filepath: string
  file_size: number
  file_hash: string
  status: 'processing' | 'completed' | 'failed'
  created_at: string
  updated_at: string
}

export interface TextChunk {
  id: string
  file_id: string
  content: string
  chunk_index: number
  embedding?: number[]
  created_at: string
}

export interface ProjectMemory {
  id: string
  project_id: string
  type: 'user' | 'system'
  content: string
  created_at: string
  updated_at: string
}

export interface KnowledgeCard {
  id: string
  project_id: string
  title: string
  content: string
  tags?: string[]
  created_at: string
  updated_at: string
}

export interface AppSettings {
  id: string
  key: string
  value: string
  updated_at: string
}

// API 配置类型
export interface OpenAIConfig {
  apiKey: string
  baseURL?: string
  model: string
  embeddingModel: string
}

// 聊天相关类型
export interface ChatMessage {
  role: 'user' | 'assistant' | 'system'
  content: string
  files?: FileInfo[]
}

export interface FileInfo {
  name: string
  content: string
  size: number
}

// RAG 相关类型
export interface RAGResult {
  content: string
  filename: string
  score: number
  chunk_index: number
}

// 错误类型
export interface KnowlexError {
  code: string
  message: string
  details?: any
}
