import React from 'react'
import { render, screen } from '@testing-library/react'
import { ChakraProvider } from '@chakra-ui/react'
import { chakraTheme } from './theme'

// Mock the providers to avoid complex setup
jest.mock('./providers', () => ({
  useTranslations: () => ({
    t: (key: string) => {
      const translations: Record<string, string> = {
        'ui.app.title': 'Desktop AI Assistant',
        'ui.app.tagline': 'Your intelligent companion',
        'ui.app.welcome': 'Welcome to Knowlex Desktop AI Assistant',
        'ui.app.getStarted': 'Get Started',
        'ui.app.viewDocs': 'View Documentation',
        'ui.sidebar.newChat': 'New Chat',
        'ui.sidebar.projects': 'Projects',
        'ui.sidebar.noProjects': 'No projects yet',
      }
      return translations[key] || key
    },
  }),
  useLanguage: () => ({
    language: 'en',
    setLanguage: jest.fn(),
  }),
}))

import App from './App'

// Simple test wrapper
const TestWrapper: React.FC<{ children: React.ReactNode }> = ({ children }) => (
  <ChakraProvider theme={chakraTheme}>{children}</ChakraProvider>
)

test('renders Knowlex Desktop App', () => {
  render(
    <TestWrapper>
      <App />
    </TestWrapper>
  )
  const linkElement = screen.getByText(/Welcome to Knowlex Desktop AI Assistant/i)
  expect(linkElement).toBeInTheDocument()
})
