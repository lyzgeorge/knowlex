export const AI_MODELS = {
  OPENAI: {
    'gpt-4': { name: 'GPT-4', contextLength: 8192, supportVision: false },
    'gpt-4-turbo': { name: 'GPT-4 Turbo', contextLength: 128000, supportVision: true },
    'gpt-4o': { name: 'GPT-4o', contextLength: 128000, supportVision: true },
    'gpt-3.5-turbo': { name: 'GPT-3.5 Turbo', contextLength: 16385, supportVision: false }
  },
  CLAUDE: {
    'claude-3-opus': { name: 'Claude 3 Opus', contextLength: 200000, supportVision: true },
    'claude-3-sonnet': { name: 'Claude 3 Sonnet', contextLength: 200000, supportVision: true },
    'claude-3-haiku': { name: 'Claude 3 Haiku', contextLength: 200000, supportVision: true }
  }
} as const

export const DEFAULT_AI_CONFIG = {
  temperature: 0.7,
  maxTokens: 4000,
  topP: 1,
  frequencyPenalty: 0,
  presencePenalty: 0
} as const

export const EMBEDDING_CONFIG = {
  model: 'text-embedding-ada-002',
  dimensions: 1536,
  batchSize: 100
} as const

export const RAG_CONFIG = {
  maxRetrievedChunks: 5,
  similarityThreshold: 0.7,
  maxContextLength: 8000 // tokens
} as const
