export const APP_NAME = 'Knowlex Desktop'
export const WINDOW_CONFIG = {
  MAIN: {
    width: 1200,
    height: 800,
    minWidth: 800,
    minHeight: 600
  },
  DEBUG: {
    width: 1400,
    height: 900,
    minWidth: 1000,
    minHeight: 700
  }
} as const

export const DEVELOPMENT = {
  isDev: typeof process !== 'undefined' ? process.env.NODE_ENV === 'development' : false,
  debugMode: typeof process !== 'undefined' ? process.env.DEBUG_MODE === 'true' : false
} as const
