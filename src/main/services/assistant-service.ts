/**
 * Assistant Service
 *
 * Atomic module for generating assistant messages with streaming support.
 * Handles the complete lifecycle of AI response generation including:
 * - Streaming text and reasoning content
 * - Real-time event emission to renderer
 * - Error handling and cancellation
 * - Message persistence and updates
 *
 * This module abstracts the common logic used by both message sending
 * and message regeneration to eliminate code duplication.
 */

import type { Message } from '@shared/types/message'
import type { ReasoningEffort } from '@shared/types/models'
import {
  countTextTokens,
  estimateImageTokensByTiles,
  getEncodingForModel
} from '@shared/utils/token-count'
import { streamAIResponse } from '@main/services/openai-adapter'
import { getMessage } from '@main/services/message'
import { cancellationManager } from '@main/utils/cancellation'
// IPC event emission is handled by StreamingLifecycleManager
import { StreamingLifecycleManager } from './streaming-lifecycle'

/**
 * Configuration for assistant message generation
 */
export interface AssistantGenConfig {
  /** ID of the message to update with the generated content */
  messageId: string
  /** ID of the conversation for context */
  conversationId: string
  /** Messages to use as context for AI generation */
  contextMessages: Message[]
  /** Optional model configuration ID to use (overrides conversation default) */
  modelConfigId?: string | undefined
  /** Optional reasoning effort for this message */
  reasoningEffort?: ReasoningEffort | undefined
  /** Optional user default model ID for resolution */
  userDefaultModelId?: string | undefined
  /** Optional callback for when generation completes successfully */
  onSuccess?: (updatedMessage: Message) => Promise<void>
  /** Optional callback for when generation fails */
  onError?: (error: Error, errorMessage: Message) => Promise<void>
}

/**
 * Generates an assistant message with streaming support
 *
 * This function handles the complete lifecycle:
 * 1. Sets up cancellation token
 * 2. Sends streaming start event
 * 3. Generates AI response with real-time streaming
 * 4. Updates message with final content
 * 5. Sends completion event
 * 6. Handles errors gracefully
 * 7. Cleans up resources
 *
 * @param config Generation configuration
 * @returns Promise that resolves when generation starts (not when it completes)
 */
export async function streamAssistantReply(config: AssistantGenConfig): Promise<void> {
  const {
    messageId,
    contextMessages,
    modelConfigId,
    reasoningEffort,
    userDefaultModelId,
    onSuccess,
    onError
  } = config

  // Create cancellation token and lifecycle manager
  const cancellationToken = cancellationManager.createToken(messageId)
  const lifecycle = new StreamingLifecycleManager(messageId)
  await lifecycle.init()

  // Start background streaming process (don't await)
  setImmediate(async () => {
    let streamingActive = true

    try {
      // Get conversation model ID for resolution context
      let conversationModelId: string | undefined
      try {
        const { getConversation } = await import('@main/services/conversation-service')
        const conv = await getConversation(config.conversationId)
        conversationModelId = conv?.modelConfigId || undefined
      } catch (e) {
        // Non-fatal: conversation model resolution failed
        console.warn('[ASSISTANT] Failed to get conversation model ID:', e)
      }

      // Let openai-adapter handle model resolution with raw parameters
      const response = await streamAIResponse(
        contextMessages,
        {
          modelConfigId,
          conversationModelId,
          userDefaultModelId,
          ...(reasoningEffort !== undefined && { reasoningEffort }),
          onStart: () => lifecycle.onStart(),
          onTextStart: () => lifecycle.onTextStart(),
          onTextChunk: (chunk: string) => lifecycle.onTextChunk(chunk),
          onTextEnd: () => lifecycle.onTextEnd(),
          onReasoningStart: () => lifecycle.onReasoningStart(),
          onReasoningChunk: (chunk: string) => lifecycle.onReasoningChunk(chunk),
          onReasoningEnd: () => lifecycle.onReasoningEnd()
        },
        cancellationToken
      )

      streamingActive = false
      lifecycle.flush()

      // Check if the operation was cancelled
      const wasCancelled = cancellationToken.isCancelled

      if (wasCancelled) {
        const finalMessage = await lifecycle.cancelled()
        cancellationManager.complete(messageId)
        if (onError) await onError(new Error('User cancelled'), finalMessage)
        return
      } else {
        const finalMessage = await lifecycle.complete(response)
        cancellationManager.complete(messageId)
        if (onSuccess) await onSuccess(finalMessage)
        return
      }
    } catch (error) {
      console.error('Failed to generate AI response:', error)
      cancellationManager.complete(messageId)
      const wasCancelled = cancellationToken.isCancelled
      const errorMessage = await lifecycle.error(error, wasCancelled && streamingActive)
      if (onError)
        await onError(error instanceof Error ? error : new Error('Unknown error'), errorMessage)
    }
  })
}

/**
 * Convenience function for generating assistant messages for new user messages
 * Automatically handles conversation context and title generation
 */
export async function generateReplyForNewMessage(
  messageId: string,
  conversationId: string,
  reasoningEffort?: ReasoningEffort
): Promise<void> {
  // Build branch-scoped context (up to 8K tokens, fallback to 8 messages) following parent chain
  const branchContext = await buildBranchContext(messageId, {
    includeCurrentAssistant: false,
    maxContextTokens: 8000,
    fallbackMessageCount: 8
  })

  // Shared title generation callback - runs regardless of success/error
  const handleTitleGeneration = async () => {
    // Attempt one-shot initial title generation (idempotent)
    const { attemptInitialTitleGeneration } = await import('./title-generation')
    await attemptInitialTitleGeneration(conversationId)
  }

  await streamAssistantReply({
    messageId,
    conversationId,
    contextMessages: branchContext,
    reasoningEffort,
    onSuccess: async (_updatedMessage) => {
      await handleTitleGeneration()
    },
    onError: async (_error, _errorMessage) => {
      await handleTitleGeneration()
    }
  })
}

/**
 * Convenience function for regenerating assistant messages
 * Automatically handles context extraction up to the message being regenerated
 */
export async function regenerateReply(messageId: string): Promise<void> {
  const { getMessage } = await import('./message')

  // Get the message to regenerate
  const message = await getMessage(messageId)
  if (!message) {
    throw new Error('Message not found')
  }

  if (message.role !== 'assistant') {
    throw new Error('Can only regenerate assistant messages')
  }

  // Build branch-scoped context up to parent chain (exclude the assistant itself)
  const contextMessages = await buildBranchContext(messageId, {
    includeCurrentAssistant: false,
    maxContextTokens: 8000,
    fallbackMessageCount: 8
  })

  await streamAssistantReply({
    messageId,
    conversationId: message.conversationId,
    contextMessages
  })
}

// ----------------------------------------
// Branch context helper
// ----------------------------------------
interface BranchContextOptions {
  includeCurrentAssistant: boolean
  maxContextTokens: number
  fallbackMessageCount: number
}

/**
 * Estimate tokens for a message using shared token counting utilities
 * If token counting fails, returns 0 (will trigger fallback to message count limit)
 */
async function estimateMessageTokens(message: Message): Promise<number> {
  let totalTokens = 0

  try {
    // Get encoding for accurate token counting
    const encoding = await getEncodingForModel('gpt-4o')

    for (const part of message.content) {
      if (part.type === 'text' && part.text) {
        totalTokens += countTextTokens(part.text, encoding)
      } else if (part.type === 'image') {
        // Use shared image token estimation
        totalTokens += estimateImageTokensByTiles(512, 512)
      } else if (part.type === 'attachment' && part.attachment?.content) {
        totalTokens += countTextTokens(part.attachment.content, encoding)
      }
    }

    // Add tokens for reasoning content if present
    if (message.reasoning) {
      totalTokens += countTextTokens(message.reasoning, encoding)
    }

    // Add overhead for message structure (role, metadata, etc.)
    totalTokens += 10

    return totalTokens
  } catch (error) {
    // If token counting fails, return 0 to trigger fallback
    console.warn('Token counting failed:', error)
    return 0
  }
}

async function buildBranchContext(
  assistantMessageId: string,
  options: BranchContextOptions
): Promise<Message[]> {
  const { includeCurrentAssistant, maxContextTokens, fallbackMessageCount } = options
  const chain: Message[] = []

  let current = await getMessage(assistantMessageId)
  if (!current) return []

  // Optionally include the (placeholder) assistant; usually skipped because it has no content yet
  if (includeCurrentAssistant) chain.push(current)

  // Climb parent chain and collect all messages
  const allMessages: Message[] = []
  while (current) {
    const parentId = current.parentMessageId
    if (!parentId) break
    const parent = await getMessage(parentId)
    if (!parent) break
    allMessages.push(parent)
    current = parent
  }

  // Reverse to get chronological order (oldest -> newest)
  allMessages.reverse()

  // Try token-based truncation first
  let cumulativeTokens = 0
  const selectedMessages: Message[] = []
  let tokenCalculationFailed = false

  // Process messages from newest to oldest (reverse chronological)
  for (let i = allMessages.length - 1; i >= 0; i--) {
    const message = allMessages[i]
    if (!message) continue

    const messageTokens = await estimateMessageTokens(message)

    // If token calculation failed (returned 0), switch to message count fallback
    if (messageTokens === 0 && selectedMessages.length === 0) {
      tokenCalculationFailed = true
      break
    }

    // Check if adding this message would exceed the limit
    if (cumulativeTokens + messageTokens > maxContextTokens && selectedMessages.length > 0) {
      break
    }

    selectedMessages.unshift(message) // Add to beginning to maintain chronological order
    cumulativeTokens += messageTokens
  }

  // Fallback to message count limit if token calculation failed
  if (tokenCalculationFailed) {
    console.warn('[CONTEXT] Token calculation failed, falling back to message count limit')
    const fallbackMessages = allMessages.slice(-fallbackMessageCount) // Get last N messages
    console.log(
      `[CONTEXT] Selected ${fallbackMessages.length} messages (fallback to message count limit)`
    )
    return fallbackMessages
  }

  console.log(
    `[CONTEXT] Selected ${selectedMessages.length} messages, estimated ${cumulativeTokens} tokens (limit: ${maxContextTokens})`
  )

  return selectedMessages
}
