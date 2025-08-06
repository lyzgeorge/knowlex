/**
 * Theme Provider for Knowlex Desktop Application
 *
 * This component provides theme context and manages theme switching
 * between light, dark, and system themes.
 */

import React, { createContext, useContext, useEffect, useState, ReactNode } from 'react'
import { ChakraProvider, ColorModeScript, useColorMode } from '@chakra-ui/react'
import { chakraTheme } from '@/theme/chakra-theme'

// Theme types
export type ThemeMode = 'light' | 'dark' | 'system'

// Theme context interface
interface ThemeContextType {
  theme: ThemeMode
  setTheme: (theme: ThemeMode) => void
  _actualTheme: 'light' | 'dark' // The actual theme being applied (resolved from system)
}

// Create theme context
const ThemeContext = createContext<ThemeContextType | undefined>(undefined)

// Hook to use theme context
export const useTheme = (): ThemeContextType => {
  const context = useContext(ThemeContext)
  if (context === undefined) {
    throw new Error('useTheme must be used within a ThemeProvider')
  }
  return context
}

// Theme provider props
interface ThemeProviderProps {
  children: ReactNode
}

// Theme storage key
const THEME_STORAGE_KEY = 'knowlex-theme'

// Get initial theme from localStorage or default to system
const getInitialTheme = (): ThemeMode => {
  if (typeof window === 'undefined') return 'system'

  try {
    const stored = localStorage.getItem(THEME_STORAGE_KEY)
    if (stored && ['light', 'dark', 'system'].includes(stored)) {
      return stored as ThemeMode
    }
  } catch (error) {
    // console.warn('Failed to read theme from localStorage:', error)
  }

  return 'system'
}

// Get system theme preference
const getSystemTheme = (): 'light' | 'dark' => {
  if (typeof window === 'undefined') return 'light'

  return window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light'
}

// Resolve actual theme based on theme mode
const resolveActualTheme = (theme: ThemeMode): 'light' | 'dark' => {
  if (theme === 'system') {
    return getSystemTheme()
  }
  return theme
}

// Inner theme provider that uses Chakra's useColorMode
const ThemeProviderInner: React.FC<ThemeProviderProps> = ({ children }) => {
  const [theme, setThemeState] = useState<ThemeMode>(getInitialTheme)
  const [_actualTheme, setActualTheme] = useState<'light' | 'dark'>(() =>
    resolveActualTheme(getInitialTheme())
  )
  const { setColorMode } = useColorMode()

  // Update actual theme when theme changes
  useEffect(() => {
    const newActualTheme = resolveActualTheme(theme)
    setActualTheme(newActualTheme)
    setColorMode(newActualTheme)
  }, [theme, setColorMode])

  // Listen for system theme changes when using system theme
  useEffect(() => {
    if (theme !== 'system') return

    const mediaQuery = window.matchMedia('(prefers-color-scheme: dark)')

    const handleSystemThemeChange = (e: MediaQueryListEvent) => {
      const newActualTheme = e.matches ? 'dark' : 'light'
      setActualTheme(newActualTheme)
      setColorMode(newActualTheme)
    }

    mediaQuery.addEventListener('change', handleSystemThemeChange)

    return () => {
      mediaQuery.removeEventListener('change', handleSystemThemeChange)
    }
  }, [theme, setColorMode])

  // Set theme function that persists to localStorage
  const setTheme = (newTheme: ThemeMode) => {
    try {
      localStorage.setItem(THEME_STORAGE_KEY, newTheme)
      setThemeState(newTheme)
    } catch (error) {
      // console.warn('Failed to save theme to localStorage:', error)
      setThemeState(newTheme)
    }
  }

  const contextValue: ThemeContextType = {
    theme,
    setTheme,
    _actualTheme,
  }

  return <ThemeContext.Provider value={contextValue}>{children}</ThemeContext.Provider>
}

// Main theme provider component
export const ThemeProvider: React.FC<ThemeProviderProps> = ({ children }) => {
  const initialTheme = getInitialTheme()
  const initialActualTheme = resolveActualTheme(initialTheme)

  return (
    <>
      <ColorModeScript initialColorMode={initialActualTheme} />
      <ChakraProvider theme={chakraTheme}>
        <ThemeProviderInner>{children}</ThemeProviderInner>
      </ChakraProvider>
    </>
  )
}

// Helper hook to get theme utilities
export const useThemeUtils = () => {
  const { theme, _actualTheme } = useTheme()

  return {
    isDark: _actualTheme === 'dark',
    isLight: _actualTheme === 'light',
    isSystem: theme === 'system',
    systemTheme: getSystemTheme(),

    // Get theme-aware values
    themeValue: function <T>(lightValue: T, darkValue: T): T {
      return _actualTheme === 'dark' ? darkValue : lightValue
    },

    // Get CSS custom properties for theme values
    getCSSCustomProperty: (property: string): string => {
      if (typeof document === 'undefined') return ''
      return getComputedStyle(document.documentElement).getPropertyValue(property)
    },

    // Set CSS custom properties
    setCSSCustomProperty: (property: string, value: string): void => {
      if (typeof document === 'undefined') return
      document.documentElement.style.setProperty(property, value)
    },
  }
}

// Theme class utility for conditional styling
export const useThemeClass = () => {
  const { _actualTheme } = useTheme()

  return {
    themeClass: _actualTheme,

    // Get conditional classes based on theme
    cx: (...classes: (string | undefined | false)[]): string => {
      return classes.filter(Boolean).join(' ')
    },

    // Apply theme-specific classes
    themed: (lightClass: string, darkClass: string): string => {
      return _actualTheme === 'dark' ? darkClass : lightClass
    },
  }
}

// Export theme utilities as well
export { getSystemTheme, resolveActualTheme }

export default ThemeProvider
