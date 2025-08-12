# AI Framework Documentation

## Overview

The AI Framework provides a unified interface for integrating multiple AI model providers into Knowlex. It supports chat completions, streaming responses, multimodal inputs, and extensible provider registration.

## Architecture

### Core Components

1. **BaseAIModel** - Abstract base class implementing common functionality
2. **AIModelManager** - Singleton for provider registration and model management  
3. **AIProvider** - Interface for implementing new AI providers
4. **Type System** - Comprehensive TypeScript types for type safety

### Key Features

- **Unified Interface**: Consistent API across all AI providers
- **Message Conversion**: Automatic conversion between internal and AI formats
- **Model Caching**: Intelligent caching with TTL and LRU eviction
- **Provider System**: Easy registration of new AI providers
- **Error Handling**: Robust error handling with meaningful messages
- **Configuration Management**: Flexible configuration with validation

## Usage

### Basic Model Usage

```typescript
import { getModel, AIUtils } from '../main/ai'

// Get a model instance
const model = await getModel({
  apiKey: 'your-api-key',
  model: 'gpt-4',
  temperature: 0.7
})

// Send a chat message
const response = await model.chat([
  AIUtils.createUserMessage('Hello, how are you?')
])

console.log(response.content)
```

### Streaming Responses

```typescript
// Stream a response
for await (const chunk of model.stream(messages)) {
  if (chunk.content) {
    process.stdout.write(chunk.content)
  }
  
  if (chunk.finished) {
    console.log('\nStream completed')
    break
  }
}
```

### Provider Registration

```typescript
import { registerModel } from '../main/ai'

const customProvider: AIProvider = {
  name: 'custom',
  displayName: 'Custom AI Provider',
  
  async createModel(config: AIConfig): Promise<AIModel> {
    return new CustomAIModel(config)
  },
  
  validateConfig(config: AIConfig): boolean {
    return !!(config.apiKey && config.model)
  },
  
  getDefaultConfig(): Partial<AIConfig> {
    return { temperature: 0.7, maxTokens: 2000 }
  },
  
  getSupportedModels(): string[] {
    return ['custom-model-1', 'custom-model-2']
  }
}

registerModel(customProvider)
```

### Message Format Conversion

The framework automatically converts between internal Message format and AI-compatible format:

```typescript
// Internal format (from conversation system)
const internalMessage: Message = {
  id: 'msg-123',
  conversationId: 'conv-456', 
  role: 'user',
  content: [
    { type: 'text', text: 'Hello!' },
    { type: 'image', image: { url: 'data:...', mimeType: 'image/jpeg' } }
  ],
  createdAt: '2024-01-01T00:00:00Z',
  updatedAt: '2024-01-01T00:00:00Z'
}

// Automatically converted to AI format
const aiMessage: AIMessage = {
  role: 'user',
  content: [
    { type: 'text', text: 'Hello!' },
    { type: 'image', image: { url: 'data:...', mimeType: 'image/jpeg' } }
  ]
}
```

## Configuration

### Basic Configuration

```typescript
interface AIConfig {
  apiKey: string
  baseURL?: string
  model: string
  temperature?: number
  maxTokens?: number
  topP?: number
  frequencyPenalty?: number
  presencePenalty?: number
}
```

### Provider-Specific Configuration

```typescript
// OpenAI-specific configuration
interface OpenAIConfig extends AIConfig {
  organization?: string
  seed?: number
  logitBias?: Record<string, number>
  stop?: string | string[]
}

// Claude-specific configuration  
interface ClaudeConfig extends AIConfig {
  anthropicVersion?: string
  stopSequences?: string[]
  metadata?: {
    userId?: string
    [key: string]: unknown
  }
}
```

## Model Capabilities

Each model exposes its capabilities through a structured interface:

```typescript
interface ModelCapabilities {
  supportVision: boolean
  supportReasoning: boolean
  supportToolCalls: boolean
  maxContextLength: number
}

interface ProviderCapabilities extends ModelCapabilities {
  supportStreaming: boolean
  supportEmbeddings: boolean
  supportFunctionCalling: boolean
  supportSystemMessages: boolean
  maxImagesPerMessage?: number
  supportedImageFormats?: string[]
}
```

## Error Handling

The framework provides specific error types for different scenarios:

```typescript
import { 
  AIConfigurationError, 
  AIValidationError, 
  AIAPIError 
} from '../main/ai'

try {
  const model = await getModel(config)
  const response = await model.chat(messages)
} catch (error) {
  if (error instanceof AIConfigurationError) {
    console.error('Configuration error:', error.message)
  } else if (error instanceof AIValidationError) {
    console.error('Validation error:', error.message)
  } else if (error instanceof AIAPIError) {
    console.error('API error:', error.message, error.statusCode)
  }
}
```

## Model Caching

The framework includes intelligent model caching:

- **TTL**: Models are cached for 30 minutes
- **LRU Eviction**: Least recently used models are evicted when cache is full
- **Cache Size**: Maximum 10 cached models
- **Automatic Cleanup**: Expired entries are cleaned up every 15 minutes

### Cache Management

```typescript
import { 
  clearModelCache, 
  cleanupModelCache, 
  getModelCacheStats,
  startCacheCleanup,
  stopCacheCleanup
} from '../main/ai'

// Get cache statistics
const stats = getModelCacheStats()
console.log(`Cache size: ${stats.size}`)

// Manual cache management
clearModelCache()        // Clear all entries
cleanupModelCache()      // Remove expired entries

// Automatic cleanup
startCacheCleanup()      // Start automatic cleanup timer
stopCacheCleanup()       // Stop automatic cleanup timer
```

## Integration with Conversation System

The AI framework integrates seamlessly with the existing conversation and message system:

```typescript
import { getModel } from '../main/ai'
import { getMessages } from '../services/message'
import { getConversation } from '../services/conversation'

// Get conversation with settings
const conversation = await getConversation('conv-123')
const messages = await getMessages('conv-123')

// Get appropriate model for conversation
const model = await getModelFromConfig(conversation.settings?.modelConfig || {
  provider: 'openai',
  model: 'gpt-4',
  apiKey: 'your-key'
})

// Convert messages and send to AI
const aiMessages = messages.map(msg => ({
  role: msg.role,
  content: msg.content[0]?.text || ''
}))

const response = await model.chat(aiMessages)
```

## Supported Models

### OpenAI Models

- **GPT-4**: Most capable model for complex reasoning
- **GPT-4 Turbo**: Enhanced model with vision and larger context
- **GPT-4o**: Cost-effective model with multimodal capabilities  
- **GPT-3.5 Turbo**: Fast and efficient for simple tasks

### Claude Models

- **Claude 3 Opus**: Most capable for complex reasoning and analysis
- **Claude 3 Sonnet**: Balanced model for general-purpose tasks
- **Claude 3 Haiku**: Fastest and most cost-effective

## Testing

The framework includes comprehensive integration tests:

```bash
# Run integration tests
npm run test src/main/ai/test-integration.ts

# Quick test
node -e "require('./src/main/ai/test-integration.ts').quickTest()"
```

## Best Practices

1. **Configuration Validation**: Always validate configurations before use
2. **Error Handling**: Implement proper error handling for API failures
3. **Message Validation**: Validate message format before sending to AI
4. **Resource Management**: Use caching to avoid recreating models unnecessarily
5. **Provider Selection**: Choose appropriate models based on task requirements
6. **Token Management**: Monitor token usage and implement limits as needed

## Future Enhancements

- **Embedding Support**: Add dedicated embedding model interfaces
- **Function Calling**: Enhanced function/tool calling capabilities  
- **Model Comparison**: Built-in A/B testing and model comparison
- **Performance Metrics**: Detailed latency and cost tracking
- **Retry Logic**: Intelligent retry mechanisms for failed requests
- **Load Balancing**: Distribute requests across multiple API keys/endpoints