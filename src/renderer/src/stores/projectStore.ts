import { create } from 'zustand'
import { Project, Chat } from '../lib/types'
import { mockProjects } from '../lib/mock-data'

interface ProjectState {
  projects: Project[]
  toggleProjectExpanded: (projectId: string) => void
  addChatToProject: (chat: Chat, projectId: string) => void
  removeChatFromProject: (chatId: string, projectId: string) => Chat | undefined
}

export const useProjectStore = create<ProjectState>((set, get) => ({
  projects: mockProjects,
  toggleProjectExpanded: (projectId) =>
    set((state) => ({
      projects: state.projects.map((p) =>
        p.id === projectId ? { ...p, isExpanded: !p.isExpanded } : p
      )
    })),
  addChatToProject: (chat, projectId) =>
    set((state) => ({
      projects: state.projects.map((p) =>
        p.id === projectId ? { ...p, chats: [chat, ...p.chats] } : p
      )
    })),
  removeChatFromProject: (chatId, projectId) => {
    const project = get().projects.find((p) => p.id === projectId)
    const chatToRemove = project?.chats.find((c) => c.id === chatId)
    if (chatToRemove) {
      set((state) => ({
        projects: state.projects.map((p) =>
          p.id === projectId ? { ...p, chats: p.chats.filter((c) => c.id !== chatId) } : p
        )
      }))
    }
    return chatToRemove
  }
}))
