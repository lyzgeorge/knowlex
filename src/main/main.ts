import { config } from 'dotenv'
config({ path: 'app.env' })
import { app, BrowserWindow } from 'electron'
import { electronApp, optimizer } from '@electron-toolkit/utils'
import { createMainWindow } from './window'
import { setupApplicationMenu } from './menu'
import { runMigrations } from './database/migrations'
import {
  registerConversationIPCHandlers,
  unregisterConversationIPCHandlers
} from './ipc/conversation-ipc'
import { registerProjectIPCHandlers, unregisterProjectIPCHandlers } from './ipc/project'
import { registerFileIPCHandlers, unregisterFileIPCHandlers } from './ipc/file'
import { registerSettingsIPCHandlers, unregisterSettingsIPCHandlers } from './ipc/settings'
import {
  registerModelConfigIPCHandlers,
  unregisterModelConfigIPCHandlers
} from './ipc/model-config'
import { cancellationManager } from '@main/utils/cancellation'

// Application lifecycle management
class Application {
  private mainWindow: BrowserWindow | null = null
  private debugWindow: BrowserWindow | null = null

  async initialize(): Promise<void> {
    // Set app user model id for windows
    electronApp.setAppUserModelId('com.knowlex.desktop')

    // Initialize database and run migrations
    try {
      console.log('Initializing database...')
      await runMigrations()
      console.log('Database initialized successfully')
    } catch (error) {
      console.error('Failed to initialize database:', error)
      throw error
    }

    // AI providers (Vercel AI SDK) are initialized on-demand

    // Register IPC handlers
    try {
      console.log('Registering IPC handlers...')
      registerConversationIPCHandlers()
      registerProjectIPCHandlers()
      registerFileIPCHandlers()
      registerSettingsIPCHandlers()
      registerModelConfigIPCHandlers()
      console.log('IPC handlers registered successfully')
    } catch (error) {
      console.error('Failed to register IPC handlers:', error)
      throw error
    }

    // Setup application menu
    setupApplicationMenu()

    // Enable DevTools shortcuts in development
    app.on('browser-window-created', (_, window) => {
      optimizer.watchWindowShortcuts(window)
    })

    // Create windows based on environment
    await this.createWindows()

    // Handle app activation (macOS)
    app.on('activate', () => {
      if (BrowserWindow.getAllWindows().length === 0) {
        this.createWindows()
      }
    })
  }

  private async createWindows(): Promise<void> {
    // Always create main window
    this.mainWindow = await createMainWindow()

    // Debug window disabled - use browser DevTools instead
    // if (process.env.NODE_ENV === 'development') {
    //   this.debugWindow = await createDebugWindow()
    // }
  }

  getMainWindow(): BrowserWindow | null {
    return this.mainWindow
  }

  getDebugWindow(): BrowserWindow | null {
    return this.debugWindow
  }
}

// Global application instance
const application = new Application()

// Application event handlers
app.whenReady().then(() => {
  application.initialize()
})

// Quit when all windows are closed (except on macOS)
app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') {
    app.quit()
  }
})

// Cleanup on app quit
app.on('before-quit', async () => {
  console.log('Application shutting down...')

  try {
    // Cancel any in-flight long-running tasks to prevent ghost operations
    try {
      cancellationManager.cancelAll()
    } catch (e) {
      console.warn('Failed to cancel all tasks during shutdown:', e)
    }

    // Unregister IPC handlers
    unregisterConversationIPCHandlers()
    unregisterProjectIPCHandlers()
    unregisterFileIPCHandlers()
    unregisterSettingsIPCHandlers()
    unregisterModelConfigIPCHandlers()

    // Close database connections
    const { closeDB } = await import('./database/index')
    await closeDB()

    console.log('Application cleanup completed')
  } catch (error) {
    console.error('Error during application cleanup:', error)
  }
})

// Security: Prevent new window creation
app.on('web-contents-created', (_, contents) => {
  contents.setWindowOpenHandler(() => {
    return { action: 'deny' }
  })
})

export { application }
