/**
 * Theme System Exports for Knowlex Desktop Application
 *
 * This file provides a centralized export for all theme-related modules.
 */

// Export design tokens
export * from './tokens'

// Export Chakra UI theme
export { chakraTheme, themeConfig } from './chakra-theme'
export type { ChakraTheme } from './chakra-theme'

// Re-export commonly used types for convenience
export type {
  Colors,
  Typography,
  Spacing,
  Shadows,
  Radii,
  ZIndices,
  Breakpoints,
  Transitions,
  Components,
  DesignTokens,
} from './tokens'
