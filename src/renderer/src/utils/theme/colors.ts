/**
 * Color palette for Knowlex Desktop Application
 * Based on modern design systems with excellent contrast ratios
 */

export const colors = {
  // Brand primary colors (Material Green - balanced and professional)
  primary: {
    50: '#e8f5e8',
    100: '#c8e6c8',
    200: '#a5d6a5',
    300: '#81c784',
    400: '#4caf50',
    500: '#2E7D32', // Deep forest green
    600: '#27682a',
    700: '#1f5422',
    800: '#18401a',
    900: '#0f2c12'
  },

  // Secondary colors (Muted Blue - easier on eyes)
  secondary: {
    50: '#f0f4f8',
    100: '#d9e2ec',
    200: '#bcccdc',
    300: '#9fb3c8',
    400: '#829ab1',
    500: '#627d98', // Secondary brand color - muted blue
    600: '#486581',
    700: '#334e68',
    800: '#243b53',
    900: '#102a43'
  },

  // Accent colors (Professional Teal - replaces purple for better harmony)
  accent: {
    50: '#f0f9f9',
    100: '#cceded',
    200: '#99dbdb',
    300: '#66c2c2',
    400: '#38a8a8',
    500: '#2E6F6D', // Professional teal - harmonizes with forest green
    600: '#266157',
    700: '#1e4d47',
    800: '#163937',
    900: '#0e2827'
  },

  // Success colors (Harmonizes with Material Green primary)
  success: {
    50: '#e8f5e8',
    100: '#c8e6c8',
    200: '#a5d6a5',
    300: '#81c784',
    400: '#4caf50',
    500: '#2E7D32', // Matches primary color
    600: '#27682a',
    700: '#1f5422',
    800: '#18401a',
    900: '#0f2c12'
  },

  // Warning colors (Muted amber/brown - softer than bright orange)
  warning: {
    50: '#faf8f0',
    100: '#f0e9d2',
    200: '#e3d2a7',
    300: '#d1b877',
    400: '#b89d4d',
    500: '#9b832a', // Muted amber instead of bright orange
    600: '#7d6b21',
    700: '#635419',
    800: '#4a3f14',
    900: '#332b0f'
  },

  // Error colors (Muted red - less aggressive than bright red)
  error: {
    50: '#faf5f5',
    100: '#f0e5e5',
    200: '#e0c7c7',
    300: '#cba6a6',
    400: '#b08080',
    500: '#8f5a5a', // Muted red instead of bright red
    600: '#744848',
    700: '#5c3838',
    800: '#452a2a',
    900: '#301e1e'
  },

  // Info colors (Muted blue - harmonizes with secondary)
  info: {
    50: '#f0f4f8',
    100: '#d9e2ec',
    200: '#bcccdc',
    300: '#9fb3c8',
    400: '#829ab1',
    500: '#627d98', // Matches secondary for consistency
    600: '#486581',
    700: '#334e68',
    800: '#243b53',
    900: '#102a43'
  },

  // Extended gray scale for better UI hierarchy
  gray: {
    25: '#fcfcfd',
    50: '#f9fafb',
    100: '#f3f4f6',
    200: '#e5e7eb',
    300: '#d1d5db',
    400: '#9ca3af',
    500: '#6b7280',
    600: '#4b5563',
    700: '#374151',
    800: '#1f2937',
    850: '#1a202c',
    900: '#111827',
    950: '#0d1117'
  },

  // Chat message colors
  chat: {
    user: {
      bg: 'primary.500',
      text: 'white'
    },
    assistant: {
      bg: {
        light: 'gray.100',
        dark: 'gray.700'
      },
      text: {
        light: 'gray.900',
        dark: 'gray.100'
      }
    },
    system: {
      bg: {
        light: 'blue.50',
        dark: 'blue.900'
      },
      text: {
        light: 'blue.800',
        dark: 'blue.200'
      }
    }
  },

  // File status colors
  file: {
    pending: 'yellow.500',
    processing: 'blue.500',
    ready: 'green.500',
    failed: 'red.500',
    paused: 'gray.500'
  },

  // Project colors (Muted palette for visual differentiation - easier on eyes)
  project: {
    blue: '#627d98', // Muted blue (matches secondary)
    green: '#2E7D32', // Deep forest green (matches primary)
    teal: '#2E6F6D', // Professional teal (matches accent)
    orange: '#9b832a', // Muted amber (matches warning)
    red: '#8f5a5a', // Muted red (matches error)
    pink: '#9c6b82', // Muted rose
    purple: '#7c63a4', // Muted purple
    indigo: '#6b6b9c' // Muted indigo
  }
}

export default colors
