import { ipcMain } from 'electron'
import type { IPCResult } from '@shared/types/ipc'
import type { Project } from '@shared/types/project'
import { PROJECT_CHANNELS } from '@shared/constants/ipc-channels'
import {
  createProject,
  getProjectById,
  listProjects,
  updateProject,
  deleteProject
} from '@main/services/project-service'
import { conversationService } from '@main/services/conversation'
import { handleIPCCall, requireValidId, parseWithSchema } from './common'
import { ProjectCreateRequestSchema, ProjectUpdateRequestSchema } from '@shared/schemas/project'

function normalizeProjectCreateInput(input: unknown) {
  if (typeof input === 'string') {
    return { name: input }
  }
  if (!input || typeof input !== 'object') {
    return {}
  }
  return input
}

function normalizeProjectUpdateInput(idArg: unknown, updatesArg: unknown) {
  if (idArg && typeof idArg === 'object' && (idArg as any).id) {
    return idArg
  }
  return {
    id: idArg,
    updates: updatesArg
  }
}

export function registerProjectIPCHandlers(): void {
  console.log('Registering project IPC handlers...')

  ipcMain.handle(
    PROJECT_CHANNELS.create,
    async (_, input: unknown): Promise<IPCResult<Project>> => {
      return handleIPCCall(async () => {
        const payload = normalizeProjectCreateInput(input)
        const request = parseWithSchema(
          ProjectCreateRequestSchema,
          payload,
          'Invalid project creation data'
        )
        return await createProject(request)
      })
    }
  )

  ipcMain.handle(PROJECT_CHANNELS.list, async (): Promise<IPCResult<Project[]>> => {
    return handleIPCCall(async () => {
      return await listProjects()
    })
  })

  ipcMain.handle(
    PROJECT_CHANNELS.get,
    async (_, id: unknown): Promise<IPCResult<Project | null>> => {
      return handleIPCCall(async () => {
        const pid = requireValidId(id, 'Project ID')
        return await getProjectById(pid)
      })
    }
  )

  ipcMain.handle(
    PROJECT_CHANNELS.update,
    async (_, id: unknown, updates: unknown): Promise<IPCResult<Project>> => {
      return handleIPCCall(async () => {
        const payload = normalizeProjectUpdateInput(id, updates)
        const request = parseWithSchema(
          ProjectUpdateRequestSchema,
          payload,
          'Invalid project update data'
        )
        const updatePayload: { name?: string } = {}
        if (request.updates.name !== undefined) {
          updatePayload.name = request.updates.name
        }
        return await updateProject(request.id, updatePayload)
      })
    }
  )

  ipcMain.handle(PROJECT_CHANNELS.delete, async (_, id: unknown): Promise<IPCResult<void>> => {
    return handleIPCCall(async () => {
      const pid = requireValidId(id, 'Project ID')
      await deleteProject(pid)
    })
  })

  ipcMain.handle(
    PROJECT_CHANNELS.conversations,
    async (_, id: unknown): Promise<IPCResult<any[]>> => {
      return handleIPCCall(async () => {
        const pid = requireValidId(id, 'Project ID')
        return await conversationService.listConversationsByProject(pid)
      })
    }
  )

  console.log('Project IPC handlers registered successfully')
}

export function unregisterProjectIPCHandlers(): void {
  const channels = [
    PROJECT_CHANNELS.create,
    PROJECT_CHANNELS.list,
    PROJECT_CHANNELS.get,
    PROJECT_CHANNELS.update,
    PROJECT_CHANNELS.delete,
    PROJECT_CHANNELS.conversations
  ]
  channels.forEach((c) => ipcMain.removeAllListeners(c))
}
