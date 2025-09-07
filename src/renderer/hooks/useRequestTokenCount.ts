import { useState, useEffect, useMemo, useCallback } from 'react'
import { useDebouncedCallback } from 'use-debounce'
import { countRequestTokensWithModel } from '@renderer/utils/countRequestTokens'
import type { ModelConfigPublic } from '@shared/types/models'
import type { TokenCountResult } from '@shared/utils/token-count'

// Simplified interface for token counting - what we need for counting
export interface TokenCountFile {
  id: string
  name: string
  type: 'image' | 'text'
  content: string
  dataUrl?: string // for images
}

export interface UseRequestTokenCountInput {
  text: string
  processedFiles: TokenCountFile[]
  model: ModelConfigPublic | null
}

export interface UseRequestTokenCountResult {
  total: number
  limit: number
  overLimit: boolean
  breakdown: TokenCountResult['breakdown']
  loading: boolean
  error: string | undefined
}

// Cache for token counts to avoid recalculation
const tokenCountCache = new Map<string, TokenCountResult>()

// Simple hash function for content fingerprinting
function simpleHash(str: string): string {
  let hash = 0
  if (str.length === 0) return hash.toString()
  for (let i = 0; i < str.length; i++) {
    const char = str.charCodeAt(i)
    hash = (hash << 5) - hash + char
    hash = hash & hash // Convert to 32-bit integer
  }
  return Math.abs(hash).toString(36)
}

function getCacheKey(text: string, files: TokenCountFile[], modelId: string): string {
  // Include text content fingerprint (first 128 chars + hash of full content)
  const textFingerprint = text.length > 0 ? `${text.slice(0, 128)}:${simpleHash(text)}` : 'empty'

  // Include file content fingerprints with better collision resistance
  const fileHashes = files
    .map((f) => {
      // For images, use dataUrl hash; for text files, use content hash
      let contentFingerprint: string
      if (f.type === 'image' && f.dataUrl) {
        // Hash the data URL metadata (before base64 content) + sample of base64
        const parts = f.dataUrl.split(',')
        const header = parts[0] || ''
        const base64Sample = (parts[1] || '').slice(0, 256)
        contentFingerprint = simpleHash(header + base64Sample)
      } else {
        // For text content, hash first portion + length for better fingerprinting
        contentFingerprint = simpleHash(f.content.slice(0, 256) + f.content.length)
      }

      return `${f.id}:${f.name}:${f.type}:${f.content.length}:${contentFingerprint}`
    })
    .join('|')

  return `${modelId}:${textFingerprint}:${fileHashes}`
}

export function useRequestTokenCount({
  text,
  processedFiles,
  model
}: UseRequestTokenCountInput): UseRequestTokenCountResult {
  const [result, setResult] = useState<TokenCountResult>({
    total: 0,
    breakdown: { text: 0, images: 0, files: 0, items: [] }
  })
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string>()

  // Get model configuration values
  const limit = model?.maxInputTokens ?? 131072 // Default 128K tokens
  const modelId = model?.modelId ?? 'gpt-3.5-turbo'

  // Check if over limit
  const overLimit = result.total > limit

  // Create cache key for memoization (not used directly but needed for effect dependency)
  const cacheKey = useMemo(
    () => getCacheKey(text, processedFiles, modelId),
    [text, processedFiles, modelId]
  )

  // Use the cache key to ensure dependencies are tracked
  void cacheKey

  // Token counting function
  const countTokens = useCallback(
    async (currentText: string, currentFiles: TokenCountFile[], currentModelId: string) => {
      const currentCacheKey = getCacheKey(currentText, currentFiles, currentModelId)

      // Check cache first
      const cachedResult = tokenCountCache.get(currentCacheKey)
      if (cachedResult) {
        setResult(cachedResult)
        setLoading(false)
        setError(undefined)
        return
      }

      try {
        setLoading(true)
        setError(undefined)

        const tokenResult = await countRequestTokensWithModel({
          text: currentText,
          files: currentFiles,
          modelId: currentModelId || 'gpt-3.5-turbo'
        })

        // Cache the result
        tokenCountCache.set(currentCacheKey, tokenResult)

        // Limit cache size to prevent memory issues
        if (tokenCountCache.size > 50) {
          const firstKey = tokenCountCache.keys().next().value
          if (firstKey) {
            tokenCountCache.delete(firstKey)
          }
        }

        setResult(tokenResult)
      } catch (err) {
        console.error('Token counting failed:', err)
        setError(err instanceof Error ? err.message : 'Failed to count tokens')
        setResult({
          total: 0,
          breakdown: { text: 0, images: 0, files: 0, items: [] }
        })
      } finally {
        setLoading(false)
      }
    },
    []
  )

  // Debounced version with 150ms delay to prevent excessive calls during typing
  const debouncedCountTokens = useDebouncedCallback(countTokens, 150)

  // Effect to trigger token counting when inputs change.
  // Use the computed string `cacheKey` so the effect only runs when content actually changes
  useEffect(() => {
    // Don't count if no text and no files
    if (!text.trim() && processedFiles.length === 0) {
      setResult({
        total: 0,
        breakdown: { text: 0, images: 0, files: 0, items: [] }
      })
      setLoading(false)
      setError(undefined)
      return
    }

    // Don't count without a model
    if (!model) {
      setResult({
        total: 0,
        breakdown: { text: 0, images: 0, files: 0, items: [] }
      })
      setLoading(false)
      setError(undefined)
      return
    }

    // Call debounced counter with the live values. Using cacheKey in deps avoids
    // re-triggering when the processedFiles array reference changes but content is identical.
    debouncedCountTokens(text, processedFiles, modelId || 'gpt-3.5-turbo')
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [cacheKey, model])

  return {
    total: result.total,
    limit,
    overLimit,
    breakdown: result.breakdown,
    loading,
    error
  }
}

// Clear token count cache when needed (e.g., on model change or app cleanup)
export function clearTokenCountCache(): void {
  tokenCountCache.clear()
}
