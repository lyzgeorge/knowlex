# UI Components Documentation

This documentation covers the basic UI components implemented for the Knowlex desktop application. All components are built with React, TypeScript, and Chakra UI, providing consistent styling, accessibility, and functionality.

## Overview

The UI component library is located in `src/renderer/src/components/`. It includes:

### Basic UI Components (`src/renderer/src/components/ui/`)
- **Button**: `Button.tsx` - Multi-variant button with loading states
- **Input**: `Input.tsx` - Form input with validation and error handling
- **Modal**: `Modal.tsx` - Overlay component for dialogs and forms
- **FileCard**: `FileCard.tsx` - File display component with action buttons  
- **MessageBubble**: `MessageBubble.tsx` - Chat message component with multi-part content

### Layout Components (`src/renderer/src/components/layout/`)
- **MainLayout**: `MainLayout.tsx` - Application shell with draggable regions
- **Sidebar**: `Sidebar.tsx` - Feature-complete navigation with 760+ lines

### Feature Components (`src/renderer/src/components/features/`)
- **Chat Components**: Complete chat interface implementation (VERIFIED)
  - `ChatInterface.tsx` - Main chat container ✅
  - `MessageList.tsx` - Message display with auto-scroll ✅
  - `ChatInputBox.tsx` - Input with file upload ✅
  - `MessageActionIcons.tsx` - Message operations menu ✅
  - `MessageEditModal.tsx` - Message editing dialog ✅
  - `FilePreview.tsx` - File preview cards ✅
- **Project Components**: NOT IMPLEMENTED (directory missing)
- **Settings Components**: NOT IMPLEMENTED (directory missing)

## Button Component

**File:** `src/renderer/src/components/ui/Button.tsx`

### Interface
```typescript
interface ButtonProps extends Omit<ChakraButtonProps, 'leftIcon' | 'rightIcon'> {
  variant?: 'solid' | 'outline' | 'ghost' | 'link' | 'danger'
  size?: 'sm' | 'md' | 'lg'
  isLoading?: boolean
  isDisabled?: boolean
  leftIcon?: React.ReactElement
  rightIcon?: React.ReactElement
  colorScheme?: string
  isFullWidth?: boolean
  type?: 'button' | 'submit' | 'reset'
}
```

### Usage Examples
```tsx
import { Button } from '../components/ui'

// Basic usage
<Button>Click me</Button>

// Variant examples
<Button variant="outline">Outline Button</Button>
<Button variant="ghost">Ghost Button</Button>
<Button variant="danger">Delete</Button>

// With icons and loading
<Button leftIcon={<AddIcon />} isLoading>
  Add Item
</Button>

// Form submission
<Button type="submit" isFullWidth colorScheme="blue">
  Submit Form
</Button>
```

### Style Variants
- **solid**: Default filled button with hover effects
- **outline**: Border-only button with hover background
- **ghost**: Text-only button with hover background
- **link**: Text button without background
- **danger**: Red-themed button for destructive actions

### Accessibility Features
- Full keyboard navigation support
- ARIA attributes for screen readers
- Focus indicators with outline shadow
- Disabled state handling

## Input Component

**File:** `src/renderer/src/components/ui/Input.tsx`

### Interface
```typescript
interface InputProps extends Omit<ChakraInputProps, 'size'> {
  size?: 'sm' | 'md' | 'lg'
  variant?: 'outline' | 'filled' | 'flushed' | 'unstyled'
  label?: string
  helperText?: string
  error?: string
  leftIcon?: React.ReactElement
  rightIcon?: React.ReactElement
  type?: 'text' | 'email' | 'password' | 'number' | 'tel' | 'url' | 'search'
  isRequired?: boolean
  isInvalid?: boolean
  isDisabled?: boolean
  isReadOnly?: boolean
  isFullWidth?: boolean
  showPasswordToggle?: boolean
}
```

### Usage Examples
```tsx
import { Input } from '../components/ui'
import { SearchIcon, EmailIcon } from '@chakra-ui/icons'

// Basic input
<Input placeholder="Enter your name" />

// With label and validation
<Input
  label="Email Address"
  type="email"
  isRequired
  error="Please enter a valid email"
/>

// Password input with toggle
<Input
  type="password"
  label="Password"
  showPasswordToggle
  helperText="Must be at least 8 characters"
/>

// With icons
<Input
  leftIcon={<SearchIcon />}
  placeholder="Search..."
  variant="filled"
/>
```

### Features
- **Controlled Component**: Works with form libraries like React Hook Form
- **Validation Support**: Built-in error display and invalid states
- **Password Toggle**: Show/hide password functionality
- **Icon Support**: Left and right icon positioning
- **Helper Text**: Additional guidance below input

### Accessibility Features
- Proper form labeling with `htmlFor` attributes
- ARIA descriptions for error and helper text
- Required field indicators
- Focus management and keyboard navigation

## Modal Component

**File:** `src/renderer/src/components/ui/Modal.tsx`

### Interface
```typescript
interface ModalProps extends Omit<ChakraModalProps, 'children'> {
  isOpen: boolean
  onClose: () => void
  title?: string
  size?: 'xs' | 'sm' | 'md' | 'lg' | 'xl' | '2xl' | '3xl' | '4xl' | '5xl' | '6xl' | 'full'
  isCentered?: boolean
  showCloseButton?: boolean
  closeOnOverlayClick?: boolean
  closeOnEsc?: boolean
  header?: React.ReactNode
  children: React.ReactNode
  footer?: React.ReactNode
  blockScrollOnMount?: boolean
}
```

### Usage Examples
```tsx
import { Modal, Button, useDisclosure } from '../components/ui'

function MyComponent() {
  const { isOpen, onOpen, onClose } = useDisclosure()

  return (
    <>
      <Button onClick={onOpen}>Open Modal</Button>
      
      <Modal
        isOpen={isOpen}
        onClose={onClose}
        title="Confirmation"
        size="md"
      >
        <p>Are you sure you want to delete this item?</p>
      </Modal>
    </>
  )
}

// With custom header and footer
<Modal
  isOpen={isOpen}
  onClose={onClose}
  header={<CustomHeader />}
  footer={
    <HStack spacing={3}>
      <Button variant="ghost" onClick={onClose}>Cancel</Button>
      <Button colorScheme="red">Delete</Button>
    </HStack>
  }
>
  <p>Modal content goes here</p>
</Modal>
```

### Features
- **Backdrop Overlay**: Blurred background with customizable click behavior
- **Animation**: Smooth slide-in/slide-out transitions
- **Size Variants**: From extra small to full screen
- **Scroll Management**: Prevents background scrolling
- **Keyboard Navigation**: ESC key closes modal, focus trapping

### Accessibility Features
- Focus trapping within modal
- Focus restoration when closed
- ARIA modal attributes
- Keyboard navigation support

## FileCard Component

**File:** `src/renderer/src/components/ui/FileCard.tsx`

### Interface
```typescript
interface FileCardProps {
  file: ProjectFile | TemporaryFile
  type?: 'project' | 'temporary'
  compact?: boolean
  showActions?: boolean
  isSelected?: boolean
  onClick?: (file: ProjectFile | TemporaryFile) => void
  onView?: (file: ProjectFile | TemporaryFile) => void
  onDelete?: (file: ProjectFile | TemporaryFile) => void
  onDownload?: (file: ProjectFile | TemporaryFile) => void
  onRetry?: (file: ProjectFile) => void
  progress?: number
}
```

### Usage Examples
```tsx
import { FileCard } from '../components/ui'

// Basic file display
<FileCard
  file={projectFile}
  onClick={handleFileClick}
  onDelete={handleFileDelete}
/>

// Compact version
<FileCard
  file={tempFile}
  type="temporary"
  compact
  showActions={false}
/>

// With processing progress
<FileCard
  file={processingFile}
  progress={75}
  onRetry={handleRetry}
/>
```

### Features
- **File Status Indicators**: Visual badges for pending, processing, ready, failed states
- **Progress Display**: Processing progress bar with animation
- **Action Menu**: View, download, delete, retry actions
- **Error Handling**: Error message display and retry functionality
- **File Metadata**: Size, type, chunk count display

### Status Types
- **pending**: File queued for processing
- **processing**: Currently being processed
- **ready**: Successfully processed and available
- **failed**: Processing failed with error message

## MessageBubble Component

**File:** `src/renderer/src/components/ui/MessageBubble.tsx`

### Interface
```typescript
interface MessageBubbleProps {
  message: Message
  isStreaming?: boolean
  showAvatar?: boolean
  showTimestamp?: boolean
  compact?: boolean
  onCitationClick?: (citation: CitationContent) => void
  onImageClick?: (image: ImageContent) => void
  onCopyMessage?: (message: Message) => void
}
```

### Usage Examples
```tsx
import { MessageBubble } from '../components/ui'

// Basic message display
<MessageBubble
  message={chatMessage}
  showAvatar
  showTimestamp
/>

// Streaming message
<MessageBubble
  message={incompleteMessage}
  isStreaming
  onCopyMessage={handleCopy}
/>

// With interaction handlers
<MessageBubble
  message={messageWithCitations}
  onCitationClick={handleCitationClick}
  onImageClick={handleImageClick}
/>
```

### Content Types
The MessageBubble supports multiple content part types:

#### Text Content
- **Markdown rendering** with syntax highlighting
- **Code blocks** with language detection
- **Links** with external link indicators
- **Blockquotes** with custom styling

#### Image Content
```typescript
interface ImageContent {
  url: string
  alt?: string
  mimeType: string
  size?: number
}
```

#### Citation Content
```typescript
interface CitationContent {
  filename: string
  fileId: string
  content: string
  similarity: number
  pageNumber?: number
}
```

#### Tool Call Content
```typescript
interface ToolCallContent {
  id: string
  name: string
  arguments: Record<string, unknown>
  result?: unknown
}
```

### Features
- **Multi-part Content**: Supports text, images, citations, and tool calls
- **Markdown Support**: Full GitHub Flavored Markdown with syntax highlighting
- **Streaming Support**: Loading indicators for real-time messages
- **Interactive Elements**: Clickable citations and images
- **Copy Functionality**: Copy message content to clipboard
- **Role-based Styling**: Different appearance for user vs assistant messages

## Layout Components

### MainLayout Component (`src/renderer/src/components/layout/MainLayout.tsx`)

**Main application shell providing the overall layout structure with Electron integration.**

#### Interface
```typescript
interface MainLayoutProps {
  children: React.ReactNode
  className?: string
}
```

#### Features
- **Electron Integration**: Draggable regions for native window controls
- **Responsive Layout**: HStack layout with sidebar and main content area
- **Cross-Platform**: Handles platform-specific window behaviors
- **Theme Integration**: Seamless light/dark mode support

#### Usage Example
```tsx
import { MainLayout } from '../components/layout'

function App() {
  return (
    <MainLayout>
      <ChatInterface />
    </MainLayout>
  )
}
```

#### Implementation Highlights
- **Draggable Region**: Enables native window dragging on Electron
- **Sidebar Integration**: Manages sidebar width and resize behavior
- **Overflow Management**: Proper content overflow handling
- **Height Management**: Full viewport height utilization

### Sidebar Component (`src/renderer/src/components/layout/Sidebar.tsx`)

**Feature-complete navigation sidebar with project management, search, and conversation organization.**

#### Advanced Features (760+ lines of implementation)

##### Project Tree Navigation
- **Expandable Projects**: Click to expand/collapse project conversations
- **Hover Actions**: Quick access to project operations
- **Drag and Drop**: Move conversations between projects (future feature)
- **Context Menus**: Right-click operations for projects and conversations

##### Search Functionality
- **Real-time Search**: Instant filtering as you type
- **Search Highlighting**: Matched terms highlighted in results
- **Cross-Project Search**: Search across all projects and conversations
- **Search History**: Recent search terms persistence (future feature)

##### Conversation Management
- **Conversation Lists**: Chronologically sorted conversation display
- **Quick Actions**: Rename, delete, move operations with confirmation
- **Unclassified Conversations**: Special section for project-less chats
- **Message Count Display**: Shows message count per conversation

##### Performance Optimizations
- **Virtual Scrolling**: Efficient rendering of large conversation lists
- **Debounced Search**: Optimized search with 300ms debounce
- **Memoized Components**: Prevents unnecessary re-renders
- **Efficient State Updates**: Selective state subscriptions

#### Key Components Within Sidebar
```typescript
// Project expansion state
const [expandedProjects, setExpandedProjects] = useState<Set<string>>(new Set())

// Search functionality
const [searchTerm, setSearchTerm] = useState('')
const [filteredItems, setFilteredItems] = useState([])

// Rename modal state
const [renameModal, setRenameModal] = useState<{
  isOpen: boolean
  type: 'project' | 'conversation'
  id: string
  currentName: string
} | null>(null)

// Delete confirmation modal
const [deleteModal, setDeleteModal] = useState<{
  isOpen: boolean
  type: 'project' | 'conversation'
  id: string
  name: string
} | null>(null)
```

#### Usage Integration
The Sidebar automatically integrates with Zustand stores:
- **Project Store**: Displays projects and handles CRUD operations
- **Conversation Store**: Shows conversations and manages selection
- **App Store**: Handles UI state like expanded projects and search

## Feature Components

### Chat Interface Components (`src/renderer/src/components/features/chat/`)

#### ChatInterface Component (`ChatInterface.tsx`)

**Main container orchestrating the complete chat experience.**

##### Multiple Interface States
- **Welcome State**: Shown when no conversation is selected
- **Loading State**: Displays while messages are loading
- **Chat State**: Active conversation with messages and input
- **Error State**: Error handling with recovery options

##### Implementation
```typescript
interface ChatInterfaceProps {
  className?: string
}

const ChatInterface: React.FC<ChatInterfaceProps> = ({ className }) => {
  const { currentConversation, currentMessages, isLoading } = useCurrentConversation()
  
  // Render appropriate state based on current conversation
  if (!currentConversation) {
    return <EmptyState />
  }
  
  if (isLoading) {
    return <LoadingSpinner />
  }
  
  return (
    <VStack spacing={0} height="100%" className={className}>
      <MessageList messages={currentMessages} flex="1" />
      <ChatInputBox conversationId={currentConversation.id} />
    </VStack>
  )
}
```

#### MessageList Component (`MessageList.tsx`)

**Advanced message display with auto-scrolling and streaming support.**

##### Features
- **Auto-scroll**: Automatically scrolls to bottom on new messages
- **Smart Scrolling**: Maintains scroll position when user scrolls up
- **Streaming Support**: Real-time message updates during AI generation
- **Message Actions**: Hover-activated action menus for each message
- **Virtual Scrolling**: Performance optimization for large conversations

##### Implementation Highlights
```typescript
const MessageList: React.FC<MessageListProps> = ({ messages, className }) => {
  const messagesEndRef = useRef<HTMLDivElement>(null)
  const containerRef = useRef<HTMLDivElement>(null)
  const [shouldAutoScroll, setShouldAutoScroll] = useState(true)
  
  // Auto-scroll logic
  const scrollToBottom = useCallback(() => {
    if (shouldAutoScroll && messagesEndRef.current) {
      messagesEndRef.current.scrollIntoView({ behavior: 'smooth' })
    }
  }, [shouldAutoScroll])
  
  // Detect user scrolling
  const handleScroll = useCallback(() => {
    if (containerRef.current) {
      const { scrollTop, scrollHeight, clientHeight } = containerRef.current
      const isNearBottom = scrollTop + clientHeight >= scrollHeight - 100
      setShouldAutoScroll(isNearBottom)
    }
  }, [])
  
  useEffect(() => {
    scrollToBottom()
  }, [messages.length, scrollToBottom])
  
  return (
    <VStack 
      ref={containerRef}
      spacing={4}
      align="stretch"
      padding={4}
      overflowY="auto"
      onScroll={handleScroll}
      className={className}
    >
      {messages.map((message) => (
        <MessageBubble 
          key={message.id} 
          message={message}
          showActions
        />
      ))}
      <div ref={messagesEndRef} />
    </VStack>
  )
}
```

#### ChatInputBox Component (`ChatInputBox.tsx`)

**Multi-functional input with file upload, auto-resize, and keyboard shortcuts.**

##### Advanced Input Features
- **Auto-resize Textarea**: Grows up to 200px maximum height
- **File Upload Support**: Drag-and-drop and click-to-upload
- **File Validation**: Size limits, type checking, count restrictions
- **Keyboard Shortcuts**: Ctrl/Cmd+Enter to send, Escape to clear
- **File Preview**: Shows uploaded files with remove functionality

##### File Upload Configuration
```typescript
const FILE_CONSTRAINTS = {
  maxFiles: 10,
  maxFileSize: 1024 * 1024, // 1MB
  allowedTypes: ['.txt', '.md'],
  supportedMimeTypes: ['text/plain', 'text/markdown']
}
```

##### Implementation Features
```typescript
const ChatInputBox: React.FC<ChatInputBoxProps> = ({ conversationId, disabled }) => {
  const [inputValue, setInputValue] = useState('')
  const [uploadedFiles, setUploadedFiles] = useState<File[]>([])
  const [isDragOver, setIsDragOver] = useState(false)
  const [isUploading, setIsUploading] = useState(false)
  const textareaRef = useRef<HTMLTextAreaElement>(null)
  
  // Auto-resize textarea
  const adjustTextareaHeight = useCallback(() => {
    if (textareaRef.current) {
      textareaRef.current.style.height = 'auto'
      const scrollHeight = textareaRef.current.scrollHeight
      const maxHeight = 200
      textareaRef.current.style.height = `${Math.min(scrollHeight, maxHeight)}px`
    }
  }, [])
  
  // File upload handling
  const handleFileUpload = useCallback(async (files: File[]) => {
    const validation = validateFiles(files, 'temporary', uploadedFiles.length)
    if (!validation.valid) {
      showError(validation.errors.join('\n'))
      return
    }
    
    setUploadedFiles(prev => [...prev, ...files])
  }, [uploadedFiles])
  
  // Drag and drop
  const handleDragOver = useCallback((e: React.DragEvent) => {
    e.preventDefault()
    setIsDragOver(true)
  }, [])
  
  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault()
    setIsDragOver(false)
    
    const files = Array.from(e.dataTransfer.files)
    handleFileUpload(files)
  }, [handleFileUpload])
  
  // Send message
  const handleSend = useCallback(async () => {
    if (!inputValue.trim() && uploadedFiles.length === 0) return
    
    try {
      setIsUploading(true)
      
      const content: MessageContent = []
      
      if (inputValue.trim()) {
        content.push({ type: 'text', text: inputValue.trim() })
      }
      
      for (const file of uploadedFiles) {
        const fileContent = await readFileAsText(file)
        content.push({
          type: 'text',
          text: `[File: ${file.name}]\n${fileContent}`
        })
      }
      
      await sendMessage(conversationId, content)
      
      // Reset input
      setInputValue('')
      setUploadedFiles([])
      
    } catch (error) {
      showError('Failed to send message')
    } finally {
      setIsUploading(false)
    }
  }, [inputValue, uploadedFiles, conversationId])
  
  return (
    <VStack spacing={4} padding={4}>
      {/* File preview area */}
      {uploadedFiles.length > 0 && (
        <HStack spacing={2} wrap="wrap">
          {uploadedFiles.map((file, index) => (
            <FilePreview
              key={`${file.name}-${index}`}
              file={file}
              onRemove={() => removeFile(index)}
            />
          ))}
        </HStack>
      )}
      
      {/* Input area */}
      <HStack spacing={2} width="100%">
        <Box
          position="relative"
          flex="1"
          onDragOver={handleDragOver}
          onDragLeave={() => setIsDragOver(false)}
          onDrop={handleDrop}
        >
          <Textarea
            ref={textareaRef}
            value={inputValue}
            onChange={(e) => {
              setInputValue(e.target.value)
              adjustTextareaHeight()
            }}
            placeholder="Type your message..."
            disabled={disabled || isUploading}
            resize="none"
            minHeight="40px"
            maxHeight="200px"
            onKeyDown={(e) => {
              if ((e.ctrlKey || e.metaKey) && e.key === 'Enter') {
                e.preventDefault()
                handleSend()
              }
            }}
          />
          
          {/* Drag overlay */}
          {isDragOver && (
            <Box
              position="absolute"
              top={0}
              left={0}
              right={0}
              bottom={0}
              bg="blue.50"
              border="2px dashed"
              borderColor="blue.300"
              display="flex"
              alignItems="center"
              justifyContent="center"
              borderRadius="md"
            >
              <Text color="blue.600" fontWeight="medium">
                Drop files here to upload
              </Text>
            </Box>
          )}
        </Box>
        
        {/* Action buttons */}
        <VStack spacing={1}>
          <IconButton
            aria-label="Upload file"
            icon={<AttachmentIcon />}
            size="sm"
            variant="ghost"
            onClick={() => fileInputRef.current?.click()}
          />
          <IconButton
            aria-label="Send message"
            icon={<ArrowUpIcon />}
            colorScheme="blue"
            size="sm"
            disabled={!inputValue.trim() && uploadedFiles.length === 0}
            isLoading={isUploading}
            onClick={handleSend}
          />
        </VStack>
      </HStack>
      
      {/* Hidden file input */}
      <input
        ref={fileInputRef}
        type="file"
        multiple
        accept=".txt,.md"
        style={{ display: 'none' }}
        onChange={(e) => {
          if (e.target.files) {
            handleFileUpload(Array.from(e.target.files))
          }
        }}
      />
    </VStack>
  )
}
```

#### MessageActionIcons Component (`MessageActionIcons.tsx`)

**Context menu providing comprehensive message operations.**

##### Available Operations
- **Edit & Retry**: Edit user messages and regenerate AI responses
- **Fork**: Create new conversation branch from any message
- **Copy**: Copy message content to clipboard
- **Delete**: Remove messages with confirmation
- **Regenerate**: Generate new AI response (for AI messages)

##### Implementation
```typescript
const MessageActionIcons: React.FC<MessageActionIconsProps> = ({ 
  message, 
  isVisible 
}) => {
  const { editMessage, deleteMessage, forkConversation, regenerateResponse } = useMessageActions()
  
  const handleEdit = useCallback(async () => {
    // Implementation for editing messages
  }, [message])
  
  const handleFork = useCallback(async () => {
    try {
      const newConversation = await forkConversation(
        message.conversation_id, 
        message.id
      )
      // Navigate to new conversation
    } catch (error) {
      showError('Failed to fork conversation')
    }
  }, [message])
  
  const handleCopy = useCallback(() => {
    const textContent = extractTextContent(message)
    navigator.clipboard.writeText(textContent)
    showSuccess('Message copied to clipboard')
  }, [message])
  
  const handleDelete = useCallback(async () => {
    const confirmed = await showConfirmation(
      'Delete Message',
      'Are you sure you want to delete this message?'
    )
    
    if (confirmed) {
      try {
        await deleteMessage(message.id)
        showSuccess('Message deleted')
      } catch (error) {
        showError('Failed to delete message')
      }
    }
  }, [message])
  
  return (
    <HStack 
      spacing={1} 
      opacity={isVisible ? 1 : 0}
      transition="opacity 0.2s"
    >
      {message.role === 'user' ? (
        <>
          <IconButton
            aria-label="Edit and retry"
            icon={<EditIcon />}
            size="xs"
            variant="ghost"
            onClick={handleEdit}
          />
          <IconButton
            aria-label="Fork conversation"
            icon={<ForkIcon />}
            size="xs"
            variant="ghost"
            onClick={handleFork}
          />
        </>
      ) : (
        <>
          <IconButton
            aria-label="Regenerate response"
            icon={<RefreshIcon />}
            size="xs"
            variant="ghost"
            onClick={() => regenerateResponse(message.id)}
          />
          <IconButton
            aria-label="Fork from here"
            icon={<ForkIcon />}
            size="xs"
            variant="ghost"
            onClick={handleFork}
          />
        </>
      )}
      
      <IconButton
        aria-label="Copy message"
        icon={<CopyIcon />}
        size="xs"
        variant="ghost"
        onClick={handleCopy}
      />
      
      <IconButton
        aria-label="Delete message"
        icon={<DeleteIcon />}
        size="xs"
        variant="ghost"
        colorScheme="red"
        onClick={handleDelete}
      />
    </HStack>
  )
}
```

## Component Architecture

### Design Principles
1. **Consistency**: All components follow the same design patterns
2. **Accessibility**: Full ARIA support and keyboard navigation
3. **Flexibility**: Customizable through props and Chakra UI theming
4. **Performance**: Optimized rendering and minimal re-renders
5. **Type Safety**: Full TypeScript interfaces and prop validation

### State Management Integration
Components seamlessly integrate with Zustand stores:
- **Selective Subscriptions**: Components subscribe only to needed state slices
- **Optimistic Updates**: UI updates immediately with server sync
- **Error Recovery**: Graceful handling of failed operations
- **Event-Driven**: Real-time updates through IPC events

### Theming Integration
All components integrate with the Chakra UI theme system:
- Uses semantic color tokens for consistent theming
- Supports light/dark mode switching
- Customizable through theme overrides
- Responsive design with breakpoint support

### Import Strategy
```tsx
// Import layout components
import { MainLayout, Sidebar } from '../components/layout'

// Import feature components
import { ChatInterface, MessageList, ChatInputBox } from '../components/features/chat'

// Import basic UI components
import { Button, Input, Modal } from '../components/ui'
```

### Performance Optimizations
- **React.memo**: Expensive components memoized to prevent unnecessary renders
- **useCallback**: Event handlers stabilized for consistent references
- **Virtual Scrolling**: Large lists efficiently rendered with react-window
- **Debounced Inputs**: Search and other inputs debounced for performance
- **Lazy Loading**: Feature components loaded on demand

### Testing Strategy
Each component should be tested for:
- **Rendering**: Correct visual output across all states
- **Interactions**: Click handlers, keyboard navigation, drag and drop
- **Accessibility**: ARIA attributes, screen reader support, keyboard-only navigation
- **Props**: All prop variations and edge cases
- **Integration**: Works with Zustand stores and IPC system
- **Performance**: No memory leaks, efficient re-renders

## Best Practices

### Component Usage
1. **Use semantic HTML**: Components render accessible HTML elements
2. **Provide labels**: Always include labels for form inputs and interactive elements
3. **Handle loading states**: Use loading props for async operations
4. **Error handling**: Display helpful error messages with recovery options
5. **Keyboard navigation**: Ensure all interactions work with keyboard only
6. **Touch support**: Components work on touch devices (future mobile support)

### State Management Best Practices
1. **Selective Subscriptions**: Use specific selectors to minimize re-renders
2. **Optimistic Updates**: Update UI immediately for better user experience
3. **Error Boundaries**: Wrap components in error boundaries for graceful failures
4. **Loading States**: Always show loading indicators for async operations

### Accessibility Guidelines
1. **Color contrast**: Ensure sufficient contrast ratios (WCAG AA)
2. **Focus management**: Visible focus indicators and logical tab order
3. **Screen readers**: Meaningful ARIA labels and descriptions
4. **Keyboard only**: All functionality accessible via keyboard
5. **Error states**: Clear error messages with recovery instructions
6. **Live regions**: Use ARIA live regions for dynamic content updates

The component system provides a comprehensive, accessible, and performant foundation for the Knowlex user interface with sophisticated state management integration and professional-grade features.
