import { useCallback, useEffect, useRef, useState } from 'react'
import { ipcClient, StreamWrapper, StreamResponseHandler } from '../lib/ipc-client'
import type { IPCError } from '@shared'

// 基础 IPC 调用 Hook
export function useIPC() {
  const [isReady, setIsReady] = useState(ipcClient.ready)

  useEffect(() => {
    // 检查 IPC 客户端就绪状态
    const checkReady = () => {
      setIsReady(ipcClient.ready)
    }

    // 定期检查就绪状态
    const interval = setInterval(checkReady, 100)

    return () => clearInterval(interval)
  }, [])

  const invoke = useCallback(async <T = unknown>(channel: string, data?: unknown): Promise<T> => {
    return await ipcClient.invoke<T>(channel, data)
  }, [])

  return {
    isReady,
    invoke,
    client: ipcClient
  }
}

// 流式数据 Hook
export function useIPCStream<T = unknown>(
  channel: string,
  handler: StreamResponseHandler<T>,
  deps: unknown[] = []
) {
  const streamRef = useRef<StreamWrapper<T> | null>(null)
  const [isActive, setIsActive] = useState(false)
  const [error, setError] = useState<IPCError | null>(null)

  const start = useCallback(() => {
    if (!ipcClient.ready) {
      setError({ code: 'IPC_NOT_READY', message: 'IPC client is not ready' })
      return
    }

    if (streamRef.current?.active) {
      return
    }

    setError(null)

    const wrappedHandler: StreamResponseHandler<T> = {
      ...handler,
      onStart: () => {
        setIsActive(true)
        handler.onStart?.()
      },
      onEnd: () => {
        setIsActive(false)
        handler.onEnd?.()
      },
      onError: (err) => {
        setError(err)
        setIsActive(false)
        handler.onError?.(err)
      }
    }

    streamRef.current = new StreamWrapper(channel, wrappedHandler)
    streamRef.current.start()
  }, [channel, ...deps])

  const stop = useCallback(() => {
    if (streamRef.current) {
      streamRef.current.stop()
      streamRef.current = null
    }
    setIsActive(false)
  }, [])

  // 清理资源
  useEffect(() => {
    return () => {
      stop()
    }
  }, [stop])

  return {
    start,
    stop,
    isActive,
    error
  }
}

// 事件监听 Hook
export function useIPCEvent<T = unknown>(
  channel: string,
  callback: (data: T) => void,
  deps: unknown[] = []
) {
  const callbackRef = useRef(callback)
  callbackRef.current = callback

  useEffect(() => {
    if (!ipcClient.ready) {
      console.warn(`IPC client not ready for event channel: ${channel}`)
      return
    }

    const cleanup = ipcClient.onEvent<T>(channel, (data) => {
      callbackRef.current(data)
    })

    return cleanup
  }, [channel, ...deps])
}

// LLM 流式响应 Hook
export function useLLMStream() {
  const [isStreaming, setIsStreaming] = useState(false)
  const [content, setContent] = useState('')
  const [error, setError] = useState<IPCError | null>(null)
  const streamRef = useRef<StreamWrapper | null>(null)

  const startStream = useCallback(
    async (messages: unknown[], options?: unknown) => {
      if (isStreaming) {
        console.warn('Stream is already active')
        return
      }

      setError(null)
      setContent('')

      try {
        // 启动流式监听
        streamRef.current = new StreamWrapper('llm-stream-response', {
          onStart: () => {
            setIsStreaming(true)
          },
          onData: (data: { content?: string; complete?: boolean }) => {
            if (data.content) {
              setContent((prev) => prev + data.content)
            }
          },
          onEnd: () => {
            setIsStreaming(false)
          },
          onError: (err) => {
            setError(err)
            setIsStreaming(false)
          }
        })

        streamRef.current.start()

        // 发送流式请求
        await ipcClient.llm.stream(messages, options)
      } catch (err) {
        setError(err as IPCError)
        setIsStreaming(false)
      }
    },
    [isStreaming]
  )

  const stopStream = useCallback(() => {
    if (streamRef.current) {
      streamRef.current.stop()
      streamRef.current = null
    }
    setIsStreaming(false)
  }, [])

  const resetContent = useCallback(() => {
    setContent('')
    setError(null)
  }, [])

  // 清理资源
  useEffect(() => {
    return () => {
      stopStream()
    }
  }, [stopStream])

  return {
    isStreaming,
    content,
    error,
    startStream,
    stopStream,
    resetContent
  }
}

// 文件处理进度 Hook
export function useFileProcessProgress() {
  const [progresses, setProgresses] = useState<
    Map<
      string,
      {
        fileId: string
        filename: string
        status: string
        progress: number
        error?: string
      }
    >
  >(new Map())

  const clearProgress = useCallback((fileId: string) => {
    setProgresses((prev) => {
      const newMap = new Map(prev)
      newMap.delete(fileId)
      return newMap
    })
  }, [])

  const clearAllProgress = useCallback(() => {
    setProgresses(new Map())
  }, [])

  useIPCEvent(
    'file-process-progress',
    (data: {
      fileId: string
      filename: string
      status: string
      progress: number
      error?: string
    }) => {
      setProgresses((prev) => {
        const newMap = new Map(prev)
        newMap.set(data.fileId, data)
        return newMap
      })
    }
  )

  return {
    progresses: Array.from(progresses.values()),
    progressMap: progresses,
    clearProgress,
    clearAllProgress
  }
}

// 系统相关 Hook
export function useSystemAPI() {
  const ping = useCallback(async () => {
    return await ipcClient.system.ping()
  }, [])

  const getAppInfo = useCallback(async () => {
    return await ipcClient.system.getAppInfo()
  }, [])

  return {
    ping,
    getAppInfo
  }
}

// 数据库相关 Hook
export function useDatabaseAPI() {
  const healthCheck = useCallback(async () => {
    return await ipcClient.database.healthCheck()
  }, [])

  const getStats = useCallback(async () => {
    return await ipcClient.database.getStats()
  }, [])

  const insertVector = useCallback(
    async (chunkId: string, content: string, embedding: number[]) => {
      return await ipcClient.database.insertVector(chunkId, content, embedding)
    },
    []
  )

  const searchVectors = useCallback(
    async (queryEmbedding: number[], limit?: number, projectId?: string) => {
      return await ipcClient.database.searchVectors(queryEmbedding, limit, projectId)
    },
    []
  )

  const deleteVector = useCallback(async (chunkId: string) => {
    return await ipcClient.database.deleteVector(chunkId)
  }, [])

  const createSampleData = useCallback(async () => {
    return await ipcClient.database.createSampleData()
  }, [])

  const clearAllData = useCallback(async () => {
    return await ipcClient.database.clearAllData()
  }, [])

  const resetDatabase = useCallback(async () => {
    return await ipcClient.database.resetDatabase()
  }, [])

  return {
    healthCheck,
    getStats,
    insertVector,
    searchVectors,
    deleteVector,
    createSampleData,
    clearAllData,
    resetDatabase
  }
}

// 项目相关 Hook
export function useProjectAPI() {
  const create = useCallback(async (name: string, description?: string) => {
    return await ipcClient.project.create(name, description)
  }, [])

  const list = useCallback(async () => {
    return await ipcClient.project.list()
  }, [])

  const get = useCallback(async (id: string) => {
    return await ipcClient.project.get(id)
  }, [])

  const update = useCallback(async (id: string, data: { name?: string; description?: string }) => {
    return await ipcClient.project.update(id, data)
  }, [])

  const remove = useCallback(async (id: string) => {
    return await ipcClient.project.delete(id)
  }, [])

  const getStats = useCallback(async (id: string) => {
    return await ipcClient.project.getStats(id)
  }, [])

  return {
    create,
    list,
    get,
    update,
    remove,
    getStats
  }
}

// 设置相关 Hook
export function useSettingsAPI() {
  const get = useCallback(async (key: string) => {
    return await ipcClient.settings.get(key)
  }, [])

  const set = useCallback(async (key: string, value: unknown) => {
    return await ipcClient.settings.set(key, value)
  }, [])

  const getAll = useCallback(async () => {
    return await ipcClient.settings.getAll()
  }, [])

  return {
    get,
    set,
    getAll
  }
}
