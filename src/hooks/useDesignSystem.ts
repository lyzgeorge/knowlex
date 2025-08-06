/**
 * Design System Hooks - Comprehensive hooks for accessing design system tokens and utilities
 *
 * This file provides hooks for:
 * - Accessing design tokens programmatically
 * - Responsive design utilities
 * - Theme-aware styling
 * - Component state management
 * - Accessibility helpers
 */

import { useTheme, useColorMode, useColorModeValue, useBreakpointValue } from '@chakra-ui/react'
import { useTranslation } from 'react-i18next'
import { useMemo } from 'react'
import { designTokens, type DesignTokens } from '@/theme/tokens'

// Hook for accessing design tokens
export const useDesignTokens = (): DesignTokens => {
  return designTokens
}

// Hook for accessing _colors with theme awareness
export const useColors = () => {
  const theme = useTheme()
  const { colorMode } = useColorMode()

  return useMemo(
    () => ({
      // Semantic _colors that adapt to theme
      text: {
        primary: colorMode === 'light' ? theme._colors.gray[800] : theme._colors.dark[700],
        secondary: colorMode === 'light' ? theme._colors.gray[600] : theme._colors.dark[600],
        muted: colorMode === 'light' ? theme._colors.gray[500] : theme._colors.dark[500],
        subtle: colorMode === 'light' ? theme._colors.gray[400] : theme._colors.dark[400],
        disabled: colorMode === 'light' ? theme._colors.gray[300] : theme._colors.dark[300],
        inverted: colorMode === 'light' ? theme._colors.white : theme._colors.gray[900],
        accent: colorMode === 'light' ? theme._colors.primary[600] : theme._colors.primary[300],
      },
      background: {
        canvas: colorMode === 'light' ? theme._colors.white : theme._colors.dark[50],
        surface: colorMode === 'light' ? theme._colors.gray[50] : theme._colors.dark[100],
        overlay: colorMode === 'light' ? theme._colors.white : theme._colors.dark[100],
        subtle: colorMode === 'light' ? theme._colors.gray[100] : theme._colors.dark[200],
        muted: colorMode === 'light' ? theme._colors.gray[200] : theme._colors.dark[300],
      },
      border: {
        primary: colorMode === 'light' ? theme._colors.gray[200] : theme._colors.dark[300],
        secondary: colorMode === 'light' ? theme._colors.gray[100] : theme._colors.dark[200],
        muted: colorMode === 'light' ? theme._colors.gray[50] : theme._colors.dark[100],
        accent: colorMode === 'light' ? theme._colors.primary[200] : theme._colors.primary[700],
        focus: colorMode === 'light' ? theme._colors.primary[500] : theme._colors.primary[400],
      },
      interactive: {
        default: colorMode === 'light' ? theme._colors.primary[500] : theme._colors.primary[400],
        hover: colorMode === 'light' ? theme._colors.primary[600] : theme._colors.primary[300],
        active: colorMode === 'light' ? theme._colors.primary[700] : theme._colors.primary[200],
        disabled: colorMode === 'light' ? theme._colors.gray[300] : theme._colors.dark[400],
      },
      // Direct access to theme _colors
      primary: theme._colors.primary,
      secondary: theme._colors.secondary,
      success: theme._colors.success,
      warning: theme._colors.warning,
      error: theme._colors.error,
      gray: theme._colors.gray,
      dark: theme._colors.dark,
    }),
    [theme, colorMode]
  )
}

// Hook for responsive design
export const useResponsive = () => {
  const tokens = useDesignTokens()

  // Responsive values based on breakpoints
  const isMobile = useBreakpointValue({ base: true, md: false })
  const isTablet = useBreakpointValue({ base: false, md: true, lg: false })
  const isDesktop = useBreakpointValue({ base: false, lg: true })

  // Component sizes based on screen size
  const componentSize = useBreakpointValue({
    base: 'sm',
    md: 'md',
    lg: 'lg',
  })

  // Spacing values based on screen size
  const spacing = useBreakpointValue({
    base: tokens.spacing[4],
    md: tokens.spacing[6],
    lg: tokens.spacing[8],
  })

  // Container constraints
  const containerWidth = useBreakpointValue({
    base: '100%',
    sm: tokens.layout.containers.sm,
    md: tokens.layout.containers.md,
    lg: tokens.layout.containers.lg,
    xl: tokens.layout.containers.xl,
    '2xl': tokens.layout.containers['2xl'],
  })

  return {
    isMobile: !!isMobile,
    isTablet: !!isTablet,
    isDesktop: !!isDesktop,
    componentSize,
    spacing,
    containerWidth,
    breakpoints: tokens.breakpoints,
  }
}

// Hook for component styling utilities
export const useComponentStyles = () => {
  const _colors = useColors()
  const tokens = useDesignTokens()

  return useMemo(
    () => ({
      // Button styles
      button: {
        primary: {
          bg: _colors.interactive.default,
          color: 'white',
          _hover: { bg: _colors.interactive.hover },
          _active: { bg: _colors.interactive.active },
        },
        secondary: {
          bg: _colors.background.subtle,
          color: _colors.text.primary,
          _hover: { bg: _colors.background.muted },
        },
        ghost: {
          bg: 'transparent',
          color: _colors.text.secondary,
          _hover: { bg: _colors.background.subtle },
        },
      },

      // Card styles
      card: {
        base: {
          bg: _colors.background.surface,
          border: '1px solid',
          borderColor: _colors.border.primary,
          borderRadius: tokens.radii.lg,
          boxShadow: tokens.shadows.sm,
        },
        hover: {
          boxShadow: tokens.shadows.md,
          transform: 'translateY(-2px)',
        },
      },

      // Input styles
      input: {
        base: {
          bg: _colors.background.canvas,
          border: '1px solid',
          borderColor: _colors.border.primary,
          color: _colors.text.primary,
          _focus: {
            borderColor: _colors.border.focus,
            boxShadow: tokens.shadows.focus.primary,
          },
          _placeholder: {
            color: _colors.text.subtle,
          },
        },
      },

      // Layout styles
      layout: {
        sidebar: {
          bg: _colors.background.surface,
          borderRight: '1px solid',
          borderColor: _colors.border.primary,
          width: tokens.layout.dimensions.sidebar.width,
        },
        header: {
          bg: _colors.background.canvas,
          borderBottom: '1px solid',
          borderColor: _colors.border.primary,
          height: tokens.layout.dimensions.header.height,
        },
      },
    }),
    [_colors, tokens]
  )
}

// Hook for animation utilities
export const useAnimations = () => {
  const tokens = useDesignTokens()

  return useMemo(
    () => ({
      // Transition presets
      transitions: {
        fast: `all ${tokens.transitions.duration.fast} ${tokens.transitions.easing.easeOut}`,
        normal: `all ${tokens.transitions.duration.normal} ${tokens.transitions.easing.easeInOut}`,
        slow: `all ${tokens.transitions.duration.slow} ${tokens.transitions.easing.easeInOut}`,
        _colors: tokens.transitions.common._colors,
        transform: tokens.transitions.common.transform,
        opacity: tokens.transitions.common.opacity,
      },

      // Animation presets
      animations: {
        fadeIn: 'fadeIn 300ms ease-in-out',
        slideUp: 'slideUp 300ms ease-in-out',
        scaleIn: 'scaleIn 200ms ease-in-out',
        pulse: 'pulseSubtle 2s ease-in-out infinite',
      },

      // Hover effects
      hover: {
        lift: {
          transform: 'translateY(-2px)',
          transition: 'transform 150ms ease-out',
        },
        scale: {
          transform: 'scale(1.02)',
          transition: 'transform 150ms ease-out',
        },
        glow: {
          boxShadow: tokens.shadows.lg,
          transition: 'box-shadow 150ms ease-out',
        },
      },
    }),
    [tokens]
  )
}

// Hook for accessibility utilities
export const useAccessibility = () => {
  // const { t } = useTranslation()()

  return useMemo(
    () => ({
      // Screen reader utilities
      srOnly: {
        position: 'absolute' as const,
        width: '1px',
        height: '1px',
        padding: '0',
        margin: '-1px',
        overflow: 'hidden' as const,
        clip: 'rect(0, 0, 0, 0)',
        whiteSpace: 'nowrap' as const,
        borderWidth: '0',
      },

      // Focus utilities
      focusRing: {
        _focus: {
          outline: 'none',
          boxShadow: '0 0 0 3px rgba(66, 153, 225, 0.6)',
        },
      },

      // Skip link utilities
      skipLink: {
        position: 'absolute' as const,
        left: '-10000px',
        top: 'auto',
        width: '1px',
        height: '1px',
        overflow: 'hidden' as const,
        _focus: {
          position: 'static' as const,
          width: 'auto',
          height: 'auto',
          overflow: 'visible' as const,
        },
      },

      // ARIA helpers
      getAriaProps: (options: {
        label?: string
        describedBy?: string
        expanded?: boolean
        selected?: boolean
        disabled?: boolean
      }) => ({
        'aria-label': options.label,
        'aria-describedby': options.describedBy,
        'aria-expanded': options.expanded,
        'aria-selected': options.selected,
        'aria-disabled': options.disabled,
      }),

      // Common accessibility patterns
      patterns: {
        button: (label: string) => ({
          role: 'button',
          'aria-label': label,
          tabIndex: 0,
        }),

        dialog: (title: string) => ({
          role: 'dialog',
          'aria-labelledby': `${title.toLowerCase().replace(/\s+/g, '-')}-title`,
          'aria-modal': true,
        }),

        listbox: (label: string) => ({
          role: 'listbox',
          'aria-label': label,
        }),

        tab: (selected: boolean, controls: string) => ({
          role: 'tab',
          'aria-selected': selected,
          'aria-controls': controls,
          tabIndex: selected ? 0 : -1,
        }),
      },
    }),
    [t]
  )
}

// Hook for layout utilities
export const useLayout = () => {
  const tokens = useDesignTokens()
  const responsive = useResponsive()
  const _colors = useColors()

  return useMemo(
    () => ({
      // Container utilities
      container: {
        maxWidth: responsive.containerWidth,
        mx: 'auto',
        px: responsive.spacing,
      },

      // Flex utilities
      flex: {
        center: {
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
        },
        between: {
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
        },
        start: {
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'flex-start',
        },
        end: {
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'flex-end',
        },
      },

      // Grid utilities
      grid: {
        responsive: {
          display: 'grid',
          gridTemplateColumns: {
            base: '1fr',
            md: 'repeat(2, 1fr)',
            lg: 'repeat(3, 1fr)',
          },
          gap: responsive.spacing,
        },
      },

      // Layout components
      sidebar: {
        width: tokens.layout.dimensions.sidebar.width,
        minWidth: tokens.layout.dimensions.sidebar.minWidth,
        maxWidth: tokens.layout.dimensions.sidebar.maxWidth,
        bg: _colors.background.surface,
        borderRight: '1px solid',
        borderColor: _colors.border.primary,
      },

      header: {
        height: tokens.layout.dimensions.header.height,
        minHeight: tokens.layout.dimensions.header.minHeight,
        bg: _colors.background.canvas,
        borderBottom: '1px solid',
        borderColor: _colors.border.primary,
      },

      main: {
        flex: 1,
        bg: _colors.background.canvas,
        overflow: 'hidden',
      },
    }),
    [tokens, responsive, _colors]
  )
}

// Export all hooks
export {
  useDesignTokens,
  useColors,
  useResponsive,
  useComponentStyles,
  useAnimations,
  useAccessibility,
  useLayout,
}
