import { ipcMain, BrowserWindow } from 'electron'
import { processTemporaryFiles, processTemporaryFileContents } from '../services/file-temp'
import {
  uploadProjectFiles,
  deleteProjectFile,
  retryFileProcessing,
  pauseFileProcessing,
  resumeFileProcessing,
  getProcessingQueueStatus
} from '../services/file-project'
import { listProjectFiles } from '../database/queries'
import type { IPCResult, TemporaryFileRequest } from '../../shared/types/ipc'
import type { TemporaryFileResult, ProjectFile } from '../../shared/types/file'

/**
 * File IPC Handler
 * Handles secure communication between renderer and main processes for file operations
 * Provides error handling and validation for all file-related IPC calls
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
    console.error('File IPC operation failed:', error)
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error occurred'
    }
  }
}

/**
 * Validates temporary file processing request data
 */
function validateTemporaryFileRequest(data: unknown): data is TemporaryFileRequest {
  if (!data || typeof data !== 'object') {
    return false
  }

  const request = data as TemporaryFileRequest
  return (
    Array.isArray(request.files) &&
    request.files.every(
      (file) =>
        file &&
        typeof file === 'object' &&
        'name' in file &&
        'path' in file &&
        typeof file.name === 'string' &&
        typeof file.path === 'string'
    )
  )
}

/**
 * Validates temporary file content processing request data
 */
function validateTemporaryFileContentRequest(data: unknown): data is {
  files: Array<{ name: string; content: string; size: number }>
} {
  if (!data || typeof data !== 'object') {
    return false
  }

  const request = data as { files: Array<{ name: string; content: string; size: number }> }
  return (
    Array.isArray(request.files) &&
    request.files.every(
      (file) =>
        file &&
        typeof file === 'object' &&
        'name' in file &&
        'content' in file &&
        'size' in file &&
        typeof file.name === 'string' &&
        typeof file.content === 'string' &&
        typeof file.size === 'number'
    )
  )
}

/**
 * Validates project file upload request data
 */
function validateProjectFileUploadRequest(data: unknown): data is {
  projectId: string
  files: Array<{ name: string; content: string; size: number }>
} {
  if (!data || typeof data !== 'object') {
    return false
  }

  const request = data as {
    projectId: string
    files: Array<{ name: string; content: string; size: number }>
  }

  return (
    typeof request.projectId === 'string' &&
    request.projectId.length > 0 &&
    Array.isArray(request.files) &&
    request.files.every(
      (file) =>
        file &&
        typeof file === 'object' &&
        'name' in file &&
        'content' in file &&
        'size' in file &&
        typeof file.name === 'string' &&
        typeof file.content === 'string' &&
        typeof file.size === 'number'
    )
  )
}

/**
 * Registers all file-related IPC handlers
 * Called during application initialization
 */
export function registerFileIPCHandlers(): void {
  console.log('Registering file IPC handlers...')

  // Process temporary files from paths
  ipcMain.handle(
    'file:process-temp',
    async (_, data: unknown): Promise<IPCResult<TemporaryFileResult[]>> => {
      return handleIPCCall(async () => {
        if (!validateTemporaryFileRequest(data)) {
          throw new Error('Invalid temporary file processing request')
        }

        // Extract file paths from the request
        const filePaths = data.files.map((file) => file.path)

        return await processTemporaryFiles(filePaths)
      })
    }
  )

  // Process temporary files from content (for browser File API)
  ipcMain.handle(
    'file:process-temp-content',
    async (_, data: unknown): Promise<IPCResult<TemporaryFileResult[]>> => {
      console.log(
        '[IPC] file:process-temp-content called with data:',
        data && typeof data === 'object' && 'files' in data && Array.isArray(data.files)
          ? data.files.map((f: unknown) => ({
              name: typeof f === 'object' && f && 'name' in f ? f.name : 'unknown',
              size: typeof f === 'object' && f && 'size' in f ? f.size : 0,
              contentLength:
                typeof f === 'object' && f && 'content' in f && typeof f.content === 'string'
                  ? f.content.length
                  : 0
            }))
          : 'invalid data'
      )

      try {
        if (!validateTemporaryFileContentRequest(data)) {
          console.log('[IPC] Validation failed for temp file content request')
          return {
            success: false,
            error: 'Invalid temporary file content processing request'
          }
        }

        console.log('[IPC] Validation passed, calling processTemporaryFileContents...')
        // Process files with content directly
        const result = await processTemporaryFileContents(data.files)
        console.log(
          '[IPC] processTemporaryFileContents completed with result:',
          result.map((r) => ({
            filename: r.filename,
            error: r.error,
            contentLength: r.content?.length
          }))
        )
        return {
          success: true,
          data: result
        }
      } catch (error) {
        console.error('[IPC] Error in file:process-temp-content handler:', error)
        return {
          success: false,
          error: error instanceof Error ? error.message : 'Unknown error occurred'
        }
      }
    }
  )

  // Upload project files
  ipcMain.handle(
    'file:upload-project',
    async (_, data: unknown): Promise<IPCResult<ProjectFile[]>> => {
      console.log('[IPC] file:upload-project called')
      return handleIPCCall(async () => {
        if (!validateProjectFileUploadRequest(data)) {
          throw new Error('Invalid project file upload request')
        }

        return await uploadProjectFiles(data.projectId, data.files)
      })
    }
  )

  // List project files
  ipcMain.handle(
    'file:list-project',
    async (_, projectId: unknown): Promise<IPCResult<ProjectFile[]>> => {
      return handleIPCCall(async () => {
        if (typeof projectId !== 'string' || projectId.length === 0) {
          throw new Error('Invalid project ID')
        }

        return await listProjectFiles(projectId)
      })
    }
  )

  // Delete project file
  ipcMain.handle('file:delete-project', async (_, fileId: unknown): Promise<IPCResult<void>> => {
    return handleIPCCall(async () => {
      if (typeof fileId !== 'string' || fileId.length === 0) {
        throw new Error('Invalid file ID')
      }

      await deleteProjectFile(fileId)
    })
  })

  // Retry file processing
  ipcMain.handle('file:retry-processing', async (_, fileId: unknown): Promise<IPCResult<void>> => {
    return handleIPCCall(async () => {
      if (typeof fileId !== 'string' || fileId.length === 0) {
        throw new Error('Invalid file ID')
      }

      await retryFileProcessing(fileId)
    })
  })

  // Pause file processing
  ipcMain.handle('file:pause-processing', async (_, fileId: unknown): Promise<IPCResult<void>> => {
    return handleIPCCall(async () => {
      if (typeof fileId !== 'string' || fileId.length === 0) {
        throw new Error('Invalid file ID')
      }

      await pauseFileProcessing(fileId)
    })
  })

  // Resume file processing
  ipcMain.handle('file:resume-processing', async (_, fileId: unknown): Promise<IPCResult<void>> => {
    return handleIPCCall(async () => {
      if (typeof fileId !== 'string' || fileId.length === 0) {
        throw new Error('Invalid file ID')
      }

      await resumeFileProcessing(fileId)
    })
  })

  // Get processing queue status
  ipcMain.handle(
    'file:queue-status',
    async (): Promise<IPCResult<{ pending: number; processing: number; total: number }>> => {
      return handleIPCCall(async () => {
        return getProcessingQueueStatus()
      })
    }
  )

  console.log('File IPC handlers registered successfully')
}

/**
 * Unregisters all file-related IPC handlers
 * Called during application shutdown for cleanup
 */
export function unregisterFileIPCHandlers(): void {
  console.log('Unregistering file IPC handlers...')

  const channels = [
    'file:process-temp',
    'file:process-temp-content',
    'file:upload-project',
    'file:list-project',
    'file:delete-project',
    'file:retry-processing',
    'file:pause-processing',
    'file:resume-processing',
    'file:queue-status'
  ]

  channels.forEach((channel) => {
    ipcMain.removeAllListeners(channel)
  })

  console.log('File IPC handlers unregistered')
}

/**
 * Sends file-related events to renderer processes
 * Used for real-time updates and notifications
 */
export function sendFileEvent(eventType: string, data: unknown): void {
  // Get all windows and send the event
  const windows = BrowserWindow.getAllWindows()

  windows.forEach((window) => {
    if (window.webContents && !window.webContents.isDestroyed()) {
      window.webContents.send(`file:${eventType}`, data)
    }
  })
}

/**
 * File event types for real-time notifications
 */
export const FILE_EVENTS = {
  TEMP_PROCESSED: 'temp_processed',
  PROCESSING_ERROR: 'processing_error',
  PROJECT_FILE_STATUS_CHANGED: 'project_file_status_changed',
  PROCESSING_QUEUE_UPDATED: 'processing_queue_updated'
} as const
