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
  Collapse
} from '@chakra-ui/react'
import { useIPC, useSystemAPI, useDatabaseAPI } from '../hooks/useIPC'
import type { IPCError } from '@shared'

interface DatabaseHealth {
  status: 'healthy' | 'error' | 'warning'
  details: {
    connection: boolean
    vectorSupport: boolean
    tables: string[]
    dbPath: string
    error?: string
  }
}

interface DatabaseStats {
  projects: { count: number }
  conversations: { count: number }
  messages: { count: number }
  files: { count: number }
  chunks: { count: number }
  memories: { count: number }
  knowledgeCards: { count: number }
  vectors: { available: boolean; documentCount: number }
}

interface MockStatus {
  enabled: boolean
  initialized: boolean
  currentScenario: string
  services: {
    mock: { enabled: boolean; scenario: string }
    openai: { enabled: boolean; models: string[] }
    ipc: { enabled: boolean; handlersCount: number }
  }
  statistics: {
    totalRequests: number
    totalErrors: number
    averageDelay: number
    uptime: number
  }
}

interface MockScenario {
  id: string
  name: string
  description: string
}

interface MockHealth {
  status: 'healthy' | 'degraded' | 'unhealthy'
  services: Record<string, { status: string; details?: any }>
  timestamp: string
}

function DebugApp(): JSX.Element {
  const [dbHealth, setDbHealth] = useState<DatabaseHealth | null>(null)
  const [dbStats, setDbStats] = useState<DatabaseStats | null>(null)
  const [mockStatus, setMockStatus] = useState<MockStatus | null>(null)
  const [mockScenarios, setMockScenarios] = useState<MockScenario[]>([])
  const [mockHealth, setMockHealth] = useState<MockHealth | null>(null)
  const [isLoading, setIsLoading] = useState(false)
  const [showDetails, setShowDetails] = useState(false)
  const [showMockDetails, setShowMockDetails] = useState(false)
  const [appInfo, setAppInfo] = useState<{
    name: string
    version: string
    platform: string
    arch: string
    nodeVersion: string
    electronVersion: string
    uptime: number
  } | null>(null)

  const toast = useToast()
  const { isReady, error: ipcError, invoke } = useIPC()
  const { ping, getAppInfo } = useSystemAPI()
  const { healthCheck, getStats, createSampleData, clearAllData, resetDatabase, searchVectors } =
    useDatabaseAPI()

  // Initialize app when IPC is ready
  useEffect(() => {
    // Set document title for debug window detection
    document.title = 'Knowlex Desktop - Debug Console'

    if (!isReady) return

    initializeApp()
  }, [isReady])

  const initializeApp = async () => {
    try {
      // Get app info
      const info = await getAppInfo()
      setAppInfo(info)

      // Test database connection
      await refreshDatabaseInfo()

      // Check if mock services are available
      await refreshMockInfo()

      console.log('✓ Debug app initialized successfully')
    } catch (error) {
      console.error('Debug app initialization failed:', error)
      handleError('Initialization Error', error)
    }
  }

  const refreshDatabaseInfo = async () => {
    if (!isReady) return

    setIsLoading(true)
    try {
      const [health, stats] = await Promise.all([healthCheck(), getStats()])

      setDbHealth(health as DatabaseHealth)
      setDbStats(stats as DatabaseStats)

      console.log('Database info refreshed:', { health, stats })
    } catch (error) {
      console.error('Failed to refresh database info:', error)
      handleError('Database Error', error)

      setDbHealth({
        status: 'error',
        details: {
          connection: false,
          vectorSupport: false,
          tables: [],
          dbPath: 'Unknown',
          error: (error as IPCError).message || 'Unknown error'
        }
      })
    } finally {
      setIsLoading(false)
    }
  }

  const refreshMockInfo = async () => {
    if (!isReady) return

    try {
      // Check if mock services are available
      const [status, scenarios, health] = await Promise.all([
        invoke('mock:status').catch(() => null),
        invoke('mock:list-scenarios').catch(() => []),
        invoke('mock:health').catch(() => null)
      ])

      setMockStatus(status)
      setMockScenarios(scenarios)
      setMockHealth(health)

      console.log('Mock info refreshed:', { status, scenarios, health })
    } catch (error) {
      console.log('Mock services not available (this is normal in production)')
      setMockStatus(null)
      setMockScenarios([])
      setMockHealth(null)
    }
  }

  const handleError = (title: string, error: unknown) => {
    const ipcError = error as IPCError
    toast({
      title,
      description: ipcError.message || 'An unexpected error occurred',
      status: 'error',
      duration: 5000,
      isClosable: true
    })
  }

  const handleSuccess = (title: string, description: string) => {
    toast({
      title,
      description,
      status: 'success',
      duration: 3000,
      isClosable: true
    })
  }

  const testPing = async () => {
    if (!isReady) return

    setIsLoading(true)
    try {
      const result = await ping()
      handleSuccess('IPC Test Success', `Response: ${result}`)
    } catch (error) {
      handleError('IPC Test Failed', error)
    } finally {
      setIsLoading(false)
    }
  }

  const testVectorSearch = async () => {
    if (!isReady || !dbStats?.chunks?.count) return

    setIsLoading(true)
    try {
      const testEmbedding = Array.from({ length: 384 }, () => Math.random())
      const results = await searchVectors(testEmbedding, 5)

      if (results.length > 0) {
        handleSuccess('Vector Search Success', `Found ${results.length} similar chunks`)
        console.log('Vector search results:', results)
      } else {
        toast({
          title: 'No Results Found',
          description: 'Vector search completed but no results found',
          status: 'warning',
          duration: 3000,
          isClosable: true
        })
      }
    } catch (error) {
      handleError('Vector Search Failed', error)
    } finally {
      setIsLoading(false)
    }
  }

  const handleCreateSampleData = async () => {
    if (!isReady) return

    setIsLoading(true)
    try {
      await createSampleData()
      handleSuccess(
        'Sample Data Created',
        'Sample data with vector embeddings created successfully'
      )
      await refreshDatabaseInfo()
    } catch (error) {
      handleError('Create Sample Data Failed', error)
    } finally {
      setIsLoading(false)
    }
  }

  const handleClearAllData = async () => {
    if (!isReady) return

    const confirmed = window.confirm(
      'Are you sure you want to clear all data? This cannot be undone.'
    )
    if (!confirmed) return

    setIsLoading(true)
    try {
      await clearAllData()
      handleSuccess('Data Cleared', 'All database data cleared successfully')
      await refreshDatabaseInfo()
    } catch (error) {
      handleError('Clear Data Failed', error)
    } finally {
      setIsLoading(false)
    }
  }

  const handleResetDatabase = async () => {
    if (!isReady) return

    const confirmed = window.confirm(
      'Are you sure you want to reset the entire database? This will delete and recreate the database file. This cannot be undone.'
    )
    if (!confirmed) return

    setIsLoading(true)
    try {
      await resetDatabase()
      handleSuccess('Database Reset', 'Database reset and recreated successfully')
      await refreshDatabaseInfo()
    } catch (error) {
      handleError('Database Reset Failed', error)
    } finally {
      setIsLoading(false)
    }
  }

  // Mock service functions
  const handleSwitchScenario = async (scenarioId: string) => {
    if (!isReady) return

    setIsLoading(true)
    try {
      const success = await invoke('mock:switch-scenario', { scenarioId })
      if (success) {
        handleSuccess('Scenario Switched', `Switched to scenario: ${scenarioId}`)
        await refreshMockInfo()
        await refreshDatabaseInfo() // Refresh database info as data may have changed
      } else {
        toast({
          title: 'Switch Failed',
          description: `Failed to switch to scenario: ${scenarioId}`,
          status: 'error',
          duration: 3000,
          isClosable: true
        })
      }
    } catch (error) {
      handleError('Scenario Switch Failed', error)
    } finally {
      setIsLoading(false)
    }
  }

  const handleSimulateError = async (errorType?: string) => {
    if (!isReady) return

    setIsLoading(true)
    try {
      const error = await invoke('mock:execute-command', {
        command: 'simulate-error',
        args: errorType ? [errorType] : []
      })

      toast({
        title: 'Error Simulated',
        description: `Simulated error: ${error.code} - ${error.message}`,
        status: 'info',
        duration: 5000,
        isClosable: true
      })

      await refreshMockInfo()
    } catch (error) {
      handleError('Error Simulation Failed', error)
    } finally {
      setIsLoading(false)
    }
  }

  const handleResetMockStats = async () => {
    if (!isReady) return

    setIsLoading(true)
    try {
      await invoke('mock:execute-command', { command: 'reset-stats' })
      handleSuccess('Statistics Reset', 'Mock service statistics reset successfully')
      await refreshMockInfo()
    } catch (error) {
      handleError('Statistics Reset Failed', error)
    } finally {
      setIsLoading(false)
    }
  }

  const runMockHealthCheck = async () => {
    if (!isReady) return

    setIsLoading(true)
    try {
      const health = await invoke('mock:health')
      setMockHealth(health)

      toast({
        title: 'Health Check Complete',
        description: `Mock services status: ${health.status}`,
        status: health.status === 'healthy' ? 'success' : 'warning',
        duration: 3000,
        isClosable: true
      })
    } catch (error) {
      handleError('Health Check Failed', error)
    } finally {
      setIsLoading(false)
    }
  }

  // Loading state
  if (!isReady) {
    return (
      <Box p={8} textAlign="center">
        <VStack spacing={4}>
          <Text fontSize="2xl" fontWeight="bold">
            Knowlex Desktop Debug
          </Text>
          <Text color="gray.600">开发调试界面</Text>
          <HStack>
            <Spinner size="sm" />
            <Text>Initializing debug interface...</Text>
          </HStack>
          {ipcError && (
            <Alert status="error" mt={4}>
              <AlertIcon />
              <AlertTitle>Initialization Error:</AlertTitle>
              <AlertDescription>{ipcError}</AlertDescription>
            </Alert>
          )}
        </VStack>
      </Box>
    )
  }

  return (
    <Box p={8} maxW="1200px" mx="auto">
      <VStack spacing={6} align="stretch">
        {/* Header */}
        <Box textAlign="center">
          <Text fontSize="3xl" fontWeight="bold" mb={2}>
            Knowlex Desktop Debug
          </Text>
          <Text color="gray.600" mb={4}>
            Development & Testing Interface
          </Text>

          <HStack justify="center" spacing={4}>
            <Badge colorScheme="green" fontSize="sm" px={3} py={1}>
              IPC Ready
            </Badge>
            {appInfo && (
              <Badge variant="outline" fontSize="sm" px={3} py={1}>
                v{appInfo.version}
              </Badge>
            )}
            <Badge colorScheme="purple" fontSize="sm" px={3} py={1}>
              Debug Mode
            </Badge>
          </HStack>
        </Box>

        <Divider />

        {/* Main Tabs */}
        <Tabs variant="enclosed" colorScheme="blue" size="lg">
          <TabList>
            <Tab>Database Testing</Tab>
            <Tab>Mock Services</Tab>
            <Tab>IPC Framework</Tab>
            <Tab>System Info</Tab>
          </TabList>

          <TabPanels>
            {/* Database Testing Tab */}
            <TabPanel>
              <VStack spacing={6} align="stretch">
                {/* Database Status */}
                <Box>
                  <HStack justify="space-between" align="center" mb={4}>
                    <Text fontSize="xl" fontWeight="semibold">
                      Database Status
                    </Text>
                    <Button
                      size="sm"
                      onClick={refreshDatabaseInfo}
                      isLoading={isLoading}
                      loadingText="Refreshing..."
                    >
                      Refresh
                    </Button>
                  </HStack>

                  {dbHealth && (
                    <VStack align="stretch" spacing={3}>
                      <HStack>
                        <Text fontWeight="medium">Status:</Text>
                        <Badge
                          colorScheme={
                            dbHealth.status === 'healthy'
                              ? 'green'
                              : dbHealth.status === 'warning'
                                ? 'yellow'
                                : 'red'
                          }
                          fontSize="sm"
                        >
                          {dbHealth.status?.toUpperCase() || 'UNKNOWN'}
                        </Badge>
                      </HStack>

                      <HStack>
                        <Text fontWeight="medium">Connection:</Text>
                        <Badge colorScheme={dbHealth.details?.connection ? 'green' : 'red'}>
                          {dbHealth.details?.connection ? 'Connected' : 'Disconnected'}
                        </Badge>
                      </HStack>

                      <HStack>
                        <Text fontWeight="medium">Vector Support:</Text>
                        <Badge colorScheme={dbHealth.details?.vectorSupport ? 'green' : 'yellow'}>
                          {dbHealth.details?.vectorSupport ? 'Available' : 'Not Available'}
                        </Badge>
                      </HStack>

                      <HStack justify="space-between">
                        <Text fontWeight="medium">Details:</Text>
                        <Button
                          size="xs"
                          onClick={() => setShowDetails(!showDetails)}
                          variant="ghost"
                        >
                          {showDetails ? '▲' : '▼'}
                        </Button>
                      </HStack>

                      <Collapse in={showDetails}>
                        <VStack align="stretch" spacing={2} pl={4}>
                          <Box>
                            <Text fontSize="sm" fontWeight="medium" mb={1}>
                              Database Path:
                            </Text>
                            <Code fontSize="xs" p={2} borderRadius="md" wordBreak="break-all">
                              {dbHealth.details?.dbPath || 'Unknown'}
                            </Code>
                          </Box>

                          <Box>
                            <Text fontSize="sm" fontWeight="medium" mb={1}>
                              Tables ({dbHealth.details?.tables?.length || 0}):
                            </Text>
                            <HStack wrap="wrap" spacing={1}>
                              {dbHealth.details?.tables?.map((table) => (
                                <Badge key={table} variant="outline" fontSize="xs">
                                  {table}
                                </Badge>
                              )) || (
                                <Text fontSize="xs" color="gray.500">
                                  No tables found
                                </Text>
                              )}
                            </HStack>
                          </Box>
                        </VStack>
                      </Collapse>
                    </VStack>
                  )}
                </Box>

                <Divider />

                {/* Database Statistics */}
                <Box>
                  <Text fontSize="xl" fontWeight="semibold" mb={4}>
                    Database Statistics
                  </Text>

                  {dbStats && (
                    <VStack align="stretch" spacing={2}>
                      {Object.entries(dbStats).map(([key, value]) => {
                        if (key === 'vectors') {
                          return (
                            <HStack key={key} justify="space-between">
                              <Text>Vectors:</Text>
                              <Badge colorScheme={value?.available ? 'green' : 'yellow'}>
                                {value?.documentCount || 0} documents
                              </Badge>
                            </HStack>
                          )
                        }

                        return (
                          <HStack key={key} justify="space-between">
                            <Text>{key.charAt(0).toUpperCase() + key.slice(1)}:</Text>
                            <Badge>{value?.count || 0}</Badge>
                          </HStack>
                        )
                      })}
                    </VStack>
                  )}
                </Box>

                <Divider />

                {/* Database Operations */}
                <Box>
                  <Text fontSize="xl" fontWeight="semibold" mb={4}>
                    Database Operations
                  </Text>

                  <VStack spacing={4} align="stretch">
                    <HStack spacing={3} wrap="wrap">
                      <Button
                        colorScheme="green"
                        onClick={handleCreateSampleData}
                        isLoading={isLoading}
                        loadingText="Creating..."
                      >
                        Create Sample Data
                      </Button>

                      <Button
                        colorScheme="orange"
                        onClick={handleClearAllData}
                        isLoading={isLoading}
                        loadingText="Clearing..."
                      >
                        Clear All Data
                      </Button>

                      <Button
                        colorScheme="red"
                        onClick={handleResetDatabase}
                        isLoading={isLoading}
                        loadingText="Resetting..."
                      >
                        Reset Database
                      </Button>
                    </HStack>

                    <HStack spacing={3}>
                      <Button
                        colorScheme="purple"
                        onClick={testVectorSearch}
                        isLoading={isLoading}
                        loadingText="Searching..."
                        isDisabled={!dbStats?.chunks?.count}
                      >
                        Test Vector Search
                      </Button>
                      <Text fontSize="sm" color="gray.500">
                        {!dbStats?.chunks?.count
                          ? 'Create sample data first to test vector search'
                          : `${dbStats.chunks.count} text chunks available`}
                      </Text>
                    </HStack>
                  </VStack>
                </Box>
              </VStack>
            </TabPanel>

            {/* Mock Services Tab */}
            <TabPanel>
              <VStack spacing={6} align="stretch">
                {mockStatus ? (
                  <>
                    {/* Mock Status */}
                    <Box>
                      <HStack justify="space-between" align="center" mb={4}>
                        <Text fontSize="xl" fontWeight="semibold">
                          Mock Services Status
                        </Text>
                        <Button
                          size="sm"
                          onClick={refreshMockInfo}
                          isLoading={isLoading}
                          loadingText="Refreshing..."
                        >
                          Refresh
                        </Button>
                      </HStack>

                      <VStack align="stretch" spacing={3}>
                        <HStack>
                          <Text fontWeight="medium">Status:</Text>
                          <Badge colorScheme={mockStatus.enabled ? 'green' : 'red'} fontSize="sm">
                            {mockStatus.enabled ? 'ENABLED' : 'DISABLED'}
                          </Badge>
                          <Badge
                            colorScheme={mockStatus.initialized ? 'green' : 'yellow'}
                            fontSize="sm"
                          >
                            {mockStatus.initialized ? 'INITIALIZED' : 'NOT INITIALIZED'}
                          </Badge>
                        </HStack>

                        <HStack>
                          <Text fontWeight="medium">Current Scenario:</Text>
                          <Badge colorScheme="blue" fontSize="sm">
                            {mockStatus.currentScenario}
                          </Badge>
                        </HStack>

                        <HStack>
                          <Text fontWeight="medium">Services:</Text>
                          <Badge
                            colorScheme={mockStatus.services.mock.enabled ? 'green' : 'red'}
                            fontSize="xs"
                          >
                            Mock: {mockStatus.services.mock.enabled ? 'ON' : 'OFF'}
                          </Badge>
                          <Badge
                            colorScheme={mockStatus.services.openai.enabled ? 'green' : 'red'}
                            fontSize="xs"
                          >
                            OpenAI: {mockStatus.services.openai.enabled ? 'ON' : 'OFF'}
                          </Badge>
                          <Badge
                            colorScheme={mockStatus.services.ipc.enabled ? 'green' : 'red'}
                            fontSize="xs"
                          >
                            IPC: {mockStatus.services.ipc.enabled ? 'ON' : 'OFF'}
                          </Badge>
                        </HStack>

                        <HStack justify="space-between">
                          <Text fontWeight="medium">Details:</Text>
                          <Button
                            size="xs"
                            onClick={() => setShowMockDetails(!showMockDetails)}
                            variant="ghost"
                          >
                            {showMockDetails ? '▲' : '▼'}
                          </Button>
                        </HStack>

                        <Collapse in={showMockDetails}>
                          <VStack align="stretch" spacing={2} pl={4}>
                            <Box>
                              <Text fontSize="sm" fontWeight="medium" mb={1}>
                                Statistics:
                              </Text>
                              <VStack align="stretch" spacing={1} fontSize="xs">
                                <HStack justify="space-between">
                                  <Text>Total Requests:</Text>
                                  <Badge>{mockStatus.statistics.totalRequests}</Badge>
                                </HStack>
                                <HStack justify="space-between">
                                  <Text>Total Errors:</Text>
                                  <Badge
                                    colorScheme={
                                      mockStatus.statistics.totalErrors > 0 ? 'red' : 'green'
                                    }
                                  >
                                    {mockStatus.statistics.totalErrors}
                                  </Badge>
                                </HStack>
                                <HStack justify="space-between">
                                  <Text>Average Delay:</Text>
                                  <Badge>{Math.round(mockStatus.statistics.averageDelay)}ms</Badge>
                                </HStack>
                                <HStack justify="space-between">
                                  <Text>Uptime:</Text>
                                  <Badge>{Math.round(mockStatus.statistics.uptime / 1000)}s</Badge>
                                </HStack>
                              </VStack>
                            </Box>

                            <Box>
                              <Text fontSize="sm" fontWeight="medium" mb={1}>
                                IPC Handlers:
                              </Text>
                              <Badge fontSize="xs">
                                {mockStatus.services.ipc.handlersCount} handlers registered
                              </Badge>
                            </Box>

                            <Box>
                              <Text fontSize="sm" fontWeight="medium" mb={1}>
                                OpenAI Models:
                              </Text>
                              <HStack wrap="wrap" spacing={1}>
                                {mockStatus.services.openai.models.slice(0, 6).map((model) => (
                                  <Badge key={model} variant="outline" fontSize="xs">
                                    {model}
                                  </Badge>
                                ))}
                                {mockStatus.services.openai.models.length > 6 && (
                                  <Badge variant="outline" fontSize="xs">
                                    +{mockStatus.services.openai.models.length - 6} more
                                  </Badge>
                                )}
                              </HStack>
                            </Box>
                          </VStack>
                        </Collapse>
                      </VStack>
                    </Box>

                    <Divider />

                    {/* Scenario Management */}
                    <Box>
                      <Text fontSize="xl" fontWeight="semibold" mb={4}>
                        Data Scenarios
                      </Text>

                      <VStack align="stretch" spacing={3}>
                        <Text fontSize="sm" color="gray.600">
                          Switch between different mock data scenarios for testing various
                          conditions.
                        </Text>

                        <VStack align="stretch" spacing={2}>
                          {mockScenarios.map((scenario) => (
                            <HStack
                              key={scenario.id}
                              justify="space-between"
                              p={3}
                              bg="gray.50"
                              borderRadius="md"
                            >
                              <VStack align="start" spacing={1}>
                                <HStack>
                                  <Text fontWeight="medium">{scenario.name}</Text>
                                  {mockStatus.currentScenario === scenario.id && (
                                    <Badge colorScheme="green" fontSize="xs">
                                      ACTIVE
                                    </Badge>
                                  )}
                                </HStack>
                                <Text fontSize="sm" color="gray.600">
                                  {scenario.description}
                                </Text>
                              </VStack>
                              <Button
                                size="sm"
                                colorScheme="blue"
                                variant={
                                  mockStatus.currentScenario === scenario.id ? 'solid' : 'outline'
                                }
                                onClick={() => handleSwitchScenario(scenario.id)}
                                isLoading={isLoading}
                                isDisabled={mockStatus.currentScenario === scenario.id}
                              >
                                {mockStatus.currentScenario === scenario.id ? 'Active' : 'Switch'}
                              </Button>
                            </HStack>
                          ))}
                        </VStack>
                      </VStack>
                    </Box>

                    <Divider />

                    {/* Mock Operations */}
                    <Box>
                      <Text fontSize="xl" fontWeight="semibold" mb={4}>
                        Mock Operations
                      </Text>

                      <VStack spacing={4} align="stretch">
                        <HStack spacing={3} wrap="wrap">
                          <Button
                            colorScheme="purple"
                            onClick={runMockHealthCheck}
                            isLoading={isLoading}
                            loadingText="Checking..."
                          >
                            Run Health Check
                          </Button>

                          <Button
                            colorScheme="orange"
                            onClick={() => handleSimulateError()}
                            isLoading={isLoading}
                            loadingText="Simulating..."
                          >
                            Simulate Random Error
                          </Button>

                          <Button
                            colorScheme="red"
                            variant="outline"
                            onClick={() => handleSimulateError('DB_CONNECTION_ERROR')}
                            isLoading={isLoading}
                            loadingText="Simulating..."
                          >
                            Simulate DB Error
                          </Button>

                          <Button
                            colorScheme="yellow"
                            variant="outline"
                            onClick={() => handleSimulateError('LLM_API_ERROR')}
                            isLoading={isLoading}
                            loadingText="Simulating..."
                          >
                            Simulate LLM Error
                          </Button>
                        </HStack>

                        <HStack spacing={3}>
                          <Button
                            colorScheme="gray"
                            onClick={handleResetMockStats}
                            isLoading={isLoading}
                            loadingText="Resetting..."
                          >
                            Reset Statistics
                          </Button>
                        </HStack>

                        {mockHealth && (
                          <Box p={4} bg="gray.50" borderRadius="md">
                            <Text fontSize="sm" fontWeight="medium" mb={2}>
                              Last Health Check:
                            </Text>
                            <HStack mb={2}>
                              <Text fontSize="sm">Status:</Text>
                              <Badge
                                colorScheme={
                                  mockHealth.status === 'healthy'
                                    ? 'green'
                                    : mockHealth.status === 'degraded'
                                      ? 'yellow'
                                      : 'red'
                                }
                                fontSize="xs"
                              >
                                {mockHealth.status.toUpperCase()}
                              </Badge>
                              <Text fontSize="xs" color="gray.500">
                                {new Date(mockHealth.timestamp).toLocaleTimeString()}
                              </Text>
                            </HStack>
                            <VStack align="stretch" spacing={1} fontSize="xs">
                              {Object.entries(mockHealth.services).map(([service, info]) => (
                                <HStack key={service} justify="space-between">
                                  <Text>{service}:</Text>
                                  <Badge
                                    colorScheme={info.status === 'healthy' ? 'green' : 'yellow'}
                                    fontSize="xs"
                                  >
                                    {info.status}
                                  </Badge>
                                </HStack>
                              ))}
                            </VStack>
                          </Box>
                        )}
                      </VStack>
                    </Box>
                  </>
                ) : (
                  <Box textAlign="center" py={8}>
                    <VStack spacing={4}>
                      <Text fontSize="lg" color="gray.500">
                        Mock Services Not Available
                      </Text>
                      <Text fontSize="sm" color="gray.400">
                        Mock services are only available in development mode. If you&apos;re in
                        development mode, the mock services may not be initialized yet.
                      </Text>
                      <Button
                        size="sm"
                        onClick={refreshMockInfo}
                        isLoading={isLoading}
                        loadingText="Checking..."
                      >
                        Check Again
                      </Button>
                    </VStack>
                  </Box>
                )}
              </VStack>
            </TabPanel>

            {/* IPC Framework Tab */}
            <TabPanel>
              <VStack spacing={6} align="stretch">
                <Box>
                  <Text fontSize="xl" fontWeight="semibold" mb={4}>
                    IPC Communication Test
                  </Text>
                  <VStack spacing={3} align="stretch">
                    <Button
                      colorScheme="blue"
                      onClick={testPing}
                      isLoading={isLoading}
                      loadingText="Testing..."
                    >
                      Test IPC Ping
                    </Button>

                    {appInfo && (
                      <Box p={4} bg="gray.50" borderRadius="md">
                        <Text fontSize="sm" fontWeight="medium" mb={2}>
                          Last Ping Result: Success
                        </Text>
                        <Text fontSize="xs" color="gray.600">
                          IPC communication is working properly
                        </Text>
                      </Box>
                    )}
                  </VStack>
                </Box>

                <Divider />

                <Box>
                  <Text fontSize="lg" fontWeight="semibold" mb={3}>
                    Available IPC Channels
                  </Text>
                  <VStack align="stretch" spacing={2}>
                    <Box>
                      <Text fontSize="sm" fontWeight="medium" mb={1} color="gray.600">
                        System Channels:
                      </Text>
                      <HStack wrap="wrap" spacing={1}>
                        <Badge variant="outline" fontSize="xs">
                          system:ping
                        </Badge>
                        <Badge variant="outline" fontSize="xs">
                          system:app-info
                        </Badge>
                      </HStack>
                    </Box>

                    <Box>
                      <Text fontSize="sm" fontWeight="medium" mb={1} color="gray.600">
                        Database Channels:
                      </Text>
                      <HStack wrap="wrap" spacing={1}>
                        <Badge variant="outline" fontSize="xs">
                          database:health-check
                        </Badge>
                        <Badge variant="outline" fontSize="xs">
                          database:stats
                        </Badge>
                        <Badge variant="outline" fontSize="xs">
                          database:search-vectors
                        </Badge>
                        <Badge variant="outline" fontSize="xs">
                          database:create-sample-data
                        </Badge>
                        <Badge variant="outline" fontSize="xs">
                          database:clear-all-data
                        </Badge>
                        <Badge variant="outline" fontSize="xs">
                          database:reset-database
                        </Badge>
                      </HStack>
                    </Box>

                    {mockStatus && (
                      <Box>
                        <Text fontSize="sm" fontWeight="medium" mb={1} color="purple.600">
                          Mock Service Channels:
                        </Text>
                        <HStack wrap="wrap" spacing={1}>
                          <Badge variant="outline" fontSize="xs" colorScheme="purple">
                            mock:status
                          </Badge>
                          <Badge variant="outline" fontSize="xs" colorScheme="purple">
                            mock:health
                          </Badge>
                          <Badge variant="outline" fontSize="xs" colorScheme="purple">
                            mock:switch-scenario
                          </Badge>
                          <Badge variant="outline" fontSize="xs" colorScheme="purple">
                            mock:list-scenarios
                          </Badge>
                          <Badge variant="outline" fontSize="xs" colorScheme="purple">
                            mock:execute-command
                          </Badge>
                        </HStack>
                      </Box>
                    )}

                    <Box>
                      <Text fontSize="sm" fontWeight="medium" mb={1} color="gray.600">
                        Project & Conversation Channels:
                      </Text>
                      <HStack wrap="wrap" spacing={1}>
                        <Badge variant="outline" fontSize="xs">
                          project:create
                        </Badge>
                        <Badge variant="outline" fontSize="xs">
                          project:list
                        </Badge>
                        <Badge variant="outline" fontSize="xs">
                          conversation:create
                        </Badge>
                        <Badge variant="outline" fontSize="xs">
                          message:send
                        </Badge>
                        <Text fontSize="xs" color="gray.500">
                          ...and more
                        </Text>
                      </HStack>
                    </Box>
                  </VStack>
                </Box>
              </VStack>
            </TabPanel>

            {/* System Info Tab */}
            <TabPanel>
              <Box>
                <Text fontSize="xl" fontWeight="semibold" mb={4}>
                  System Information
                </Text>

                {appInfo && (
                  <VStack align="stretch" spacing={2}>
                    <HStack justify="space-between">
                      <Text>Application:</Text>
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
                      <Text>Architecture:</Text>
                      <Badge>{appInfo.arch}</Badge>
                    </HStack>
                    <HStack justify="space-between">
                      <Text>Node.js:</Text>
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
            </TabPanel>
          </TabPanels>
        </Tabs>
      </VStack>
    </Box>
  )
}

export default DebugApp
