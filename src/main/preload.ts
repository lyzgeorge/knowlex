import { contextBridge, ipcRenderer } from 'electron'
import { electronAPI } from '@electron-toolkit/preload'
import type {
  IPCResult,
  ProjectCreateRequest,
  ProjectUpdateRequest,
  ConversationCreateRequest,
  MessageAddRequest,
  FileUploadRequest,
  TemporaryFileRequest,
  SearchRequest,
  SettingsUpdateRequest
} from '../shared/types/ipc'

// Define the API interface that will be exposed to the renderer
export interface KnowlexAPI {
  // Window management
  window: {
    minimize: () => void
    maximize: () => void
    close: () => void
    toggleFullscreen: () => void
    setAlwaysOnTop: (flag: boolean) => void
  }

  // Theme management
  theme: {
    getSystemTheme: () => Promise<{ isDarkMode: boolean; themeSource: string }>
    onThemeChanged: (
      callback: (theme: { isDarkMode: boolean; themeSource: string }) => void
    ) => void
  }

  // Project IPC
  project: {
    create: (data: ProjectCreateRequest) => Promise<IPCResult>
    list: () => Promise<IPCResult>
    get: (id: string) => Promise<IPCResult>
    update: (data: ProjectUpdateRequest) => Promise<IPCResult>
    delete: (id: string) => Promise<IPCResult>
  }

  // Conversation IPC
  conversation: {
    create: (data: ConversationCreateRequest) => Promise<IPCResult>
    list: (projectId?: string) => Promise<IPCResult>
    get: (id: string) => Promise<IPCResult>
    update: (data: any) => Promise<IPCResult>
    updateTitle: (conversationId: string, title: string) => Promise<IPCResult>
    updateSettings: (conversationId: string, settings: any) => Promise<IPCResult>
    generateTitle: (conversationId: string) => Promise<IPCResult>
    delete: (id: string) => Promise<IPCResult>
    move: (conversationId: string, projectId: string | null) => Promise<IPCResult>
    fork: (messageId: string) => Promise<IPCResult>
  }

  // Message IPC
  message: {
    add: (data: MessageAddRequest) => Promise<IPCResult>
    send: (data: any) => Promise<IPCResult>
    stop: (messageId: string) => Promise<IPCResult>
    list: (conversationId: string) => Promise<IPCResult>
    update: (id: string, content: any) => Promise<IPCResult>
    delete: (id: string) => Promise<IPCResult>
    regenerate: (messageId: string) => Promise<IPCResult>
    edit: (messageId: string, content: any) => Promise<IPCResult>
  }

  // File IPC
  file: {
    uploadProject: (data: FileUploadRequest) => Promise<IPCResult>
    processTemp: (data: TemporaryFileRequest) => Promise<IPCResult>
    processTempContent: (data: {
      files: Array<{ name: string; content: string; size: number }>
    }) => Promise<IPCResult>
    delete: (id: string) => Promise<IPCResult>
    list: (projectId: string) => Promise<IPCResult>
  }

  // Search IPC
  search: {
    project: (data: SearchRequest) => Promise<IPCResult>
    global: (data: SearchRequest) => Promise<IPCResult>
  }

  // Settings IPC
  settings: {
    get: (key?: string) => Promise<IPCResult>
    update: (data: SettingsUpdateRequest) => Promise<IPCResult>
    reset: () => Promise<IPCResult>
  }

  // AI Model IPC
  ai: {
    chat: (messages: any[], options: any) => Promise<IPCResult>
    stream: (messages: any[], options: any) => Promise<ReadableStream>
    listModels: () => Promise<IPCResult>
    testConnection: (config: any) => Promise<IPCResult>
  }

  // Event listeners
  events: {
    on: (channel: string, callback: (...args: any[]) => void) => void
    off: (channel: string, callback: (...args: any[]) => void) => void
  }

  // Menu actions
  menu: {
    onAction: (callback: (action: { type: string; [key: string]: any }) => void) => void
    onContextMenuAction: (callback: (action: { type: string; [key: string]: any }) => void) => void
  }

  // File system operations
  fs: {
    selectFiles: (options?: any) => Promise<string[]>
    selectFolder: (options?: any) => Promise<string | null>
    showItemInFolder: (path: string) => void
    openPath: (path: string) => Promise<string>
  }

  // System information
  system: {
    getPlatform: () => string
    getVersion: () => string
    getPath: (name: string) => string
  }
}

// Implementation of the API
const knowlexAPI: KnowlexAPI = {
  // Window management
  window: {
    minimize: () => ipcRenderer.invoke('window:minimize'),
    maximize: () => ipcRenderer.invoke('window:maximize'),
    close: () => ipcRenderer.invoke('window:close'),
    toggleFullscreen: () => ipcRenderer.invoke('window:toggleFullscreen'),
    setAlwaysOnTop: (flag: boolean) => ipcRenderer.invoke('window:setAlwaysOnTop', flag)
  },

  // Theme management
  theme: {
    getSystemTheme: () => ipcRenderer.invoke('theme:getSystemTheme'),
    onThemeChanged: (callback) => {
      const handler = (_: any, theme: any) => callback(theme)
      ipcRenderer.on('theme-changed', handler)
      return () => ipcRenderer.off('theme-changed', handler)
    }
  },

  // Project IPC
  project: {
    create: (data) => ipcRenderer.invoke('project:create', data),
    list: () => ipcRenderer.invoke('project:list'),
    get: (id) => ipcRenderer.invoke('project:get', id),
    update: (data) => ipcRenderer.invoke('project:update', data),
    delete: (id) => ipcRenderer.invoke('project:delete', id)
  },

  // Conversation IPC
  conversation: {
    create: (data) => ipcRenderer.invoke('conversation:create', data),
    list: (projectId) => ipcRenderer.invoke('conversation:list', projectId),
    get: (id) => ipcRenderer.invoke('conversation:get', id),
    update: (data) => ipcRenderer.invoke('conversation:update', data),
    updateTitle: (conversationId, title) =>
      ipcRenderer.invoke('conversation:update-title', conversationId, title),
    updateSettings: (conversationId, settings) =>
      ipcRenderer.invoke('conversation:update-settings', conversationId, settings),
    generateTitle: (conversationId) =>
      ipcRenderer.invoke('conversation:generate-title', conversationId),
    delete: (id) => ipcRenderer.invoke('conversation:delete', id),
    move: (conversationId, projectId) =>
      ipcRenderer.invoke('conversation:move', conversationId, projectId),
    fork: (messageId) => ipcRenderer.invoke('conversation:fork', messageId)
  },

  // Message IPC
  message: {
    add: (data) => ipcRenderer.invoke('message:add', data),
    send: (data) => ipcRenderer.invoke('message:send', data),
    stop: (messageId) => ipcRenderer.invoke('message:stop', messageId),
    list: (conversationId) => ipcRenderer.invoke('message:list', conversationId),
    update: (id, content) => ipcRenderer.invoke('message:update', id, content),
    delete: (id) => ipcRenderer.invoke('message:delete', id),
    regenerate: (messageId) => ipcRenderer.invoke('message:regenerate', messageId),
    edit: (messageId, content) => ipcRenderer.invoke('message:edit', messageId, content)
  },

  // File IPC
  file: {
    uploadProject: (data) => ipcRenderer.invoke('file:uploadProject', data),
    processTemp: (data) => ipcRenderer.invoke('file:process-temp', data),
    processTempContent: (data) => ipcRenderer.invoke('file:process-temp-content', data),
    delete: (id) => ipcRenderer.invoke('file:delete', id),
    list: (projectId) => ipcRenderer.invoke('file:list', projectId)
  },

  // Search IPC
  search: {
    project: (data) => ipcRenderer.invoke('search:project', data),
    global: (data) => ipcRenderer.invoke('search:global', data)
  },

  // Settings IPC
  settings: {
    get: (key) => ipcRenderer.invoke('settings:get', key),
    update: (data) => ipcRenderer.invoke('settings:update', data),
    reset: () => ipcRenderer.invoke('settings:reset')
  },

  // AI Model IPC
  ai: {
    chat: (messages, options) => ipcRenderer.invoke('ai:chat', messages, options),
    stream: (messages, options) => ipcRenderer.invoke('ai:stream', messages, options),
    listModels: () => ipcRenderer.invoke('ai:listModels'),
    testConnection: (config) => ipcRenderer.invoke('ai:testConnection', config)
  },

  // Event listeners
  events: {
    on: (channel, callback) => {
      ipcRenderer.on(channel, callback)
    },
    off: (channel, callback) => {
      ipcRenderer.off(channel, callback)
    }
  },

  // Menu actions
  menu: {
    onAction: (callback) => {
      ipcRenderer.on('menu-action', (_, action) => callback(action))
    },
    onContextMenuAction: (callback) => {
      ipcRenderer.on('context-menu-action', (_, action) => callback(action))
    }
  },

  // File system operations
  fs: {
    selectFiles: (options) => ipcRenderer.invoke('fs:selectFiles', options),
    selectFolder: (options) => ipcRenderer.invoke('fs:selectFolder', options),
    showItemInFolder: (path) => ipcRenderer.invoke('fs:showItemInFolder', path),
    openPath: (path) => ipcRenderer.invoke('fs:openPath', path)
  },

  // System information
  system: {
    getPlatform: () => process.platform,
    getVersion: () => process.versions.electron,
    getPath: (name) => ipcRenderer.sendSync('system:getPath', name)
  }
}

// Expose APIs to renderer process
if (process.contextIsolated) {
  try {
    // Expose Electron toolkit API
    contextBridge.exposeInMainWorld('electron', electronAPI)

    // Expose our custom Knowlex API
    contextBridge.exposeInMainWorld('knowlex', knowlexAPI)

    // Expose Node.js APIs safely
    contextBridge.exposeInMainWorld('node', {
      process: {
        platform: process.platform,
        versions: process.versions
      }
    })
  } catch (error) {
    console.error('Failed to expose APIs:', error)
  }
} else {
  // Fallback for non-isolated contexts
  // @ts-expect-error (define in global)
  window.electron = electronAPI
  // @ts-expect-error (define in global)
  window.knowlex = knowlexAPI
  // @ts-expect-error (define in global)
  window.node = {
    process: {
      platform: process.platform,
      versions: process.versions
    }
  }
}

// Type declarations for renderer process
declare global {
  interface Window {
    electron: typeof electronAPI
    knowlex: KnowlexAPI
    node: {
      process: {
        platform: string
        versions: any
      }
    }
  }
}
