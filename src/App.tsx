import React, { useEffect } from 'react'
import { Box, Text, Button, VStack } from '@chakra-ui/react'

function App(): JSX.Element {
  useEffect(() => {
    // Test IPC communication
    window.api.ping().then((result: string) => {
      console.log('IPC test result:', result)
    })
  }, [])

  return (
    <Box p={8}>
      <VStack spacing={4}>
        <Text fontSize="2xl" fontWeight="bold">
          Knowlex Desktop
        </Text>
        <Text>桌面智能助理</Text>
        <Button
          colorScheme="blue"
          onClick={() => {
            window.api.ping().then((result: string) => {
              alert(`IPC Test: ${result}`)
            })
          }}
        >
          Test IPC Communication
        </Button>
      </VStack>
    </Box>
  )
}

export default App
