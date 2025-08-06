/**
 * Development Tools Interface
 *
 * Abstraction for development-time utilities and tools.
 * Allows business code to access development features without direct coupling.
 */

import type { MockServiceFacade } from './mock-facade'

export interface DevelopmentTools {
  getMockFacade(): MockServiceFacade | null
  isDevModeEnabled(): boolean
}

export type { MockServiceFacade }
