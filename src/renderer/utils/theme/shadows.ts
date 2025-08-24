/**
 * Shadow system for Knowlex Desktop Application
 * Provides depth and elevation hierarchy
 */

export const shadows = {
  // Basic shadows
  xs: '0 1px 2px 0 rgba(0, 0, 0, 0.05)',
  sm: '0 1px 3px 0 rgba(0, 0, 0, 0.1), 0 1px 2px 0 rgba(0, 0, 0, 0.06)',
  base: '0 1px 3px 0 rgba(0, 0, 0, 0.1), 0 1px 2px 0 rgba(0, 0, 0, 0.06)',
  md: '0 4px 6px -1px rgba(0, 0, 0, 0.1), 0 2px 4px -1px rgba(0, 0, 0, 0.06)',
  lg: '0 10px 15px -3px rgba(0, 0, 0, 0.1), 0 4px 6px -2px rgba(0, 0, 0, 0.05)',
  xl: '0 20px 25px -5px rgba(0, 0, 0, 0.1), 0 10px 10px -5px rgba(0, 0, 0, 0.04)',
  '2xl': '0 25px 50px -12px rgba(0, 0, 0, 0.25)',

  // Inner shadows
  inner: 'inset 0 2px 4px 0 rgba(0, 0, 0, 0.06)',

  // Colored shadows for interactive elements
  outline: '0 0 0 3px rgba(66, 153, 225, 0.6)',

  // Chat message shadows
  'message-user': '0 2px 8px rgba(34, 197, 94, 0.15)',
  'message-assistant': '0 2px 8px rgba(0, 0, 0, 0.1)',
  'message-hover': '0 4px 12px rgba(0, 0, 0, 0.15)',

  // Sidebar shadow
  sidebar: '2px 0 8px rgba(0, 0, 0, 0.1)',

  // Modal shadows
  modal: '0 20px 25px -5px rgba(0, 0, 0, 0.1), 0 10px 10px -5px rgba(0, 0, 0, 0.04)',

  // File card shadows
  'file-card': '0 2px 4px rgba(0, 0, 0, 0.1)',
  'file-card-hover': '0 4px 8px rgba(0, 0, 0, 0.15)',
  'file-card-active': '0 1px 2px rgba(0, 0, 0, 0.1)',

  // Project card shadows
  'project-card': '0 2px 8px rgba(0, 0, 0, 0.1)',
  'project-card-hover': '0 8px 16px rgba(0, 0, 0, 0.15)',

  // Button shadows
  'button-primary': '0 2px 4px rgba(34, 197, 94, 0.2)',
  'button-secondary': '0 2px 4px rgba(59, 130, 246, 0.2)',
  'button-hover': '0 4px 8px rgba(0, 0, 0, 0.15)',

  // Input field shadows
  'input-focus': '0 0 0 3px rgba(34, 197, 94, 0.1)',
  'input-error': '0 0 0 3px rgba(239, 68, 68, 0.1)',

  // Toast/notification shadows
  toast: '0 10px 15px -3px rgba(0, 0, 0, 0.1), 0 4px 6px -2px rgba(0, 0, 0, 0.05)',

  // Dropdown shadows
  dropdown: '0 10px 15px -3px rgba(0, 0, 0, 0.1), 0 4px 6px -2px rgba(0, 0, 0, 0.05)',

  // Dark mode shadows (using white shadows for contrast)
  dark: {
    xs: '0 1px 2px 0 rgba(255, 255, 255, 0.05)',
    sm: '0 1px 3px 0 rgba(255, 255, 255, 0.1), 0 1px 2px 0 rgba(255, 255, 255, 0.06)',
    md: '0 4px 6px -1px rgba(255, 255, 255, 0.1), 0 2px 4px -1px rgba(255, 255, 255, 0.06)',
    lg: '0 10px 15px -3px rgba(255, 255, 255, 0.1), 0 4px 6px -2px rgba(255, 255, 255, 0.05)',
    xl: '0 20px 25px -5px rgba(255, 255, 255, 0.1), 0 10px 10px -5px rgba(255, 255, 255, 0.04)'
  }
}

export default shadows
