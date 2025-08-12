import { extendTheme, type ThemeConfig, type ThemeOverride } from '@chakra-ui/react'
import { colors } from './colors'
import { fonts } from './fonts'
import { components } from './components'
import { shadows } from './shadows'
import { breakpoints } from './breakpoints'

const config: ThemeConfig = {
  initialColorMode: 'system',
  useSystemColorMode: true,
  storageType: 'localStorage',
  storageKey: 'knowlex-color-mode'
}

const themeOverrides: ThemeOverride = {
  config,
  colors,
  fonts,
  breakpoints,
  shadows,
  components,

  // Spacing system
  space: {
    xs: '0.25rem', // 4px
    sm: '0.5rem', // 8px
    md: '1rem', // 16px
    lg: '1.5rem', // 24px
    xl: '2rem', // 32px
    '2xl': '3rem' // 48px
  },

  // Global styles
  styles: {
    global: (props: any) => ({
      body: {
        bg: props.colorMode === 'dark' ? 'gray.900' : 'gray.50',
        color: props.colorMode === 'dark' ? 'gray.100' : 'gray.900',
        fontSize: '14px',
        fontFamily: 'body'
      },
      '*': {
        boxSizing: 'border-box'
      },
      '#root': {
        height: '100vh',
        width: '100vw',
        overflow: 'hidden'
      }
    })
  },

  // Semantic tokens for consistent theming
  semanticTokens: {
    colors: {
      // Background colors
      'background.primary': {
        default: 'white',
        _dark: 'gray.900'
      },
      'background.secondary': {
        default: 'gray.50',
        _dark: 'gray.800'
      },
      'background.tertiary': {
        default: 'gray.100',
        _dark: 'gray.700'
      },

      // Surface colors
      'surface.primary': {
        default: 'white',
        _dark: 'gray.800'
      },
      'surface.secondary': {
        default: 'gray.50',
        _dark: 'gray.700'
      },
      'surface.hover': {
        default: 'gray.100',
        _dark: 'gray.600'
      },

      // Border colors
      'border.primary': {
        default: 'gray.200',
        _dark: 'gray.600'
      },
      'border.secondary': {
        default: 'gray.100',
        _dark: 'gray.700'
      },

      // Text colors
      'text.primary': {
        default: 'gray.900',
        _dark: 'gray.100'
      },
      'text.secondary': {
        default: 'gray.600',
        _dark: 'gray.400'
      },
      'text.tertiary': {
        default: 'gray.500',
        _dark: 'gray.500'
      },

      // Brand colors
      'brand.primary': 'green.500',
      'brand.secondary': 'blue.500',
      'brand.accent': 'purple.500'
    }
  }
}

export const theme = extendTheme(themeOverrides)
export default theme
