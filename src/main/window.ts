import { BrowserWindow, shell, screen, nativeTheme } from 'electron'
import { join } from 'node:path'
import { is } from '@electron-toolkit/utils'
import { WINDOW_CONFIG, APP_NAME } from '@shared/constants/app'

// Window configuration constants with app name integration
const MAIN_WINDOW_CONFIG = {
  ...WINDOW_CONFIG.MAIN,
  title: APP_NAME
}

const DEBUG_WINDOW_CONFIG = {
  ...WINDOW_CONFIG.DEBUG,
  title: `${APP_NAME} - Debug Console`
}

// Common web preferences for security
const SECURE_WEB_PREFERENCES = {
  preload: join(__dirname, '../preload/preload.js'),
  sandbox: false,
  contextIsolation: true,
  nodeIntegration: false,
  webSecurity: true,
  contentSecurityPolicy: "default-src 'self'; img-src 'self' data:;",
  allowRunningInsecureContent: false,
  experimentalFeatures: false
}

/**
 * Creates the main application window
 */
export async function createMainWindow(): Promise<BrowserWindow> {
  console.log('Creating main window...')
  console.log('Preload path:', join(__dirname, '../preload/preload.js'))
  console.log('__dirname:', __dirname)

  const window = new BrowserWindow({
    ...MAIN_WINDOW_CONFIG,
    show: false,
    autoHideMenuBar: true,
    titleBarStyle: process.platform === 'darwin' ? 'hiddenInset' : 'default',
    center: true, // Force center the window
    webPreferences: SECURE_WEB_PREFERENCES
  })

  // Force window to be visible and centered - bypass saved bounds
  window.setSize(MAIN_WINDOW_CONFIG.width, MAIN_WINDOW_CONFIG.height)
  window.center()

  // Show immediately for debugging
  window.show()

  if (is.dev) {
    window.webContents.openDevTools({ mode: 'detach' })
  }

  // Window event handlers
  setupWindowEvents(window)

  // Theme adaptation
  adaptToSystemTheme(window)

  // Load content
  console.log('Loading window content...')
  await loadWindowContent(window, '/')

  // Show window when ready
  window.once('ready-to-show', () => {
    console.log('Window ready to show')
    window.show()
    if (is.dev) {
      window.webContents.openDevTools({ mode: 'detach' })
    }
  })

  // Add error handling
  window.webContents.on('did-fail-load', (_, errorCode, errorDescription, validatedURL) => {
    console.error('Failed to load:', errorCode, errorDescription, validatedURL)
  })

  return window
}

/**
 * Creates the debug window for development
 */
export async function createDebugWindow(): Promise<BrowserWindow> {
  const primaryDisplay = screen.getPrimaryDisplay()
  const { width: screenWidth } = primaryDisplay.workAreaSize

  const window = new BrowserWindow({
    ...DEBUG_WINDOW_CONFIG,
    x: Math.max(0, screenWidth - DEBUG_WINDOW_CONFIG.width - 50),
    y: 50,
    show: false,
    autoHideMenuBar: true,
    titleBarStyle: process.platform === 'darwin' ? 'hiddenInset' : 'default',
    webPreferences: SECURE_WEB_PREFERENCES
  })

  // Window event handlers
  setupWindowEvents(window)

  // Load debug content
  await loadWindowContent(window, '/?mode=debug')

  // Show window when ready
  window.once('ready-to-show', () => {
    window.show()
    window.webContents.openDevTools({ mode: 'detach' })
  })

  return window
}

/**
 * Sets up common window event handlers
 */
function setupWindowEvents(window: BrowserWindow): void {
  // Handle external links
  window.webContents.setWindowOpenHandler((details) => {
    shell.openExternal(details.url)
    return { action: 'deny' }
  })

  // Prevent navigation to external URLs
  window.webContents.on('will-navigate', (event, navigationUrl) => {
    const parsedUrl = new URL(navigationUrl)
    const currentUrl = new URL(window.webContents.getURL())

    if (parsedUrl.origin !== currentUrl.origin) {
      event.preventDefault()
      shell.openExternal(navigationUrl)
    }
  })

  // Handle window focus for better UX
  window.on('focus', () => {
    window.webContents.send('window-focus')
  })

  window.on('blur', () => {
    window.webContents.send('window-blur')
  })
}

/**
 * Adapts window appearance to system theme
 */
function adaptToSystemTheme(window: BrowserWindow): void {
  const updateTheme = () => {
    const isDarkMode = nativeTheme.shouldUseDarkColors
    window.webContents.send('theme-changed', {
      isDarkMode,
      themeSource: nativeTheme.themeSource
    })
  }

  // Initial theme setup
  updateTheme()

  // Listen for theme changes
  nativeTheme.on('updated', updateTheme)
}

/**
 * Loads content into the window based on environment
 */
async function loadWindowContent(window: BrowserWindow, route: string): Promise<void> {
  const baseUrl =
    is.dev && process.env['ELECTRON_RENDERER_URL']
      ? process.env['ELECTRON_RENDERER_URL']
      : `file://${join(__dirname, '../renderer/index.html')}`

  const fullUrl = is.dev ? `${baseUrl}#${route}` : `${baseUrl}#${route}`

  console.log('Loading URL:', fullUrl)
  console.log('Base URL:', baseUrl)
  console.log('Is dev:', is.dev)
  console.log('ELECTRON_RENDERER_URL:', process.env['ELECTRON_RENDERER_URL'])

  await window.loadURL(fullUrl)
}

/**
 * Window management utilities
 */
export class WindowManager {
  static minimizeWindow(window: BrowserWindow): void {
    window.minimize()
  }

  static maximizeWindow(window: BrowserWindow): void {
    if (window.isMaximized()) {
      window.unmaximize()
    } else {
      window.maximize()
    }
  }

  static toggleFullscreen(window: BrowserWindow): void {
    window.setFullScreen(!window.isFullScreen())
  }

  static centerWindow(window: BrowserWindow): void {
    window.center()
  }

  static setWindowSize(window: BrowserWindow, width: number, height: number): void {
    window.setSize(width, height)
    window.center()
  }

  static setAlwaysOnTop(window: BrowserWindow, flag: boolean): void {
    window.setAlwaysOnTop(flag)
  }
}
