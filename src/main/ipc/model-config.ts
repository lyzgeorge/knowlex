import { ipcMain, BrowserWindow } from 'electron'
import type { IPCResult } from '@shared/types/ipc'
import type {
  ModelConfig,
  ModelConfigPublic,
  CreateModelConfigInput,
  UpdateModelConfigInput,
  ModelConnectionTestResult
} from '@shared/types/models'
import { sanitizeForBroadcast } from '@shared/types/models'
import { modelConfigService } from '@main/services/model-config-service'
import { handleIPCCall, requireValidId } from './common'

export function registerModelConfigIPCHandlers(): void {
  console.log('Registering model config IPC handlers...')

  // Debounced, versioned change broadcaster
  type ChangeType = 'created' | 'updated' | 'deleted' | 'default-changed'
  interface ModelConfigChangeEvent {
    type: ChangeType
    model?: ModelConfigPublic
    id?: string
  }

  let changeVersion = 0
  let pendingChanges: ModelConfigChangeEvent[] = []
  let flushTimer: NodeJS.Timeout | null = null

  const flushChanges = () => {
    if (pendingChanges.length === 0) return
    changeVersion += 1
    const payload = {
      version: changeVersion,
      changedAt: new Date().toISOString(),
      events: pendingChanges
    }
    const windows = BrowserWindow.getAllWindows()
    windows.forEach((window) => {
      window.webContents.send('model-config:changed', payload)
    })
    pendingChanges = []
    flushTimer = null
  }

  const enqueueChange = (event: ModelConfigChangeEvent) => {
    pendingChanges.push(event)
    if (!flushTimer) {
      flushTimer = setTimeout(flushChanges, 75)
    }
  }

  ipcMain.handle(
    'model-config:list',
    async (
      _,
      options?: { includeApiKeys?: boolean }
    ): Promise<IPCResult<ModelConfig[] | ModelConfigPublic[]>> => {
      return handleIPCCall(async () => {
        const models = await modelConfigService.list()
        // Return sanitized versions by default for security
        if (options?.includeApiKeys === true) {
          return models
        } else {
          return models.map(sanitizeForBroadcast)
        }
      })
    }
  )

  ipcMain.handle(
    'model-config:get',
    async (
      _,
      id: unknown,
      options?: { includeApiKey?: boolean }
    ): Promise<IPCResult<ModelConfig | ModelConfigPublic | null>> => {
      return handleIPCCall(async () => {
        const configId = requireValidId(id, 'Model config ID')
        const model = await modelConfigService.get(configId)
        if (!model) return null

        // Return sanitized version by default for security
        if (options?.includeApiKey === true) {
          return model
        } else {
          return sanitizeForBroadcast(model)
        }
      })
    }
  )

  ipcMain.handle(
    'model-config:create',
    async (_, input: unknown): Promise<IPCResult<ModelConfigPublic>> => {
      return handleIPCCall(async () => {
        if (!input || typeof input !== 'object') {
          throw new Error('Invalid model config data')
        }

        const modelConfig = await modelConfigService.create(input as CreateModelConfigInput)

        // Unified changed event
        enqueueChange({ type: 'created', model: sanitizeForBroadcast(modelConfig) })

        return sanitizeForBroadcast(modelConfig)
      })
    }
  )

  ipcMain.handle(
    'model-config:update',
    async (_, id: unknown, updates: unknown): Promise<IPCResult<ModelConfigPublic>> => {
      return handleIPCCall(async () => {
        const configId = requireValidId(id, 'Model config ID')
        if (!updates || typeof updates !== 'object') {
          throw new Error('Invalid update data')
        }

        const modelConfig = await modelConfigService.update(
          configId,
          updates as UpdateModelConfigInput
        )

        // Unified changed event
        enqueueChange({ type: 'updated', model: sanitizeForBroadcast(modelConfig) })

        return sanitizeForBroadcast(modelConfig)
      })
    }
  )

  ipcMain.handle('model-config:delete', async (_, id: unknown): Promise<IPCResult<void>> => {
    return handleIPCCall(async () => {
      const configId = requireValidId(id, 'Model config ID')
      await modelConfigService.delete(configId)

      // Unified changed event
      enqueueChange({ type: 'deleted', id: configId })
    })
  })

  ipcMain.handle(
    'model-config:test',
    async (_, id: unknown): Promise<IPCResult<ModelConnectionTestResult>> => {
      return handleIPCCall(async () => {
        const configId = requireValidId(id, 'Model config ID')
        return await modelConfigService.testConnection(configId)
      })
    }
  )

  ipcMain.handle('model-config:get-default', async (): Promise<IPCResult<ModelConfig | null>> => {
    return handleIPCCall(async () => {
      return await modelConfigService.resolveDefaultModel()
    })
  })

  // Set default model (persists in main settings)
  ipcMain.handle('model-config:set-default', async (_, id: unknown): Promise<IPCResult<void>> => {
    return handleIPCCall(async () => {
      const configId = requireValidId(id, 'Model config ID')
      await modelConfigService.setDefaultModel(configId)
      // Unified changed event only
      enqueueChange({ type: 'default-changed', id: configId })
    })
  })

  console.log('Model config IPC handlers registered successfully')
}

export function unregisterModelConfigIPCHandlers(): void {
  const channels = [
    'model-config:list',
    'model-config:get',
    'model-config:create',
    'model-config:update',
    'model-config:delete',
    'model-config:test',
    'model-config:get-default',
    'model-config:set-default'
  ]
  channels.forEach((channel) => ipcMain.removeAllListeners(channel))
}
