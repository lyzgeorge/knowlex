import { useTranslation } from 'react-i18next'
import { useCallback } from 'react'
import type { Language } from '@shared/i18n/types'
import { useAppStore } from '@renderer/stores/app'
import { SUPPORTED_LANGUAGES } from '@shared/i18n/types'

/**
 * Custom hook for internationalization
 * Provides translation function and language management
 */
export function useI18n() {
  const { t, i18n } = useTranslation()

  // Use individual selectors to avoid object recreation
  const currentLanguage = useAppStore((state) => state.language)
  const setLanguageInStore = useAppStore((state) => state.setLanguage)

  const changeLanguage = useCallback(
    async (language: Language) => {
      try {
        // Prevent unnecessary changes
        if (currentLanguage === language && i18n.language === language) {
          return
        }

        // Update i18n first
        if (i18n.language !== language) {
          await i18n.changeLanguage(language)
        }

        // Update store if needed
        if (currentLanguage !== language) {
          setLanguageInStore(language)
        }
      } catch (error) {
        console.error('Failed to change language:', error)
      }
    },
    [currentLanguage, setLanguageInStore, i18n]
  )

  return {
    t,
    currentLanguage,
    changeLanguage,
    // Use static list to avoid re-renders
    languages: Object.keys(SUPPORTED_LANGUAGES) as Language[],
    isReady: i18n.isInitialized
  }
}
