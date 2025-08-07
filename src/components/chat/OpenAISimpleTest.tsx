/**
 * Simple OpenAI Test Component
 *
 * A minimal test component to verify OpenAI Agents integration
 * without requiring database functionality.
 */

import React, { useState } from 'react'
import {
  Box,
  VStack,
  Input,
  Button,
  Text,
  Card,
  CardBody,
  Alert,
  AlertIcon,
  Spinner,
  Textarea,
  useToast,
} from '@chakra-ui/react'

export const OpenAISimpleTest: React.FC = () => {
  const [apiConfig, setApiConfig] = useState({
    apiKey: '',
    baseUrl: 'https://api.openai.com/v1',
    model: 'gpt-4o-mini',
  })
  const [message, setMessage] = useState('')
  const [response, setResponse] = useState('')
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState('')

  const toast = useToast()

  const testConnection = async () => {
    if (!apiConfig.apiKey) {
      toast({
        title: 'API Key Required',
        description: 'Please enter your OpenAI API key',
        status: 'warning',
        duration: 3000,
        isClosable: true,
      })
      return
    }

    setIsLoading(true)
    setError('')

    try {
      // Create a promise to handle the IPC response
      const result = await new Promise<any>((resolve, reject) => {
        const messageId = `test_${Date.now()}`

        // Listen for response
        const handleResponse = (response: any) => {
          if (response.id === messageId) {
            window.electronAPI.removeListener('ipc:response', handleResponse)
            if (response.success) {
              resolve(response.data)
            } else {
              reject(new Error(response.error?.message || 'Unknown error'))
            }
          }
        }

        window.electronAPI.on('ipc:response', handleResponse)

        // Send request
        window.electronAPI.send('ipc:request', {
          id: messageId,
          timestamp: Date.now(),
          data: {
            channel: 'openai:test-connection',
            data: apiConfig,
          },
        })

        // Timeout after 30 seconds
        setTimeout(() => {
          window.electronAPI.removeListener('ipc:response', handleResponse)
          reject(new Error('Request timeout'))
        }, 30000)
      })

      if (result.success) {
        toast({
          title: 'Connection Successful',
          description: `Connected in ${result.latency}ms`,
          status: 'success',
          duration: 3000,
          isClosable: true,
        })
      } else {
        setError(result.error || 'Connection failed')
        toast({
          title: 'Connection Failed',
          description: result.error,
          status: 'error',
          duration: 5000,
          isClosable: true,
        })
      }
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error'
      setError(errorMessage)
      toast({
        title: 'Test Failed',
        description: errorMessage,
        status: 'error',
        duration: 5000,
        isClosable: true,
      })
    } finally {
      setIsLoading(false)
    }
  }

  const sendMessage = async () => {
    if (!apiConfig.apiKey) {
      toast({
        title: 'API Key Required',
        description: 'Please enter your OpenAI API key',
        status: 'warning',
        duration: 3000,
        isClosable: true,
      })
      return
    }

    if (!message.trim()) {
      toast({
        title: 'Message Required',
        description: 'Please enter a message to send',
        status: 'warning',
        duration: 3000,
        isClosable: true,
      })
      return
    }

    setIsLoading(true)
    setError('')
    setResponse('')

    try {
      // Create a promise to handle the IPC response
      const result = await new Promise<any>((resolve, reject) => {
        const messageId = `send_${Date.now()}`

        // Listen for response
        const handleResponse = (response: any) => {
          if (response.id === messageId) {
            window.electronAPI.removeListener('ipc:response', handleResponse)
            if (response.success) {
              resolve(response.data)
            } else {
              reject(new Error(response.error?.message || 'Unknown error'))
            }
          }
        }

        window.electronAPI.on('ipc:response', handleResponse)

        // Send request
        window.electronAPI.send('ipc:request', {
          id: messageId,
          timestamp: Date.now(),
          data: {
            channel: 'openai:send-message',
            data: {
              message: message.trim(),
              ...apiConfig,
            },
          },
        })

        // Timeout after 30 seconds
        setTimeout(() => {
          window.electronAPI.removeListener('ipc:response', handleResponse)
          reject(new Error('Request timeout'))
        }, 30000)
      })

      setResponse(result.content || 'No response received')
      toast({
        title: 'Message Sent',
        description: 'Response received successfully',
        status: 'success',
        duration: 3000,
        isClosable: true,
      })
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error'
      setError(errorMessage)
      toast({
        title: 'Send Failed',
        description: errorMessage,
        status: 'error',
        duration: 5000,
        isClosable: true,
      })
    } finally {
      setIsLoading(false)
    }
  }

  return (
    <Box p={6} maxW="800px" mx="auto">
      <VStack spacing={6} align="stretch">
        {/* Header */}
        <Box>
          <Text fontSize="2xl" fontWeight="bold" mb={2}>
            OpenAI Agents Simple Test
          </Text>
          <Text color="gray.600">Test the OpenAI Agents integration with basic functionality</Text>
        </Box>

        {/* API Configuration */}
        <Card>
          <CardBody>
            <VStack spacing={4} align="stretch">
              <Text fontWeight="semibold">API Configuration</Text>

              <Box>
                <Text fontSize="sm" mb={1}>
                  API Key
                </Text>
                <Input
                  type="password"
                  placeholder="sk-..."
                  value={apiConfig.apiKey}
                  onChange={e => setApiConfig(prev => ({ ...prev, apiKey: e.target.value }))}
                />
              </Box>

              <Box>
                <Text fontSize="sm" mb={1}>
                  Base URL
                </Text>
                <Input
                  value={apiConfig.baseUrl}
                  onChange={e => setApiConfig(prev => ({ ...prev, baseUrl: e.target.value }))}
                />
              </Box>

              <Box>
                <Text fontSize="sm" mb={1}>
                  Model
                </Text>
                <Input
                  value={apiConfig.model}
                  onChange={e => setApiConfig(prev => ({ ...prev, model: e.target.value }))}
                />
              </Box>

              <Button
                onClick={testConnection}
                colorScheme="blue"
                isLoading={isLoading}
                disabled={!apiConfig.apiKey}
              >
                Test Connection
              </Button>
            </VStack>
          </CardBody>
        </Card>

        {/* Error Display */}
        {error && (
          <Alert status="error">
            <AlertIcon />
            <Text>{error}</Text>
          </Alert>
        )}

        {/* Message Input */}
        <Card>
          <CardBody>
            <VStack spacing={4} align="stretch">
              <Text fontWeight="semibold">Send Message</Text>

              <Textarea
                placeholder="Type your message here..."
                value={message}
                onChange={e => setMessage(e.target.value)}
                disabled={isLoading}
              />

              <Button
                onClick={sendMessage}
                colorScheme="green"
                isLoading={isLoading}
                disabled={!message.trim() || !apiConfig.apiKey}
              >
                {isLoading ? <Spinner size="sm" /> : 'Send Message'}
              </Button>
            </VStack>
          </CardBody>
        </Card>

        {/* Response Display */}
        {response && (
          <Card>
            <CardBody>
              <VStack spacing={4} align="stretch">
                <Text fontWeight="semibold">AI Response</Text>
                <Box p={4} border="1px" borderColor="gray.200" borderRadius="md" bg="gray.50">
                  <Text whiteSpace="pre-wrap">{response}</Text>
                </Box>
              </VStack>
            </CardBody>
          </Card>
        )}
      </VStack>
    </Box>
  )
}
