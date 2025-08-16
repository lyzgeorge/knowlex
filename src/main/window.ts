import { BrowserWindow, shell, screen, nativeTheme } from 'electron'
import { join } from 'node:path'
import { is } from '@electron-toolkit/utils'

// Window configuration constants
const MAIN_WINDOW_CONFIG = {
  width: 1200,
  height: 800,
  minWidth: 800,
  minHeight: 600,
  title: 'Knowlex Desktop'
}

const DEBUG_WINDOW_CONFIG = {
  width: 1400,
  height: 900,
  minWidth: 1000,
  minHeight: 700,
  title: 'Knowlex Desktop - Debug Console'
}

// Common web preferences for security
const SECURE_WEB_PREFERENCES = {
  preload: join(__dirname, '../preload/index.js'),
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
  const window = new BrowserWindow({
    ...MAIN_WINDOW_CONFIG,
    show: false,
    autoHideMenuBar: true,
    titleBarStyle: process.platform === 'darwin' ? 'hiddenInset' : 'default',
    webPreferences: SECURE_WEB_PREFERENCES
  })

  // Window event handlers
  setupWindowEvents(window)

  // Theme adaptation
  adaptToSystemTheme(window)

  // Load content
  await loadWindowContent(window, '/')

  // Show window when ready
  window.once('ready-to-show', () => {
    window.show()
    if (is.dev) {
      window.webContents.openDevTools({ mode: 'detach' })
    }
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
