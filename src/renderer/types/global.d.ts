import { ElectronAPI } from '@electron-toolkit/preload'
import type { KnowlexAPI } from '@main/preload'

declare global {
  interface Window {
    electron: ElectronAPI
    knowlex: KnowlexAPI
  }
}

export {}
