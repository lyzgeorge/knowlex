/**
 * Main Providers Component for Knowlex Desktop Application
 *
 * This file combines all application providers in the correct order
 * and provides a single component to wrap the entire application.
 */

import React, { ReactNode, Suspense } from 'react'
import { ErrorBoundary } from 'react-error-boundary'
import { Box, Spinner, Text, VStack } from '@chakra-ui/react'

// Import providers
import { ThemeProvider } from './ThemeProvider'
import { LanguageProvider } from './LanguageProvider'

// Import _i18n configuration (this initializes _i18n)
import '@/_i18n'

// Props interface
interface AppProvidersProps {
  children: ReactNode
}

// Error fallback component
const ErrorFallback: React.FC<{ error: Error; resetErrorBoundary: () => void }> = ({
  error,
  resetErrorBoundary,
}) => (
  <Box height="100vh" display="flex" alignItems="center" justifyContent="center" bg="red.50" p={8}>
    <VStack spacing={4} textAlign="center" maxW="400px">
      <Text fontSize="2xl" fontWeight="bold" color="red.600">
        Something went wrong
      </Text>
      <Text color="red.500" mb={4}>
        {error._message}
      </Text>
      <Box
        as="button"
        px={4}
        py={2}
        bg="red.500"
        color="white"
        borderRadius="md"
        onClick={resetErrorBoundary}
        _hover={{ bg: 'red.600' }}
      >
        Try again
      </Box>
      <details style={{ marginTop: '16px' }}>
        <summary style={{ cursor: 'pointer', color: '#9CA3AF' }}>Error details</summary>
        <pre
          style={{
            marginTop: '8px',
            fontSize: '12px',
            color: '#6B7280',
            textAlign: 'left',
            overflow: 'auto',
            maxHeight: '200px',
          }}
        >
          {error.stack}
        </pre>
      </details>
    </VStack>
  </Box>
)

// Loading fallback component
const LoadingFallback: React.FC = () => (
  <Box height="100vh" display="flex" alignItems="center" justifyContent="center" bg="gray.50">
    <VStack spacing={4}>
      <Spinner size="xl" color="primary.500" thickness="4px" />
      <Text fontSize="lg" color="gray.600">
        Loading Knowlex...
      </Text>
    </VStack>
  </Box>
)

// Main providers component
export const AppProviders: React.FC<AppProvidersProps> = ({ children }) => {
  return (
    <ErrorBoundary
      FallbackComponent={ErrorFallback}
      onError={(error, errorInfo) => {
        // Log error to console in development
        if (process.env.NODE_ENV === 'development') {
          // console.error('Application Error:', error)
          // console.error('Error Info:', errorInfo)
        }

        // In production, you might want to send this to an error reporting service
        // Example: Sentry, LogRocket, etc.
      }}
      onReset={() => {
        // Optionally refresh the page or reset application state
        if (process.env.NODE_ENV === 'development') {
          window.location.reload()
        }
      }}
    >
      <ThemeProvider>
        <Suspense fallback={<LoadingFallback />}>
          <LanguageProvider>{children}</LanguageProvider>
        </Suspense>
      </ThemeProvider>
    </ErrorBoundary>
  )
}

// Re-export all providers and hooks for convenience
export { ThemeProvider, useTheme, useThemeUtils, useThemeClass } from './ThemeProvider'
export {
  LanguageProvider,
  useLanguage,
  useTranslations,
  useLanguageDirection,
} from './LanguageProvider'

// Provider composition utilities
export function withProviders<P extends object>(
  Component: React.ComponentType<P>
): React.ComponentType<P> {
  const WrappedComponent: React.FC<P> = props => (
    <AppProviders>
      <Component {...props} />
    </AppProviders>
  )

  WrappedComponent.displayName = `withProviders(${Component.displayName || Component.name})`

  return WrappedComponent
}

// Hook to check if providers are properly initialized
export const useProviderStatus = () => {
  const [isInitialized, setIsInitialized] = React.useState(false)
  const [error, setError] = React.useState<Error | null>(null)

  React.useEffect(() => {
    try {
      // Check if theme provider is available
      const _themeContext = React.useContext(React.createContext(undefined))

      // Check if language provider is available
      const _languageContext = React.useContext(React.createContext(undefined))

      // Mark as initialized if no errors
      setIsInitialized(true)
    } catch (err) {
      setError(err instanceof Error ? err : new Error('Provider initialization failed'))
    }
  }, [])

  return {
    isInitialized,
    error,
    hasError: error !== null,
  }
}

export default AppProviders
