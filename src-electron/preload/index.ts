import { contextBridge, ipcRenderer } from 'electron'

// Custom APIs for renderer
const api = {
  // Send message to main process
  send: (channel: string, data: any) => {
    // Validate channel to prevent security issues
    const allowedChannels = ['ipc:request', 'stream:control']

    if (allowedChannels.includes(channel)) {
      ipcRenderer.send(channel, data)
    } else {
      console.error(`Attempted to send message on unauthorized channel: ${channel}`)
    }
  },

  // Listen for messages from main process
  on: (channel: string, callback: (data: any) => void) => {
    // Validate channel to prevent security issues
    const allowedChannels = [
      'ipc:response',
      'stream:data',
      'stream:error',
      'stream:end',
      'stream:pause',
      'stream:resume',
    ]

    if (allowedChannels.includes(channel)) {
      ipcRenderer.on(channel, (event, data) => callback(data))
    } else {
      console.error(`Attempted to listen on unauthorized channel: ${channel}`)
    }
  },

  // Remove listener
  removeListener: (channel: string, callback: (data: any) => void) => {
    ipcRenderer.removeListener(channel, callback)
  },

  // Remove all listeners for a channel
  removeAllListeners: (channel: string) => {
    ipcRenderer.removeAllListeners(channel)
  },

  // Get system information
  getSystemInfo: () => {
    return {
      platform: process.platform,
      arch: process.arch,
      version: process.version,
    }
  },
}

// Use `contextBridge` APIs to expose Electron APIs to
// renderer only if context isolation is enabled, otherwise
// just add to the DOM global.
if (process.contextIsolated) {
  try {
    contextBridge.exposeInMainWorld('electronAPI', api)
  } catch (error) {
    // eslint-disable-next-line no-console
    console.error(error)
  }
} else {
  // @ts-expect-error (define in dts)
  window.electronAPI = api
}
