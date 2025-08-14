# Renderer Process Architecture

This document provides comprehensive documentation for the renderer process architecture in Knowlex Desktop. The renderer process implements the user interface using React, TypeScript, Chakra UI, and Zustand for state management.

## Architecture Overview

The renderer process implements a **modern React application architecture** with clear separation of concerns:

```
┌─────────────────────────────────────┐
│        Application Layer            │
│   main.tsx, App.tsx, index.html     │
│    Bootstrap & Entry Points         │
├─────────────────────────────────────┤
│         State Layer                 │
│   stores/ - Zustand State Mgmt     │
│  App, Project, Conversation, Set    │
├─────────────────────────────────────┤
│       Component Layer               │
│  components/ - React Components     │
│  Layout, Features, UI Components    │
├─────────────────────────────────────┤
│     Theming & Utils Layer           │
│  theme/ - Chakra UI Customization  │
│  utils/ - Helper Functions          │
└─────────────────────────────────────┖
```

## Application Layer

### React Application Bootstrap (`main.tsx`)

**File:** `src/renderer/src/main.tsx`

**Responsibilities:**
- React 18 application mounting with modern rendering
- Chakra UI provider setup with custom theme
- Global error boundary implementation
- Theme initialization and color mode script

**Implementation:**
```typescript
// React 18 concurrent rendering
const root = createRoot(container)
root.render(
  <StrictMode>
    <ChakraProvider theme={theme}>
      <ColorModeScript initialColorMode={theme.config.initialColorMode} />
      <ErrorBoundary>
        <App />
      </ErrorBoundary>
    </ChakraProvider>
  </StrictMode>
)
```

**Features:**
- **Error Boundaries**: Comprehensive error handling with user-friendly fallbacks
- **Strict Mode**: Development mode safety checks enabled
- **Theme Integration**: Complete Chakra UI theme system setup
- **Performance**: Uses React 18's concurrent features

### Main Application Component (`App.tsx`)

**File:** `src/renderer/src/App.tsx`

**Dual-Window Architecture:**
The application supports two distinct interfaces based on URL parameters:

```typescript
const queryParams = new URLSearchParams(window.location.search)
const mode = queryParams.get('mode')

// Route to appropriate application interface
switch (mode) {
  case 'debug':
    return <DebugApp />
  default:
    return <MainApp />
}
```

**Window Configurations:**
- **MainApp**: Primary user interface for chat and project management
- **DebugApp**: Development-focused interface for diagnostics (currently disabled)

**Store Initialization:**
```typescript
// Centralized store initialization
const initializeStores = () => {
  // Initialize all Zustand stores
  useAppStore.getState().initialize()
  useProjectStore.getState().loadProjects()
  useConversationStore.getState().loadConversations()
  useSettingsStore.getState().loadSettings()
}
```

### HTML Entry Point (`index.html`)

**File:** `src/renderer/index.html`

**Security Configuration:**
- **Content Security Policy**: Restrictive CSP for enhanced security
- **Module Loading**: ES modules with TypeScript entry point
- **Electron Integration**: Meta tags for Electron compatibility

## State Management Layer (Zustand)

### App Store (`stores/app.ts`)

**File:** `src/renderer/src/stores/app.ts`

**State Management:**
```typescript
interface AppState {
  // Theme management
  theme: 'light' | 'dark' | 'system'
  colorMode: 'light' | 'dark'
  
  // UI state
  sidebarWidth: number
  isFullscreen: boolean
  windowMode: 'main' | 'debug'
  
  // Network status
  isOnline: boolean
  
  // Actions
  setTheme: (theme: Theme) => void
  toggleSidebar: () => void
  setWindowMode: (mode: WindowMode) => void
}
```

**Key Features:**
- **Theme Synchronization**: Cross-window theme coordination using `themeManager`
- **Persistence**: Selective localStorage persistence for user preferences
- **Network Detection**: Online/offline status monitoring
- **Window Management**: Support for dual-window Electron architecture

**Theme Manager Integration:**
```typescript
// Advanced theme coordination across windows
const themeManager = new ThemeManager()
themeManager.subscribe((newMode) => {
  set({ colorMode: newMode })
})
```

### Conversation Store (`stores/conversation.ts`)

**File:** `src/renderer/src/stores/conversation.ts`

**Complex State Management:**
```typescript
interface ConversationState {
  // Data state
  conversations: Conversation[]
  currentConversationId: string | null
  currentMessages: Message[]
  
  // Real-time state
  isStreaming: boolean
  streamingMessage: Message | null
  
  // Pending state
  pendingConversation: PendingConversation | null
  
  // UI state
  isLoading: boolean
  error: string | null
}
```

**Advanced Features:**
- **Pending Conversations**: Temporary conversations before first AI response
- **Streaming Support**: Real-time message updates during AI generation
- **Event-Driven Updates**: IPC event listeners for title generation
- **Optimistic Updates**: Immediate UI updates with server synchronization

**Message Management:**
```typescript
// Optimistic message handling
const sendMessage = async (content: MessageContent[]) => {
  // Immediate UI update
  const tempMessage = createOptimisticMessage(content)
  addMessageToConversation(tempMessage)
  
  try {
    // Server synchronization
    const response = await window.electronAPI.conversation.sendMessage({
      conversationId: currentConversationId,
      content
    })
    
    // Update with server response
    updateMessage(tempMessage.id, response.message)
  } catch (error) {
    // Rollback on failure
    removeMessage(tempMessage.id)
    showError('Failed to send message')
  }
}
```

### Project Store (`stores/project.ts`)

**File:** `src/renderer/src/stores/project.ts`

**Project Management:**
```typescript
interface ProjectState {
  // Core data
  projects: Project[]
  currentProject: Project | null
  
  // File management
  projectFiles: ProjectFile[]
  uploadProgress: Record<string, number>
  
  // Memory & notes
  projectMemories: ProjectMemory[]
  projectNotes: ProjectNote[]
  
  // Statistics
  projectStats: Record<string, ProjectStats>
  
  // UI state
  isLoading: boolean
  error: string | null
}
```

**File Management Integration:**
```typescript
const uploadFiles = async (projectId: string, files: File[]) => {
  const uploadPromises = files.map(async (file) => {
    try {
      // Track upload progress
      set((state) => ({
        uploadProgress: { ...state.uploadProgress, [file.name]: 0 }
      }))
      
      const result = await window.electronAPI.project.uploadFile({
        projectId,
        file,
        onProgress: (progress) => {
          set((state) => ({
            uploadProgress: { ...state.uploadProgress, [file.name]: progress }
          }))
        }
      })
      
      return result
    } finally {
      // Cleanup progress tracking
      set((state) => {
        const newProgress = { ...state.uploadProgress }
        delete newProgress[file.name]
        return { uploadProgress: newProgress }
      })
    }
  })
  
  const results = await Promise.allSettled(uploadPromises)
  await refreshProjectFiles(projectId)
}
```

### Settings Store (`stores/settings.ts`)

**File:** `src/renderer/src/stores/settings.ts`

**Configuration Management:**
```typescript
interface SettingsState {
  // API providers
  apiProviders: {
    openai: OpenAIConfig
    claude: ClaudeConfig
    // ... other providers
  }
  
  // Application settings
  general: {
    language: string
    theme: 'light' | 'dark' | 'system'
    autoSave: boolean
  }
  
  // Keyboard shortcuts
  shortcuts: Record<string, string>
  
  // Advanced settings
  advanced: {
    debugMode: boolean
    maxMessageLength: number
    cacheSize: number
  }
}
```

**Validation System:**
```typescript
// Comprehensive settings validation
const validateSettings = (settings: Partial<Settings>): ValidationResult => {
  const errors: string[] = []
  
  // API key validation
  if (settings.apiProviders?.openai?.apiKey) {
    if (!isValidApiKey(settings.apiProviders.openai.apiKey)) {
      errors.push('Invalid OpenAI API key format')
    }
  }
  
  // Configuration testing
  const testConfiguration = async (config: APIConfig) => {
    try {
      await window.electronAPI.settings.testConnection(config)
      return { valid: true }
    } catch (error) {
      return { valid: false, error: error.message }
    }
  }
  
  return { valid: errors.length === 0, errors }
}
```

## Component Architecture

### Layout Components

#### MainLayout (`components/layout/MainLayout.tsx`)

**File:** `src/renderer/src/components/layout/MainLayout.tsx`

**Layout Structure:**
```typescript
const MainLayout: React.FC<MainLayoutProps> = ({ children }) => {
  return (
    <Flex h="100vh" direction="row">
      {/* Draggable region for Electron window controls */}
      <Box className="draggable-region" />
      
      {/* Sidebar with resize capability */}
      <Sidebar 
        width={sidebarWidth}
        onResize={handleSidebarResize}
      />
      
      {/* Main content area */}
      <Box flex="1" overflow="hidden">
        {children}
      </Box>
    </Flex>
  )
}
```

**Electron Integration:**
- **Draggable Regions**: Native window dragging support
- **Window Controls**: Platform-specific title bar integration
- **Resize Handling**: Sidebar resize with persistence

#### Sidebar (`components/layout/Sidebar.tsx`)

**File:** `src/renderer/src/components/layout/Sidebar.tsx`

**Advanced Navigation System (760+ lines):**

**Features:**
- **Project Tree**: Expandable project hierarchy with conversation lists
- **Search Functionality**: Real-time search with highlighting
- **Context Actions**: Rename, delete, move operations with confirmation
- **Keyboard Navigation**: Full keyboard accessibility
- **Virtual Scrolling**: Performance optimization for large lists
- **Hover States**: Interactive hover menus for quick actions

**Implementation Highlights:**
```typescript
// Virtual scrolling for performance
const VirtualizedConversationList = memo(({ conversations, height }) => {
  return (
    <FixedSizeList
      height={height}
      itemCount={conversations.length}
      itemSize={CONVERSATION_ITEM_HEIGHT}
      itemData={conversations}
    >
      {ConversationItem}
    </FixedSizeList>
  )
})

// Optimized search with debouncing
const [searchTerm, setSearchTerm] = useState('')
const [filteredItems, setFilteredItems] = useState([])

const debouncedSearch = useMemo(
  () => debounce((term: string) => {
    const filtered = items.filter(item =>
      item.title.toLowerCase().includes(term.toLowerCase())
    )
    setFilteredItems(filtered)
  }, 300),
  [items]
)
```

### Feature Components

#### Chat Components (`components/features/chat/`)

**ChatInterface (`ChatInterface.tsx`):**
- **Multi-State Interface**: Welcome, loading, conversation, and error states
- **Layout Management**: Proper overflow handling and responsive design
- **Integration**: Seamless connection with conversation store

**Component Variants:**
```typescript
// Different input modes based on context
const getInputVariant = (conversationId: string | null) => {
  if (!conversationId) {
    return 'main-entrance' // Large, prominent input for new conversations
  }
  return 'conversation' // Compact input for ongoing conversations
}
```

### UI Components

#### Base Component System (`components/ui/`)

**Component Catalog:**
- **Button**: Multi-variant button system with loading states
- **Input**: Form input with validation and helper text
- **Modal**: Flexible modal system with proper focus management
- **MessageBubble**: Complex message rendering with multi-part content
- **FileCard**: File display with status indicators and actions

**Design Principles:**
- **Composition**: Components built for composition and reuse
- **Accessibility**: Full ARIA support and keyboard navigation
- **Theme Integration**: Deep integration with Chakra UI theme system
- **TypeScript**: Complete type safety with proper interfaces

## Theming System

### Theme Configuration (`utils/theme/`)

**Comprehensive Theme System:**

#### Color Tokens (`colors.ts`)
```typescript
// Semantic color tokens for consistency
export const semanticTokens = {
  colors: {
    background: {
      primary: { default: 'white', _dark: 'gray.900' },
      secondary: { default: 'gray.50', _dark: 'gray.800' },
      tertiary: { default: 'gray.100', _dark: 'gray.700' }
    },
    text: {
      primary: { default: 'gray.900', _dark: 'white' },
      secondary: { default: 'gray.600', _dark: 'gray.300' },
      muted: { default: 'gray.500', _dark: 'gray.400' }
    },
    border: {
      default: { default: 'gray.200', _dark: 'gray.600' },
      hover: { default: 'gray.300', _dark: 'gray.500' }
    }
  }
}
```

#### Component Overrides (`components.ts`)
```typescript
// Custom component styling
export const components = {
  Button: {
    variants: {
      danger: {
        bg: 'red.500',
        color: 'white',
        _hover: { bg: 'red.600' }
      }
    }
  },
  
  Modal: {
    baseStyle: {
      dialog: {
        bg: 'background.primary'
      }
    }
  }
}
```

#### Theme Manager (`colorMode.ts`)
```typescript
// Advanced theme coordination
class ThemeManager {
  private subscribers = new Set<(mode: ColorMode) => void>()
  private mediaQuery: MediaQueryList
  
  constructor() {
    this.mediaQuery = window.matchMedia('(prefers-color-scheme: dark)')
    this.mediaQuery.addEventListener('change', this.handleSystemThemeChange)
    
    // Cross-window synchronization
    window.addEventListener('storage', this.handleStorageChange)
  }
  
  // Subscribe to theme changes
  subscribe(callback: (mode: ColorMode) => void) {
    this.subscribers.add(callback)
    return () => this.subscribers.delete(callback)
  }
  
  // Proper cleanup
  cleanup() {
    this.mediaQuery.removeEventListener('change', this.handleSystemThemeChange)
    window.removeEventListener('storage', this.handleStorageChange)
  }
}
```

## Utilities & Helpers

### Time Formatting (`utils/time.ts`)

**File:** `src/renderer/src/utils/time.ts`

**Relative Time Formatting:**
```typescript
export const formatRelativeTime = (timestamp: string): string => {
  const now = Date.now()
  const time = new Date(timestamp).getTime()
  const diff = now - time
  
  // Smart time formatting
  if (diff < MINUTE) return 'Just now'
  if (diff < HOUR) return `${Math.floor(diff / MINUTE)}m ago`
  if (diff < DAY) return `${Math.floor(diff / HOUR)}h ago`
  if (diff < WEEK) return `${Math.floor(diff / DAY)}d ago`
  
  // Absolute dates for older content
  return new Date(timestamp).toLocaleDateString()
}
```

### Mock Data System (`utils/mockData.ts`)

**File:** `src/renderer/src/utils/mockData.ts`

**Development Data Generation:**
- **Realistic Projects**: 5 diverse sample projects with statistics
- **Conversation Variety**: 18 conversations with varied timestamps
- **Edge Cases**: Empty states, high volume, recent/stale content
- **Time Distribution**: Strategic timestamp distribution for testing

## Implementation Status

### ✅ Fully Implemented

**Core Architecture:**
- **React 18 Bootstrap**: Modern React setup with concurrent features
- **State Management**: Complete Zustand stores with persistence
- **Theme System**: Comprehensive Chakra UI customization with theme manager
- **Layout Components**: MainLayout and feature-complete Sidebar (760+ lines)
- **Error Handling**: Global error boundaries and error states
- **Mock Data**: Complete development data system

**UI Components:**
- **Base Components**: Button, Input, Modal, FileCard, MessageBubble
- **Chat Components**: ChatInterface, MessageList, ChatInputBox, FilePreview, MessageActionIcons, MessageEditModal
- **Application Pages**: MainApp, DebugApp (dual-window architecture)

**Advanced Features:**
- **Dual-Window Support**: Infrastructure for main/debug windows
- **Cross-Window Theme Sync**: Advanced theme coordination
- **Virtual Scrolling**: Performance optimization for large lists
- **Optimistic Updates**: Real-time UI with server synchronization

### 🚧 Partially Implemented

**State Integration:**
- **Store Methods**: Reference `window.electronAPI` but need full IPC integration
- **Event Handlers**: Event listeners prepared but need main process connection

**Routing:**
- **Page Structure**: Uses URL parameter-based routing (`?mode=debug`) instead of TanStack Router

### ❌ Missing Implementation

**Component Layers:**
1. **Custom Hooks**: `hooks/` directory exists but is completely empty
   - `useIPC.ts` - IPC communication abstraction
   - `useChat.ts` - Chat functionality
   - `useFiles.ts` - File management
   - `useSearch.ts` - Search functionality

2. **Feature Components**:
   - **Settings Components**: `components/features/settings/` directory missing
   - **Project Components**: `components/features/project/` directory missing

3. **Utils**:
   - **Missing Utils**: `format.ts`, `constants.ts` (documented but don't exist)
   - **Existing Utils**: `time.ts`, `mockData.ts`, complete `theme/` system

4. **Internationalization**:
   - **i18next**: Dependency installed but not integrated
   - **Language Support**: No language switching implemented

## Architecture Strengths

### Modern React Patterns
- **React 18**: Concurrent features and modern rendering
- **Proper Error Boundaries**: Comprehensive error handling
- **Performance Optimizations**: Virtual scrolling and memoization
- **TypeScript Integration**: Strong type safety throughout

### State Management Excellence
- **Zustand with Immer**: Clean immutable updates
- **Selective Subscriptions**: Performance-optimized re-renders
- **Event-Driven Architecture**: Real-time updates with IPC events
- **Proper Async Handling**: Loading states and error recovery

### Electron Integration
- **Security First**: Proper context isolation and CSP
- **Native Feel**: Draggable regions and platform adaptation
- **Dual-Window Architecture**: Support for main/debug interfaces
- **Theme Synchronization**: Advanced cross-window coordination

### Developer Experience
- **Comprehensive Types**: Full TypeScript coverage
- **Clear Organization**: Logical component and state separation
- **Error Feedback**: User-friendly error messages and recovery
- **Mock Data**: Rich development data for testing

## Recommendations

### Short-term Priorities
1. **Complete Chat Components**: Finish Tasks 17-19 implementation
2. **IPC Integration**: Connect stores to main process via `window.electronAPI`
3. **Custom Hooks**: Implement reusable logic patterns
4. **Settings Pages**: Build configuration UI

### Medium-term Enhancements
1. **Routing System**: Implement TanStack Router for page navigation
2. **Project Components**: Build project management interface
3. **File Management**: Implement file upload and RAG processing UI
4. **Internationalization**: Add i18next integration

### Architecture Improvements
1. **Testing Integration**: Add component tests with existing Testing Library setup
2. **Performance Monitoring**: Add React DevTools Profiler integration
3. **Accessibility Auditing**: Comprehensive accessibility testing
4. **Bundle Optimization**: Code splitting and lazy loading

## Security Considerations

### Content Security Policy
- **Restrictive CSP**: Prevents XSS and code injection
- **Trusted Sources**: Only allows necessary external resources
- **Inline Script Prevention**: No inline scripts allowed

### State Security
- **Input Validation**: All user inputs validated before state updates
- **XSS Prevention**: Proper content sanitization in MessageBubble
- **Local Storage**: Sensitive data excluded from persistence

### IPC Security
- **Context Isolation**: Complete process separation
- **Validated Communication**: All IPC calls validated
- **Error Handling**: No sensitive information in error messages

The renderer process architecture demonstrates excellent modern React practices with sophisticated state management, comprehensive theming, and thoughtful Electron integration. The foundation is solid for completing the remaining UI features and connecting to the main process functionality.