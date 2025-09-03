/**
 * Types for AI model configuration and management
 */

export interface ModelConfig {
  id: string
  name: string
  apiEndpoint: string
  apiKey: string | null
  modelId: string
  temperature?: number | undefined
  topP?: number | undefined
  frequencyPenalty?: number | undefined
  presencePenalty?: number | undefined
  supportsReasoning: boolean
  supportsVision: boolean
  supportsToolUse: boolean
  supportsWebSearch: boolean
  createdAt: string
  updatedAt: string
}

// Public model config type (without sensitive information)
export interface ModelConfigPublic {
  id: string
  name: string
  apiEndpoint: string
  modelId: string
  temperature?: number | undefined
  topP?: number | undefined
  frequencyPenalty?: number | undefined
  presencePenalty?: number | undefined
  supportsReasoning: boolean
  supportsVision: boolean
  supportsToolUse: boolean
  supportsWebSearch: boolean
  createdAt: string
  updatedAt: string
}

// Private model config type (only for main process)
export interface ModelConfigPrivate extends ModelConfigPublic {
  apiKey: string | null
}

// Type guard to check if config is private
export function isPrivateModelConfig(
  config: ModelConfigPublic | ModelConfigPrivate
): config is ModelConfigPrivate {
  return 'apiKey' in config
}

// Utility to convert private to public
export function toPublicModelConfig(config: ModelConfig | ModelConfigPrivate): ModelConfigPublic {
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  const { apiKey, ...publicConfig } = config
  return publicConfig
}

// Utility to safely broadcast model config (removes API key)
export function sanitizeForBroadcast(config: ModelConfig): ModelConfigPublic {
  return toPublicModelConfig(config)
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
