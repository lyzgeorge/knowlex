# IPC Communication System

This document provides comprehensive documentation for the Inter-Process Communication (IPC) system in Knowlex Desktop. The IPC system enables secure, type-safe communication between the main process and renderer process using Electron's IPC mechanisms.

## Architecture Overview

The IPC system implements a **three-layer communication architecture**:

```
┌─────────────────────────────────────┐
│       Renderer Process             │
│   React Components & Stores        │
│    window.electronAPI.*            │
├─────────────────────────────────────┤
│       Preload Bridge               │
│   contextBridge.exposeInMainWorld   │
│    Type-safe API Exposure          │
├─────────────────────────────────────┤
│        Main Process                │
│   IPC Handlers & Services          │
│    ipcMain.handle() Endpoints      │
└─────────────────────────────────────┘
```

## Security Model

### Context Isolation
- **Complete Process Separation**: Main and renderer processes are fully isolated
- **No Node.js in Renderer**: Renderer process has no direct Node.js access
- **Secure Bridge**: All APIs exposed through `contextBridge` in preload script
- **Validated Communication**: All IPC calls validated and type-checked

### Type Safety
- **Shared Types**: Common type definitions ensure consistency
- **Runtime Validation**: All inputs validated using type guards
- **Standardized Responses**: Consistent `IPCResult<T>` wrapper for all responses
- **Error Handling**: Comprehensive error handling with user-friendly messages

## Preload Bridge (`src/preload/index.ts`)

**File:** `src/preload/index.ts`

The preload script creates a secure bridge between processes using Electron's `contextBridge`:

```typescript
import { contextBridge, ipcRenderer } from 'electron'
import { IPCResult } from '@shared/types'

// Exposed API interface
interface ElectronAPI {
  // System information
  platform: string
  version: string
  
  // Project management
  project: {
    create: (data: CreateProjectRequest) => Promise<IPCResult<Project>>
    get: (id: string) => Promise<IPCResult<Project>>
    list: () => Promise<IPCResult<Project[]>>
    update: (id: string, data: Partial<Project>) => Promise<IPCResult<Project>>
    delete: (id: string) => Promise<IPCResult<void>>
    getStats: (id: string) => Promise<IPCResult<ProjectStats>>
    duplicate: (id: string, newName: string) => Promise<IPCResult<Project>>
  }
  
  // Conversation management
  conversation: {
    create: (data: CreateConversationRequest) => Promise<IPCResult<Conversation>>
    list: (projectId?: string) => Promise<IPCResult<Conversation[]>>
    get: (id: string) => Promise<IPCResult<ConversationWithMessages>>
    update: (id: string, data: Partial<Conversation>) => Promise<IPCResult<Conversation>>
    delete: (id: string) => Promise<IPCResult<void>>
    sendMessage: (data: SendMessageRequest) => Promise<IPCResult<MessageResponse>>
    fork: (id: string, fromMessageId?: string) => Promise<IPCResult<Conversation>>
    move: (id: string, projectId: string) => Promise<IPCResult<void>>
  }
  
  // Event listeners
  on: (channel: string, callback: (...args: any[]) => void) => void
  off: (channel: string, callback: (...args: any[]) => void) => void
}

// Secure API exposure
contextBridge.exposeInMainWorld('electronAPI', {
  platform: process.platform,
  version: process.versions.electron,
  
  project: {
    create: (data) => ipcRenderer.invoke('project:create', data),
    get: (id) => ipcRenderer.invoke('project:get', id),
    list: () => ipcRenderer.invoke('project:list'),
    update: (id, data) => ipcRenderer.invoke('project:update', id, data),
    delete: (id) => ipcRenderer.invoke('project:delete', id),
    getStats: (id) => ipcRenderer.invoke('project:stats', id),
    duplicate: (id, newName) => ipcRenderer.invoke('project:duplicate', id, newName)
  },
  
  conversation: {
    create: (data) => ipcRenderer.invoke('conversation:create', data),
    list: (projectId) => ipcRenderer.invoke('conversation:list', projectId),
    get: (id) => ipcRenderer.invoke('conversation:get', id),
    update: (id, data) => ipcRenderer.invoke('conversation:update', id, data),
    delete: (id) => ipcRenderer.invoke('conversation:delete', id),
    sendMessage: (data) => ipcRenderer.invoke('conversation:send-message', data),
    fork: (id, fromMessageId) => ipcRenderer.invoke('conversation:fork', id, fromMessageId),
    move: (id, projectId) => ipcRenderer.invoke('conversation:move', id, projectId)
  },
  
  // Event system
  on: (channel, callback) => {
    ipcRenderer.on(channel, (event, ...args) => callback(...args))
  },
  off: (channel, callback) => {
    ipcRenderer.removeListener(channel, callback)
  }
})
```

## Main Process IPC Handlers

### Project IPC Handler (`src/main/ipc/project.ts`)

**File:** `src/main/ipc/project.ts`

**Channel Registration:**
```typescript
import { ipcMain } from 'electron'
import { projectService } from '../services/project'
import { validateCreateProjectRequest, validateUpdateProjectRequest } from '../utils/validation'

// IPC handler registration
export const registerProjectIPC = () => {
  // Create project
  ipcMain.handle('project:create', async (event, data) => {
    try {
      if (!validateCreateProjectRequest(data)) {
        return {
          success: false,
          error: 'Invalid project data',
          timestamp: new Date().toISOString()
        }
      }
      
      const project = await projectService.createProject(data)
      
      // Broadcast creation event
      event.sender.send('project:created', project)
      
      return {
        success: true,
        data: project,
        timestamp: new Date().toISOString()
      }
    } catch (error) {
      console.error('Failed to create project:', error)
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error',
        timestamp: new Date().toISOString()
      }
    }
  })
  
  // Get project by ID
  ipcMain.handle('project:get', async (event, id: string) => {
    try {
      if (typeof id !== 'string' || !id.trim()) {
        return {
          success: false,
          error: 'Invalid project ID',
          timestamp: new Date().toISOString()
        }
      }
      
      const project = await projectService.getProject(id)
      
      if (!project) {
        return {
          success: false,
          error: 'Project not found',
          timestamp: new Date().toISOString()
        }
      }
      
      return {
        success: true,
        data: project,
        timestamp: new Date().toISOString()
      }
    } catch (error) {
      console.error('Failed to get project:', error)
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error',
        timestamp: new Date().toISOString()
      }
    }
  })
  
  // List all projects
  ipcMain.handle('project:list', async (event) => {
    try {
      const projects = await projectService.listProjects()
      return {
        success: true,
        data: projects,
        timestamp: new Date().toISOString()
      }
    } catch (error) {
      console.error('Failed to list projects:', error)
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error',
        timestamp: new Date().toISOString()
      }
    }
  })
  
  // Update project
  ipcMain.handle('project:update', async (event, id: string, data: Partial<Project>) => {
    try {
      if (!validateUpdateProjectRequest(data)) {
        return {
          success: false,
          error: 'Invalid update data',
          timestamp: new Date().toISOString()
        }
      }
      
      const project = await projectService.updateProject(id, data)
      
      // Broadcast update event
      event.sender.send('project:updated', project)
      
      return {
        success: true,
        data: project,
        timestamp: new Date().toISOString()
      }
    } catch (error) {
      console.error('Failed to update project:', error)
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error',
        timestamp: new Date().toISOString()
      }
    }
  })
  
  // Delete project
  ipcMain.handle('project:delete', async (event, id: string) => {
    try {
      await projectService.deleteProject(id)
      
      // Broadcast deletion event
      event.sender.send('project:deleted', id)
      
      return {
        success: true,
        timestamp: new Date().toISOString()
      }
    } catch (error) {
      console.error('Failed to delete project:', error)
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error',
        timestamp: new Date().toISOString()
      }
    }
  })
  
  // Get project statistics
  ipcMain.handle('project:stats', async (event, id: string) => {
    try {
      const stats = await projectService.getProjectStatistics(id)
      return {
        success: true,
        data: stats,
        timestamp: new Date().toISOString()
      }
    } catch (error) {
      console.error('Failed to get project stats:', error)
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error',
        timestamp: new Date().toISOString()
      }
    }
  })
  
  // Duplicate project
  ipcMain.handle('project:duplicate', async (event, id: string, newName: string) => {
    try {
      const project = await projectService.duplicateProject(id, newName)
      
      // Broadcast creation event
      event.sender.send('project:created', project)
      
      return {
        success: true,
        data: project,
        timestamp: new Date().toISOString()
      }
    } catch (error) {
      console.error('Failed to duplicate project:', error)
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error',
        timestamp: new Date().toISOString()
      }
    }
  })
}
```

### Conversation IPC Handler (`src/main/ipc/conversation.ts`)

**File:** `src/main/ipc/conversation.ts`

**Advanced Message Handling:**
```typescript
// Send message and get AI response
ipcMain.handle('conversation:send-message', async (event, data: SendMessageRequest) => {
  try {
    const { conversationId, content, parentId } = data
    
    // Validate request
    if (!validateSendMessageRequest(data)) {
      return {
        success: false,
        error: 'Invalid message data',
        timestamp: new Date().toISOString()
      }
    }
    
    // Create user message
    const userMessage = await messageService.addMessage({
      conversation_id: conversationId,
      role: 'user',
      content,
      parent_id: parentId
    })
    
    // Broadcast user message
    event.sender.send('message:created', userMessage)
    
    // Get conversation context
    const conversation = await conversationService.getConversation(conversationId)
    const messages = await messageService.getMessages(conversationId)
    
    // Generate AI response
    const aiResponse = await aiChatService.processMessage(messages, conversation.settings)
    
    // Create AI message
    const aiMessage = await messageService.addMessage({
      conversation_id: conversationId,
      role: 'assistant',
      content: aiResponse.content,
      parent_id: userMessage.id
    })
    
    // Broadcast AI message
    event.sender.send('message:created', aiMessage)
    
    // Generate conversation title if needed
    if (messages.length === 1) {
      try {
        const title = await conversationService.generateTitle(conversationId)
        const updatedConversation = await conversationService.updateConversation(conversationId, { title })
        event.sender.send('conversation:updated', updatedConversation)
      } catch (error) {
        console.warn('Failed to generate conversation title:', error)
      }
    }
    
    return {
      success: true,
      data: {
        userMessage,
        aiMessage,
        conversation: conversation
      },
      timestamp: new Date().toISOString()
    }
    
  } catch (error) {
    console.error('Failed to send message:', error)
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error',
      timestamp: new Date().toISOString()
    }
  }
})

// Fork conversation from a specific message
ipcMain.handle('conversation:fork', async (event, conversationId: string, fromMessageId?: string) => {
  try {
    const forkedConversation = await conversationService.forkConversation(conversationId, fromMessageId)
    
    // Broadcast creation event
    event.sender.send('conversation:created', forkedConversation)
    
    return {
      success: true,
      data: forkedConversation,
      timestamp: new Date().toISOString()
    }
  } catch (error) {
    console.error('Failed to fork conversation:', error)
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error',
      timestamp: new Date().toISOString()
    }
  }
})
```

## Event System

### Real-time Updates
The IPC system supports real-time updates through Electron's event system:

**Event Broadcasting (Main Process):**
```typescript
// Project events
event.sender.send('project:created', project)
event.sender.send('project:updated', project)
event.sender.send('project:deleted', projectId)

// Conversation events
event.sender.send('conversation:created', conversation)
event.sender.send('conversation:updated', conversation)
event.sender.send('conversation:deleted', conversationId)

// Message events
event.sender.send('message:created', message)
event.sender.send('message:updated', message)
event.sender.send('message:deleted', messageId)

// AI streaming events
event.sender.send('message:streaming', { conversationId, chunk })
event.sender.send('message:stream-complete', { conversationId, messageId })
```

**Event Listening (Renderer Process):**
```typescript
// Store integration with IPC events
useEffect(() => {
  const handleProjectCreated = (project: Project) => {
    setProjects(prev => [...prev, project])
  }
  
  const handleProjectUpdated = (project: Project) => {
    setProjects(prev => prev.map(p => p.id === project.id ? project : p))
  }
  
  const handleProjectDeleted = (projectId: string) => {
    setProjects(prev => prev.filter(p => p.id !== projectId))
  }
  
  // Register event listeners
  window.electronAPI.on('project:created', handleProjectCreated)
  window.electronAPI.on('project:updated', handleProjectUpdated)
  window.electronAPI.on('project:deleted', handleProjectDeleted)
  
  // Cleanup on unmount
  return () => {
    window.electronAPI.off('project:created', handleProjectCreated)
    window.electronAPI.off('project:updated', handleProjectUpdated)
    window.electronAPI.off('project:deleted', handleProjectDeleted)
  }
}, [])
```

## Streaming Support

### AI Response Streaming
The system supports real-time streaming of AI responses:

**Streaming Implementation:**
```typescript
// Streaming message handler
ipcMain.handle('conversation:send-message-stream', async (event, data: SendMessageRequest) => {
  try {
    const { conversationId, content } = data
    
    // Create user message
    const userMessage = await messageService.addMessage({
      conversation_id: conversationId,
      role: 'user',
      content
    })
    
    event.sender.send('message:created', userMessage)
    
    // Start streaming AI response
    const streamingMessageId = generateId()
    let streamingContent = ''
    
    // Create placeholder AI message
    event.sender.send('message:streaming-start', {
      id: streamingMessageId,
      conversationId,
      role: 'assistant',
      content: []
    })
    
    // Stream AI response
    const stream = await aiChatService.streamMessage(messages, settings)
    
    for await (const chunk of stream) {
      streamingContent += chunk.content
      
      // Send streaming update
      event.sender.send('message:streaming-chunk', {
        id: streamingMessageId,
        chunk: chunk.content,
        fullContent: streamingContent
      })
    }
    
    // Save complete AI message
    const aiMessage = await messageService.addMessage({
      conversation_id: conversationId,
      role: 'assistant',
      content: [{ type: 'text', text: streamingContent }],
      parent_id: userMessage.id
    })
    
    // Complete streaming
    event.sender.send('message:streaming-complete', {
      streamingId: streamingMessageId,
      finalMessage: aiMessage
    })
    
    return {
      success: true,
      data: { userMessage, aiMessage },
      timestamp: new Date().toISOString()
    }
    
  } catch (error) {
    event.sender.send('message:streaming-error', {
      id: streamingMessageId,
      error: error.message
    })
    
    return {
      success: false,
      error: error.message,
      timestamp: new Date().toISOString()
    }
  }
})
```

## Validation System

### Input Validation
All IPC requests are validated using type guards:

```typescript
// Type guard functions
export const validateCreateProjectRequest = (data: unknown): data is CreateProjectRequest => {
  return typeof data === 'object' &&
         data !== null &&
         typeof (data as any).name === 'string' &&
         (data as any).name.trim().length > 0 &&
         typeof (data as any).description === 'string'
}

export const validateSendMessageRequest = (data: unknown): data is SendMessageRequest => {
  return typeof data === 'object' &&
         data !== null &&
         typeof (data as any).conversationId === 'string' &&
         Array.isArray((data as any).content) &&
         (data as any).content.length > 0
}

// Usage in IPC handlers
ipcMain.handle('project:create', async (event, data) => {
  if (!validateCreateProjectRequest(data)) {
    return {
      success: false,
      error: 'Invalid project data',
      timestamp: new Date().toISOString()
    }
  }
  
  // Proceed with validated data
})
```

## Error Handling

### Standardized Error Responses
All IPC operations return standardized `IPCResult<T>` responses:

```typescript
interface IPCResult<T = unknown> {
  success: boolean
  data?: T
  error?: string
  timestamp: string
}

// Success response
return {
  success: true,
  data: result,
  timestamp: new Date().toISOString()
}

// Error response
return {
  success: false,
  error: 'User-friendly error message',
  timestamp: new Date().toISOString()
}
```

### Error Categories
```typescript
// Validation errors
'Invalid input data'
'Missing required fields'
'Invalid file format'

// Business logic errors
'Project not found'
'Conversation already exists'
'File size exceeds limit'

// System errors
'Database connection failed'
'AI service unavailable'
'Network timeout'
```

## Performance Considerations

### Batch Operations
For performance-critical operations, the system supports batch processing:

```typescript
// Batch message operations
ipcMain.handle('message:batch-create', async (event, messages: MessageCreate[]) => {
  try {
    const results = await Promise.all(
      messages.map(msg => messageService.addMessage(msg))
    )
    
    // Batch event broadcast
    event.sender.send('messages:batch-created', results)
    
    return {
      success: true,
      data: results,
      timestamp: new Date().toISOString()
    }
  } catch (error) {
    return {
      success: false,
      error: error.message,
      timestamp: new Date().toISOString()
    }
  }
})
```

### Caching Strategy
```typescript
// Response caching for expensive operations
const responseCache = new Map<string, { data: any, timestamp: number }>()

ipcMain.handle('project:stats', async (event, id: string) => {
  const cacheKey = `stats:${id}`
  const cached = responseCache.get(cacheKey)
  
  // Return cached result if recent
  if (cached && Date.now() - cached.timestamp < 60000) {
    return {
      success: true,
      data: cached.data,
      timestamp: new Date().toISOString()
    }
  }
  
  // Compute and cache result
  const stats = await projectService.getProjectStatistics(id)
  responseCache.set(cacheKey, { data: stats, timestamp: Date.now() })
  
  return {
    success: true,
    data: stats,
    timestamp: new Date().toISOString()
  }
})
```

## Security Best Practices

### Input Sanitization
```typescript
// Sanitize file paths
const sanitizePath = (path: string): string => {
  return path.replace(/\.\./g, '').replace(/[<>:"|?*]/g, '_')
}

// Sanitize user content
const sanitizeContent = (content: string): string => {
  return content
    .replace(/<script\b[^<]*(?:(?!<\/script>)<[^<]*)*<\/script>/gi, '')
    .trim()
}
```

### Rate Limiting
```typescript
// Simple rate limiting for API calls
const rateLimiter = new Map<string, { count: number, resetTime: number }>()

const checkRateLimit = (clientId: string, maxRequests: number, windowMs: number): boolean => {
  const now = Date.now()
  const limit = rateLimiter.get(clientId)
  
  if (!limit || now > limit.resetTime) {
    rateLimiter.set(clientId, { count: 1, resetTime: now + windowMs })
    return true
  }
  
  if (limit.count >= maxRequests) {
    return false
  }
  
  limit.count++
  return true
}
```

## Future Enhancements

### Planned Features
1. **File Upload Progress**: Progress tracking for large file uploads
2. **Offline Queue**: Queue operations when offline, sync when online
3. **Request Caching**: Intelligent caching for read operations
4. **Compression**: Request/response compression for large data
5. **Authentication**: User authentication and session management

### Architecture Improvements
1. **Request Middleware**: Plugin system for request preprocessing
2. **Response Transformation**: Automatic response formatting
3. **Monitoring**: Request/response logging and analytics
4. **Load Balancing**: Multiple AI provider load balancing

The IPC communication system provides a robust, secure, and type-safe foundation for communication between the main and renderer processes. It implements modern patterns with comprehensive error handling, validation, and real-time event support.