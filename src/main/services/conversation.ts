import type {
  ConversationPaginationResult,
  ConversationRepository,
  ConversationUpdateInput,
  ConversationUseCases
} from '@main/domain/conversation'
import {
  createConversation as dbCreateConversation,
  deleteConversation as dbDeleteConversation,
  getConversation as dbGetConversation,
  listConversations as dbListConversations,
  listConversationsByProject as dbListConversationsByProject,
  updateConversation as dbUpdateConversation
} from '@main/infra/database/queries'
import type { Conversation } from '@shared/types/conversation-types'
import { formatOperationError } from '@shared/utils/error-handling'
import { generateId } from '@shared/utils/id'

const TITLE_MAX_LENGTH = 200

const dbConversationRepository: ConversationRepository = {
  async insert(conversation) {
    await dbCreateConversation(conversation)
  },
  async findById(conversationId) {
    return await dbGetConversation(conversationId)
  },
  async list(limit, offset) {
    return await dbListConversations(limit, offset)
  },
  async update(conversationId, updates) {
    await dbUpdateConversation(conversationId, updates)
  },
  async delete(conversationId) {
    await dbDeleteConversation(conversationId)
  },
  async listByProject(projectId) {
    return await dbListConversationsByProject(projectId)
  }
}

function assertConversationId(id: string): string {
  if (!id || !id.trim()) {
    throw new Error('Conversation ID is required')
  }
  return id.trim()
}

function normalizeTitle(title: string): string {
  const trimmed = title.trim()
  if (!trimmed) {
    throw new Error('Conversation title cannot be empty')
  }
  if (trimmed.length > TITLE_MAX_LENGTH) {
    throw new Error(`Conversation title must be ${TITLE_MAX_LENGTH} characters or less`)
  }
  return trimmed
}

function buildUpdatePayload(
  updates: ConversationUpdateInput
): Partial<Omit<Conversation, 'id' | 'createdAt' | 'updatedAt'>> {
  const payload: Partial<Omit<Conversation, 'id' | 'createdAt' | 'updatedAt'>> = {}

  if (updates.title !== undefined) {
    payload.title = normalizeTitle(updates.title)
  }

  if (updates.settings !== undefined) {
    payload.settings = updates.settings
  }

  if (updates.projectId !== undefined) {
    payload.projectId = updates.projectId
  }

  if (updates.modelConfigId !== undefined) {
    payload.modelConfigId = updates.modelConfigId
  }

  return payload
}

export function createConversationService(
  repository: ConversationRepository = dbConversationRepository
): ConversationUseCases {
  return {
    async createConversation(input) {
      const title = input.title !== undefined ? normalizeTitle(input.title) : undefined

      const newConversation: Omit<Conversation, 'createdAt' | 'updatedAt'> = {
        id: generateId(),
        title: title ?? 'New Chat',
        projectId: input.projectId ?? null,
        modelConfigId: input.modelConfigId ?? null
      }

      if (input.settings !== undefined) {
        newConversation.settings = input.settings
      }

      try {
        await repository.insert(newConversation)
        const created = await repository.findById(newConversation.id)
        if (!created) {
          throw new Error('Failed to load created conversation')
        }
        return created
      } catch (error) {
        throw new Error(formatOperationError('create conversation', error))
      }
    },

    async getConversation(conversationId) {
      const id = assertConversationId(conversationId)
      try {
        return await repository.findById(id)
      } catch (error) {
        throw new Error(formatOperationError('retrieve conversation', error))
      }
    },

    async listConversations() {
      try {
        return await repository.list()
      } catch (error) {
        throw new Error(formatOperationError('list conversations', error))
      }
    },

    async listConversationsPaginated(limit, offset): Promise<ConversationPaginationResult> {
      try {
        const results = await repository.list(limit + 1, offset)
        const hasMore = results.length > limit
        const conversations = hasMore ? results.slice(0, limit) : results
        return { conversations, hasMore }
      } catch (error) {
        throw new Error(formatOperationError('list conversations', error))
      }
    },

    async listConversationsByProject(projectId) {
      if (!projectId || !projectId.trim()) {
        throw new Error('Project ID is required')
      }

      try {
        return await repository.listByProject(projectId.trim())
      } catch (error) {
        throw new Error(formatOperationError('list project conversations', error))
      }
    },

    async updateConversation(conversationId, updates) {
      const id = assertConversationId(conversationId)
      const existing = await repository.findById(id)
      if (!existing) {
        throw new Error('Conversation not found')
      }

      const payload = buildUpdatePayload(updates)
      if (Object.keys(payload).length === 0) {
        return existing
      }

      try {
        await repository.update(id, payload)
        const updated = await repository.findById(id)
        if (!updated) {
          throw new Error('Failed to retrieve updated conversation')
        }
        return updated
      } catch (error) {
        throw new Error(formatOperationError('update conversation', error))
      }
    },

    async deleteConversation(conversationId) {
      const id = assertConversationId(conversationId)
      const existing = await repository.findById(id)
      if (!existing) {
        throw new Error('Conversation not found')
      }

      try {
        await repository.delete(id)
      } catch (error) {
        throw new Error(formatOperationError('delete conversation', error))
      }
    },

    async moveConversation(conversationId, projectId) {
      const id = assertConversationId(conversationId)
      const existing = await repository.findById(id)
      if (!existing) {
        throw new Error('Conversation not found')
      }
      await repository.update(id, { projectId })
    }
  }
}

export const conversationService = createConversationService()

export const {
  createConversation,
  getConversation,
  listConversations,
  listConversationsPaginated,
  listConversationsByProject,
  updateConversation,
  deleteConversation,
  moveConversation
} = conversationService

export const conversationRepository = dbConversationRepository
