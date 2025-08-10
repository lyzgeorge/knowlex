import { create } from 'zustand'

interface UIState {
  activeChatId: string | null
  setActiveChatId: (chatId: string | null) => void
}

export const useUIStore = create<UIState>((set) => ({
  activeChatId: null,
  setActiveChatId: (chatId) => set({ activeChatId: chatId })
}))
