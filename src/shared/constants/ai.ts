/**
 * AI Configuration Constants
 *
 * Note: Detailed model definitions have been moved to docs/legacy/ai-constants.ts
 * as they are not currently used. This file now contains only actively used constants.
 */

// Currently only used for documentation/reference - may be expanded when model selection is implemented
export const DEFAULT_AI_CONFIG = {
  temperature: 0.7,
  maxTokens: 32768,
  topP: 1,
  frequencyPenalty: 0,
  presencePenalty: 0
} as const

/**
 * Reasoning effort level mappings
 * Maps user-friendly levels to specific values for AI providers
 */
export const REASONING_RESOLUTIONS = {
  low: 'low',
  medium: 'medium',
  high: 'high'
} as const
