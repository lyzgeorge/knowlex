# AI Integration System

This document describes the AI integration system built on the Vercel AI SDK, providing a unified interface for OpenAI and OpenAI-compatible providers.

## Overview

The AI system is centered around `src/main/services/ai-chat-vercel.ts`, which provides:

- **Unified Provider Interface**: Single API for OpenAI and compatible providers
- **Streaming Support**: Real-time response streaming with reasoning capabilities
- **Configuration Management**: Environment-based configuration with validation
- **Error Handling**: Enhanced error messages and retry logic
- **Content Processing**: Multi-modal content conversion and processing

## Architecture

### Provider Support

**OpenAI Official API:**
- Full OpenAI API compatibility
- Reasoning model support (o1, o1-mini)
- Streaming with reasoning phases
- Usage tracking and cost monitoring

**OpenAI-Compatible APIs:**
- Custom endpoints (SiliconFlow, Groq, etc.)
- Same interface as official OpenAI
- Automatic provider detection via baseURL
- Consistent streaming behavior

### Configuration System

Configuration is managed through environment variables:

```bash
# Required
OPENAI_API_KEY=sk-proj-...

# Optional
OPENAI_BASE_URL=https://api.siliconflow.cn/v1  # Custom endpoint
OPENAI_MODEL=gpt-4o                            # Default: gpt-4o
AI_TEMPERATURE=0.7                             # Default: 0.7
AI_MAX_TOKENS=4000                            # Default: 4000
AI_TOP_P=1                                    # Default: 1
AI_FREQUENCY_PENALTY=0                        # Default: 0
AI_PRESENCE_PENALTY=0                         # Default: 0
OPENAI_REASONING_EFFORT=medium                # For reasoning models
```

### Core Components

#### 1. Model Creation (`createOpenAIModel`)
```typescript
function createOpenAIModel(config: AIChatConfig) {
  if (config.baseURL && !config.baseURL.includes('api.openai.com')) {
    // OpenAI-compatible provider
    return createOpenAICompatible({
      name: 'custom-provider',
      apiKey: config.apiKey,
      baseURL: config.baseURL
    })
  } else {
    // Official OpenAI
    return openai({ apiKey: config.apiKey })
  }
}
```

#### 2. Message Conversion (`convertMessagesToAIFormat`)
Converts application messages to AI SDK format:
- **Simple text**: Direct string content
- **Multi-modal**: Combined text representation
- **File content**: Embedded with clear delimiters
- **Citations**: Included with context

#### 3. Streaming Interface
```typescript
interface StreamingCallbacks {
  onTextChunk: (chunk: string) => void
  onReasoningChunk?: (chunk: string) => void
  onReasoningStart?: () => void
  onReasoningEnd?: () => void
}
```

## Usage Examples

### Basic Response Generation
```typescript
import { generateAIResponse } from '../services/ai-chat-vercel'

const response = await generateAIResponse(conversationMessages)
console.log(response.content[0].text)
if (response.reasoning) {
  console.log('Reasoning:', response.reasoning)
}
```

### Streaming Response
```typescript
import { generateAIResponseWithStreaming } from '../services/ai-chat-vercel'

const response = await generateAIResponseWithStreaming(
  conversationMessages,
  {
    onTextChunk: (chunk) => console.log('Text:', chunk),
    onReasoningStart: () => console.log('Reasoning started'),
    onReasoningChunk: (chunk) => console.log('Reasoning:', chunk),
    onReasoningEnd: () => console.log('Reasoning completed')
  }
)
```

### Configuration Testing
```typescript
import { testAIConfiguration } from '../services/ai-chat-vercel'

const result = await testAIConfiguration({
  apiKey: 'sk-test-key',
  model: 'gpt-4o'
})

if (result.success) {
  console.log(`Connected to ${result.model}`)
} else {
  console.error('Test failed:', result.error)
}
```

## Content Processing

### Multi-Part Content Handling
The system processes various content types from the application's message format:

**Text Content:**
```typescript
{ type: 'text', text: 'User question' }
// → Direct text content
```

**File Content:**
```typescript
{ type: 'temporary-file', temporaryFile: {
  filename: 'document.txt',
  content: 'File contents...'
}}
// → "[File: document.txt]\nFile contents...\n[End of file]"
```

**Citation Content:**
```typescript
{ type: 'citation', citation: {
  filename: 'research.pdf',
  content: 'Relevant excerpt...'
}}
// → "[Citation: research.pdf]\nRelevant excerpt..."
```

### Image Content Support
Currently logs warnings for image content as full multimodal support is not implemented:
```typescript
{ type: 'image', image: { url: 'data:...', mimeType: 'image/png' }}
// → Warning logged, content skipped
```

## Error Handling

### Enhanced Error Messages
The system provides user-friendly error messages:

```typescript
function enhanceError(error: unknown): Error {
  const message = error.message.toLowerCase()
  
  if (message.includes('api key')) {
    return new Error('Invalid OpenAI API key. Please check your configuration.')
  }
  if (message.includes('rate limit')) {
    return new Error('OpenAI rate limit exceeded. Please try again later.')
  }
  if (message.includes('network')) {
    return new Error('Network error. Please check your internet connection.')
  }
  // ... more specific error handling
}
```

### Configuration Validation
```typescript
export function validateAIConfiguration(config?: AIChatConfig): {
  isValid: boolean
  error?: string
} {
  if (!config.apiKey?.trim()) {
    return { isValid: false, error: 'Missing OpenAI API key' }
  }
  if (!config.model?.trim()) {
    return { isValid: false, error: 'No model specified' }
  }
  return { isValid: true }
}
```

## Streaming Implementation

### Full Stream Support
The system uses AI SDK's `fullStream` for comprehensive streaming:

```typescript
for await (const part of result.fullStream) {
  switch (part.type) {
    case 'text-delta':
      callbacks.onTextChunk(part.text)
      break
    case 'reasoning-start':
      callbacks.onReasoningStart?.()
      break
    case 'reasoning-delta':
      callbacks.onReasoningChunk?.(part.text)
      break
    case 'reasoning-end':
      callbacks.onReasoningEnd?.()
      break
  }
}
```

### Fallback Strategy
If `fullStream` fails, falls back to basic `textStream`:
```typescript
catch (error) {
  // Fallback to textStream
  for await (const chunk of result.textStream) {
    callbacks.onTextChunk(chunk)
  }
}
```

## Integration Points

### Message Service Integration
The AI service integrates with the message service through IPC handlers:

```typescript
// src/main/ipc/conversation.ts
import { generateAIResponseWithStreaming } from '../services/ai-chat-vercel'

ipcMain.handle('message:send', async (event, data) => {
  // Process user message, then generate AI response
  await generateAIResponseWithStreaming(messages, streamingCallbacks)
})
```

### Event-Driven Updates
Streaming updates are sent to the renderer via IPC events:
- `message:streaming_start`
- `message:streaming_chunk`
- `message:reasoning_start`
- `message:reasoning_chunk`
- `message:reasoning_end`
- `message:streaming_end`

## Performance Considerations

### Connection Reuse
Model instances are created per request but the underlying HTTP connections are reused by the AI SDK.

### Memory Management
Streaming responses are processed incrementally to avoid memory buildup with large responses.

### Cancellation Support
Streaming can be cancelled via `CancellationToken`:
```typescript
const cancellationToken = createCancellationToken()
await generateAIResponseWithStreaming(messages, callbacks, cancellationToken)

// Cancel if needed
cancellationToken.cancel()
```

## Future Enhancements

### Planned Features
- **Full Image Support**: Complete multimodal content processing
- **Tool Calling**: Function calling integration
- **Claude Support**: Anthropic Claude provider integration
- **Embedding Models**: Document vectorization support
- **Cost Tracking**: Token usage monitoring and billing

### Extension Points
The current architecture supports easy addition of:
- New AI providers
- Additional content types
- Custom streaming processors
- Enhanced error recovery strategies