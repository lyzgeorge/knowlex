import { i18n } from '.'
import type { Language } from './types'

/**
 * Initialize i18n with app settings
 */
export async function initializeI18n(initialLanguage?: Language) {
  try {
    // Wait for i18n to be ready first
    if (!i18n.isInitialized) {
      await new Promise<void>((resolve) => {
        if (i18n.isInitialized) {
          resolve()
          return
        }

        const checkReady = () => {
          if (i18n.isInitialized) {
            resolve()
          } else {
            setTimeout(checkReady, 10)
          }
        }
        checkReady()
      })
    }

    // Only set initial language if provided and different
    if (initialLanguage && i18n.language !== initialLanguage) {
      await i18n.changeLanguage(initialLanguage)
    }

    console.log('i18n initialized with language:', i18n.language)
  } catch (error) {
    console.error('Failed to initialize i18n:', error)
    throw error
  }
}
