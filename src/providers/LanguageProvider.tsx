/**
 * Language Provider for Knowlex Desktop Application
 *
 * This component provides language context and manages internationalization
 * using react-i18next.
 */

import React, { createContext, useContext, useEffect, useState, ReactNode } from 'react'
import { useTranslation } from 'react-i18next'
import { languageHelpers, supportedLanguages, type LanguageConfig } from '@/i18n'

// Language types
export type LanguageCode = 'en' | 'zh'

// Language context interface
interface LanguageContextType {
  language: LanguageCode
  setLanguage: (language: LanguageCode) => void
  languages: LanguageConfig[]
  isLoading: boolean
  error: string | null

  // Helper functions
  t: (key: string, options?: unknown) => string
  formatNumber: (num: number) => string
  formatDate: (date: Date, options?: Intl.DateTimeFormatOptions) => string
  formatRelativeTime: (date: Date) => string
  _getLanguageDisplayName: (code: LanguageCode) => string
  isRTL: boolean
}

// Create language context
const LanguageContext = createContext<LanguageContextType | undefined>(undefined)

// Hook to use language context
export const useLanguage = (): LanguageContextType => {
  const context = useContext(LanguageContext)
  if (context === undefined) {
    throw new Error('useLanguage must be used within a LanguageProvider')
  }
  return context
}

// Language provider props
interface LanguageProviderProps {
  children: ReactNode
}

// Language provider component
export const LanguageProvider: React.FC<LanguageProviderProps> = ({ children }) => {
  const { t, i18n } = useTranslation()
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const currentLanguage = (i18n.language || 'en') as LanguageCode

  // Change language function
  const setLanguage = async (language: LanguageCode) => {
    if (language === currentLanguage) return

    setIsLoading(true)
    setError(null)

    try {
      await languageHelpers.changeLanguage(language)
    } catch (err) {
      // console.error('Failed to change language:', err)
      setError(err instanceof Error ? err._message : 'Failed to change language')
    } finally {
      setIsLoading(false)
    }
  }

  // Format functions using current language
  const formatNumber = (num: number): string => {
    return languageHelpers.formatNumber(num, currentLanguage)
  }

  const formatDate = (date: Date, options?: Intl.DateTimeFormatOptions): string => {
    return languageHelpers.formatDate(date, currentLanguage, options)
  }

  const formatRelativeTime = (date: Date): string => {
    return languageHelpers.formatRelativeTime(date, currentLanguage)
  }

  const _getLanguageDisplayName = (code: LanguageCode): string => {
    return languageHelpers._getLanguageDisplayName(code)
  }

  // Check if current language is RTL
  const isRTL = languageHelpers.isRTL(currentLanguage)

  // Update document attributes when language changes
  useEffect(() => {
    // Update html lang attribute
    document.documentElement.lang = currentLanguage

    // Update html dir attribute for RTL support
    document.documentElement.dir = isRTL ? 'rtl' : 'ltr'

    // Update document title if needed
    const appName = t('common.app.name', { defaultValue: 'Knowlex' })
    const appDescription = t('common.app.description', { defaultValue: 'Desktop AI Assistant' })
    document.title = `${appName} - ${appDescription}`
  }, [currentLanguage, isRTL, t])

  // Context value
  const contextValue: LanguageContextType = {
    language: currentLanguage,
    setLanguage,
    languages: supportedLanguages,
    isLoading,
    error,
    t,
    formatNumber,
    formatDate,
    formatRelativeTime,
    _getLanguageDisplayName,
    isRTL,
  }

  return <LanguageContext.Provider value={contextValue}>{children}</LanguageContext.Provider>
}

// Enhanced translation hook with better TypeScript support
export const useTranslations = (namespace?: string) => {
  const { t, language, formatNumber, formatDate, formatRelativeTime } = useLanguage()

  return {
    t: namespace ? (key: string, options?: unknown) => t(`${namespace}:${key}`, options) : t,
    language,
    formatNumber,
    formatDate,
    formatRelativeTime,

    // Namespace-specific translation functions
    tCommon: (key: string, options?: unknown) => t(`common:${key}`, options),
    tUI: (key: string, options?: unknown) => t(`ui:${key}`, options),
    tError: (key: string, options?: unknown) => t(`error:${key}`, options),
    tSettings: (key: string, options?: unknown) => t(`settings:${key}`, options),

    // Pluralization helper
    plural: (key: string, count: number, options?: unknown) => t(key, { count, ...options }),

    // Interpolation helper with type safety
    interpolate: <T extends Record<string, unknown>>(key: string, values: T) => t(key, values),
  }
}

// Language direction hook
export const useLanguageDirection = () => {
  const { isRTL, language } = useLanguage()

  return {
    isRTL,
    isLTR: !isRTL,
    direction: isRTL ? 'rtl' : ('ltr' as 'rtl' | 'ltr'),
    language,

    // Helper functions for directional styling
    start: isRTL ? 'right' : 'left',
    end: isRTL ? 'left' : 'right',

    // Margin and padding helpers
    ms: (value: string) => ({ [isRTL ? 'marginRight' : 'marginLeft']: value }),
    me: (value: string) => ({ [isRTL ? 'marginLeft' : 'marginRight']: value }),
    ps: (value: string) => ({ [isRTL ? 'paddingRight' : 'paddingLeft']: value }),
    pe: (value: string) => ({ [isRTL ? 'paddingLeft' : 'paddingRight']: value }),

    // Border helpers
    borderStart: (value: string) => ({ [isRTL ? 'borderRight' : 'borderLeft']: value }),
    borderEnd: (value: string) => ({ [isRTL ? 'borderLeft' : 'borderRight']: value }),

    // Text alignment
    textStart: isRTL ? 'right' : 'left',
    textEnd: isRTL ? 'left' : 'right',
  }
}

// Validation helper for language codes
export const isValidLanguageCode = (code: string): code is LanguageCode => {
  return ['en', 'zh'].includes(code)
}

// Language detection helper for initial setup
export const detectLanguage = (): LanguageCode => {
  // Check localStorage
  const stored = localStorage.getItem('i18nextLng')
  if (stored && isValidLanguageCode(stored)) {
    return stored
  }

  // Check navigator language
  const navLang = navigator.language.toLowerCase()
  if (navLang.startsWith('zh')) {
    return 'zh'
  }

  // Default to English
  return 'en'
}

export default LanguageProvider
