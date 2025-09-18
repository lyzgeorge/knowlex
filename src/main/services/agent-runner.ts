import { createOpenAICompatible } from '@ai-sdk/openai-compatible'
import { generateText, type CoreMessage } from 'ai'
import { modelConfigService } from './model-config-service'
import { resolveModelContext, type ModelResolutionContext } from '@shared/utils/model-resolution'
import { getSettings } from './settings'
import type { z } from 'zod'

export type AgentRunInput<T> = {
  system: string
  messages: CoreMessage[]
  schema: z.ZodType<T>
  modelId?: string | null
}

export type AgentRunResult<T> = {
  object: T
}

export async function resolveModel(modelId?: string | null) {
  console.log('[AgentRunner] resolveModel: start', { modelId })
  const availableModels = await modelConfigService.list()
  const settings = getSettings()
  const resolutionContext: ModelResolutionContext = {
    explicitModelId: modelId ?? settings.fileProcessingModelId ?? null,
    conversationModelId: null,
    userDefaultModelId: settings.defaultModelId || null,
    availableModels
  }
  const resolution = resolveModelContext(resolutionContext)
  const modelConfig = resolution.modelConfig
  if (!modelConfig) throw new Error('No model configured')
  const provider = createOpenAICompatible({
    name: 'openai-provider',
    apiKey: modelConfig.apiKey || '',
    baseURL: modelConfig.apiEndpoint || 'https://api.openai.com/v1',
    includeUsage: false
  })
  console.log('[AgentRunner] resolveModel: resolved', {
    chosenModelId: modelConfig.modelId,
    baseURL: modelConfig.apiEndpoint,
    hasApiKey: Boolean(modelConfig.apiKey)
  })
  return { model: provider(modelConfig.modelId), modelConfig }
}

export async function runAgent<T>(input: AgentRunInput<T>): Promise<AgentRunResult<T>> {
  console.log('[AgentRunner] runAgent: start', {
    modelId: input.modelId,
    messages: input.messages?.length ?? 0
  })
  const { model } = await resolveModel(input.modelId)
  try {
    const text = await generateText({
      model,
      messages: [{ role: 'system', content: input.system }, ...input.messages]
    })
    const body: string = typeof text.text === 'string' ? text.text : String(text.text ?? '')
    const parsed = extractAndParseJson(body)
    const validated = input.schema.parse(parsed)
    console.log('[AgentRunner] runAgent: success')
    return { object: validated as T }
  } catch (err: any) {
    console.error('[AgentRunner] runAgent: error', err?.message || err)
    throw err
  }
}

function extractAndParseJson(s: string): unknown {
  const fence = /```(?:json)?\n([\s\S]*?)```/i
  const m = s.match(fence)
  const candidate: string = m && typeof m[1] === 'string' ? m[1] : s
  try {
    return JSON.parse(candidate)
  } catch {
    // try to salvage by trimming non-json prefix/suffix
    const start = candidate.indexOf('{')
    const end = candidate.lastIndexOf('}')
    if (start >= 0 && end > start) {
      return JSON.parse(candidate.slice(start, end + 1))
    }
    throw new Error('Failed to parse JSON from model response')
  }
}
