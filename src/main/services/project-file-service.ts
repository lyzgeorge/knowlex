import {
  createProjectFile,
  deleteProjectFile,
  getProjectFile,
  listProjectFiles,
  updateProjectFile
} from '@main/infra/database/queries'
import {
  ensureProjectFileDirectory,
  resolveProjectFileDirectory
} from '@main/infra/utils/project-files'
import {
  PROJECT_FILE_LIMITS,
  PROJECT_FILE_STORAGE,
  PROJECT_FILE_SMART_NOTES,
  PROJECT_FILE_EVENTS
} from '@shared/constants/project-files'
import type { ProjectFileRow, SmartNotesV1_1 } from '@shared/types/project-file'
import { generateId } from '@shared/utils/id'
import { processSmartNotes } from './smart-notes-worker'
import { BrowserWindow } from 'electron'
import { extractFileContent, isSupportedFileType } from '@main/infra/file-extract'
import { createHash } from 'node:crypto'
import { getMimeTypeFromExtension } from '@shared/utils/validation'

type FsModule = typeof import('node:fs/promises')
type PathModule = typeof import('node:path')

interface ProjectFileUploadInput {
  name: string
  path?: string
  contentBase64?: string
  size: number
  mime?: string
}

interface ProjectFileEntryParams {
  id: string
  projectId: string
  filename: string
  fileSize: number
  fileHash: string
  originalPath: string
  contentPath: string
  mimeType: string
}

export async function uploadProjectFiles(input: {
  projectId: string
  files: ProjectFileUploadInput[]
}): Promise<ProjectFileRow[]> {
  const fs = await import('node:fs/promises')
  const path = await import('node:path')
  // Enforce per-project file count limit
  const existing = await listProjectFiles(input.projectId)
  if (existing.length + input.files.length > PROJECT_FILE_LIMITS.maxFilesPerProject) {
    throw new Error(`Too many files. Max ${PROJECT_FILE_LIMITS.maxFilesPerProject} per project`)
  }
  const results: ProjectFileRow[] = []
  const seenHashes = new Set<string>()
  for (const file of input.files) {
    if (file.size > PROJECT_FILE_LIMITS.maxFileSizeBytes) {
      throw new Error(`File too large: ${file.name}. Max 50MB`)
    }

    const id = generateId()
    const dir = await ensureProjectFileDirectory(input.projectId, id)
    const { buffer, md5 } = await readAndHashFile(fs, file)

    if (existing.some((e) => e.file_hash === md5) || seenHashes.has(md5)) {
      throw new Error(`Duplicate file detected in this project: ${file.name}`)
    }

    seenHashes.add(md5)

    if (!isSupportedFileType(file.name)) {
      throw new Error(`Unsupported file type for project files: ${file.name}`)
    }

    const { originalPath, contentPath } = await extractAndStoreContent(
      fs,
      path,
      buffer,
      file.name,
      dir
    )

    const mimeType = file.mime || getMimeTypeFromExtension(file.name)

    const row = await createProjectFileEntry({
      id,
      projectId: input.projectId,
      filename: file.name,
      fileSize: file.size,
      fileHash: md5,
      originalPath,
      contentPath,
      mimeType
    })

    // Fire-and-forget concurrent processing
    void processSmartNotes(id)
    results.push(row)
  }
  return results
}

async function readAndHashFile(
  fs: FsModule,
  file: ProjectFileUploadInput
): Promise<{ buffer: Buffer; md5: string }> {
  let buffer: Buffer

  if (file.path) {
    buffer = await fs.readFile(file.path)
  } else if (file.contentBase64) {
    buffer = Buffer.from(file.contentBase64, 'base64')
  } else {
    throw new Error('Invalid file input')
  }

  const md5 = createHash('md5').update(buffer).digest('hex')
  return { buffer, md5 }
}

async function extractAndStoreContent(
  fs: FsModule,
  pathModule: PathModule,
  buffer: Buffer,
  filename: string,
  dir: string
): Promise<{ originalPath: string; contentPath: string }> {
  const ext = (filename.split('.').pop() || '').toLowerCase()
  const originalPath = pathModule.join(dir, PROJECT_FILE_STORAGE.originalFilename(ext))

  await fs.writeFile(originalPath, buffer)

  const parsed = await extractFileContent(originalPath, filename)
  if (!parsed.content?.trim()) {
    throw new Error(`No textual content extracted from: ${filename}`)
  }

  const contentPath = pathModule.join(dir, PROJECT_FILE_STORAGE.contentFilename)
  await fs.writeFile(contentPath, parsed.content, 'utf8')

  return { originalPath, contentPath }
}

async function createProjectFileEntry(params: ProjectFileEntryParams): Promise<ProjectFileRow> {
  const now = new Date().toISOString()
  const row: ProjectFileRow = {
    id: params.id,
    project_id: params.projectId,
    filename: params.filename,
    file_size: params.fileSize,
    file_hash: params.fileHash,
    file_path: params.originalPath,
    content_path: params.contentPath,
    mime_type: params.mimeType,
    smart_notes: null,
    smart_notes_status: 'pending',
    smart_notes_generated_at: null,
    smart_notes_schema_version: PROJECT_FILE_SMART_NOTES.schemaVersion,
    error: null,
    upload_time: now,
    created_at: now,
    updated_at: now
  }

  await createProjectFile(row)
  broadcastEvent('created', row)

  return row
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
  // Fire-and-forget concurrent processing
  void processSmartNotes(id)
}

export async function deleteProjectFileDeep(id: string) {
  const fs = await import('node:fs/promises')
  const row = await getProjectFile(id)
  if (row) {
    const dir = await resolveProjectFileDirectory(row.project_id, row.id)
    await fs.rm(dir, { recursive: true, force: true })
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
