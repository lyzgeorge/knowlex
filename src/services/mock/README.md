# Mock Services

This directory contains comprehensive mock implementations for all external services used by the Knowlex desktop application. The mock services provide realistic data and behavior for development, testing, and demonstration purposes.

## Overview

The mock services system consists of:

- **IPC Mock Service**: Simulates Electron IPC communication
- **OpenAI Mock Service**: Simulates OpenAI API responses including streaming
- **Database Mock Service**: Simulates SQLite database operations
- **Mock Data Manager**: Coordinates all mock services and scenarios
- **Development Mode Manager**: Automatically switches between mock and real services

## Features

### 🎭 Multiple Test Scenarios
- **Default**: Sample data for normal development
- **Empty**: No data for testing edge cases
- **Large Dataset**: Performance testing with lots of data
- **Error Prone**: High error rates for error handling testing
- **Slow Response**: Delayed responses for timeout testing

### 🔄 Automatic Switching
- Detects development vs production environment
- Seamlessly switches between mock and real services
- Hot-reload configuration changes
- Keyboard shortcuts for quick scenario switching

### 📊 Realistic Data Generation
- Type-safe mock data based on `@knowlex/types`
- Contextual AI responses based on user input
- Consistent embeddings for same input text
- Proper pagination and search results

### 🧪 Testing Support
- Comprehensive test coverage
- Validation utilities
- Error simulation capabilities
- Performance testing scenarios

## Quick Start

### Basic Usage

```typescript
import { initializeMockServices, switchMockScenario } from '@/services/mock'

// Initialize with default scenario
initializeMockServices()

// Switch to empty scenario for testing
switchMockScenario('empty')

// Switch to large dataset for performance testing
switchMockScenario('large-dataset')
```

### Development Mode

```typescript
import { enableDevMode, isDevModeEnabled } from '@/services/mock'

// Enable mock services in development
if (process.env.NODE_ENV === 'development') {
  await enableDevMode({
    defaultScenario: 'default',
    services: {
      ipc: true,
      openai: true,
      database: true
    },
    debugMode: true
  })
}

// Check if dev mode is active
if (isDevModeEnabled()) {
  console.log('Running with mock services')
}
```

### Testing Environment

```typescript
import { createTestEnvironment, validateMockEnvironment } from '@/services/mock'

// Set up test environment
createTestEnvironment('empty', {
  errorRate: 0, // No errors during tests
  responseDelay: 10 // Fast responses
})

// Validate mock services are working
const isValid = await validateMockEnvironment()
expect(isValid).toBe(true)
```

## Service Details

### IPC Mock Service

Simulates all Electron IPC channels defined in `@knowlex/types`:

```typescript
import { ipcMockService, IPC_CHANNELS } from '@/services/mock'

// Mock IPC calls
const projects = await ipcMockService.invoke(IPC_CHANNELS.PROJECT_LIST, undefined)
const newProject = await ipcMockService.invoke(IPC_CHANNELS.PROJECT_CREATE, {
  name: 'Test Project',
  description: 'A test project'
})
```

**Features:**
- All IPC channels supported
- Realistic response delays
- Proper error handling
- Streaming response simulation

### OpenAI Mock Service

Simulates OpenAI API with realistic responses:

```typescript
import { openaiMockService } from '@/services/mock'

// Chat completion
const response = await openaiMockService.createChatCompletion({
  messages: [{ role: 'user', content: 'Hello!' }],
  model: 'gpt-4'
})

// Streaming chat
await openaiMockService.createChatCompletionStream(
  request,
  (chunk) => console.log(chunk),
  () => console.log('Complete'),
  (error) => console.error(error)
)

// Embeddings
const embeddings = await openaiMockService.createEmbedding({
  input: 'Text to embed',
  model: 'text-embedding-ada-002'
})
```

**Features:**
- Contextual responses based on input
- Streaming support with realistic timing
- Consistent embeddings for same input
- Configurable error rates and delays
- Token usage estimation

### Database Mock Service

Simulates SQLite database operations:

```typescript
import { databaseMockService } from '@/services/mock'

// Execute queries
const result = await databaseMockService.query(
  'SELECT * FROM projects WHERE id = ?',
  [1]
)

// Transactions
const results = await databaseMockService.transaction([
  { sql: 'INSERT INTO projects (name) VALUES (?)', params: ['Test'] },
  { sql: 'SELECT last_insert_rowid()' }
])
```

**Features:**
- SQL query parsing and response generation
- Transaction support
- Realistic database statistics
- Backup/restore simulation
- Schema information

## Scenarios

### Default Scenario
- 2 sample projects
- Multiple conversations and messages
- Sample files and knowledge base entries
- Realistic settings configuration

### Empty Scenario
- No data in any tables
- Useful for testing empty states
- New user experience testing

### Large Dataset Scenario
- 50+ projects with conversations
- Hundreds of messages
- Performance testing data
- Pagination testing

### Error Prone Scenario
- High error rates (20-50%)
- Network timeout simulation
- Database connection issues
- API rate limiting

## Configuration

### Environment Variables

```bash
# Enable mock services
MOCK_SERVICES_ENABLED=true

# Default scenario
MOCK_DEFAULT_SCENARIO=default

# Debug mode
MOCK_DEBUG_MODE=true
```

### Runtime Configuration

```typescript
import { mockDataManager } from '@/services/mock'

// Switch scenario with config
mockDataManager.switchScenario('default', {
  openaiConfig: {
    model: 'gpt-3.5-turbo',
    responseDelay: 100,
    errorRate: 0.05
  },
  enableLogging: true
})
```

## Debug Mode

When debug mode is enabled, global debug functions are available:

```javascript
// Available in browser console
window.mockDebug.switchScenario('empty')
window.mockDebug.getStats()
window.mockDebug.getScenarios()
window.mockDebug.resetServices()
window.mockDebug.validateServices()
window.mockDebug.exportData()
window.mockDebug.toggleMocks()
```

### Keyboard Shortcuts

- `Ctrl+Shift+Alt+1`: Switch to default scenario
- `Ctrl+Shift+Alt+2`: Switch to empty scenario  
- `Ctrl+Shift+Alt+3`: Switch to large dataset scenario
- `Ctrl+Shift+Alt+0`: Toggle mock services on/off

## Testing

Run the mock service tests:

```bash
# Run all mock service tests
npm test src/services/mock

# Run specific test file
npm test src/services/mock/__tests__/ipc.mock.test.ts

# Run with coverage
npm test src/services/mock --coverage
```

## Best Practices

### Development
1. Use `default` scenario for normal development
2. Switch to `empty` scenario to test empty states
3. Use `large-dataset` for performance testing
4. Enable debug mode for troubleshooting

### Testing
1. Always validate mock environment before tests
2. Use `empty` scenario for unit tests
3. Reset services between test suites
4. Mock specific error conditions as needed

### Production
1. Mock services are automatically disabled in production
2. Environment detection prevents accidental mock usage
3. Configuration is ignored in production builds

## Troubleshooting

### Mock Services Not Working
1. Check if development mode is detected
2. Verify configuration is correct
3. Use `validateMockEnvironment()` to check services
4. Check browser console for error messages

### Inconsistent Data
1. Reset services with `mockDataManager.reset()`
2. Switch to known good scenario
3. Clear localStorage if using persistent config

### Performance Issues
1. Reduce response delays in configuration
2. Use smaller datasets for development
3. Disable logging in performance tests

## Contributing

When adding new mock functionality:

1. Update the corresponding mock service
2. Add comprehensive tests
3. Update type definitions in `@knowlex/types`
4. Document new scenarios or features
5. Ensure backward compatibility

## Architecture

```
src/services/mock/
├── index.ts              # Main exports
├── ipc.mock.ts          # IPC communication mocking
├── openai.mock.ts       # OpenAI API mocking
├── database.mock.ts     # Database operation mocking
├── manager.ts           # Central coordination
├── dev-mode.ts          # Development mode automation
├── __tests__/           # Test files
└── README.md            # This file
```

The mock services integrate with:
- `@knowlex/types` for type safety
- Electron IPC system
- OpenAI API interfaces
- SQLite database schema
- Application configuration system