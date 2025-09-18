import {
  createProjectFile,
  deleteProjectFile,
  getProjectFile,
  listProjectFiles,
  updateProjectFile
} from '@main/database/queries'
import {
  PROJECT_FILE_LIMITS,
  PROJECT_FILE_STORAGE,
  PROJECT_FILE_SMART_NOTES
} from '@shared/constants/project-files'
import type { ProjectFileRow, SmartNotesV1_1 } from '@shared/types/project-file'
import { generateId } from '@shared/utils/id'
import { enqueueSmartNotes } from './SmartNotesWorker'
import { BrowserWindow } from 'electron'
import { PROJECT_FILE_EVENTS } from '@shared/constants/project-files'
import { parseFile, FileParserFactory } from './file-parser'
import { createHash } from 'node:crypto'
import { getMimeTypeFromExtension } from '@shared/utils/validation'

export async function uploadProjectFiles(input: {
  projectId: string
  files: Array<{ name: string; path?: string; contentBase64?: string; size: number; mime?: string }>
}): Promise<ProjectFileRow[]> {
  const fs = await import('node:fs/promises')
  const path = await import('node:path')
  const { app } = await import('electron')
  // Enforce per-project file count limit
  const existing = await listProjectFiles(input.projectId)
  if (existing.length + input.files.length > PROJECT_FILE_LIMITS.maxFilesPerProject) {
    throw new Error(`Too many files. Max ${PROJECT_FILE_LIMITS.maxFilesPerProject} per project`)
  }
  const results: ProjectFileRow[] = []
  const seenHashes = new Set<string>()
  for (const f of input.files) {
    if (f.size > PROJECT_FILE_LIMITS.maxFileSizeBytes) {
      throw new Error(`File too large: ${f.name}. Max 50MB`)
    }
    const id = generateId()
    const ext = (f.name.split('.').pop() || '').toLowerCase()
    const base = app.getPath('userData')
    const dir = path.join(base, 'project-files', input.projectId, id)
    await fs.mkdir(dir, { recursive: true })
    const originalPath = path.join(dir, PROJECT_FILE_STORAGE.originalFilename(ext))
    let buffer: Buffer
    if (f.path) {
      buffer = await fs.readFile(f.path)
      await fs.writeFile(originalPath, buffer)
    } else if (f.contentBase64) {
      buffer = Buffer.from(f.contentBase64, 'base64')
      await fs.writeFile(originalPath, buffer)
    } else {
      throw new Error('Invalid file input')
    }
    const md5 = createHash('md5').update(buffer).digest('hex')
    // Duplicate check in this project by file_hash
    if (existing.some((e) => e.file_hash === md5) || seenHashes.has(md5)) {
      throw new Error(`Duplicate file detected in this project: ${f.name}`)
    }
    seenHashes.add(md5)
    const parser = FileParserFactory.createParser(originalPath, f.name)
    if (!parser) {
      throw new Error(`Unsupported file type for project files: ${f.name}`)
    }
    const parsed = await parseFile(originalPath, f.name)
    if (!parsed.content?.trim()) {
      throw new Error(`No textual content extracted from: ${f.name}`)
    }
    const contentPath = path.join(dir, PROJECT_FILE_STORAGE.contentFilename)
    await fs.writeFile(contentPath, parsed.content, 'utf8')
    const row: ProjectFileRow = {
      id,
      project_id: input.projectId,
      filename: f.name,
      file_size: f.size,
      file_hash: md5,
      file_path: originalPath,
      content_path: contentPath,
      mime_type: f.mime || getMimeTypeFromExtension(f.name),
      smart_notes: null,
      // Persist 'pending' to indicate not yet completed; 'processing' is transient only.
      smart_notes_status: 'pending',
      smart_notes_generated_at: null,
      smart_notes_schema_version: PROJECT_FILE_SMART_NOTES.schemaVersion,
      error: null,
      upload_time: new Date().toISOString(),
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString()
    }
    await createProjectFile(row)
    broadcastEvent('created', row)
    enqueueSmartNotes(id)
    results.push(row)
  }
  return results
}

export async function getProjectFileWithContent(
  id: string
): Promise<{ row: ProjectFileRow; content: string | null }> {
  const fs = await import('node:fs/promises')
  const row = await getProjectFile(id)
  if (!row) throw new Error('Not found')
  const content = row.content_path ? await fs.readFile(row.content_path, 'utf8') : null
  return { row, content }
}

export async function listProjectFilesByProject(projectId: string) {
  return await listProjectFiles(projectId)
}

export async function updateProjectFileContent(id: string, content: string) {
  const fs = await import('node:fs/promises')
  const row = await getProjectFile(id)
  if (!row) throw new Error('Not found')
  if (!row.content_path) throw new Error('Content not editable for this file')
  await fs.writeFile(row.content_path, content, 'utf8')
  await updateProjectFile(id, { updated_at: new Date().toISOString() } as Partial<ProjectFileRow>)
  const updated = await getProjectFile(id)
  if (updated) broadcastEvent('updated', updated)
}

export async function updateProjectFileSmartNotes(id: string, smartNotes: SmartNotesV1_1) {
  const sanitized = {
    ...smartNotes,
    keywords: Array.from(new Set(smartNotes.keywords.map((k) => k.trim().toLowerCase())))
  }
  await updateProjectFile(id, {
    smart_notes: sanitized as any,
    smart_notes_generated_at: new Date().toISOString(),
    smart_notes_status: 'completed'
  })
  const updated = await getProjectFile(id)
  if (updated) broadcastEvent('updated', updated)
}

export async function regenerateSmartNotes(id: string) {
  // Reset persisted status to pending; transient processing will be handled in worker.
  await updateProjectFile(id, { smart_notes_status: 'pending', error: null })
  enqueueSmartNotes(id)
}

export async function deleteProjectFileDeep(id: string) {
  const fs = await import('node:fs/promises')
  const path = await import('node:path')
  const row = await getProjectFile(id)
  if (row) {
    const dir = path.dirname(row.file_path || '')
    if (dir) {
      await fs.rm(dir, { recursive: true, force: true })
    }
  }
  await deleteProjectFile(id)
  BrowserWindow.getAllWindows().forEach((w) =>
    w.webContents.send(PROJECT_FILE_EVENTS.deleted, { id })
  )
}

function broadcastEvent(type: 'created' | 'updated', row: ProjectFileRow) {
  const channel = PROJECT_FILE_EVENTS[type]
  BrowserWindow.getAllWindows().forEach((w) => w.webContents.send(channel, row))
}
