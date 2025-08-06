/**
 * Test utilities for Knowlex Desktop Application
 *
 * This file provides test utilities and providers for testing React components
 * with proper context setup.
 */

import React, { ReactElement } from 'react'
import { render, RenderOptions } from '@testing-library/react'
import { ChakraProvider } from '@chakra-ui/react'
import { I18nextProvider } from 'react-i18next'
import i18n from 'i18next'
import { initReactI18next } from 'react-i18next'
import { chakraTheme } from './theme'

// Mock translations for testing
const mockTranslations = {
  en: {
    translation: {
      'ui.app.title': 'Desktop AI Assistant',
      'ui.app.tagline': 'Your intelligent companion',
      'ui.app.welcome': 'Welcome to Knowlex Desktop AI Assistant',
      'ui.app.getStarted': 'Get Started',
      'ui.app.viewDocs': 'View Documentation',
      'ui.sidebar.newChat': 'New Chat',
      'ui.sidebar.projects': 'Projects',
      'ui.sidebar.noProjects': 'No projects yet',
      'ui.sidebar.conversations': 'Conversations',
      'ui.sidebar.settings': 'Settings',
      'ui.sidebar.profile': 'Profile',
      'ui.header.title': 'Knowlex Desktop',
      'ui.header.theme': 'Theme',
      'ui.header.language': 'Language',
      'ui.header.help': 'Help',
      'ui.header.about': 'About',
      'ui.header.minimize': 'Minimize',
      'ui.header.maximize': 'Maximize',
      'ui.header.close': 'Close',
      'ui.theme.light': 'Light',
      'ui.theme.dark': 'Dark',
      'ui.theme.system': 'System',
      'ui.theme.currentTheme': 'Current theme: {{theme}}',
      'ui.theme.themeSelector': 'Select theme',
    },
  },
  zh: {
    translation: {
      'ui.app.title': '桌面智能助理',
      'ui.app.tagline': '您的智能伙伴',
      'ui.app.welcome': '欢迎使用 Knowlex 桌面智能助理',
      'ui.app.getStarted': '开始使用',
      'ui.app.viewDocs': '查看文档',
      'ui.sidebar.newChat': '新建对话',
      'ui.sidebar.projects': '项目',
      'ui.sidebar.noProjects': '暂无项目',
      'ui.sidebar.conversations': '对话',
      'ui.sidebar.settings': '设置',
      'ui.sidebar.profile': '个人资料',
      'ui.header.title': 'Knowlex 桌面版',
      'ui.header.theme': '主题',
      'ui.header.language': '语言',
      'ui.header.help': '帮助',
      'ui.header.about': '关于',
      'ui.header.minimize': '最小化',
      'ui.header.maximize': '最大化',
      'ui.header.close': '关闭',
      'ui.theme.light': '浅色',
      'ui.theme.dark': '深色',
      'ui.theme.system': '跟随系统',
      'ui.theme.currentTheme': '当前主题：{{theme}}',
      'ui.theme.themeSelector': '选择主题',
    },
  },
}

// Create a test i18n instance
const testI18n = i18n.createInstance()

testI18n.use(initReactI18next).init({
  lng: 'en',
  fallbackLng: 'en',
  debug: false,
  interpolation: {
    escapeValue: false,
  },
  resources: mockTranslations,
  react: {
    useSuspense: false,
  },
})

// Mock language context for testing
const mockLanguageContext = {
  language: 'en' as const,
  setLanguage: jest.fn(),
  languages: [
    { code: 'en', name: 'English', nativeName: 'English', rtl: false },
    { code: 'zh', name: 'Chinese', nativeName: '中文', rtl: false },
  ],
  isLoading: false,
  error: null,
  t: (key: string, options?: Record<string, unknown>) => testI18n.t(key, options),
  formatNumber: (num: number) => num.toString(),
  formatDate: (date: Date) => date.toLocaleDateString(),
  formatRelativeTime: (_date: Date) => 'just now',
  getLanguageDisplayName: (code: string) => (code === 'zh' ? '中文' : 'English'),
  isRTL: false,
}

// Mock the language provider
jest.mock('./providers/LanguageProvider', () => ({
  useLanguage: () => mockLanguageContext,
  useTranslations: () => ({
    t: mockLanguageContext.t,
    language: mockLanguageContext.language,
    formatNumber: mockLanguageContext.formatNumber,
    formatDate: mockLanguageContext.formatDate,
    formatRelativeTime: mockLanguageContext.formatRelativeTime,
  }),
  useLanguageDirection: () => ({
    isRTL: false,
    isLTR: true,
    direction: 'ltr' as const,
    language: 'en',
    start: 'left',
    end: 'right',
    ms: (value: string) => ({ marginLeft: value }),
    me: (value: string) => ({ marginRight: value }),
    ps: (value: string) => ({ paddingLeft: value }),
    pe: (value: string) => ({ paddingRight: value }),
    borderStart: (value: string) => ({ borderLeft: value }),
    borderEnd: (value: string) => ({ borderRight: value }),
    textStart: 'left',
    textEnd: 'right',
  }),
}))

// All the providers wrapper
const AllTheProviders: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  return (
    <I18nextProvider i18n={testI18n}>
      <ChakraProvider theme={chakraTheme}>{children}</ChakraProvider>
    </I18nextProvider>
  )
}

// Custom render function
const customRender = (ui: ReactElement, options?: Omit<RenderOptions, 'wrapper'>) =>
  render(ui, { wrapper: AllTheProviders, ...options })

// Re-export everything
export * from '@testing-library/react'
export { customRender as render }

// Export test utilities
export { testI18n, mockLanguageContext }
