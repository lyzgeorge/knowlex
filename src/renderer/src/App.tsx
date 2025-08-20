import React, { useEffect, Suspense } from 'react'
import {
  Box,
  Spinner,
  Text,
  VStack,
  Alert,
  AlertIcon,
  AlertTitle,
  AlertDescription
} from '@chakra-ui/react'
import MainApp from './pages/MainApp'
import DebugApp from './pages/DebugApp'
import { initializeStores, useAppStore } from './stores'

/**
 * Loading fallback component
 */
function LoadingFallback() {
  return (
    <Box
      height="100vh"
      display="flex"
      alignItems="center"
      justifyContent="center"
      bg="background.primary"
    >
      <VStack spacing={4}>
        <Spinner size="lg" color="primary.500" />
        <Text fontSize="sm" color="text.secondary">
          Loading Knowlex...
        </Text>
      </VStack>
    </Box>
  )
}

/**
 * Error component for initialization failures
 */
function InitializationError({ error, retry }: { error: Error; retry: () => void }) {
  return (
    <Box
      height="100vh"
      display="flex"
      alignItems="center"
      justifyContent="center"
      bg="background.primary"
      p={8}
    >
      <Alert
        status="error"
        variant="subtle"
        flexDirection="column"
        alignItems="center"
        justifyContent="center"
        textAlign="center"
        maxW="md"
        borderRadius="md"
      >
        <AlertIcon boxSize="40px" mr={0} />
        <AlertTitle mt={4} mb={1} fontSize="lg">
          Failed to initialize Knowlex
        </AlertTitle>
        <AlertDescription maxWidth="sm">{error.message}</AlertDescription>
        <Box mt={4}>
          <button
            onClick={retry}
            style={{
              backgroundColor: 'var(--chakra-colors-primary-500)',
              color: 'white',
              padding: '0.75rem 1.5rem',
              borderRadius: '0.375rem',
              border: 'none',
              cursor: 'pointer',
              fontSize: '0.875rem',
              fontWeight: '500'
            }}
          >
            Retry
          </button>
        </Box>
      </Alert>
    </Box>
  )
}

/**
 * App initialization hook
 */
function useAppInitialization() {
  const [initState, setInitState] = React.useState<'loading' | 'success' | 'error'>('loading')
  const [error, setError] = React.useState<Error | null>(null)

  const initialize = React.useCallback(async () => {
    try {
      setInitState('loading')
      setError(null)

      // Initialize stores
      await initializeStores()

      // Set window mode based on URL params
      const urlParams = new URLSearchParams(window.location.search)
      const mode = urlParams.get('mode')

      // Use getState() to avoid subscribing during initialization
      useAppStore.getState().setWindowMode(mode === 'debug' ? 'debug' : 'main')

      setInitState('success')
    } catch (err) {
      console.error('Failed to initialize app:', err)
      setError(err instanceof Error ? err : new Error('Unknown initialization error'))
      setInitState('error')
    }
  }, [])

  useEffect(() => {
    initialize()
  }, [initialize])

  return { initState, error, retry: initialize }
}

/**
 * Main App component that routes between MainApp and DebugApp based on URL parameters
 * - Default route (/) renders MainApp - the main user interface
 * - Debug route (/?mode=debug) renders DebugApp - development debugging interface
 *
 * Features:
 * - Global state management initialization
 * - Theme system integration
 * - Error boundary integration
 * - Loading states
 * - Dual window architecture support
 */
function App(): JSX.Element {
  const { initState, error, retry } = useAppInitialization()
  const windowMode = useAppStore((state) => state.windowMode)

  // Show loading state during initialization
  if (initState === 'loading') {
    return <LoadingFallback />
  }

  // Show error state if initialization failed
  if (initState === 'error' && error) {
    return <InitializationError error={error} retry={retry} />
  }

  // Route to appropriate app based on window mode
  return (
    <Suspense fallback={<LoadingFallback />}>
      {windowMode === 'debug' ? <DebugApp /> : <MainApp />}
    </Suspense>
  )
}

export default App
