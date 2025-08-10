import { ElectronAPI } from '@electron-toolkit/preload'

declare global {
  interface Window {
    electron: ElectronAPI
    api: {
      invoke: <T = any>(channel: string, data?: any) => Promise<T>
      onStream: (channel: string, callback: (data: any) => void) => () => void
      ping: () => Promise<string>
    }
  }
}

export interface Chat {
  id: string
  title: string
  lastUpdatedAt: Date
}

export interface Project {
  id: string
  name: string
  chats: Chat[]
  isExpanded: boolean
}

export interface User {
  name: string
  avatarUrl: string
}
