import { useEffect } from 'react'
import { useColorMode } from '@chakra-ui/react'
import { useCurrentTheme, useResolvedTheme } from '@renderer/stores/app'

/**
 * Hook to sync our custom theme system with Chakra UI's color mode
 */
export function useThemeSync() {
  const currentTheme = useCurrentTheme()
  const resolvedTheme = useResolvedTheme()
  const { colorMode, setColorMode } = useColorMode()

  useEffect(() => {
    // Sync Chakra UI with our resolved theme
    if (resolvedTheme !== colorMode) {
      setColorMode(resolvedTheme)
    }
  }, [resolvedTheme, colorMode, setColorMode])

  useEffect(() => {
    // Listen for system theme changes when in system mode
    if (currentTheme !== 'system') {
      return // No cleanup needed for non-system modes
    }

    const mediaQuery = window.matchMedia('(prefers-color-scheme: dark)')

    const handleSystemThemeChange = (e: MediaQueryListEvent) => {
      const newTheme = e.matches ? 'dark' : 'light'
      if (newTheme !== colorMode) {
        setColorMode(newTheme)
      }
    }

    // Modern browsers
    if (mediaQuery.addEventListener) {
      mediaQuery.addEventListener('change', handleSystemThemeChange)
      return () => mediaQuery.removeEventListener('change', handleSystemThemeChange)
    } else {
      mediaQuery.addListener(handleSystemThemeChange)
      return () => mediaQuery.removeListener(handleSystemThemeChange)
    }
  }, [currentTheme, colorMode, setColorMode])
}
