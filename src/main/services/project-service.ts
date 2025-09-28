import type { ProjectRepository, ProjectUseCases } from '@main/domain/project'
import { conversationService } from '@main/services/conversation'
import {
  deleteProjectFileDeep,
  listProjectFilesByProject
} from '@main/services/project-file-service'
import {
  createProject as dbCreateProject,
  deleteProject as dbDeleteProject,
  getProject as dbGetProject,
  listProjects as dbListProjects,
  updateProject as dbUpdateProject
} from '@main/infra/database/queries'
import type { Project } from '@shared/types/project'
import { formatOperationError } from '@shared/utils/error-handling'
import { generateId } from '@shared/utils/id'

const NAME_MAX_LENGTH = 100

const dbProjectRepository: ProjectRepository = {
  async insert(project) {
    await dbCreateProject(project)
  },
  async findById(projectId) {
    return await dbGetProject(projectId)
  },
  async list() {
    return await dbListProjects()
  },
  async update(projectId, updates) {
    await dbUpdateProject(projectId, updates)
  },
  async delete(projectId) {
    await dbDeleteProject(projectId)
  }
}

function normalizeName(name: string | undefined): string {
  const trimmed = (name || '').trim()
  if (!trimmed) {
    throw new Error('Project name is required')
  }
  if (trimmed.length > NAME_MAX_LENGTH) {
    throw new Error(`Project name must be ${NAME_MAX_LENGTH} characters or less`)
  }
  return trimmed
}

async function ensureNameUnique(name: string, projects: Project[], excludeId?: string) {
  const lower = name.toLowerCase()
  const conflict = projects.some((project) => {
    if (excludeId && project.id === excludeId) return false
    return project.name.toLowerCase() === lower
  })
  if (conflict) {
    throw new Error('A project with this name already exists')
  }
}

function assertProjectId(id: string): string {
  if (!id || !id.trim()) {
    throw new Error('Project ID is required')
  }
  return id.trim()
}

export function createProjectService(
  repository: ProjectRepository = dbProjectRepository
): ProjectUseCases {
  return {
    async createProject(input) {
      const name = normalizeName(input.name)
      const existing = await repository.list()
      await ensureNameUnique(name, existing)

      const now = new Date().toISOString()
      const project: Project = {
        id: generateId(),
        name,
        createdAt: now,
        updatedAt: now
      }

      try {
        await repository.insert(project)
        return project
      } catch (error) {
        throw new Error(formatOperationError('create project', error))
      }
    },

    async getProjectById(projectId) {
      const id = assertProjectId(projectId)
      try {
        return await repository.findById(id)
      } catch (error) {
        throw new Error(formatOperationError('retrieve project', error))
      }
    },

    async listProjects() {
      try {
        return await repository.list()
      } catch (error) {
        throw new Error(formatOperationError('list projects', error))
      }
    },

    async updateProject(projectId, updates) {
      const id = assertProjectId(projectId)
      const existing = await repository.findById(id)
      if (!existing) {
        throw new Error('Project not found')
      }

      let updatedName: string | undefined
      if (updates.name !== undefined) {
        updatedName = normalizeName(updates.name)
        await ensureNameUnique(updatedName, await repository.list(), id)
      }

      if (updatedName === undefined) {
        return existing
      }

      try {
        await repository.update(id, { name: updatedName })
        const refreshed = await repository.findById(id)
        if (!refreshed) {
          throw new Error('Failed to retrieve updated project')
        }
        return refreshed
      } catch (error) {
        throw new Error(formatOperationError('update project', error))
      }
    },

    async deleteProject(projectId) {
      const id = assertProjectId(projectId)
      const existing = await repository.findById(id)
      if (!existing) {
        throw new Error('Project not found')
      }

      try {
        const conversations = await conversationService.listConversationsByProject(id)
        for (const conversation of conversations) {
          await conversationService.deleteConversation(conversation.id)
        }

        const files = await listProjectFilesByProject(id)
        for (const file of files) {
          await deleteProjectFileDeep(file.id)
        }

        await repository.delete(id)
      } catch (error) {
        throw new Error(formatOperationError('delete project', error))
      }
    }
  }
}

export const projectService = createProjectService()

export const { createProject, getProjectById, listProjects, updateProject, deleteProject } =
  projectService
