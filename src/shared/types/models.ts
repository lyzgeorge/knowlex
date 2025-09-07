/**
 * Types for AI model configuration and management
 */

// Base model configuration interface (public fields only)
export interface ModelConfigPublic {
  id: string
  name: string
  apiEndpoint: string
  modelId: string
  temperature?: number | undefined
  topP?: number | undefined
  frequencyPenalty?: number | undefined
  presencePenalty?: number | undefined
  maxInputTokens?: number | undefined
  supportsReasoning: boolean
  supportsVision: boolean
  supportsToolUse: boolean
  supportsWebSearch: boolean
  createdAt: string
  updatedAt: string
}

// Full model config type with sensitive information (for main process)
export interface ModelConfig extends ModelConfigPublic {
  apiKey: string | null
}

// Type guard to check if config has API key
export function isPrivateModelConfig(
  config: ModelConfigPublic | ModelConfig
): config is ModelConfig {
  return 'apiKey' in config
}

// Utility to convert full config to public (removes API key)
export function toPublicModelConfig(config: ModelConfig): ModelConfigPublic {
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  const { apiKey, ...publicConfig } = config
  return publicConfig
}

export type ReasoningEffort = 'low' | 'medium' | 'high'

export interface CreateModelConfigInput {
  name: string
  apiEndpoint: string
  apiKey?: string | null | undefined
  modelId: string
  temperature?: number | undefined
  topP?: number | undefined
  frequencyPenalty?: number | undefined
  presencePenalty?: number | undefined
  maxInputTokens?: number | undefined
  supportsReasoning?: boolean | undefined
  supportsVision?: boolean | undefined
  supportsToolUse?: boolean | undefined
  supportsWebSearch?: boolean | undefined
}

export interface UpdateModelConfigInput extends Partial<CreateModelConfigInput> {}

export interface ModelConnectionTestResult {
  endpointReachable: boolean
  authValid: boolean | null
  modelAvailable: boolean | null
  roundTripMs?: number
  errorMessage?: string
}

export interface OutgoingAIRequest {
  model: string
  endpoint: string
  apiKey?: string
  messages: unknown[]
  reasoningEffort?: ReasoningEffort
  temperature?: number
  topP?: number
  frequencyPenalty?: number
  presencePenalty?: number
}
