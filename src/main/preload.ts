import { contextBridge, ipcRenderer } from 'electron'
import { electronAPI } from '@electron-toolkit/preload'
import type {
  IPCResult,
  ConversationCreateRequest,
  TemporaryFileRequest,
  SearchRequest,
  SettingsUpdateRequest
} from '@shared/types/ipc'
import type { MessageContent } from '@shared/types/message'
import type { ReasoningEffort } from '@shared/types/models'

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

  // Conversation IPC
  conversation: {
    create: (data: ConversationCreateRequest) => Promise<IPCResult>
    listPaginated: (data: { limit: number; offset: number }) => Promise<IPCResult>
    get: (id: string) => Promise<IPCResult>
    update: (data: any) => Promise<IPCResult>
    updateTitle: (conversationId: string, title: string) => Promise<IPCResult>
    updateSettings: (conversationId: string, settings: any) => Promise<IPCResult>
    delete: (id: string) => Promise<IPCResult>
    move: (conversationId: string, projectId: string | null) => Promise<IPCResult>
  }

  // Message IPC
  message: {
    send: (data: {
      conversationId?: string
      parentMessageId?: string
      content: MessageContent
      reasoningEffort?: ReasoningEffort
    }) => Promise<IPCResult>
    stop: (messageId: string) => Promise<IPCResult>
    list: (conversationId: string) => Promise<IPCResult>
    update: (id: string, content: any) => Promise<IPCResult>
    delete: (id: string) => Promise<IPCResult>
    regenerate: (messageId: string) => Promise<IPCResult>
    edit: (messageId: string, content: any) => Promise<IPCResult>
  }

  // Project IPC
  project: {
    create: (name: string) => Promise<IPCResult>
    list: () => Promise<IPCResult>
    get: (id: string) => Promise<IPCResult>
    update: (id: string, updates: { name?: string }) => Promise<IPCResult>
    delete: (id: string) => Promise<IPCResult>
    conversations: (id: string) => Promise<IPCResult>
  }

  // File IPC
  file: {
    processTemp: (data: TemporaryFileRequest) => Promise<IPCResult>
    processTempContent: (data: {
      files: Array<{ name: string; content: string; size: number }>
    }) => Promise<IPCResult>
    delete: (id: string) => Promise<IPCResult>
  }

  // Search IPC
  search: {
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
    testConnection: (config: any) => Promise<IPCResult>
  }

  // Model Configuration IPC
  modelConfig: {
    list: (options?: { includeApiKeys?: boolean }) => Promise<IPCResult>
    get: (id: string, options?: { includeApiKey?: boolean }) => Promise<IPCResult>
    create: (input: any) => Promise<IPCResult>
    update: (id: string, updates: any) => Promise<IPCResult>
    delete: (id: string) => Promise<IPCResult>
    test: (id: string) => Promise<IPCResult>
    getDefault: () => Promise<IPCResult>
    setDefault: (id: string) => Promise<IPCResult>
  }

  // Model config event listeners
  onModelConfigChanged?: (
    callback: (payload: {
      version: number
      changedAt: string
      events: Array<{ type: string; model?: any; id?: string }>
    }) => void
  ) => void

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

  // Conversation IPC
  conversation: {
    create: (data) => ipcRenderer.invoke('conversation:create', data),
    listPaginated: (data) => ipcRenderer.invoke('conversation:list-paginated', data),
    get: (id) => ipcRenderer.invoke('conversation:get', id),
    update: (data) => ipcRenderer.invoke('conversation:update', data),
    updateTitle: (conversationId, title) =>
      ipcRenderer.invoke('conversation:update', { id: conversationId, title }),
    updateSettings: (conversationId, settings) =>
      ipcRenderer.invoke('conversation:update-settings', conversationId, settings),
    delete: (id) => ipcRenderer.invoke('conversation:delete', id),
    move: (conversationId, projectId) =>
      ipcRenderer.invoke('conversation:move', conversationId, projectId)
  },

  // Message IPC
  message: {
    send: (data) => ipcRenderer.invoke('message:send', data),
    stop: (messageId) => ipcRenderer.invoke('message:stop', messageId),
    list: (conversationId) => ipcRenderer.invoke('message:list', conversationId),
    // Normalize message update API to send single object { id, content }
    update: (id, content) => ipcRenderer.invoke('message:update', { id, content }),
    delete: (id) => ipcRenderer.invoke('message:delete', id),
    regenerate: (messageId) => ipcRenderer.invoke('message:regenerate', messageId),
    // Keep legacy edit mapped to message:update for backward compatibility
    edit: (messageId, content) => ipcRenderer.invoke('message:update', { id: messageId, content })
  },

  // Project IPC
  project: {
    create: (name) => ipcRenderer.invoke('project:create', name),
    list: () => ipcRenderer.invoke('project:list'),
    get: (id) => ipcRenderer.invoke('project:get', id),
    update: (id, updates) => ipcRenderer.invoke('project:update', id, updates),
    delete: (id) => ipcRenderer.invoke('project:delete', id),
    conversations: (id) => ipcRenderer.invoke('project:conversations', id)
  },

  // File IPC
  file: {
    processTemp: (data) => ipcRenderer.invoke('file:process-temp', data),
    processTempContent: (data) => ipcRenderer.invoke('file:process-temp-content', data),
    delete: (id) => ipcRenderer.invoke('file:delete', id)
  },

  // Search IPC
  search: {
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
    testConnection: (config) => ipcRenderer.invoke('ai:test-connection', config)
  },

  // Model Configuration IPC
  modelConfig: {
    list: (options?: { includeApiKeys?: boolean }) =>
      ipcRenderer.invoke('model-config:list', options),
    get: (id: string, options?: { includeApiKey?: boolean }) =>
      ipcRenderer.invoke('model-config:get', id, options),
    create: (input) => ipcRenderer.invoke('model-config:create', input),
    update: (id, updates) => ipcRenderer.invoke('model-config:update', id, updates),
    delete: (id) => ipcRenderer.invoke('model-config:delete', id),
    test: (id) => ipcRenderer.invoke('model-config:test', id),
    getDefault: () => ipcRenderer.invoke('model-config:get-default'),
    setDefault: (id: string) => ipcRenderer.invoke('model-config:set-default', id)
  },

  onModelConfigChanged: (callback) => {
    ipcRenderer.on('model-config:changed', (_, payload) => callback(payload))
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
  window.electron = electronAPI
  window.knowlex = knowlexAPI
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
