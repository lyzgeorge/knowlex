import { mkdir } from 'node:fs/promises'

export async function resolveProjectFileDirectory(
  projectId: string,
  fileId: string
): Promise<string> {
  const path = await import('node:path')
  const { app } = await import('electron')
  return path.join(app.getPath('userData'), 'project-files', projectId, fileId)
}

export async function ensureProjectFileDirectory(
  projectId: string,
  fileId: string
): Promise<string> {
  const dir = await resolveProjectFileDirectory(projectId, fileId)
  await mkdir(dir, { recursive: true })
  return dir
}
