import { BrowserWindow, shell, screen, nativeTheme, app } from 'electron'
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
    center: true,
    webPreferences: SECURE_WEB_PREFERENCES
  })

  // Force window to be visible and centered
  window.setSize(MAIN_WINDOW_CONFIG.width, MAIN_WINDOW_CONFIG.height)
  window.center()

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

  // Enhanced error handling
  window.webContents.on('did-fail-load', (_, errorCode, errorDescription, validatedURL) => {
    console.error('Failed to load:', errorCode, errorDescription, validatedURL)
    // Force show window even if load fails so user can see what's happening
    window.show()
  })

  window.webContents.on('did-finish-load', () => {
    console.log('Window content loaded successfully')
  })

  window.webContents.on('dom-ready', () => {
    console.log('DOM ready')
  })

  // Show window when ready
  window.once('ready-to-show', () => {
    console.log('Window ready to show')
    forceRevealWindow(window)
    if (is.dev) {
      window.webContents.openDevTools({ mode: 'detach' })
    }
  })

  // Fallback: force show window after timeout
  setTimeout(() => {
    if (!window.isVisible()) {
      console.log('Window not visible after timeout, forcing show')
      forceRevealWindow(window)
    }
  }, 3000)

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
 * Attempts to ensure the BrowserWindow is visible, on-screen, and focused.
 */
function forceRevealWindow(window: BrowserWindow): void {
  try {
    // Restore if minimized
    if (window.isMinimized()) window.restore()

    // Ensure reasonable size and center within primary display
    const primary = screen.getPrimaryDisplay()
    const { width: sw, height: sh, x, y } = primary.workArea
    const w = Math.min(Math.max(MAIN_WINDOW_CONFIG.width, MAIN_WINDOW_CONFIG.minWidth), sw)
    const h = Math.min(Math.max(MAIN_WINDOW_CONFIG.height, MAIN_WINDOW_CONFIG.minHeight), sh)
    const nx = Math.floor(x + (sw - w) / 2)
    const ny = Math.floor(y + (sh - h) / 2)
    window.setBounds({ x: nx, y: ny, width: w, height: h })

    // Bring to front and focus
    if (process.platform === 'darwin') {
      app.focus({ steal: true })
    }
    window.setAlwaysOnTop(true)
    window.show()
    window.focus()
    window.setAlwaysOnTop(false)
  } catch (e) {
    console.warn('forceRevealWindow failed:', e)
    // Fallback to basic show
    try {
      window.show()
      window.focus()
    } catch (err) {
      console.warn('Fallback show/focus failed:', err)
    }
  }
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
  const hash = route ? route.replace(/^#/, '') : ''

  try {
    if (is.dev && process.env['ELECTRON_RENDERER_URL']) {
      const baseUrl = process.env['ELECTRON_RENDERER_URL']!
      const fullUrl = `${baseUrl}${hash ? `#${hash}` : ''}`
      console.log('Loading dev URL:', fullUrl)
      await window.loadURL(fullUrl)
    } else {
      // In production, load the built renderer file by path to avoid URL encoding issues
      const rendererIndex = join(__dirname, '../renderer/index.html')
      console.log('Loading prod file:', rendererIndex, hash ? `#${hash}` : '')
      await window.loadFile(rendererIndex, hash ? { hash } : undefined)
    }
    console.log('URL loaded successfully')
  } catch (error) {
    console.error('Error loading renderer:', error)
    // Try to show the window anyway to expose potential errors
    window.show()
  }
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
