import { extendTheme, type ThemeConfig, type ThemeOverride } from '@chakra-ui/react'
import { colors } from './colors'
import { fonts } from './fonts'
import { components } from './components'
import { shadows } from './shadows'
import { breakpoints } from './breakpoints'

const config: ThemeConfig = {
  initialColorMode: 'system',
  useSystemColorMode: true
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
    global: (props: { colorMode: string }) => ({
      body: {
        bg: props.colorMode === 'dark' ? '#0F1211' : '#FFFDF3', // Warm backgrounds
        color: props.colorMode === 'dark' ? '#B8C0BB' : '#1A1A1A', // Better contrast
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
      // Background colors - lightweight and airy
      'background.primary': {
        default: '#FAF9F8',
        _dark: '#0F1211'
      },
      'background.secondary': {
        default: '#F5F3F1',
        _dark: '#1A1F1D'
      },
      'background.tertiary': {
        default: '#EDEAE8',
        _dark: '#1F2523'
      },

      // Surface colors - lighter weight for floating elements
      'surface.primary': {
        default: '#FFFFFF', // Pure white for clean look
        _dark: '#161A18'
      },
      'surface.secondary': {
        default: '#FAF9F8', // Match background.primary for seamless feel
        _dark: '#1A1F1D'
      },
      'surface.hover': {
        default: '#F7F6F5', // Very subtle hover
        _dark: '#232826'
      },

      // Border colors - lighter and more subtle
      'border.primary': {
        default: '#EDEAE8', // Light and unobtrusive
        _dark: '#2A302D'
      },
      'border.secondary': {
        default: '#F5F3F1', // Nearly invisible for subtle divisions
        _dark: '#232826'
      },

      // Text colors - softer for comfortable reading
      'text.primary': {
        default: '#2C2C2C', // Softer than pure black
        _dark: '#E8EEEA'
      },
      'text.secondary': {
        default: '#5A5A5A', // Medium gray for hierarchy
        _dark: '#B8C0BB'
      },
      'text.tertiary': {
        default: '#8A8A8A', // Light gray for metadata
        _dark: '#9CA3A0'
      },

      // Brand colors - updated with designer feedback
      'brand.primary': 'primary.500', // Deep forest green #1F4E37
      'brand.secondary': 'blue.600', // Softer professional blue for links
      'brand.accent': 'accent.500' // Professional teal #2E6F6D
    }
  }
}

export const theme = extendTheme(themeOverrides)
export default theme
