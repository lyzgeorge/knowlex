# API Reference

This document provides comprehensive technical documentation for all services, interfaces, and APIs in Knowlex Desktop.

## Core Types & Interfaces

### Project Domain

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

### Conversation Domain

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

### Message Domain

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
  temporaryFile?: TemporaryFileContent
}

type ContentType = 'text' | 'image' | 'citation' | 'tool-call' | 'temporary-file'

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

interface TemporaryFileContent {
  filename: string
  content: string
  mimeType: string
  size: number
}
```

### IPC Types

```typescript
interface IPCResult<T = unknown> {
  success: boolean
  data?: T
  error?: string
  timestamp: string
}

interface CreateProjectRequest {
  name: string
  description?: string
  settings?: ProjectSettings
}

interface SendMessageRequest {
  conversationId: string
  content: MessageContent
  parentId?: string
}
```

## Project Management Service

**File:** `src/main/services/project.ts`

### Core Functions

#### `createProject(data: ProjectCreate): Promise<Project>`
Creates a new project with validation for unique names.

**Parameters:**
- `data.name: string` - Project name (required, must be unique)
- `data.description?: string` - Project description (optional)
- `data.settings?: ProjectSettings` - Project configuration (optional)

**Returns:** Complete project object with generated ID and timestamps

**Validation:**
- Project name must be non-empty and unique
- Name is trimmed and validated for invalid characters
- Duplicate names throw `Error: 'Project with this name already exists'`

```typescript
const project = await projectService.createProject({
  name: 'AI Research Project',
  description: 'Exploring transformer architectures',
  settings: {
    defaultModel: 'gpt-4o',
    enableRAG: true
  }
})
```

#### `getProject(id: string): Promise<Project | null>`
Retrieves a project by ID with optional statistics.

#### `listProjects(): Promise<Project[]>`
Returns all projects with aggregated statistics.

**Statistics Included:**
- `conversationCount: number` - Total conversations in project
- `messageCount: number` - Total messages across all conversations
- `fileCount: number` - Number of uploaded files
- `totalFileSize: number` - Combined size of all files in bytes

#### `updateProject(id: string, data: Partial<Project>): Promise<Project>`
Updates project properties with validation.

#### `deleteProject(id: string): Promise<void>`
Permanently deletes a project and all associated data.

**Cascade Behavior:**
- Deletes all conversations in the project
- Deletes all messages in those conversations
- Deletes all project files and chunks
- Deletes all project memories and notes

#### `getProjectStatistics(id: string): Promise<ProjectStats>`
Retrieves detailed project usage statistics.

#### `duplicateProject(id: string, newName: string): Promise<Project>`
Creates a complete copy of a project with all settings.

## Conversation Management Service

**File:** `src/main/services/conversation.ts`

### Core Functions

#### `createConversation(data: ConversationCreate): Promise<Conversation>`
Creates a new conversation with optional project association.

**Default Settings:**
```typescript
const defaultSettings: SessionSettings = {
  model: 'gpt-4o',
  provider: 'openai',
  temperature: 0.7,
  maxTokens: 4000,
  enableRAG: true
}
```

#### `generateTitle(conversationId: string): Promise<string>`
Generates an AI-powered title based on conversation content.

**Logic:**
1. Retrieves first few messages from conversation
2. Uses AI service to generate concise, descriptive title
3. Falls back to generic title if AI generation fails
4. Updates conversation with generated title

#### `moveToProject(conversationId: string, projectId: string | null): Promise<void>`
Moves a conversation between projects or to unclassified.

#### `forkConversation(conversationId: string, fromMessageId?: string): Promise<Conversation>`
Creates a new conversation branching from a specific message.

## Message Management Service

**File:** `src/main/services/message.ts`

### Core Functions

#### `addMessage(data: MessageCreate): Promise<Message>`
Creates a message with multi-part content validation.

**Validation:**
- Content array must not be empty
- Each content part must have valid type and corresponding data
- Image content validated for supported formats
- Text content sanitized for security

#### `createTextMessage(conversationId: string, role: MessageRole, text: string): Promise<Message>`
Convenience method for simple text messages.

#### `createImageMessage(conversationId: string, text: string, images: ImageContent[]): Promise<Message>`
Creates a message with text and image content.

#### `extractTextContent(message: Message): string`
Extracts all text content from a multi-part message.

**Returns:** Combined text from all text parts, plus text descriptions of other content types

## AI Chat Service (Vercel AI SDK)

**File:** `src/main/services/ai-chat-vercel.ts`

### Core Functions

#### `generateAIResponse(conversationMessages: Message[]): Promise<{content: MessageContent; reasoning?: string}>`
Generates a complete AI response for a conversation.

**Process:**
1. Validates AI configuration from environment
2. Converts internal message format to AI SDK format
3. Calls AI provider with configured parameters
4. Returns response with optional reasoning text

#### `generateAIResponseWithStreaming(messages, callbacks, cancellationToken?)`
Generates AI response with real-time streaming support.

**Parameters:**
- `conversationMessages: Message[]` - Conversation history
- `callbacks: StreamingCallbacks` - Event handlers for streaming
- `cancellationToken?: CancellationToken` - Optional cancellation support

**Streaming Events:**
```typescript
interface StreamingCallbacks {
  onTextChunk: (chunk: string) => void
  onReasoningChunk?: (chunk: string) => void
  onReasoningStart?: () => void
  onReasoningEnd?: () => void
}
```

#### `testAIConfiguration(config?: AIChatConfig): Promise<{success: boolean; error?: string; model?: string}>`
Tests AI provider configuration with a simple API call.

### Configuration

```typescript
interface AIChatConfig {
  apiKey: string
  baseURL?: string                    // Custom endpoint URL
  model: string                       // Model identifier
  temperature?: number                // 0.0 to 2.0
  maxTokens?: number                 // Maximum response tokens
  topP?: number                      // Nucleus sampling
  frequencyPenalty?: number          // Repetition penalty
  presencePenalty?: number           // Topic diversity
  reasoningEffort?: 'low'|'medium'|'high'  // For reasoning models
}
```

**Environment Variables:**
```bash
OPENAI_API_KEY=sk-...              # Required
OPENAI_BASE_URL=https://...        # Optional, for custom endpoints
OPENAI_MODEL=gpt-4o               # Default model
AI_TEMPERATURE=0.7                # Response creativity
AI_MAX_TOKENS=4000               # Maximum response length
OPENAI_REASONING_EFFORT=medium   # For reasoning models
```

### Supported Content Types

The service converts multi-part message content to AI-compatible format:

- **Text Content**: Direct text passages
- **Temporary Files**: Embedded file content with headers
- **Citations**: Referenced content from project files
- **Image Content**: Base64-encoded images (warning logged - not fully supported)

## File Processing Services

### Temporary File Service

**File:** `src/main/services/file-temp.ts`

#### `processTemporaryFiles(filePaths: string[]): Promise<TemporaryFileResult[]>`
Processes an array of temporary files and extracts their text content.

**File Constraints:**
- **Maximum Files**: 10
- **File Size**: 1MB per file
- **Supported Types**: `.txt`, `.md`
- **Total Size Limit**: 10MB

#### `extractTextContent(filePath: string, filename: string): Promise<string>`
Extracts text content from a single file.

#### `validateTemporaryFileConstraints(files): ValidationResult`
Validates files against temporary file constraints.

### Project File Service (Not Implemented)

**File:** `src/main/services/file-project.ts` - ❌ Missing

**Planned Functions:**
- `uploadProjectFiles(projectId: string, files: File[]): Promise<ProjectFile[]>`
- `processFileForRAG(fileId: string): Promise<ProcessingResult>`
- `deleteProjectFile(fileId: string): Promise<void>`
- `retryFileProcessing(fileId: string): Promise<void>`

## Settings Management Service

**File:** `src/main/services/settings.ts`

### Core Functions

#### `get(key: string): Promise<string | null>`
Retrieves a setting value by key.

#### `set(key: string, value: string): Promise<void>`
Sets a setting value with validation.

#### `delete(key: string): Promise<void>`
Removes a setting.

#### `getAll(): Promise<Record<string, string>>`
Retrieves all settings as key-value pairs.

#### `validateSettings(settings: Partial<AppSettings>): ValidationResult`
Validates settings with comprehensive error checking.

### Settings Categories

```typescript
interface APIProviderSettings {
  openai: {
    apiKey?: string
    model: string
    baseUrl?: string
    organization?: string
  }
  claude: {
    apiKey?: string
    model: string
    baseUrl?: string
  }
}

interface GeneralSettings {
  language: string              // 'en', 'zh', etc.
  theme: 'light' | 'dark' | 'system'
  autoSave: boolean
  enableTelemetry: boolean
  defaultProject?: string
}

interface AdvancedSettings {
  debugMode: boolean
  maxMessageLength: number      // Character limit for messages
  cacheSize: number            // AI model cache size
  enableExperimentalFeatures: boolean
}
```

## Database Query Interface

**File:** `src/main/database/queries.ts`

### Query Categories

#### Project Queries
```typescript
// Project operations with statistics
const projects = await listProjects()              // With embedded stats
const project = await getProject(id)               // Single project
const stats = await getProjectStatistics(id)      // Detailed statistics
const updated = await updateProject(id, data)     // With validation
```

#### Conversation Queries
```typescript
// Conversation operations
const conversations = await listConversations(projectId)    // Optional filter
const conversation = await getConversationWithMessages(id) // With messages
const summary = await getConversationSummaries()          // Optimized summaries
```

#### Message Queries
```typescript
// Message operations with content handling
const messages = await getMessages(conversationId)  // Chronological order
const message = await addMessage(data)              // Multi-part content
const updated = await updateMessage(id, data)       // Content validation
```

#### Search Operations
```typescript
// Full-text search with FTS5
const results = await searchMessages('quantum computing', {
  projectId: 'proj_123',
  limit: 50,
  offset: 0
})

// Advanced search with filters
const filtered = await advancedSearch({
  query: 'neural networks',
  role: 'assistant',
  dateFrom: '2024-01-01',
  projectIds: ['proj_123', 'proj_456'],
  sortBy: 'relevance'
})
```

### Search Results

```typescript
interface SearchResult {
  id: string
  content: MessageContent[]
  snippet: string              // Highlighted excerpt
  score: number               // Relevance score
  conversation_title: string
  project_name?: string
}
```

## IPC Communication

### Exposed API

**File:** `src/main/preload.ts`

```typescript
interface ElectronAPI {
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

  // File management
  file: {
    processTempContent: (data: { files: string[] }) => Promise<IPCResult<TemporaryFileResult[]>>
  }
  
  // Event listeners
  on: (channel: string, callback: (...args: any[]) => void) => void
  off: (channel: string, callback: (...args: any[]) => void) => void
}
```

### IPC Channels

**Project Channels:**
- `project:create`, `project:get`, `project:list`, `project:update`, `project:delete`
- `project:stats`, `project:duplicate`

**Conversation Channels:**
- `conversation:create`, `conversation:list`, `conversation:get`, `conversation:update`, `conversation:delete`
- `conversation:send-message`, `conversation:fork`, `conversation:move`

**File Channels:**
- `file:process-temp-content`

**Event Channels:**
- `project:created`, `project:updated`, `project:deleted`
- `conversation:created`, `conversation:updated`, `conversation:deleted`
- `message:created`, `message:updated`, `message:streaming`, `message:reasoning`

## Error Handling

### Error Types

```typescript
class ServiceError extends Error {
  constructor(message: string, public code: string) {
    super(message)
  }
}

class ValidationError extends ServiceError {
  constructor(message: string, public field?: string) {
    super(message, 'VALIDATION_ERROR')
  }
}

class NotFoundError extends ServiceError {
  constructor(resource: string, id: string) {
    super(`${resource} with ID ${id} not found`, 'NOT_FOUND')
  }
}
```

### IPC Error Responses

All IPC operations return standardized error responses:

```typescript
// Success response
{
  success: true,
  data: result,
  timestamp: "2024-01-01T00:00:00.000Z"
}

// Error response
{
  success: false,
  error: "User-friendly error message",
  timestamp: "2024-01-01T00:00:00.000Z"
}
```

## Constants & Configuration

### File Constraints

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
}
```

### Default AI Configuration

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

This API reference provides comprehensive coverage of all implemented services and interfaces. Services marked as "Not Implemented" indicate planned functionality with established patterns that can be followed for implementation.