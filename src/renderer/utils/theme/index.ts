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
    global: (props: any) => ({
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
      // Background colors - warm tones for comfort
      'background.primary': {
        default: 'white', // Keep content areas pure white for text clarity
        _dark: '#0F1211' // Softer than pure black
      },
      'background.secondary': {
        default: '#FFFDF3', // Extremely light warm yellow for canvas
        _dark: '#1A1F1D'
      },
      'background.tertiary': {
        default: '#FAFAF7', // Neutral micro-warm
        _dark: '#1F2523'
      },

      // Surface colors - warm neutral palette
      'surface.primary': {
        default: 'white', // Keep content surfaces white
        _dark: '#1A1F1D'
      },
      'surface.secondary': {
        default: '#FAFAF7', // Neutral micro-warm
        _dark: '#1F2523'
      },
      'surface.hover': {
        default: '#F4F4EF', // Warm hover state
        _dark: '#252A28'
      },

      // Border colors - warm grays instead of cold
      'border.primary': {
        default: '#E7E2D9', // Warm gray border
        _dark: 'gray.600'
      },
      'border.secondary': {
        default: '#F0ECE4', // Lighter warm gray
        _dark: 'gray.700'
      },

      // Text colors - non-pure black for reduced fatigue
      'text.primary': {
        default: '#1A1A1A', // Non-pure black, charcoal
        _dark: '#B8C0BB' // Soft readable color in dark mode
      },
      'text.secondary': {
        default: '#4A4A4A', // Ensures ≥4.5:1 contrast with warm backgrounds
        _dark: '#9CA3A0'
      },
      'text.tertiary': {
        default: '#6B6B6B', // Only for meta information
        _dark: '#7A817E'
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
