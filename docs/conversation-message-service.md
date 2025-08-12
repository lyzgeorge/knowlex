# Conversation and Message Management Service

## Overview

Task 6 implementation provides comprehensive conversation and message management services for the Knowlex desktop application. This includes business logic services, IPC communication layers, and support for multi-part message content.

## Architecture

The implementation follows the established three-layer architecture:

```
┌─────────────────────────────────────┐
│        IPC Layer                   │
│    src/main/ipc/conversation.ts    │
├─────────────────────────────────────┤
│        Service Layer               │
│  src/main/services/conversation.ts │
│  src/main/services/message.ts      │
├─────────────────────────────────────┤
│        Database Layer              │
│    src/main/database/queries.ts    │
│   (conversation & message queries)  │
└─────────────────────────────────────┘
```

## Components Implemented

### 1. Conversation Service (`src/main/services/conversation.ts`)

**Core Functions:**
- `createConversation(data: CreateConversationData): Promise<Conversation>`
- `getConversation(id: string): Promise<Conversation | null>`
- `listConversations(projectId?: string): Promise<Conversation[]>`
- `updateConversation(id: string, data: UpdateConversationData): Promise<Conversation>`
- `deleteConversation(id: string): Promise<void>`

**Specialized Functions:**
- `moveConversation(id: string, targetProjectId: string | null): Promise<Conversation>`
- `updateConversationSettings(id: string, settings: SessionSettings): Promise<Conversation>`
- `generateConversationTitle(id: string): Promise<string>` (placeholder for AI integration)

**Features:**
- Input validation and sanitization
- Duplicate name checking
- Error handling with meaningful messages
- Support for session-specific settings
- Project association management

### 2. Message Service (`src/main/services/message.ts`)

**Core Functions:**
- `addMessage(data: CreateMessageData): Promise<Message>`
- `getMessage(id: string): Promise<Message | null>`
- `getMessages(conversationId: string): Promise<Message[]>`
- `updateMessage(id: string, data: UpdateMessageData): Promise<Message>`
- `deleteMessage(id: string): Promise<void>`

**Convenience Functions:**
- `addTextMessage(conversationId, role, text, parentMessageId?): Promise<Message>`
- `addMultiPartMessage(conversationId, role, parts, parentMessageId?): Promise<Message>`
- `addCitationToMessage(messageId, filename, fileId, content, similarity, pageNumber?): Promise<Message>`

**Utility Functions:**
- `extractTextContent(message: Message): string`
- `extractCitations(message: Message): CitationContent[]`
- `getContentStats(message: Message): ContentStats`

**Multi-Part Content Support:**
- **Text**: Basic text content with Markdown support
- **Image**: Image content with URL, alt text, and metadata
- **Citation**: RAG citations with source file information and similarity scores
- **Tool Call**: Function/tool calling with arguments and results

### 3. IPC Layer (`src/main/ipc/conversation.ts`)

**Conversation Channels:**
- `conversation:create` - Create new conversation
- `conversation:list` - List conversations (optionally filtered by project)
- `conversation:get` - Get single conversation by ID
- `conversation:update` - Update conversation details
- `conversation:delete` - Delete conversation and messages
- `conversation:move` - Move conversation between projects
- `conversation:update-settings` - Update session settings
- `conversation:generate-title` - Generate AI-powered title

**Message Channels:**
- `message:add` - Add new message with full validation
- `message:add-text` - Convenience method for text messages
- `message:add-multipart` - Add complex multi-part messages
- `message:get` - Get single message by ID
- `message:list` - List all messages in conversation
- `message:update` - Update message content
- `message:delete` - Delete message

**Event Broadcasting:**
- Real-time events for conversation and message updates
- Support for streaming message responses
- Error event handling

## Data Models

### Conversation
```typescript
interface Conversation {
  id: string
  projectId?: string
  title: string
  createdAt: string
  updatedAt: string
  settings?: SessionSettings
}
```

### Message with Multi-Part Content
```typescript
interface Message {
  id: string
  conversationId: string
  role: 'user' | 'assistant'
  content: MessageContentPart[]
  createdAt: string
  updatedAt: string
  parentMessageId?: string
}

type MessageContentPart = 
  | { type: 'text'; text: string }
  | { type: 'image'; image: ImageContent }
  | { type: 'citation'; citation: CitationContent }
  | { type: 'tool-call'; toolCall: ToolCallContent }
```

## Integration Points

### Database Integration
- Uses existing database queries in `src/main/database/queries.ts`
- Supports SQLite transactions for data consistency
- Proper foreign key relationships and cascading deletes

### Project Integration
- Conversations can be associated with projects
- Moving conversations updates project context
- Project memory affects conversation behavior

### AI Integration
- Multi-part content supports AI model requirements
- Citation system for RAG functionality
- Tool calling support for external integrations
- Placeholder for automatic title generation

## Error Handling

### Validation
- Comprehensive input validation for all operations
- Content type validation for multi-part messages
- Business rule enforcement (e.g., title length limits)

### Error Types
- Invalid input errors with specific field information
- Not found errors for missing resources
- Database operation errors with context
- Network/API errors (for future AI integration)

### Recovery
- Automatic cleanup on failed operations
- Consistent error response format across IPC
- Detailed logging for debugging

## Security Features

### IPC Security
- Channel whitelisting and validation
- Parameter type checking and sanitization
- Secure context bridge implementation

### Data Protection
- SQL injection prevention through parameterized queries
- Input sanitization and validation
- Session isolation between conversations

## Performance Considerations

### Optimizations
- Efficient database queries with proper indexing
- Batch operations for multi-part content
- Lazy loading of conversation details
- Connection pooling and transaction management

### Scalability
- Support for large conversation histories
- Efficient message retrieval with pagination support
- Optimized content validation algorithms

## Testing Strategy

### Unit Tests
- Service layer business logic validation
- Multi-part content validation testing
- Error handling and edge cases

### Integration Tests
- IPC communication flows
- Database operation testing
- Cross-service interaction validation

### End-to-End Tests
- Complete conversation workflows
- Message creation and management
- Project integration scenarios

## Future Enhancements

### AI Integration
- Implement automatic title generation using AI models
- Enhanced content analysis and processing
- Smart conversation summarization

### Advanced Features
- Message threading and branching
- Conversation templates
- Bulk operations and batch processing
- Advanced search and filtering

### Performance
- Message virtualization for large conversations
- Background processing for heavy operations
- Caching strategies for frequently accessed data

## Usage Examples

### Creating a Conversation
```typescript
// Via IPC from renderer process
const result = await window.electronAPI.invoke('conversation:create', {
  projectId: 'project-123',
  title: 'New Research Discussion'
})
```

### Adding a Multi-Part Message
```typescript
// Complex message with text and citation
const message = await window.electronAPI.invoke('message:add-multipart', {
  conversationId: 'conv-456',
  role: 'assistant',
  parts: [
    {
      type: 'text',
      text: 'Based on the documentation, here\'s what I found:'
    },
    {
      type: 'citation',
      citation: {
        filename: 'api-docs.md',
        fileId: 'file-789',
        content: 'The API endpoint accepts POST requests...',
        similarity: 0.95
      }
    }
  ]
})
```

### Moving a Conversation
```typescript
// Move conversation to different project
const updated = await window.electronAPI.invoke('conversation:move', {
  conversationId: 'conv-456',
  projectId: 'new-project-123'
})
```

## Migration Notes

This implementation is fully backward compatible with existing database schemas and extends the functionality without breaking changes. The multi-part content system is designed to be extensible for future content types.