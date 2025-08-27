import i18n from 'i18next'
import { initReactI18next } from 'react-i18next'

// Translation resources
import en from './locales/en.json'
import zhCN from './locales/zh.json'

const resources = {
  en: {
    translation: en
  },
  'zh-CN': {
    translation: zhCN
  }
}

i18n.use(initReactI18next).init({
  resources,
  lng: 'en', // default language
  fallbackLng: 'en',

  interpolation: {
    escapeValue: false // React already does escaping
  },

  // Namespace configuration
  defaultNS: 'translation',
  ns: ['translation'],

  // Debug mode for development
  debug: process.env.NODE_ENV === 'development',

  // React options
  react: {
    useSuspense: false
  }
})

export default i18n
