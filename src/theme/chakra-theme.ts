/**
 * Chakra UI Custom Theme for Knowlex Desktop Application
 *
 * This theme extends the default Chakra UI theme with our custom design tokens
 * and provides consistent styling that works well with Tailwind CSS.
 */

import { extendTheme, type ThemeConfig, type StyleFunctionProps } from '@chakra-ui/react'
import { mode } from '@chakra-ui/theme-tools'
import {
  colors,
  typography,
  spacing,
  shadows,
  radii,
  zIndices,
  breakpoints,
  transitions,
  layout,
  semantic,
  chatgpt,
  components as componentTokens,
} from './tokens'

// Theme Configuration
const config: ThemeConfig = {
  initialColorMode: 'system',
  useSystemColorMode: true,
  disableTransitionOnChange: false,
}

// Global Styles
const styles = {
  global: (props: StyleFunctionProps) => ({
    '*': {
      boxSizing: 'border-box',
    },
    'html, body': {
      fontFamily: typography.fonts.body,
      fontSize: typography.fontSizes.md,
      lineHeight: typography.lineHeights.normal,
      color: mode('gray.800', 'dark.700')(props),
      bg: mode('white', 'dark.50')(props),
      WebkitFontSmoothing: 'antialiased',
      MozOsxFontSmoothing: 'grayscale',
    },
    '#root': {
      width: '100vw',
      height: '100vh',
      overflow: 'hidden',
    },
    // Custom scrollbar styles
    '::-webkit-scrollbar': {
      width: '8px',
      height: '8px',
    },
    '::-webkit-scrollbar-track': {
      bg: mode('gray.100', 'dark.200')(props),
      borderRadius: radii.base,
    },
    '::-webkit-scrollbar-thumb': {
      bg: mode('gray.300', 'dark.400')(props),
      borderRadius: radii.base,
      '&:hover': {
        bg: mode('gray.400', 'dark.500')(props),
      },
    },
    // Selection styles
    '::selection': {
      bg: mode('primary.100', 'primary.800')(props),
      color: mode('primary.800', 'primary.100')(props),
    },
  }),
}

// Component Theme Overrides
const components = {
  // Button Component (ChatGPT inspired)
  Button: {
    baseStyle: {
      fontWeight: typography.fontWeights.medium,
      borderRadius: radii.lg, // Slightly more rounded like ChatGPT
      transition: 'all 0.15s cubic-bezier(0.4, 0, 0.2, 1)', // Smooth ChatGPT-style transition
      fontSize: chatgpt.text.bodySmallEmphasized.fontSize,
      lineHeight: chatgpt.text.bodySmallEmphasized.lineHeight,
      letterSpacing: chatgpt.text.bodySmallEmphasized.letterSpacing,
      _focus: {
        boxShadow: shadows.focus.primary,
        outline: 'none',
      },
      _focusVisible: {
        boxShadow: shadows.focus.primary,
      },
    },
    sizes: {
      xs: {
        h: '28px',
        minW: '28px',
        fontSize: chatgpt.text.captionRegular.fontSize,
        px: spacing[2],
        py: spacing[1],
      },
      sm: {
        h: componentTokens.button.heights.sm,
        minW: componentTokens.button.heights.sm,
        fontSize: chatgpt.text.bodySmallRegular.fontSize,
        px: spacing[3],
        py: spacing[1.5],
      },
      md: {
        h: componentTokens.button.heights.md,
        minW: componentTokens.button.heights.md,
        fontSize: chatgpt.text.bodySmallEmphasized.fontSize,
        px: spacing[4],
        py: spacing[2],
      },
      lg: {
        h: componentTokens.button.heights.lg,
        minW: componentTokens.button.heights.lg,
        fontSize: typography.fontSizes.md,
        px: spacing[6],
        py: spacing[3],
      },
    },
    variants: {
      solid: (props: StyleFunctionProps) => ({
        bg: mode('primary.500', 'primary.600')(props),
        color: 'white',
        boxShadow: mode('0 1px 2px 0 rgba(0, 0, 0, 0.05)', '0 1px 2px 0 rgba(0, 0, 0, 0.3)')(props),
        _hover: {
          bg: mode('primary.600', 'primary.700')(props),
          transform: 'translateY(-1px)',
          boxShadow: mode(
            '0 4px 6px -1px rgba(0, 0, 0, 0.1), 0 2px 4px -1px rgba(0, 0, 0, 0.06)',
            '0 4px 6px -1px rgba(0, 0, 0, 0.4), 0 2px 4px -1px rgba(0, 0, 0, 0.3)'
          )(props),
          _disabled: {
            bg: mode('primary.500', 'primary.600')(props),
            transform: 'none',
            boxShadow: mode(
              '0 1px 2px 0 rgba(0, 0, 0, 0.05)',
              '0 1px 2px 0 rgba(0, 0, 0, 0.3)'
            )(props),
          },
        },
        _active: {
          bg: mode('primary.700', 'primary.800')(props),
          transform: 'translateY(0)',
          boxShadow: mode(
            '0 1px 2px 0 rgba(0, 0, 0, 0.05)',
            '0 1px 2px 0 rgba(0, 0, 0, 0.3)'
          )(props),
        },
      }),
      ghost: (props: StyleFunctionProps) => ({
        color: mode('gray.700', 'dark.600')(props),
        bg: 'transparent',
        _hover: {
          bg: mode('gray.100', 'dark.200')(props),
          color: mode('gray.900', 'dark.700')(props),
        },
        _active: {
          bg: mode('gray.200', 'dark.300')(props),
        },
      }),
      outline: (props: StyleFunctionProps) => ({
        border: '1px solid',
        borderColor: mode('gray.300', 'dark.400')(props),
        color: mode('gray.700', 'dark.600')(props),
        bg: 'transparent',
        _hover: {
          bg: mode('gray.50', 'dark.100')(props),
          borderColor: mode('gray.400', 'dark.500')(props),
          color: mode('gray.900', 'dark.700')(props),
        },
        _active: {
          bg: mode('gray.100', 'dark.200')(props),
        },
      }),
      subtle: (props: StyleFunctionProps) => ({
        bg: mode('gray.100', 'dark.200')(props),
        color: mode('gray.800', 'dark.700')(props),
        _hover: {
          bg: mode('gray.200', 'dark.300')(props),
          color: mode('gray.900', 'dark.800')(props),
        },
        _active: {
          bg: mode('gray.300', 'dark.400')(props),
        },
      }),
    },
    defaultProps: {
      size: 'md',
      variant: 'solid',
    },
  },

  // Input Component
  Input: {
    baseStyle: {
      field: {
        borderRadius: radii.md,
        transition: transitions.common.colors,
        _focus: {
          boxShadow: shadows.focus.primary,
        },
      },
    },
    sizes: {
      sm: {
        field: {
          h: componentTokens.input.heights.sm,
          fontSize: typography.fontSizes.sm,
          px: spacing[3],
        },
      },
      md: {
        field: {
          h: componentTokens.input.heights.md,
          fontSize: typography.fontSizes.md,
          px: spacing[4],
        },
      },
      lg: {
        field: {
          h: componentTokens.input.heights.lg,
          fontSize: typography.fontSizes.lg,
          px: spacing[4],
        },
      },
    },
    variants: {
      outline: (props: StyleFunctionProps) => ({
        field: {
          bg: mode('white', 'dark.100')(props),
          borderColor: mode('gray.300', 'dark.400')(props),
          color: mode('gray.800', 'dark.700')(props),
          _hover: {
            borderColor: mode('gray.400', 'dark.500')(props),
          },
          _focus: {
            borderColor: mode('primary.500', 'primary.600')(props),
            bg: mode('white', 'dark.50')(props),
          },
          _placeholder: {
            color: mode('gray.400', 'dark.500')(props),
          },
        },
      }),
      filled: (props: StyleFunctionProps) => ({
        field: {
          bg: mode('gray.100', 'dark.200')(props),
          borderColor: 'transparent',
          color: mode('gray.800', 'dark.700')(props),
          _hover: {
            bg: mode('gray.200', 'dark.300')(props),
          },
          _focus: {
            bg: mode('white', 'dark.50')(props),
            borderColor: mode('primary.500', 'primary.600')(props),
          },
        },
      }),
    },
    defaultProps: {
      size: 'md',
      variant: 'outline',
    },
  },

  // Card Component
  Card: {
    baseStyle: (props: StyleFunctionProps) => ({
      container: {
        bg: mode('white', 'dark.100')(props),
        border: '1px solid',
        borderColor: mode('gray.200', 'dark.300')(props),
        borderRadius: radii.lg,
        boxShadow: mode(shadows.sm, shadows.dark.sm)(props),
        transition: transitions.common.all,
        _hover: {
          boxShadow: mode(shadows.md, shadows.dark.md)(props),
        },
      },
    }),
  },

  // Modal Component (ChatGPT inspired)
  Modal: {
    baseStyle: (props: StyleFunctionProps) => ({
      dialog: {
        bg: mode('white', 'dark.100')(props),
        boxShadow: mode(
          '0 25px 50px -12px rgba(0, 0, 0, 0.25)',
          '0 25px 50px -12px rgba(0, 0, 0, 0.6)'
        )(props),
        borderRadius: radii.xl,
        border: '1px solid',
        borderColor: mode('gray.100', 'dark.300')(props),
        mx: spacing[4],
        my: spacing[16],
      },
      overlay: {
        bg: 'blackAlpha.600',
        backdropFilter: 'blur(4px)',
        transition: 'all 0.15s cubic-bezier(0.4, 0, 0.2, 1)',
      },
      header: {
        fontSize: chatgpt.text.heading3.fontSize,
        fontWeight: chatgpt.text.heading3.fontWeight,
        lineHeight: chatgpt.text.heading3.lineHeight,
        letterSpacing: chatgpt.text.heading3.letterSpacing,
        color: mode('gray.900', 'dark.800')(props),
        pb: spacing[4],
        px: spacing[6],
        pt: spacing[6],
      },
      body: {
        fontSize: chatgpt.text.bodySmallRegular.fontSize,
        lineHeight: chatgpt.text.bodySmallRegular.lineHeight,
        letterSpacing: chatgpt.text.bodySmallRegular.letterSpacing,
        color: mode('gray.700', 'dark.600')(props),
        px: spacing[6],
        py: 0,
      },
      footer: {
        px: spacing[6],
        pb: spacing[6],
        pt: spacing[4],
        gap: spacing[3],
      },
    }),
    sizes: {
      xs: { dialog: { maxW: '20rem', my: '20vh' } },
      sm: { dialog: { maxW: '24rem', my: '16vh' } },
      md: { dialog: { maxW: '28rem', my: '12vh' } },
      lg: { dialog: { maxW: '32rem', my: '8vh' } },
      xl: { dialog: { maxW: '36rem', my: '4vh' } },
      '2xl': { dialog: { maxW: '42rem', my: '2vh' } },
      '3xl': { dialog: { maxW: '48rem', my: '2vh' } },
      '4xl': { dialog: { maxW: '56rem', my: '2vh' } },
      '5xl': { dialog: { maxW: '64rem', my: '2vh' } },
      '6xl': { dialog: { maxW: '72rem', my: '2vh' } },
      full: { dialog: { maxW: '100vw', minH: '100vh', my: 0, mx: 0 } },
    },
    defaultProps: {
      size: 'md',
      isCentered: true,
    },
  },

  // Menu Component (ChatGPT inspired)
  Menu: {
    baseStyle: (props: StyleFunctionProps) => ({
      list: {
        bg: mode('white', 'dark.100')(props),
        border: '1px solid',
        borderColor: mode('gray.200', 'dark.300')(props),
        boxShadow: mode(
          '0 10px 15px -3px rgba(0, 0, 0, 0.1), 0 4px 6px -2px rgba(0, 0, 0, 0.05)',
          '0 10px 15px -3px rgba(0, 0, 0, 0.4), 0 4px 6px -2px rgba(0, 0, 0, 0.3)'
        )(props),
        borderRadius: radii.md,
        py: spacing[2],
        minW: '200px',
        fontSize: chatgpt.text.bodySmallRegular.fontSize,
        lineHeight: chatgpt.text.bodySmallRegular.lineHeight,
        letterSpacing: chatgpt.text.bodySmallRegular.letterSpacing,
      },
      item: {
        bg: 'transparent',
        color: mode('gray.700', 'dark.600')(props),
        px: spacing[3],
        py: spacing[2],
        borderRadius: radii.sm,
        mx: spacing[1],
        fontSize: 'inherit',
        fontWeight: typography.fontWeights.normal,
        transition: transitions.common.colors,
        _hover: {
          bg: mode('gray.100', 'dark.200')(props),
          color: mode('gray.900', 'dark.700')(props),
        },
        _focus: {
          bg: mode('primary.50', 'primary.900')(props),
          color: mode('primary.600', 'primary.200')(props),
          boxShadow: 'none',
        },
        _active: {
          bg: mode('primary.100', 'primary.800')(props),
        },
        _disabled: {
          color: mode('gray.400', 'dark.400')(props),
          cursor: 'not-allowed',
          _hover: {
            bg: 'transparent',
            color: mode('gray.400', 'dark.400')(props),
          },
        },
      },
      divider: {
        borderColor: mode('gray.100', 'dark.300')(props),
        my: spacing[1],
        mx: spacing[1],
      },
    }),
  },

  // Text Component
  Text: {
    baseStyle: (props: StyleFunctionProps) => ({
      color: mode('gray.800', 'dark.700')(props),
    }),
    variants: {
      muted: (props: StyleFunctionProps) => ({
        color: mode('gray.500', 'dark.500')(props),
      }),
      accent: (props: StyleFunctionProps) => ({
        color: mode('primary.600', 'primary.400')(props),
      }),
    },
  },

  // Heading Component
  Heading: {
    baseStyle: (props: StyleFunctionProps) => ({
      fontFamily: typography.fonts.heading,
      fontWeight: typography.fontWeights.semibold,
      color: mode('gray.900', 'dark.800')(props),
    }),
  },

  // Divider Component
  Divider: {
    baseStyle: (props: StyleFunctionProps) => ({
      borderColor: mode('gray.200', 'dark.300')(props),
    }),
  },

  // Tooltip Component
  Tooltip: {
    baseStyle: (props: StyleFunctionProps) => ({
      bg: mode('gray.800', 'dark.800')(props),
      color: mode('white', 'dark.900')(props),
      borderRadius: radii.md,
      fontSize: typography.fontSizes.sm,
      px: spacing[3],
      py: spacing[2],
      maxW: '320px',
      boxShadow: mode(shadows.lg, shadows.dark.lg)(props),
    }),
  },

  // Toast Component
  Alert: {
    variants: {
      toast: (props: StyleFunctionProps) => ({
        container: {
          bg: mode('white', 'dark.100')(props),
          border: '1px solid',
          borderColor: mode('gray.200', 'dark.300')(props),
          borderRadius: radii.lg,
          boxShadow: mode(shadows.xl, shadows.dark.xl)(props),
          color: mode('gray.800', 'dark.700')(props),
        },
      }),
    },
  },

  // Badge Component
  Badge: {
    baseStyle: {
      fontWeight: typography.fontWeights.medium,
      borderRadius: radii.md,
      textTransform: 'none',
      fontSize: typography.fontSizes.xs,
    },
    sizes: {
      sm: {
        h: componentTokens.badge.sizes.sm,
        minH: componentTokens.badge.sizes.sm,
        px: componentTokens.badge.paddings.sm.split(' ')[1],
        py: componentTokens.badge.paddings.sm.split(' ')[0],
        fontSize: typography.fontSizes.xs,
      },
      md: {
        h: componentTokens.badge.sizes.md,
        minH: componentTokens.badge.sizes.md,
        px: componentTokens.badge.paddings.md.split(' ')[1],
        py: componentTokens.badge.paddings.md.split(' ')[0],
        fontSize: typography.fontSizes.sm,
      },
      lg: {
        h: componentTokens.badge.sizes.lg,
        minH: componentTokens.badge.sizes.lg,
        px: componentTokens.badge.paddings.lg.split(' ')[1],
        py: componentTokens.badge.paddings.lg.split(' ')[0],
        fontSize: typography.fontSizes.sm,
      },
    },
    variants: {
      solid: (props: StyleFunctionProps) => ({
        bg: mode('primary.500', 'primary.600')(props),
        color: 'white',
      }),
      subtle: (props: StyleFunctionProps) => ({
        bg: mode('primary.100', 'primary.900')(props),
        color: mode('primary.800', 'primary.200')(props),
      }),
      outline: (props: StyleFunctionProps) => ({
        boxShadow: `inset 0 0 0px 1px ${mode('primary.500', 'primary.600')(props)}`,
        color: mode('primary.500', 'primary.200')(props),
      }),
    },
    defaultProps: {
      size: 'md',
      variant: 'subtle',
    },
  },

  // Avatar Component
  Avatar: {
    baseStyle: {
      borderRadius: radii.full,
    },
    sizes: {
      xs: {
        width: componentTokens.avatar.sizes.xs,
        height: componentTokens.avatar.sizes.xs,
        fontSize: typography.fontSizes.xs,
      },
      sm: {
        width: componentTokens.avatar.sizes.sm,
        height: componentTokens.avatar.sizes.sm,
        fontSize: typography.fontSizes.sm,
      },
      md: {
        width: componentTokens.avatar.sizes.md,
        height: componentTokens.avatar.sizes.md,
        fontSize: typography.fontSizes.md,
      },
      lg: {
        width: componentTokens.avatar.sizes.lg,
        height: componentTokens.avatar.sizes.lg,
        fontSize: typography.fontSizes.lg,
      },
      xl: {
        width: componentTokens.avatar.sizes.xl,
        height: componentTokens.avatar.sizes.xl,
        fontSize: typography.fontSizes.xl,
      },
      '2xl': {
        width: componentTokens.avatar.sizes['2xl'],
        height: componentTokens.avatar.sizes['2xl'],
        fontSize: typography.fontSizes['2xl'],
      },
    },
    defaultProps: {
      size: 'md',
    },
  },

  // Switch Component
  Switch: {
    baseStyle: {
      track: {
        _focus: {
          boxShadow: shadows.focus.primary,
        },
      },
    },
    variants: {
      primary: (props: StyleFunctionProps) => ({
        track: {
          _checked: {
            bg: mode('primary.500', 'primary.600')(props),
          },
        },
      }),
    },
    defaultProps: {
      variant: 'primary',
      size: 'md',
    },
  },

  // Tabs Component
  Tabs: {
    variants: {
      line: (props: StyleFunctionProps) => ({
        tab: {
          borderBottomWidth: '2px',
          borderBottomColor: 'transparent',
          _selected: {
            color: mode('primary.600', 'primary.300')(props),
            borderBottomColor: mode('primary.600', 'primary.300')(props),
          },
          _hover: {
            color: mode('primary.700', 'primary.200')(props),
          },
        },
        tabpanel: {
          px: 0,
        },
      }),
      enclosed: (props: StyleFunctionProps) => ({
        tab: {
          border: '1px solid',
          borderColor: 'transparent',
          _selected: {
            color: mode('primary.600', 'primary.300')(props),
            borderColor: mode('gray.200', 'dark.300')(props),
            borderBottomColor: mode('white', 'dark.100')(props),
            mb: '-1px',
          },
        },
        tablist: {
          borderBottomColor: mode('gray.200', 'dark.300')(props),
        },
        tabpanel: {
          border: '1px solid',
          borderColor: mode('gray.200', 'dark.300')(props),
          borderTopColor: 'transparent',
          borderRadius: `0 0 ${radii.md} ${radii.md}`,
        },
      }),
    },
    defaultProps: {
      variant: 'line',
      size: 'md',
    },
  },

  // Progress Component
  Progress: {
    baseStyle: (props: StyleFunctionProps) => ({
      track: {
        bg: mode('gray.100', 'dark.200')(props),
      },
      filledTrack: {
        bg: mode('primary.500', 'primary.600')(props),
      },
    }),
  },

  // Skeleton Component
  Skeleton: {
    baseStyle: (props: StyleFunctionProps) => ({
      bg: mode('gray.100', 'dark.200')(props),
      borderRadius: radii.md,
    }),
  },
}

// Enhanced Semantic Token System
const semanticTokens = {
  colors: {
    // Background semantic tokens
    'bg.canvas': {
      default: semantic.backgrounds.canvas.light,
      _dark: semantic.backgrounds.canvas.dark,
    },
    'bg.surface': {
      default: semantic.backgrounds.surface.light,
      _dark: semantic.backgrounds.surface.dark,
    },
    'bg.overlay': {
      default: semantic.backgrounds.overlay.light,
      _dark: semantic.backgrounds.overlay.dark,
    },
    'bg.subtle': {
      default: semantic.backgrounds.subtle.light,
      _dark: semantic.backgrounds.subtle.dark,
    },
    'bg.muted': {
      default: semantic.backgrounds.muted.light,
      _dark: semantic.backgrounds.muted.dark,
    },

    // Text semantic tokens
    'text.primary': {
      default: semantic.text.primary.light,
      _dark: semantic.text.primary.dark,
    },
    'text.secondary': {
      default: semantic.text.secondary.light,
      _dark: semantic.text.secondary.dark,
    },
    'text.muted': {
      default: semantic.text.muted.light,
      _dark: semantic.text.muted.dark,
    },
    'text.subtle': {
      default: semantic.text.subtle.light,
      _dark: semantic.text.subtle.dark,
    },
    'text.disabled': {
      default: semantic.text.disabled.light,
      _dark: semantic.text.disabled.dark,
    },
    'text.inverted': {
      default: semantic.text.inverted.light,
      _dark: semantic.text.inverted.dark,
    },
    'text.accent': {
      default: semantic.text.accent.light,
      _dark: semantic.text.accent.dark,
    },

    // Border semantic tokens
    'border.primary': {
      default: semantic.borders.primary.light,
      _dark: semantic.borders.primary.dark,
    },
    'border.secondary': {
      default: semantic.borders.secondary.light,
      _dark: semantic.borders.secondary.dark,
    },
    'border.muted': {
      default: semantic.borders.muted.light,
      _dark: semantic.borders.muted.dark,
    },
    'border.accent': {
      default: semantic.borders.accent.light,
      _dark: semantic.borders.accent.dark,
    },
    'border.focus': {
      default: semantic.borders.focus.light,
      _dark: semantic.borders.focus.dark,
    },

    // Interactive semantic tokens
    'interactive.default': {
      default: semantic.interactive.default.light,
      _dark: semantic.interactive.default.dark,
    },
    'interactive.hover': {
      default: semantic.interactive.hover.light,
      _dark: semantic.interactive.hover.dark,
    },
    'interactive.active': {
      default: semantic.interactive.active.light,
      _dark: semantic.interactive.active.dark,
    },
    'interactive.disabled': {
      default: semantic.interactive.disabled.light,
      _dark: semantic.interactive.disabled.dark,
    },
  },

  // Space semantic tokens
  space: {
    'sidebar.width': componentTokens.sidebar.width,
    'sidebar.collapsed': componentTokens.sidebar.collapsedWidth,
    'header.height': componentTokens.header.height,
    // ChatGPT specific spacings
    'composer.height': chatgpt.composer.barHeight,
    'composer.footer': chatgpt.composer.footerHeight,
    'composer.margins': chatgpt.composer.safeMargins,
    'scrollbar.width': chatgpt.scrollbar.width,
  },

  // Size semantic tokens
  sizes: {
    'sidebar.width': componentTokens.sidebar.width,
    'sidebar.collapsed': componentTokens.sidebar.collapsedWidth,
    'header.height': componentTokens.header.height,
    'container.sm': layout.containers.sm,
    'container.md': layout.containers.md,
    'container.lg': layout.containers.lg,
    'container.xl': layout.containers.xl,
    // ChatGPT specific sizes
    'composer.width': chatgpt.composer.barWidth,
    'composer.height': chatgpt.composer.barHeight,
  },
}

// Create the extended theme
export const chakraTheme = extendTheme({
  config,
  styles,
  colors: {
    ...colors,
    // Ensure Chakra UI's default colors are still available
    brand: colors.primary,
  },
  fonts: {
    ...typography.fonts,
    // Use the enhanced font stack with OpenAI Sans fallback
    heading: typography.fonts.heading,
    body: typography.fonts.body,
  },
  fontSizes: {
    ...typography.fontSizes,
    // Add ChatGPT semantic font sizes
    'chatgpt.heading2': chatgpt.text.heading2.fontSize,
    'chatgpt.heading3': chatgpt.text.heading3.fontSize,
    'chatgpt.body-small': chatgpt.text.bodySmallRegular.fontSize,
    'chatgpt.monospace': chatgpt.text.monospace.fontSize,
    'chatgpt.caption': chatgpt.text.captionRegular.fontSize,
  },
  fontWeights: typography.fontWeights,
  lineHeights: {
    ...typography.lineHeights,
    // Add ChatGPT semantic line heights
    'chatgpt.heading2': chatgpt.text.heading2.lineHeight,
    'chatgpt.heading3': chatgpt.text.heading3.lineHeight,
    'chatgpt.body-small': chatgpt.text.bodySmallRegular.lineHeight,
    'chatgpt.monospace': chatgpt.text.monospace.lineHeight,
    'chatgpt.caption': chatgpt.text.captionRegular.lineHeight,
  },
  letterSpacings: {
    ...typography.letterSpacings,
    // Add ChatGPT semantic letter spacings
    'chatgpt.heading2': chatgpt.text.heading2.letterSpacing,
    'chatgpt.heading3': chatgpt.text.heading3.letterSpacing,
    'chatgpt.body-small': chatgpt.text.bodySmallRegular.letterSpacing,
    'chatgpt.monospace': chatgpt.text.monospace.letterSpacing,
    'chatgpt.caption': chatgpt.text.captionRegular.letterSpacing,
  },
  space: {
    ...spacing,
    // Add ChatGPT specific spacings
    'chatgpt.composer.margins': chatgpt.composer.safeMargins,
    'chatgpt.scrollbar.width': chatgpt.scrollbar.width,
  },
  sizes: {
    ...spacing,
    // Add common component sizes
    sidebar: componentTokens.sidebar.width,
    sidebarCollapsed: componentTokens.sidebar.collapsedWidth,
    header: componentTokens.header.height,
    // Container sizes (enhanced with ChatGPT values)
    container: {
      ...layout.containers,
      ...chatgpt.containers,
    },
    // Modal sizes
    modal: layout.dimensions.modal,
    // ChatGPT specific sizes
    'chatgpt.composer.width': chatgpt.composer.barWidth,
    'chatgpt.composer.height': chatgpt.composer.barHeight,
  },
  radii,
  shadows: {
    ...shadows,
    ...shadows.dark,
    // Add ChatGPT drop shadows
    'chatgpt.xs': chatgpt.dropShadows.xs,
    'chatgpt.sm': chatgpt.dropShadows.sm,
    'chatgpt.md': chatgpt.dropShadows.md,
    'chatgpt.lg': chatgpt.dropShadows.lg,
  },
  zIndices,
  breakpoints,
  transition: {
    // Add ChatGPT spring transitions
    property: {
      common: 'background-color, border-color, color, fill, stroke, opacity, box-shadow, transform',
      colors: 'background-color, border-color, color, fill, stroke',
      dimensions: 'width, height',
      position: 'left, right, top, bottom',
      background: 'background-color, background-image, background-position',
    },
    easing: {
      ...transitions.easing,
      // Add ChatGPT spring easings
      'spring-common': chatgpt.springs.common.easing,
      'spring-fast': chatgpt.springs.fast.easing,
      'spring-bounce': chatgpt.springs.bounce.easing,
    },
    duration: {
      ...transitions.duration,
      // Add ChatGPT spring durations
      'spring-common': chatgpt.springs.common.duration,
      'spring-fast': chatgpt.springs.fast.duration,
      'spring-bounce': chatgpt.springs.bounce.duration,
      'spring-slow-bounce': chatgpt.springs.slowBounce.duration,
      'spring-fast-bounce': chatgpt.springs.fastBounce.duration,
    },
  },
  semanticTokens,
  components,
})

// Export individual parts for reuse
export { config as themeConfig }
export type ChakraTheme = typeof chakraTheme
