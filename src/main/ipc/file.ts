import { ipcMain } from 'electron'
import { ATTACHMENT_CHANNELS } from '@shared/constants/ipc-channels'
import { processAttachments, processAttachmentContents } from '@main/services/attachment-processor'
import {
  AttachmentContentProcessRequestSchema,
  AttachmentProcessRequestSchema
} from '@shared/schemas/file'
import { handleIPCCall } from './common'
import type { z } from 'zod'

function parseRequest<T>(schema: z.ZodType<T>, data: unknown): T {
  const parsed = schema.safeParse(data)
  if (!parsed.success) {
    const message = parsed.error.issues.map((issue) => issue.message).join('; ')
    throw new Error(message)
  }
  return parsed.data
}

/**
 * Simplified File IPC Handler
 * Only handles attachment processing (no project files)
 */

/**
 * Registers attachment processing IPC handlers
 * Called during application initialization
 */
export function registerFileIPCHandlers(): void {
  console.log('Registering attachment IPC handlers...')

  ipcMain.handle(ATTACHMENT_CHANNELS.process, async (_, data: unknown) => {
    return handleIPCCall(async () => {
      const request = parseRequest(AttachmentProcessRequestSchema, data)
      const filePaths = request.files.map((file) => file.path)
      return await processAttachments(filePaths)
    })
  })

  ipcMain.handle(ATTACHMENT_CHANNELS.processContent, async (_, data: unknown) => {
    return handleIPCCall(async () => {
      const request = parseRequest(AttachmentContentProcessRequestSchema, data)
      return await processAttachmentContents(request.files)
    })
  })

  console.log('Attachment IPC handlers registered successfully')
}

/**
 * Unregisters attachment-related IPC handlers
 * Called during application shutdown for cleanup
 */
export function unregisterFileIPCHandlers(): void {
  console.log('Unregistering attachment IPC handlers...')

  const channels = [ATTACHMENT_CHANNELS.process, ATTACHMENT_CHANNELS.processContent]

  channels.forEach((channel) => {
    ipcMain.removeAllListeners(channel)
  })

  console.log('Attachment IPC handlers unregistered')
}
