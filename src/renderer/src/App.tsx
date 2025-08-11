import React from 'react'
import { Box, Text, VStack } from '@chakra-ui/react'

function App(): JSX.Element {
  return (
    <Box minH="100vh" bg="gray.50" p={4}>
      <VStack spacing={4} align="center" justify="center" minH="100vh">
        <Text fontSize="2xl" fontWeight="bold">
          Knowlex Desktop
        </Text>
        <Text color="gray.600">Intelligent workspace for researchers and developers</Text>
      </VStack>
    </Box>
  )
}

export default App
