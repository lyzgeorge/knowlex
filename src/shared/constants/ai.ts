import type { ModelInfo } from '../types/ai'

export const AI_MODELS: Record<string, Record<string, ModelInfo>> = {
  OPENAI: {
    'gpt-4': {
      id: 'gpt-4',
      name: 'GPT-4',
      provider: 'openai',
      contextLength: 8192,
      capabilities: {
        supportVision: false,
        supportReasoning: false,
        supportToolCalls: true,
        maxContextLength: 8192,
        supportStreaming: true,
        supportEmbeddings: false,
        supportFunctionCalling: true,
        supportSystemMessages: true,
        maxImagesPerMessage: 0,
        supportedImageFormats: []
      },
      costPer1kTokens: { input: 0.03, output: 0.06 },
      description: 'Most capable GPT-4 model for complex reasoning tasks'
    },
    'gpt-4-turbo': {
      id: 'gpt-4-turbo',
      name: 'GPT-4 Turbo',
      provider: 'openai',
      contextLength: 128000,
      capabilities: {
        supportVision: true,
        supportReasoning: false,
        supportToolCalls: true,
        maxContextLength: 128000,
        supportStreaming: true,
        supportEmbeddings: false,
        supportFunctionCalling: true,
        supportSystemMessages: true,
        maxImagesPerMessage: 10,
        supportedImageFormats: ['jpeg', 'png', 'gif', 'webp']
      },
      costPer1kTokens: { input: 0.01, output: 0.03 },
      description: 'Enhanced GPT-4 with vision capabilities and larger context'
    },
    'gpt-4o': {
      id: 'gpt-4o',
      name: 'GPT-4o',
      provider: 'openai',
      contextLength: 128000,
      capabilities: {
        supportVision: true,
        supportReasoning: false,
        supportToolCalls: true,
        maxContextLength: 128000,
        supportStreaming: true,
        supportEmbeddings: false,
        supportFunctionCalling: true,
        supportSystemMessages: true,
        maxImagesPerMessage: 10,
        supportedImageFormats: ['jpeg', 'png', 'gif', 'webp']
      },
      costPer1kTokens: { input: 0.005, output: 0.015 },
      description: 'Most cost-effective GPT-4 model with multimodal capabilities'
    },
    'gpt-3.5-turbo': {
      id: 'gpt-3.5-turbo',
      name: 'GPT-3.5 Turbo',
      provider: 'openai',
      contextLength: 16385,
      capabilities: {
        supportVision: false,
        supportReasoning: false,
        supportToolCalls: true,
        maxContextLength: 16385,
        supportStreaming: true,
        supportEmbeddings: false,
        supportFunctionCalling: true,
        supportSystemMessages: true,
        maxImagesPerMessage: 0,
        supportedImageFormats: []
      },
      costPer1kTokens: { input: 0.001, output: 0.002 },
      description: 'Fast and efficient model for simple tasks'
    }
  },
  CLAUDE: {
    'claude-3-opus': {
      id: 'claude-3-opus',
      name: 'Claude 3 Opus',
      provider: 'claude',
      contextLength: 200000,
      capabilities: {
        supportVision: true,
        supportReasoning: true,
        supportToolCalls: true,
        maxContextLength: 200000,
        supportStreaming: true,
        supportEmbeddings: false,
        supportFunctionCalling: true,
        supportSystemMessages: true,
        maxImagesPerMessage: 20,
        supportedImageFormats: ['jpeg', 'png', 'gif', 'webp']
      },
      costPer1kTokens: { input: 0.015, output: 0.075 },
      description: 'Most capable Claude model for complex reasoning and analysis'
    },
    'claude-3-sonnet': {
      id: 'claude-3-sonnet',
      name: 'Claude 3 Sonnet',
      provider: 'claude',
      contextLength: 200000,
      capabilities: {
        supportVision: true,
        supportReasoning: true,
        supportToolCalls: true,
        maxContextLength: 200000,
        supportStreaming: true,
        supportEmbeddings: false,
        supportFunctionCalling: true,
        supportSystemMessages: true,
        maxImagesPerMessage: 20,
        supportedImageFormats: ['jpeg', 'png', 'gif', 'webp']
      },
      costPer1kTokens: { input: 0.003, output: 0.015 },
      description: 'Balanced Claude model for most general-purpose tasks'
    },
    'claude-3-haiku': {
      id: 'claude-3-haiku',
      name: 'Claude 3 Haiku',
      provider: 'claude',
      contextLength: 200000,
      capabilities: {
        supportVision: true,
        supportReasoning: false,
        supportToolCalls: true,
        maxContextLength: 200000,
        supportStreaming: true,
        supportEmbeddings: false,
        supportFunctionCalling: true,
        supportSystemMessages: true,
        maxImagesPerMessage: 20,
        supportedImageFormats: ['jpeg', 'png', 'gif', 'webp']
      },
      costPer1kTokens: { input: 0.00025, output: 0.00125 },
      description: 'Fastest and most cost-effective Claude model'
    }
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
