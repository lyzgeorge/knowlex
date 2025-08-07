/**
 * OpenAI Agents Test Component
 *
 * A simple test component to verify OpenAI Agents integration is working.
 * This component provides basic chat functionality for testing purposes.
 */

import React, { useState } from 'react'
import {
  Box,
  VStack,
  HStack,
  Input,
  Button,
  Text,
  Card,
  CardBody,
  Badge,
  Alert,
  AlertIcon,
  Spinner,
  Textarea,
  useToast,
} from '@chakra-ui/react'
import { useOpenAIAgents } from '../../hooks/useOpenAIAgents'

export const OpenAIAgentsTest: React.FC = () => {
  const [inputMessage, setInputMessage] = useState('')
  const [apiConfig, setApiConfig] = useState({
    apiKey: '',
    baseUrl: 'https://api.openai.com/v1',
    model: 'gpt-4o-mini',
  })
  const [showConfig, setShowConfig] = useState(false)
  const [testResult, setTestResult] = useState<{
    success: boolean
    latency?: number
    error?: string
  } | null>(null)

  const toast = useToast()

  const {
    chatState,
    sendMessage,
    sendMessageStream,
    generateTitle,
    testConnection,
    clearMessages,
    clearError,
    stopStreaming,
    validateMessage,
  } = useOpenAIAgents({
    onError: error => {
      toast({
        title: 'Error',
        description: error.message,
        status: 'error',
        duration: 5000,
        isClosable: true,
      })
    },
  })

  const handleSendMessage = async () => {
    const validation = validateMessage(inputMessage)
    if (!validation.valid) {
      toast({
        title: 'Invalid Message',
        description: validation.error,
        status: 'warning',
        duration: 3000,
        isClosable: true,
      })
      return
    }

    await sendMessage(inputMessage)
    setInputMessage('')
  }

  const handleSendMessageStream = () => {
    const validation = validateMessage(inputMessage)
    if (!validation.valid) {
      toast({
        title: 'Invalid Message',
        description: validation.error,
        status: 'warning',
        duration: 3000,
        isClosable: true,
      })
      return
    }

    sendMessageStream(inputMessage)
    setInputMessage('')
  }

  const handleTestConnection = async () => {
    if (!apiConfig.apiKey) {
      toast({
        title: 'API Key Required',
        description: 'Please enter your OpenAI API key to test the connection',
        status: 'warning',
        duration: 3000,
        isClosable: true,
      })
      return
    }

    try {
      const result = await testConnection(apiConfig)
      setTestResult(result)

      if (result.success) {
        toast({
          title: 'Connection Successful',
          description: `Connected in ${result.latency}ms`,
          status: 'success',
          duration: 3000,
          isClosable: true,
        })
      } else {
        toast({
          title: 'Connection Failed',
          description: result.error,
          status: 'error',
          duration: 5000,
          isClosable: true,
        })
      }
    } catch (error) {
      toast({
        title: 'Test Failed',
        description: error instanceof Error ? error.message : 'Unknown error',
        status: 'error',
        duration: 5000,
        isClosable: true,
      })
    }
  }

  const handleGenerateTitle = async () => {
    if (chatState.messages.length === 0) {
      toast({
        title: 'No Conversation',
        description: 'Start a conversation first to generate a title',
        status: 'info',
        duration: 3000,
        isClosable: true,
      })
      return
    }

    try {
      const title = await generateTitle()
      toast({
        title: 'Title Generated',
        description: title,
        status: 'success',
        duration: 5000,
        isClosable: true,
      })
    } catch (error) {
      toast({
        title: 'Title Generation Failed',
        description: error instanceof Error ? error.message : 'Unknown error',
        status: 'error',
        duration: 5000,
        isClosable: true,
      })
    }
  }

  return (
    <Box p={6} maxW="800px" mx="auto">
      <VStack spacing={6} align="stretch">
        {/* Header */}
        <Box>
          <Text fontSize="2xl" fontWeight="bold" mb={2}>
            OpenAI Agents Test
          </Text>
          <Text color="gray.600">
            Test the OpenAI Agents integration with basic chat functionality
          </Text>
        </Box>

        {/* API Configuration */}
        <Card>
          <CardBody>
            <VStack spacing={4} align="stretch">
              <HStack justify="space-between">
                <Text fontWeight="semibold">API Configuration</Text>
                <Button size="sm" onClick={() => setShowConfig(!showConfig)}>
                  {showConfig ? 'Hide' : 'Show'} Config
                </Button>
              </HStack>

              {showConfig && (
                <VStack spacing={3} align="stretch">
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
                  <HStack>
                    <Button onClick={handleTestConnection} colorScheme="blue" size="sm">
                      Test Connection
                    </Button>
                    {testResult && (
                      <Badge colorScheme={testResult.success ? 'green' : 'red'}>
                        {testResult.success ? 'Connected' : 'Failed'}
                        {testResult.latency && ` (${testResult.latency}ms)`}
                      </Badge>
                    )}
                  </HStack>
                </VStack>
              )}
            </VStack>
          </CardBody>
        </Card>

        {/* Error Display */}
        {chatState.error && (
          <Alert status="error">
            <AlertIcon />
            <Box flex="1">
              <Text>{chatState.error}</Text>
            </Box>
            <Button size="sm" onClick={clearError}>
              Dismiss
            </Button>
          </Alert>
        )}

        {/* Chat Messages */}
        <Card>
          <CardBody>
            <VStack spacing={4} align="stretch">
              <HStack justify="space-between">
                <Text fontWeight="semibold">Chat Messages</Text>
                <HStack>
                  <Button size="sm" onClick={handleGenerateTitle} variant="outline">
                    Generate Title
                  </Button>
                  <Button size="sm" onClick={clearMessages} variant="outline">
                    Clear
                  </Button>
                </HStack>
              </HStack>

              <Box
                maxH="400px"
                overflowY="auto"
                border="1px"
                borderColor="gray.200"
                borderRadius="md"
                p={4}
              >
                {chatState.messages.length === 0 ? (
                  <Text color="gray.500" textAlign="center">
                    No messages yet. Start a conversation!
                  </Text>
                ) : (
                  <VStack spacing={3} align="stretch">
                    {chatState.messages.map((message, index) => (
                      <Box
                        key={index}
                        p={3}
                        borderRadius="md"
                        bg={message.role === 'user' ? 'blue.50' : 'gray.50'}
                        borderLeft="4px"
                        borderLeftColor={message.role === 'user' ? 'blue.400' : 'gray.400'}
                      >
                        <HStack justify="space-between" mb={1}>
                          <Badge colorScheme={message.role === 'user' ? 'blue' : 'gray'}>
                            {message.role === 'user' ? 'You' : 'Assistant'}
                          </Badge>
                          {message.timestamp && (
                            <Text fontSize="xs" color="gray.500">
                              {new Date(message.timestamp).toLocaleTimeString()}
                            </Text>
                          )}
                        </HStack>
                        <Text whiteSpace="pre-wrap">{message.content}</Text>
                      </Box>
                    ))}

                    {/* Current streaming response */}
                    {chatState.isStreaming && chatState.currentResponse && (
                      <Box
                        p={3}
                        borderRadius="md"
                        bg="gray.50"
                        borderLeft="4px"
                        borderLeftColor="gray.400"
                      >
                        <HStack justify="space-between" mb={1}>
                          <Badge colorScheme="gray">Assistant</Badge>
                          <HStack>
                            <Spinner size="xs" />
                            <Text fontSize="xs" color="gray.500">
                              Streaming...
                            </Text>
                          </HStack>
                        </HStack>
                        <Text whiteSpace="pre-wrap">{chatState.currentResponse}</Text>
                      </Box>
                    )}
                  </VStack>
                )}
              </Box>
            </VStack>
          </CardBody>
        </Card>

        {/* Message Input */}
        <Card>
          <CardBody>
            <VStack spacing={4} align="stretch">
              <Text fontWeight="semibold">Send Message</Text>
              <Textarea
                placeholder="Type your message here..."
                value={inputMessage}
                onChange={e => setInputMessage(e.target.value)}
                onKeyDown={e => {
                  if (e.key === 'Enter' && !e.shiftKey) {
                    e.preventDefault()
                    handleSendMessage()
                  }
                }}
                disabled={chatState.isLoading}
              />
              <HStack>
                <Button
                  onClick={handleSendMessage}
                  colorScheme="blue"
                  isLoading={chatState.isLoading && !chatState.isStreaming}
                  disabled={!inputMessage.trim() || chatState.isLoading}
                  flex={1}
                >
                  Send Message
                </Button>
                <Button
                  onClick={handleSendMessageStream}
                  colorScheme="green"
                  variant="outline"
                  isLoading={chatState.isStreaming}
                  disabled={!inputMessage.trim() || chatState.isLoading}
                  flex={1}
                >
                  Stream Response
                </Button>
                {chatState.isStreaming && (
                  <Button onClick={stopStreaming} colorScheme="red" variant="outline">
                    Stop
                  </Button>
                )}
              </HStack>
            </VStack>
          </CardBody>
        </Card>

        {/* Status */}
        <Card>
          <CardBody>
            <VStack spacing={2} align="stretch">
              <Text fontWeight="semibold">Status</Text>
              <HStack>
                <Badge colorScheme={chatState.isLoading ? 'yellow' : 'green'}>
                  {chatState.isLoading ? 'Processing' : 'Ready'}
                </Badge>
                {chatState.isStreaming && <Badge colorScheme="blue">Streaming</Badge>}
                <Text fontSize="sm" color="gray.600">
                  Messages: {chatState.messages.length}
                </Text>
              </HStack>
            </VStack>
          </CardBody>
        </Card>
      </VStack>
    </Box>
  )
}
