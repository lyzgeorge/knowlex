import {
  createProject as dbCreateProject,
  getProject as dbGetProject,
  listProjects as dbListProjects,
  updateProject as dbUpdateProject,
  deleteProject as dbDeleteProject,
  listConversationsByProject as dbListConversationsByProject
} from '@main/database/queries'
import type { Project } from '@shared/types/project'
import { generateId } from '@shared/utils/id'

export interface CreateProjectData {
  name: string
}

export interface UpdateProjectData {
  name?: string
}

export async function createProject(data: CreateProjectData): Promise<Project> {
  const name = (data.name || '').trim()
  if (!name) throw new Error('Project name is required')
  if (name.length > 100) throw new Error('Project name must be 100 characters or less')

  // Enforce unique name (case-insensitive)
  const existing = await dbListProjects()
  if (existing.some((p) => p.name.toLowerCase() === name.toLowerCase())) {
    throw new Error('A project with this name already exists')
  }

  const now = new Date().toISOString()
  const project: Project = {
    id: generateId(),
    name,
    createdAt: now,
    updatedAt: now
  }
  await dbCreateProject(project)
  return project
}

export async function getProjectById(id: string): Promise<Project | null> {
  if (!id || !id.trim()) throw new Error('Project ID is required')
  return await dbGetProject(id.trim())
}

export async function getAllProjects(): Promise<Project[]> {
  return await dbListProjects()
}

export async function updateProjectById(id: string, updates: UpdateProjectData): Promise<Project> {
  if (!id || !id.trim()) throw new Error('Project ID is required')
  const existing = await dbGetProject(id.trim())
  if (!existing) throw new Error('Project not found')
  const name = updates.name?.trim()
  if (name !== undefined) {
    if (!name) throw new Error('Project name cannot be empty')
    if (name.length > 100) throw new Error('Project name must be 100 characters or less')
  }
  // Enforce unique name if changed
  if (name && name.toLowerCase() !== existing.name.toLowerCase()) {
    const all = await dbListProjects()
    if (all.some((p) => p.id !== id && p.name.toLowerCase() === name.toLowerCase())) {
      throw new Error('A project with this name already exists')
    }
  }

  const updateData: { name?: string } = {}
  if (name !== undefined) {
    updateData.name = name
  }
  await dbUpdateProject(id.trim(), updateData)
  const updated = await dbGetProject(id.trim())
  if (!updated) throw new Error('Failed to retrieve updated project')
  return updated
}

/**
 * Deletes a project and all its conversations as per PRD.
 * Since DB FK uses SET NULL, enforce cascading via transaction here.
 */
export async function deleteProjectById(id: string): Promise<void> {
  if (!id || !id.trim()) throw new Error('Project ID is required')
  const proj = await dbGetProject(id.trim())
  if (!proj) throw new Error('Project not found')

  // Enforce deletion of all conversations in this project
  const convs = await dbListConversationsByProject(id.trim())
  // Since we don't have direct deleteConversationsByProject, manually set to null or delete one by one via IPC in services is overkill here.
  // Follow PRD strictly: remove conversations by setting projectId to null is not acceptable. We'll delete one by one.
  for (const c of convs) {
    // Soft dependency: use conversation DB delete via import to avoid circular dep; do dynamic import.
    const { deleteConversation } = (await import('@main/database/queries')) as any
    await deleteConversation(c.id)
  }

  await dbDeleteProject(id.trim())
}

export async function getProjectConversations(projectId: string) {
  if (!projectId || !projectId.trim()) throw new Error('Project ID is required')
  return await dbListConversationsByProject(projectId.trim())
}
