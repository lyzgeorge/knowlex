import { app, BrowserWindow } from 'electron'
import { join } from 'path'
import { ipcManager } from '../handlers/ipc.manager'
import { IPCMessage, IPC_CHANNELS } from '../types/ipc.types'
// import { DatabaseService } from '../services/database/database.service'
import { OpenAIClient } from '../services/ai/openai.client'
// import { ChatHandler } from '../handlers/chat.handler'
// import { SettingsHandler } from '../handlers/settings.handler'
import { OpenAITestHandler } from '../handlers/openai-test.handler'

const isDev = process.env.IS_DEV === 'true'

// Global services
// let _databaseService: DatabaseService
let openaiService: OpenAIClient
// let _chatHandler: ChatHandler
// let _settingsHandler: SettingsHandler
let openaiTestHandler: OpenAITestHandler

function createWindow(): void {
  // Create the browser window.
  const mainWindow = new BrowserWindow({
    width: 1200,
    height: 800,
    show: false,
    autoHideMenuBar: true,
    webPreferences: {
      preload: join(__dirname, '../preload/index.js'),
      nodeIntegration: false,
      contextIsolation: true,
    },
  })

  mainWindow.on('ready-to-show', () => {
    mainWindow.show()
  })

  mainWindow.webContents.setWindowOpenHandler(details => {
    // eslint-disable-next-line @typescript-eslint/no-var-requires
    require('electron').shell.openExternal(details.url)
    return { action: 'deny' }
  })

  // HMR for renderer base on electron-vite cli.
  // Load the remote URL for development or the local html file for production.
  if (isDev) {
    mainWindow.loadURL('http://localhost:5173')
  } else {
    mainWindow.loadFile(join(__dirname, '../renderer/index.html'))
  }
}

// This method will be called when Electron has finished
// initialization and is ready to create browser windows.
// Some APIs can only be used after this event occurs.
app.whenReady().then(async () => {
  try {
    // Initialize services
    await initializeServices()

    // Initialize IPC Manager and handlers
    console.log('Initializing IPC Manager...')
    await initializeHandlers()

    // Register basic system handlers
    registerSystemHandlers()

    createWindow()

    app.on('activate', function () {
      // On macOS it's common to re-create a window in the app when the
      // dock icon is clicked and there are no other windows open.
      if (BrowserWindow.getAllWindows().length === 0) createWindow()
    })
  } catch (error) {
    console.error('Failed to initialize application:', error)
    app.quit()
  }
})

// Quit when all windows are closed, except on macOS. There, it's common
// for applications and their menu bar to stay active until the user quits
// explicitly with Cmd + Q.
app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') {
    // Cleanup IPC Manager before quitting
    ipcManager.cleanup()
    app.quit()
  }
})

// Cleanup on app quit
app.on('before-quit', async () => {
  console.log('Cleaning up application...')

  try {
    // Cleanup IPC Manager
    ipcManager.cleanup()

    // TODO: Close database service when available
    // if (databaseService) {
    //   await databaseService.close()
    // }

    console.log('Application cleanup completed')
  } catch (error) {
    console.error('Error during cleanup:', error)
  }
})

/**
 * Register basic system handlers for testing IPC functionality
 */
function registerSystemHandlers(): void {
  // System info handler
  ipcManager.registerHandler(IPC_CHANNELS.SYSTEM_GET_INFO, async (message: IPCMessage) => {
    return {
      id: message.id,
      success: true,
      data: {
        platform: process.platform,
        arch: process.arch,
        version: process.version,
        electronVersion: process.versions.electron,
        nodeVersion: process.versions.node,
        chromeVersion: process.versions.chrome,
      },
      timestamp: Date.now(),
    }
  })

  // Register test handlers for IPC framework validation
  if (isDev) {
    registerTestHandlers()
  }

  console.log('System IPC handlers registered')
}

/**
 * Initialize all services
 */
async function initializeServices(): Promise<void> {
  console.log('Initializing services...')

  try {
    // Initialize OpenAI service (will be configured when settings are loaded)
    openaiService = new OpenAIClient()
    console.log('OpenAI service initialized')

    // TODO: Initialize database service when native module issues are resolved
    // databaseService = new DatabaseService()
    // await databaseService.initialize()
    // console.log('Database service initialized')

    console.log('All services initialized successfully')
  } catch (error) {
    console.error('Failed to initialize services:', error)
    throw error
  }
}

/**
 * Initialize IPC handlers
 */
async function initializeHandlers(): Promise<void> {
  console.log('Initializing IPC handlers...')

  try {
    // Initialize OpenAI test handler (no database required)
    openaiTestHandler = new OpenAITestHandler(openaiService)
    openaiTestHandler.registerHandlers()
    console.log('OpenAI test handler initialized')

    // TODO: Initialize handlers when database service is available
    // chatHandler = new ChatHandler(openaiService, databaseService)
    // chatHandler.registerHandlers()
    // console.log('Chat handler initialized')

    // settingsHandler = new SettingsHandler(openaiService, databaseService)
    // settingsHandler.registerHandlers()
    // console.log('Settings handler initialized')

    // Load initial settings and configure OpenAI service
    // await loadInitialSettings()

    console.log('All IPC handlers initialized successfully')
  } catch (error) {
    console.error('Failed to initialize IPC handlers:', error)
    throw error
  }
}

/**
 * Load initial settings and configure services
 */
// async function _loadInitialSettings(): Promise<void> {
//   try {
//     console.log('Loading initial settings...')

//     // TODO: Load settings from database when available
//     // For now, just log that settings need to be configured
//     console.log('No database available, OpenAI service will need to be configured manually')
//   } catch (error) {
//     console.warn('Failed to load initial settings:', error)
//     // Continue without settings - they can be configured later
//   }
// }

/**
 * Register test handlers dynamically in development mode
 */
async function registerTestHandlers(): Promise<void> {
  try {
    const { testHandler } = await import('../handlers/test.handler')

    // Test echo handler
    ipcManager.registerHandler(IPC_CHANNELS.TEST_ECHO, testHandler.handleEcho.bind(testHandler))

    // Test ping handler
    ipcManager.registerHandler(IPC_CHANNELS.TEST_PING, testHandler.handlePing.bind(testHandler))

    // Test error handler
    ipcManager.registerHandler(IPC_CHANNELS.TEST_ERROR, testHandler.handleError.bind(testHandler))

    // Test validation handler
    ipcManager.registerHandler(
      IPC_CHANNELS.TEST_VALIDATION,
      testHandler.handleValidation.bind(testHandler)
    )

    // Test stream handler
    ipcManager.registerHandler(
      IPC_CHANNELS.TEST_STREAM,
      testHandler.handleStreamTest.bind(testHandler)
    )

    console.log('Test IPC handlers registered (development mode)')
  } catch (error) {
    console.warn('Failed to register test handlers:', error)
  }
}
