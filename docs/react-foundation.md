# React Application Foundation - Task 13 Documentation

## Overview

This document describes the React application foundation implemented for Knowlex Desktop Application, including the theme system, state management, dual window architecture, and application initialization.

## Architecture Overview

The React application foundation follows these design principles:

- **Dual Window Support**: Separate MainApp and DebugApp components for main interface and debugging
- **Custom Theme System**: Comprehensive Chakra UI theme with semantic tokens and component variants
- **Global State Management**: Zustand-based stores with persistence and type safety
- **Error Boundaries**: Robust error handling with fallback UI and recovery mechanisms
- **Progressive Enhancement**: Graceful loading states and initialization flows

## File Structure

```
src/renderer/src/
├── main.tsx                    # Application entry point with error boundaries
├── App.tsx                     # Main routing and initialization logic
├── utils/theme/               # Theme configuration
│   ├── index.ts               # Main theme export
│   ├── colors.ts              # Color palette and semantic tokens
│   ├── fonts.ts               # Font system configuration
│   ├── breakpoints.ts         # Responsive design breakpoints
│   ├── shadows.ts             # Shadow system for depth
│   ├── components.ts          # Component-specific theme overrides
│   └── colorMode.ts          # Color mode management (light/dark/system)
├── stores/                    # Global state management
│   ├── index.ts               # Store exports and initialization
│   ├── app.ts                 # Application-level state (theme, sidebar, etc.)
│   ├── project.ts             # Project management state
│   ├── conversation.ts        # Conversation and message state
│   └── settings.ts            # Application settings state
└── pages/
    ├── MainApp.tsx           # Main application interface
    └── DebugApp.tsx          # Development debugging interface
```

## Theme System

### Color System

The theme system provides a comprehensive color palette with semantic tokens for consistent theming:

```typescript
// Brand colors
primary: Forest Green theme (main brand)
secondary: Blue accent color
accent: Purple highlight color

// Semantic colors
background.primary: Adapts to light/dark mode
surface.primary: Component backgrounds
text.primary: Main text color
border.primary: Border colors
```

### Responsive Breakpoints

```typescript
xs: '480px'    // Small phones
sm: '768px'    // Tablets  
md: '992px'    // Small desktop
lg: '1200px'   // Large desktop
xl: '1400px'   // Extra large desktop
2xl: '1600px'  // Ultra wide screens
```

### Component Variants

All Chakra UI components are customized with:
- Consistent border radius and spacing
- Hover and focus states
- Light/dark mode adaptations
- Custom variants for specific use cases (file cards, project cards, etc.)

### Color Mode Management

The theme supports three color modes:
- `light`: Light theme
- `dark`: Dark theme  
- `system`: Follows system preference

Color mode is managed by:
- `ThemeManager` class for cross-window synchronization
- localStorage persistence
- System theme change detection
- Automatic updates across all components

## State Management

### Store Architecture

The application uses Zustand with the following stores:

#### App Store (`useAppStore`)
- UI state (theme, language, sidebar)
- Application status (initialized, online)
- Window mode (main/debug)
- Fullscreen state

```typescript
// Example usage
const { theme, setTheme } = useTheme()
const { showSidebar, toggleSidebar } = useSidebar()
```

#### Project Store (`useProjectStore`)  
- Project CRUD operations
- File management
- Project memory and notes
- Loading and error states

```typescript
// Example usage
const { projects, createProject } = useProjects()
const { currentProject } = useCurrentProject()
```

#### Conversation Store (`useConversationStore`)
- Conversation management
- Message operations
- Streaming support
- Session settings

```typescript
// Example usage
const { conversations } = useConversations()
const { sendMessage, isStreaming } = useMessageActions()
```

#### Settings Store (`useSettingsStore`)
- API provider configurations
- General application settings  
- Keyboard shortcuts
- Advanced preferences

```typescript
// Example usage
const { providers, testProvider } = useAPIProviders()
const { saveSettings, hasUnsavedChanges } = useSettingsActions()
```

### Persistence

Stores use localStorage persistence for user preferences:
- App store: theme, language, sidebar preferences
- Settings store: general settings, keyboard shortcuts
- Session data is not persisted (conversations, messages)

## Dual Window Architecture

The application supports two window modes:

### Main Window (`MainApp`)
- Default application interface
- User-facing features and functionality
- Route: `/` (default)

### Debug Window (`DebugApp`)
- Development and testing interface
- System information and diagnostics
- IPC testing tools
- Route: `/?mode=debug`

### Window Mode Detection

```typescript
// URL-based window mode detection
const urlParams = new URLSearchParams(window.location.search)
const mode = urlParams.get('mode')
const windowMode = mode === 'debug' ? 'debug' : 'main'
```

## Application Initialization

### Initialization Flow

1. **Theme Setup**: ColorModeScript loads before React
2. **Store Initialization**: Async loading of user settings
3. **Window Mode Detection**: URL parameter parsing
4. **Error Boundaries**: Wrap entire application
5. **Component Rendering**: Route to appropriate app component

### Error Handling

The application includes comprehensive error handling:

#### React Error Boundary
- Catches React component errors
- Shows user-friendly error interface
- Provides error details and retry functionality
- Logs errors for debugging

#### Initialization Error Handling
- Store initialization failures
- Settings loading errors
- Recovery mechanisms with retry buttons

#### Store Error States
- Individual error states per store
- User-friendly error messages
- Clear error recovery actions

### Loading States

Progressive loading ensures good user experience:

1. **Initial Load**: Spinner with "Loading Knowlex..." message
2. **Store Initialization**: Async settings and data loading
3. **Component Suspense**: Lazy-loaded components with fallbacks
4. **Error States**: Clear error messages with recovery options

## Development Features

### Debug Mode

The debug interface (`DebugApp`) provides:

- **System Information**: Platform details, browser info, online status
- **IPC Testing**: Test communication with main process
- **Database Status**: Connection health and schema information  
- **AI Models**: Configuration testing and health checks
- **Performance**: Memory usage and performance metrics

### Hot Reload Support

The development setup supports:
- React Fast Refresh for instant updates
- Theme changes without page reload
- Store state preservation during development
- Automatic error recovery

## Usage Examples

### Theme Usage

```typescript
// Using semantic tokens
<Box bg="background.primary" color="text.primary">
  Content adapts to light/dark mode
</Box>

// Using theme colors
<Button colorScheme="primary" variant="solid">
  Uses brand green color
</Button>
```

### State Management

```typescript
// App-level state
function MyComponent() {
  const { theme, setTheme } = useTheme()
  const { showSidebar, toggleSidebar } = useSidebar()
  
  return (
    <VStack>
      <Button onClick={() => setTheme('dark')}>
        Switch to Dark Mode
      </Button>
      <Button onClick={toggleSidebar}>
        Toggle Sidebar
      </Button>
    </VStack>
  )
}

// Project management
function ProjectManager() {
  const { projects, isLoading } = useProjects()
  const { createProject } = useProjectActions()
  
  const handleCreate = async () => {
    await createProject({ name: 'New Project' })
  }
  
  if (isLoading) return <Spinner />
  
  return (
    <VStack>
      {projects.map(project => (
        <Text key={project.id}>{project.name}</Text>
      ))}
      <Button onClick={handleCreate}>Create Project</Button>
    </VStack>
  )
}
```

### Error Boundaries

```typescript
// Custom error boundary
<ErrorBoundary
  FallbackComponent={ErrorFallback}
  onError={(error, errorInfo) => {
    console.error('Error:', error, errorInfo)
  }}
  onReset={() => window.location.reload()}
>
  <MyComponent />
</ErrorBoundary>
```

## Best Practices

### Theme Usage
- Always use semantic tokens (`background.primary`) over direct colors
- Leverage component variants for consistent styling
- Test both light and dark modes during development

### State Management
- Use specific hooks (`useTheme`, `useProjects`) over general store access
- Handle loading and error states appropriately
- Avoid storing temporary UI state in global stores

### Error Handling
- Always provide fallback UI for error states
- Include actionable recovery options (retry buttons)
- Log errors appropriately for debugging

### Performance
- Use React.memo for expensive components
- Leverage Suspense for code splitting
- Minimize store subscriptions to only needed data

## Testing

### Build Validation
```bash
pnpm build  # Validates TypeScript and builds application
```

### Development Testing
```bash
pnpm dev    # Starts development server with hot reload
```

### Store Testing
The stores can be tested independently:
```typescript
// Test store actions
const store = useAppStore.getState()
store.setTheme('dark')
expect(store.theme).toBe('dark')
```

## Troubleshooting

### Common Issues

1. **Theme not applying**: Check ColorModeScript placement in main.tsx
2. **Store persistence not working**: Verify localStorage is available
3. **Component not re-rendering**: Ensure proper store subscription
4. **Build errors**: Check import paths and TypeScript types

### Debug Mode

Use the debug interface (`/?mode=debug`) to:
- Inspect system information
- Test IPC communication  
- Verify store states
- Monitor application health

## Future Enhancements

The foundation is designed to support future enhancements:

- **Plugin System**: Theme can be extended with custom components
- **Multi-language**: Translation system ready for i18n integration
- **Advanced Theming**: Custom CSS variable support
- **Performance Monitoring**: Built-in performance tracking
- **Accessibility**: ARIA support and keyboard navigation

## Dependencies

### Core Dependencies
- `@chakra-ui/react`: UI component library
- `zustand`: State management
- `react-error-boundary`: Error handling
- `immer`: Immutable state updates

### Theme Dependencies
- `@emotion/react`: CSS-in-JS styling
- `framer-motion`: Animation support

This React foundation provides a robust, scalable base for building the Knowlex Desktop Application with excellent developer experience and user interface quality.