import { app, shell, BrowserWindow, dialog } from 'electron'
import { join } from 'path'
import { electronApp, optimizer, is } from '@electron-toolkit/utils'
import { DatabaseService } from './services/database.service'
import { IPCService } from './services/ipc.service'
import { IPC_CHANNELS } from '@shared'

let mainWindow: BrowserWindow | null = null

function createWindow(): void {
  // Create the browser window
  mainWindow = new BrowserWindow({
    width: 1200,
    height: 800,
    minWidth: 800,
    minHeight: 600,
    show: false, // Don't show until ready-to-show
    autoHideMenuBar: true,
    titleBarStyle: process.platform === 'darwin' ? 'hiddenInset' : 'default',
    webPreferences: {
      preload: join(__dirname, '../preload/index.js'),
      sandbox: false,
      contextIsolation: true,
      nodeIntegration: false,
      webSecurity: true,
      allowRunningInsecureContent: false
    }
  })

  // Show window when ready to prevent visual flash
  mainWindow.on('ready-to-show', () => {
    if (mainWindow) {
      mainWindow.show()

      // Focus window
      if (is.dev) {
        mainWindow.webContents.openDevTools()
      }
    }
  })

  // Handle window lifecycle events
  mainWindow.on('close', (_event) => {
    console.log('Main window close event triggered')
  })

  // Handle renderer process crashes
  mainWindow.webContents.on('crashed', async (event) => {
    console.error('Renderer process crashed:', event)

    const options = {
      type: 'error',
      title: 'Application Error',
      message: 'The application has crashed. Would you like to restart?',
      buttons: ['Restart', 'Exit'],
      defaultId: 0
    }

    const { response } = await dialog.showMessageBox(mainWindow!, options)
    if (response === 0) {
      app.relaunch()
      app.exit(0)
    } else {
      app.quit()
    }
  })

  // Handle unresponsive renderer
  mainWindow.on('unresponsive', async () => {
    console.error('Renderer process became unresponsive')

    const options = {
      type: 'warning',
      title: 'Application Unresponsive',
      message: 'The application is not responding. Would you like to restart?',
      buttons: ['Wait', 'Restart'],
      defaultId: 0
    }

    const { response } = await dialog.showMessageBox(mainWindow!, options)
    if (response === 1) {
      app.relaunch()
      app.exit(0)
    }
  })

  // Handle external link clicks
  mainWindow.webContents.setWindowOpenHandler((details) => {
    shell.openExternal(details.url)
    return { action: 'deny' }
  })

  // Load the app
  if (is.dev && process.env['ELECTRON_RENDERER_URL']) {
    mainWindow.loadURL(process.env['ELECTRON_RENDERER_URL'])
  } else {
    mainWindow.loadFile(join(__dirname, '../renderer/index.html'))
  }
}

async function initializeServices(): Promise<void> {
  // Initialize IPC service first
  try {
    const ipcService = IPCService.getInstance()
    await ipcService.initialize()
    console.log('✓ IPC service initialized successfully')
  } catch (error) {
    console.error('✗ Failed to initialize IPC service:', error)
    throw new Error(`IPC initialization failed: ${error}`)
  }

  // Initialize libsql database
  try {
    const dbService = DatabaseService.getInstance()
    await dbService.initialize()
    console.log('✓ libsql database initialized successfully')
  } catch (error) {
    console.error('✗ Failed to initialize libsql database:', error)
    throw new Error(`Database initialization failed: ${error}`)
  }

  // Register all IPC handlers
  await registerIPCHandlers()
}

async function registerIPCHandlers(): Promise<void> {
  const ipcService = IPCService.getInstance()
  const dbService = DatabaseService.getInstance()

  // System handlers
  ipcService.handle(IPC_CHANNELS.PING, {
    handle: async () => 'pong'
  })

  ipcService.handle(IPC_CHANNELS.GET_APP_INFO, {
    handle: async () => ({
      name: app.getName(),
      version: app.getVersion(),
      platform: process.platform,
      arch: process.arch,
      nodeVersion: process.versions.node,
      electronVersion: process.versions.electron,
      uptime: process.uptime(),
      memoryUsage: process.memoryUsage(),
      storageUsage: {
        used: 0, // TODO: Implement storage usage calculation
        total: 0,
        available: 0
      }
    })
  })

  // Database health and management handlers
  ipcService.handle(IPC_CHANNELS.DB_HEALTH_CHECK, {
    handle: async () => await dbService.healthCheck()
  })

  ipcService.handle(IPC_CHANNELS.DB_STATS, {
    handle: async () => await dbService.getStats()
  })

  // Vector operations handlers
  ipcService.handle(IPC_CHANNELS.DB_INSERT_VECTOR, {
    handle: async (data: { chunkId: string; content: string; embedding: number[] }) => {
      const { chunkId, content, embedding } = data
      return await dbService.insertVector(chunkId, content, embedding)
    },
    validate: (data) => {
      if (!data || typeof data !== 'object') return false
      if (typeof data.chunkId !== 'string' || !data.chunkId.trim()) return false
      if (typeof data.content !== 'string') return false
      if (!Array.isArray(data.embedding)) return false
      if (!data.embedding.every((val: unknown) => typeof val === 'number' && !isNaN(val)))
        return false
      return true
    }
  })

  ipcService.handle(IPC_CHANNELS.DB_SEARCH_VECTORS, {
    handle: async (data: { queryEmbedding: number[]; limit?: number; projectId?: string }) => {
      const { queryEmbedding, limit = 10, projectId } = data
      return await dbService.searchSimilarVectors(queryEmbedding, limit, projectId)
    },
    validate: (data) => {
      if (!data || typeof data !== 'object') return false
      if (!Array.isArray(data.queryEmbedding)) return false
      if (!data.queryEmbedding.every((val: unknown) => typeof val === 'number' && !isNaN(val)))
        return false
      if (
        data.limit !== undefined &&
        (typeof data.limit !== 'number' || data.limit < 1 || data.limit > 100)
      )
        return false
      if (data.projectId !== undefined && typeof data.projectId !== 'string') return false
      return true
    }
  })

  ipcService.handle(IPC_CHANNELS.DB_DELETE_VECTOR, {
    handle: async (data: { chunkId: string }) => {
      const { chunkId } = data
      return await dbService.deleteVector(chunkId)
    },
    validate: (data) => {
      return data && typeof data.chunkId === 'string' && data.chunkId.trim().length > 0
    }
  })

  // Database management handlers
  ipcService.handle(IPC_CHANNELS.DB_CREATE_SAMPLE, {
    handle: async () => await dbService.createSampleData()
  })

  ipcService.handle(IPC_CHANNELS.DB_CLEAR_ALL, {
    handle: async () => await dbService.clearAllData()
  })

  ipcService.handle(IPC_CHANNELS.DB_RESET, {
    handle: async () => await dbService.resetDatabase()
  })

  console.log('✓ All IPC handlers registered successfully')
}

async function handleInitializationError(error: Error): Promise<void> {
  console.error('Application initialization failed:', error)

  const options = {
    type: 'error',
    title: 'Startup Error',
    message: `Failed to initialize Knowlex Desktop:\n\n${error.message}`,
    buttons: ['Retry', 'Exit'],
    defaultId: 0
  }

  const { response } = await dialog.showMessageBox(options)
  if (response === 0) {
    // Retry initialization
    try {
      await initializeServices()
      createWindow()
    } catch (retryError) {
      console.error('Retry failed:', retryError)
      app.quit()
    }
  } else {
    app.quit()
  }
}

// App ready handler
app.whenReady().then(async () => {
  try {
    // Set app user model id for Windows
    electronApp.setAppUserModelId('com.knowlex.desktop')

    // Initialize all services
    await initializeServices()

    // Setup window shortcuts
    app.on('browser-window-created', (_, window) => {
      optimizer.watchWindowShortcuts(window)
    })

    // Create main window
    createWindow()

    // Handle activate event (macOS)
    app.on('activate', () => {
      if (BrowserWindow.getAllWindows().length === 0) {
        createWindow()
      }
    })
  } catch (error) {
    await handleInitializationError(error as Error)
  }
})

// Handle window closure
app.on('window-all-closed', async () => {
  try {
    // Gracefully shutdown services
    console.log('Shutting down services...')

    const dbService = DatabaseService.getInstance()
    const ipcService = IPCService.getInstance()

    // Close database connection
    if (dbService) {
      await dbService.close()
      console.log('✓ Database connection closed')
    }

    // Destroy IPC service
    if (ipcService) {
      ipcService.destroy()
      console.log('✓ IPC service destroyed')
    }
  } catch (error) {
    console.error('✗ Error during shutdown:', error)
  } finally {
    // Quit app (except on macOS where apps stay active)
    if (process.platform !== 'darwin') {
      app.quit()
    }
  }
})

// Handle second instance (single instance enforcement)
app.on('second-instance', () => {
  if (mainWindow) {
    if (mainWindow.isMinimized()) mainWindow.restore()
    mainWindow.focus()
  }
})

// Security: Prevent new window creation
app.on('web-contents-created', (event, contents) => {
  contents.on('new-window', (event, navigationUrl) => {
    event.preventDefault()
    shell.openExternal(navigationUrl)
  })
})

// Handle certificate errors
app.on('certificate-error', (event, webContents, url, error, certificate, callback) => {
  if (is.dev) {
    // In development, ignore certificate errors
    event.preventDefault()
    callback(true)
  } else {
    // In production, use default behavior
    callback(false)
  }
})
