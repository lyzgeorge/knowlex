import { ipcMain } from 'electron'
import { processAttachments, processAttachmentContents } from '@main/services/attachment-processor'
import type { IPCResult, AttachmentProcessRequest } from '@shared/types/ipc'
import type { AttachmentResult } from '@shared/types/file'
import { handleIPCCall, validateRequest, validateObject } from './common'
import { getErrorMessage } from '@shared/utils/error-handling'

/**
 * Simplified File IPC Handler
 * Only handles attachment processing (no project files)
 */

/**
 * Validates attachment processing request data
 */
function validateAttachmentProcessRequest(data: unknown): data is AttachmentProcessRequest {
  if (!validateObject(data)) return false

  const request = data as AttachmentProcessRequest
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
 * Validates attachment content processing request data
 */
function validateAttachmentContentRequest(data: unknown): data is {
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
 * Registers attachment processing IPC handlers
 * Called during application initialization
 */
export function registerFileIPCHandlers(): void {
  console.log('Registering attachment IPC handlers...')

  // Process attachments from paths
  ipcMain.handle(
    'attachment:process',
    async (_, data: unknown): Promise<IPCResult<AttachmentResult[]>> => {
      return handleIPCCall(async () => {
        const request = validateRequest(
          data,
          validateAttachmentProcessRequest,
          'Invalid attachment processing request'
        )

        // Extract file paths from the request
        const filePaths = request.files.map((file) => file.path)

        return await processAttachments(filePaths)
      })
    }
  )

  // Process attachments from content (for browser File API)
  ipcMain.handle(
    'attachment:process-content',
    async (_, data: unknown): Promise<IPCResult<AttachmentResult[]>> => {
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
        if (!validateAttachmentContentRequest(data)) {
          console.log('[IPC] Validation failed for attachment content request')
          return {
            success: false,
            error: 'Invalid attachment content processing request'
          }
        }

        console.log('[IPC] Validation passed, calling processAttachmentContents...')
        const result = await processAttachmentContents(data.files)
        console.log(
          '[IPC] processAttachmentContents completed with result:',
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
        console.error('[IPC] Error in attachment:process-content handler:', error)
        return {
          success: false,
          error: getErrorMessage(error, 'Unknown error occurred')
        }
      }
    }
  )

  console.log('Attachment IPC handlers registered successfully')
}

/**
 * Unregisters attachment-related IPC handlers
 * Called during application shutdown for cleanup
 */
export function unregisterFileIPCHandlers(): void {
  console.log('Unregistering attachment IPC handlers...')

  const channels = ['attachment:process', 'attachment:process-content']

  channels.forEach((channel) => {
    ipcMain.removeAllListeners(channel)
  })

  console.log('Attachment IPC handlers unregistered')
}
