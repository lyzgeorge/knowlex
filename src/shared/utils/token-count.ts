// Type for the encoding object (since it's not exported from js-tiktoken)
export type Encoding = {
  encode: (text: string) => number[]
  decode: (tokens: number[]) => string
  free?: () => void
}

const encodingCache = new Map<string, Encoding>()

/**
 * Get the appropriate tiktoken encoding for a given model ID
 * Uses o200k_base for all models as recommended unified encoding
 * Caches encodings to avoid repeated initialization overhead
 * Uses dynamic import to prevent bundling tiktoken in non-renderer code paths
 */
export async function getEncodingForModel(_modelId: string): Promise<Encoding> {
  const cacheKey = 'o200k_base' // Use unified encoding for all models

  if (encodingCache.has(cacheKey)) {
    return encodingCache.get(cacheKey)!
  }

  try {
    // Dynamic import to prevent bundling tiktoken in main process or SSR
    const { getEncoding } = await import('js-tiktoken')
    const encoding = getEncoding('o200k_base')
    encodingCache.set(cacheKey, encoding)
    return encoding
  } catch (error) {
    console.warn(
      'Failed to load tiktoken encoding, falling back to character ratio estimation:',
      error
    )
    throw new Error('Failed to load tiktoken encoding')
  }
}

/**
 * Count tokens in text using tiktoken encoding
 * Falls back to character ratio estimation if encoding fails
 */
export function countTextTokens(text: string, encoding: Encoding): number {
  try {
    return encoding.encode(text).length
  } catch (error) {
    console.warn('Failed to count tokens with tiktoken, using fallback estimation:', error)
    // Fallback: rough estimation of ~4 characters per token for English text
    return Math.ceil(text.length / 4)
  }
}

// Constants for token estimation
export const TOKENS_PER_TILE = 85 // OpenAI's low-detail image estimation
export const TILE_SIZE = 512 // 512x512 pixels per tile

/**
 * Estimate image tokens based on tile calculation
 * Uses 85 tokens per 512x512 tile as standard estimation
 * This matches OpenAI's low-detail image token calculation
 */
export function estimateImageTokensByTiles(
  width: number,
  height: number,
  tokensPerTile: number = TOKENS_PER_TILE
): number {
  const tilesX = Math.ceil(width / TILE_SIZE)
  const tilesY = Math.ceil(height / TILE_SIZE)
  const totalTiles = tilesX * tilesY

  return totalTiles * tokensPerTile
}

/**
 * Count tokens for normalized request data
 * This is a pure counting function that works with already processed data
 */
export interface TokenCountItem {
  id: string
  label: string
  tokens: number
  type: 'text' | 'image' | 'file'
}

export interface TokenCountResult {
  total: number
  breakdown: {
    text: number
    images: number
    files: number
    items: TokenCountItem[]
  }
}

export function countRequestTokensNormalized(items: TokenCountItem[]): TokenCountResult {
  const breakdown = {
    text: 0,
    images: 0,
    files: 0,
    items: [...items]
  }

  let total = 0

  for (const item of items) {
    total += item.tokens

    switch (item.type) {
      case 'text':
        breakdown.text += item.tokens
        break
      case 'image':
        breakdown.images += item.tokens
        break
      case 'file':
        breakdown.files += item.tokens
        break
    }
  }

  return { total, breakdown }
}

/**
 * Clean up cached encodings when no longer needed
 * Call this during application shutdown or when switching contexts
 */
export function clearEncodingCache(): void {
  for (const encoding of encodingCache.values()) {
    try {
      if (encoding.free) {
        encoding.free()
      }
    } catch (error) {
      console.warn('Failed to free encoding:', error)
    }
  }
  encodingCache.clear()
}
