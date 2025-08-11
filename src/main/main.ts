import { app, BrowserWindow } from 'electron'
import { electronApp, optimizer } from '@electron-toolkit/utils'
import { createMainWindow, createDebugWindow } from './window'
import { setupApplicationMenu } from './menu'
import { runMigrations } from './database/migrations'
import { registerProjectIPCHandlers, unregisterProjectIPCHandlers } from './ipc/project'

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

    // Register IPC handlers
    try {
      console.log('Registering IPC handlers...')
      registerProjectIPCHandlers()
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

    // Create debug window in development
    if (process.env.NODE_ENV === 'development') {
      this.debugWindow = await createDebugWindow()
    }
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
    // Unregister IPC handlers
    unregisterProjectIPCHandlers()

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
  contents.on('new-window', (event) => {
    event.preventDefault()
  })
})

export { application }
