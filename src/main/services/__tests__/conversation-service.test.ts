import { describe, expect, it, beforeEach } from 'vitest'
import { createConversationService } from '@main/services/conversation'
import type { ConversationRepository, ConversationUseCases } from '@main/domain/conversation'
import type { Conversation } from '@shared/types/conversation-types'

function cloneConversation(conversation: Conversation): Conversation {
  return JSON.parse(JSON.stringify(conversation))
}

function createFakeConversationRepository() {
  const store = new Map<string, Conversation>()
  const order: string[] = []
  let clock = 0

  const nextTimestamp = () => {
    clock += 1
    return new Date(Date.now() + clock).toISOString()
  }

  const repository: ConversationRepository = {
    async insert(conversation) {
      const now = nextTimestamp()
      const record: Conversation = {
        id: conversation.id,
        title: conversation.title,
        projectId: conversation.projectId ?? null,
        modelConfigId: conversation.modelConfigId ?? null,
        createdAt: now,
        updatedAt: now
      }
      if (conversation.settings !== undefined) {
        record.settings = conversation.settings
      }
      store.set(record.id, record)
      order.push(record.id)
    },
    async findById(conversationId) {
      const record = store.get(conversationId)
      return record ? cloneConversation(record) : null
    },
    async list(limit, offset) {
      const ordered = [...order]
        .map((id) => store.get(id))
        .filter((conv): conv is Conversation => Boolean(conv))
        .sort((a, b) => b.updatedAt.localeCompare(a.updatedAt))

      const start = offset ?? 0
      const end = limit !== undefined ? start + limit : undefined

      return ordered.slice(start, end).map(cloneConversation)
    },
    async update(conversationId, updates) {
      const current = store.get(conversationId)
      if (!current) throw new Error('Conversation not found')
      const updated: Conversation = {
        ...current,
        updatedAt: nextTimestamp()
      }
      if (updates.title !== undefined) updated.title = updates.title
      if (updates.projectId !== undefined) updated.projectId = updates.projectId
      if (updates.modelConfigId !== undefined) updated.modelConfigId = updates.modelConfigId
      if (updates.settings !== undefined) {
        updated.settings = updates.settings
      }
      store.set(conversationId, updated)
    },
    async delete(conversationId) {
      store.delete(conversationId)
      const index = order.indexOf(conversationId)
      if (index >= 0) {
        order.splice(index, 1)
      }
    },
    async listByProject(projectId) {
      return order
        .map((id) => store.get(id))
        .filter((conv): conv is Conversation => Boolean(conv && conv.projectId === projectId))
        .map(cloneConversation)
    }
  }

  return { repository, store }
}

describe('conversationService', () => {
  let service: ConversationUseCases

  beforeEach(() => {
    const { repository } = createFakeConversationRepository()
    service = createConversationService(repository)
  })

  it('creates conversations with default title when none provided', async () => {
    const conversation = await service.createConversation({})
    expect(conversation.title).toBe('New Chat')
    expect(conversation.id).toBeTruthy()
    expect(conversation.createdAt).toBeTruthy()
    expect(conversation.updatedAt).toBeTruthy()
  })

  it('creates conversations with trimmed custom title', async () => {
    const conversation = await service.createConversation({ title: '  My Project  ' })
    expect(conversation.title).toBe('My Project')
  })

  it('updates conversation titles and respects validation', async () => {
    const conversation = await service.createConversation({ title: 'Initial Title' })
    const updated = await service.updateConversation(conversation.id, { title: 'Renamed' })
    expect(updated.title).toBe('Renamed')
    expect(updated.updatedAt).not.toBe(conversation.updatedAt)
  })

  it('moves conversations between projects', async () => {
    const conversation = await service.createConversation({ projectId: 'project-a' })
    await service.moveConversation(conversation.id, 'project-b')
    const reloaded = await service.getConversation(conversation.id)
    expect(reloaded?.projectId).toBe('project-b')
  })

  it('lists conversations by project', async () => {
    const convA = await service.createConversation({ projectId: 'proj-1', title: 'A' })
    await service.createConversation({ projectId: 'proj-2', title: 'B' })
    const results = await service.listConversationsByProject('proj-1')
    expect(results).toHaveLength(1)
    expect(results[0]?.id).toBe(convA.id)
  })

  it('deletes conversations', async () => {
    const conversation = await service.createConversation({ title: 'Delete Me' })
    await service.deleteConversation(conversation.id)
    const reloaded = await service.getConversation(conversation.id)
    expect(reloaded).toBeNull()
  })
})
