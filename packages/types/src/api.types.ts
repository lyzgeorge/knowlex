/**
 * API-related types and interfaces
 */

import { Theme, Language, MessageRole } from './common.types'

export interface ChatAPIConfig {
  apiKey: string
  baseUrl: string
  model: string
}

export interface EmbeddingAPIConfig {
  apiKey: string
  baseUrl: string
  model: string
}

export interface RerankAPIConfig {
  apiKey: string
  baseUrl: string
  modelName: string
  enabled: boolean
}

export interface AppSettings {
  chatApi: ChatAPIConfig
  embeddingApi: EmbeddingAPIConfig
  theme: Theme
  language: Language
  ragSettings: {
    enabled: boolean
    topK: number
    threshold: number
  }
  rerankSettings?: RerankAPIConfig
}

export interface TestAPIRequest {
  type: 'chat' | 'embedding' | 'rerank'
  config: ChatAPIConfig | EmbeddingAPIConfig | RerankAPIConfig
}

export interface TestAPIResponse {
  success: boolean
  latency?: number
  error?: string
  details?: unknown
}

export interface ChatCompletionRequest {
  messages: Array<{
    role: MessageRole
    content: string
  }>
  model: string
  stream?: boolean
  temperature?: number
  maxTokens?: number
}

export interface ChatCompletionResponse {
  id: string
  object: string
  created: number
  model: string
  choices: Array<{
    index: number
    message: {
      role: MessageRole
      content: string
    }
    finishReason: string
  }>
  usage: {
    promptTokens: number
    completionTokens: number
    totalTokens: number
  }
}

export interface ChatCompletionStreamChunk {
  id: string
  object: string
  created: number
  model: string
  choices: Array<{
    index: number
    delta: {
      role?: MessageRole
      content?: string
    }
    finishReason?: string
  }>
}

export interface EmbeddingRequest {
  input: string | string[]
  model: string
}

export interface EmbeddingResponse {
  object: string
  data: Array<{
    object: string
    embedding: number[]
    index: number
  }>
  model: string
  usage: {
    promptTokens: number
    totalTokens: number
  }
}

export interface RerankRequest {
  model: string
  query: string
  documents: string[]
  topK?: number
}

export interface RerankResponse {
  results: Array<{
    index: number
    document: string
    relevanceScore: number
  }>
  model: string
  usage: {
    totalTokens: number
  }
}
