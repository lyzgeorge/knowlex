import type {
  ModelConfig,
  CreateModelConfigInput,
  UpdateModelConfigInput,
  ModelConnectionTestResult
} from '@shared/types/models'
import { generateId } from '@shared/utils/id'
import {
  validateCreateModelConfigInput,
  validateUpdateModelConfigInput,
  formatValidationError
} from '@shared/schemas/model-config'

export interface IModelConfigService {
  list(): Promise<ModelConfig[]>
  get(id: string): Promise<ModelConfig | null>
  create(input: CreateModelConfigInput): Promise<ModelConfig>
  update(id: string, updates: UpdateModelConfigInput): Promise<ModelConfig>
  delete(id: string): Promise<void>
  testConnection(id: string): Promise<ModelConnectionTestResult>
  resolveDefaultModel(): Promise<ModelConfig | null>
  setDefaultModel(id: string): Promise<void>
  getDefaultModelId(): Promise<string | null>
  handleDefaultModelDeletion(
    deletedModelId: string
  ): Promise<{ newDefaultId: string | null; affectedConversations: number }>
}

class ModelConfigService implements IModelConfigService {
  async list(): Promise<ModelConfig[]> {
    const { listModelConfigs } = await import('@main/database/queries')
    return await listModelConfigs()
  }

  async get(id: string): Promise<ModelConfig | null> {
    if (!id?.trim()) throw new Error('Model config ID is required')
    const { getModelConfig } = await import('@main/database/queries')
    return await getModelConfig(id.trim())
  }

  async create(input: CreateModelConfigInput): Promise<ModelConfig> {
    // Use Zod validation
    const validation = validateCreateModelConfigInput(input)
    if (!validation.success) {
      throw new Error(`Invalid input: ${formatValidationError(validation.error)}`)
    }

    const validatedInput = validation.data

    // Check for duplicate name (case-insensitive)
    const existing = await this.list()
    if (existing.some((model) => model.name.toLowerCase() === validatedInput.name.toLowerCase())) {
      throw new Error('Model name already exists')
    }

    const now = new Date().toISOString()
    const modelConfig: ModelConfig = {
      id: generateId(),
      name: validatedInput.name,
      apiEndpoint: validatedInput.apiEndpoint,
      apiKey: validatedInput.apiKey || null,
      modelId: validatedInput.modelId,
      temperature: validatedInput.temperature,
      topP: validatedInput.topP,
      frequencyPenalty: validatedInput.frequencyPenalty,
      presencePenalty: validatedInput.presencePenalty,
      maxInputTokens: validatedInput.maxInputTokens,
      supportsReasoning: validatedInput.supportsReasoning,
      supportsVision: validatedInput.supportsVision,
      supportsToolUse: validatedInput.supportsToolUse,
      supportsWebSearch: validatedInput.supportsWebSearch,
      createdAt: now,
      updatedAt: now
    }

    const { createModelConfig } = await import('@main/database/queries')
    await createModelConfig(modelConfig)
    return modelConfig
  }

  async update(id: string, updates: UpdateModelConfigInput): Promise<ModelConfig> {
    if (!id?.trim()) throw new Error('Model config ID is required')

    const existing = await this.get(id)
    if (!existing) throw new Error('Model config not found')

    // Use Zod validation
    const validation = validateUpdateModelConfigInput(updates)
    if (!validation.success) {
      throw new Error(`Invalid updates: ${formatValidationError(validation.error)}`)
    }

    const validatedUpdates = validation.data

    // Check for duplicate name (case-insensitive), excluding current model
    if (validatedUpdates.name !== undefined) {
      const allModels = await this.list()
      if (
        allModels.some(
          (model) =>
            model.id !== id && model.name.toLowerCase() === validatedUpdates.name!.toLowerCase()
        )
      ) {
        throw new Error('Model name already exists')
      }
    }

    const updateData: Partial<ModelConfig> = {}

    if (validatedUpdates.name !== undefined) updateData.name = validatedUpdates.name
    if (validatedUpdates.apiEndpoint !== undefined)
      updateData.apiEndpoint = validatedUpdates.apiEndpoint
    if (validatedUpdates.apiKey !== undefined) updateData.apiKey = validatedUpdates.apiKey || null
    if (validatedUpdates.modelId !== undefined) updateData.modelId = validatedUpdates.modelId
    if (validatedUpdates.temperature !== undefined)
      updateData.temperature = validatedUpdates.temperature
    if (validatedUpdates.topP !== undefined) updateData.topP = validatedUpdates.topP
    if (validatedUpdates.frequencyPenalty !== undefined)
      updateData.frequencyPenalty = validatedUpdates.frequencyPenalty
    if (validatedUpdates.presencePenalty !== undefined)
      updateData.presencePenalty = validatedUpdates.presencePenalty
    if (validatedUpdates.supportsReasoning !== undefined)
      updateData.supportsReasoning = validatedUpdates.supportsReasoning
    if (validatedUpdates.supportsVision !== undefined)
      updateData.supportsVision = validatedUpdates.supportsVision
    if (validatedUpdates.supportsToolUse !== undefined)
      updateData.supportsToolUse = validatedUpdates.supportsToolUse
    if (validatedUpdates.supportsWebSearch !== undefined)
      updateData.supportsWebSearch = validatedUpdates.supportsWebSearch
    if (validatedUpdates.maxInputTokens !== undefined)
      updateData.maxInputTokens = validatedUpdates.maxInputTokens

    const { updateModelConfig } = await import('@main/database/queries')
    await updateModelConfig(id, updateData)

    const updated = await this.get(id)
    if (!updated) throw new Error('Failed to retrieve updated model config')
    return updated
  }

  async delete(id: string): Promise<void> {
    if (!id?.trim()) throw new Error('Model config ID is required')

    const existing = await this.get(id)
    if (!existing) throw new Error('Model config not found')

    // Handle default model deletion and get impact info
    const { newDefaultId, affectedConversations } = await this.handleDefaultModelDeletion(id)

    console.log(`Deleting model ${existing.name} (${id}):`, {
      newDefaultId,
      affectedConversations
    })

    const { deleteModelConfig } = await import('@main/database/queries')
    await deleteModelConfig(id)
  }

  async testConnection(id: string): Promise<ModelConnectionTestResult> {
    if (!id?.trim()) throw new Error('Model config ID is required')

    const config = await this.get(id)
    if (!config) throw new Error('Model config not found')

    return await this.performConnectionTest(config)
  }

  async resolveDefaultModel(): Promise<ModelConfig | null> {
    // First check if there's a user default set
    const defaultId = await this.getDefaultModelId()
    if (defaultId) {
      const defaultModel = await this.get(defaultId)
      if (defaultModel) return defaultModel
    }

    // Fallback to system default (oldest model)
    const models = await this.list()
    if (models.length === 0) return null

    const systemDefault = models.sort(
      (a, b) => new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime()
    )[0]

    // Auto-set system default as user default if none set
    if (systemDefault && !defaultId) {
      try {
        await this.setDefaultModel(systemDefault.id)
      } catch (e) {
        console.warn('Failed to auto-set default model:', e)
      }
    }

    return systemDefault || null
  }

  async getDefaultModelId(): Promise<string | null> {
    try {
      // Get default model from settings
      const { getSettings } = await import('./settings')
      const settings = getSettings()
      return settings.defaultModelId || null
    } catch (e) {
      console.warn('Failed to get default model ID from settings:', e)
      return null
    }
  }

  async setDefaultModel(id: string): Promise<void> {
    if (!id?.trim()) throw new Error('Model ID is required')

    // Verify model exists
    const model = await this.get(id.trim())
    if (!model) throw new Error('Model not found')

    try {
      // Update settings with new default
      const { updateSettings } = await import('./settings')
      await updateSettings({ defaultModelId: id.trim() })
      console.log(`Default model set to: ${model.name} (${id})`)
    } catch (error) {
      console.error('Failed to set default model:', error)
      throw new Error('Failed to update default model setting')
    }
  }

  async handleDefaultModelDeletion(
    deletedModelId: string
  ): Promise<{ newDefaultId: string | null; affectedConversations: number }> {
    const currentDefaultId = await this.getDefaultModelId()
    let newDefaultId: string | null = null
    let affectedConversations = 0

    try {
      // If deleted model was the default, find a new one
      if (currentDefaultId === deletedModelId) {
        const remainingModels = await this.list()
        const newDefault = remainingModels
          .filter((m) => m.id !== deletedModelId)
          .sort((a, b) => new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime())[0]

        if (newDefault) {
          newDefaultId = newDefault.id
          // Update settings
          const { updateSettings } = await import('./settings')
          await updateSettings({ defaultModelId: newDefaultId })
          console.log(
            `Default model updated from deleted ${deletedModelId} to ${newDefault.name} (${newDefaultId})`
          )
        } else {
          // No models left, clear default
          const { updateSettings } = await import('./settings')
          await updateSettings({ defaultModelId: null })
          console.log('No models remaining, cleared default model')
        }
      }

      // Count conversations using this model (they will be reset by foreign key ON DELETE SET NULL)
      const { executeQuery } = await import('@main/database')
      const conversationsResult = await executeQuery(
        'SELECT COUNT(*) as count FROM conversations WHERE model_config_id = ?',
        [deletedModelId]
      )

      const countRow = conversationsResult.rows[0] as { count: number } | undefined
      affectedConversations = countRow?.count || 0

      if (affectedConversations > 0) {
        console.log(`${affectedConversations} conversations will have model reset due to deletion`)
      }
    } catch (error) {
      console.error('Failed to handle default model deletion:', error)
      throw new Error('Failed to update default model after deletion')
    }

    return { newDefaultId, affectedConversations }
  }

  private async performConnectionTest(config: ModelConfig): Promise<ModelConnectionTestResult> {
    const startTime = Date.now()
    const result: ModelConnectionTestResult = {
      endpointReachable: false,
      authValid: null,
      modelAvailable: null
    }

    try {
      const controller = new AbortController()
      const timeout = setTimeout(() => controller.abort(), 8000) // 8 second timeout

      const headers: Record<string, string> = {
        'Content-Type': 'application/json'
      }

      if (config.apiKey) {
        headers['Authorization'] = `Bearer ${config.apiKey}`
      }

      const response = await fetch(`${config.apiEndpoint}/chat/completions`, {
        method: 'POST',
        headers,
        signal: controller.signal,
        body: JSON.stringify({
          model: config.modelId,
          messages: [{ role: 'user', content: 'ping' }],
          max_tokens: 8
        })
      })

      clearTimeout(timeout)
      result.endpointReachable = true
      result.roundTripMs = Date.now() - startTime

      if (response.status === 401) {
        result.authValid = false
        result.errorMessage = 'Authentication failed - check API key'
      } else if (response.status === 404) {
        result.authValid = config.apiKey ? true : null
        result.modelAvailable = false
        result.errorMessage = 'Model not found at this endpoint'
      } else if (response.ok) {
        result.authValid = config.apiKey ? true : null
        result.modelAvailable = true
      } else {
        const errorText = await response.text().catch(() => 'Unknown error')
        result.errorMessage = `HTTP ${response.status}: ${errorText}`
      }
    } catch (error) {
      if (error instanceof Error) {
        if (error.name === 'AbortError') {
          result.errorMessage = 'Connection timed out (8s)'
        } else {
          result.errorMessage = error.message
        }
      } else {
        result.errorMessage = 'Unknown connection error'
      }
    }

    return result
  }
}

export const modelConfigService = new ModelConfigService()
