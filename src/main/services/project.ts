import { getProject as dbGetProject, listProjects as dbListProjects } from '../database/queries'
import type { Project } from '../../shared/types'

/**
 * Simplified Project Management Service
 * Only handles basic project operations that are actually being used
 */

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
      // TODO: Implement project statistics function
      // const stats = await dbGetProjectStats(id)
      // project.stats = stats
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
      // TODO: Implement project statistics function
      // const projectsWithStats = await Promise.allSettled(
      //   projects.map(async (project) => {
      //     try {
      //       const stats = await dbGetProjectStats(project.id)
      //       return { ...project, stats }
      //     } catch (error) {
      //       console.warn(`Failed to get stats for project ${project.id}:`, error)
      //       return project
      //     }
      //   })
      // )
    }

    return projects
  } catch (error) {
    console.error('Failed to list projects:', error)
    throw new Error(
      `Failed to list projects: ${error instanceof Error ? error.message : 'Unknown error'}`
    )
  }
}
