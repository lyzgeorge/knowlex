/**
 * Color mode management for Knowlex Desktop Application
 * Handles light/dark/system theme detection and switching
 */

export type ColorMode = 'light' | 'dark' | 'system'

function detectSystemTheme(): 'light' | 'dark' {
  if (typeof window === 'undefined') return 'light'

  return window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light'
}

/**
 * Resolves the actual theme based on the color mode setting
 */
function resolveTheme(colorMode: ColorMode): 'light' | 'dark' {
  if (colorMode === 'system') {
    return detectSystemTheme()
  }
  return colorMode
}

/**
 * Theme manager for coordinating theme changes across windows
 * In a dual-window Electron app, we need to sync theme changes
 */
class ThemeManager {
  private callbacks: Set<(theme: 'light' | 'dark') => void> = new Set()
  private currentMode: ColorMode = 'system'
  private systemThemeListener: (() => void) | null = null

  constructor() {
    this.initialize()
  }

  private initialize() {
    // Load saved color mode
    this.currentMode = this.getStoredMode()

    // Listen for system theme changes
    this.setupSystemThemeListener()

    // Listen for storage changes (for cross-window sync)
    this.setupStorageListener()
  }

  private getStoredMode(): ColorMode {
    try {
      const stored = localStorage.getItem('knowlex-color-mode')
      return (stored as ColorMode) || 'system'
    } catch {
      return 'system'
    }
  }

  private setupSystemThemeListener() {
    if (typeof window === 'undefined') return

    const mediaQuery = window.matchMedia('(prefers-color-scheme: dark)')

    const listener = (e: MediaQueryListEvent) => {
      if (this.currentMode === 'system') {
        this.notifyCallbacks(e.matches ? 'dark' : 'light')
      }
    }

    // Modern browsers
    if (mediaQuery.addEventListener) {
      mediaQuery.addEventListener('change', listener)
      this.systemThemeListener = () => mediaQuery.removeEventListener('change', listener)
    } else {
      mediaQuery.addListener(listener)
      this.systemThemeListener = () => mediaQuery.removeListener(listener)
    }
  }

  private setupStorageListener() {
    window.addEventListener('storage', (e) => {
      if (e.key === 'knowlex-color-mode' && e.newValue) {
        const newMode = e.newValue as ColorMode
        this.currentMode = newMode
        const resolvedTheme = resolveTheme(newMode)
        this.notifyCallbacks(resolvedTheme)
      }
    })
  }

  private notifyCallbacks(theme: 'light' | 'dark') {
    this.callbacks.forEach((callback) => callback(theme))
  }

  getColorMode(): ColorMode {
    return this.currentMode
  }

  getResolvedTheme(): 'light' | 'dark' {
    return resolveTheme(this.currentMode)
  }

  setColorMode(mode: ColorMode) {
    this.currentMode = mode
    try {
      localStorage.setItem('knowlex-color-mode', mode)
    } catch {
      // Ignore localStorage errors
    }

    const resolvedTheme = resolveTheme(mode)
    this.notifyCallbacks(resolvedTheme)
  }

  subscribe(callback: (theme: 'light' | 'dark') => void, immediate: boolean = true): () => void {
    this.callbacks.add(callback)

    // Optionally call immediately with current theme
    if (immediate) {
      // Use setTimeout to avoid sync issues during initialization
      setTimeout(() => {
        callback(this.getResolvedTheme())
      }, 0)
    }

    return () => {
      this.callbacks.delete(callback)
    }
  }

  destroy() {
    if (this.systemThemeListener) {
      this.systemThemeListener()
    }
    this.callbacks.clear()
  }
}

// Global theme manager instance
export const themeManager = new ThemeManager()
