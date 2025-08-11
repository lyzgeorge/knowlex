import { LLMService } from './llm.service'
import type { IPCError } from '@shared'
import { IPC_ERROR_CODES } from '@shared'

// 文本分块配置
export interface ChunkingConfig {
  maxChunkSize: number
  overlapSize: number
  preserveParagraphs: boolean
  minChunkSize: number
}

// 文本块接口
export interface TextChunk {
  content: string
  index: number
  startOffset: number
  endOffset: number
  metadata?: Record<string, any>
}

// 向量化请求接口
export interface VectorizationRequest {
  text: string
  fileId?: string
  filename?: string
  chunkingConfig?: Partial<ChunkingConfig>
  metadata?: Record<string, any>
}

// 向量化响应接口
export interface VectorizationResponse {
  chunks: Array<{
    content: string
    embedding: number[]
    index: number
    metadata?: Record<string, any>
  }>
  totalChunks: number
  model: string
  usage: {
    prompt_tokens: number
    total_tokens: number
  }
}

// 批量向量化请求接口
export interface BatchVectorizationRequest {
  texts: string[]
  model?: string
  batchSize?: number
  onProgress?: (progress: { completed: number; total: number; currentBatch: number }) => void
}

// 默认分块配置
const DEFAULT_CHUNKING_CONFIG: ChunkingConfig = {
  maxChunkSize: 500, // 最大块大小（字符数）
  overlapSize: 50, // 重叠大小（字符数）
  preserveParagraphs: true, // 保持段落完整性
  minChunkSize: 100 // 最小块大小（字符数）
}

/**
 * 嵌入服务类
 * 负责文本分块和向量化处理
 */
export class EmbeddingService {
  private static instance: EmbeddingService
  private llmService: LLMService
  private chunkingConfig: ChunkingConfig = DEFAULT_CHUNKING_CONFIG

  private constructor() {
    this.llmService = LLMService.getInstance()
  }

  static getInstance(): EmbeddingService {
    if (!EmbeddingService.instance) {
      EmbeddingService.instance = new EmbeddingService()
    }
    return EmbeddingService.instance
  }

  /**
   * 更新分块配置
   */
  updateChunkingConfig(config: Partial<ChunkingConfig>): void {
    this.chunkingConfig = { ...this.chunkingConfig, ...config }
  }

  /**
   * 获取当前分块配置
   */
  getChunkingConfig(): ChunkingConfig {
    return { ...this.chunkingConfig }
  }

  /**
   * 智能文本分块
   * 支持中英文，保持段落完整性
   */
  chunkText(text: string, config?: Partial<ChunkingConfig>): TextChunk[] {
    const finalConfig = { ...this.chunkingConfig, ...config }

    // 预处理文本：标准化换行符
    const normalizedText = text.replace(/\r\n/g, '\n').replace(/\r/g, '\n')

    if (normalizedText.length <= finalConfig.maxChunkSize) {
      // 文本足够短，直接返回单个块
      return [
        {
          content: normalizedText.trim(),
          index: 0,
          startOffset: 0,
          endOffset: normalizedText.length
        }
      ]
    }

    if (finalConfig.preserveParagraphs) {
      // 基于段落的分块
      return this.chunkByParagraphs(normalizedText, finalConfig)
    } else {
      // 基于滑动窗口的分块
      return this.chunkBySlidingWindow(normalizedText, finalConfig)
    }
  }

  /**
   * 基于段落的智能分块
   */
  private chunkByParagraphs(text: string, config: ChunkingConfig): TextChunk[] {
    const chunks: TextChunk[] = []
    const paragraphs = text.split(/\n\s*\n/).filter((p) => p.trim().length > 0)

    let currentChunk = ''
    let currentStartOffset = 0
    let chunkIndex = 0

    for (let i = 0; i < paragraphs.length; i++) {
      const paragraph = paragraphs[i].trim()
      const potentialChunk = currentChunk ? `${currentChunk}\n\n${paragraph}` : paragraph

      if (potentialChunk.length <= config.maxChunkSize) {
        // 段落可以加入当前块
        currentChunk = potentialChunk
      } else {
        // 当前块已满，需要创建新块
        if (currentChunk.length >= config.minChunkSize) {
          chunks.push({
            content: currentChunk,
            index: chunkIndex++,
            startOffset: currentStartOffset,
            endOffset: currentStartOffset + currentChunk.length
          })
        }

        // 检查单个段落是否过长
        if (paragraph.length > config.maxChunkSize) {
          // 段落过长，需要进一步分割
          const subChunks = this.chunkBySlidingWindow(paragraph, config)
          for (const subChunk of subChunks) {
            chunks.push({
              ...subChunk,
              index: chunkIndex++,
              startOffset: currentStartOffset + subChunk.startOffset,
              endOffset: currentStartOffset + subChunk.endOffset
            })
          }
          currentStartOffset += paragraph.length + 2 // +2 for \n\n
          currentChunk = ''
        } else {
          // 开始新块
          currentStartOffset += currentChunk.length + 2
          currentChunk = paragraph
        }
      }
    }

    // 处理最后一个块
    if (currentChunk.length >= config.minChunkSize) {
      chunks.push({
        content: currentChunk,
        index: chunkIndex,
        startOffset: currentStartOffset,
        endOffset: currentStartOffset + currentChunk.length
      })
    }

    return chunks
  }

  /**
   * 基于滑动窗口的分块
   */
  private chunkBySlidingWindow(text: string, config: ChunkingConfig): TextChunk[] {
    const chunks: TextChunk[] = []
    let startOffset = 0
    let chunkIndex = 0

    while (startOffset < text.length) {
      let endOffset = Math.min(startOffset + config.maxChunkSize, text.length)

      // 尝试在单词边界处截断（对英文友好）
      if (endOffset < text.length) {
        const lastSpaceIndex = text.lastIndexOf(' ', endOffset)
        const lastNewlineIndex = text.lastIndexOf('\n', endOffset)
        const breakPoint = Math.max(lastSpaceIndex, lastNewlineIndex)

        if (breakPoint > startOffset + config.minChunkSize) {
          endOffset = breakPoint
        }
      }

      const content = text.substring(startOffset, endOffset).trim()

      if (content.length >= config.minChunkSize) {
        chunks.push({
          content,
          index: chunkIndex++,
          startOffset,
          endOffset
        })
      }

      // 计算下一个块的起始位置（考虑重叠）
      startOffset = Math.max(startOffset + config.minChunkSize, endOffset - config.overlapSize)

      // 避免无限循环
      if (startOffset >= text.length) {
        break
      }
    }

    return chunks
  }

  /**
   * 向量化单个文本
   */
  async vectorizeText(request: VectorizationRequest): Promise<VectorizationResponse> {
    try {
      // 分块处理
      const chunks = this.chunkText(request.text, request.chunkingConfig)

      if (chunks.length === 0) {
        throw this.createError(
          IPC_ERROR_CODES.RAG_PROCESSING_ERROR,
          'No valid chunks generated from text'
        )
      }

      // 提取文本内容用于向量化
      const texts = chunks.map((chunk) => chunk.content)

      // 生成嵌入向量
      const embeddingResponse = await this.llmService.generateEmbeddings({
        texts,
        model: request.metadata?.model
      })

      // 组合结果
      const vectorizedChunks = chunks.map((chunk, index) => ({
        content: chunk.content,
        embedding: embeddingResponse.embeddings[index],
        index: chunk.index,
        metadata: {
          ...chunk.metadata,
          ...request.metadata,
          fileId: request.fileId,
          filename: request.filename,
          startOffset: chunk.startOffset,
          endOffset: chunk.endOffset
        }
      }))

      return {
        chunks: vectorizedChunks,
        totalChunks: chunks.length,
        model: embeddingResponse.model,
        usage: embeddingResponse.usage
      }
    } catch (error: any) {
      console.error('Vectorization failed:', error)
      throw this.createError(
        IPC_ERROR_CODES.RAG_PROCESSING_ERROR,
        'Failed to vectorize text',
        error
      )
    }
  }

  /**
   * 批量向量化处理
   */
  async batchVectorize(request: BatchVectorizationRequest): Promise<number[][]> {
    const { texts, batchSize = 10, onProgress } = request
    const allEmbeddings: number[][] = []
    const totalBatches = Math.ceil(texts.length / batchSize)

    try {
      for (let i = 0; i < texts.length; i += batchSize) {
        const batch = texts.slice(i, i + batchSize)
        const currentBatch = Math.floor(i / batchSize) + 1

        // 报告进度
        if (onProgress) {
          onProgress({
            completed: i,
            total: texts.length,
            currentBatch
          })
        }

        // 处理当前批次
        const response = await this.llmService.generateEmbeddings({
          texts: batch,
          model: request.model
        })

        allEmbeddings.push(...response.embeddings)

        // 批次间添加小延迟，避免过快请求
        if (currentBatch < totalBatches) {
          await new Promise((resolve) => setTimeout(resolve, 100))
        }
      }

      // 报告完成
      if (onProgress) {
        onProgress({
          completed: texts.length,
          total: texts.length,
          currentBatch: totalBatches
        })
      }

      return allEmbeddings
    } catch (error: any) {
      console.error('Batch vectorization failed:', error)
      throw this.createError(
        IPC_ERROR_CODES.RAG_PROCESSING_ERROR,
        'Failed to batch vectorize texts',
        error
      )
    }
  }

  /**
   * 估算文本的 token 数量
   */
  estimateTokens(text: string): number {
    // 简单估算：中文字符约1个token，英文单词约0.75个token
    const chineseChars = (text.match(/[\u4e00-\u9fff]/g) || []).length
    const englishWords = text
      .replace(/[\u4e00-\u9fff]/g, '')
      .split(/\s+/)
      .filter((w) => w.length > 0).length

    return Math.ceil(chineseChars + englishWords * 0.75)
  }

  /**
   * 验证向量化配置
   */
  validateConfig(config: Partial<ChunkingConfig>): { valid: boolean; errors: string[] } {
    const errors: string[] = []

    if (config.maxChunkSize !== undefined) {
      if (config.maxChunkSize < 50 || config.maxChunkSize > 2000) {
        errors.push('maxChunkSize must be between 50 and 2000')
      }
    }

    if (config.minChunkSize !== undefined) {
      if (config.minChunkSize < 10 || config.minChunkSize > 500) {
        errors.push('minChunkSize must be between 10 and 500')
      }
    }

    if (config.overlapSize !== undefined) {
      if (config.overlapSize < 0 || config.overlapSize > 200) {
        errors.push('overlapSize must be between 0 and 200')
      }
    }

    if (config.maxChunkSize !== undefined && config.minChunkSize !== undefined) {
      if (config.minChunkSize >= config.maxChunkSize) {
        errors.push('minChunkSize must be less than maxChunkSize')
      }
    }

    if (config.maxChunkSize !== undefined && config.overlapSize !== undefined) {
      if (config.overlapSize >= config.maxChunkSize / 2) {
        errors.push('overlapSize should be less than half of maxChunkSize')
      }
    }

    return {
      valid: errors.length === 0,
      errors
    }
  }

  /**
   * 获取向量化统计信息
   */
  getVectorizationStats(
    text: string,
    config?: Partial<ChunkingConfig>
  ): {
    textLength: number
    estimatedTokens: number
    chunksCount: number
    averageChunkSize: number
    config: ChunkingConfig
  } {
    const finalConfig = { ...this.chunkingConfig, ...config }
    const chunks = this.chunkText(text, finalConfig)

    return {
      textLength: text.length,
      estimatedTokens: this.estimateTokens(text),
      chunksCount: chunks.length,
      averageChunkSize:
        chunks.length > 0
          ? Math.round(chunks.reduce((sum, chunk) => sum + chunk.content.length, 0) / chunks.length)
          : 0,
      config: finalConfig
    }
  }

  /**
   * 创建标准化错误
   */
  private createError(code: string, message: string, details?: any): IPCError {
    return {
      code,
      message,
      details,
      stack: new Error().stack
    }
  }
}
