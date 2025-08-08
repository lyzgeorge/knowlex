import { contextBridge, ipcRenderer } from 'electron'
import { electronAPI } from '@electron-toolkit/preload'
import type { IPCRequest, IPCResponse } from '@shared'

// Custom APIs for renderer
const api = {
  // IPC 通信封装
  invoke: async <T = any>(channel: string, data?: any): Promise<T> => {
    const request: IPCRequest = {
      id: Math.random().toString(36).substr(2, 9),
      channel,
      data,
      timestamp: Date.now()
    }

    const response: IPCResponse<T> = await ipcRenderer.invoke('ipc-request', request)

    if (!response.success) {
      throw new Error(response.error || 'IPC request failed')
    }

    return response.data as T
  },

  // 流式数据监听
  onStream: (channel: string, callback: (data: any) => void) => {
    const listener = (_event: any, data: any) => callback(data)
    ipcRenderer.on(`stream-${channel}`, listener)

    return () => {
      ipcRenderer.removeListener(`stream-${channel}`, listener)
    }
  },

  // 基础 IPC 方法
  ping: () => ipcRenderer.invoke('ping')
}

// Use `contextBridge` APIs to expose Electron APIs to
// renderer only if context isolation is enabled, otherwise
// just add to the DOM global.
if (process.contextIsolated) {
  try {
    contextBridge.exposeInMainWorld('electron', electronAPI)
    contextBridge.exposeInMainWorld('api', api)
  } catch (error) {
    console.error(error)
  }
} else {
  // @ts-expect-error (define in dts)
  window.electron = electronAPI
  // @ts-expect-error (define in dts)
  window.api = api
}
