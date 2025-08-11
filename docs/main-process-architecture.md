# Main Process Architecture

This document describes the architecture and implementation of Knowlex's Electron main process, which handles application lifecycle, window management, system integration, and secure IPC communication.

## Architecture Overview

The main process follows a modular design with clear separation of concerns:

```
src/main/
├── main.ts          # Application lifecycle and initialization
├── window.ts        # Window creation and management
├── menu.ts          # Application and context menus
├── preload.ts       # Secure IPC bridge implementation
└── index.ts         # Entry point (re-exports main.ts)
```

## Core Components

### 1. Application Lifecycle Management (`main.ts`)

The `Application` class manages the entire application lifecycle with the following responsibilities:

**Key Features:**
- **Singleton Pattern**: Global application instance for centralized management
- **Dual Window Architecture**: Supports main application and debug windows
- **Security First**: Implements web security best practices
- **Platform Abstraction**: Handles macOS, Windows, and Linux differences

**API Methods:**
- `initialize()`: Sets up application, menus, and creates windows
- `getMainWindow()`: Returns reference to main application window
- `getDebugWindow()`: Returns reference to debug window (dev only)

**Security Measures:**
- Prevents new window creation via `web-contents-created` event
- Blocks external navigation attempts
- Implements Content Security Policy

### 2. Window Management (`window.ts`)

Provides comprehensive window creation and management capabilities.

**Window Types:**
- **Main Window**: Primary application interface (1200x800, min 800x600)
- **Debug Window**: Development console (1400x900, min 1000x700)

**Key Features:**
- **Smart Positioning**: Debug window auto-positions beside main window
- **Theme Integration**: Automatic system theme detection and adaptation
- **Security Configuration**: Sandboxed, context-isolated web preferences
- **External Link Handling**: Opens external URLs in default browser
- **Focus Management**: Sends focus/blur events to renderer

**WindowManager Utilities:**
- `minimizeWindow()`: Minimize window
- `maximizeWindow()`: Toggle maximize/restore
- `toggleFullscreen()`: Enter/exit fullscreen mode
- `centerWindow()`: Center window on screen
- `setWindowSize()`: Resize and center window
- `setAlwaysOnTop()`: Toggle always-on-top behavior

### 3. Menu System (`menu.ts`)

Implements native application menus with platform-specific adaptations.

**Menu Structure:**
- **App Menu** (macOS): About, Services, Hide/Quit
- **File Menu**: New Chat/Project, Import/Export, Preferences
- **Edit Menu**: Standard editing operations with platform differences
- **View Menu**: Sidebar, Search, Zoom, Developer Tools
- **Window Menu**: Minimize, Close, Bring to Front (macOS)
- **Help Menu**: About, Shortcuts, Documentation, Issue Reporting

**Context Menus:**
- **Message Context Menu**: Copy, Edit & Retry, Regenerate, Fork, Delete
- **File Context Menu**: Open, Show in Folder, Reprocess, Remove

**Menu Action System:**
All menu actions are transmitted to the renderer via IPC events:
- `menu-action` channel for application menu actions
- `context-menu-action` channel for context menu actions

### 4. IPC Bridge (`preload.ts`)

Secure communication bridge between main and renderer processes.

**Security Architecture:**
- **Context Isolation**: Uses `contextBridge` for secure API exposure
- **Type Safety**: Full TypeScript interfaces for all IPC operations
- **Input Validation**: All IPC calls include proper type checking
- **No Direct Node Access**: Renderer has no direct Node.js access

**API Categories:**

#### Window Management
```typescript
window: {
  minimize: () => void
  maximize: () => void
  toggleFullscreen: () => void
  setAlwaysOnTop: (flag: boolean) => void
}
```

#### Theme Management
```typescript
theme: {
  getSystemTheme: () => Promise<{isDarkMode: boolean, themeSource: string}>
  onThemeChanged: (callback: (theme) => void) => void
}
```

#### Data Operations
- **Project IPC**: CRUD operations for projects
- **Conversation IPC**: Chat session management
- **Message IPC**: Individual message operations
- **File IPC**: File upload and processing
- **Search IPC**: Project and global search
- **Settings IPC**: Configuration management

#### AI Integration
```typescript
ai: {
  chat: (messages: any[], options: any) => Promise<IPCResult>
  stream: (messages: any[], options: any) => Promise<ReadableStream>
  listModels: () => Promise<IPCResult>
  testConnection: (config: any) => Promise<IPCResult>
}
```

## Development Features

### Dual Window Architecture

**Purpose**: Separate development concerns from production UI

**Implementation:**
- **Route-based Detection**: Uses `?mode=debug` URL parameter
- **Automatic Positioning**: Debug window positions beside main window
- **DevTools Integration**: Auto-opens DevTools for both windows in development
- **Independent Lifecycle**: Each window can be closed/opened independently

**Benefits:**
- Clean separation of debugging UI from production interface
- Enhanced development workflow
- Better debugging experience
- Production UI remains uncluttered

## Security Implementation

### Process Isolation
- **Context Isolation**: Enabled for all windows
- **Node Integration**: Disabled in renderer processes
- **Sandbox**: Configurable per window (currently disabled for flexibility)
- **Web Security**: Enabled with CSP enforcement

### IPC Security
- **Channel Validation**: All IPC channels follow naming conventions
- **Type Safety**: Full TypeScript interfaces prevent data corruption
- **Error Boundaries**: Graceful error handling for failed IPC calls
- **Input Sanitization**: All user inputs validated before processing

### External Content Handling
- **Link Protection**: External URLs open in default browser
- **Navigation Prevention**: Blocks navigation to external domains
- **Content Filtering**: Prevents loading of untrusted content

## Platform Adaptations

### macOS
- **Title Bar**: Uses `hiddenInset` style for native appearance
- **Menu Integration**: App-specific menu with standard macOS items
- **Window Behavior**: Follows macOS window management conventions

### Windows/Linux
- **Menu Bar**: Auto-hiding menu bar for clean appearance
- **Window Controls**: Standard minimize/maximize/close buttons
- **File Associations**: Platform-specific file handling

## Performance Considerations

### Memory Management
- **Window References**: Proper cleanup of window references
- **Event Listeners**: Automatic cleanup of IPC event listeners
- **Resource Disposal**: Proper disposal of system resources

### Startup Optimization
- **Lazy Loading**: Non-critical components load after initialization
- **Parallel Operations**: Window creation and menu setup run concurrently
- **Caching**: System theme and configuration caching

## Error Handling

### Application Level
- **Uncaught Exceptions**: Global exception handling with logging
- **IPC Failures**: Graceful degradation for failed IPC calls
- **Window Errors**: Automatic window recreation on critical failures

### Development Aids
- **Debug Logging**: Comprehensive logging in development mode
- **Error Reporting**: Structured error reporting for debugging
- **State Recovery**: Automatic recovery from common error states

## Integration Points

### File System
- **File Dialogs**: Native file selection dialogs
- **Path Resolution**: Cross-platform path handling
- **File Watching**: Monitoring for file system changes

### System Integration
- **Theme Detection**: System dark/light mode detection
- **Platform Services**: Integration with platform-specific services
- **Notification System**: Native system notifications

## Best Practices

### Code Organization
- **Single Responsibility**: Each module has a clear, focused purpose
- **Interface Segregation**: Minimal, focused interfaces for each component
- **Dependency Injection**: Loose coupling between components
- **Error Boundaries**: Proper error isolation and recovery

### Security
- **Principle of Least Privilege**: Minimal permissions for each component
- **Input Validation**: All external inputs validated
- **Safe Defaults**: Secure-by-default configuration
- **Regular Updates**: Keep dependencies current for security patches

### Performance
- **Lazy Initialization**: Components load only when needed
- **Resource Cleanup**: Proper disposal of system resources
- **Memory Monitoring**: Track memory usage in development
- **Event Debouncing**: Prevent excessive event firing

## Troubleshooting

### Common Issues
1. **Window Not Showing**: Check `ready-to-show` event handler
2. **IPC Not Working**: Verify preload script loading
3. **Menu Not Appearing**: Ensure menu setup in `whenReady` callback
4. **Theme Not Updating**: Check theme event listeners

### Debug Tools
- **Electron DevTools**: Full Chrome DevTools access
- **IPC Monitor**: Track IPC message flow
- **Performance Monitor**: Built-in performance tracking
- **Log Aggregation**: Centralized logging system