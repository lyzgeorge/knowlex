import React from 'react'
import ReactDOM from 'react-dom/client'
import { ChakraProvider, ColorModeScript } from '@chakra-ui/react'
import { ErrorBoundary } from 'react-error-boundary'
import App from './App'
import theme from './utils/theme'
import './styles/markdown.css'

/**
 * Error Fallback Component for Error Boundary
 */
function ErrorFallback({
  error,
  resetErrorBoundary
}: {
  error: Error
  resetErrorBoundary: () => void
}) {
  return (
    <div
      style={{
        padding: '2rem',
        textAlign: 'center',
        backgroundColor: '#f7fafc',
        minHeight: '100vh',
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center'
      }}
    >
      <h2 style={{ color: '#e53e3e', marginBottom: '1rem' }}>Something went wrong</h2>
      <details
        style={{
          whiteSpace: 'pre-wrap',
          backgroundColor: '#fed7d7',
          padding: '1rem',
          borderRadius: '0.375rem',
          marginBottom: '1rem',
          maxWidth: '600px'
        }}
      >
        <summary style={{ cursor: 'pointer', marginBottom: '0.5rem' }}>Error Details</summary>
        {error.message}
      </details>
      <button
        onClick={resetErrorBoundary}
        style={{
          backgroundColor: '#3182ce',
          color: 'white',
          padding: '0.75rem 1.5rem',
          borderRadius: '0.375rem',
          border: 'none',
          cursor: 'pointer'
        }}
      >
        Try again
      </button>
    </div>
  )
}

/**
 * Main application entry point
 * Sets up theme, error boundaries, and React strict mode
 */
function renderApp() {
  const rootElement = document.getElementById('root') as HTMLElement

  if (!rootElement) {
    throw new Error('Root element not found')
  }

  const root = ReactDOM.createRoot(rootElement)

  root.render(
    <>
      {/* Color mode script must be rendered before the app */}
      <ColorModeScript initialColorMode={theme.config.initialColorMode} />

      <React.StrictMode>
        <ErrorBoundary
          FallbackComponent={ErrorFallback}
          onError={(error, errorInfo) => {
            // Log error to console in development
            console.error('React Error Boundary caught an error:', error, errorInfo)

            // In production, you might want to send this to an error reporting service
            if (process.env.NODE_ENV === 'production') {
              // Example: errorReporter.captureException(error, { extra: errorInfo })
            }
          }}
          onReset={() => {
            // Clear any error state that might cause the error to re-occur
            window.location.reload()
          }}
        >
          <ChakraProvider theme={theme}>
            <App />
          </ChakraProvider>
        </ErrorBoundary>
      </React.StrictMode>
    </>
  )
}

// Initialize the application
renderApp()
