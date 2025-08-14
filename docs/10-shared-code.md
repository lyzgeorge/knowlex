# Shared Code Architecture

This document provides comprehensive documentation for the shared code layer in Knowlex Desktop. The shared code provides type definitions, constants, and utilities that are used by both the main and renderer processes, ensuring consistency and type safety across the application.

## Architecture Overview

The shared layer implements a **domain-driven design** with clear separation of concerns:

```
┌─────────────────────────────────────┐
│           Type Layer                │
│      types/ - Domain Models        │
│   Project, Conversation, Message    │
├─────────────────────────────────────┤
│        Constants Layer              │
│   constants/ - Configuration       │
│    App, File, AI Configurations    │
├─────────────────────────────────────┤
│        Utilities Layer              │
│    utils/ - Common Functions       │
│   ID Generation, Time, Validation   │
└─────────────────────────────────────┘
```

## Type System (`types/`)

The type system provides comprehensive domain models that ensure type safety across IPC communication and data persistence.

### Project Domain (`project.ts`)

**File:** `src/shared/types/project.ts`

**Core Project Interface:**
```typescript
interface Project {
  id: string
  name: string
  description: string
  settings?: ProjectSettings
  created_at: string
  updated_at: string
  stats?: ProjectStats
}

interface ProjectStats {
  conversationCount: number
  messageCount: number
  fileCount: number
  totalFileSize: number
}

interface ProjectSettings {
  defaultModel?: string
  maxFileSize?: number
  enableRAG?: boolean
  embeddingModel?: string
}
```

**Project File Management:**
```typescript
interface ProjectFile {
  id: string
  project_id: string
  filename: string
  original_path?: string
  content_hash: string
  size: number
  mime_type: string
  status: FileStatus
  error_message?: string
  chunk_count: number
  created_at: string
  updated_at: string
}

type FileStatus = 'pending' | 'processing' | 'ready' | 'failed'
```

**Project Memory System:**
```typescript
interface ProjectMemory {
  id: string
  project_id: string
  title: string
  content: string
  type: 'memory' | 'note' | 'insight'
  importance: number
  tags?: string[]
  created_at: string
  updated_at: string
}
```

### Conversation Domain (`conversation.ts`)

**File:** `src/shared/types/conversation.ts`

**Conversation Management:**
```typescript
interface Conversation {
  id: string
  project_id?: string
  title: string
  settings?: SessionSettings
  created_at: string
  updated_at: string
}

interface SessionSettings {
  model: string
  provider: string
  temperature?: number
  maxTokens?: number
  systemPrompt?: string
  enableRAG?: boolean
  topK?: number
}
```

**Model Configuration:**
```typescript
interface ModelConfig {
  provider: 'openai' | 'claude' | string
  model: string
  apiKey?: string
  baseUrl?: string
  temperature?: number
  maxTokens?: number
  topP?: number
  frequencyPenalty?: number
  presencePenalty?: number
}
```

### Message Domain (`message.ts`)

**File:** `src/shared/types/message.ts`

**Multi-Part Message System:**
```typescript
interface Message {
  id: string
  conversation_id: string
  role: 'user' | 'assistant'
  content: MessageContent
  parent_id?: string
  created_at: string
  updated_at: string
}

type MessageContent = MessageContentPart[]

interface MessageContentPart {
  type: ContentType
  text?: string
  image?: ImageContent
  citation?: CitationContent
  toolCall?: ToolCallContent
}

type ContentType = 'text' | 'image' | 'citation' | 'tool-call'
```

**Content Type Definitions:**
```typescript
interface ImageContent {
  url: string
  alt?: string
  mimeType: string
  size?: number
}

interface CitationContent {
  filename: string
  fileId: string
  content: string
  similarity: number
  pageNumber?: number
}

interface ToolCallContent {
  id: string
  name: string
  arguments: Record<string, unknown>
  result?: unknown
}
```

### File Domain (`file.ts`)

**File:** `src/shared/types/file.ts`

> ⚠️ **Critical Issue**: This file contains a duplicate `ProjectFile` interface that conflicts with the one in `project.ts`. This needs to be resolved.

**Temporary File Handling:**
```typescript
interface TemporaryFile {
  id: string
  filename: string
  content: string
  mimeType: string
  size: number
  uploadedAt: string
}

interface ProcessingResult {
  success: boolean
  chunkCount?: number
  error?: string
  processingTime?: number
}
```

**Search and Retrieval:**
```typescript
interface SearchResult {
  fileId: string
  filename: string
  content: string
  similarity: number
  pageNumber?: number
  chunkIndex: number
}

interface FileConstraints {
  maxSize: number
  maxCount: number
  allowedTypes: string[]
}
```

### IPC Communication (`ipc.ts`)

**File:** `src/shared/types/ipc.ts`

**Standardized IPC Result:**
```typescript
interface IPCResult<T = unknown> {
  success: boolean
  data?: T
  error?: string
  timestamp: string
}
```

**Request Type Examples:**
```typescript
interface CreateProjectRequest {
  name: string
  description: string
  settings?: ProjectSettings
}

interface SendMessageRequest {
  conversationId: string
  content: MessageContent
  parentId?: string
}

interface UploadFileRequest {
  projectId: string
  filename: string
  content: ArrayBuffer
  mimeType: string
}
```

### AI Integration (`ai.ts`)

**File:** `src/shared/types/ai.ts`

**Provider Interface:**
```typescript
interface AIModel {
  chat(
    messages: AIMessage[],
    options?: AIChatCompletionOptions
  ): Promise<AIChatCompletion>
  
  stream(
    messages: AIMessage[],
    options?: AIChatCompletionOptions
  ): Promise<AsyncIterable<AIStreamChunk>>
  
  getCapabilities(): ModelCapabilities
}
```

**Configuration Types:**
```typescript
interface OpenAIConfig {
  apiKey: string
  model: string
  baseUrl?: string
  organization?: string
}

interface ClaudeConfig {
  apiKey: string
  model: string
  baseUrl?: string
}
```

**Enhanced Model Information:**
```typescript
interface ModelInfo {
  id: string
  provider: string
  name: string
  description: string
  capabilities: ModelCapabilities
  contextLength: number
  costPer1kTokens: {
    input: number
    output: number
  }
  supportedFeatures: string[]
}

interface ModelCapabilities {
  supportsImages: boolean
  supportsToolCalls: boolean
  supportsStreaming: boolean
  maxContextLength: number
  reasoningSupport?: boolean
}
```

## Constants System (`constants/`)

### Application Constants (`app.ts`)

**File:** `src/shared/constants/app.ts`

**Application Metadata:**
```typescript
export const APP_NAME = 'Knowlex Desktop'
export const APP_VERSION = '0.1.0'
export const APP_DESCRIPTION = 'Intelligent workspace for researchers and developers'

export const WINDOW_CONFIG = {
  main: {
    width: 1200,
    height: 800,
    minWidth: 800,
    minHeight: 600
  },
  debug: {
    width: 1400,
    height: 900,
    minWidth: 1000,
    minHeight: 700
  }
} as const
```

**Database Configuration:**
```typescript
export const DATABASE_CONFIG = {
  filename: 'knowlex.db',
  migrations: {
    directory: './migrations',
    current: 3
  },
  backup: {
    enabled: true,
    maxBackups: 5
  }
} as const
```

### File Constants (`file.ts`)

**File:** `src/shared/constants/file.ts`

**File Constraints:**
```typescript
export const FILE_CONSTRAINTS = {
  temporary: {
    maxSize: 1024 * 1024, // 1MB
    maxCount: 10,
    allowedTypes: ['.txt', '.md']
  },
  project: {
    maxSize: 50 * 1024 * 1024, // 50MB
    maxCount: 1000,
    allowedTypes: [
      '.txt', '.md', '.pdf', '.docx',
      '.py', '.js', '.ts', '.tsx', '.jsx',
      '.html', '.css', '.json', '.xml',
      '.csv', '.xlsx', '.pptx'
    ]
  }
} as const
```

**MIME Type Mapping:**
```typescript
export const MIME_TYPES = {
  '.txt': 'text/plain',
  '.md': 'text/markdown',
  '.pdf': 'application/pdf',
  '.docx': 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
  '.py': 'text/x-python',
  '.js': 'application/javascript',
  '.ts': 'application/typescript',
  '.json': 'application/json'
} as const
```

**RAG Processing:**
```typescript
export const RAG_CONFIG = {
  chunkSize: 1000,
  chunkOverlap: 200,
  maxChunksPerFile: 1000,
  embeddingModel: 'text-embedding-3-small',
  similarityThreshold: 0.7,
  maxResults: 10
} as const
```

### AI Constants (`ai.ts`)

**File:** `src/shared/constants/ai.ts`

**Model Definitions:**
```typescript
export const OPENAI_MODELS: ModelInfo[] = [
  {
    id: 'gpt-4o',
    provider: 'openai',
    name: 'GPT-4o',
    description: 'Most advanced multimodal model',
    capabilities: {
      supportsImages: true,
      supportsToolCalls: true,
      supportsStreaming: true,
      maxContextLength: 128000
    },
    contextLength: 128000,
    costPer1kTokens: { input: 0.005, output: 0.015 },
    supportedFeatures: ['chat', 'vision', 'tools', 'streaming']
  },
  // ... other models
]

export const CLAUDE_MODELS: ModelInfo[] = [
  {
    id: 'claude-3-opus-20240229',
    provider: 'claude',
    name: 'Claude 3 Opus',
    description: 'Most powerful model for complex reasoning',
    capabilities: {
      supportsImages: true,
      supportsToolCalls: true,
      supportsStreaming: true,
      maxContextLength: 200000,
      reasoningSupport: true
    },
    contextLength: 200000,
    costPer1kTokens: { input: 0.015, output: 0.075 },
    supportedFeatures: ['chat', 'vision', 'tools', 'streaming', 'reasoning']
  }
  // ... other models
]
```

**Default Configuration:**
```typescript
export const DEFAULT_AI_CONFIG = {
  provider: 'openai' as const,
  model: 'gpt-4o',
  temperature: 0.7,
  maxTokens: 4096,
  topP: 1,
  frequencyPenalty: 0,
  presencePenalty: 0
}
```

## Utilities System (`utils/`)

### ID Generation (`id.ts`)

**File:** `src/shared/utils/id.ts`

**ID Generation Functions:**
```typescript
// 32-character hexadecimal ID for primary keys
export const generateId = (): string => {
  return Array.from({ length: 32 }, () => 
    Math.floor(Math.random() * 16).toString(16)
  ).join('')
}

// 12-character short ID for display purposes
export const generateShortId = (): string => {
  return Array.from({ length: 12 }, () => 
    Math.floor(Math.random() * 16).toString(16)
  ).join('')
}

// RFC 4122 UUID v4 implementation
export const generateUUID = (): string => {
  const template = 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'
  return template.replace(/[xy]/g, (c) => {
    const r = Math.random() * 16 | 0
    const v = c === 'x' ? r : (r & 0x3 | 0x8)
    return v.toString(16)
  })
}
```

> 💡 **Recommendation**: Consider using `crypto.randomUUID()` for UUID generation in Node.js 16+ environments.

### Time Utilities (`time.ts`)

**File:** `src/shared/utils/time.ts`

**Time Formatting:**
```typescript
// Relative time formatting ("2h ago", "just now")
export const formatRelativeTime = (timestamp: string): string => {
  const now = Date.now()
  const time = new Date(timestamp).getTime()
  const diff = now - time

  const MINUTE = 60 * 1000
  const HOUR = 60 * MINUTE
  const DAY = 24 * HOUR
  const WEEK = 7 * DAY

  if (diff < MINUTE) return 'Just now'
  if (diff < HOUR) return `${Math.floor(diff / MINUTE)}m ago`
  if (diff < DAY) return `${Math.floor(diff / HOUR)}h ago`
  if (diff < WEEK) return `${Math.floor(diff / DAY)}d ago`

  return new Date(timestamp).toLocaleDateString()
}

// Absolute time formatting
export const formatDateTime = (timestamp: string): string => {
  return new Date(timestamp).toLocaleString()
}

// ISO timestamp generation
export const getCurrentTimestamp = (): string => {
  return new Date().toISOString()
}
```

### Validation Utilities (`validation.ts`)

**File:** `src/shared/utils/validation.ts`

**File Validation:**
```typescript
// Context-aware file validation
export const validateFile = (
  file: File,
  context: 'temporary' | 'project'
): ValidationResult => {
  const constraints = FILE_CONSTRAINTS[context]
  const errors: string[] = []

  // Size validation
  if (file.size > constraints.maxSize) {
    const maxSizeMB = constraints.maxSize / (1024 * 1024)
    errors.push(`File size exceeds ${maxSizeMB}MB limit`)
  }

  // Type validation
  const extension = getFileExtension(file.name)
  if (!constraints.allowedTypes.includes(extension)) {
    errors.push(`File type ${extension} is not supported`)
  }

  return {
    valid: errors.length === 0,
    errors
  }
}

// Batch file validation with count limits
export const validateFiles = (
  files: File[],
  context: 'temporary' | 'project',
  existingCount: number = 0
): ValidationResult => {
  const constraints = FILE_CONSTRAINTS[context]
  const errors: string[] = []

  // Count validation
  if (files.length + existingCount > constraints.maxCount) {
    errors.push(`Cannot upload more than ${constraints.maxCount} files`)
  }

  // Individual file validation
  files.forEach((file, index) => {
    const result = validateFile(file, context)
    if (!result.valid) {
      errors.push(`File ${index + 1}: ${result.errors.join(', ')}`)
    }
  })

  return {
    valid: errors.length === 0,
    errors
  }
}
```

**General Validation:**
```typescript
// Email validation
export const isValidEmail = (email: string): boolean => {
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
  return emailRegex.test(email)
}

// URL validation
export const isValidUrl = (url: string): boolean => {
  try {
    new URL(url)
    return true
  } catch {
    return false
  }
}

// File name sanitization
export const sanitizeFileName = (filename: string): string => {
  return filename
    .replace(/[^a-zA-Z0-9.-]/g, '_')
    .replace(/_{2,}/g, '_')
    .replace(/^_|_$/g, '')
}
```

## Export Structure

### Organized Exports
Each category provides a clean index file for organized imports:

**Types Index (`types/index.ts`):**
```typescript
export * from './project'
export * from './conversation'
export * from './message'
export * from './file'
export * from './ai'
export * from './ipc'
```

**Constants Index (`constants/index.ts`):**
```typescript
export * from './app'
export * from './file'
export * from './ai'
```

**Utils Index (`utils/index.ts`):**
```typescript
export * from './id'
export * from './time'
export * from './validation'
```

## Critical Issues & Recommendations

### 🔴 Critical Issues (VERIFIED AGAINST CODEBASE)

1. **Duplicate ProjectFile Interface**: 
   - **CONFIRMED**: Defined in both `types/project.ts` and `types/file.ts`
   - Creates import conflicts and type confusion
   - **Resolution**: Remove duplicate from `file.ts`, use the `project.ts` version

2. **Missing Main Index**: 
   - **CONFIRMED**: No `/shared/index.ts` for unified imports
   - **Resolution**: Create main index file for cleaner imports

### 🟡 Minor Issues

3. **UUID Implementation**: 
   - Custom implementation instead of native `crypto.randomUUID()`
   - **Resolution**: Use Node.js native UUID when available

4. **Hard-coded Context Types**: 
   - 'temporary' | 'project' could be enum for better type safety
   - **Resolution**: Define `FileContext` enum

### 🟢 Missing but Recommended

5. **Standardized Error Types**: 
   - No common error interfaces for consistent error handling
   - **Recommendation**: Add error type definitions

6. **Pagination Types**: 
   - No pagination interfaces for list operations
   - **Recommendation**: Add pagination and filtering types

7. **Search Types**: 
   - Missing search filter and sorting types
   - **Recommendation**: Add search parameter interfaces

## Usage Patterns

### Cross-Process Type Safety
```typescript
// Main process using shared types
import { Project, CreateProjectRequest } from '@shared/types'

const createProject = async (request: CreateProjectRequest): Promise<Project> => {
  // Implementation uses shared types for consistency
}

// Renderer process using same types
import { Project } from '@shared/types'

const ProjectCard: React.FC<{ project: Project }> = ({ project }) => {
  // Component uses shared types
}
```

### IPC Communication
```typescript
// Standardized IPC results
import { IPCResult } from '@shared/types'

// Main process
const handleCreateProject = async (request: CreateProjectRequest): Promise<IPCResult<Project>> => {
  try {
    const project = await projectService.create(request)
    return { success: true, data: project, timestamp: new Date().toISOString() }
  } catch (error) {
    return { success: false, error: error.message, timestamp: new Date().toISOString() }
  }
}
```

### Validation Integration
```typescript
// File upload with shared validation
import { validateFiles, FILE_CONSTRAINTS } from '@shared/utils'

const handleFileUpload = (files: File[]) => {
  const result = validateFiles(files, 'project')
  if (!result.valid) {
    showError(result.errors.join('\n'))
    return
  }
  
  // Proceed with upload
}
```

## Security Considerations

### Type Safety
- **Runtime Validation**: All external inputs validated using shared utilities
- **Type Guards**: Proper type checking for IPC communication
- **Sanitization**: File names and content sanitized using shared functions

### Data Consistency
- **Shared Constraints**: File limits enforced consistently across processes
- **Validation Logic**: Same validation rules applied in main and renderer
- **Error Handling**: Consistent error formats using shared types

The shared code layer provides excellent type safety and consistency across the application, but needs attention to resolve the identified duplication issues and missing standardization opportunities.