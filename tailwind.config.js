/** @type {import('tailwindcss').Config} */

// Import design tokens
const {
  colors,
  typography,
  spacing,
  shadows,
  radii,
  breakpoints,
  transitions,
  layout,
  components: componentTokens,
  // eslint-disable-next-line @typescript-eslint/no-var-requires
} = require('./src/theme/tokens.ts')

module.exports = {
  content: ['./index.html', './src/**/*.{js,ts,jsx,tsx}'],
  darkMode: 'class', // Enable class-based dark mode to match Chakra UI
  theme: {
    extend: {
      // Colors from our design tokens
      colors: {
        primary: colors.primary,
        secondary: colors.secondary,
        success: colors.success,
        warning: colors.warning,
        error: colors.error,
        gray: colors.gray,
        dark: colors.dark,
        // Semantic color aliases
        brand: colors.primary,
        accent: colors.secondary,
      },

      // Typography
      fontFamily: {
        sans: typography.fonts.body.split(', '),
        heading: typography.fonts.heading.split(', '),
        mono: typography.fonts.mono.split(', '),
      },
      fontSize: typography.fontSizes,
      fontWeight: typography.fontWeights,
      lineHeight: typography.lineHeights,
      letterSpacing: typography.letterSpacings,

      // Spacing (Tailwind uses same keys by default)
      spacing,

      // Border Radius
      borderRadius: {
        ...radii,
        // Tailwind compatibility aliases
        none: radii.none,
        sm: radii.sm,
        DEFAULT: radii.base,
        md: radii.md,
        lg: radii.lg,
        xl: radii.xl,
        '2xl': radii['2xl'],
        '3xl': radii['3xl'],
        full: radii.full,
      },

      // Box Shadow
      boxShadow: {
        ...shadows,
        // Dark theme shadows with 'dark-' prefix for class-based dark mode
        'dark-xs': shadows.dark.xs,
        'dark-sm': shadows.dark.sm,
        'dark-md': shadows.dark.md,
        'dark-lg': shadows.dark.lg,
        'dark-xl': shadows.dark.xl,
        'dark-2xl': shadows.dark['2xl'],
        // Focus shadows
        'focus-primary': shadows.focus.primary,
        'focus-error': shadows.focus.error,
        'focus-success': shadows.focus.success,
      },

      // Breakpoints
      screens: {
        sm: breakpoints.sm,
        md: breakpoints.md,
        lg: breakpoints.lg,
        xl: breakpoints.xl,
        '2xl': breakpoints['2xl'],
      },

      // Transitions
      transitionDuration: transitions.duration,
      transitionTimingFunction: {
        'ease-in-out': transitions.easing.easeInOut,
        'ease-out': transitions.easing.easeOut,
        'ease-in': transitions.easing.easeIn,
        sharp: transitions.easing.sharp,
      },

      // Animation
      animation: {
        'fade-in': 'fadeIn 300ms ease-in-out',
        'slide-in-right': 'slideInRight 300ms ease-in-out',
        'slide-in-left': 'slideInLeft 300ms ease-in-out',
        'slide-up': 'slideUp 300ms ease-in-out',
        'scale-in': 'scaleIn 200ms ease-in-out',
        'pulse-subtle': 'pulseSubtle 2s ease-in-out infinite',
      },

      // Keyframes for animations
      keyframes: {
        fadeIn: {
          '0%': { opacity: '0' },
          '100%': { opacity: '1' },
        },
        slideInRight: {
          '0%': { transform: 'translateX(100%)', opacity: '0' },
          '100%': { transform: 'translateX(0)', opacity: '1' },
        },
        slideInLeft: {
          '0%': { transform: 'translateX(-100%)', opacity: '0' },
          '100%': { transform: 'translateX(0)', opacity: '1' },
        },
        slideUp: {
          '0%': { transform: 'translateY(100%)', opacity: '0' },
          '100%': { transform: 'translateY(0)', opacity: '1' },
        },
        scaleIn: {
          '0%': { transform: 'scale(0.9)', opacity: '0' },
          '100%': { transform: 'scale(1)', opacity: '1' },
        },
        pulseSubtle: {
          '0%, 100%': { opacity: '1' },
          '50%': { opacity: '0.7' },
        },
      },

      // Z-Index values
      zIndex: {
        hide: '-1',
        auto: 'auto',
        base: '0',
        docked: '10',
        dropdown: '1000',
        sticky: '1100',
        banner: '1200',
        overlay: '1300',
        modal: '1400',
        popover: '1500',
        skipLink: '1600',
        toast: '1700',
        tooltip: '1800',
      },

      // Layout-specific utilities
      width: {
        sidebar: componentTokens.sidebar.width,
        'sidebar-collapsed': componentTokens.sidebar.collapsedWidth,
        'sidebar-min': componentTokens.sidebar.minWidth,
        'sidebar-max': componentTokens.sidebar.maxWidth,
      },
      height: {
        header: componentTokens.header.height,
        'header-min': componentTokens.header.minHeight,
        'header-max': componentTokens.header.maxHeight,
        footer: layout.dimensions.footer.height,
        'input-sm': componentTokens.input.heights.sm,
        'input-md': componentTokens.input.heights.md,
        'input-lg': componentTokens.input.heights.lg,
        'input-xl': componentTokens.input.heights.xl,
        'button-xs': componentTokens.button.heights.xs,
        'button-sm': componentTokens.button.heights.sm,
        'button-md': componentTokens.button.heights.md,
        'button-lg': componentTokens.button.heights.lg,
        'button-xl': componentTokens.button.heights.xl,
      },
      minWidth: {
        sidebar: componentTokens.sidebar.minWidth,
        'sidebar-collapsed': componentTokens.sidebar.collapsedWidth,
        ...layout.containers,
      },
      maxWidth: {
        sidebar: componentTokens.sidebar.maxWidth,
        content: layout.dimensions.content.maxWidth,
        'modal-xs': layout.dimensions.modal.xs,
        'modal-sm': layout.dimensions.modal.sm,
        'modal-md': layout.dimensions.modal.md,
        'modal-lg': layout.dimensions.modal.lg,
        'modal-xl': layout.dimensions.modal.xl,
        ...layout.containers,
      },

      // Icon sizes for consistent icon usage
      iconSize: componentTokens.icons.sizes,

      // Grid system utilities
      gridTemplateColumns: layout.grid.columns,
      gap: layout.grid.gaps,
    },
  },
  plugins: [
    // Enhanced plugin for Knowlex design system utilities
    function ({ addUtilities, addComponents, theme }) {
      // Utility classes
      const utilities = {
        // Scrollbar utilities
        '.scrollbar-hide': {
          '-ms-overflow-style': 'none',
          'scrollbar-width': 'none',
          '&::-webkit-scrollbar': {
            display: 'none',
          },
        },
        '.scrollbar-thin': {
          'scrollbar-width': 'thin',
          '&::-webkit-scrollbar': {
            width: '8px',
            height: '8px',
          },
          '&::-webkit-scrollbar-track': {
            backgroundColor: theme('colors.gray.100'),
            borderRadius: theme('borderRadius.base'),
          },
          '&::-webkit-scrollbar-thumb': {
            backgroundColor: theme('colors.gray.300'),
            borderRadius: theme('borderRadius.base'),
            '&:hover': {
              backgroundColor: theme('colors.gray.400'),
            },
          },
        },
        '.scrollbar-thin-dark': {
          'scrollbar-width': 'thin',
          '&::-webkit-scrollbar': {
            width: '8px',
            height: '8px',
          },
          '&::-webkit-scrollbar-track': {
            backgroundColor: theme('colors.dark.200'),
            borderRadius: theme('borderRadius.base'),
          },
          '&::-webkit-scrollbar-thumb': {
            backgroundColor: theme('colors.dark.400'),
            borderRadius: theme('borderRadius.base'),
            '&:hover': {
              backgroundColor: theme('colors.dark.500'),
            },
          },
        },

        // Glass morphism effects
        '.glass-effect': {
          backgroundColor: 'rgba(255, 255, 255, 0.8)',
          backdropFilter: 'blur(8px)',
          borderColor: 'rgba(255, 255, 255, 0.2)',
        },
        '.glass-effect-dark': {
          backgroundColor: 'rgba(24, 25, 26, 0.8)',
          backdropFilter: 'blur(8px)',
          borderColor: 'rgba(255, 255, 255, 0.1)',
        },

        // Text utilities
        '.text-gradient': {
          background: `linear-gradient(135deg, ${theme('colors.primary.600')}, ${theme('colors.primary.400')})`,
          WebkitBackgroundClip: 'text',
          WebkitTextFillColor: 'transparent',
          backgroundClip: 'text',
        },
        '.text-gradient-secondary': {
          background: `linear-gradient(135deg, ${theme('colors.secondary.600')}, ${theme('colors.secondary.400')})`,
          WebkitBackgroundClip: 'text',
          WebkitTextFillColor: 'transparent',
          backgroundClip: 'text',
        },

        // Layout utilities
        '.layout-sidebar': {
          width: theme('width.sidebar'),
          minWidth: theme('minWidth.sidebar'),
          maxWidth: theme('maxWidth.sidebar'),
        },
        '.layout-sidebar-collapsed': {
          width: theme('width.sidebar-collapsed'),
          minWidth: theme('minWidth.sidebar-collapsed'),
        },
        '.layout-header': {
          height: theme('height.header'),
          minHeight: theme('height.header-min'),
        },

        // Flex utilities for common layouts
        '.flex-center': {
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
        },
        '.flex-between': {
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
        },
        '.flex-start': {
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'flex-start',
        },
        '.flex-end': {
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'flex-end',
        },

        // Icon utilities
        '.icon-xs': { width: theme('iconSize.xs'), height: theme('iconSize.xs') },
        '.icon-sm': { width: theme('iconSize.sm'), height: theme('iconSize.sm') },
        '.icon-md': { width: theme('iconSize.md'), height: theme('iconSize.md') },
        '.icon-lg': { width: theme('iconSize.lg'), height: theme('iconSize.lg') },
        '.icon-xl': { width: theme('iconSize.xl'), height: theme('iconSize.xl') },
        '.icon-2xl': { width: theme('iconSize.2xl'), height: theme('iconSize.2xl') },
        '.icon-3xl': { width: theme('iconSize.3xl'), height: theme('iconSize.3xl') },
      }

      // Component classes (following design system)
      const components = {
        // Button components
        '.btn': {
          display: 'inline-flex',
          alignItems: 'center',
          justifyContent: 'center',
          borderRadius: theme('borderRadius.md'),
          fontWeight: theme('fontWeight.medium'),
          transition: theme('transitionDuration.fast'),
          cursor: 'pointer',
          '&:disabled': {
            opacity: '0.5',
            cursor: 'not-allowed',
          },
        },
        '.btn-primary': {
          backgroundColor: theme('colors.primary.500'),
          color: 'white',
          '&:hover:not(:disabled)': {
            backgroundColor: theme('colors.primary.600'),
          },
          '&:active': {
            backgroundColor: theme('colors.primary.700'),
          },
          '&:focus': {
            boxShadow: theme('boxShadow.focus-primary'),
          },
        },
        '.btn-secondary': {
          backgroundColor: theme('colors.gray.100'),
          color: theme('colors.gray.800'),
          '&:hover:not(:disabled)': {
            backgroundColor: theme('colors.gray.200'),
          },
          '&:active': {
            backgroundColor: theme('colors.gray.300'),
          },
        },
        '.btn-ghost': {
          backgroundColor: 'transparent',
          color: theme('colors.gray.600'),
          '&:hover:not(:disabled)': {
            backgroundColor: theme('colors.gray.100'),
          },
          '&:active': {
            backgroundColor: theme('colors.gray.200'),
          },
        },

        // Button sizes
        '.btn-xs': {
          height: theme('height.button-xs'),
          padding: componentTokens.button.paddings.xs,
          fontSize: theme('fontSize.xs'),
        },
        '.btn-sm': {
          height: theme('height.button-sm'),
          padding: componentTokens.button.paddings.sm,
          fontSize: theme('fontSize.sm'),
        },
        '.btn-md': {
          height: theme('height.button-md'),
          padding: componentTokens.button.paddings.md,
          fontSize: theme('fontSize.md'),
        },
        '.btn-lg': {
          height: theme('height.button-lg'),
          padding: componentTokens.button.paddings.lg,
          fontSize: theme('fontSize.lg'),
        },
        '.btn-xl': {
          height: theme('height.button-xl'),
          padding: componentTokens.button.paddings.xl,
          fontSize: theme('fontSize.xl'),
        },

        // Card components
        '.card': {
          backgroundColor: theme('colors.white'),
          borderRadius: theme('borderRadius.lg'),
          border: `1px solid ${theme('colors.gray.200')}`,
          boxShadow: theme('boxShadow.sm'),
          transition: theme('transitionDuration.fast'),
          '&:hover': {
            boxShadow: theme('boxShadow.md'),
          },
        },
        '.card-dark': {
          backgroundColor: theme('colors.dark.100'),
          borderColor: theme('colors.dark.300'),
          boxShadow: theme('boxShadow.dark-sm'),
          '&:hover': {
            boxShadow: theme('boxShadow.dark-md'),
          },
        },

        // Input components
        '.input': {
          width: '100%',
          borderRadius: theme('borderRadius.md'),
          border: `1px solid ${theme('colors.gray.300')}`,
          backgroundColor: theme('colors.white'),
          color: theme('colors.gray.800'),
          transition: theme('transitionDuration.fast'),
          '&:focus': {
            borderColor: theme('colors.primary.500'),
            boxShadow: theme('boxShadow.focus-primary'),
            outline: 'none',
          },
          '&::placeholder': {
            color: theme('colors.gray.400'),
          },
        },
        '.input-sm': {
          height: theme('height.input-sm'),
          padding: componentTokens.input.paddings.sm,
          fontSize: theme('fontSize.sm'),
        },
        '.input-md': {
          height: theme('height.input-md'),
          padding: componentTokens.input.paddings.md,
          fontSize: theme('fontSize.md'),
        },
        '.input-lg': {
          height: theme('height.input-lg'),
          padding: componentTokens.input.paddings.lg,
          fontSize: theme('fontSize.lg'),
        },
      }

      addUtilities(utilities, ['responsive', 'hover', 'focus', 'dark'])
      addComponents(components)
    },
  ],
}
