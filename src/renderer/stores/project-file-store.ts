import { create } from 'zustand'
// project-file IPC is accessed via window.knowlex.projectFile; event names come from shared constants
import type { ProjectFileRow, SmartNotesV1_1 } from '@shared/types/project-file'

type State = {
  items: ProjectFileRow[]
  loading: boolean
  error: string | null
  // transient processing ids to reflect real-time status
  processingIds: Set<string>
}

type Actions = {
  fetch: (projectId: string) => Promise<void>
  upload: (projectId: string, files: File[]) => Promise<void>
  get: (id: string) => Promise<{ row: ProjectFileRow; content: string | null }>
  updateContent: (id: string, content: string) => Promise<void>
  updateSmartNotes: (id: string, smartNotes: SmartNotesV1_1) => Promise<void>
  regenerate: (id: string) => Promise<void>
  remove: (id: string) => Promise<void>
}

// Initialize event listeners once at module level
let eventListenersInitialized = false

function initializeEventListeners(
  get: () => State & Actions,
  set: (state: Partial<State>) => void
) {
  if (eventListenersInitialized) return
  eventListenersInitialized = true

  // Idempotent create: always merge by id to avoid duplicates
  window.knowlex.events.on('projectFile:created', (row: ProjectFileRow) => {
    const current = get().items
    const mapped = current.map((it) => (it.id === row.id ? row : it))
    const found = current.some((it) => it.id === row.id)
    set({ items: found ? mapped : [...mapped, row] })
  })

  window.knowlex.events.on('projectFile:updated', (row: ProjectFileRow) => {
    set({ items: get().items.map((it) => (it.id === row.id ? row : it)) })
  })

  window.knowlex.events.on('projectFile:deleted', ({ id }: { id: string }) => {
    set({ items: get().items.filter((x) => x.id !== id) })
  })

  window.knowlex.events.on(
    'projectFile:statusUpdate',
    (p: {
      id: string
      status: 'pending' | 'processing' | 'completed' | 'failed'
      error?: string
      generatedAt?: string
    }) => {
      const current = get()
      const nextSet = new Set(current.processingIds)
      if (p.status === 'processing') nextSet.add(p.id)
      else nextSet.delete(p.id)

      // Optimistic in-place update for immediate UI feedback
      set({
        processingIds: nextSet,
        items: current.items.map((it) =>
          it.id === p.id
            ? {
                ...it,
                ...(p.status === 'completed' || p.status === 'failed'
                  ? {
                      smart_notes_status: p.status,
                      updated_at: (p.generatedAt ?? it.updated_at) as any
                    }
                  : {}),
                ...(p.generatedAt ? { smart_notes_generated_at: p.generatedAt } : {}),
                ...(p.error ? { error: p.error } : {})
              }
            : it
        )
      })

      // On terminal state, fetch fresh row to avoid any drift
      if (p.status === 'completed' || p.status === 'failed') {
        window.knowlex.projectFile
          .get({ id: p.id })
          .then((res: any) => {
            if (!res?.success || !res?.data?.row) return
            const fresh = res.data.row as ProjectFileRow
            const items = get().items
            const has = items.some((it) => it.id === fresh.id)
            if (!has) return
            set({ items: items.map((it) => (it.id === fresh.id ? fresh : it)) })
          })
          .catch(() => {})
      }
    }
  )
}

export const useProjectFileStore = create<State & Actions>((set, get) => ({
  items: [],
  loading: false,
  error: null,
  processingIds: new Set<string>(),

  async fetch(projectId) {
    // Initialize event listeners on first call
    initializeEventListeners(get, set)

    set({ loading: true, error: null })
    const res: any = await window.knowlex.projectFile.list({ projectId })
    if (!res.success) return set({ loading: false, error: res.error || 'Failed to load' })
    set({ items: (res.data as { items: ProjectFileRow[] }).items, loading: false })
  },

  async upload(projectId, files) {
    function arrayBufferToBase64(buffer: ArrayBuffer): string {
      let binary = ''
      const bytes = new Uint8Array(buffer)
      const chunkSize = 0x8000 // 32KB chunks to avoid call stack/arg limits
      for (let i = 0; i < bytes.length; i += chunkSize) {
        const sub = bytes.subarray(i, i + chunkSize)
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        binary += String.fromCharCode.apply(null, sub as any)
      }
      return btoa(binary)
    }

    const inputs = await Promise.all(
      Array.from(files).map(async (f) => ({
        name: f.name,
        size: f.size,
        mime: f.type,
        contentBase64: await f.arrayBuffer().then((b) => arrayBufferToBase64(b))
      }))
    )
    const res: { success: boolean; data?: { items: ProjectFileRow[] }; error?: string } =
      (await window.knowlex.projectFile.upload({ projectId, files: inputs })) as any
    if (!res.success) throw new Error(res.error || 'Upload failed')

    // Immediately add the uploaded files to the store for instant UI update
    if (res.data?.items) {
      const current = get().items
      const newItems = [...current]

      for (const newFile of res.data.items) {
        const existingIndex = newItems.findIndex((item) => item.id === newFile.id)
        if (existingIndex >= 0) {
          // Update existing item
          newItems[existingIndex] = newFile
        } else {
          // Add new item
          newItems.push(newFile)
        }
      }

      set({ items: newItems })
    }
  },

  async get(id) {
    const res: any = await window.knowlex.projectFile.get({ id })
    if (!res.success) throw new Error(res.error || 'Get failed')
    return res.data as { row: ProjectFileRow; content: string | null }
  },

  async updateContent(id, content) {
    const res = await window.knowlex.projectFile.updateContent({ id, content })
    if (!res.success) throw new Error(res.error || 'Update content failed')
  },

  async updateSmartNotes(id, smartNotes) {
    const res = await window.knowlex.projectFile.updateSmartNotes({ id, smartNotes })
    if (!res.success) throw new Error(res.error || 'Update Smart Notes failed')
  },

  async regenerate(id) {
    const res = await window.knowlex.projectFile.regenerateSmartNotes({ id })
    if (!res.success) throw new Error(res.error || 'Regenerate failed')
  },

  async remove(id) {
    const res = await window.knowlex.projectFile.delete({ id })
    if (!res.success) throw new Error(res.error || 'Delete failed')
    set({ items: get().items.filter((x) => x.id !== id) })
  }
}))
