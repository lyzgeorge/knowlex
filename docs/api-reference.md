# Knowlex Desktop API Reference

## Overview

This document describes the API interfaces for the Knowlex Desktop application, including IPC communication, shared type definitions, and core services.

## IPC Communication

Communication between the renderer (frontend) and main (backend) processes is handled via a secure IPC framework.

### Renderer Process API

The preload script exposes a global `window.knowlexAPI` object. For ease of use in the React application, this is wrapped into a singleton `ipcClient` and convenient React hooks (`useIPC`, `useIPCStream`).

#### `ipcClient`

The `ipcClient` provides a clean, promise-based interface.

**Example: Basic IPC Call**
```typescript
import { ipcClient } from '@/lib/ipc-client';

// Invoke a method on the main process
const appInfo = await ipcClient.invoke('system:app-info');
console.log(appInfo);

// Using the namespaced helpers
const health = await ipcClient.database.healthCheck();
console.log(health);
```

#### `useIPC` Hook

The `useIPC` hook provides access to the `invoke` function within React components.

**Example: React Hook Usage**
```typescript
import { useIPC } from '@/hooks/useIPC';

function MyComponent() {
  const { invoke } = useIPC();

  const checkDbHealth = async () => {
    const healthStatus = await invoke('database:health-check');
    console.log(healthStatus);
  };

  return <button onClick={checkDbHealth}>Check DB Health</button>;
}
```

#### Streaming

For continuous data streams, you can use the `useIPCStream` hook or the underlying `createStreamListener`.

**Example: Stream Hook Usage**
```typescript
import { useIPCStream } from '@/hooks/useIPC';

function LogStreamer() {
  const [logs, setLogs] = useState<string[]>([]);

  useIPCStream('stream:log-channel', {
    onData: (logEntry) => {
      setLogs(prev => [...prev, logEntry]);
    },
    onEnd: () => console.log('Log stream ended.'),
    onError: (err) => console.error('Stream error:', err),
  });

  // ...
}
```

## Shared Type Definitions

These types are shared between the main and renderer processes, located in `packages/shared-types`.

### IPC Communication Types

#### `IPCRequest<T>`
```typescript
interface IPCRequest<T = any> {
  id: string;        // Unique request identifier
  channel: string;   // IPC channel name
  data: T;           // Request payload
  timestamp: number; // Request timestamp
  version?: string;  // API version (optional)
}
```

#### `IPCResponse<T>`
```typescript
interface IPCResponse<T = any> {
  id: string;         // Corresponds to the request ID
  success: boolean;   // True if the operation succeeded
  data?: T;          // Response payload (on success)
  error?: IPCError;  // Error details (on failure)
  timestamp: number;  // Response timestamp
  version?: string;   // API version (optional)
}
```

#### `IPCError`
```typescript
interface IPCError {
  code: string;    // Error code (e.g., 'DB_QUERY_ERROR')
  message: string; // Human-readable error message
  details?: any;   // Additional error details (optional)
  stack?: string;  // Stack trace (in development mode)
}
```

### Database Entity Types

#### `Project`
```typescript
interface Project {
  id: string;
  name: string;
  description?: string;
  created_at: string;
  updated_at: string;
}
```

#### `Conversation`
```typescript
interface Conversation {
  id: string;
  project_id?: string;
  title: string;
  created_at: string;
  updated_at: string;
}
```

#### `Message`
```typescript
interface Message {
  id: string;
  conversation_id: string;
  role: 'user' | 'assistant';
  content: string;
  files?: string[]; // From metadata
  created_at: string;
}
```

#### `ProjectFile`
```typescript
interface ProjectFile {
  id: string;
  project_id: string;
  filename: string;
  filepath: string;
  file_size: number;
  file_hash: string;
  status: 'processing' | 'completed' | 'failed';
  created_at: string;
  updated_at: string;
}
```

#### `TextChunk`
```typescript
interface TextChunk {
  id: string;
  file_id: string;
  content: string;
  chunk_index: number;
  embedding?: number[]; // Stored as JSON in the database
  metadata?: Record<string, any>;
  created_at: string;
}
```

### Business Logic Types

#### `OpenAIConfig`
```typescript
interface OpenAIConfig {
  apiKey: string;
  baseURL?: string;
  model: string;
  embeddingModel: string;
  timeout?: number;
  maxRetries?: number;
}
```

#### `ChatMessage`
```typescript
interface ChatMessage {
  role: 'user' | 'assistant' | 'system';
  content: string;
  files?: FileInfo[];
  metadata?: Record<string, any>;
}
```

#### `FileInfo`
```typescript
interface FileInfo {
  name: string;
  content: string;
  size: number;
  type?: string;
  lastModified?: number;
}
```

#### `RAGResult`
```typescript
interface RAGResult {
  content: string;
  filename: string;
  score: number;
  chunk_index: number;
  fileId: string;
  projectId: string;
}
```

## Core Services

### `DatabaseService`
A singleton service in the main process that manages the application's `libsql` database. It handles:
- Connection management and configuration (WAL mode).
- Schema creation and version-based migrations.
- CRUD operations for all entities.
- Transaction support.
- Vector data operations (insertion, similarity search via in-memory calculation).
- Health checks and statistics.

### `IPCService`
A singleton service in the main process that manages all IPC communication. It provides:
- A router to register handlers for specific IPC channels.
- Middleware support for logging, authentication, etc.
- Secure handling of request/response and streaming patterns.
- Centralized error handling and validation.

## Error Handling

The IPC framework uses a standardized `IPCError` object for failures.

### Common Error Codes
A comprehensive list of error codes is defined in `packages/shared-types/src/index.ts` under `IPC_ERROR_CODES`. Key categories include:
- **`UNKNOWN_ERROR`**: A generic, unexpected error.
- **`INVALID_REQUEST`**: Malformed request (e.g., missing ID).
- **`INVALID_CHANNEL`**: No handler for the requested channel.
- **`INVALID_DATA`**: The request payload failed validation.
- **`DB_*`**: Database-related errors (e.g., `DB_CONNECTION_ERROR`, `DB_QUERY_ERROR`).
- **`FILE_*`**: File system errors (e.g., `FILE_NOT_FOUND`).
- **`LLM_*`**: Large Language Model API errors (e.g., `LLM_API_ERROR`).
- **`PERMISSION_DENIED`**: The action was not permitted.

### Error Handling Example
```typescript
import { useIPC } from '@/hooks/useIPC';
import type { IPCError } from '@shared';

function Component() {
  const { invoke } = useIPC();

  const doSomething = async () => {
    try {
      const result = await invoke('some:action');
      // ... handle success
    } catch (e) {
      const error = e as IPCError;
      console.error(`Operation failed with code ${error.code}: ${error.message}`);
      // ... show user-friendly message
    }
  };
}
```

## Version Information

- **API Version**: 1.0.0
- **Last Updated**: 2025-08-10
- **Compatibility**: Electron 28+
