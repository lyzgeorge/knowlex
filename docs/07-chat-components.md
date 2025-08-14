# Chat Components Documentation

This documentation covers the chat interface components implemented in tasks 17-19 for the Knowlex desktop application. These components provide a complete chat experience with message display, input handling, and message operations.

## Overview

The chat components are located in `src/renderer/src/components/features/chat/`. The implementation follows atomic design principles with simple, focused components that have clear responsibilities.

### Components Included (VERIFIED)

- **ChatInterface**: `ChatInterface.tsx` - Main container for chat functionality ✅
- **MessageList**: `MessageList.tsx` - Displays conversation messages with streaming support ✅
- **ChatInputBox**: `ChatInputBox.tsx` - Message input with file upload and keyboard shortcuts ✅
- **MessageActionIcons**: `MessageActionIcons.tsx` - Context menu for message operations ✅
- **MessageEditModal**: `MessageEditModal.tsx` - Message editing dialog ✅
- **FilePreview**: `FilePreview.tsx` - File preview cards with remove functionality ✅

**Note**: The actual filenames differ slightly from some documentation references (e.g., `ChatInputBox.tsx` instead of `InputBox.tsx`, `MessageActionIcons.tsx` instead of `MessageActionMenu.tsx`).

## ChatInterface Component

**File:** `src/renderer/src/components/features/chat/ChatInterface.tsx`

Main container component that orchestrates the entire chat interface experience.

### Interface
```typescript
interface ChatInterfaceProps {
  /** Additional CSS classes */
  className?: string
}
```

### Features
- **State Management**: Automatically handles conversation state from Zustand store
- **Empty State**: Shows welcome screen when no conversation is selected
- **Loading State**: Displays spinner while messages are loading
- **Layout**: Two-panel layout with messages area and input area
- **Responsive**: Full-height layout with proper overflow handling

### Usage Example
```tsx
import { ChatInterface } from '../components/features/chat'

// Basic usage - automatically shows current conversation
<ChatInterface />

// With custom styling
<ChatInterface className="custom-chat-interface" />
```

## MessageList Component

**File:** `src/renderer/src/components/features/chat/MessageList.tsx`

Displays conversation messages with automatic scrolling and streaming support.

### Interface
```typescript
interface MessageListProps {
  /** Array of messages to display */
  messages: Message[]
  /** Additional CSS classes */
  className?: string
}
```

### Features
- **Auto-scroll**: Automatically scrolls to bottom on new messages
- **Streaming Support**: Shows real-time message updates during AI generation
- **Empty State**: Displays friendly message when conversation is empty
- **Accessibility**: Proper ARIA labels and roles for screen readers
- **Performance**: Efficient rendering for large message lists

### Usage Example
```tsx
import { MessageList } from '../components/features/chat'
import { useCurrentConversation } from '../stores/conversation'

const { currentMessages } = useCurrentConversation()

<MessageList messages={currentMessages} />
```

## ChatInputBox Component

**File:** `src/renderer/src/components/features/chat/ChatInputBox.tsx`

Multi-functional input component with text input, file upload, and send functionality.

### Interface
```typescript
interface ChatInputBoxProps {
  /** Current conversation ID (optional for main entrance) */
  conversationId?: string
  /** Input variant - main-entrance or conversation */
  variant?: 'main-entrance' | 'conversation'
  /** Whether to show file attachment button */
  showFileAttachment?: boolean
  /** Whether the input is disabled */
  disabled?: boolean
  /** Placeholder text */
  placeholder?: string
  /** Callback for sending messages with files */
  onSendMessage?: (message: string, files: File[], temporaryFiles: TemporaryFileResult[]) => void
  /** Additional CSS classes */
  className?: string
}
```

### Features
- **Auto-resize Textarea**: Dynamically adjusts height up to 200px maximum
- **File Upload**: Click-to-upload and drag-and-drop file support ✅ **FULLY FUNCTIONAL**
- **File Processing**: Automatic text extraction and content integration ✅ **COMPLETED**
- **File Validation**: 
  - Maximum 10 files per message
  - 1MB size limit per file  
  - Supports .txt and .md files only
- **AI Context Integration**: File contents automatically included in AI requests ✅ **WORKING**
- **Keyboard Shortcuts**: Ctrl/Cmd+Enter to send message
- **Visual Feedback**: Drag-over indicator, loading states, error toasts
- **File Preview**: Shows uploaded files with remove functionality
- **Two Variants**: Main entrance (welcome screen) and conversation mode

### Usage Example
```tsx
import { ChatInputBox } from '../components/features/chat'

// Conversation mode
<ChatInputBox 
  conversationId="conv-123"
  variant="conversation"
  placeholder="Ask me anything..."
  disabled={false}
/>

// Main entrance mode (with file upload)
<ChatInputBox 
  variant="main-entrance"
  showFileAttachment={true}
  onSendMessage={handleSendMessage}
  placeholder="您在忙什么?"
/>
```

### File Upload Configuration
```typescript
// Constants used for file validation
const MAX_FILES = 10
const MAX_FILE_SIZE = 1024 * 1024 // 1MB
const ALLOWED_TYPES = ['.txt', '.md']
```

### File Processing Integration ✅ **COMPLETED**

The ChatInputBox now includes complete integration with the temporary file processing system:

1. **File Upload**: User selects files via drag-drop or file picker
2. **Client Validation**: Files validated against size/type constraints
3. **IPC Processing**: Files sent to main process for content extraction
4. **Content Integration**: Processed file content included as `temporary-file` content parts
5. **AI Context**: File content automatically available to AI models

```typescript
// File processing flow
const handleSend = async () => {
  // Process files if any
  let processedFiles: TemporaryFileResult[] = []
  if (files.length > 0) {
    const filePaths = files.map(file => file.path)
    const result = await window.knowlex.file.processTempContent({ files: filePaths })
    processedFiles = result.success ? result.data : []
  }
  
  // Send message with processed files
  onSendMessage?.(message, files, processedFiles)
}
```

## MessageActionIcons Component

**File:** `src/renderer/src/components/features/chat/MessageActionIcons.tsx`

Context menu providing message operations like edit, regenerate, copy, and delete.

### Interface
```typescript
interface MessageActionIconsProps {
  /** The message this menu acts on */
  message: Message
  /** Whether this menu is visible (for hover states) */
  isVisible?: boolean
  /** Additional CSS classes */
  className?: string
}
```

### Available Operations

#### For User Messages
- **Edit & Retry**: Edit message content and regenerate AI response (placeholder)
- **Fork**: Create new conversation branch from this message
- **Copy**: Copy message text to clipboard
- **Delete**: Remove message with confirmation dialog

#### For AI Messages
- **Regenerate**: Generate new AI response for the same user input
- **Fork**: Create new conversation branch from this message
- **Copy**: Copy message text to clipboard
- **Delete**: Remove message with confirmation dialog

### Features
- **Toast Notifications**: User feedback for all operations
- **Error Handling**: Graceful failure with informative error messages
- **Confirmation**: Delete operations require user confirmation
- **Accessibility**: Proper ARIA labels and keyboard navigation

### Usage Example
```tsx
import { MessageActionIcons } from '../components/features/chat'

<MessageActionIcons 
  message={message}
  isVisible={isHovered}
/>
```

## FilePreview Component

**File:** `src/renderer/src/components/features/chat/FilePreview.tsx`

Compact card component for displaying uploaded file information.

### Interface
```typescript
interface FilePreviewProps {
  /** File to preview */
  file: File
  /** Callback when file is removed */
  onRemove: () => void
  /** Additional CSS classes */
  className?: string
}
```

### Features
- **File Information**: Shows filename and formatted file size
- **File Icon**: Generic attachment icon for visual identification
- **Remove Button**: One-click file removal with hover effects
- **Compact Layout**: Space-efficient card design
- **Accessibility**: Proper labels and keyboard support

### Usage Example
```tsx
import { FilePreview } from '../components/features/chat'

{files.map((file, index) => (
  <FilePreview
    key={`${file.name}-${index}`}
    file={file}
    onRemove={() => removeFile(file)}
  />
))}
```

## EmptyState Component

**File:** `src/renderer/src/components/features/chat/EmptyState.tsx`

Welcome screen displayed when no conversation is selected.

### Features
- **Friendly UI**: Chat icon and welcoming message
- **Quick Action**: "Start New Chat" button for immediate engagement
- **Keyboard Hint**: Shows Ctrl+N shortcut for power users
- **Responsive**: Centered layout that works on different screen sizes

### Usage Example
```tsx
import { EmptyState } from '../components/features/chat'

// Automatically shown by ChatInterface when no conversation
<EmptyState />
```

## Integration with State Management

All chat components integrate seamlessly with the Zustand conversation store:

```typescript
// Key store hooks used by chat components
import {
  useCurrentConversation,  // Current conversation and messages
  useMessageActions,       // Send, edit, delete, regenerate actions
  useStreamingState       // Real-time streaming updates
} from '../stores/conversation'
```

## Error Handling

Components implement comprehensive error handling:

- **Toast Notifications**: User-friendly error messages
- **Graceful Degradation**: Components remain functional when operations fail
- **Recovery**: Failed states can be retried without page refresh
- **Logging**: Errors are logged to console for debugging

## Accessibility Features

All components follow accessibility best practices:

- **ARIA Labels**: Descriptive labels for screen readers
- **Keyboard Navigation**: Full keyboard support for all interactions
- **Focus Management**: Proper focus handling for modals and menus
- **Semantic HTML**: Proper use of semantic elements and roles

## Performance Considerations

- **Efficient Rendering**: Components only re-render when necessary
- **Auto-scroll Optimization**: Smart scrolling that respects user scroll position
- **File Upload**: Non-blocking file processing with progress feedback
- **Memory Management**: Proper cleanup of event listeners and references

## Future Enhancements

Components are designed for easy extension:

- **Virtual Scrolling**: Ready for implementation when message lists grow large
- **Rich Text Editing**: Input box can be enhanced with formatting options
- **Message Search**: Components can be extended with search and filtering
- **Offline Support**: State management supports offline queue functionality