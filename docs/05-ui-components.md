# UI Components Documentation

This documentation covers the basic UI components implemented for the Knowlex desktop application. All components are built with React, TypeScript, and Chakra UI, providing consistent styling, accessibility, and functionality.

## Overview

The UI component library is located in `src/renderer/src/components/ui/`. It includes:
- **Button**: `Button.tsx` - Multi-variant button with loading states
- **Input**: `Input.tsx` - Form input with validation and error handling
- **Modal**: `Modal.tsx` - Overlay component for dialogs and forms
- **FileCard**: `FileCard.tsx` - File display component with action buttons
- **MessageBubble**: `MessageBubble.tsx` - Chat message component with multi-part content

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

## Component Architecture

### Design Principles
1. **Consistency**: All components follow the same design patterns
2. **Accessibility**: Full ARIA support and keyboard navigation
3. **Flexibility**: Customizable through props and Chakra UI theming
4. **Performance**: Optimized rendering and minimal re-renders
5. **Type Safety**: Full TypeScript interfaces and prop validation

### Theming Integration
All components integrate with the Chakra UI theme system:
- Uses semantic color tokens for consistent theming
- Supports light/dark mode switching
- Customizable through theme overrides
- Responsive design with breakpoint support

### Import Strategy
```tsx
// Import specific components from `src/renderer/src/components/ui/index.ts`
import { Button, Input, Modal } from '../components/ui'

// Or import everything
import * as UI from '../components/ui'
```

### Testing Strategy
Each component should be tested for:
- **Rendering**: Correct visual output
- **Interactions**: Click handlers, keyboard navigation
- **Accessibility**: ARIA attributes, screen reader support
- **Props**: All prop variations and edge cases
- **Integration**: Works with form libraries and state management

## Best Practices

### Component Usage
1. **Use semantic HTML**: Components render accessible HTML elements
2. **Provide labels**: Always include labels for form inputs
3. **Handle loading states**: Use loading props for async operations
4. **Error handling**: Display helpful error messages
5. **Keyboard navigation**: Ensure all interactions work with keyboard

### Performance Optimization
1. **Memoization**: Use React.memo for expensive renders
2. **Event handlers**: Use useCallback for stable references
3. **Large lists**: Implement virtualization for many items
4. **Bundle size**: Import only needed components

### Accessibility Guidelines
1. **Color contrast**: Ensure sufficient contrast ratios
2. **Focus management**: Visible focus indicators
3. **Screen readers**: Meaningful ARIA labels and descriptions
4. **Keyboard only**: All functionality accessible via keyboard
5. **Error states**: Clear error messages and recovery options
