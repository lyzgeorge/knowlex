/**
 * Message Send Workflow Service
 *
 * Encapsulates the multi-step workflow previously embedded in the IPC layer:
 * 1. Ensure (or create) conversation
 * 2. Create user message
 * 3. Create assistant placeholder message
 * 4. Trigger assistant reply generation (streaming)
 * 5. Emit necessary events
 *
 * Keeping this here keeps the IPC layer thin (validation + delegation) while
 * centralising business logic and making it easier to test.
 */
import type { Message } from '@shared/types/message'
import type { Conversation } from '@shared/types/conversation'
import { createConversation } from './conversation'
import { addMessage } from './message'
import { generateReplyForNewMessage } from './assistant-service'
import {
  sendConversationEvent,
  sendMessageEvent,
  CONVERSATION_EVENTS,
  MESSAGE_EVENTS
} from '@main/utils/ipc-events'
import { ensurePlaceholder } from '@shared/utils/text'

export interface SendMessageInput {
  content: any
  reasoningEffort?: 'low' | 'medium' | 'high' | undefined
  conversationId?: string | undefined
  parentMessageId?: string | undefined
  projectId?: string | undefined
  modelConfigId?: string | undefined
}

export interface SendMessageResult {
  conversation: Conversation
  userMessage: Message
  assistantMessage: Message
  newlyCreatedConversation: boolean
}

async function ensureConversationExists(params: {
  conversationId?: string | undefined
  projectId?: string | undefined
  modelConfigId?: string | undefined
}): Promise<{ conversation: Conversation; newlyCreated: boolean }> {
  if (params.conversationId) {
    // Lazy import to avoid circular deps (conversation.ts imports this service)
    const { getConversation } = await import('./conversation')
    const conv = await getConversation(params.conversationId)
    if (!conv) throw new Error('Conversation not found')
    return { conversation: conv, newlyCreated: false }
  }

  const conversation = await createConversation({
    title: 'New Chat',
    projectId: params.projectId ?? null,
    modelConfigId: params.modelConfigId ?? null
  })
  // Emit CREATED event
  sendConversationEvent(CONVERSATION_EVENTS.CREATED, conversation)
  return { conversation, newlyCreated: true }
}

export async function sendMessageAndGenerateReply(
  input: SendMessageInput
): Promise<SendMessageResult> {
  const { content, reasoningEffort, conversationId, parentMessageId, projectId, modelConfigId } =
    input

  // 1. Ensure conversation
  const { conversation, newlyCreated } = await ensureConversationExists({
    conversationId,
    projectId,
    modelConfigId
  })

  // 2. Create user message
  const userMessage = await addMessage({
    conversationId: conversation.id,
    role: 'user',
    content,
    ...(parentMessageId && { parentMessageId })
  })

  // Emit ADDED event (transient reasoningEffort attached for UI only)
  sendMessageEvent(MESSAGE_EVENTS.ADDED, {
    ...userMessage,
    reasoningEffort
  })

  // 3. Small delay to help ordering (mimic previous behaviour)
  await new Promise((r) => setTimeout(r, 1))

  // 4. Create assistant placeholder
  const assistantMessage = await addMessage({
    conversationId: conversation.id,
    role: 'assistant',
    content: [{ type: 'text' as const, text: ensurePlaceholder('') }],
    parentMessageId: userMessage.id
  })

  // 5. Trigger async streaming generation (fire & forget)
  generateReplyForNewMessage(assistantMessage.id, conversation.id, reasoningEffort).catch((e) => {
    console.error('[MessageWorkflow] Failed to start assistant generation:', e)
  })

  return { conversation, userMessage, assistantMessage, newlyCreatedConversation: newlyCreated }
}
