/**
 * Reasoning effort management hook
 *
 * Centralizes reasoning effort state and model capability logic
 * to reduce duplication in ChatInputBox and other components.
 */

import { useState, useEffect } from 'react'
import type { ReasoningEffort } from '@shared/types/models'

interface ModelCapabilities {
  supportsReasoning: boolean
}

/**
 * Hook for managing reasoning effort with model capability awareness
 */
export const useReasoningEffort = (modelCapabilities: ModelCapabilities) => {
  const [reasoningEffort, setReasoningEffort] = useState<ReasoningEffort | undefined>(undefined)

  // Reset reasoning effort when model doesn't support reasoning
  useEffect(() => {
    if (modelCapabilities.supportsReasoning || reasoningEffort === undefined) return
    setReasoningEffort(undefined)
  }, [modelCapabilities.supportsReasoning, reasoningEffort])

  return {
    reasoningEffort,
    setReasoningEffort,
    reasoningSupported: modelCapabilities.supportsReasoning
  }
}
