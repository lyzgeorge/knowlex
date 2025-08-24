import { ipcMain } from 'electron'
import { processTemporaryFiles, processTemporaryFileContents } from '@main/services/file-temp'
import type { IPCResult, TemporaryFileRequest } from '@shared/types/ipc'
import type { TemporaryFileResult } from '@shared/types/file'
import { handleIPCCall, validateRequest, validateObject } from './common'

/**
 * Simplified File IPC Handler
 * Only handles temporary file processing (no project files)
 */

/**
 * Validates temporary file processing request data
 */
function validateTemporaryFileRequest(data: unknown): data is TemporaryFileRequest {
  if (!validateObject(data)) return false

  const request = data as TemporaryFileRequest
  return (
    Array.isArray(request.files) &&
    request.files.every(
      (file) =>
        validateObject(file) &&
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
  if (!validateObject(data)) return false

  const request = data as { files: Array<{ name: string; content: string; size: number }> }
  return (
    Array.isArray(request.files) &&
    request.files.every(
      (file) =>
        validateObject(file) &&
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
 * Registers temporary file processing IPC handlers
 * Called during application initialization
 */
export function registerFileIPCHandlers(): void {
  console.log('Registering file IPC handlers...')

  // Process temporary files from paths
  ipcMain.handle(
    'file:process-temp',
    async (_, data: unknown): Promise<IPCResult<TemporaryFileResult[]>> => {
      return handleIPCCall(async () => {
        const request = validateRequest(
          data,
          validateTemporaryFileRequest,
          'Invalid temporary file processing request'
        )

        // Extract file paths from the request
        const filePaths = request.files.map((file) => file.path)

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

  console.log('File IPC handlers registered successfully')
}

/**
 * Unregisters file-related IPC handlers
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
