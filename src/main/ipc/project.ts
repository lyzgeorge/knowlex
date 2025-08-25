import { ipcMain } from 'electron'
import type { IPCResult } from '@shared/types/ipc'
import type { Project } from '@shared/types/project'
import {
  createProject,
  getProjectById,
  getAllProjects,
  updateProjectById,
  deleteProjectById,
  getProjectConversations
} from '@main/services/project-service'
import { handleIPCCall, requireValidId } from './common'

export function registerProjectIPCHandlers(): void {
  console.log('Registering project IPC handlers...')

  ipcMain.handle('project:create', async (_, name: unknown): Promise<IPCResult<Project>> => {
    return handleIPCCall(async () => {
      if (!name || typeof name !== 'string') throw new Error('Invalid project name')
      return await createProject({ name })
    })
  })

  ipcMain.handle('project:list', async (): Promise<IPCResult<Project[]>> => {
    return handleIPCCall(async () => {
      return await getAllProjects()
    })
  })

  ipcMain.handle('project:get', async (_, id: unknown): Promise<IPCResult<Project | null>> => {
    return handleIPCCall(async () => {
      const pid = requireValidId(id, 'Project ID')
      return await getProjectById(pid)
    })
  })

  ipcMain.handle(
    'project:update',
    async (_, id: unknown, updates: unknown): Promise<IPCResult<Project>> => {
      return handleIPCCall(async () => {
        const pid = requireValidId(id, 'Project ID')
        if (!updates || typeof updates !== 'object') throw new Error('Invalid update data')
        const u = updates as { name?: string }
        const updateData: { name?: string } = {}
        if (u.name !== undefined) {
          updateData.name = u.name
        }
        return await updateProjectById(pid, updateData)
      })
    }
  )

  ipcMain.handle('project:delete', async (_, id: unknown): Promise<IPCResult<void>> => {
    return handleIPCCall(async () => {
      const pid = requireValidId(id, 'Project ID')
      await deleteProjectById(pid)
    })
  })

  ipcMain.handle('project:conversations', async (_, id: unknown): Promise<IPCResult<any[]>> => {
    return handleIPCCall(async () => {
      const pid = requireValidId(id, 'Project ID')
      return await getProjectConversations(pid)
    })
  })

  console.log('Project IPC handlers registered successfully')
}

export function unregisterProjectIPCHandlers(): void {
  const channels = [
    'project:create',
    'project:list',
    'project:get',
    'project:update',
    'project:delete',
    'project:conversations'
  ]
  channels.forEach((c) => ipcMain.removeAllListeners(c))
}
