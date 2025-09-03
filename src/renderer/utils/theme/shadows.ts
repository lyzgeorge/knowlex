/**
 * Shadow system for Knowlex Desktop Application
 * Uses predefined theme colors from colors.ts for consistency
 */
import { colors } from './colors'

function hexToRgba(hex: string, alpha: number) {
  const h = hex.replace('#', '')
  const bigint = parseInt(h, 16)
  const r = (bigint >> 16) & 255
  const g = (bigint >> 8) & 255
  const b = bigint & 255
  return `rgba(${r}, ${g}, ${b}, ${alpha})`
}

const primary500 = colors.primary[500]
const secondary500 = colors.secondary[500]
const accent500 = colors.accent[500]
const error500 = colors.error[500]

export const shadows = {
  // Basic neutral shadows - progressive elevation system
  xs: '0 1px 2px 0 rgba(0, 0, 0, 0.05)',
  sm: '0 1px 3px 0 rgba(0, 0, 0, 0.1), 0 1px 2px 0 rgba(0, 0, 0, 0.06)',
  base: '0 4px 6px -1px rgba(0, 0, 0, 0.1), 0 2px 4px -1px rgba(0, 0, 0, 0.06)',
  md: '0 10px 15px -3px rgba(0, 0, 0, 0.1), 0 4px 6px -2px rgba(0, 0, 0, 0.05)',
  lg: '0 20px 25px -5px rgba(0, 0, 0, 0.1), 0 10px 10px -5px rgba(0, 0, 0, 0.04)',
  xl: '0 25px 50px -12px rgba(0, 0, 0, 0.25)',
  '2xl': '0 35px 60px -15px rgba(0, 0, 0, 0.3)',

  // Inner shadows
  inner: 'inset 0 2px 4px 0 rgba(0, 0, 0, 0.06)',

  // Focus/outline using secondary brand color
  outline: `0 0 0 3px ${hexToRgba(secondary500, 0.5)}`,

  // Chat message shadows - consistent elevation and color opacity
  'message-user': `0 2px 8px 0 ${hexToRgba(primary500, 0.15)}`,
  'message-assistant': `0 2px 8px 0 ${hexToRgba(secondary500, 0.15)}`,
  'message-hover': `0 4px 12px 0 ${hexToRgba(primary500, 0.2)}`,

  // Sidebar shadow - consistent with neutral elevation
  sidebar: '2px 0 8px 0 rgba(0, 0, 0, 0.1)',

  // Modal/Dropdown/Toast - using consistent elevation system
  modal: '0 20px 25px -5px rgba(0, 0, 0, 0.1), 0 10px 10px -5px rgba(0, 0, 0, 0.04)',
  dropdown: '0 10px 15px -3px rgba(0, 0, 0, 0.1), 0 4px 6px -2px rgba(0, 0, 0, 0.05)',
  toast: '0 10px 15px -3px rgba(0, 0, 0, 0.1), 0 4px 6px -2px rgba(0, 0, 0, 0.05)',

  // File card shadows - consistent progression with secondary color
  'file-card': `0 1px 2px 0 ${hexToRgba(secondary500, 0.15)}`,
  'file-card-hover': `0 2px 4px 0 ${hexToRgba(secondary500, 0.2)}`,
  'file-card-active': `0 1px 2px 0 ${hexToRgba(secondary500, 0.25)}`,

  // Project card shadows - consistent progression with primary color
  'project-card': `0 2px 8px 0 ${hexToRgba(primary500, 0.15)}`,
  'project-card-hover': `0 4px 12px 0 ${hexToRgba(primary500, 0.2)}`,

  // Button shadows - consistent elevation and hover progression
  'button-primary': `0 2px 8px 0 ${hexToRgba(primary500, 0.2)}`,
  'button-secondary': `0 2px 8px 0 ${hexToRgba(secondary500, 0.2)}`,
  'button-hover': `0 4px 12px 0 ${hexToRgba(primary500, 0.3)}`,

  // Input field shadows - focus rings with consistent alpha
  'input-focus': `0 0 0 3px ${hexToRgba(primary500, 0.2)}`,
  'input-error': `0 0 0 3px ${hexToRgba(error500, 0.2)}`,

  // Reasoning box shadows - consistent with accent color progression
  'reasoning-box': `0 2px 8px 0 ${hexToRgba(accent500, 0.15)}`,
  'reasoning-box-hover': `0 4px 12px 0 ${hexToRgba(accent500, 0.2)}`,
  'reasoning-box-thinking': `0 4px 16px 0 ${hexToRgba(accent500, 0.25)}`,

  // Dark mode shadows - consistent with light mode elevation
  dark: {
    xs: '0 1px 2px 0 rgba(255, 255, 255, 0.05)',
    sm: '0 1px 3px 0 rgba(255, 255, 255, 0.1), 0 1px 2px 0 rgba(255, 255, 255, 0.06)',
    base: '0 4px 6px -1px rgba(255, 255, 255, 0.1), 0 2px 4px -1px rgba(255, 255, 255, 0.06)',
    md: '0 10px 15px -3px rgba(255, 255, 255, 0.1), 0 4px 6px -2px rgba(255, 255, 255, 0.05)',
    lg: '0 20px 25px -5px rgba(255, 255, 255, 0.1), 0 10px 10px -5px rgba(255, 255, 255, 0.04)',
    xl: '0 25px 50px -12px rgba(255, 255, 255, 0.25)',
    '2xl': '0 35px 60px -15px rgba(255, 255, 255, 0.3)'
  }
}

export default shadows
