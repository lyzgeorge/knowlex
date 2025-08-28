import type { Message } from '@shared/types/message'

export interface BranchSendOptions {
  conversationId: string
  parentMessageId?: string
}

/**
 * Determines the appropriate parent message ID for creating a new branch
 * from a user message.
 *
 * - If the current user message has a parentMessageId (its parent is an assistant message),
 *   the new branch should continue with that same parent (sibling branch)
 * - If the current user message is at the top level (root, parentMessageId === null),
 *   the new branch should become a new top-level user message (no parentMessageId)
 */
export function buildUserMessageBranchSendOptions(currentUserMessage: Message): BranchSendOptions {
  return {
    conversationId: currentUserMessage.conversationId,
    ...(currentUserMessage.parentMessageId
      ? { parentMessageId: currentUserMessage.parentMessageId }
      : {})
  }
}

/**
 * Validates that a message can be used for branching
 */
export function canCreateBranch(message: Message): boolean {
  return message.role === 'user' && message.conversationId != null
}
