import type { ReasoningEffort } from '@shared/types/models'
import type { ModelCapabilities } from '@shared/utils/model-resolution'

/**
 * Resolve a reasoning effort value to pass to SDK/provider based on
 * user selection and the model's capabilities.
 * Returns undefined when reasoning should be disabled for the request.
 */
export function resolveReasoningEffort(
  userSelection: ReasoningEffort | undefined,
  modelCaps: Partial<ModelCapabilities> | null | undefined
): ReasoningEffort | undefined {
  // If model doesn't support reasoning, always disable
  if (!modelCaps || !modelCaps.supportsReasoning) return undefined

  // If user didn't choose anything, leave undefined to use provider defaults
  if (userSelection === undefined) return undefined

  // Sanity check values
  const allowed: ReasoningEffort[] = ['low', 'medium', 'high']
  if (allowed.includes(userSelection)) return userSelection

  return undefined
}

/**
 * Validate and parse a reasoning effort value from unknown input.
 * Returns the validated ReasoningEffort or undefined if invalid.
 */
export function validateReasoningEffort(value: unknown): ReasoningEffort | undefined {
  if (typeof value === 'string' && value.trim().length > 0) {
    const trimmed = value.trim() as ReasoningEffort
    const allowed: ReasoningEffort[] = ['low', 'medium', 'high']
    if (allowed.includes(trimmed)) {
      return trimmed
    }
  }
  return undefined
}

export default { resolveReasoningEffort, validateReasoningEffort }
