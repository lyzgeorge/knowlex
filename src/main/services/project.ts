import {
  createProject as dbCreateProject,
  getProject as dbGetProject,
  listProjects as dbListProjects,
  updateProject as dbUpdateProject,
  deleteProject as dbDeleteProject,
  getProjectStats as dbGetProjectStats
} from '../database/queries'
import { generateId } from '../../shared/utils/id'
import type { Project, ProjectStats } from '../../shared/types'

/**
 * Project Management Service
 * Handles business logic for project CRUD operations
 * Provides validation, error handling, and coordination between different components
 */

export interface CreateProjectData {
  name: string
  description?: string
}

export interface UpdateProjectData {
  name?: string
  description?: string
}

/**
 * Creates a new project with generated ID and default values
 * Validates input data and ensures business rules are met
 */
export async function createProject(data: CreateProjectData): Promise<Project> {
  // Input validation
  if (!data.name || data.name.trim().length === 0) {
    throw new Error('Project name is required')
  }

  if (data.name.trim().length > 100) {
    throw new Error('Project name must be 100 characters or less')
  }

  // Check for duplicate names
  const existingProjects = await dbListProjects()
  const normalizedName = data.name.trim().toLowerCase()
  const nameExists = existingProjects.some(
    (project) => project.name.trim().toLowerCase() === normalizedName
  )

  if (nameExists) {
    throw new Error('A project with this name already exists')
  }

  const projectId = generateId()
  const now = new Date().toISOString()

  const newProject: Project = {
    id: projectId,
    name: data.name.trim(),
    description: data.description?.trim() || '',
    createdAt: now,
    updatedAt: now
  }

  try {
    await dbCreateProject(newProject)
    console.log(`Project created successfully: ${projectId} - ${newProject.name}`)
    return newProject
  } catch (error) {
    console.error('Failed to create project:', error)
    throw new Error(
      `Failed to create project: ${error instanceof Error ? error.message : 'Unknown error'}`
    )
  }
}

/**
 * Retrieves a project by ID with optional stats
 * Returns null if project is not found
 */
export async function getProject(id: string, includeStats = false): Promise<Project | null> {
  if (!id || id.trim().length === 0) {
    throw new Error('Project ID is required')
  }

  try {
    const project = await dbGetProject(id.trim())

    if (!project) {
      return null
    }

    // Optionally include project statistics
    if (includeStats) {
      const stats = await dbGetProjectStats(id)
      project.stats = stats
    }

    return project
  } catch (error) {
    console.error(`Failed to get project ${id}:`, error)
    throw new Error(
      `Failed to retrieve project: ${error instanceof Error ? error.message : 'Unknown error'}`
    )
  }
}

/**
 * Lists all projects ordered by last updated date
 * Optionally includes project statistics
 */
export async function listProjects(includeStats = false): Promise<Project[]> {
  try {
    const projects = await dbListProjects()

    // Optionally include statistics for each project
    if (includeStats) {
      const projectsWithStats = await Promise.allSettled(
        projects.map(async (project) => {
          try {
            const stats = await dbGetProjectStats(project.id)
            return { ...project, stats }
          } catch (error) {
            console.warn(`Failed to get stats for project ${project.id}:`, error)
            return project
          }
        })
      )

      return projectsWithStats
        .filter(
          (result): result is PromiseFulfilledResult<Project> => result.status === 'fulfilled'
        )
        .map((result) => result.value)
    }

    return projects
  } catch (error) {
    console.error('Failed to list projects:', error)
    throw new Error(
      `Failed to list projects: ${error instanceof Error ? error.message : 'Unknown error'}`
    )
  }
}

/**
 * Updates an existing project
 * Validates input and ensures project exists
 */
export async function updateProject(id: string, data: UpdateProjectData): Promise<Project> {
  if (!id || id.trim().length === 0) {
    throw new Error('Project ID is required')
  }

  // Check if project exists
  const existingProject = await dbGetProject(id.trim())
  if (!existingProject) {
    throw new Error('Project not found')
  }

  // Input validation
  if (data.name !== undefined) {
    if (!data.name || data.name.trim().length === 0) {
      throw new Error('Project name cannot be empty')
    }

    if (data.name.trim().length > 100) {
      throw new Error('Project name must be 100 characters or less')
    }

    // Check for duplicate names (excluding current project)
    const existingProjects = await dbListProjects()
    const normalizedName = data.name.trim().toLowerCase()
    const nameExists = existingProjects.some(
      (project) => project.id !== id && project.name.trim().toLowerCase() === normalizedName
    )

    if (nameExists) {
      throw new Error('A project with this name already exists')
    }
  }

  // Prepare update data
  const updates: Partial<Pick<Project, 'name' | 'description'>> = {}
  if (data.name !== undefined) {
    updates.name = data.name.trim()
  }
  if (data.description !== undefined) {
    updates.description = data.description.trim()
  }

  // Only proceed if there are actual changes
  if (Object.keys(updates).length === 0) {
    return existingProject
  }

  try {
    await dbUpdateProject(id, updates)

    // Fetch and return updated project
    const updatedProject = await dbGetProject(id)
    if (!updatedProject) {
      throw new Error('Failed to retrieve updated project')
    }

    console.log(`Project updated successfully: ${id} - ${updatedProject.name}`)
    return updatedProject
  } catch (error) {
    console.error(`Failed to update project ${id}:`, error)
    throw new Error(
      `Failed to update project: ${error instanceof Error ? error.message : 'Unknown error'}`
    )
  }
}

/**
 * Deletes a project and all its related data
 * Includes confirmation of deletion by checking if project exists first
 */
export async function deleteProject(id: string): Promise<void> {
  if (!id || id.trim().length === 0) {
    throw new Error('Project ID is required')
  }

  // Check if project exists
  const existingProject = await dbGetProject(id.trim())
  if (!existingProject) {
    throw new Error('Project not found')
  }

  try {
    // Get project stats before deletion for logging
    const stats = await dbGetProjectStats(id)

    // Database cascading delete will handle:
    // - project_files
    // - project_memories
    // - project_notes
    // - conversations (set project_id to null)
    await dbDeleteProject(id)

    console.log(`Project deleted successfully: ${id} - ${existingProject.name}`, {
      fileCount: stats.fileCount,
      conversationCount: stats.conversationCount,
      messageCount: stats.messageCount
    })
  } catch (error) {
    console.error(`Failed to delete project ${id}:`, error)
    throw new Error(
      `Failed to delete project: ${error instanceof Error ? error.message : 'Unknown error'}`
    )
  }
}

/**
 * Gets detailed statistics for a project
 * Returns counts of conversations, messages, files, and total file size
 */
export async function getProjectStatistics(id: string): Promise<ProjectStats> {
  if (!id || id.trim().length === 0) {
    throw new Error('Project ID is required')
  }

  // Verify project exists
  const project = await dbGetProject(id.trim())
  if (!project) {
    throw new Error('Project not found')
  }

  try {
    const stats = await dbGetProjectStats(id)
    return stats
  } catch (error) {
    console.error(`Failed to get project stats for ${id}:`, error)
    throw new Error(
      `Failed to get project statistics: ${error instanceof Error ? error.message : 'Unknown error'}`
    )
  }
}

/**
 * Duplicates a project with its configuration but not its conversation history
 * Creates a new project with the same name (with "Copy" suffix) and description
 */
export async function duplicateProject(id: string): Promise<Project> {
  if (!id || id.trim().length === 0) {
    throw new Error('Project ID is required')
  }

  // Get source project
  const sourceProject = await dbGetProject(id.trim())
  if (!sourceProject) {
    throw new Error('Project not found')
  }

  try {
    // Create duplicate with modified name
    const duplicateName = `${sourceProject.name} Copy`
    const newProject = await createProject({
      name: duplicateName,
      description: sourceProject.description
    })

    console.log(`Project duplicated successfully: ${sourceProject.id} -> ${newProject.id}`)
    return newProject
  } catch (error) {
    console.error(`Failed to duplicate project ${id}:`, error)
    throw new Error(
      `Failed to duplicate project: ${error instanceof Error ? error.message : 'Unknown error'}`
    )
  }
}
