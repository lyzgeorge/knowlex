import React, { useEffect, useState } from 'react'
import { Box, Spinner, Text, VStack } from '@chakra-ui/react'
import MainApp from './pages/MainApp'
import DebugApp from './pages/DebugApp'

function App(): JSX.Element {
  const [isDebugMode, setIsDebugMode] = useState<boolean | null>(null)

  useEffect(() => {
    // Check if this is the debug window based on URL parameters
    const urlParams = new URLSearchParams(window.location.search)
    const isDebug = urlParams.get('mode') === 'debug'

    console.log('App initialization:', {
      url: window.location.href,
      search: window.location.search,
      mode: urlParams.get('mode'),
      isDebug
    })

    setIsDebugMode(isDebug)
  }, [])

  // Show loading while determining mode
  if (isDebugMode === null) {
    return (
      <Box p={8} textAlign="center">
        <VStack spacing={4}>
          <Spinner size="lg" />
          <Text>Loading Knowlex Desktop...</Text>
        </VStack>
      </Box>
    )
  }

  // Render the appropriate component based on mode
  return isDebugMode ? <DebugApp /> : <MainApp />
}

export default App
