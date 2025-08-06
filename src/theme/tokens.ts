/**
 * Design Tokens for Knowlex Desktop Application
 *
 * This file defines the core design tokens that form the foundation of our design system.
 * These tokens are used by both Chakra UI theme and can be referenced in Tailwind CSS.
 */

// Color System
export const colors = {
  // Primary Brand Colors
  primary: {
    50: '#E8F4FD',
    100: '#C6E0FB',
    200: '#A4CCF9',
    300: '#82B8F7',
    400: '#60A4F5',
    500: '#3E90F3', // Main brand color
    600: '#2D7AE0',
    700: '#1C64CD',
    800: '#0B4EBA',
    900: '#0A4AA7',
  },

  // Secondary Colors
  secondary: {
    50: '#F7F8FA',
    100: '#E1E5E9',
    200: '#CCD2D8',
    300: '#B6BFC7',
    400: '#A1ACB6',
    500: '#8B99A5', // Secondary brand color
    600: '#7A8894',
    700: '#697783',
    800: '#586672',
    900: '#475561',
  },

  // Semantic Colors
  success: {
    50: '#E6F9F4',
    100: '#B3E5D1',
    200: '#80D1AE',
    300: '#4DBD8B',
    400: '#1AA968',
    500: '#059547', // Success color
    600: '#048139',
    700: '#036D2B',
    800: '#02591D',
    900: '#01450F',
  },

  warning: {
    50: '#FEF8E6',
    100: '#FBEAB3',
    200: '#F8DC80',
    300: '#F5CE4D',
    400: '#F2C01A',
    500: '#F5B800', // Warning color
    600: '#E0A600',
    700: '#CB9400',
    800: '#B68200',
    900: '#A17000',
  },

  error: {
    50: '#FDE8E8',
    100: '#FAB3B3',
    200: '#F77E7E',
    300: '#F44949',
    400: '#F11414',
    500: '#E53E3E', // Error color
    600: '#D73737',
    700: '#C93030',
    800: '#BB2929',
    900: '#AD2222',
  },

  // Neutral/Gray Colors
  gray: {
    50: '#F9FAFB',
    100: '#F3F4F6',
    200: '#E5E7EB',
    300: '#D1D5DB',
    400: '#9CA3AF',
    500: '#6B7280',
    600: '#4B5563',
    700: '#374151',
    800: '#1F2937',
    900: '#0F172A',
  },

  // Dark Theme Colors
  dark: {
    50: '#18191A', // Darkest background
    100: '#242526', // Dark background
    200: '#3A3B3C', // Medium dark
    300: '#4E4F50', // Light dark
    400: '#62656A', // Border dark
    500: '#8A8D91', // Text muted dark
    600: '#B0B3B8', // Text secondary dark
    700: '#D0D3D8', // Text primary dark
    800: '#E4E6EA', // Text high contrast dark
    900: '#FFFFFF', // Pure white for dark theme
  },
} as const

// Typography System
export const typography = {
  // Font Families
  fonts: {
    heading:
      '"SF Pro Display", -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, "PingFang SC", "Hiragino Sans GB", "Microsoft YaHei", sans-serif',
    body: '"SF Pro Text", -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, "PingFang SC", "Hiragino Sans GB", "Microsoft YaHei", sans-serif',
    mono: '"SF Mono", Monaco, "Cascadia Code", "Roboto Mono", Consolas, "Courier New", monospace',
  },

  // Font Sizes
  fontSizes: {
    xs: '0.75rem', // 12px
    sm: '0.875rem', // 14px
    md: '1rem', // 16px - base
    lg: '1.125rem', // 18px
    xl: '1.25rem', // 20px
    '2xl': '1.5rem', // 24px
    '3xl': '1.875rem', // 30px
    '4xl': '2.25rem', // 36px
    '5xl': '3rem', // 48px
    '6xl': '3.75rem', // 60px
  },

  // Font Weights
  fontWeights: {
    light: 300,
    normal: 400,
    medium: 500,
    semibold: 600,
    bold: 700,
    extrabold: 800,
  },

  // Line Heights
  lineHeights: {
    tight: 1.2,
    normal: 1.5,
    relaxed: 1.625,
    loose: 2,
  },

  // Letter Spacing
  letterSpacings: {
    tight: '-0.025em',
    normal: '0',
    wide: '0.025em',
    wider: '0.05em',
    widest: '0.1em',
  },
} as const

// Spacing System (based on 4px grid)
export const spacing = {
  0: '0',
  px: '1px',
  0.5: '0.125rem', // 2px
  1: '0.25rem', // 4px
  1.5: '0.375rem', // 6px
  2: '0.5rem', // 8px
  2.5: '0.625rem', // 10px
  3: '0.75rem', // 12px
  3.5: '0.875rem', // 14px
  4: '1rem', // 16px
  5: '1.25rem', // 20px
  6: '1.5rem', // 24px
  7: '1.75rem', // 28px
  8: '2rem', // 32px
  9: '2.25rem', // 36px
  10: '2.5rem', // 40px
  11: '2.75rem', // 44px
  12: '3rem', // 48px
  14: '3.5rem', // 56px
  16: '4rem', // 64px
  20: '5rem', // 80px
  24: '6rem', // 96px
  28: '7rem', // 112px
  32: '8rem', // 128px
  36: '9rem', // 144px
  40: '10rem', // 160px
  44: '11rem', // 176px
  48: '12rem', // 192px
  52: '13rem', // 208px
  56: '14rem', // 224px
  60: '15rem', // 240px
  64: '16rem', // 256px
  72: '18rem', // 288px
  80: '20rem', // 320px
  96: '24rem', // 384px

  // ChatGPT semantic spacings
  'composer-safe-margins': '20px',
  'scrollbar-width': '10px',
} as const

// Shadow System
export const shadows = {
  // Elevation Shadows
  xs: '0 1px 2px 0 rgba(0, 0, 0, 0.05)',
  sm: '0 1px 3px 0 rgba(0, 0, 0, 0.1), 0 1px 2px 0 rgba(0, 0, 0, 0.06)',
  md: '0 4px 6px -1px rgba(0, 0, 0, 0.1), 0 2px 4px -1px rgba(0, 0, 0, 0.06)',
  lg: '0 10px 15px -3px rgba(0, 0, 0, 0.1), 0 4px 6px -2px rgba(0, 0, 0, 0.05)',
  xl: '0 20px 25px -5px rgba(0, 0, 0, 0.1), 0 10px 10px -5px rgba(0, 0, 0, 0.04)',
  '2xl': '0 25px 50px -12px rgba(0, 0, 0, 0.25)',

  // Inner Shadow
  inner: 'inset 0 2px 4px 0 rgba(0, 0, 0, 0.06)',

  // Dark Theme Shadows
  dark: {
    xs: '0 1px 2px 0 rgba(0, 0, 0, 0.3)',
    sm: '0 1px 3px 0 rgba(0, 0, 0, 0.4), 0 1px 2px 0 rgba(0, 0, 0, 0.3)',
    md: '0 4px 6px -1px rgba(0, 0, 0, 0.4), 0 2px 4px -1px rgba(0, 0, 0, 0.3)',
    lg: '0 10px 15px -3px rgba(0, 0, 0, 0.4), 0 4px 6px -2px rgba(0, 0, 0, 0.3)',
    xl: '0 20px 25px -5px rgba(0, 0, 0, 0.4), 0 10px 10px -5px rgba(0, 0, 0, 0.3)',
    '2xl': '0 25px 50px -12px rgba(0, 0, 0, 0.6)',
  },

  // Focus Shadows
  focus: {
    primary: '0 0 0 3px rgba(62, 144, 243, 0.2)',
    error: '0 0 0 3px rgba(229, 62, 62, 0.2)',
    success: '0 0 0 3px rgba(5, 149, 71, 0.2)',
  },
} as const

// Border Radius System
export const radii = {
  none: '0',
  sm: '0.125rem', // 2px
  base: '0.25rem', // 4px
  md: '0.375rem', // 6px
  lg: '0.5rem', // 8px
  xl: '0.75rem', // 12px
  '2xl': '1rem', // 16px
  '3xl': '1.5rem', // 24px
  full: '9999px',
} as const

// Z-Index System
export const zIndices = {
  hide: -1,
  auto: 'auto',
  base: 0,
  docked: 10,
  dropdown: 1000,
  sticky: 1100,
  banner: 1200,
  overlay: 1300,
  modal: 1400,
  popover: 1500,
  skipLink: 1600,
  toast: 1700,
  tooltip: 1800,
} as const

// Breakpoints for Responsive Design
export const breakpoints = {
  sm: '30em', // 480px
  md: '48em', // 768px
  lg: '62em', // 992px
  xl: '80em', // 1280px
  '2xl': '96em', // 1536px
} as const

// Transition System
export const transitions = {
  // Duration
  duration: {
    fast: '150ms',
    normal: '300ms',
    slow: '500ms',
  },

  // Easing
  easing: {
    easeInOut: 'cubic-bezier(0.4, 0, 0.2, 1)',
    easeOut: 'cubic-bezier(0, 0, 0.2, 1)',
    easeIn: 'cubic-bezier(0.4, 0, 1, 1)',
    sharp: 'cubic-bezier(0.4, 0, 0.6, 1)',
  },

  // Common Transitions
  common: {
    all: 'all 300ms cubic-bezier(0.4, 0, 0.2, 1)',
    colors:
      'background-color 300ms cubic-bezier(0.4, 0, 0.2, 1), border-color 300ms cubic-bezier(0.4, 0, 0.2, 1), color 300ms cubic-bezier(0.4, 0, 0.2, 1)',
    transform: 'transform 300ms cubic-bezier(0.4, 0, 0.2, 1)',
    opacity: 'opacity 300ms cubic-bezier(0.4, 0, 0.2, 1)',
  },
} as const

// Icon System
export const icons = {
  // Icon sizes
  sizes: {
    xs: '0.75rem', // 12px
    sm: '1rem', // 16px
    md: '1.25rem', // 20px
    lg: '1.5rem', // 24px
    xl: '2rem', // 32px
    '2xl': '2.5rem', // 40px
    '3xl': '3rem', // 48px
  },

  // Common icon paths (for custom icons)
  paths: {
    // Navigation icons
    home: 'M3 12l2-2m0 0l7-7 7 7M5 10v10a1 1 0 001 1h3m10-11l2 2m-2-2v10a1 1 0 01-1 1h-3m-6-10h6',
    search: 'M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z',
    settings: 'M12 15a3 3 0 100-6 3 3 0 000 6zm-7.5-3a7.5 7.5 0 1115 0 7.5 7.5 0 01-15 0z',

    // File icons
    file: 'M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z',
    folder: 'M3 7v10a2 2 0 002 2h14a2 2 0 002-2V9a2 2 0 00-2-2h-6l-2-2H5a2 2 0 00-2 2z',
    upload: 'M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12',

    // Action icons
    plus: 'M12 4v16m8-8H4',
    edit: 'M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z',
    delete:
      'M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16',
    copy: 'M8 16H6a2 2 0 01-2-2V6a2 2 0 012-2h8a2 2 0 012 2v2m-6 12h8a2 2 0 002-2v-8a2 2 0 00-2-2h-8a2 2 0 00-2 2v8a2 2 0 002 2z',

    // Status icons
    check: 'M5 13l4 4L19 7',
    close: 'M6 18L18 6M6 6l12 12',
    warning:
      'M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.964-.833-2.732 0L3.732 16.5c-.77.833.192 2.5 1.732 2.5z',
    info: 'M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z',

    // Interface icons
    menu: 'M4 6h16M4 12h16M4 18h16',
    chevronDown: 'M19 9l-7 7-7-7',
    chevronUp: 'M9 19l7-7-7-7',
    chevronLeft: 'M15 19l-7-7 7-7',
    chevronRight: 'M9 5l7 7-7 7',

    // Theme icons
    sun: 'M12 3v1m0 16v1m9-9h-1M4 12H3m15.364 6.364l-.707-.707M6.343 6.343l-.707-.707m12.728 0l-.707.707M6.343 17.657l-.707.707M16 12a4 4 0 11-8 0 4 4 0 018 0z',
    moon: 'M20.354 15.354A9 9 0 018.646 3.646 9.003 9.003 0 0012 21a9.003 9.003 0 008.354-5.646z',
    monitor:
      'M9.75 17L9 20l-1 1h8l-1-1-.75-3M3 13h18M5 17h14a2 2 0 002-2V5a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z',
  },
} as const

// Layout System
export const layout = {
  // Container sizes
  containers: {
    xs: '20rem', // 320px
    sm: '24rem', // 384px
    md: '28rem', // 448px
    lg: '32rem', // 512px
    xl: '36rem', // 576px
    '2xl': '42rem', // 672px
    '3xl': '48rem', // 768px
    '4xl': '56rem', // 896px
    '5xl': '64rem', // 1024px
    '6xl': '72rem', // 1152px
    '7xl': '80rem', // 1280px
    full: '100%',
  },

  // Common layout dimensions
  dimensions: {
    sidebar: {
      width: '260px',
      collapsedWidth: '60px',
      minWidth: '200px',
      maxWidth: '320px',
    },
    header: {
      height: '60px',
      minHeight: '48px',
      maxHeight: '80px',
    },
    footer: {
      height: '60px',
      minHeight: '48px',
    },
    content: {
      maxWidth: '1200px',
      padding: '1rem',
    },
    modal: {
      sm: '400px',
      md: '600px',
      lg: '800px',
      xl: '1200px',
      full: '100vw',
    },
  },

  // Grid system
  grid: {
    columns: {
      1: '1fr',
      2: 'repeat(2, 1fr)',
      3: 'repeat(3, 1fr)',
      4: 'repeat(4, 1fr)',
      5: 'repeat(5, 1fr)',
      6: 'repeat(6, 1fr)',
      12: 'repeat(12, 1fr)',
    },
    gaps: {
      none: '0',
      xs: '0.5rem',
      sm: '1rem',
      md: '1.5rem',
      lg: '2rem',
      xl: '3rem',
    },
  },
} as const

// Semantic Tokens (for consistent theming)
export const semantic = {
  // Background colors
  backgrounds: {
    canvas: {
      light: 'white',
      dark: 'dark.50',
    },
    surface: {
      light: 'gray.50',
      dark: 'dark.100',
    },
    overlay: {
      light: 'white',
      dark: 'dark.100',
    },
    subtle: {
      light: 'gray.100',
      dark: 'dark.200',
    },
    muted: {
      light: 'gray.200',
      dark: 'dark.300',
    },
  },

  // Text colors
  text: {
    primary: {
      light: 'gray.900',
      dark: 'dark.800',
    },
    secondary: {
      light: 'gray.700',
      dark: 'dark.700',
    },
    muted: {
      light: 'gray.500',
      dark: 'dark.500',
    },
    subtle: {
      light: 'gray.400',
      dark: 'dark.400',
    },
    disabled: {
      light: 'gray.300',
      dark: 'dark.300',
    },
    inverted: {
      light: 'white',
      dark: 'gray.900',
    },
    accent: {
      light: 'primary.600',
      dark: 'primary.300',
    },
  },

  // Border colors
  borders: {
    primary: {
      light: 'gray.200',
      dark: 'dark.300',
    },
    secondary: {
      light: 'gray.100',
      dark: 'dark.200',
    },
    muted: {
      light: 'gray.50',
      dark: 'dark.100',
    },
    accent: {
      light: 'primary.200',
      dark: 'primary.700',
    },
    focus: {
      light: 'primary.500',
      dark: 'primary.400',
    },
  },

  // Interactive states
  interactive: {
    default: {
      light: 'primary.500',
      dark: 'primary.400',
    },
    hover: {
      light: 'primary.600',
      dark: 'primary.300',
    },
    active: {
      light: 'primary.700',
      dark: 'primary.200',
    },
    disabled: {
      light: 'gray.300',
      dark: 'dark.400',
    },
  },
} as const

// Component Specific Tokens
export const components = {
  // Button variations
  button: {
    heights: {
      xs: '24px',
      sm: '32px',
      md: '40px',
      lg: '48px',
      xl: '56px',
    },
    paddings: {
      xs: '0.5rem 0.75rem',
      sm: '0.5rem 1rem',
      md: '0.75rem 1.5rem',
      lg: '1rem 2rem',
      xl: '1.25rem 2.5rem',
    },
    borderRadius: {
      sm: radii.sm,
      md: radii.md,
      lg: radii.lg,
      xl: radii.xl,
      full: radii.full,
    },
  },

  // Input variations
  input: {
    heights: {
      sm: '32px',
      md: '40px',
      lg: '48px',
      xl: '56px',
    },
    paddings: {
      sm: '0.5rem 0.75rem',
      md: '0.75rem 1rem',
      lg: '1rem 1.25rem',
      xl: '1.25rem 1.5rem',
    },
  },

  // Card variations
  card: {
    paddings: {
      sm: '1rem',
      md: '1.5rem',
      lg: '2rem',
      xl: '2.5rem',
    },
    shadows: {
      sm: shadows.sm,
      md: shadows.md,
      lg: shadows.lg,
      xl: shadows.xl,
    },
  },

  // Modal variations
  modal: {
    sizes: {
      xs: '320px',
      sm: '400px',
      md: '600px',
      lg: '800px',
      xl: '1200px',
      full: '100vw',
    },
    paddings: {
      sm: '1rem',
      md: '1.5rem',
      lg: '2rem',
    },
  },

  // Avatar sizes
  avatar: {
    sizes: {
      xs: '24px',
      sm: '32px',
      md: '40px',
      lg: '48px',
      xl: '64px',
      '2xl': '80px',
    },
  },

  // Badge variations
  badge: {
    sizes: {
      sm: '20px',
      md: '24px',
      lg: '28px',
    },
    paddings: {
      sm: '0.25rem 0.5rem',
      md: '0.375rem 0.75rem',
      lg: '0.5rem 1rem',
    },
  },

  // Sidebar specific
  sidebar: layout.dimensions.sidebar,

  // Header specific
  header: layout.dimensions.header,
} as const

// ChatGPT-specific design tokens
export const chatgpt = {
  // Composer dimensions
  composer: {
    footerHeight: '32px',
    barHeight: '52px',
    barWidth: '768px',
    safeMargins: '20px',
  },

  // Content gradients and masks
  gradients: {
    contentMask:
      'linear-gradient(0deg, #d9d9d9, rgba(216,216,216,0.99) 8.07%, rgba(215,215,215,0.98) 15.54%, rgba(212,212,212,0.95) 22.5%, rgba(208,208,208,0.92) 29.04%, rgba(204,204,204,0.87) 35.26%, rgba(198,198,198,0.82) 41.25%, rgba(192,192,192,0.75) 47.1%, rgba(184,184,184,0.68) 52.9%, rgba(176,176,176,0.6) 58.75%, rgba(168,168,168,0.52) 64.74%, rgba(158,158,158,0.42) 70.96%, rgba(148,148,148,0.33) 77.5%, rgba(138,138,138,0.22) 84.46%, rgba(127,127,127,0.11) 91.93%, transparent)',
    maskFill: 'linear-gradient(180deg, #fff 0%, #fff)',
    maskErase: 'linear-gradient(180deg, #000 0%, #000)',
  },

  // Scrollbar styling
  scrollbar: {
    width: '10px',
    clipPath: 'inset(-100vh var(--scrollbar-width) 0 0)',
  },

  // Spring animation curves (for modern browsers with linear() support)
  springs: {
    fast: {
      duration: '0.667s',
      // Complex spring curve - simplified to cubic-bezier for wider browser support
      easing: 'cubic-bezier(0.25, 0.46, 0.45, 0.94)',
    },
    common: {
      duration: '0.667s',
      easing: 'cubic-bezier(0.25, 0.46, 0.45, 0.94)',
    },
    bounce: {
      duration: '0.833s',
      easing: 'cubic-bezier(0.175, 0.885, 0.32, 1.275)',
    },
    slowBounce: {
      duration: '1.167s',
      easing: 'cubic-bezier(0.175, 0.885, 0.32, 1.4)',
    },
    fastBounce: {
      duration: '1s',
      easing: 'cubic-bezier(0.25, 0.46, 0.45, 0.94)',
    },
  },

  // Typography tokens from ChatGPT
  text: {
    heading2: {
      fontSize: '1.5rem',
      lineHeight: '1.75rem',
      letterSpacing: '-0.015625rem',
      fontWeight: 600,
    },
    heading3: {
      fontSize: '1.125rem',
      lineHeight: '1.625rem',
      letterSpacing: '-0.028125rem',
      fontWeight: 600,
    },
    bodySmallRegular: {
      fontSize: '0.875rem',
      lineHeight: '1.125rem',
      letterSpacing: '-0.01875rem',
      fontWeight: 400,
    },
    bodySmallEmphasized: {
      fontSize: '0.875rem',
      lineHeight: '1.125rem',
      letterSpacing: '-0.01875rem',
      fontWeight: 600,
    },
    monospace: {
      fontSize: '0.9375rem',
      lineHeight: '1.375rem',
      letterSpacing: '-0.025rem',
      fontWeight: 400,
    },
    captionRegular: {
      fontSize: '0.75rem',
      lineHeight: '1rem',
      letterSpacing: '-0.00625rem',
      fontWeight: 400,
    },
  },

  // Enhanced blur values
  blur: {
    xs: '4px',
    sm: '8px',
    md: '12px',
    lg: '16px',
    xl: '24px',
    '2xl': '40px',
    '3xl': '64px',
  },

  // Drop shadows with precise alpha values
  dropShadows: {
    xs: '0 1px 1px rgba(0, 0, 0, 0.05)',
    sm: '0 1px 2px rgba(0, 0, 0, 0.15)',
    md: '0 3px 3px rgba(0, 0, 0, 0.12)',
    lg: '0 4px 4px rgba(0, 0, 0, 0.15)',
  },

  // Container sizes matching ChatGPT design
  containers: {
    xs: '20rem', // 320px
    sm: '24rem', // 384px
    md: '28rem', // 448px
    lg: '32rem', // 512px
    xl: '36rem', // 576px
    '2xl': '42rem', // 672px
    '3xl': '48rem', // 768px
    '4xl': '56rem', // 896px
    '5xl': '64rem', // 1024px
    '6xl': '72rem', // 1152px
  },
} as const

// Export all tokens as a combined object for easy access
export const designTokens = {
  colors,
  typography,
  spacing,
  shadows,
  radii,
  zIndices,
  breakpoints,
  transitions,
  icons,
  layout,
  semantic,
  components,
  chatgpt, // Add ChatGPT tokens
} as const

// Type exports for TypeScript support
export type Colors = typeof colors
export type Typography = typeof typography
export type Spacing = typeof spacing
export type Shadows = typeof shadows
export type Radii = typeof radii
export type ZIndices = typeof zIndices
export type Breakpoints = typeof breakpoints
export type Transitions = typeof transitions
export type Icons = typeof icons
export type Layout = typeof layout
export type Semantic = typeof semantic
export type Components = typeof components
export type ChatGPT = typeof chatgpt
export type DesignTokens = typeof designTokens
