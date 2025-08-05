import { contextBridge } from 'electron'

// Custom APIs for renderer
const api = {}

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
