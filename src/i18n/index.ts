/**
 * Internationalization (_i18n) Configuration for Knowlex Desktop Application
 *
 * This file sets up react-i18next for multi-language support with English and Chinese.
 * It includes resource management, language detection, and fallback handling.
 */

import _i18n from 'i18next'
import { initReactI18next } from 'react-i18next'

// Import translation resources
import enTranslations from './locales/en.json'
import zhTranslations from './locales/zh.json'

// Simple language detection for desktop app
const getInitialLanguage = (): string => {
  // Check localStorage first
  const stored = localStorage.getItem('i18nextLng')
  if (stored && ['en', 'zh'].includes(stored)) {
    return stored
  }

  // Check navigator language
  const browserLang = navigator.language.toLowerCase()
  if (browserLang.startsWith('zh')) {
    return 'zh'
  }

  // Default to English
  return 'en'
}

// _i18n configuration
const i18nConfig = {
  // Default language
  lng: getInitialLanguage(),

  // Fallback language
  fallbackLng: 'en',

  // Namespace configuration
  defaultNS: 'translation',

  // Enable debug mode in development
  debug: process.env.NODE_ENV === 'development',

  // Interpolation settings
  interpolation: {
    escapeValue: false, // React already escapes values
    formatSeparator: ',',
    format: (value: unknown, format?: string): string => {
      if (format === 'uppercase') return String(value).toUpperCase()
      if (format === 'lowercase') return String(value).toLowerCase()
      if (format === 'capitalize')
        return String(value).charAt(0).toUpperCase() + String(value).slice(1)
      return String(value)
    },
  },

  // React specific settings
  react: {
    // Disable suspense for better development experience
    useSuspense: false,
    // Bind _i18n instance to react component tree
    bindI18n: 'languageChanged',
    // Bind store to react component tree
    bindI18nStore: 'added removed',
    // Use React.createElement for Trans component
    transSupportBasicHtmlNodes: true,
    transKeepBasicHtmlNodesFor: ['br', 'strong', 'i', 'em', 'b', 'u', 'code', 'kbd'],
  },

  // Resources (embedded for desktop app)
  resources: {
    en: {
      translation: enTranslations,
    },
    zh: {
      translation: zhTranslations,
    },
  },

  // Key separator (use . for nested keys)
  keySeparator: '.',

  // Nested separator (use : for nested namespaces)
  nsSeparator: ':',

  // Pluralization
  pluralSeparator: '_',
  contextSeparator: '_',

  // Save missing translation keys in development
  saveMissing: process.env.NODE_ENV === 'development',
  saveMissingTo: 'current' as const,

  // Missing key handler
  missingKeyHandler: (
    _lngs: readonly string[],
    _ns: string,
    _key: string,
    _fallbackValue: string
  ) => {
    if (process.env.NODE_ENV === 'development') {
      // console.warn(`Missing translation key: ${ns}:${key} for languages: ${lngs.join(', ')}`)
    }
  },

  // Additional configuration for desktop app
  load: 'languageOnly' as const, // Don't load country-specific variations
  cleanCode: true, // Clean language codes (e.g., en-US -> en)
}

// Initialize _i18n
_i18n
  // Connect to React
  .use(initReactI18next)
  // Initialize with config
  .init(i18nConfig)

// Helper functions for language management
export const languageHelpers = {
  // Get current language
  getCurrentLanguage(): string {
    return _i18n.language || 'en'
  },

  // Get available languages
  getAvailableLanguages(): string[] {
    return ['en', 'zh']
  },

  // Change language
  async changeLanguage(lng: string): Promise<void> {
    try {
      await _i18n.changeLanguage(lng)
      // Store preference in localStorage
      localStorage.setItem('i18nextLng', lng)
    } catch (error) {
      // console.error('Failed to change language:', error)
    }
  },

  // Get language display name
  _getLanguageDisplayName(lng: string): string {
    const names: Record<string, string> = {
      en: 'English',
      zh: '中文',
    }
    return names[lng] || lng
  },

  // Check if language is RTL (for future Arabic/Hebrew support)
  isRTL(lng?: string): boolean {
    const rtlLanguages = ['ar', 'he', 'fa', 'ur']
    const language = lng || _i18n.language || 'en'
    return rtlLanguages.includes(language)
  },

  // Format number based on locale
  formatNumber(num: number, lng?: string): string {
    const language = lng || _i18n.language || 'en'
    return new Intl.NumberFormat(language === 'zh' ? 'zh-CN' : 'en-US').format(num)
  },

  // Format date based on locale
  formatDate(date: Date, lng?: string, options?: Intl.DateTimeFormatOptions): string {
    const language = lng || _i18n.language || 'en'
    const locale = language === 'zh' ? 'zh-CN' : 'en-US'
    const defaultOptions: Intl.DateTimeFormatOptions = {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
    }
    return new Intl.DateTimeFormat(locale, { ...defaultOptions, ...options }).format(date)
  },

  // Format relative time (e.g., "2 minutes ago")
  formatRelativeTime(date: Date, lng?: string): string {
    const language = lng || _i18n.language || 'en'
    const locale = language === 'zh' ? 'zh-CN' : 'en-US'
    const now = new Date()
    const diffInSeconds = Math.floor((now.getTime() - date.getTime()) / 1000)

    // Use Intl.RelativeTimeFormat for modern browsers
    if ('RelativeTimeFormat' in Intl) {
      const rtf = new Intl.RelativeTimeFormat(locale, { numeric: 'auto' })

      if (diffInSeconds < 60) {
        return rtf.format(-diffInSeconds, 'second')
      } else if (diffInSeconds < 3600) {
        return rtf.format(-Math.floor(diffInSeconds / 60), 'minute')
      } else if (diffInSeconds < 86400) {
        return rtf.format(-Math.floor(diffInSeconds / 3600), 'hour')
      } else {
        return rtf.format(-Math.floor(diffInSeconds / 86400), 'day')
      }
    }

    // Fallback for older browsers
    if (diffInSeconds < 60) {
      return language === 'zh' ? '刚刚' : 'just now'
    } else if (diffInSeconds < 3600) {
      const minutes = Math.floor(diffInSeconds / 60)
      return language === 'zh'
        ? `${minutes}分钟前`
        : `${minutes} minute${minutes > 1 ? 's' : ''} ago`
    } else if (diffInSeconds < 86400) {
      const hours = Math.floor(diffInSeconds / 3600)
      return language === 'zh' ? `${hours}小时前` : `${hours} hour${hours > 1 ? 's' : ''} ago`
    } else {
      const days = Math.floor(diffInSeconds / 86400)
      return language === 'zh' ? `${days}天前` : `${days} day${days > 1 ? 's' : ''} ago`
    }
  },
}

// Type definitions for better TypeScript support
export interface TranslationResource {
  [key: string]: string | TranslationResource
}

export interface LanguageConfig {
  code: string
  name: string
  nativeName: string
  rtl?: boolean
}

export const supportedLanguages: LanguageConfig[] = [
  {
    code: 'en',
    name: 'English',
    nativeName: 'English',
    rtl: false,
  },
  {
    code: 'zh',
    name: 'Chinese',
    nativeName: '中文',
    rtl: false,
  },
]

export default _i18n
