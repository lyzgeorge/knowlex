import { ipcMain } from 'electron'
import { getProject, listProjects } from '../services/project'
import type { IPCResult } from '../../shared/types/ipc'
import type { Project } from '../../shared/types'

/**
 * Simplified Project IPC Handler
 * Only handles basic project operations that are actually being used
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
 * Validates project ID parameter
 */
function validateProjectId(id: unknown): id is string {
  return typeof id === 'string' && id.trim().length > 0
}

/**
 * Registers basic project-related IPC handlers
 * Called during application initialization
 */
export function registerProjectIPCHandlers(): void {
  console.log('Registering project IPC handlers...')

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

  console.log('Project IPC handlers registered successfully')
}

/**
 * Unregisters project-related IPC handlers
 * Called during application shutdown for cleanup
 */
export function unregisterProjectIPCHandlers(): void {
  console.log('Unregistering project IPC handlers...')

  const channels = ['project:list', 'project:get']

  channels.forEach((channel) => {
    ipcMain.removeAllListeners(channel)
  })

  console.log('Project IPC handlers unregistered')
}
