# API Reference

This document provides comprehensive reference documentation for all services and APIs in the Knowlex Desktop application. All services implement type-safe interfaces with comprehensive error handling and validation.

## Project Management Service

**File:** `src/main/services/project.ts`

Provides complete CRUD operations for project management with validation and statistics tracking.

### Interface Definition
```typescript
interface ProjectService {
  createProject(data: ProjectCreate): Promise<Project>
  getProject(id: string): Promise<Project | null>
  listProjects(): Promise<Project[]>
  updateProject(id: string, data: Partial<Project>): Promise<Project>
  deleteProject(id: string): Promise<void>
  getProjectStatistics(id: string): Promise<ProjectStats>
  duplicateProject(id: string, newName: string): Promise<Project>
}
```

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

**Example:**
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

**Parameters:**
- `id: string` - Project UUID

**Returns:** Project object or null if not found

**Example:**
```typescript
const project = await projectService.getProject('proj_abc123')
if (project) {
  console.log(`Project: ${project.name}`)
  console.log(`Files: ${project.stats?.fileCount || 0}`)
}
```

#### `listProjects(): Promise<Project[]>`
Returns all projects with aggregated statistics.

**Returns:** Array of projects with embedded statistics

**Statistics Included:**
- `conversationCount: number` - Total conversations in project
- `messageCount: number` - Total messages across all conversations
- `fileCount: number` - Number of uploaded files
- `totalFileSize: number` - Combined size of all files in bytes

**Example:**
```typescript
const projects = await projectService.listProjects()
projects.forEach(project => {
  console.log(`${project.name}: ${project.stats?.conversationCount} conversations`)
})
```

#### `updateProject(id: string, data: Partial<Project>): Promise<Project>`
Updates project properties with validation.

**Parameters:**
- `id: string` - Project UUID
- `data: Partial<Project>` - Fields to update

**Updatable Fields:**
- `name?: string` - Project name (validated for uniqueness)
- `description?: string` - Project description
- `settings?: ProjectSettings` - Project configuration

**Returns:** Updated project object

**Example:**
```typescript
const updated = await projectService.updateProject('proj_abc123', {
  description: 'Updated description',
  settings: { enableRAG: false }
})
```

#### `deleteProject(id: string): Promise<void>`
Permanently deletes a project and all associated data.

**Cascade Behavior:**
- Deletes all conversations in the project
- Deletes all messages in those conversations
- Deletes all project files and chunks
- Deletes all project memories and notes

**Example:**
```typescript
await projectService.deleteProject('proj_abc123')
```

#### `getProjectStatistics(id: string): Promise<ProjectStats>`
Retrieves detailed project usage statistics.

**Returns:**
```typescript
interface ProjectStats {
  conversationCount: number
  messageCount: number
  fileCount: number
  totalFileSize: number
  lastActivity: string
  averageMessagesPerConversation: number
  topFileTypes: Array<{ type: string, count: number }>
}
```

#### `duplicateProject(id: string, newName: string): Promise<Project>`
Creates a complete copy of a project with all settings.

**Parameters:**
- `id: string` - Source project ID
- `newName: string` - Name for the new project (must be unique)

**Copied Elements:**
- Project settings and configuration
- Project memories and notes
- File references (files themselves are not duplicated)

**Not Copied:**
- Conversations and messages (project starts clean)
- File processing status (files revert to pending)

## Conversation Management Service

**File:** `src/main/services/conversation.ts`

Manages chat sessions with AI-powered title generation and project association.

### Interface Definition
```typescript
interface ConversationService {
  createConversation(data: ConversationCreate): Promise<Conversation>
  getConversation(id: string): Promise<Conversation | null>
  listConversations(projectId?: string): Promise<Conversation[]>
  updateConversation(id: string, data: Partial<Conversation>): Promise<Conversation>
  deleteConversation(id: string): Promise<void>
  generateTitle(conversationId: string): Promise<string>
  moveToProject(conversationId: string, projectId: string | null): Promise<void>
  forkConversation(conversationId: string, fromMessageId?: string): Promise<Conversation>
}
```

### Core Functions

#### `createConversation(data: ConversationCreate): Promise<Conversation>`
Creates a new conversation with optional project association.

**Parameters:**
- `data.title: string` - Conversation title
- `data.project_id?: string` - Optional project association
- `data.settings?: SessionSettings` - AI configuration for this conversation

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

**Fallback Titles:**
- "New Conversation" (if no messages)
- "Chat about [first user message preview]" (if AI generation fails)

#### `moveToProject(conversationId: string, projectId: string | null): Promise<void>`
Moves a conversation between projects or to unclassified.

**Parameters:**
- `conversationId: string` - Conversation to move
- `projectId: string | null` - Target project (null for unclassified)

#### `forkConversation(conversationId: string, fromMessageId?: string): Promise<Conversation>`
Creates a new conversation branching from a specific message.

**Parameters:**
- `conversationId: string` - Source conversation
- `fromMessageId?: string` - Branch point (defaults to last message)

**Behavior:**
- Copies all messages up to the branch point
- Creates new conversation with same settings
- Maintains message parent relationships

## Message Management Service

**File:** `src/main/services/message.ts`

Handles multi-part message content with support for text, images, citations, and tool calls.

### Interface Definition
```typescript
interface MessageService {
  addMessage(data: MessageCreate): Promise<Message>
  getMessage(id: string): Promise<Message | null>
  getMessages(conversationId: string): Promise<Message[]>
  updateMessage(id: string, data: Partial<Message>): Promise<Message>
  deleteMessage(id: string): Promise<void>
  createTextMessage(conversationId: string, role: MessageRole, text: string): Promise<Message>
  createImageMessage(conversationId: string, text: string, images: ImageContent[]): Promise<Message>
  extractTextContent(message: Message): string
  extractImageContent(message: Message): ImageContent[]
}
```

### Content Type Support

#### Multi-Part Content Structure
```typescript
type MessageContent = MessageContentPart[]

interface MessageContentPart {
  type: 'text' | 'image' | 'citation' | 'tool-call'
  text?: string
  image?: ImageContent
  citation?: CitationContent
  toolCall?: ToolCallContent
}
```

#### Text Content
```typescript
interface TextContent {
  text: string
}

// Usage
const textMessage = await messageService.createTextMessage(
  conversationId,
  'user',
  'Explain quantum computing'
)
```

#### Image Content
```typescript
interface ImageContent {
  url: string        // Base64 data URL or file path
  alt?: string       // Alt text for accessibility
  mimeType: string   // image/png, image/jpeg, etc.
  size?: number      // File size in bytes
}

// Usage
const imageMessage = await messageService.createImageMessage(
  conversationId,
  'What do you see in this image?',
  [{
    url: 'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAA...',
    mimeType: 'image/png',
    alt: 'Diagram of neural network architecture'
  }]
)
```

#### Citation Content
```typescript
interface CitationContent {
  filename: string      // Source file name
  fileId: string        // Project file reference
  content: string       // Relevant text excerpt
  similarity: number    // Similarity score (0-1)
  pageNumber?: number   // Page reference for documents
}
```

#### Tool Call Content
```typescript
interface ToolCallContent {
  id: string                          // Unique tool call ID
  name: string                        // Function name
  arguments: Record<string, unknown>  // Function arguments
  result?: unknown                    // Function result
}
```

### Core Functions

#### `addMessage(data: MessageCreate): Promise<Message>`
Creates a message with multi-part content validation.

**Validation:**
- Content array must not be empty
- Each content part must have valid type and corresponding data
- Image content validated for supported formats
- Text content sanitized for security

#### `extractTextContent(message: Message): string`
Extracts all text content from a multi-part message.

**Returns:** Combined text from all text parts, plus text descriptions of other content types

#### Content Extraction Utilities
```typescript
// Extract specific content types
const textParts = messageService.extractTextContent(message)
const images = messageService.extractImageContent(message)
const citations = messageService.extractCitationContent(message)
const toolCalls = messageService.extractToolCallContent(message)
```

## AI Chat Service

**File:** `src/main/services/ai-chat.ts`

Integrates with the AI system for conversation processing and configuration management. This service is fully implemented and provides the bridge between the conversation layer and the AI providers.

### Interface Definition
```typescript
interface AIChatService {
  processMessage(messages: Message[], config?: AIConfig): Promise<AIResponse>
  testConfiguration(config: AIConfig): Promise<boolean>
  generateTitle(messages: Message[], config?: AIConfig): Promise<string>
  getDefaultConfiguration(): AIConfig
  validateConfiguration(config: AIConfig): ValidationResult
}
```

### Core Functions

#### `processMessage(messages: Message[], config?: AIConfig): Promise<AIResponse>`
Processes conversation messages and generates AI response.

**Process Flow:**
1. Convert internal message format to AI provider format
2. Apply conversation settings (temperature, max tokens, etc.)
3. Send to configured AI provider
4. Process response and extract reasoning content (Claude)
5. Convert response back to internal format

**Response Structure:**
```typescript
interface AIResponse {
  content: MessageContent[]
  usage?: TokenUsage
  reasoning?: string        // Claude reasoning content
  model: string
  provider: string
}
```

#### `testConfiguration(config: AIConfig): Promise<boolean>`
Validates AI provider configuration with test request.

**Test Process:**
1. Creates model instance with provided configuration
2. Sends minimal test message ("Test connection")
3. Validates successful response
4. Returns boolean result

**Configuration Validation:**
```typescript
interface ValidationResult {
  valid: boolean
  errors: string[]
  warnings?: string[]
}

const result = await aiChatService.validateConfiguration({
  provider: 'openai',
  apiKey: 'sk-invalid',
  model: 'gpt-4o'
})

if (!result.valid) {
  console.error('Configuration errors:', result.errors)
}
```

#### `getDefaultConfiguration(): AIConfig`
Returns environment-based default AI configuration.

**Environment Variables:**
```bash
DEFAULT_PROVIDER=openai        # or 'claude'
OPENAI_API_KEY=sk-...
OPENAI_MODEL=gpt-4o
CLAUDE_API_KEY=sk-ant-...
CLAUDE_MODEL=claude-3-sonnet-20240229
```

### Message Format Conversion

The service handles conversion between internal and AI provider formats:

```typescript
// Internal format
const internalMessage: Message = {
  role: 'user',
  content: [
    { type: 'text', text: 'Explain this image' },
    { type: 'image', image: { url: 'data:...', mimeType: 'image/png' } }
  ]
}

// Converted to OpenAI format
const openaiMessage = {
  role: 'user',
  content: [
    { type: 'text', text: 'Explain this image' },
    { type: 'image_url', image_url: { url: 'data:image/png;base64,...' } }
  ]
}
```

## Settings Management Service

**File:** `src/main/services/settings.ts`

Manages application configuration with validation and persistence.

### Interface Definition
```typescript
interface SettingsService {
  get(key: string): Promise<string | null>
  set(key: string, value: string): Promise<void>
  delete(key: string): Promise<void>
  getAll(): Promise<Record<string, string>>
  validateSettings(settings: Partial<AppSettings>): ValidationResult
  resetToDefaults(): Promise<void>
}
```

### Settings Categories

#### API Provider Settings
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
```

#### General Application Settings
```typescript
interface GeneralSettings {
  language: string              // 'en', 'zh', etc.
  theme: 'light' | 'dark' | 'system'
  autoSave: boolean
  enableTelemetry: boolean
  defaultProject?: string
}
```

#### Advanced Settings
```typescript
interface AdvancedSettings {
  debugMode: boolean
  maxMessageLength: number      // Character limit for messages
  cacheSize: number            // AI model cache size
  enableExperimentalFeatures: boolean
}
```

## Database Query Interface

**File:** `src/main/database/queries.ts`

Provides type-safe database operations with comprehensive error handling.

### Core Query Categories

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

#### File Operations
```typescript
// Project file management
const file = await createProjectFile(data)         // File metadata
const chunks = await batchCreateFileChunks(data)   // Vector chunks
const results = await vectorSearch(embedding)     // Similarity search
```

### Query Performance Features

- **Prepared Statements**: All queries use parameterized statements for security
- **Transaction Support**: Batch operations wrapped in transactions
- **Connection Pooling**: Efficient database connection management  
- **Query Optimization**: Strategic indexes and query planning
- **Error Recovery**: Comprehensive error handling with user-friendly messages

### Search Capabilities

#### Full-Text Search (FTS5)
```typescript
// Search messages across projects
const searchResults = await searchMessages('machine learning', {
  projectId: 'proj_123',        // Optional project filter
  conversationId: 'conv_456',   // Optional conversation filter
  limit: 20,
  offset: 0
})

// Each result includes:
interface SearchResult {
  id: string
  content: MessageContent[]
  snippet: string              // Highlighted excerpt
  score: number               // Relevance score
  conversation_title: string
  project_name?: string
}
```

#### Vector Search (Future)
```typescript
// Semantic similarity search
const vectorResults = await vectorSearch(queryEmbedding, {
  threshold: 0.7,             // Minimum similarity
  limit: 10,
  projectId: 'proj_123'      // Optional project filter
})
```

## Error Handling Patterns

### Service-Level Error Handling
All services implement consistent error handling:

```typescript
// Standardized error types
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

### Database Error Recovery
```typescript
// Database operation with retry logic
const withRetry = async <T>(operation: () => Promise<T>, maxRetries = 3): Promise<T> => {
  for (let i = 0; i < maxRetries; i++) {
    try {
      return await operation()
    } catch (error) {
      if (i === maxRetries - 1) throw error
      if (error.message.includes('database is locked')) {
        await delay(100 * Math.pow(2, i))  // Exponential backoff
      } else {
        throw error
      }
    }
  }
}
```

### Validation Patterns
```typescript
// Input validation with detailed error messages
const validateProjectData = (data: ProjectCreate): ValidationResult => {
  const errors: string[] = []
  
  if (!data.name?.trim()) {
    errors.push('Project name is required')
  } else if (data.name.length > 100) {
    errors.push('Project name must be 100 characters or less')
  }
  
  if (data.description && data.description.length > 1000) {
    errors.push('Description must be 1000 characters or less')
  }
  
  return {
    valid: errors.length === 0,
    errors
  }
}
```

## Performance Considerations

### Caching Strategies
- **Query Result Caching**: Frequently accessed data cached in memory
- **AI Model Caching**: Model instances cached to avoid recreation overhead
- **Connection Pooling**: Database connections reused across requests

### Batch Operations
```typescript
// Efficient batch processing
const batchCreateMessages = async (messages: MessageCreate[]): Promise<Message[]> => {
  const db = await getDB()
  await db.execute('BEGIN TRANSACTION')
  
  try {
    const results = await Promise.all(
      messages.map(msg => addMessage(msg))
    )
    await db.execute('COMMIT')
    return results
  } catch (error) {
    await db.execute('ROLLBACK')
    throw error
  }
}
```

### Query Optimization
- **Index Usage**: All frequently queried columns properly indexed
- **Query Planning**: Complex queries optimized with EXPLAIN QUERY PLAN
- **Lazy Loading**: Large datasets loaded on demand with pagination
- **Aggregation**: Statistics computed at query time rather than stored

The API reference provides comprehensive coverage of all services with detailed function signatures, validation rules, error handling patterns, and performance considerations. All services are production-ready with proper error recovery and type safety.