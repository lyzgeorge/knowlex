/**
 * Zod validation schemas for model configuration
 *
 * Centralized validation logic used across:
 * - Preload API validation
 * - Service layer validation
 * - Form validation in UI
 */

import { z } from 'zod'

// Accept common boolean-like inputs and coerce to boolean
// - Booleans: pass-through
// - Numbers: 0 -> false, 1 -> true (reject other numbers)
// - Strings: "true/false", "1/0", "yes/no", "on/off" (case-insensitive)
const BooleanishSchema = z.preprocess((val) => {
  if (typeof val === 'boolean') return val
  if (typeof val === 'number') {
    if (val === 1) return true
    if (val === 0) return false
    return val
  }
  if (typeof val === 'string') {
    const v = val.trim().toLowerCase()
    if (v === '1' || v === 'true' || v === 'yes' || v === 'on') return true
    if (v === '0' || v === 'false' || v === 'no' || v === 'off' || v === '') return false
    return val
  }
  return val
}, z.boolean())

// Base validation schemas
export const ModelIdSchema = z.string().min(1, 'Model ID is required').trim()

export const NameSchema = z
  .string()
  .min(1, 'Model name is required')
  .max(200, 'Model name must be 200 characters or less')
  .trim()

export const ApiEndpointSchema = z
  .string()
  .min(1, 'API endpoint is required')
  .url('API endpoint must be a valid URL')
  .refine(
    (url) => url.startsWith('http://') || url.startsWith('https://'),
    'Endpoint must start with http:// or https://'
  )
  .transform((url) => url.replace(/\/+$/, '')) // Remove trailing slashes

export const ApiKeySchema = z.union([z.string().min(1).trim(), z.null(), z.undefined()]).optional()

export const TemperatureSchema = z
  .number()
  .min(0, 'Temperature must be between 0 and 2')
  .max(2, 'Temperature must be between 0 and 2')
  .optional()

export const TopPSchema = z
  .number()
  .gt(0, 'Top P must be greater than 0')
  .lte(1, 'Top P must be less than or equal to 1')
  .optional()

export const PenaltySchema = z
  .number()
  .min(-2, 'Penalty must be between -2 and 2')
  .max(2, 'Penalty must be between -2 and 2')
  .optional()

export const ReasoningEffortSchema = z.enum(['low', 'medium', 'high']).optional()

export const MaxInputTokensSchema = z
  .number()
  .int('Max input tokens must be an integer')
  .min(1024, 'Max input tokens must be at least 1,024')
  .max(2000000, 'Max input tokens must be at most 2,000,000')
  .default(131072)
  .optional()

// Model capability schemas
export const ModelCapabilitiesSchema = z.object({
  supportsReasoning: BooleanishSchema.default(false),
  supportsVision: BooleanishSchema.default(false),
  supportsToolUse: BooleanishSchema.default(false),
  supportsWebSearch: BooleanishSchema.default(false)
})

// Core model configuration schema
export const ModelConfigSchema = z.object({
  id: ModelIdSchema,
  name: NameSchema,
  apiEndpoint: ApiEndpointSchema,
  apiKey: ApiKeySchema,
  modelId: ModelIdSchema,
  temperature: TemperatureSchema,
  topP: TopPSchema,
  frequencyPenalty: PenaltySchema,
  presencePenalty: PenaltySchema,
  maxInputTokens: MaxInputTokensSchema,
  supportsReasoning: BooleanishSchema.default(false),
  supportsVision: BooleanishSchema.default(false),
  supportsToolUse: BooleanishSchema.default(false),
  supportsWebSearch: BooleanishSchema.default(false),
  createdAt: z.string().datetime(),
  updatedAt: z.string().datetime()
})

// Input schemas for creating/updating models
export const CreateModelConfigInputSchema = z.object({
  name: NameSchema,
  apiEndpoint: ApiEndpointSchema,
  apiKey: ApiKeySchema,
  modelId: ModelIdSchema,
  temperature: TemperatureSchema,
  topP: TopPSchema,
  frequencyPenalty: PenaltySchema,
  presencePenalty: PenaltySchema,
  maxInputTokens: MaxInputTokensSchema,
  supportsReasoning: BooleanishSchema.default(false),
  supportsVision: BooleanishSchema.default(false),
  supportsToolUse: BooleanishSchema.default(false),
  supportsWebSearch: BooleanishSchema.default(false)
})

export const UpdateModelConfigInputSchema = CreateModelConfigInputSchema.partial()

// Request/Response schemas for IPC and API
export const ModelConfigListRequestSchema = z
  .object({
    includeApiKeys: z.boolean().default(false)
  })
  .optional()

export const ModelConfigGetRequestSchema = z.object({
  id: ModelIdSchema,
  includeApiKey: z.boolean().default(false)
})

export const ModelConfigCreateRequestSchema = CreateModelConfigInputSchema

export const ModelConfigUpdateRequestSchema = z.object({
  id: ModelIdSchema,
  updates: UpdateModelConfigInputSchema
})

export const ModelConfigDeleteRequestSchema = z.object({
  id: ModelIdSchema
})

export const ModelConfigTestRequestSchema = z.object({
  id: ModelIdSchema
})

// Connection test result schema
export const ModelConnectionTestResultSchema = z.object({
  endpointReachable: z.boolean(),
  authValid: z.boolean().nullable(),
  modelAvailable: z.boolean().nullable(),
  roundTripMs: z.number().optional(),
  errorMessage: z.string().optional()
})

// Public model config schema (without API key)
export const ModelConfigPublicSchema = ModelConfigSchema.omit({ apiKey: true })

// Model resolution context schema
export const ModelResolutionContextSchema = z.object({
  explicitModelId: z.string().optional().nullable(),
  conversationModelId: z.string().optional().nullable(),
  userDefaultModelId: z.string().optional().nullable(),
  availableModels: z.array(ModelConfigSchema)
})

// Helper functions for validation
export function validateModelConfig(data: unknown) {
  return ModelConfigSchema.safeParse(data)
}

export function validateCreateModelConfigInput(data: unknown) {
  return CreateModelConfigInputSchema.safeParse(data)
}

export function validateUpdateModelConfigInput(data: unknown) {
  return UpdateModelConfigInputSchema.safeParse(data)
}

export function validateModelResolutionContext(data: unknown) {
  return ModelResolutionContextSchema.safeParse(data)
}

// Type exports for use with the schemas
export type ModelConfigInput = z.infer<typeof CreateModelConfigInputSchema>
export type ModelConfigUpdateInput = z.infer<typeof UpdateModelConfigInputSchema>
export type ModelConfigPublic = z.infer<typeof ModelConfigPublicSchema>
export type ModelResolutionContextInput = z.infer<typeof ModelResolutionContextSchema>
export type ModelConnectionTestResult = z.infer<typeof ModelConnectionTestResultSchema>

// Validation error formatter
export function formatValidationError(error: z.ZodError): string {
  const issues = error.issues.map((issue) => {
    const path = issue.path.length > 0 ? ` (${issue.path.join('.')})` : ''
    return `${issue.message}${path}`
  })

  return issues.join('; ')
}

// Common validation patterns for reuse
export const ValidationPatterns = {
  modelId: (value: unknown): value is string => ModelIdSchema.safeParse(value).success,
  name: (value: unknown): value is string => NameSchema.safeParse(value).success,
  apiEndpoint: (value: unknown): value is string => ApiEndpointSchema.safeParse(value).success,
  temperature: (value: unknown): value is number => TemperatureSchema.safeParse(value).success,
  topP: (value: unknown): value is number => TopPSchema.safeParse(value).success,
  penalty: (value: unknown): value is number => PenaltySchema.safeParse(value).success,
  maxInputTokens: (value: unknown): value is number =>
    MaxInputTokensSchema.safeParse(value).success,
  reasoningEffort: (value: unknown): value is 'low' | 'medium' | 'high' =>
    ReasoningEffortSchema.safeParse(value).success
}
