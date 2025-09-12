import { useCallback, useEffect, useMemo, useReducer, useState } from 'react'
// zod validation handled via shared schema; direct import not needed here
import { useModelConfigStore } from '@renderer/stores/model-config'
import type { ModelConfig, ModelConfigPublic, CreateModelConfigInput } from '@shared/types/models'
import { CreateModelConfigInputSchema } from '@shared/schemas/model-config'

type NumericOrEmpty = number | ''

export interface ModelFormState {
  name: string
  apiEndpoint: string
  apiKey: string
  modelId: string
  temperature: NumericOrEmpty
  topP: NumericOrEmpty
  frequencyPenalty: NumericOrEmpty
  presencePenalty: NumericOrEmpty
  maxInputTokens: NumericOrEmpty
  supportsReasoning: boolean
  supportsVision: boolean
  supportsToolUse: boolean
  supportsWebSearch: boolean
}

type ModelFormAction =
  | { type: 'set'; field: keyof ModelFormState; value: any }
  | { type: 'merge'; value: Partial<ModelFormState> }
  | { type: 'reset'; value?: Partial<ModelFormState> }

function reducer(state: ModelFormState, action: ModelFormAction): ModelFormState {
  switch (action.type) {
    case 'set':
      return { ...state, [action.field]: action.value }
    case 'merge':
      return { ...state, ...action.value }
    case 'reset':
      return {
        name: '',
        apiEndpoint: '',
        apiKey: '',
        modelId: '',
        temperature: '',
        topP: '',
        frequencyPenalty: '',
        presencePenalty: '',
        maxInputTokens: 131072,
        supportsReasoning: false,
        supportsVision: false,
        supportsToolUse: false,
        supportsWebSearch: false,
        ...(action.value || {})
      }
    default:
      return state
  }
}

const INITIAL_STATE: ModelFormState = {
  name: '',
  apiEndpoint: '',
  apiKey: '',
  modelId: '',
  temperature: '',
  topP: '',
  frequencyPenalty: '',
  presencePenalty: '',
  maxInputTokens: 131072,
  supportsReasoning: false,
  supportsVision: false,
  supportsToolUse: false,
  supportsWebSearch: false
}

// Quick templates for common providers
const QUICK_TEMPLATES = {
  openai: {
    name: 'OpenAI',
    apiEndpoint: 'https://api.openai.com/v1',
    modelId: 'gpt-4o'
  },
  azure: {
    name: 'Azure',
    apiEndpoint: 'https://{resource}.openai.azure.com/openai/deployments/{deployment}/',
    modelId: 'gpt-4'
  },
  ollama: {
    name: 'Ollama',
    apiEndpoint: 'http://localhost:11434/v1',
    modelId: 'llama3.1'
  },
  'lm-studio': {
    name: 'LM Studio',
    apiEndpoint: 'http://localhost:1234/v1',
    modelId: 'local-model'
  }
}

export type QuickTemplateKey = keyof typeof QUICK_TEMPLATES

export interface UseModelFormOptions {
  isOpen?: boolean
  onSubmitSuccess?: () => void
}

export function useModelForm(model?: ModelConfigPublic | null, options: UseModelFormOptions = {}) {
  const { createModel, updateModel } = useModelConfigStore()
  const [state, dispatch] = useReducer(reducer, INITIAL_STATE)
  const [errors, setErrors] = useState<Record<string, string>>({})
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [isLoadingModel, setIsLoadingModel] = useState(false)
  const [fullModel, setFullModel] = useState<ModelConfig | null>(null)

  const setField = useCallback(
    <K extends keyof ModelFormState>(field: K, value: ModelFormState[K]) => {
      dispatch({ type: 'set', field, value })
    },
    []
  )

  const reset = useCallback((override?: Partial<ModelFormState>) => {
    if (override) {
      dispatch({ type: 'reset', value: override })
    } else {
      dispatch({ type: 'reset' })
    }
    setErrors({})
  }, [])

  // Initialize when editing or creating
  useEffect(() => {
    const isOpen = options.isOpen ?? true
    if (!isOpen) return

    if (model) {
      setIsLoadingModel(true)
      window.knowlex.modelConfig
        .get(model.id, { includeApiKey: true })
        .then((res) => {
          if (res?.success && res.data) {
            const m = res.data as ModelConfig
            setFullModel(m)
            dispatch({
              type: 'merge',
              value: {
                name: m.name,
                apiEndpoint: m.apiEndpoint,
                apiKey: m.apiKey || '',
                modelId: m.modelId,
                temperature: m.temperature ?? '',
                topP: m.topP ?? '',
                frequencyPenalty: m.frequencyPenalty ?? '',
                presencePenalty: m.presencePenalty ?? '',
                maxInputTokens: m.maxInputTokens ?? 131072,
                supportsReasoning: m.supportsReasoning,
                supportsVision: m.supportsVision,
                supportsToolUse: m.supportsToolUse,
                supportsWebSearch: m.supportsWebSearch
              }
            })
          } else {
            // Fallback to public data
            dispatch({
              type: 'merge',
              value: {
                name: model.name,
                apiEndpoint: model.apiEndpoint,
                apiKey: '',
                modelId: model.modelId,
                temperature: model.temperature ?? '',
                topP: model.topP ?? '',
                frequencyPenalty: model.frequencyPenalty ?? '',
                presencePenalty: model.presencePenalty ?? '',
                maxInputTokens: model.maxInputTokens ?? 131072,
                supportsReasoning: model.supportsReasoning,
                supportsVision: model.supportsVision,
                supportsToolUse: model.supportsToolUse,
                supportsWebSearch: model.supportsWebSearch
              }
            })
          }
        })
        .catch((e) => {
          console.error('[useModelForm] Failed to fetch full model config:', e)
          // Fallback to public data
          dispatch({
            type: 'merge',
            value: {
              name: model.name,
              apiEndpoint: model.apiEndpoint,
              apiKey: '',
              modelId: model.modelId,
              temperature: model.temperature ?? '',
              topP: model.topP ?? '',
              frequencyPenalty: model.frequencyPenalty ?? '',
              presencePenalty: model.presencePenalty ?? '',
              maxInputTokens: model.maxInputTokens ?? 131072,
              supportsReasoning: model.supportsReasoning,
              supportsVision: model.supportsVision,
              supportsToolUse: model.supportsToolUse,
              supportsWebSearch: model.supportsWebSearch
            }
          })
        })
        .finally(() => setIsLoadingModel(false))
    } else {
      setFullModel(null)
      reset()
    }
    setErrors({})
  }, [model, options.isOpen, reset])

  // Convert UI state to CreateModelConfigInput (coerce '' to undefined)
  const toInput = useCallback((): CreateModelConfigInput => {
    const coerce = (v: NumericOrEmpty) => (v === '' ? undefined : v)
    return {
      name: state.name.trim(),
      apiEndpoint: state.apiEndpoint.trim(),
      apiKey: state.apiKey.trim() || undefined,
      modelId: state.modelId.trim(),
      temperature: coerce(state.temperature),
      topP: coerce(state.topP),
      frequencyPenalty: coerce(state.frequencyPenalty),
      presencePenalty: coerce(state.presencePenalty),
      maxInputTokens: coerce(state.maxInputTokens),
      supportsReasoning: state.supportsReasoning,
      supportsVision: state.supportsVision,
      supportsToolUse: state.supportsToolUse,
      supportsWebSearch: state.supportsWebSearch
    }
  }, [state])

  // Zod validation using shared schema
  const validate = useCallback((): boolean => {
    const input = toInput()
    const parsed = CreateModelConfigInputSchema.safeParse(input)
    if (!parsed.success) {
      const newErrors: Record<string, string> = {}
      for (const issue of parsed.error.issues) {
        const key = (issue.path?.[0] as string) || 'form'
        // Keep the last error per field to avoid overwhelming UI
        newErrors[key] = issue.message
      }
      setErrors(newErrors)
      return false
    }
    setErrors({})
    return true
  }, [toInput])

  // Submit handler encapsulating create/update logic
  const submit = useCallback(async () => {
    if (!validate()) return
    setIsSubmitting(true)
    try {
      const input = toInput()

      if (fullModel || model) {
        const id = fullModel?.id || model!.id
        await updateModel(id, input)
      } else {
        await createModel(input)
      }

      options.onSubmitSuccess?.()
    } catch (err) {
      const msg = err instanceof Error ? err.message : 'Failed to save model'
      setErrors({ submit: msg })
    } finally {
      setIsSubmitting(false)
    }
  }, [validate, toInput, fullModel, model, updateModel, createModel, options])

  const applyTemplate = useCallback((template: QuickTemplateKey) => {
    const t = QUICK_TEMPLATES[template]
    dispatch({
      type: 'merge',
      value: { apiEndpoint: t.apiEndpoint, modelId: t.modelId }
    })
  }, [])

  const templates = useMemo(
    () =>
      (
        Object.entries(QUICK_TEMPLATES) as Array<
          [QuickTemplateKey, (typeof QUICK_TEMPLATES)[QuickTemplateKey]]
        >
      ).map(([key, val]) => ({ key, name: val.name })),
    []
  )

  return {
    formData: state,
    setField,
    errors,
    isSubmitting,
    isLoadingModel,
    submit,
    applyTemplate,
    templates
  }
}

export default useModelForm
