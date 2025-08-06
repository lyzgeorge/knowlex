# @knowlex/types

Shared TypeScript types for the Knowlex desktop application.

## Overview

This package provides centralized type definitions for:

- IPC communication between main and renderer processes
- Database schema definitions
- API interface types
- Common utility types

## Features

- **Type Safety**: Comprehensive TypeScript definitions for all data structures
- **Versioning**: IPC channels include semantic versioning for backward compatibility
- **Consistency**: Shared types ensure consistency across main and renderer processes
- **Documentation**: Well-documented interfaces with JSDoc comments

## Usage

```typescript
import { 
  IPC_CHANNELS, 
  SendMessageRequest, 
  Project, 
  AppSettings 
} from '@knowlex/types'

// Use in IPC communication
const response = await ipcRenderer.invoke(
  IPC_CHANNELS.CHAT_SEND_MESSAGE, 
  request as SendMessageRequest
)
```

## Type Categories

### IPC Types
- Channel definitions with versioning
- Request/response interfaces
- Stream control types

### Database Types
- Entity schemas
- Relationship definitions
- Query interfaces

### API Types
- External service interfaces
- Configuration types
- Response formats

### Common Types
- Utility types
- Shared enums
- Base interfaces

## Versioning

IPC channels use semantic versioning to ensure backward compatibility:

```typescript
// Channel with version
CHAT_SEND_MESSAGE: 'chat:send-message@v1.0.0'
```

## Development

```bash
# Build types
pnpm run build

# Watch mode
pnpm run dev
```