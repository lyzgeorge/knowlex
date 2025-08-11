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
