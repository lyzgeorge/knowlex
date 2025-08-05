import React from 'react'
import { ChakraProvider, Box, Heading, Text } from '@chakra-ui/react'
import HelloWorld from './components/HelloWorld'

function App() {
  return (
    <ChakraProvider>
      <Box p={8}>
        <Heading as="h1" size="xl" mb={4}>
          Knowlex Desktop App
        </Heading>
        <Text mb={6}>Welcome to Knowlex 桌面智能助理</Text>
        <HelloWorld name="Knowlex Development Environment" />
      </Box>
    </ChakraProvider>
  )
}

export default App
