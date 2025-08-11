import { app, BrowserWindow } from 'electron'
import { electronApp, optimizer } from '@electron-toolkit/utils'
import { createMainWindow, createDebugWindow } from './window'
import { setupApplicationMenu } from './menu'

// Application lifecycle management
class Application {
  private mainWindow: BrowserWindow | null = null
  private debugWindow: BrowserWindow | null = null

  async initialize(): Promise<void> {
    // Set app user model id for windows
    electronApp.setAppUserModelId('com.knowlex.desktop')

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

// Security: Prevent new window creation
app.on('web-contents-created', (_, contents) => {
  contents.on('new-window', (event) => {
    event.preventDefault()
  })
})

export { application }
