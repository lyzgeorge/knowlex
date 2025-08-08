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
import { useIPC, useSystemAPI, useDatabaseAPI } from './hooks/useIPC'
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

function App(): JSX.Element {
  const [dbHealth, setDbHealth] = useState<DatabaseHealth | null>(null)
  const [dbStats, setDbStats] = useState<DatabaseStats | null>(null)
  const [isLoading, setIsLoading] = useState(false)
  const [showDetails, setShowDetails] = useState(false)
  const [appInfo, setAppInfo] = useState<any>(null)

  const toast = useToast()
  const { isReady, error: ipcError } = useIPC()
  const { ping, getAppInfo } = useSystemAPI()
  const { healthCheck, getStats, createSampleData, clearAllData, resetDatabase, searchVectors } =
    useDatabaseAPI()

  // Initialize app when IPC is ready
  useEffect(() => {
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

      console.log('✓ App initialized successfully')
    } catch (error) {
      console.error('App initialization failed:', error)
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

  // Loading state
  if (!isReady) {
    return (
      <Box p={8} textAlign="center">
        <VStack spacing={4}>
          <Text fontSize="2xl" fontWeight="bold">
            Knowlex Desktop
          </Text>
          <Text color="gray.600">桌面智能助理</Text>
          <HStack>
            <Spinner size="sm" />
            <Text>Initializing application...</Text>
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
            Knowlex Desktop
          </Text>
          <Text color="gray.600" mb={4}>
            AI-Powered Knowledge Assistant
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
          </HStack>
        </Box>

        <Divider />

        {/* Main Tabs */}
        <Tabs variant="enclosed" colorScheme="blue" size="lg">
          <TabList>
            <Tab>Database Testing</Tab>
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
                  <VStack align="stretch" spacing={1}>
                    <Badge variant="outline" fontSize="xs">
                      system:ping
                    </Badge>
                    <Badge variant="outline" fontSize="xs">
                      system:app-info
                    </Badge>
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

export default App
