import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import type { ProjectRepository, ProjectUseCases } from '@main/domain/project'
import type { Project } from '@shared/types/project'

vi.mock('@main/services/conversation', () => ({
  conversationService: {
    listConversationsByProject: vi.fn().mockResolvedValue([]),
    deleteConversation: vi.fn().mockResolvedValue(undefined)
  }
}))

vi.mock('@main/services/project-file-service', () => ({
  listProjectFilesByProject: vi.fn().mockResolvedValue([]),
  deleteProjectFileDeep: vi.fn().mockResolvedValue(undefined)
}))

async function importProjectService() {
  return await import('@main/services/project-service')
}

function createFakeProjectRepository() {
  const store = new Map<string, Project>()

  const repository: ProjectRepository = {
    async insert(project) {
      store.set(project.id, { ...project })
    },
    async findById(projectId) {
      const project = store.get(projectId)
      return project ? { ...project } : null
    },
    async list() {
      return Array.from(store.values()).map((project) => ({ ...project }))
    },
    async update(projectId, updates) {
      const project = store.get(projectId)
      if (!project) throw new Error('Project not found')
      const updated: Project = {
        ...project,
        ...updates,
        updatedAt: new Date().toISOString()
      }
      store.set(projectId, updated)
    },
    async delete(projectId) {
      store.delete(projectId)
    }
  }

  return { repository, store }
}

describe('projectService', () => {
  let repository: ProjectRepository
  let service: ProjectUseCases
  let conversationModule: any
  let projectFileModule: any

  beforeEach(async () => {
    const fakeRepo = createFakeProjectRepository()
    repository = fakeRepo.repository
    const module = await importProjectService()
    service = module.createProjectService(repository)

    conversationModule = await import('@main/services/conversation')
    conversationModule.conversationService.listConversationsByProject.mockResolvedValue([])
    conversationModule.conversationService.deleteConversation.mockResolvedValue(undefined)

    projectFileModule = await import('@main/services/project-file-service')
    projectFileModule.listProjectFilesByProject.mockResolvedValue([])
    projectFileModule.deleteProjectFileDeep.mockResolvedValue(undefined)
  })

  afterEach(() => {
    vi.clearAllMocks()
  })

  it('creates projects with trimmed names', async () => {
    const project = await service.createProject({ name: '  Demo  ' })
    expect(project.name).toBe('Demo')
  })

  it('prevents duplicate project names (case insensitive)', async () => {
    await service.createProject({ name: 'Sample' })
    await expect(service.createProject({ name: 'sample' })).rejects.toThrow()
  })

  it('updates project names', async () => {
    const project = await service.createProject({ name: 'Alpha' })
    const updated = await service.updateProject(project.id, { name: 'Beta' })
    expect(updated.name).toBe('Beta')
  })

  it('deletes projects and cascades to conversations/files/indexes', async () => {
    conversationModule.conversationService.listConversationsByProject.mockResolvedValue([
      { id: 'conv-1' } as any,
      { id: 'conv-2' } as any
    ])
    projectFileModule.listProjectFilesByProject.mockResolvedValue([{ id: 'file-1' } as any])

    const project = await service.createProject({ name: 'Gamma' })
    await service.deleteProject(project.id)

    expect(conversationModule.conversationService.deleteConversation).toHaveBeenCalledTimes(2)
    expect(projectFileModule.deleteProjectFileDeep).toHaveBeenCalledWith('file-1')
  })
})
