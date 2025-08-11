import { contextBridge, ipcRenderer } from 'electron'
import { electronAPI } from '@electron-toolkit/preload'
import type {
  IPCRequest,
  IPCResponse,
  IPC_CHANNELS,
  IPC_STREAM_CHANNELS,
  IPC_EVENT_CHANNELS,
  IPC_ERROR_CODES
} from '@shared'

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

  // 事件监听
  onEvent: (channel: string, callback: (data: any) => void) => {
    const listener = (_event: any, data: any) => callback(data)
    ipcRenderer.on(`event-${channel}`, listener)

    return () => {
      ipcRenderer.removeListener(`event-${channel}`, listener)
    }
  },

  // 系统相关 API
  system: {
    ping: () => api.invoke('system:ping'),
    getAppInfo: () => api.invoke('system:app-info')
  },

  // libsql 数据库相关 API
  database: {
    healthCheck: () => api.invoke('database:health-check'),
    getStats: () => api.invoke('database:stats'),
    insertVector: (chunkId: string, content: string, embedding: number[]) =>
      api.invoke('database:insert-vector', { chunkId, content, embedding }),
    searchVectors: (queryEmbedding: number[], limit?: number, projectId?: string) =>
      api.invoke('database:search-vectors', { queryEmbedding, limit, projectId }),
    deleteVector: (chunkId: string) => api.invoke('database:delete-vector', { chunkId }),
    createSampleData: () => api.invoke('database:create-sample-data'),
    clearAllData: () => api.invoke('database:clear-all-data'),
    resetDatabase: () => api.invoke('database:reset-database')
  },

  // 项目相关 API (占位符 - 待实现)
  project: {
    create: (name: string, description?: string) =>
      ipcRenderer.invoke('ipc-request', {
        id: Math.random().toString(36).substr(2, 9),
        channel: 'project:create',
        data: { name, description },
        timestamp: Date.now()
      }),
    list: () =>
      ipcRenderer.invoke('ipc-request', {
        id: Math.random().toString(36).substr(2, 9),
        channel: 'project:list',
        data: null,
        timestamp: Date.now()
      }),
    get: (id: string) =>
      ipcRenderer.invoke('ipc-request', {
        id: Math.random().toString(36).substr(2, 9),
        channel: 'project:get',
        data: { id },
        timestamp: Date.now()
      }),
    update: (id: string, data: any) =>
      ipcRenderer.invoke('ipc-request', {
        id: Math.random().toString(36).substr(2, 9),
        channel: 'project:update',
        data: { id, ...data },
        timestamp: Date.now()
      }),
    delete: (id: string) =>
      ipcRenderer.invoke('ipc-request', {
        id: Math.random().toString(36).substr(2, 9),
        channel: 'project:delete',
        data: { id },
        timestamp: Date.now()
      }),
    getStats: (id: string) =>
      ipcRenderer.invoke('ipc-request', {
        id: Math.random().toString(36).substr(2, 9),
        channel: 'project:stats',
        data: { id },
        timestamp: Date.now()
      })
  },

  // 对话相关 API (占位符 - 待实现)
  conversation: {
    create: (data: any) =>
      ipcRenderer.invoke('ipc-request', {
        id: Math.random().toString(36).substr(2, 9),
        channel: 'conversation:create',
        data,
        timestamp: Date.now()
      }),
    list: (projectId?: string) =>
      ipcRenderer.invoke('ipc-request', {
        id: Math.random().toString(36).substr(2, 9),
        channel: 'conversation:list',
        data: { projectId },
        timestamp: Date.now()
      }),
    get: (id: string) =>
      ipcRenderer.invoke('ipc-request', {
        id: Math.random().toString(36).substr(2, 9),
        channel: 'conversation:get',
        data: { id },
        timestamp: Date.now()
      }),
    update: (id: string, data: any) =>
      ipcRenderer.invoke('ipc-request', {
        id: Math.random().toString(36).substr(2, 9),
        channel: 'conversation:update',
        data: { id, ...data },
        timestamp: Date.now()
      }),
    delete: (id: string) =>
      ipcRenderer.invoke('ipc-request', {
        id: Math.random().toString(36).substr(2, 9),
        channel: 'conversation:delete',
        data: { id },
        timestamp: Date.now()
      }),
    move: (id: string, projectId?: string) =>
      ipcRenderer.invoke('ipc-request', {
        id: Math.random().toString(36).substr(2, 9),
        channel: 'conversation:move',
        data: { id, projectId },
        timestamp: Date.now()
      })
  },

  // 消息相关 API (占位符 - 待实现)
  message: {
    send: (data: any) =>
      ipcRenderer.invoke('ipc-request', {
        id: Math.random().toString(36).substr(2, 9),
        channel: 'message:send',
        data,
        timestamp: Date.now()
      }),
    list: (conversationId: string) =>
      ipcRenderer.invoke('ipc-request', {
        id: Math.random().toString(36).substr(2, 9),
        channel: 'message:list',
        data: { conversationId },
        timestamp: Date.now()
      }),
    edit: (data: any) =>
      ipcRenderer.invoke('ipc-request', {
        id: Math.random().toString(36).substr(2, 9),
        channel: 'message:edit',
        data,
        timestamp: Date.now()
      }),
    delete: (id: string) =>
      ipcRenderer.invoke('ipc-request', {
        id: Math.random().toString(36).substr(2, 9),
        channel: 'message:delete',
        data: { id },
        timestamp: Date.now()
      }),
    regenerate: (data: any) =>
      ipcRenderer.invoke('ipc-request', {
        id: Math.random().toString(36).substr(2, 9),
        channel: 'message:regenerate',
        data,
        timestamp: Date.now()
      })
  },

  // 文件相关 API (占位符 - 待实现)
  file: {
    upload: (data: any) =>
      ipcRenderer.invoke('ipc-request', {
        id: Math.random().toString(36).substr(2, 9),
        channel: 'file:upload',
        data,
        timestamp: Date.now()
      }),
    list: (projectId: string) =>
      ipcRenderer.invoke('ipc-request', {
        id: Math.random().toString(36).substr(2, 9),
        channel: 'file:list',
        data: { projectId },
        timestamp: Date.now()
      }),
    get: (id: string) =>
      ipcRenderer.invoke('ipc-request', {
        id: Math.random().toString(36).substr(2, 9),
        channel: 'file:get',
        data: { id },
        timestamp: Date.now()
      }),
    delete: (id: string) =>
      ipcRenderer.invoke('ipc-request', {
        id: Math.random().toString(36).substr(2, 9),
        channel: 'file:delete',
        data: { id },
        timestamp: Date.now()
      }),
    preview: (id: string) =>
      ipcRenderer.invoke('ipc-request', {
        id: Math.random().toString(36).substr(2, 9),
        channel: 'file:preview',
        data: { id },
        timestamp: Date.now()
      })
  },

  // LLM 相关 API (占位符 - 待实现)
  llm: {
    chat: (data: any) =>
      ipcRenderer.invoke('ipc-request', {
        id: Math.random().toString(36).substr(2, 9),
        channel: 'llm:chat',
        data,
        timestamp: Date.now()
      }),
    stream: (data: any) =>
      ipcRenderer.send('ipc-stream-request', {
        id: Math.random().toString(36).substr(2, 9),
        channel: 'llm:stream',
        data,
        timestamp: Date.now()
      }),
    embedding: (data: any) =>
      ipcRenderer.invoke('ipc-request', {
        id: Math.random().toString(36).substr(2, 9),
        channel: 'llm:embedding',
        data,
        timestamp: Date.now()
      }),
    testConnection: (config: any) =>
      ipcRenderer.invoke('ipc-request', {
        id: Math.random().toString(36).substr(2, 9),
        channel: 'llm:test-connection',
        data: config,
        timestamp: Date.now()
      })
  },

  // RAG 相关 API (占位符 - 待实现)
  rag: {
    search: (data: any) =>
      ipcRenderer.invoke('ipc-request', {
        id: Math.random().toString(36).substr(2, 9),
        channel: 'rag:search',
        data,
        timestamp: Date.now()
      }),
    processFile: (data: any) =>
      ipcRenderer.invoke('ipc-request', {
        id: Math.random().toString(36).substr(2, 9),
        channel: 'rag:process-file',
        data,
        timestamp: Date.now()
      })
  },

  // 记忆相关 API (占位符 - 待实现)
  memory: {
    create: (data: any) =>
      ipcRenderer.invoke('ipc-request', {
        id: Math.random().toString(36).substr(2, 9),
        channel: 'memory:create',
        data,
        timestamp: Date.now()
      }),
    list: (projectId: string) =>
      ipcRenderer.invoke('ipc-request', {
        id: Math.random().toString(36).substr(2, 9),
        channel: 'memory:list',
        data: { projectId },
        timestamp: Date.now()
      }),
    update: (id: string, data: any) =>
      ipcRenderer.invoke('ipc-request', {
        id: Math.random().toString(36).substr(2, 9),
        channel: 'memory:update',
        data: { id, ...data },
        timestamp: Date.now()
      }),
    delete: (id: string) =>
      ipcRenderer.invoke('ipc-request', {
        id: Math.random().toString(36).substr(2, 9),
        channel: 'memory:delete',
        data: { id },
        timestamp: Date.now()
      })
  },

  // 知识相关 API (占位符 - 待实现)
  knowledge: {
    create: (data: any) =>
      ipcRenderer.invoke('ipc-request', {
        id: Math.random().toString(36).substr(2, 9),
        channel: 'knowledge:create',
        data,
        timestamp: Date.now()
      }),
    list: (projectId: string) =>
      ipcRenderer.invoke('ipc-request', {
        id: Math.random().toString(36).substr(2, 9),
        channel: 'knowledge:list',
        data: { projectId },
        timestamp: Date.now()
      }),
    update: (id: string, data: any) =>
      ipcRenderer.invoke('ipc-request', {
        id: Math.random().toString(36).substr(2, 9),
        channel: 'knowledge:update',
        data: { id, ...data },
        timestamp: Date.now()
      }),
    delete: (id: string) =>
      ipcRenderer.invoke('ipc-request', {
        id: Math.random().toString(36).substr(2, 9),
        channel: 'knowledge:delete',
        data: { id },
        timestamp: Date.now()
      })
  },

  // 搜索相关 API (占位符 - 待实现)
  search: {
    global: (data: any) =>
      ipcRenderer.invoke('ipc-request', {
        id: Math.random().toString(36).substr(2, 9),
        channel: 'search:global',
        data,
        timestamp: Date.now()
      })
  },

  // 设置相关 API (占位符 - 待实现)
  settings: {
    get: (key: string) =>
      ipcRenderer.invoke('ipc-request', {
        id: Math.random().toString(36).substr(2, 9),
        channel: 'settings:get',
        data: { key },
        timestamp: Date.now()
      }),
    set: (key: string, value: any) =>
      ipcRenderer.invoke('ipc-request', {
        id: Math.random().toString(36).substr(2, 9),
        channel: 'settings:set',
        data: { key, value },
        timestamp: Date.now()
      }),
    getAll: () =>
      ipcRenderer.invoke('ipc-request', {
        id: Math.random().toString(36).substr(2, 9),
        channel: 'settings:get-all',
        data: null,
        timestamp: Date.now()
      })
  },

  // 事件相关 API
  events: {
    on: (channel: string, callback: (data: any) => void) => {
      const listener = (_event: any, data: any) => callback(data)
      ipcRenderer.on(`event-${channel}`, listener)
      return () => ipcRenderer.removeListener(`event-${channel}`, listener)
    },
    off: (channel: string) => {
      ipcRenderer.removeAllListeners(`event-${channel}`)
    }
  }
}

// 安全地暴露API到渲染进程
if (process.contextIsolated) {
  try {
    // 暴露Electron工具API
    contextBridge.exposeInMainWorld('electron', electronAPI)

    // 暴露Knowlex自定义API
    contextBridge.exposeInMainWorld('knowlexAPI', api)

    // 暴露IPC常量供开发调试使用
    contextBridge.exposeInMainWorld('IPC_CONSTANTS', {
      CHANNELS: IPC_CHANNELS,
      STREAM_CHANNELS: IPC_STREAM_CHANNELS,
      EVENT_CHANNELS: IPC_EVENT_CHANNELS,
      ERROR_CODES: IPC_ERROR_CODES
    })

    console.log('✓ Knowlex preload script loaded successfully')
  } catch (error) {
    console.error('✗ Failed to expose APIs to main world:', error)
  }
} else {
  console.warn('⚠️  Context isolation is disabled. This is not recommended for security reasons.')
  // @ts-expect-error (define in dts)
  window.electron = electronAPI
  // @ts-expect-error (define in dts)
  window.knowlexAPI = api
  // @ts-expect-error (define in dts)
  window.IPC_CONSTANTS = {
    CHANNELS: IPC_CHANNELS,
    STREAM_CHANNELS: IPC_STREAM_CHANNELS,
    EVENT_CHANNELS: IPC_EVENT_CHANNELS,
    ERROR_CODES: IPC_ERROR_CODES
  }
}

// 全局错误处理
window.addEventListener('error', (event) => {
  console.error('Preload script error:', event.error)
})

window.addEventListener('unhandledrejection', (event) => {
  console.error('Preload script unhandled rejection:', event.reason)
})
