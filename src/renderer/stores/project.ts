import { create } from 'zustand'
import { persist, createJSONStorage } from 'zustand/middleware'
import { immer } from 'zustand/middleware/immer'
import type { Project } from '@shared/types/project'
// using runAsync/runApiCall autoUnwrap behavior instead of explicit unwrap/assert

interface ProjectState {
  projects: Project[]
  expanded: Record<string, boolean>
  isLoading: boolean
  error: string | null

  // Actions
  fetchProjects: () => Promise<void>
  addProject: (name: string) => Promise<Project>
  editProject: (id: string, name: string) => Promise<void>
  removeProject: (id: string) => Promise<void>

  // UI expansion state
  toggle: (id: string) => void
  isExpanded: (id: string) => boolean
}

const initial: Pick<ProjectState, 'projects' | 'expanded' | 'isLoading' | 'error'> = {
  projects: [],
  expanded: {},
  isLoading: false,
  error: null
}

export const useProjectStore = create<ProjectState>()(
  persist(
    immer((set, get) => ({
      ...initial,

      fetchProjects: async () => {
        set((s) => {
          s.isLoading = true
          s.error = null
        })
        try {
          const res = await window.knowlex.project.list()
          const items = ((res as any).data as Project[]) || []
          set((s) => {
            s.projects = items
            s.isLoading = false
          })
        } catch (e) {
          set((s) => {
            s.error = e instanceof Error ? e.message : 'Failed to load projects'
            s.isLoading = false
          })
        }
      },

      addProject: async (name: string) => {
        const res = await window.knowlex.project.create(name)
        const proj = (res as any).data as Project
        set((s) => {
          s.projects.unshift(proj)
        })
        return proj
      },

      editProject: async (id: string, name: string) => {
        const res = await window.knowlex.project.update(id, { name })
        const updated = (res as any).data as Project
        set((s) => {
          const idx = s.projects.findIndex((p) => p.id === id)
          if (idx >= 0) s.projects[idx] = updated
        })
      },

      removeProject: async (id: string) => {
        const res = await window.knowlex.project.delete(id)
        if (!res?.success) throw new Error((res as any).error || 'Failed to delete project')
        set((s) => {
          s.projects = s.projects.filter((p) => p.id !== id)
          delete s.expanded[id]
        })
      },

      toggle: (id: string) => {
        set((s) => {
          s.expanded[id] = !s.expanded[id]
        })
      },

      isExpanded: (id: string) => !!get().expanded[id]
    })),
    {
      name: 'knowlex-project-store',
      storage: createJSONStorage(() => localStorage),
      partialize: (s) => ({ expanded: s.expanded })
    }
  )
)

export default useProjectStore
