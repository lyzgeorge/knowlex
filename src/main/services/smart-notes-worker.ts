import { PROJECT_FILE_EVENTS, PROJECT_FILE_SMART_NOTES } from '@shared/constants/project-files'
import { countTextTokens } from '@shared/utils/token-count'
import { getProjectFile, updateProjectFile } from '@main/infra/database/queries'
import { BrowserWindow } from 'electron'
import { generateSmartNotes } from './agents/smart-notes-agent'
import { getSettings } from './settings'

/**
 * Simplified single-shot Smart Notes processor.
 * - No queue; callers trigger directly and may run concurrently.
 * - No chunking; if content tokens exceed limit, mark failed.
 */
export async function processSmartNotes(id: string): Promise<void> {
  console.log('[SmartNotesWorker] process: start', { id })
  const row = await getProjectFile(id)
  if (!row) {
    console.warn('[SmartNotesWorker] process: missing row', { id })
    return
  }

  try {
    await updateProjectFile(id, { error: null })
    broadcastStatus(id, 'processing')

    const fs = await import('node:fs/promises')
    if (!row.content_path) throw new Error('No content to analyze')
    const content = await fs.readFile(row.content_path, 'utf8')

    const tokens = countTextTokens(content)
    const limit = Math.max(
      1024,
      getSettings().fileMaxInputTokens ?? PROJECT_FILE_SMART_NOTES.defaultMaxInputTokens
    )
    console.log('[SmartNotesWorker] content loaded', { id, tokens, limit })

    if (tokens > limit) {
      const msg = `File too large for Smart Notes: tokens ${tokens} > limit ${limit}`
      await updateProjectFile(id, { smart_notes_status: 'failed', error: msg })
      broadcastStatus(id, 'failed', msg)
      console.warn('[SmartNotesWorker] process: failed due to size', { id, tokens, limit })
      return
    }

    const result = await generateSmartNotes(preprocessContent(content))

    await updateProjectFile(id, {
      smart_notes: result as any,
      smart_notes_status: 'completed',
      smart_notes_generated_at: new Date().toISOString()
    })
    broadcastStatus(id, 'completed', undefined, new Date().toISOString())
    console.log('[SmartNotesWorker] process: completed', { id })
  } catch (err: any) {
    const msg = String(err?.message || err)
    await updateProjectFile(id, { smart_notes_status: 'failed', error: msg })
    broadcastStatus(id, 'failed', msg)
    console.error('[SmartNotesWorker] process: error', { id, error: msg })
  }
}

function preprocessContent(text: string): string {
  // Escape angle brackets and wrap per line
  const esc = text.replace(/</g, '&lt;').replace(/>/g, '&gt;')
  return esc
    .split(/\r?\n/)
    .map((line: string, idx: number) => `<${idx + 1}>${line}</${idx + 1}>`)
    .join('\n')
}

function broadcastStatus(
  id: string,
  status: 'pending' | 'processing' | 'completed' | 'failed',
  error?: string,
  generatedAt?: string
) {
  const payload = {
    id,
    status,
    ...(error ? { error } : {}),
    ...(generatedAt ? { generatedAt } : {})
  }
  for (const win of BrowserWindow.getAllWindows()) {
    win.webContents.send(PROJECT_FILE_EVENTS.statusUpdate, payload)
  }
}
// No queue, no recovery. Each call runs independently.
