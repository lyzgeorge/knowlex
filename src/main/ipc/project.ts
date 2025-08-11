import { ipcMain, BrowserWindow } from 'electron'
import {
  createProject,
  getProject,
  listProjects,
  updateProject,
  deleteProject,
  getProjectStatistics,
  duplicateProject
} from '../services/project'
import type { IPCResult, ProjectCreateRequest, ProjectUpdateRequest } from '../../shared/types/ipc'
import type { Project, ProjectStats } from '../../shared/types'

/**
 * Project IPC Handler
 * Handles secure communication between renderer and main processes for project operations
 * Provides error handling and validation for all project-related IPC calls
 */

/**
 * Wraps service calls with consistent error handling and response format
 * Ensures all IPC responses follow the IPCResult pattern
 */
async function handleIPCCall<T>(operation: () => Promise<T>): Promise<IPCResult<T>> {
  try {
    const data = await operation()
    return {
      success: true,
      data
    }
  } catch (error) {
    console.error('IPC operation failed:', error)
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error occurred'
    }
  }
}

/**
 * Validates project creation request data
 */
function validateCreateRequest(data: unknown): data is ProjectCreateRequest {
  if (!data || typeof data !== 'object') {
    return false
  }

  const request = data as ProjectCreateRequest
  return (
    typeof request.name === 'string' &&
    request.name.trim().length > 0 &&
    (request.description === undefined || typeof request.description === 'string')
  )
}

/**
 * Validates project update request data
 */
function validateUpdateRequest(data: unknown): data is ProjectUpdateRequest {
  if (!data || typeof data !== 'object') {
    return false
  }

  const request = data as ProjectUpdateRequest
  return (
    typeof request.id === 'string' &&
    request.id.trim().length > 0 &&
    (request.name === undefined || typeof request.name === 'string') &&
    (request.description === undefined || typeof request.description === 'string')
  )
}

/**
 * Validates project ID parameter
 */
function validateProjectId(id: unknown): id is string {
  return typeof id === 'string' && id.trim().length > 0
}

/**
 * Registers all project-related IPC handlers
 * Called during application initialization
 */
export function registerProjectIPCHandlers(): void {
  console.log('Registering project IPC handlers...')

  // Create project
  ipcMain.handle('project:create', async (_, data: unknown): Promise<IPCResult<Project>> => {
    return handleIPCCall(async () => {
      if (!validateCreateRequest(data)) {
        throw new Error('Invalid project creation data')
      }

      return await createProject({
        name: data.name,
        description: data.description || ''
      })
    })
  })

  // List all projects
  ipcMain.handle('project:list', async (): Promise<IPCResult<Project[]>> => {
    return handleIPCCall(async () => {
      return await listProjects(true) // Include stats by default
    })
  })

  // Get single project
  ipcMain.handle('project:get', async (_, id: unknown): Promise<IPCResult<Project | null>> => {
    return handleIPCCall(async () => {
      if (!validateProjectId(id)) {
        throw new Error('Invalid project ID')
      }

      return await getProject(id, true) // Include stats by default
    })
  })

  // Update project
  ipcMain.handle('project:update', async (_, data: unknown): Promise<IPCResult<Project>> => {
    return handleIPCCall(async () => {
      if (!validateUpdateRequest(data)) {
        throw new Error('Invalid project update data')
      }

      return await updateProject(data.id, {
        name: data.name,
        description: data.description
      })
    })
  })

  // Delete project
  ipcMain.handle('project:delete', async (_, id: unknown): Promise<IPCResult<void>> => {
    return handleIPCCall(async () => {
      if (!validateProjectId(id)) {
        throw new Error('Invalid project ID')
      }

      await deleteProject(id)
    })
  })

  // Get project statistics
  ipcMain.handle('project:stats', async (_, id: unknown): Promise<IPCResult<ProjectStats>> => {
    return handleIPCCall(async () => {
      if (!validateProjectId(id)) {
        throw new Error('Invalid project ID')
      }

      return await getProjectStatistics(id)
    })
  })

  // Duplicate project
  ipcMain.handle('project:duplicate', async (_, id: unknown): Promise<IPCResult<Project>> => {
    return handleIPCCall(async () => {
      if (!validateProjectId(id)) {
        throw new Error('Invalid project ID')
      }

      return await duplicateProject(id)
    })
  })

  console.log('Project IPC handlers registered successfully')
}

/**
 * Unregisters all project-related IPC handlers
 * Called during application shutdown for cleanup
 */
export function unregisterProjectIPCHandlers(): void {
  console.log('Unregistering project IPC handlers...')

  const channels = [
    'project:create',
    'project:list',
    'project:get',
    'project:update',
    'project:delete',
    'project:stats',
    'project:duplicate'
  ]

  channels.forEach((channel) => {
    ipcMain.removeAllListeners(channel)
  })

  console.log('Project IPC handlers unregistered')
}

/**
 * Sends project-related events to renderer processes
 * Used for real-time updates and notifications
 */
export function sendProjectEvent(eventType: string, data: unknown): void {
  // Get all windows and send the event
  const windows = BrowserWindow.getAllWindows()

  windows.forEach((window) => {
    if (window.webContents && !window.webContents.isDestroyed()) {
      window.webContents.send(`project:${eventType}`, data)
    }
  })
}

/**
 * Project event types for real-time notifications
 */
export const PROJECT_EVENTS = {
  CREATED: 'created',
  UPDATED: 'updated',
  DELETED: 'deleted',
  STATS_UPDATED: 'stats_updated'
} as const
