import { create } from 'zustand'
import { Chat } from '../lib/types'
import { mockUncategorizedChats } from '../lib/mock-data'

interface ChatState {
  uncategorizedChats: Chat[]
  addChatToUncategorized: (chat: Chat) => void
  removeChatFromUncategorized: (chatId: string) => Chat | undefined
}

export const useChatStore = create<ChatState>((set, get) => ({
  uncategorizedChats: mockUncategorizedChats,
  addChatToUncategorized: (chat) =>
    set((state) => ({
      uncategorizedChats: [chat, ...state.uncategorizedChats]
    })),
  removeChatFromUncategorized: (chatId) => {
    const chatToRemove = get().uncategorizedChats.find((c) => c.id === chatId)
    if (chatToRemove) {
      set((state) => ({
        uncategorizedChats: state.uncategorizedChats.filter((c) => c.id !== chatId)
      }))
    }
    return chatToRemove
  }
}))
