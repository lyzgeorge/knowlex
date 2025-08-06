import { app, BrowserWindow } from 'electron'
import { join } from 'path'
import { ipcManager } from '../handlers/ipc.manager'
import { IPCMessage, IPC_CHANNELS } from '../types/ipc.types'

const isDev = process.env.IS_DEV === 'true'

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
app.whenReady().then(() => {
  // Initialize IPC Manager
  console.log('Initializing IPC Manager...')

  // Register basic system handlers
  registerSystemHandlers()

  createWindow()

  app.on('activate', function () {
    // On macOS it's common to re-create a window in the app when the
    // dock icon is clicked and there are no other windows open.
    if (BrowserWindow.getAllWindows().length === 0) createWindow()
  })
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
app.on('before-quit', () => {
  ipcManager.cleanup()
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
