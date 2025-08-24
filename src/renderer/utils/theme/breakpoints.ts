/**
 * Responsive breakpoints for Knowlex Desktop Application
 * Desktop-first design with support for smaller screen sizes
 */

export const breakpoints = {
  xs: '480px', // Small phones
  sm: '768px', // Tablets
  md: '992px', // Small desktop
  lg: '1200px', // Large desktop
  xl: '1400px', // Extra large desktop
  '2xl': '1600px' // Ultra wide screens
}

// Container max widths for different breakpoints
export const container = {
  xs: '480px',
  sm: '768px',
  md: '992px',
  lg: '1200px',
  xl: '1400px'
}

// Sidebar responsive settings
export const sidebar = {
  // Desktop sidebar width (default)
  width: '280px',

  // Collapsed sidebar width
  collapsedWidth: '60px',

  // Breakpoints for sidebar behavior
  collapseAt: 'md', // Collapse sidebar below medium screens
  hideAt: 'sm' // Hide sidebar completely below small screens
}

// Header heights for different screen sizes
export const header = {
  height: {
    base: '60px',
    md: '64px',
    lg: '68px'
  }
}

// Chat interface responsive settings
export const chat = {
  // Input box heights
  inputHeight: {
    base: '40px',
    md: '44px',
    lg: '48px'
  },

  // Message bubble max widths
  messageMaxWidth: {
    base: '100%',
    sm: '90%',
    md: '80%',
    lg: '75%',
    xl: '70%'
  },

  // Message list padding
  listPadding: {
    base: '1rem',
    md: '1.5rem',
    lg: '2rem',
    xl: '3rem'
  }
}

// File management responsive settings
export const fileManager = {
  // Grid columns for file cards
  gridColumns: {
    base: 1,
    sm: 2,
    md: 3,
    lg: 4,
    xl: 5,
    '2xl': 6
  },

  // Card minimum width
  cardMinWidth: '200px',

  // Gap between cards
  gap: {
    base: '1rem',
    md: '1.5rem',
    lg: '2rem'
  }
}

// Project grid responsive settings
export const projectGrid = {
  columns: {
    base: 1,
    sm: 2,
    lg: 3,
    xl: 4
  },

  gap: {
    base: '1rem',
    md: '1.5rem',
    lg: '2rem'
  }
}

// Modal responsive settings
export const modal = {
  size: {
    base: 'full', // Full screen on mobile
    sm: 'md', // Medium on tablet
    md: 'lg', // Large on desktop
    lg: 'xl' // Extra large on big screens
  },

  margin: {
    base: '0',
    sm: '1rem',
    md: '2rem'
  }
}

export default breakpoints
