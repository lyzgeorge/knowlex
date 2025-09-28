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
const ModelIdSchema = z.string().min(1, 'Model ID is required').trim()

const NameSchema = z
  .string()
  .min(1, 'Model name is required')
  .max(200, 'Model name must be 200 characters or less')
  .trim()

const ApiEndpointSchema = z
  .string()
  .min(1, 'API endpoint is required')
  .url('API endpoint must be a valid URL')
  .refine(
    (url) => url.startsWith('http://') || url.startsWith('https://'),
    'Endpoint must start with http:// or https://'
  )
  .transform((url) => url.replace(/\/+$/, '')) // Remove trailing slashes

const ApiKeySchema = z.union([z.string().min(1).trim(), z.null(), z.undefined()]).optional()

const TemperatureSchema = z
  .number()
  .min(0, 'Temperature must be between 0 and 2')
  .max(2, 'Temperature must be between 0 and 2')
  .optional()

const TopPSchema = z
  .number()
  .gt(0, 'Top P must be greater than 0')
  .lte(1, 'Top P must be less than or equal to 1')
  .optional()

const PenaltySchema = z
  .number()
  .min(-2, 'Penalty must be between -2 and 2')
  .max(2, 'Penalty must be between -2 and 2')
  .optional()

const MaxInputTokensSchema = z
  .number()
  .int('Max input tokens must be an integer')
  .min(1024, 'Max input tokens must be at least 1,024')
  .max(2000000, 'Max input tokens must be at most 2,000,000')
  .default(131072)
  .optional()

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

const UpdateModelConfigInputSchema = CreateModelConfigInputSchema.partial()

// Request/Response schemas for IPC and API
// Helper functions for validation
export function validateCreateModelConfigInput(data: unknown) {
  return CreateModelConfigInputSchema.safeParse(data)
}

export function validateUpdateModelConfigInput(data: unknown) {
  return UpdateModelConfigInputSchema.safeParse(data)
}

// Type exports for use with the schemas
// Validation error formatter
export function formatValidationError(error: z.ZodError): string {
  const issues = error.issues.map((issue) => {
    const path = issue.path.length > 0 ? ` (${issue.path.join('.')})` : ''
    return `${issue.message}${path}`
  })

  return issues.join('; ')
}
