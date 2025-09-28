import { contextBridge, ipcRenderer } from 'electron'
import { electronAPI } from '@electron-toolkit/preload'
import { IPC_CHANNELS } from '@shared/constants/ipc-channels'
import type {
  IPCResult,
  ConversationCreateRequest,
  AttachmentProcessRequest,
  AttachmentContentProcessRequest,
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
    listPaginated: (data?: { limit?: number; offset?: number }) => Promise<IPCResult>
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
      projectId?: string
      modelConfigId?: string
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
    create: (input: string | { name: string }) => Promise<IPCResult>
    list: () => Promise<IPCResult>
    get: (id: string) => Promise<IPCResult>
    update: (id: string, updates: { name?: string }) => Promise<IPCResult>
    delete: (id: string) => Promise<IPCResult>
    conversations: (id: string) => Promise<IPCResult>
  }

  // Attachment IPC
  attachment: {
    process: (data: AttachmentProcessRequest) => Promise<IPCResult>
    processContent: (data: AttachmentContentProcessRequest) => Promise<IPCResult>
  }

  // Settings IPC
  settings: {
    get: (key?: string) => Promise<IPCResult>
    update: (data: SettingsUpdateRequest) => Promise<IPCResult>
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

  // Project File IPC
  projectFile: {
    upload: (data: {
      projectId: string
      files: Array<{
        name: string
        path?: string
        contentBase64?: string
        size: number
        mime?: string
      }>
    }) => Promise<IPCResult>
    list: (data: { projectId: string }) => Promise<IPCResult>
    get: (data: { id: string }) => Promise<IPCResult>
    updateContent: (data: { id: string; content: string }) => Promise<IPCResult>
    updateSmartNotes: (data: { id: string; smartNotes: any }) => Promise<IPCResult>
    regenerateSmartNotes: (data: { id: string }) => Promise<IPCResult>
    delete: (data: { id: string }) => Promise<IPCResult>
    open: (data: { id: string }) => Promise<IPCResult>
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
    create: (data) => ipcRenderer.invoke(IPC_CHANNELS.conversation.create, data),
    listPaginated: (data) =>
      ipcRenderer.invoke(IPC_CHANNELS.conversation.listPaginated, data ?? {}),
    get: (id) => ipcRenderer.invoke(IPC_CHANNELS.conversation.get, id),
    update: (data) => ipcRenderer.invoke(IPC_CHANNELS.conversation.update, data),
    updateTitle: (conversationId, title) =>
      ipcRenderer.invoke(IPC_CHANNELS.conversation.update, { id: conversationId, title }),
    updateSettings: (conversationId, settings) =>
      ipcRenderer.invoke(IPC_CHANNELS.conversation.update, { id: conversationId, settings }),
    delete: (id) => ipcRenderer.invoke(IPC_CHANNELS.conversation.delete, id),
    move: (conversationId, projectId) =>
      ipcRenderer.invoke(IPC_CHANNELS.conversation.move, { conversationId, projectId })
  },

  // Message IPC
  message: {
    send: (data) => ipcRenderer.invoke(IPC_CHANNELS.message.send, data),
    stop: (messageId) => ipcRenderer.invoke(IPC_CHANNELS.message.stop, messageId),
    list: (conversationId) => ipcRenderer.invoke(IPC_CHANNELS.message.list, conversationId),
    // Normalize message update API to send single object { id, content }
    update: (id, content) => ipcRenderer.invoke(IPC_CHANNELS.message.update, { id, content }),
    delete: (id) => ipcRenderer.invoke(IPC_CHANNELS.message.delete, id),
    regenerate: (messageId) => ipcRenderer.invoke(IPC_CHANNELS.message.regenerate, messageId),
    // Keep legacy edit mapped to message:update for backward compatibility
    edit: (messageId, content) =>
      ipcRenderer.invoke(IPC_CHANNELS.message.update, { id: messageId, content })
  },

  // Project IPC
  project: {
    create: (input) => {
      const payload = typeof input === 'string' ? { name: input } : input
      return ipcRenderer.invoke(IPC_CHANNELS.project.create, payload)
    },
    list: () => ipcRenderer.invoke(IPC_CHANNELS.project.list),
    get: (id) => ipcRenderer.invoke(IPC_CHANNELS.project.get, id),
    update: (id, updates) => ipcRenderer.invoke(IPC_CHANNELS.project.update, { id, updates }),
    delete: (id) => ipcRenderer.invoke(IPC_CHANNELS.project.delete, id),
    conversations: (id) => ipcRenderer.invoke(IPC_CHANNELS.project.conversations, id)
  },

  // Attachment IPC
  attachment: {
    process: (data) => ipcRenderer.invoke(IPC_CHANNELS.attachment.process, data),
    processContent: (data: AttachmentContentProcessRequest) =>
      ipcRenderer.invoke(IPC_CHANNELS.attachment.processContent, data)
  },

  // Settings IPC
  settings: {
    get: (key) => ipcRenderer.invoke(IPC_CHANNELS.settings.get, key),
    update: (data) => ipcRenderer.invoke(IPC_CHANNELS.settings.update, data)
  },

  // AI Model IPC
  ai: {
    testConnection: (config) => ipcRenderer.invoke(IPC_CHANNELS.ai.testConnection, config)
  },

  // Model Configuration IPC
  modelConfig: {
    list: (options?: { includeApiKeys?: boolean }) =>
      ipcRenderer.invoke(IPC_CHANNELS.modelConfig.list, options),
    get: (id: string, options?: { includeApiKey?: boolean }) =>
      ipcRenderer.invoke(IPC_CHANNELS.modelConfig.get, id, options),
    create: (input) => ipcRenderer.invoke(IPC_CHANNELS.modelConfig.create, input),
    update: (id, updates) => ipcRenderer.invoke(IPC_CHANNELS.modelConfig.update, id, updates),
    delete: (id) => ipcRenderer.invoke(IPC_CHANNELS.modelConfig.delete, id),
    test: (id) => ipcRenderer.invoke(IPC_CHANNELS.modelConfig.test, id),
    getDefault: () => ipcRenderer.invoke(IPC_CHANNELS.modelConfig.getDefault),
    setDefault: (id: string) => ipcRenderer.invoke(IPC_CHANNELS.modelConfig.setDefault, id)
  },

  // Project File IPC
  projectFile: {
    // Use centralized channel names from IPC_CHANNELS.projectFile
    upload: (data) => ipcRenderer.invoke(IPC_CHANNELS.projectFile.upload, data),
    list: (data) => ipcRenderer.invoke(IPC_CHANNELS.projectFile.list, data),
    get: (data) => ipcRenderer.invoke(IPC_CHANNELS.projectFile.get, data),
    updateContent: (data) => ipcRenderer.invoke(IPC_CHANNELS.projectFile.updateContent, data),
    updateSmartNotes: (data) => ipcRenderer.invoke(IPC_CHANNELS.projectFile.updateSmartNotes, data),
    regenerateSmartNotes: (data) =>
      ipcRenderer.invoke(IPC_CHANNELS.projectFile.regenerateSmartNotes, data),
    delete: (data) => ipcRenderer.invoke(IPC_CHANNELS.projectFile.delete, data),
    open: (data) => ipcRenderer.invoke(IPC_CHANNELS.projectFile.open, data)
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
    contextBridge.exposeInMainWorld('knowlex', knowlexAPI)
  } catch (error) {
    console.error('Failed to expose APIs in preload:', error)
  }
} else {
  ;(window as any).electron = electronAPI
  ;(window as any).knowlex = knowlexAPI
}
