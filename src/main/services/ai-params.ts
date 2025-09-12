import { smoothStream } from 'ai'

export function buildProviderOptions(config: any, includeReasoningOptions: boolean) {
  const providerOptions: Record<string, any> = {}
  if (includeReasoningOptions && config.reasoningEffort !== undefined) {
    providerOptions.openai = { reasoningEffort: config.reasoningEffort }
  }
  return providerOptions
}

export function buildModelParams(
  model: any,
  messages: any[],
  config: any,
  options: { includeReasoningOptions?: boolean; includeSmoothStreaming?: boolean } = {}
) {
  const { includeReasoningOptions = false, includeSmoothStreaming = false } = options

  const providerOptions = buildProviderOptions(config, includeReasoningOptions)

  const modelParams: any = {
    model,
    messages,
    ...(config.temperature !== undefined && { temperature: config.temperature }),
    ...(config.maxTokens !== undefined && { maxTokens: config.maxTokens }),
    ...(config.topP !== undefined && { topP: config.topP }),
    ...(config.frequencyPenalty !== undefined && { frequencyPenalty: config.frequencyPenalty }),
    ...(config.presencePenalty !== undefined && { presencePenalty: config.presencePenalty }),
    ...(Object.keys(providerOptions).length > 0 && { providerOptions })
  }

  if (includeSmoothStreaming && config.smooth?.enabled) {
    modelParams.experimental_transform = smoothStream({
      delayInMs: config.smooth.delayInMs || 20,
      chunking: config.smooth.chunking || 'word'
    })
  }

  return modelParams
}

// Converts application messages to AI SDK format
export function convertMessagesToAIFormat(messages: any[]) {
  type AITextPart = { type: 'text'; text: string }
  type AIImagePart = { type: 'image'; image: any; mediaType?: string }
  type AIPart = AITextPart | AIImagePart
  type AIMessage = { role: string; content: string | AIPart[] }

  const isSinglePlainText = (m: any) =>
    m.content.length === 1 && m.content[0]?.type === 'text' && Boolean(m.content[0]?.text)

  const convertPartToAI = (part: any): AIPart | null => {
    switch (part.type) {
      case 'text':
        return part.text ? ({ type: 'text', text: part.text } as AITextPart) : null
      case 'temporary-file':
        if (part.temporaryFile) {
          const text = `[File: ${part.temporaryFile.filename}]\n${part.temporaryFile.content}\n[End of file]`
          return { type: 'text', text }
        }
        return null
      case 'citation':
        if (part.citation) {
          const text = `[Citation: ${part.citation.filename}]\n${part.citation.content}`
          return { type: 'text', text }
        }
        return null
      case 'image':
        if (part.image && typeof part.image.image === 'string') {
          return {
            type: 'image',
            image: part.image.image,
            ...(part.image.mediaType ? { mediaType: part.image.mediaType } : {})
          }
        }
        return null
      default:
        return null
    }
  }

  const collapsePartsToText = (parts: AIPart[]) => {
    if (parts.length === 0) return ''
    if (parts.length === 1 && parts[0] && parts[0].type === 'text')
      return (parts[0] as AITextPart).text
    return null
  }

  return messages.map((message: any) => {
    if (isSinglePlainText(message)) {
      return { role: message.role, content: message.content[0]!.text! } as AIMessage
    }

    const hasNonText = message.content.some((p: any) => p.type !== 'text')
    if (hasNonText) {
      const parts = message.content.map(convertPartToAI).filter(Boolean) as AIPart[]
      const collapsed = collapsePartsToText(parts)
      if (collapsed !== null) {
        return { role: message.role, content: collapsed } as AIMessage
      }
      return { role: message.role, content: parts } as AIMessage
    }

    const text = message.content
      .map((p: any) => (p.type === 'text' ? p.text || '' : ''))
      .filter(Boolean)
      .join('\n\n')
    return { role: message.role, content: text } as AIMessage
  })
}
