export interface AIModel {
  chat(messages: AIMessage[]): Promise<AIResponse>
  stream(messages: AIMessage[]): AsyncIterable<AIStreamChunk>
  getCapabilities(): ModelCapabilities
}

export interface AIMessage {
  role: 'system' | 'user' | 'assistant'
  content: string | AIMessageContent[]
}

export interface AIMessageContent {
  type: 'text' | 'image'
  text?: string
  image?: {
    url: string
    mimeType: string
  }
}

export interface AIResponse {
  content: string
  reasoning?: string
  toolCalls?: ToolCall[]
  usage?: TokenUsage
}

export interface AIStreamChunk {
  content?: string
  reasoning?: string
  toolCall?: ToolCall
  finished: boolean
  usage?: TokenUsage
}

export interface ToolCall {
  id: string
  name: string
  arguments: Record<string, unknown>
}

export interface TokenUsage {
  promptTokens: number
  completionTokens: number
  totalTokens: number
}

export interface ModelCapabilities {
  supportVision: boolean
  supportReasoning: boolean
  supportToolCalls: boolean
  maxContextLength: number
}

export interface AIConfig {
  apiKey: string
  baseURL?: string
  model: string
  temperature?: number
  maxTokens?: number
  topP?: number
  frequencyPenalty?: number
  presencePenalty?: number
}

/**
 * Provider-specific configuration interfaces
 * Extend the base AIConfig with provider-specific options
 */

export interface OpenAIConfig extends AIConfig {
  organization?: string
  seed?: number
  logitBias?: Record<string, number>
  stop?: string | string[]
  stream?: boolean
  user?: string
}

export interface ClaudeConfig extends AIConfig {
  anthropicVersion?: string
  stopSequences?: string[]
  metadata?: {
    userId?: string
    [key: string]: unknown
  }
}

export interface EmbeddingConfig {
  apiKey: string
  baseURL?: string
  model: string
  dimensions?: number
  encodingFormat?: 'float' | 'base64'
  user?: string
}

/**
 * Provider-specific capability interfaces
 */
export interface ProviderCapabilities extends ModelCapabilities {
  supportStreaming: boolean
  supportEmbeddings: boolean
  supportFunctionCalling: boolean
  supportSystemMessages: boolean
  maxImagesPerMessage?: number
  supportedImageFormats?: string[]
}

/**
 * Enhanced model information interface
 */
export interface ModelInfo {
  id: string
  name: string
  provider: string
  capabilities: ProviderCapabilities
  contextLength: number
  costPer1kTokens?: {
    input: number
    output: number
  }
  description?: string
  deprecated?: boolean
}

/**
 * AI provider configuration interface
 */
export interface ProviderConfig {
  name: string
  displayName: string
  baseURL: string
  requiresApiKey: boolean
  supportedModels: ModelInfo[]
  defaultConfig: Partial<AIConfig>
  configSchema: Record<string, unknown> // JSON schema for validation
}
