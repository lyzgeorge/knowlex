import { PROJECT_FILE_EVENTS, PROJECT_FILE_SMART_NOTES } from '@shared/constants/project-files'
import { countTextTokens } from '@shared/utils/token-count'
import { getProjectFile, updateProjectFile } from '@main/database/queries'
import { BrowserWindow } from 'electron'
import { generateSmartNotes } from './agents/smart-notes-agent'

type QueueItem = { id: string }

const queue: QueueItem[] = []
let running = false
// In-memory transient status map; not persisted.
const transientStatus = new Map<string, 'pending' | 'processing'>()
// keep for potential future recovery implementation
// removed to satisfy unused variable rule

export function enqueueSmartNotes(id: string) {
  if (!queue.find((q) => q.id === id)) {
    queue.push({ id })
    console.log('[SmartNotesWorker] enqueue: added', { id, queueSize: queue.length })
  } else {
    console.log('[SmartNotesWorker] enqueue: skipped (already queued)', {
      id,
      queueSize: queue.length
    })
  }
  transientStatus.set(id, 'pending')
  console.log('[SmartNotesWorker] status: pending', { id })
  runLoop()
}

// Recovery: at app startup, re-enqueue any rows that are not terminal (pending without completion)
// Startup recovery removed per product decision; unfinished work becomes failed on startup.

async function runLoop() {
  if (running) return
  running = true
  console.log('[SmartNotesWorker] runLoop: started')
  try {
    // No queue recovery; process only explicitly enqueued items
    while (queue.length) {
      const { id } = queue.shift()!
      console.log('[SmartNotesWorker] dequeue: processing', { id, remaining: queue.length })
      const row = await getProjectFile(id)
      if (!row) {
        console.warn('[SmartNotesWorker] missing row, skipping', { id })
        continue
      }
      transientStatus.set(id, 'processing')
      // Do not persist transient state; only broadcast to renderer.
      await updateProjectFile(id, { error: null })
      broadcastStatus(id, 'processing')
      console.log('[SmartNotesWorker] status: processing', { id })
      try {
        const contentPath = row.content_path
        if (!contentPath) throw new Error('No content to analyze')
        const fs = await import('node:fs/promises')
        // ensure module available if needed; do not bind variable to avoid unused
        await import('node:path')
        // Resolve absolute path from app userData root elsewhere; assume stored absolute for MVP
        const content = await fs.readFile(contentPath, 'utf8')
        const tokens = countTextTokens(content)
        console.log('[SmartNotesWorker] content loaded', { id, tokens })
        const limit = PROJECT_FILE_SMART_NOTES.defaultMaxInputTokens
        const result = await withRetries(async (_attempt) => {
          console.log('[SmartNotesWorker] attempt generate', {
            id,
            _attempt,
            withinLimit: tokens <= limit
          })
          if (tokens <= limit) {
            return await generateSmartNotes(preprocessContent(content), undefined)
          } else {
            const chunkSize = PROJECT_FILE_SMART_NOTES.chunkSizeTokens
            const overlap = PROJECT_FILE_SMART_NOTES.overlapTokens
            const chunks = splitByTokensTokens(content, chunkSize, overlap)
            console.log('[SmartNotesWorker] split into chunks', {
              id,
              chunks: chunks.length,
              chunkSize,
              overlap
            })
            let prev: any | undefined
            for (const ch of chunks) {
              console.log('[SmartNotesWorker] processing chunk', { id })
              prev = await generateSmartNotes(preprocessContent(ch), prev)
            }
            return prev
          }
        })
        await updateProjectFile(id, {
          smart_notes: result as any,
          smart_notes_status: 'completed',
          smart_notes_generated_at: new Date().toISOString()
        })
        broadcastStatus(id, 'completed', undefined, new Date().toISOString())
        console.log('[SmartNotesWorker] status: completed', { id })
        transientStatus.delete(id)
      } catch (err: any) {
        const msg = String(err?.message || err)
        await updateProjectFile(id, { smart_notes_status: 'failed', error: msg })
        broadcastStatus(id, 'failed', msg)
        console.error('[SmartNotesWorker] status: failed', { id, error: msg })
        transientStatus.delete(id)
      }
    }
  } finally {
    running = false
    console.log('[SmartNotesWorker] runLoop: stopped')
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

function splitByTokensTokens(text: string, size: number, overlap: number): string[] {
  // Token-aware: grow window until reaching token limit, with overlap between windows.
  const parts: string[] = []
  let start = 0
  while (start < text.length) {
    let end = Math.min(text.length, start + 10000) // start with a step
    // Expand end until token count exceeds size or we hit end
    let window = text.slice(start, end)
    let tok = countTextTokens(window)
    while (tok < size && end < text.length) {
      const nextEnd = Math.min(text.length, end + 10000)
      const nextWindow = text.slice(start, nextEnd)
      const nextTok = countTextTokens(nextWindow)
      if (nextTok > size) break
      end = nextEnd
      window = nextWindow
      tok = nextTok
    }
    parts.push(window)
    // Move start forward with overlap in tokens approximation by characters
    const backtrack = Math.floor((overlap / Math.max(tok, 1)) * (end - start))
    start = end - backtrack
    if (start < 0) start = 0
    if (start === end) start = end + 1
  }
  return parts
}

async function withRetries<T>(fn: (attempt: number) => Promise<T>, maxAttempts = 3): Promise<T> {
  let attempt = 0
  let lastErr: any
  while (attempt < maxAttempts) {
    try {
      return await fn(attempt)
    } catch (e) {
      lastErr = e
      const delay = Math.pow(2, attempt) * 1000
      await new Promise((r) => setTimeout(r, delay))
      attempt++
    }
  }
  throw lastErr
}

// Recovery intentionally removed per technical design feedback.
