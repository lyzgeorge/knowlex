import React, { useEffect, useState } from 'react'
import {
  Box,
  Text,
  Button,
  VStack,
  HStack,
  Badge,
  Code,
  Divider,
  Tabs,
  TabList,
  Tab,
  TabPanels,
  TabPanel,
  useToast,
  Spinner,
  Alert,
  AlertIcon,
  AlertTitle,
  AlertDescription,
  Input,
  FormControl,
  FormLabel,
  NumberInput,
  NumberInputField,
  NumberInputStepper,
  NumberIncrementStepper,
  NumberDecrementStepper,
  Textarea,
  Grid,
  GridItem,
  Tag,
  TagLabel
} from '@chakra-ui/react'
import { useIPC, useSystemAPI } from '../hooks/useIPC'
import type { IPCError, ConnectionTestResult, ChatMessage } from '@shared'

// Define LLMConfig locally since it's not exported from @shared yet
interface LLMConfig {
  apiKey: string
  baseURL?: string
  model: string
  embeddingModel: string
  timeout?: number
  maxRetries?: number
  temperature?: number
  maxTokens?: number
}

/**
 * Simplified test console that keeps the core app testing features:
 * 1) LLM connection + embeddings + chat (non-stream + stream)
 * 2) IPC ping + basic system info
 *
 * Differences vs original:
 * - Removed DB/Mock tabs and duplicate sections
 * - Chat/Embedding model names are now free-text <Input />, so users can type any model name
 * - Added quick-pick tags to prefill common models
 */

function DebugApp(): JSX.Element {
  const toast = useToast()
  const { isReady, error: ipcError } = useIPC()
  const { ping, getAppInfo } = useSystemAPI()

  const [appInfo, setAppInfo] = useState<{
    name: string
    version: string
    platform: string
    arch: string
    nodeVersion: string
    electronVersion: string
    uptime: number
  } | null>(null)

  // LLM state
  const [isBusy, setIsBusy] = useState(false)
  const [isStreaming, setIsStreaming] = useState(false)
  const [connectionResult, setConnectionResult] = useState<ConnectionTestResult | null>(null)

  const [llmConfig, setLlmConfig] = useState<Partial<LLMConfig>>({
    apiKey: '',
    baseURL: 'https://api.openai.com/v1',
    model: 'gpt-4o',
    embeddingModel: 'text-embedding-3-small',
    temperature: 0.7,
    maxTokens: 2000
  })

  const [chatMessages, setChatMessages] = useState<ChatMessage[]>([])
  const [currentMessage, setCurrentMessage] = useState('')
  const [lastResponse, setLastResponse] = useState('')
  const [streamContent, setStreamContent] = useState('')

  useEffect(() => {
    document.title = 'Knowlex — Test Console'
    if (!isReady) return
    getAppInfo()
      .then(setAppInfo)
      .catch(() => null)
  }, [isReady])

  // ————— helpers —————
  const handleError = (title: string, error: unknown) => {
    const e = error as IPCError | Error
    toast({
      title,
      description: (e as IPCError)?.message || (e as Error)?.message || 'Unexpected error',
      status: 'error',
      duration: 5000,
      isClosable: true
    })
  }

  const handleSuccess = (title: string, description: string) => {
    toast({ title, description, status: 'success', duration: 3000, isClosable: true })
  }

  // ————— IPC —————
  const testPing = async () => {
    if (!isReady) return
    setIsBusy(true)
    try {
      const res = await ping()
      handleSuccess('IPC Ping OK', `Response: ${res}`)
    } catch (err) {
      handleError('IPC Ping Failed', err)
    } finally {
      setIsBusy(false)
    }
  }

  // ————— LLM connection —————
  const testLLMConnection = async () => {
    if (!llmConfig.apiKey) {
      toast({
        title: 'API Key Required',
        description: 'Enter your API key first',
        status: 'warning'
      })
      return
    }
    setIsBusy(true)
    try {
      const result = await window.knowlexAPI.llm.testConnection(llmConfig)
      setConnectionResult(result)
      toast({
        title: result.success ? 'Connection Successful' : 'Connection Failed',
        description: result.success
          ? `Latency: ${result.latency}ms`
          : result.error || 'Unknown error',
        status: result.success ? 'success' : 'error',
        duration: 5000,
        isClosable: true
      })
    } catch (err) {
      handleError('Connection Test Failed', err)
      setConnectionResult({ success: false, error: (err as Error).message })
    } finally {
      setIsBusy(false)
    }
  }

  const testEmbeddings = async () => {
    if (!llmConfig.apiKey) {
      toast({
        title: 'API Key Required',
        description: 'Enter your API key first',
        status: 'warning'
      })
      return
    }
    setIsBusy(true)
    try {
      const texts = [
        'Hello world, this is a test.',
        'OpenAI compatible models support embeddings.',
        'Embeddings enable semantic search.'
      ]
      const res = await window.knowlexAPI.llm.embedding({ texts, model: llmConfig.embeddingModel })
      handleSuccess(
        'Embeddings OK',
        `Count: ${res.embeddings?.length || 0}, dims: ${res.embeddings?.[0]?.length || 0}`
      )
      // eslint-disable-next-line no-console
      console.log('Embeddings:', res)
    } catch (err) {
      handleError('Embeddings Failed', err)
    } finally {
      setIsBusy(false)
    }
  }

  // ————— Chat —————
  const sendMessage = async () => {
    const msg = currentMessage.trim()
    if (!msg) {
      toast({ title: 'Message Required', description: 'Type something to send', status: 'warning' })
      return
    }
    if (!llmConfig.apiKey) {
      toast({
        title: 'API Key Required',
        description: 'Enter your API key first',
        status: 'warning'
      })
      return
    }

    setIsBusy(true)
    setLastResponse('')

    const newMsg: ChatMessage = { role: 'user', content: msg }
    const messages = [...chatMessages, newMsg]
    setChatMessages(messages)

    try {
      const res = await window.knowlexAPI.llm.chat({
        messages,
        model: llmConfig.model,
        temperature: llmConfig.temperature,
        maxTokens: llmConfig.maxTokens
      })
      console.log('📨 Received chat response:', res)
      const assistant: ChatMessage = { role: 'assistant', content: res.content }
      setChatMessages([...messages, assistant])
      setLastResponse(res.content)
      setCurrentMessage('')
      handleSuccess('Message Sent', `Tokens: ${res.usage?.total_tokens || 'N/A'}`)
    } catch (err) {
      handleError('Send Failed', err)
    } finally {
      setIsBusy(false)
    }
  }

  const sendStreaming = async () => {
    const msg = currentMessage.trim()
    if (!msg) {
      toast({ title: 'Message Required', description: 'Type something to send', status: 'warning' })
      return
    }
    if (!llmConfig.apiKey) {
      toast({
        title: 'API Key Required',
        description: 'Enter your API key first',
        status: 'warning'
      })
      return
    }

    setIsStreaming(true)
    setStreamContent('')

    const newMsg: ChatMessage = { role: 'user', content: msg }
    const messages = [...chatMessages, newMsg]
    setChatMessages(messages)

    try {
      let acc = ''

      // Set up stream listener
      const unsubscribe = window.knowlexAPI.onStream('llm:stream', (streamData: any) => {
        if (streamData.type === 'data' && streamData.data) {
          const chunk = streamData.data
          if (chunk.type === 'token' && chunk.content) {
            acc += chunk.content
            setStreamContent(acc)
          } else if (chunk.type === 'complete') {
            const assistant: ChatMessage = { role: 'assistant', content: acc }
            setChatMessages([...messages, assistant])
            setCurrentMessage('')
            handleSuccess(
              'Streaming Complete',
              `Tokens: ${chunk.metadata?.usage?.total_tokens || 'N/A'}`
            )
            setIsStreaming(false)
            unsubscribe()
          } else if (chunk.type === 'error') {
            handleError('Streaming Failed', new Error(chunk.error?.message || 'Stream error'))
            setIsStreaming(false)
            unsubscribe()
          }
        } else if (streamData.type === 'error') {
          handleError('Streaming Failed', new Error(streamData.error?.message || 'Stream failed'))
          setIsStreaming(false)
          unsubscribe()
        }
      })

      // Start the stream
      window.knowlexAPI.llm.stream({
        messages,
        model: llmConfig.model,
        temperature: llmConfig.temperature,
        maxTokens: llmConfig.maxTokens
      })

      // Cleanup after timeout
      setTimeout(() => {
        if (isStreaming) {
          unsubscribe()
          setIsStreaming(false)
          handleError('Streaming Failed', new Error('Stream timeout'))
        }
      }, 60000)
    } catch (err) {
      handleError('Streaming Failed', err)
      setIsStreaming(false)
    }
  }

  const clearChat = () => {
    setChatMessages([])
    setCurrentMessage('')
    setLastResponse('')
    setStreamContent('')
  }

  // ————— UI —————
  if (!isReady) {
    return (
      <Box p={8} textAlign="center">
        <VStack spacing={4}>
          <Text fontSize="2xl" fontWeight="bold">
            Knowlex — Test Console
          </Text>
          <HStack>
            <Spinner size="sm" />
            <Text>Initializing…</Text>
          </HStack>
          {ipcError && (
            <Alert status="error" mt={2}>
              <AlertIcon />
              <AlertTitle>Initialization Error</AlertTitle>
              <AlertDescription ml={2}>{ipcError}</AlertDescription>
            </Alert>
          )}
        </VStack>
      </Box>
    )
  }

  const presetChatModels = ['gpt-4o', 'gpt-4.1-mini', 'gpt-4.1', 'gpt-4o-mini']
  const presetEmbedModels = [
    'text-embedding-3-small',
    'text-embedding-3-large',
    'text-embedding-ada-002'
  ]

  return (
    <Box p={8} maxW="1000px" mx="auto">
      <VStack spacing={6} align="stretch">
        <Box textAlign="center">
          <Text fontSize="3xl" fontWeight="bold">
            Knowlex — Test Console
          </Text>
          <Text color="gray.600">LLM & IPC testing</Text>
        </Box>

        <Divider />

        <Tabs variant="enclosed" colorScheme="blue" size="md">
          <TabList>
            <Tab>LLM Tests</Tab>
            <Tab>System / IPC</Tab>
          </TabList>
          <TabPanels>
            {/* LLM */}
            <TabPanel>
              <VStack spacing={6} align="stretch">
                {/* Config */}
                <Box>
                  <Text fontSize="xl" fontWeight="semibold" mb={3}>
                    LLM Configuration
                  </Text>
                  <Grid templateColumns="repeat(2, 1fr)" gap={4}>
                    <GridItem colSpan={2}>
                      <FormControl>
                        <FormLabel fontSize="sm">API Key</FormLabel>
                        <Input
                          type="password"
                          placeholder="sk-…"
                          value={llmConfig.apiKey}
                          onChange={(e) => setLlmConfig((p) => ({ ...p, apiKey: e.target.value }))}
                        />
                      </FormControl>
                    </GridItem>
                    <GridItem>
                      <FormControl>
                        <FormLabel fontSize="sm">Base URL</FormLabel>
                        <Input
                          value={llmConfig.baseURL}
                          onChange={(e) => setLlmConfig((p) => ({ ...p, baseURL: e.target.value }))}
                        />
                      </FormControl>
                    </GridItem>
                    <GridItem>
                      <FormControl>
                        <FormLabel fontSize="sm">Chat Model (editable)</FormLabel>
                        <Input
                          placeholder="e.g. gpt-4o"
                          value={llmConfig.model}
                          onChange={(e) => setLlmConfig((p) => ({ ...p, model: e.target.value }))}
                        />
                        <HStack spacing={2} mt={2} wrap="wrap">
                          {presetChatModels.map((m) => (
                            <Tag
                              key={m}
                              size="sm"
                              variant="subtle"
                              cursor="pointer"
                              onClick={() => setLlmConfig((p) => ({ ...p, model: m }))}
                            >
                              <TagLabel>{m}</TagLabel>
                            </Tag>
                          ))}
                        </HStack>
                      </FormControl>
                    </GridItem>
                    <GridItem>
                      <FormControl>
                        <FormLabel fontSize="sm">Embedding Model (editable)</FormLabel>
                        <Input
                          placeholder="e.g. text-embedding-3-small"
                          value={llmConfig.embeddingModel}
                          onChange={(e) =>
                            setLlmConfig((p) => ({ ...p, embeddingModel: e.target.value }))
                          }
                        />
                        <HStack spacing={2} mt={2} wrap="wrap">
                          {presetEmbedModels.map((m) => (
                            <Tag
                              key={m}
                              size="sm"
                              variant="subtle"
                              cursor="pointer"
                              onClick={() => setLlmConfig((p) => ({ ...p, embeddingModel: m }))}
                            >
                              <TagLabel>{m}</TagLabel>
                            </Tag>
                          ))}
                        </HStack>
                      </FormControl>
                    </GridItem>
                    <GridItem>
                      <FormControl>
                        <FormLabel fontSize="sm">Temperature</FormLabel>
                        <NumberInput
                          value={llmConfig.temperature}
                          min={0}
                          max={2}
                          step={0.1}
                          onChange={(_, n) =>
                            setLlmConfig((p) => ({ ...p, temperature: Number.isFinite(n) ? n : 0 }))
                          }
                        >
                          <NumberInputField />
                          <NumberInputStepper>
                            <NumberIncrementStepper />
                            <NumberDecrementStepper />
                          </NumberInputStepper>
                        </NumberInput>
                      </FormControl>
                    </GridItem>
                    <GridItem>
                      <FormControl>
                        <FormLabel fontSize="sm">Max Tokens</FormLabel>
                        <NumberInput
                          value={llmConfig.maxTokens}
                          min={1}
                          max={4000}
                          onChange={(_, n) =>
                            setLlmConfig((p) => ({
                              ...p,
                              maxTokens: Number.isFinite(n) ? n : 1024
                            }))
                          }
                        >
                          <NumberInputField />
                          <NumberInputStepper>
                            <NumberIncrementStepper />
                            <NumberDecrementStepper />
                          </NumberInputStepper>
                        </NumberInput>
                      </FormControl>
                    </GridItem>
                  </Grid>

                  <HStack mt={4} spacing={3}>
                    <Button
                      colorScheme="blue"
                      onClick={testLLMConnection}
                      isLoading={isBusy}
                      loadingText="Testing…"
                    >
                      Test Connection
                    </Button>
                    <Button
                      colorScheme="purple"
                      onClick={testEmbeddings}
                      isLoading={isBusy}
                      loadingText="Testing…"
                    >
                      Test Embeddings
                    </Button>
                  </HStack>

                  {connectionResult && (
                    <Box
                      mt={4}
                      p={4}
                      bg={connectionResult.success ? 'green.50' : 'red.50'}
                      borderRadius="md"
                    >
                      <HStack mb={2}>
                        <Text fontSize="sm" fontWeight="medium">
                          Connection:
                        </Text>
                        <Badge colorScheme={connectionResult.success ? 'green' : 'red'}>
                          {connectionResult.success ? 'SUCCESS' : 'FAILED'}
                        </Badge>
                        {connectionResult.latency != null && (
                          <Badge variant="outline">{connectionResult.latency}ms</Badge>
                        )}
                      </HStack>
                      {connectionResult.error && (
                        <Text fontSize="sm" color="red.600">
                          {connectionResult.error}
                        </Text>
                      )}
                      {connectionResult.details && (
                        <Code fontSize="xs" p={2} mt={2} display="block" whiteSpace="pre-wrap">
                          {JSON.stringify(connectionResult.details, null, 2)}
                        </Code>
                      )}
                    </Box>
                  )}
                </Box>

                <Divider />

                {/* Chat */}
                <Box>
                  <HStack justify="space-between" mb={3}>
                    <Text fontSize="xl" fontWeight="semibold">
                      Chat Testing
                    </Text>
                    <Button size="sm" onClick={clearChat} variant="outline">
                      Clear Chat
                    </Button>
                  </HStack>

                  {chatMessages.length > 0 && (
                    <Box mb={4} p={4} bg="gray.50" borderRadius="md" maxH="300px" overflowY="auto">
                      <VStack align="stretch" spacing={3}>
                        {chatMessages.map((m, i) => (
                          <Box
                            key={i}
                            p={3}
                            bg={m.role === 'user' ? 'blue.100' : 'green.100'}
                            borderRadius="md"
                            maxW="80%"
                            alignSelf={m.role === 'user' ? 'flex-end' : 'flex-start'}
                          >
                            <Text fontSize="xs" fontWeight="bold" color="gray.600" mb={1}>
                              {m.role.toUpperCase()}
                            </Text>
                            <Text fontSize="sm" whiteSpace="pre-wrap">
                              {m.content}
                            </Text>
                          </Box>
                        ))}
                        {isStreaming && (
                          <Box
                            p={3}
                            bg="green.100"
                            borderRadius="md"
                            maxW="80%"
                            alignSelf="flex-start"
                            border="2px dashed"
                            borderColor="green.300"
                          >
                            <Text fontSize="xs" fontWeight="bold" color="gray.600" mb={1}>
                              ASSISTANT (STREAMING…)
                            </Text>
                            <Text fontSize="sm" whiteSpace="pre-wrap">
                              {streamContent}
                            </Text>
                          </Box>
                        )}
                      </VStack>
                    </Box>
                  )}

                  <VStack spacing={3} align="stretch">
                    <FormControl>
                      <FormLabel fontSize="sm">Message</FormLabel>
                      <Textarea
                        rows={3}
                        placeholder="Type your test prompt…"
                        value={currentMessage}
                        onChange={(e) => setCurrentMessage(e.target.value)}
                      />
                    </FormControl>
                    <HStack spacing={3}>
                      <Button
                        colorScheme="green"
                        onClick={sendMessage}
                        isLoading={isBusy}
                        loadingText="Sending…"
                        isDisabled={!llmConfig.apiKey || !currentMessage.trim()}
                      >
                        Send
                      </Button>
                      <Button
                        colorScheme="orange"
                        onClick={sendStreaming}
                        isLoading={isStreaming}
                        loadingText="Streaming…"
                        isDisabled={!llmConfig.apiKey || !currentMessage.trim() || isStreaming}
                      >
                        Stream
                      </Button>
                    </HStack>
                  </VStack>

                  {lastResponse && !isStreaming && (
                    <Box mt={4} p={4} bg="green.50" borderRadius="md">
                      <Text fontSize="sm" fontWeight="medium" mb={2}>
                        Last Response
                      </Text>
                      <Text fontSize="sm" whiteSpace="pre-wrap">
                        {lastResponse}
                      </Text>
                    </Box>
                  )}

                  <Alert status="info" mt={4}>
                    <AlertIcon />
                    <Box>
                      <AlertTitle>Tips</AlertTitle>
                      <AlertDescription fontSize="sm">
                        • You can type any OpenAI-compatible model names into the editable fields.
                        <br />• Try lower temperature (0.2) for focused answers, higher (0.9) for
                        creative.
                      </AlertDescription>
                    </Box>
                  </Alert>
                </Box>
              </VStack>
            </TabPanel>

            {/* System / IPC */}
            <TabPanel>
              <VStack spacing={6} align="stretch">
                <Box>
                  <Text fontSize="xl" fontWeight="semibold" mb={3}>
                    IPC
                  </Text>
                  <VStack align="start" spacing={3}>
                    <Button
                      colorScheme="blue"
                      onClick={testPing}
                      isLoading={isBusy}
                      loadingText="Testing…"
                    >
                      Test IPC Ping
                    </Button>
                  </VStack>
                </Box>

                <Divider />

                <Box>
                  <Text fontSize="xl" fontWeight="semibold" mb={3}>
                    System Information
                  </Text>
                  {appInfo && (
                    <VStack align="stretch" spacing={2}>
                      <HStack justify="space-between">
                        <Text>App:</Text>
                        <Badge>{appInfo.name}</Badge>
                      </HStack>
                      <HStack justify="space-between">
                        <Text>Version:</Text>
                        <Badge>{appInfo.version}</Badge>
                      </HStack>
                      <HStack justify="space-between">
                        <Text>Platform:</Text>
                        <Badge>{appInfo.platform}</Badge>
                      </HStack>
                      <HStack justify="space-between">
                        <Text>Arch:</Text>
                        <Badge>{appInfo.arch}</Badge>
                      </HStack>
                      <HStack justify="space-between">
                        <Text>Node:</Text>
                        <Badge>v{appInfo.nodeVersion}</Badge>
                      </HStack>
                      <HStack justify="space-between">
                        <Text>Electron:</Text>
                        <Badge>v{appInfo.electronVersion}</Badge>
                      </HStack>
                      <HStack justify="space-between">
                        <Text>Uptime:</Text>
                        <Badge>{Math.floor(appInfo.uptime)}s</Badge>
                      </HStack>
                    </VStack>
                  )}
                </Box>

                <Divider />

                <Box>
                  <Text fontSize="xl" fontWeight="semibold" mb={3}>
                    LLM Integration
                  </Text>
                  <VStack align="stretch" spacing={1}>
                    <HStack justify="space-between">
                      <Text>Chat</Text>
                      <Badge colorScheme="green">Available</Badge>
                    </HStack>
                    <HStack justify="space-between">
                      <Text>Streaming</Text>
                      <Badge colorScheme="green">Enabled</Badge>
                    </HStack>
                    <HStack justify="space-between">
                      <Text>Embeddings</Text>
                      <Badge colorScheme="green">Available</Badge>
                    </HStack>
                  </VStack>
                </Box>
              </VStack>
            </TabPanel>
          </TabPanels>
        </Tabs>
      </VStack>
    </Box>
  )
}

export default DebugApp
