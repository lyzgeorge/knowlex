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
