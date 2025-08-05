# IPC Communication Framework

This directory contains the IPC (Inter-Process Communication) framework for the Knowlex desktop application. The framework provides secure, validated, and efficient communication between the main Electron process and renderer processes.

## Architecture

### Core Components

1. **IPCManager** (`ipc.manager.ts`) - Central manager for all IPC communication
2. **BaseIPCHandler** (`base.handler.ts`) - Base class for all IPC handlers
3. **Validation utilities** (`../utils/validation.ts`) - Message validation and sanitization
4. **Type definitions** (`../types/ipc.types.ts`) - Shared type definitions

### Features

- **Message Validation**: All IPC messages are validated for structure and content
- **Error Handling**: Comprehensive error handling with detailed error responses
- **Rate Limiting**: Built-in rate limiting to prevent abuse
- **Streaming Support**: Support for streaming large data with flow control
- **Security**: Input sanitization and channel validation
- **Type Safety**: Full TypeScript support with shared type definitions

## Usage

### Registering Handlers

```typescript
import { ipcManager } from './ipc.manager'
import { IPC_CHANNELS } from '../types/ipc.types'

// Register a handler for a specific channel
ipcManager.registerHandler(IPC_CHANNELS.CHAT_SEND_MESSAGE, async (message, event) => {
  // Handle the message
  return {
    id: message.id,
    success: true,
    data: { result: 'Message processed' },
    timestamp: Date.now(),
  }
})
```

### Creating Custom Handlers

```typescript
import { BaseIPCHandler } from './base.handler'
import { IPCMessage, IPCResponse } from '../types/ipc.types'

export class MyHandler extends BaseIPCHandler {
  protected handlerName = 'MyHandler'

  async handleMyRequest(message: IPCMessage, event: IpcMainEvent): Promise<IPCResponse> {
    return this.handleWithErrorCatch(message, async (data) => {
      // Validate required fields
      this.validateRequired(data, ['requiredField'])
      
      // Process the request
      const result = await this.processRequest(data)
      
      return result
    })
  }
}
```

### Renderer Side Usage

```typescript
import { ipcService, ipcAPI } from '../services/ipc.service'
import { IPC_CHANNELS } from '../types/ipc.types'

// Simple request
const result = await ipcAPI.getSettings()

// Custom request
const response = await ipcService.request(IPC_CHANNELS.CUSTOM_CHANNEL, {
  data: 'example'
})

// Streaming request
const controller = ipcService.startStream(
  IPC_CHANNELS.CHAT_STREAM_RESPONSE,
  { message: 'Hello' },
  (chunk) => console.log('Received:', chunk.data),
  (error) => console.error('Stream error:', error),
  () => console.log('Stream ended')
)
```

## Stream Control

The framework supports streaming data with built-in flow control:

- **Chunk Size**: Configurable chunk size for data transmission
- **Throttling**: Configurable delay between chunks to prevent overwhelming
- **Buffer Management**: Automatic buffer management with size limits
- **Pause/Resume**: Support for pausing and resuming streams
- **Error Handling**: Comprehensive error handling for stream operations

### Stream Configuration

```typescript
const stream = ipcManager.startStream(sessionId, webContents, {
  chunkSize: 1024,      // 1KB chunks
  throttleMs: 10,       // 10ms delay between chunks
  maxBufferSize: 1024 * 1024, // 1MB max buffer
})
```

## Security Features

### Input Validation

All incoming messages are validated for:
- Required fields presence
- Data type correctness
- Value range validation
- Security constraints

### Data Sanitization

Sensitive data is automatically sanitized in logs:
- API keys are redacted
- Passwords are redacted
- Tokens are redacted
- Custom sensitive fields can be configured

### Rate Limiting

Built-in rate limiting prevents abuse:
- Configurable request limits per client
- Time window-based limiting
- Automatic cleanup of old entries

### Channel Validation

Only registered channels are allowed:
- Whitelist-based channel validation
- Prevention of unauthorized channel access
- Type-safe channel definitions

## Error Handling

The framework provides comprehensive error handling:

### Error Types

- **Validation Errors**: Invalid input data
- **Handler Errors**: Errors in handler execution
- **Network Errors**: Communication failures
- **Timeout Errors**: Request timeouts
- **Rate Limit Errors**: Too many requests

### Error Response Format

```typescript
{
  id: string,
  success: false,
  error: {
    code: string,
    message: string,
    details?: any
  },
  timestamp: number
}
```

## Testing

The framework includes comprehensive tests:

```bash
npm test -- --testPathPattern=ipc.test.ts
```

Test coverage includes:
- Message validation
- Error handling
- Rate limiting
- Stream management
- Handler registration
- Data sanitization

## Development Tools

### IPC Test Component

In development mode, the application includes an IPC test component that allows testing all framework features:

- Echo tests
- Ping/pong tests
- Error handling tests
- Validation tests
- Streaming tests

### Logging

The framework provides detailed logging:
- Request/response logging
- Error logging
- Performance metrics
- Security events

## Best Practices

1. **Always validate input data** using the provided validation utilities
2. **Use type-safe channels** from the IPC_CHANNELS constant
3. **Handle errors gracefully** with appropriate user feedback
4. **Sanitize sensitive data** before logging
5. **Use streaming for large data** to prevent blocking
6. **Implement proper cleanup** for resources and listeners
7. **Test all handlers thoroughly** with various input scenarios

## Channel Naming Convention

Channels follow a consistent naming pattern:
- `category:action` (e.g., `chat:send-message`)
- Use kebab-case for multi-word actions
- Group related channels by category
- Keep names descriptive but concise

## Performance Considerations

- **Streaming**: Use streaming for large data transfers
- **Throttling**: Configure appropriate throttling for streams
- **Rate Limiting**: Set reasonable rate limits
- **Buffer Management**: Monitor buffer usage for streams
- **Cleanup**: Always clean up resources and listeners
- **Validation**: Balance validation thoroughness with performance

## Future Enhancements

Planned improvements:
- Message compression for large payloads
- Message encryption for sensitive data
- Advanced rate limiting with different tiers
- Metrics collection and monitoring
- Automatic retry mechanisms
- Circuit breaker pattern for resilience