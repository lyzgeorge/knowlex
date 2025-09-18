import { ipcMain, shell } from 'electron'
import { handleIPCCall } from '@main/ipc/common'
import { PROJECT_FILE_CHANNELS } from '@shared/constants/project-files'
import {
  uploadProjectFiles,
  listProjectFilesByProject,
  getProjectFileWithContent,
  updateProjectFileContent,
  updateProjectFileSmartNotes,
  regenerateSmartNotes,
  deleteProjectFileDeep
} from '@main/services/project-file-service'
import { SmartNotesSchema } from '@main/services/agents/smart-notes-agent'

function assertString(v: any, name: string) {
  if (typeof v !== 'string' || v.length === 0) throw new Error(`Invalid ${name}`)
}

ipcMain.handle(
  PROJECT_FILE_CHANNELS.upload,
  async (
    _e,
    req: {
      projectId: string
      files: Array<{
        name: string
        path?: string
        contentBase64?: string
        size: number
        mime?: string
      }>
    }
  ) =>
    handleIPCCall(async () => {
      assertString(req.projectId, 'projectId')
      if (!Array.isArray(req.files) || req.files.length === 0) throw new Error('No files')
      for (const f of req.files) {
        assertString(f.name, 'file name')
        if (typeof f.size !== 'number') throw new Error('Invalid file size')
        if (!f.path && !f.contentBase64) throw new Error('Missing file content')
      }
      const rows = await uploadProjectFiles(req)
      return { items: rows }
    })
)

ipcMain.handle(PROJECT_FILE_CHANNELS.list, async (_e, req: { projectId: string }) =>
  handleIPCCall(async () => {
    const items = await listProjectFilesByProject(req.projectId)
    return { items }
  })
)

ipcMain.handle(PROJECT_FILE_CHANNELS.get, async (_e, req: { id: string }) =>
  handleIPCCall(async () => {
    assertString(req.id, 'id')
    return await getProjectFileWithContent(req.id)
  })
)

ipcMain.handle(
  PROJECT_FILE_CHANNELS.updateContent,
  async (_e, req: { id: string; content: string }) =>
    handleIPCCall(async () => {
      assertString(req.id, 'id')
      assertString(req.content, 'content')
      await updateProjectFileContent(req.id, req.content)
      return { ok: true }
    })
)

ipcMain.handle(
  PROJECT_FILE_CHANNELS.updateSmartNotes,
  async (_e, req: { id: string; smartNotes: any }) =>
    handleIPCCall(async () => {
      assertString(req.id, 'id')
      SmartNotesSchema.parse(req.smartNotes)
      await updateProjectFileSmartNotes(req.id, req.smartNotes)
      return { ok: true }
    })
)

ipcMain.handle(PROJECT_FILE_CHANNELS.regenerateSmartNotes, async (_e, req: { id: string }) =>
  handleIPCCall(async () => {
    assertString(req.id, 'id')
    await regenerateSmartNotes(req.id)
    return { ok: true }
  })
)

ipcMain.handle(PROJECT_FILE_CHANNELS.delete, async (_e, req: { id: string }) =>
  handleIPCCall(async () => {
    assertString(req.id, 'id')
    await deleteProjectFileDeep(req.id)
    return { ok: true }
  })
)

ipcMain.handle(PROJECT_FILE_CHANNELS.open, async (_e, req: { id: string }) =>
  handleIPCCall(async () => {
    assertString(req.id, 'id')
    const { row } = await getProjectFileWithContent(req.id)
    if (!row.file_path) throw new Error('No file path')
    const res = await shell.openPath(row.file_path)
    if (res) throw new Error(res)
    return { ok: true }
  })
)
