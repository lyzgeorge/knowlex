/**
 * Development Factory
 *
 * Factory for creating development tools and utilities.
 * Only available in development/test environments.
 */

import type { DevelopmentTools, MockServiceFacade } from './interfaces/development-tools'

class ProductionDevelopmentTools implements DevelopmentTools {
  getMockFacade(): MockServiceFacade | null {
    return null
  }

  isDevModeEnabled(): boolean {
    return false
  }
}

class DevDevelopmentTools implements DevelopmentTools {
  private mockFacade: MockServiceFacade | null = null

  getMockFacade(): MockServiceFacade | null {
    if (!this.mockFacade) {
      try {
        // Synchronous import for dev mode - we'll handle async loading elsewhere
        // For now, return null and let components handle the loading
        return null
      } catch {
        // Mock services not available in production build
        return null
      }
    }
    return this.mockFacade
  }

  isDevModeEnabled(): boolean {
    return process.env.NODE_ENV === 'development' || process.env.NODE_ENV === 'test'
  }
}

// Export appropriate implementation based on environment
const isDev = process.env.NODE_ENV === 'development' || process.env.NODE_ENV === 'test'
export const developmentTools: DevelopmentTools = isDev
  ? new DevDevelopmentTools()
  : new ProductionDevelopmentTools()

export type { DevelopmentTools, MockServiceFacade } from './interfaces/development-tools'
