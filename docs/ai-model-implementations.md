# AI Model Implementations

This document provides comprehensive documentation for the OpenAI and Claude AI model implementations in the Knowlex desktop application.

## Overview

The Knowlex application supports multiple AI providers through a unified interface. Tasks 11 and 12 have been completed to implement comprehensive OpenAI and Claude model integrations that seamlessly work with the existing AI infrastructure.

## Architecture

### Base Infrastructure

The AI system is built on a three-layer architecture:

1. **Base AI Model** (`BaseAIModel`): Abstract class providing common functionality
2. **AI Model Manager** (`AIModelManager`): Provider registry and model instance management
3. **Provider Implementations**: Specific implementations for OpenAI and Claude

### Key Components

- **Base Classes**: `BaseAIModel`, `AIProvider` interface
- **Provider Implementations**: `OpenAIModel`, `ClaudeModel`
- **Manager**: `AIModelManager` singleton for provider registration and caching
- **Types**: Comprehensive TypeScript interfaces in `shared/types/ai.ts`
- **Constants**: Model configurations and capabilities in `shared/constants/ai.ts`

## OpenAI Implementation (Task 11)

### Overview

The OpenAI implementation provides integration with OpenAI's GPT models including GPT-4, GPT-4-turbo, GPT-4o, and GPT-3.5-turbo.

### Key Features

- **Streaming Responses**: Server-Sent Events handling with real-time token streaming
- **Multimodal Support**: Text and image inputs with Base64 processing
- **Error Handling**: Network retry with exponential backoff and API error recovery
- **Tool Calling**: Support for function calling and tool use
- **Vision Capabilities**: Image analysis for supported models

### File Location

```
src/main/ai/openai.ts
```

### Core Classes

#### OpenAIModel

```typescript
export class OpenAIModel extends BaseAIModel {
  async chat(messages: AIMessage[]): Promise<AIResponse>
  async* stream(messages: AIMessage[]): AsyncIterable<AIStreamChunk>
}
```

#### OpenAIProvider

```typescript
export const OpenAIProvider: AIProvider = {
  name: 'openai',
  displayName: 'OpenAI',
  createModel: (config: AIConfig) => Promise<AIModel>
  validateConfig: (config: AIConfig) => boolean
  getDefaultConfig: () => Partial<AIConfig>
  getSupportedModels: () => string[]
  getModelCapabilities: (modelName: string) => ModelCapabilities
}
```

### Configuration

#### Default Configuration

```typescript
{
  baseURL: 'https://api.openai.com/v1',
  model: 'gpt-4o',
  temperature: 0.7,
  maxTokens: 4000,
  topP: 1,
  frequencyPenalty: 0,
  presencePenalty: 0
}
```

#### OpenAI-Specific Options

- `organization`: OpenAI organization ID
- `seed`: Deterministic sampling seed
- `logitBias`: Token probability adjustments
- `stop`: Stop sequences
- `user`: User identifier for monitoring

### Supported Models

- **gpt-4**: Most capable GPT-4 model for complex reasoning tasks
- **gpt-4-turbo**: Enhanced GPT-4 with vision capabilities and larger context
- **gpt-4o**: Most cost-effective GPT-4 model with multimodal capabilities
- **gpt-3.5-turbo**: Fast and efficient model for simple tasks

### Error Handling

The implementation includes robust error handling:

- **Rate Limiting**: Exponential backoff for 429 errors
- **Service Unavailable**: Retry logic for 503 errors
- **Authentication**: Clear error messages for 401 errors
- **Network Errors**: Retry logic for network connectivity issues

### Streaming Implementation

```typescript
async* stream(messages: AIMessage[]): AsyncIterable<AIStreamChunk> {
  // Server-Sent Events processing
  // Real-time token streaming
  // Tool call detection
  // Usage information tracking
}
```

## Claude Implementation (Task 12)

### Overview

The Claude implementation provides integration with Anthropic's Claude models including Claude-3-opus, Claude-3-sonnet, and Claude-3-haiku.

### Key Features

- **Reasoning Content**: Parsing and display of thinking/reasoning content
- **Tool Calling**: Detection and execution of tool use
- **Capability Detection**: Model-specific capability detection methods
- **Streaming Support**: Real-time response streaming
- **Vision Support**: Image analysis for Claude 3 models
- **Large Context**: Support for 200k token context windows

### File Location

```
src/main/ai/claude.ts
```

### Core Classes

#### ClaudeModel

```typescript
export class ClaudeModel extends BaseAIModel {
  async chat(messages: AIMessage[]): Promise<AIResponse>
  async* stream(messages: AIMessage[]): AsyncIterable<AIStreamChunk>
  
  // Capability detection methods
  isSupportVision(): boolean
  isSupportReasoning(): boolean
  isSupportToolCalls(): boolean
}
```

#### ClaudeProvider

```typescript
export const ClaudeProvider: AIProvider = {
  name: 'claude',
  displayName: 'Claude (Anthropic)',
  createModel: (config: AIConfig) => Promise<AIModel>
  validateConfig: (config: AIConfig) => boolean
  getDefaultConfig: () => Partial<AIConfig>
  getSupportedModels: () => string[]
  getModelCapabilities: (modelName: string) => ModelCapabilities
}
```

### Configuration

#### Default Configuration

```typescript
{
  baseURL: 'https://api.anthropic.com',
  model: 'claude-3-sonnet',
  temperature: 0.7,
  maxTokens: 4000,
  topP: 1
}
```

#### Claude-Specific Options

- `anthropicVersion`: API version (default: '2023-06-01')
- `stopSequences`: Custom stop sequences
- `metadata`: Request metadata including user ID

### Supported Models

- **claude-3-opus**: Most capable Claude model for complex reasoning and analysis
- **claude-3-sonnet**: Balanced Claude model for most general-purpose tasks
- **claude-3-haiku**: Fastest and most cost-effective Claude model

### Reasoning Content Support

Claude models can include reasoning content in their responses:

```typescript
// Automatic detection and parsing
const reasoningMatch = content.match(/<thinking>([\s\S]*?)<\/thinking>/)
if (reasoningMatch) {
  aiResponse.reasoning = reasoningMatch[1].trim()
  aiResponse.content = content.replace(/<thinking>[\s\S]*?<\/thinking>/, '').trim()
}
```

### Tool Calling Implementation

Claude supports advanced tool calling with structured input/output:

```typescript
interface ClaudeToolUse {
  type: 'tool_use'
  id: string
  name: string
  input: Record<string, unknown>
}
```

### Multimodal Support

Claude 3 models support image analysis:

```typescript
{
  type: 'image',
  source: {
    type: 'base64',
    media_type: 'image/jpeg',
    data: base64ImageData
  }
}
```

## Integration and Usage

### Automatic Registration

Both providers are automatically registered when the AI module is imported:

```typescript
import { initializeAIProviders } from './main/ai'

// Auto-registers OpenAI and Claude providers
initializeAIProviders()
```

### Getting a Model Instance

```typescript
import { getModel } from './main/ai'

// Get OpenAI model
const openaiModel = await getModel({
  apiKey: 'sk-...',
  model: 'gpt-4o',
  temperature: 0.7
})

// Get Claude model
const claudeModel = await getModel({
  apiKey: 'claude-...',
  model: 'claude-3-sonnet',
  temperature: 0.7
})
```

### Chat Completion

```typescript
const response = await model.chat([
  { role: 'user', content: 'Hello, how are you?' }
])

console.log(response.content) // AI response text
console.log(response.usage)   // Token usage information
```

### Streaming Responses

```typescript
for await (const chunk of model.stream(messages)) {
  if (chunk.content) {
    process.stdout.write(chunk.content)
  }
  
  if (chunk.finished) {
    console.log('\nResponse complete!')
    if (chunk.usage) {
      console.log('Token usage:', chunk.usage)
    }
  }
}
```

### Multimodal Input

```typescript
const messages = [
  {
    role: 'user',
    content: [
      { type: 'text', text: 'What do you see in this image?' },
      { 
        type: 'image', 
        image: { 
          url: 'data:image/jpeg;base64,/9j/4AAQSkZJRgABAQAA...',
          mimeType: 'image/jpeg'
        }
      }
    ]
  }
]

const response = await model.chat(messages)
```

## Error Handling

Both implementations include comprehensive error handling:

### Network Errors

- Automatic retry with exponential backoff
- Rate limit detection and handling
- Service availability monitoring

### API Errors

- Authentication error detection
- Invalid request handling
- Model-specific error messages

### Usage Example

```typescript
try {
  const response = await model.chat(messages)
  return response
} catch (error) {
  if (error instanceof AIAPIError) {
    console.error(`API Error (${error.statusCode}): ${error.message}`)
  } else {
    console.error('Unexpected error:', error)
  }
}
```

## Performance Optimizations

### Model Caching

The AI manager includes intelligent caching:

- 30-minute TTL for model instances
- LRU eviction for cache size management
- Configuration-based cache keys

### Connection Management

- Singleton pattern for manager instance
- Connection pooling for HTTP requests
- Automatic cleanup of expired entries

## Testing

### Mock Provider

A comprehensive mock provider is included for testing:

```typescript
const mockProvider: AIProvider = {
  name: 'mock',
  displayName: 'Mock AI Provider',
  // ... implementation
}
```

### Integration Tests

The implementation includes integration tests in `test-integration.ts`:

- Provider registration testing
- Model creation and configuration
- Chat and streaming functionality
- Error handling scenarios

## Future Enhancements

### Planned Features

1. **Additional Providers**: Support for more AI providers
2. **Advanced Tool Calling**: Enhanced tool use capabilities
3. **Model Fine-tuning**: Support for custom model configurations
4. **Performance Monitoring**: Detailed metrics and analytics

### Extension Points

The architecture supports easy extension:

- New providers can be added by implementing `AIProvider`
- Custom models can extend `BaseAIModel`
- Additional capabilities can be added to the type system

## Conclusion

The OpenAI and Claude implementations provide a robust, scalable foundation for AI integration in the Knowlex application. Both implementations follow the established architectural patterns, provide comprehensive error handling, and support advanced features like streaming, multimodal input, and tool calling.

The unified interface ensures consistent behavior across different AI providers while allowing each implementation to leverage provider-specific capabilities. The automatic registration system makes the providers immediately available throughout the application without requiring additional configuration.