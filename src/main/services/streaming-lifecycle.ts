import type { Message, MessageContent } from '@shared/types/message'
import { ensurePlaceholder } from '@shared/utils/text'
import { updateMessage } from '@main/services/message'
import { sendMessageEvent, MESSAGE_EVENTS } from '@main/utils/ipc-events'
import { createBatchedEmitter, type BatchedEmitter } from '@main/utils/batched-emitter'

/**
 * Manages the lifecycle of streaming responses, centralizing:
 * - IPC event emission (start/end/chunks)
 * - Chunk batching for text and reasoning
 * - Finalization on success, cancellation, or error
 */
export class StreamingLifecycleManager {
  private textEmitter: BatchedEmitter
  private reasoningEmitter: BatchedEmitter
  private accumulatedText = ''
  private accumulatedReasoning = ''

  constructor(private messageId: string) {
    this.textEmitter = createBatchedEmitter(messageId, MESSAGE_EVENTS.STREAMING_CHUNK, 'chunk')
    this.reasoningEmitter = createBatchedEmitter(messageId, MESSAGE_EVENTS.REASONING_CHUNK, 'chunk')
  }

  async init(): Promise<void> {
    // Set placeholder and notify renderer that streaming started
    const message = await updateMessage(this.messageId, {
      content: [{ type: 'text' as const, text: ensurePlaceholder('') }]
    })
    sendMessageEvent(MESSAGE_EVENTS.STREAMING_START, { messageId: this.messageId, message })
  }

  onStart(): void {
    sendMessageEvent(MESSAGE_EVENTS.START, { messageId: this.messageId })
  }

  onTextStart(): void {
    sendMessageEvent(MESSAGE_EVENTS.TEXT_START, { messageId: this.messageId })
  }
  onTextChunk(chunk: string): void {
    this.accumulatedText += chunk
    this.textEmitter.addChunk(chunk)
  }
  onTextEnd(): void {
    sendMessageEvent(MESSAGE_EVENTS.TEXT_END, { messageId: this.messageId })
  }

  onReasoningStart(): void {
    sendMessageEvent(MESSAGE_EVENTS.REASONING_START, { messageId: this.messageId })
  }
  onReasoningChunk(chunk: string): void {
    this.accumulatedReasoning += chunk
    this.reasoningEmitter.addChunk(chunk)
  }
  onReasoningEnd(): void {
    sendMessageEvent(MESSAGE_EVENTS.REASONING_END, { messageId: this.messageId })
  }

  flush(): void {
    try {
      this.textEmitter.flush()
      this.reasoningEmitter.flush()
    } catch {
      // Ignore flush errors during cleanup
    }
  }

  async complete(result: { content: MessageContent; reasoning?: string }): Promise<Message> {
    this.flush()
    const update: { content: MessageContent; reasoning?: string } = { content: result.content }
    if (result.reasoning !== undefined) update.reasoning = result.reasoning
    const updated = await updateMessage(this.messageId, update)
    sendMessageEvent(MESSAGE_EVENTS.STREAMING_END, { messageId: this.messageId, message: updated })
    return updated
  }

  async cancelled(): Promise<Message> {
    this.flush()
    const update: { content: Array<{ type: 'text'; text: string }>; reasoning?: string } = {
      content: [{ type: 'text' as const, text: ensurePlaceholder(this.accumulatedText) }]
    }
    if (this.accumulatedReasoning) update.reasoning = this.accumulatedReasoning
    const updated = await updateMessage(this.messageId, update)
    sendMessageEvent(MESSAGE_EVENTS.STREAMING_CANCELLED, {
      messageId: this.messageId,
      message: updated
    })
    return updated
  }

  async error(err: unknown, wasCancelled: boolean): Promise<Message> {
    this.flush()

    if (wasCancelled && (this.accumulatedText || this.accumulatedReasoning)) {
      // Preserve accumulated content when user cancelled mid-stream
      return this.cancelled()
    }

    const errorContent: MessageContent = [
      {
        type: 'text' as const,
        text: `Error: ${err instanceof Error ? err.message : 'Failed to generate AI response. Please check your API configuration.'}`
      }
    ]
    const updated = await updateMessage(this.messageId, { content: errorContent })
    sendMessageEvent(MESSAGE_EVENTS.STREAMING_ERROR, {
      messageId: this.messageId,
      message: updated,
      error: err instanceof Error ? err.message : 'Unknown error'
    })
    return updated
  }
}
