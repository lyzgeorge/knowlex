import { ipcMain, BrowserWindow } from 'electron'
import { processTemporaryFiles, processTemporaryFileContents } from '../services/file-temp'
import type { IPCResult, TemporaryFileRequest } from '../../shared/types/ipc'
import type { TemporaryFileResult } from '../../shared/types/file'

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
      console.log('[IPC] file:process-temp-content called with data:', data)
      return handleIPCCall(async () => {
        if (!validateTemporaryFileContentRequest(data)) {
          console.log('[IPC] Validation failed for temp file content request')
          throw new Error('Invalid temporary file content processing request')
        }

        console.log('[IPC] Validation passed, calling processTemporaryFileContents...')
        // Process files with content directly
        const result = await processTemporaryFileContents(data.files)
        console.log(
          '[IPC] processTemporaryFileContents completed with result:',
          result.map((r) => ({ filename: r.filename, error: r.error }))
        )
        return result
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

  const channels = ['file:process-temp', 'file:process-temp-content']

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
  PROCESSING_ERROR: 'processing_error'
} as const
