export type Language = 'en' | 'zh-CN'

export interface I18nSettings {
  language: Language
}

export const SUPPORTED_LANGUAGES: Record<Language, string> = {
  en: 'English',
  'zh-CN': '中文'
} as const

export const DEFAULT_LANGUAGE: Language = 'en'
