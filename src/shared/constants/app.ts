export const APP_NAME = 'Knowlex Desktop'
export const APP_VERSION = '0.1.0'
export const APP_DESCRIPTION = 'Intelligent workspace for researchers and developers'

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

export const DATABASE_CONFIG = {
  filename: 'knowlex.db',
  maxConnections: 10,
  timeout: 30000
} as const

export const DEVELOPMENT = {
  isDev: process.env.NODE_ENV === 'development',
  debugMode: process.env.DEBUG_MODE === 'true'
} as const
