# AI Integration System

This document provides comprehensive documentation for the AI integration system in Knowlex Desktop. The system implements a sophisticated, production-ready framework that provides unified access to multiple AI providers with advanced features like intelligent caching, streaming responses, and multimodal support.

## Architecture Overview

The AI system implements a **3-layer provider-based architecture**:

```
┌─────────────────────────────────────────┐
│        AI Manager Layer                 │
│  - Provider registration & caching      │
│  - Model lifecycle management           │
│  - Configuration validation             │
├─────────────────────────────────────────┤
│        Provider Layer                   │
│  - OpenAI Provider (GPT models)         │
│  - Claude Provider (Anthropic models)   │
│  - Base provider interface              │
├─────────────────────────────────────────┤
│        Service Integration Layer        │
│  - AI Chat Service (environment config) │
│  - Message format conversion            │
│  - Error handling & validation          │
└─────────────────────────────────────────┘
```

**Key Features:**
- **Unified Interface**: Consistent API across all providers defined in `src/main/ai/base.ts`
- **Intelligent Caching**: LRU cache with TTL and automatic cleanup in `src/main/ai/manager.ts`
- **Provider System**: Dynamic registration system for extensibility
- **Type Safety**: Comprehensive TypeScript types in `src/shared/types/ai.ts`
- **Error Handling**: Multi-layer error processing with user-friendly messages
- **Performance Optimization**: Connection pooling, retry logic, and streaming support

## Provider Implementations

### OpenAI Provider (`src/main/ai/openai.ts`)

**Supported Models:**
```typescript
// Production models with full capabilities
const OPENAI_MODELS = [
  {
    id: 'gpt-4o',
    name: 'GPT-4o',
    capabilities: {
      supportsImages: true,
      supportsToolCalls: true,
      supportsStreaming: true,
      maxContextLength: 128000
    },
    costPer1kTokens: { input: 0.005, output: 0.015 }
  },
  {
    id: 'gpt-4-turbo',
    name: 'GPT-4 Turbo',
    capabilities: {
      supportsImages: true,
      supportsToolCalls: true,
      supportsStreaming: true,
      maxContextLength: 128000
    },
    costPer1kTokens: { input: 0.01, output: 0.03 }
  },
  {
    id: 'gpt-4',
    name: 'GPT-4',
    capabilities: {
      supportsToolCalls: true,
      supportsStreaming: true,
      maxContextLength: 8000
    },
    costPer1kTokens: { input: 0.03, output: 0.06 }
  },
  {
    id: 'gpt-3.5-turbo',
    name: 'GPT-3.5 Turbo',
    capabilities: {
      supportsToolCalls: true,
      supportsStreaming: true,
      maxContextLength: 16000
    },
    costPer1kTokens: { input: 0.001, output: 0.002 }
  }
]
```

**Advanced Features:**
- **Multimodal Input**: Base64 image processing with automatic quality detection
- **Streaming Responses**: Server-Sent Events with real-time chunk processing
- **Tool Calling**: Function calling with JSON argument parsing and validation
- **Retry Logic**: Exponential backoff with intelligent rate limit handling
- **Custom Base URLs**: Support for OpenAI-compatible APIs and self-hosted deployments

**Implementation Highlights:**
```typescript
export class OpenAIModel extends BaseAIModel {
  // Streaming with proper error handling
  async stream(messages: AIMessage[], options?: AIChatCompletionOptions): Promise<AsyncIterable<AIStreamChunk>> {
    const stream = await this.client.chat.completions.create({
      model: this.config.model,
      messages: this.convertMessages(messages),
      stream: true,
      ...options
    })
    
    return this.processStream(stream)
  }
  
  // Image processing with base64 encoding
  private processImageContent(content: ImageContent): string {
    return `data:${content.mimeType};base64,${content.url}`
  }
  
  // Retry logic with exponential backoff
  private async withRetry<T>(operation: () => Promise<T>, maxRetries: number = 3): Promise<T> {
    for (let i = 0; i < maxRetries; i++) {
      try {
        return await operation()
      } catch (error) {
        if (i === maxRetries - 1) throw error
        if (error.status === 429) {
          await this.delay(Math.pow(2, i) * 1000)
        } else {
          throw error
        }
      }
    }
  }
}
```

### Claude Provider (`src/main/ai/claude.ts`)

**Supported Models:**
```typescript
const CLAUDE_MODELS = [
  {
    id: 'claude-3-opus-20240229',
    name: 'Claude 3 Opus',
    capabilities: {
      supportsImages: true,
      supportsToolCalls: true,
      supportsStreaming: true,
      maxContextLength: 200000,
      reasoningSupport: true
    },
    costPer1kTokens: { input: 0.015, output: 0.075 }
  },
  {
    id: 'claude-3-sonnet-20240229',
    name: 'Claude 3 Sonnet',
    capabilities: {
      supportsImages: true,
      supportsToolCalls: true,
      supportsStreaming: true,
      maxContextLength: 200000,
      reasoningSupport: true
    },
    costPer1kTokens: { input: 0.003, output: 0.015 }
  },
  {
    id: 'claude-3-haiku-20240307',
    name: 'Claude 3 Haiku',
    capabilities: {
      supportsImages: true,
      supportsToolCalls: true,
      supportsStreaming: true,
      maxContextLength: 200000
    },
    costPer1kTokens: { input: 0.00025, output: 0.00125 }
  }
]
```

**Unique Features:**
- **Reasoning Content**: Automatic extraction of `<thinking>` tags for reasoning display
- **Large Context**: Native support for 200k token context windows
- **System Message Separation**: Proper handling of system vs conversation messages
- **Enhanced Error Handling**: Anthropic-specific error code processing

**Implementation Highlights:**
```typescript
export class ClaudeModel extends BaseAIModel {
  // Reasoning content extraction
  private extractReasoningContent(content: string): { reasoning?: string, response: string } {
    const reasoningMatch = content.match(/<thinking>([\s\S]*?)<\/thinking>/)
    if (reasoningMatch) {
      return {
        reasoning: reasoningMatch[1].trim(),
        response: content.replace(/<thinking>[\s\S]*?<\/thinking>/, '').trim()
      }
    }
    return { response: content }
  }
  
  // System message handling
  private processMessages(messages: AIMessage[]): { system?: string, messages: any[] } {
    const systemMessages = messages.filter(m => m.role === 'system')
    const conversationMessages = messages.filter(m => m.role !== 'system')
    
    return {
      system: systemMessages.map(m => m.content).join('\n'),
      messages: conversationMessages.map(this.convertMessage.bind(this))
    }
  }
}
```

## Model Management System

### Intelligent Caching (`src/main/ai/manager.ts`)

**Cache Configuration:**
```typescript
interface ModelCacheEntry {
  model: AIModel
  config: AIConfig
  createdAt: number
  lastUsed: number
  accessCount: number
}

const CACHE_CONFIG = {
  ttl: 30 * 60 * 1000, // 30 minutes
  maxSize: 10,
  cleanupInterval: 15 * 60 * 1000 // 15 minutes
}
```

**Advanced Cache Features:**
- **LRU Eviction**: Least recently used models evicted first
- **TTL Expiration**: Models expire after 30 minutes of inactivity
- **Automatic Cleanup**: Background process removes stale entries
- **Usage Statistics**: Track model access patterns and performance
- **Memory Management**: Prevents unlimited model instance growth

### Provider Registration System

**Dynamic Provider Registration:**
```typescript
export class AIManager {
  private providers = new Map<string, AIProvider>()
  private modelCache = new LRUCache<string, ModelCacheEntry>(10)
  
  // Register providers at runtime
  registerProvider(provider: AIProvider): void {
    this.providers.set(provider.name, provider)
    console.log(`Registered AI provider: ${provider.name}`)
  }
  
  // Intelligent model resolution
  async getModel(config: AIConfig): Promise<AIModel> {
    const cacheKey = this.getCacheKey(config)
    
    // Check cache first
    const cached = this.modelCache.get(cacheKey)
    if (cached && this.isCacheValid(cached)) {
      cached.lastUsed = Date.now()
      cached.accessCount++
      return cached.model
    }
    
    // Create new model instance
    const provider = this.getProvider(config.provider)
    const model = await provider.createModel(config)
    
    // Cache the model
    this.modelCache.set(cacheKey, {
      model,
      config: { ...config },
      createdAt: Date.now(),
      lastUsed: Date.now(),
      accessCount: 1
    })
    
    return model
  }
  
  // Pattern-based model-to-provider mapping
  private getProvider(providerName: string): AIProvider {
    const provider = this.providers.get(providerName)
    if (!provider) {
      throw new AIConfigurationError(`Provider not found: ${providerName}`)
    }
    return provider
  }
}
```

## Service Layer Integration

### AI Chat Service (`src/main/services/ai-chat.ts`)

**Environment Configuration:**
```typescript
// Automatic provider selection from environment
const getDefaultConfig = (): AIConfig => {
  const provider = process.env.DEFAULT_PROVIDER || 'openai'
  
  if (provider === 'openai') {
    return {
      provider: 'openai',
      apiKey: process.env.OPENAI_API_KEY!,
      model: process.env.OPENAI_MODEL || 'gpt-4o',
      baseUrl: process.env.OPENAI_BASE_URL
    }
  } else if (provider === 'claude') {
    return {
      provider: 'claude',
      apiKey: process.env.CLAUDE_API_KEY!,
      model: process.env.CLAUDE_MODEL || 'claude-3-sonnet-20240229',
      baseUrl: process.env.CLAUDE_BASE_URL
    }
  }
  
  throw new Error(`Unknown provider: ${provider}`)
}
```

**Message Format Conversion:**
```typescript
export class AIChatService {
  // Convert internal message format to AI format
  private convertToAIMessages(messages: Message[]): AIMessage[] {
    return messages.map(msg => ({
      role: msg.role,
      content: msg.content.map(part => {
        switch (part.type) {
          case 'text':
            return part.text!
          case 'image':
            return {
              type: 'image',
              image: part.image!
            }
          case 'citation':
            return `[Citation: ${part.citation!.filename}]\n${part.citation!.content}`
          default:
            return ''
        }
      }).join('\n')
    }))
  }
  
  // Configuration testing with validation
  async testConfiguration(config: AIConfig): Promise<boolean> {
    try {
      const model = await getModel(config)
      
      // Test with minimal request
      const response = await model.chat([{
        role: 'user',
        content: 'Test connection'
      }], {
        maxTokens: 10
      })
      
      return response.content.length > 0
    } catch (error) {
      console.error('Configuration test failed:', error)
      return false
    }
  }
}
```

## Usage Examples

### Basic Chat Completion

```typescript
import { getModel } from '@main/ai'

// Get model instance (automatically cached)
const model = await getModel({
  provider: 'openai',
  apiKey: process.env.OPENAI_API_KEY,
  model: 'gpt-4o'
})

// Simple text completion
const response = await model.chat([
  { role: 'user', content: 'Explain quantum computing briefly' }
])

console.log(response.content) // AI response text
console.log(response.usage) // Token usage statistics
```

### Multimodal Chat with Images

```typescript
// Chat with image input
const response = await model.chat([
  {
    role: 'user',
    content: [
      { type: 'text', text: 'What do you see in this image?' },
      {
        type: 'image',
        image: {
          url: 'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAA...',
          mimeType: 'image/png'
        }
      }
    ]
  }
])
```

### Streaming Responses

```typescript
// Real-time streaming
const stream = await model.stream([
  { role: 'user', content: 'Write a short story about space exploration' }
])

for await (const chunk of stream) {
  if (chunk.type === 'content') {
    process.stdout.write(chunk.content) // Real-time output
  } else if (chunk.type === 'complete') {
    console.log('\nFinal usage:', chunk.usage)
  }
}
```

### Configuration Management

```typescript
import { AIChatService } from '@main/services/ai-chat'

const aiService = new AIChatService()

// Test API configuration
const isValid = await aiService.testConfiguration({
  provider: 'claude',
  apiKey: 'sk-ant-...',
  model: 'claude-3-opus-20240229'
})

if (isValid) {
  console.log('Configuration is valid!')
} else {
  console.log('Configuration test failed')
}
```

## Error Handling

### Multi-Layer Error Processing

**API-Level Errors:**
```typescript
// Provider-specific error handling
export class OpenAIModel extends BaseAIModel {
  private handleAPIError(error: any): never {
    if (error.status === 401) {
      throw new AIAPIError('Invalid API key. Please check your OpenAI API key.')
    } else if (error.status === 429) {
      throw new AIAPIError('Rate limit exceeded. Please try again later.')
    } else if (error.status === 503) {
      throw new AIAPIError('OpenAI service temporarily unavailable.')
    } else {
      throw new AIAPIError(`OpenAI API error: ${error.message}`)
    }
  }
}
```

**Configuration Errors:**
```typescript
// Configuration validation
export const validateAIConfig = (config: AIConfig): void => {
  if (!config.apiKey) {
    throw new AIConfigurationError('API key is required')
  }
  
  if (!config.model) {
    throw new AIConfigurationError('Model is required')
  }
  
  const provider = getProvider(config.provider)
  if (!provider.supportsModel(config.model)) {
    throw new AIConfigurationError(`Model ${config.model} not supported by ${config.provider}`)
  }
}
```

**User-Friendly Error Messages:**
```typescript
// Service layer error conversion
export class AIChatService {
  private convertError(error: Error): string {
    if (error instanceof AIAPIError) {
      return error.message // Already user-friendly
    } else if (error instanceof AIConfigurationError) {
      return `Configuration error: ${error.message}`
    } else if (error.message.includes('network')) {
      return 'Network connection failed. Please check your internet connection.'
    } else {
      return 'An unexpected error occurred. Please try again.'
    }
  }
}
```

## Testing System

### Integration Test Suite (`src/main/ai/test-integration.ts`)

**Comprehensive Test Coverage:**
```typescript
export class MockAIProvider implements AIProvider {
  name = 'mock'
  
  async createModel(config: AIConfig): Promise<AIModel> {
    return new MockAIModel(config)
  }
  
  supportsModel(model: string): boolean {
    return model.startsWith('mock-')
  }
  
  getModelInfo(model: string): ModelInfo {
    return {
      id: model,
      provider: 'mock',
      name: `Mock ${model}`,
      capabilities: {
        supportsImages: true,
        supportsToolCalls: true,
        supportsStreaming: true,
        maxContextLength: 100000
      }
    }
  }
}

// Test scenarios
export const runAITests = async (): Promise<void> => {
  const tests = [
    testProviderRegistration,
    testModelCaching,
    testMessageConversion,
    testStreamingIntegration,
    testErrorHandling,
    testConfigurationValidation
  ]
  
  for (const test of tests) {
    try {
      await test()
      console.log(`✅ ${test.name} passed`)
    } catch (error) {
      console.error(`❌ ${test.name} failed:`, error.message)
    }
  }
}
```

## Performance Optimizations

### Connection Management
- **HTTP Connection Pooling**: Reuse connections for multiple requests
- **Request Queuing**: Intelligent request batching for efficiency
- **Timeout Handling**: Proper timeout handling with graceful degradation

### Memory Optimization
- **Model Instance Caching**: Prevent redundant model creation
- **Automatic Cleanup**: TTL-based cache expiration and memory management
- **Resource Disposal**: Proper cleanup of streaming connections and resources

### Response Processing
- **Streaming Efficiency**: Chunk-by-chunk processing minimizes memory usage
- **Token Estimation**: Rough token counting prevents context length issues
- **Compression**: Response compression for large content transfers

## Configuration

### Environment Variables
```bash
# Provider selection
DEFAULT_PROVIDER=openai  # or 'claude'

# OpenAI configuration
OPENAI_API_KEY=sk-...
OPENAI_MODEL=gpt-4o
OPENAI_BASE_URL=https://api.openai.com/v1  # optional

# Claude configuration  
CLAUDE_API_KEY=sk-ant-...
CLAUDE_MODEL=claude-3-sonnet-20240229
CLAUDE_BASE_URL=https://api.anthropic.com  # optional
```

### Runtime Configuration
```typescript
// Dynamic configuration
const config: AIConfig = {
  provider: 'openai',
  apiKey: userApiKey,
  model: 'gpt-4o',
  temperature: 0.7,
  maxTokens: 4000,
  topP: 1.0
}

const model = await getModel(config)
```

## Extending the Framework

### Adding New Providers

**1. Implement Provider Interface:**
```typescript
export class CustomAIProvider implements AIProvider {
  name = 'custom'
  
  async createModel(config: AIConfig): Promise<AIModel> {
    return new CustomAIModel(config)
  }
  
  supportsModel(model: string): boolean {
    return model.startsWith('custom-')
  }
  
  getModelInfo(model: string): ModelInfo {
    return {
      id: model,
      provider: 'custom',
      name: `Custom ${model}`,
      capabilities: {
        supportsImages: false,
        supportsToolCalls: true,
        supportsStreaming: true,
        maxContextLength: 32000
      }
    }
  }
}
```

**2. Implement Model Class:**
```typescript
export class CustomAIModel extends BaseAIModel {
  async chat(messages: AIMessage[], options?: AIChatCompletionOptions): Promise<AIChatCompletion> {
    // Implementation specific to your AI service
    const response = await this.apiClient.complete({
      messages: this.convertMessages(messages),
      ...options
    })
    
    return this.processResponse(response)
  }
  
  async stream(messages: AIMessage[], options?: AIChatCompletionOptions): Promise<AsyncIterable<AIStreamChunk>> {
    // Streaming implementation
    const stream = await this.apiClient.stream({
      messages: this.convertMessages(messages),
      ...options
    })
    
    return this.processStreamResponse(stream)
  }
  
  getCapabilities(): ModelCapabilities {
    return {
      supportsImages: false,
      supportsToolCalls: true,
      supportsStreaming: true,
      maxContextLength: 32000
    }
  }
}
```

**3. Register Provider:**
```typescript
import { registerProvider } from '@main/ai'

// Register during application initialization
registerProvider(new CustomAIProvider())
```

## Future Enhancements

### Planned Features
1. **Embedding Support**: Vector embeddings for RAG functionality
2. **Tool Calling Integration**: Connect AI tool calls to application functions
3. **Multi-Provider Routing**: Route requests to different providers based on capabilities
4. **Model Comparison**: Side-by-side model comparison and evaluation
5. **Usage Analytics**: Detailed usage tracking and cost analysis

### Architecture Improvements
1. **Plugin System**: Dynamic plugin loading for providers
2. **Load Balancing**: Distribute requests across multiple API keys
3. **Fallback Providers**: Automatic failover between providers
4. **Request Batching**: Batch multiple requests for efficiency
5. **Advanced Caching**: Semantic caching for similar requests

The AI integration system in Knowlex provides a robust, scalable foundation for multi-provider AI access with production-ready features like intelligent caching, comprehensive error handling, and advanced multimodal support.