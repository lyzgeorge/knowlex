# IPC Communication Framework Documentation

## Overview

The Knowlex desktop application uses a secure Inter-Process Communication (IPC) framework to facilitate communication between the main process (backend) and renderer process (frontend). This framework provides type-safe, validated, and error-handled communication with support for both request-response and streaming data patterns.

## Architecture

### Three-Layer Architecture

1. **Main Process Layer** (`src/main/services/ipc.service.ts`)
   - IPC service with router and middleware support
   - Request validation and error handling
   - Handler registration and management

2. **Preload Layer** (`src/preload/index.ts`)
   - Security bridge between main and renderer processes
   - API exposure through `contextBridge`
   - Type-safe method wrappers

3. **Renderer Layer** (`src/renderer/src/lib/ipc-client.ts`, `src/renderer/src/hooks/useIPC.ts`)
   - Client-side IPC wrapper
   - React hooks for easy integration
   - Stream and event handling utilities

## Core Interfaces

### Request/Response Pattern

```typescript
// Request structure
interface IPCRequest<T = any> {
  id: string          // Unique request identifier
  channel: string     // IPC channel name
  data: T            // Request payload
  timestamp: number   // Request timestamp
  version?: string   // Optional version info
}

// Response structure
interface IPCResponse<T = any> {
  id: string          // Matching request ID
  success: boolean    // Operation success flag
  data?: T           // Response payload
  error?: IPCError   // Error information if failed
  timestamp: number   // Response timestamp
  version?: string   // Optional version info
}

// Error structure
interface IPCError {
  code: string       // Error code
  message: string    // Human-readable message
  details?: any      // Additional error details
  stack?: string     // Stack trace (development only)
}
```

### Streaming Data Pattern

```typescript
interface IPCStreamData<T = any> {
  id: string                                    // Stream identifier
  channel: string                               // Stream channel
  type: 'start' | 'data' | 'end' | 'error'     // Stream event type
  data?: T                                      // Stream payload
  error?: IPCError                              // Error information
  timestamp: number                             // Event timestamp
}
```

## Channel Definitions

All IPC channels are defined in `src/shared/index.ts`:

### System Channels
- `system:ping` - Health check
- `system:app-info` - Application information

### Database Channels
- `database:health-check` - Database connection status
- `database:stats` - Database statistics
- `database:insert-vector` - Insert vector data
- `database:search-vectors` - Vector similarity search
- `database:delete-vector` - Delete vector data

### Project Channels
- `project:create` - Create new project
- `project:list` - List all projects
- `project:get` - Get project details
- `project:update` - Update project
- `project:delete` - Delete project
- `project:stats` - Get project statistics

### Conversation Channels
- `conversation:create` - Create conversation
- `conversation:list` - List conversations
- `conversation:get` - Get conversation
- `conversation:update` - Update conversation
- `conversation:delete` - Delete conversation
- `conversation:move` - Move conversation between projects

### And more... (See shared-types for complete list)

## Security Features

### Context Isolation
- Preload script runs in isolated context
- No direct access to Node.js APIs from renderer
- Safe API exposure through `contextBridge`

### Request Validation
- Automatic request structure validation
- Timestamp verification (prevents replay attacks)
- Channel name validation
- Custom data validation per handler

### Error Handling
- Comprehensive error classification
- Safe error serialization
- Stack trace sanitization in production

## Usage Examples

### Basic IPC Request (Renderer)

```typescript
import { ipcClient } from '@renderer/lib/ipc-client'

// Using the client directly
const result = await ipcClient.invoke('system:ping')

// Using React hooks
import { useIPC } from '@renderer/hooks/useIPC'

function MyComponent() {
  const { invoke } = useIPC()
  
  const handlePing = async () => {
    try {
      const response = await invoke('system:ping')
      console.log('Ping response:', response)
    } catch (error) {
      console.error('Ping failed:', error)
    }
  }
  
  return <button onClick={handlePing}>Ping</button>
}
```

### Handler Registration (Main Process)

```typescript
import { IPCService } from '@main/services/ipc.service'

const ipcService = IPCService.getInstance()

// Register a simple handler
ipcService.handle('my-channel', {
  handle: async (data) => {
    // Process the request
    return { result: 'success' }
  },
  validate: (data) => {
    // Optional validation
    return typeof data.required === 'string'
  }
})

// Register a streaming handler
ipcService.handleStream('my-stream', {
  handle: async (data, emit, complete, error) => {
    try {
      // Emit data chunks
      emit({ chunk: 1 })
      emit({ chunk: 2 })
      
      // Signal completion
      complete()
    } catch (err) {
      error({ code: 'STREAM_ERROR', message: err.message })
    }
  }
})
```

### Streaming Data (Renderer)

```typescript
import { createStreamListener } from '@renderer/lib/ipc-client'

// Create stream listener
const streamListener = createStreamListener('my-stream', {
  onStart: () => console.log('Stream started'),
  onData: (data) => console.log('Stream data:', data),
  onEnd: () => console.log('Stream ended'),
  onError: (error) => console.error('Stream error:', error)
})

// Start listening
streamListener.start()

// Stop listening
streamListener.stop()
```

### React Hook for Streaming

```typescript
import { useIPCStream } from '@renderer/hooks/useIPC'

function StreamingComponent() {
  const [chunks, setChunks] = useState([])
  
  const { start, stop, isActive, error } = useIPCStream('my-stream', {
    onData: (data) => {
      setChunks(prev => [...prev, data])
    },
    onError: (err) => {
      console.error('Stream error:', err)
    }
  })
  
  return (
    <div>
      <button onClick={start} disabled={isActive}>
        Start Stream
      </button>
      <button onClick={stop} disabled={!isActive}>
        Stop Stream
      </button>
      {error && <div>Error: {error.message}</div>}
      <div>Chunks: {chunks.length}</div>
    </div>
  )
}
```

## Middleware System

The IPC framework supports middleware for cross-cutting concerns:

```typescript
// Logging middleware
const loggingMiddleware: IPCMiddleware = {
  before: (request) => {
    console.log(`IPC Request: ${request.channel}`, request.data)
    return request
  },
  after: (response) => {
    console.log(`IPC Response: ${response.id}`, response.success)
    return response
  },
  error: (error, request) => {
    console.error(`IPC Error in ${request.channel}:`, error)
    return {
      id: request.id,
      success: false,
      error: { code: 'MIDDLEWARE_ERROR', message: error.message },
      timestamp: Date.now()
    }
  }
}

// Register middleware
ipcService.use(loggingMiddleware)
```

## Error Codes

Standardized error codes for consistent error handling:

- `UNKNOWN_ERROR` - Unexpected error
- `INVALID_REQUEST` - Malformed request
- `INVALID_CHANNEL` - Unknown channel
- `INVALID_DATA` - Invalid request data
- `TIMEOUT` - Request timeout
- `DB_CONNECTION_ERROR` - Database connection failed
- `FILE_NOT_FOUND` - File not found
- `LLM_API_ERROR` - LLM API error
- `PERMISSION_DENIED` - Access denied

## Performance Considerations

### Request Validation
- Validation can be disabled for performance-critical paths
- Custom validation logic should be optimized
- Consider caching validation results for repeated patterns

### Streaming Data
- Implement backpressure handling for high-volume streams
- Use appropriate buffer sizes
- Clean up stream listeners to prevent memory leaks

### Memory Management
- IPC responses are automatically cleaned up
- Stream listeners should be properly disposed
- Avoid large data transfers through IPC when possible

## Best Practices

### Channel Naming
- Use consistent naming patterns: `module:action`
- Keep channel names descriptive but concise
- Group related channels by module prefix

### Error Handling
- Always handle errors in async operations
- Provide meaningful error messages
- Use appropriate error codes
- Log errors for debugging

### Data Validation
- Validate all input data
- Use TypeScript interfaces for type safety
- Implement runtime validation for critical data

### Stream Management
- Always clean up stream listeners
- Handle stream errors gracefully
- Implement timeout mechanisms for long-running streams

### Security
- Never expose sensitive data through IPC
- Validate all inputs from renderer process
- Use context isolation in preload scripts
- Sanitize error messages in production

## Debugging

### Development Tools
- Enable detailed logging with `enableLogging: true`
- Use browser DevTools for renderer-side debugging
- Check main process logs for backend issues

### Common Issues
- **IPC not ready**: Ensure preload script is loaded
- **Handler not found**: Check channel name spelling
- **Validation errors**: Verify data structure matches interface
- **Stream not working**: Ensure proper cleanup and error handling

### Debug Logging
```typescript
// Enable debug mode
const ipcService = IPCService.getInstance()
ipcService.use({
  before: (request) => {
    console.debug('IPC Request:', request)
    return request
  },
  after: (response) => {
    console.debug('IPC Response:', response)
    return response
  }
})
```

## Migration Guide

When updating IPC interfaces:

1. **Add new channels** to shared-types
2. **Implement handlers** in main process
3. **Update preload script** API exposure
4. **Update client methods** in renderer
5. **Test all affected components**
6. **Update documentation**

## Mock Services Integration

The IPC framework includes comprehensive mock services for development and testing, providing realistic data simulation without external dependencies.

> **✅ Implementation Status**: Mock services are fully implemented and operational in development mode. All 50+ IPC channels are automatically mocked with realistic data generation, and the Mock Manager provides runtime control through the Debug App interface.

### Mock Service Architecture

The mock system consists of four main components:

1. **MockService** - Core data generation and scenario management
2. **OpenAIMockService** - OpenAI API simulation with streaming support
3. **IPCMockService** - Automatic IPC handler registration for all channels
4. **MockManagerService** - Centralized control and configuration

### Automatic Mock Handler Registration

In development mode, mock handlers are automatically registered for all IPC channels:

```typescript
// Mock handlers are automatically registered for all channels
// No manual setup required in development mode

// Example: Database operations are mocked
const stats = await ipcClient.invoke('database:stats')
// Returns realistic mock database statistics

// Example: LLM operations are mocked  
const response = await ipcClient.invoke('llm:chat', {
  messages: [{ role: 'user', content: 'Hello' }],
  model: 'gpt-3.5-turbo'
})
// Returns realistic mock chat completion
```

### Mock Data Scenarios

Multiple predefined scenarios for different testing needs:

```typescript
// Available scenarios
- 'default'  // Medium-sized realistic dataset
- 'empty'    // Clean slate for new user testing
- 'large'    // Performance testing with large datasets  
- 'error'    // Error condition testing

// Switch scenarios at runtime
await ipcClient.invoke('mock:switch-scenario', { scenarioId: 'large' })
```

### Mock Configuration

Configure mock behavior through the Mock Manager:

```typescript
// Get current mock status
const status = await ipcClient.invoke('mock:status')

// Run health check
const health = await ipcClient.invoke('mock:health')

// Execute mock commands
await ipcClient.invoke('mock:execute-command', {
  command: 'simulate-error',
  args: ['DB_CONNECTION_ERROR']
})
```

### Streaming Mock Support

Mock services support streaming operations with realistic timing:

```typescript
// Mock file processing with progress updates
const streamListener = createStreamListener('file:upload', {
  onData: (progress) => {
    console.log(`Processing: ${progress.progress}%`)
  },
  onEnd: () => {
    console.log('File processing complete')
  }
})

// Mock LLM streaming responses
const chatStream = createStreamListener('llm:stream', {
  onData: (chunk) => {
    console.log('Token:', chunk.content)
  }
})
```

### Mock Error Simulation

Configurable error simulation for testing error handling:

```typescript
// Configure error rates
await ipcClient.invoke('mock:execute-command', {
  command: 'update-config',
  args: [{
    globalErrorRate: 0.1, // 10% error rate
    delays: {
      short: 100,
      medium: 500, 
      long: 2000
    }
  }]
})

// Simulate specific errors
const error = await ipcClient.invoke('mock:simulate-error', {
  errorType: 'LLM_API_ERROR'
})
```

### Development Mode Integration

Mock services automatically activate in development:

```typescript
// In development mode:
// - All IPC handlers are automatically mocked
// - Real services are bypassed
// - Realistic data is generated on-demand
// - No external API keys or services required
// - Mock Manager control channels are available for runtime management

// Check if mocks are active
const mockStatus = await ipcClient.invoke('mock:status')
if (mockStatus.enabled) {
  console.log('Running with mock services')
  console.log('Current scenario:', mockStatus.currentScenario)
  console.log('Registered handlers:', mockStatus.services.ipc.handlersCount)
}
```

### Mock Service Channels

Additional IPC channels for mock management (available in development mode):

- `mock:status` - Get mock system status and statistics
- `mock:health` - Run comprehensive health check on all mock services
- `mock:switch-scenario` - Change active data scenario for testing
- `mock:list-scenarios` - Get available mock data scenarios
- `mock:execute-command` - Execute mock management commands

### Debug Interface Integration

The Mock services integrate with the Debug App interface:

```typescript
// Access mock controls through the Debug App
// Navigate to: Debug App → Mock Services tab

// Available operations:
// - View mock service status and statistics
// - Switch between data scenarios
// - Run health checks
// - Simulate errors for testing
// - Monitor real-time mock performance
```

## Testing

### Unit Tests
- Test individual handlers with mock data
- Validate error handling paths
- Test middleware functionality

### Integration Tests
- Test full IPC communication flow
- Verify streaming data handling
- Test error propagation

### Mock Service Testing
- Test scenario switching and data consistency
- Verify mock data generation and relationships
- Test error simulation and recovery
- Validate streaming mock behavior

### Example Test
```typescript
import { IPCService } from '@main/services/ipc.service'

describe('IPC Service', () => {
  it('should handle ping request', async () => {
    const ipcService = IPCService.getInstance()
    const mockContext = {
      request: {
        id: 'test-123',
        channel: 'system:ping',
        data: null,
        timestamp: Date.now()
      },
      sender: mockSender,
      timestamp: Date.now()
    }
    
    const response = await ipcService.getRouter().handleRequest(mockContext)
    expect(response.success).toBe(true)
    expect(response.data).toBe('pong')
  })

  it('should handle mock scenario switching', async () => {
    // Switch to empty scenario
    const result = await ipcClient.invoke('mock:switch-scenario', { 
      scenarioId: 'empty' 
    })
    expect(result).toBe(true)

    // Verify scenario change
    const status = await ipcClient.invoke('mock:status')
    expect(status.currentScenario).toBe('empty')
  })
})
```

This IPC communication framework provides a robust, secure, and type-safe foundation for all communication between the Electron main and renderer processes in the Knowlex application.