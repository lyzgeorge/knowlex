import {
  getEncodingForModel,
  countTextTokens,
  estimateImageTokensByTiles,
  countRequestTokensNormalized,
  TILE_SIZE,
  type Encoding,
  type TokenCountItem,
  type TokenCountResult
} from '@shared/utils/token-count'
// Simplified interface for token counting
interface TokenCountFile {
  id: string
  name: string
  type: 'image' | 'text'
  content: string
  dataUrl?: string // for images
}

/**
 * Extract image dimensions from a data URL
 * Returns default 1x1 tile if parsing fails to avoid blocking the UI
 */
export async function getImageSizeFromDataUrl(
  dataUrl: string
): Promise<{ width: number; height: number }> {
  return new Promise((resolve) => {
    const img = new Image()
    let resolved = false

    const safeResolve = (result: { width: number; height: number }) => {
      if (!resolved) {
        resolved = true
        resolve(result)
      }
    }

    // Set timeout to prevent hanging - store ID with proper typing
    const timeoutId: ReturnType<typeof setTimeout> = setTimeout(() => {
      console.warn('Image loading timed out, using default tile size')
      safeResolve({ width: TILE_SIZE, height: TILE_SIZE })
    }, 2000)

    img.onload = () => {
      clearTimeout(timeoutId)
      safeResolve({
        width: img.naturalWidth || img.width,
        height: img.naturalHeight || img.height
      })
    }

    img.onerror = () => {
      clearTimeout(timeoutId)
      console.warn('Failed to load image for size detection, using default tile size')
      safeResolve({ width: TILE_SIZE, height: TILE_SIZE }) // Default to 1 tile
    }

    img.src = dataUrl
  })
}

/**
 * Count tokens for a file
 * Handles both image files (by calculating tiles) and text files (by content)
 */
export async function countFileTokens(file: TokenCountFile, encoding: Encoding): Promise<number> {
  // Image files: calculate based on dimensions
  if (file.type === 'image' && file.dataUrl) {
    try {
      const { width, height } = await getImageSizeFromDataUrl(file.dataUrl)
      return estimateImageTokensByTiles(width, height)
    } catch (error) {
      console.warn(`Failed to calculate image tokens for ${file.name}:`, error)
      return estimateImageTokensByTiles(512, 512) // Default to 1 tile
    }
  }

  // Text files: count tokens in parsed content
  if (file.content && typeof file.content === 'string') {
    return countTextTokens(file.content, encoding)
  }

  // Fallback for unknown file types
  console.warn(`Unknown file type for token counting: ${file.name}`)
  return 0
}

/**
 * Main function to count tokens for a complete request
 * Handles text input and all attached files
 */
export async function countRequestTokens(input: {
  text: string
  files: TokenCountFile[]
  encoding: Encoding
}): Promise<TokenCountResult> {
  const { text, files, encoding } = input
  const items: TokenCountItem[] = []

  // Count text tokens
  if (text.trim()) {
    const textTokens = countTextTokens(text, encoding)
    items.push({
      id: 'input-text',
      label: 'Input Text',
      tokens: textTokens,
      type: 'text'
    })
  }

  // Count tokens for each file
  for (const file of files) {
    try {
      const fileTokens = await countFileTokens(file, encoding)
      items.push({
        id: file.id,
        label: file.name,
        tokens: fileTokens,
        type: file.type === 'image' ? 'image' : 'file'
      })
    } catch (error) {
      console.warn(`Failed to count tokens for file ${file.name}:`, error)
      items.push({
        id: file.id,
        label: `${file.name} (error)`,
        tokens: 0,
        type: 'file'
      })
    }
  }

  return countRequestTokensNormalized(items)
}

/**
 * Get token count for a request with model context
 * This is the main entry point for the UI hook
 */
export async function countRequestTokensWithModel(input: {
  text: string
  files: TokenCountFile[]
  modelId: string
}): Promise<TokenCountResult> {
  const { text, files, modelId } = input

  try {
    const encoding = await getEncodingForModel(modelId)
    return await countRequestTokens({ text, files, encoding })
  } catch (error) {
    console.warn('Failed to get encoding for token counting, using fallback estimation:', error)

    // Fallback: rough estimation without tiktoken
    const items: TokenCountItem[] = []

    if (text.trim()) {
      const estimatedTokens = Math.ceil(text.length / 4) // ~4 chars per token
      items.push({
        id: 'input-text',
        label: 'Input Text (estimated)',
        tokens: estimatedTokens,
        type: 'text'
      })
    }

    for (const file of files) {
      let estimatedTokens = 0
      if (file.type === 'image') {
        estimatedTokens = estimateImageTokensByTiles(512, 512) // Default 1 tile
      } else if (file.content) {
        estimatedTokens = Math.ceil(file.content.length / 4)
      }

      items.push({
        id: file.id,
        label: `${file.name} (estimated)`,
        tokens: estimatedTokens,
        type: file.type === 'image' ? 'image' : 'file'
      })
    }

    return countRequestTokensNormalized(items)
  }
}
