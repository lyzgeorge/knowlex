import { describe, it, expect, vi } from 'vitest'
import { render, screen, waitFor } from '@testing-library/react'
import { ChakraProvider } from '@chakra-ui/react'
import App from './App'

// Mock the IPC client
vi.mock('./lib/ipc-client', () => ({
  ipcClient: {
    ready: true,
    system: {
      ping: vi.fn().mockResolvedValue('pong'),
      getAppInfo: vi.fn().mockResolvedValue({
        name: 'Knowlex Desktop',
        version: '0.1.0',
        platform: 'darwin',
        arch: 'x64',
        nodeVersion: '18.0.0',
        electronVersion: '28.1.0',
        uptime: 100
      })
    },
    database: {
      healthCheck: vi.fn().mockResolvedValue({
        status: 'healthy',
        details: {
          connection: true,
          vectorSupport: true,
          tables: ['projects', 'conversations'],
          dbPath: '/test/path'
        }
      }),
      getStats: vi.fn().mockResolvedValue({
        projects: { count: 0 },
        conversations: { count: 0 },
        messages: { count: 0 },
        files: { count: 0 },
        chunks: { count: 0 },
        memories: { count: 0 },
        knowledgeCards: { count: 0 },
        vectors: { available: true, documentCount: 0 }
      }),
      createSampleData: vi.fn().mockResolvedValue(undefined),
      clearAllData: vi.fn().mockResolvedValue(undefined),
      resetDatabase: vi.fn().mockResolvedValue(undefined),
      searchVectors: vi.fn().mockResolvedValue([])
    }
  }
}))

// Mock window.knowlexAPI
Object.defineProperty(window, 'knowlexAPI', {
  value: {
    invoke: () => Promise.resolve('pong'),
    onStream: () => () => {},
    onEvent: () => () => {},
    system: {
      ping: () => Promise.resolve('pong'),
      getAppInfo: () =>
        Promise.resolve({
          name: 'Knowlex Desktop',
          version: '0.1.0',
          platform: 'darwin',
          arch: 'x64',
          nodeVersion: '18.0.0',
          electronVersion: '28.1.0',
          uptime: 100
        })
    },
    database: {
      healthCheck: () =>
        Promise.resolve({
          status: 'healthy',
          details: {
            connection: true,
            vectorSupport: true,
            tables: ['projects', 'conversations'],
            dbPath: '/test/path'
          }
        }),
      getStats: () =>
        Promise.resolve({
          projects: { count: 0 },
          conversations: { count: 0 },
          messages: { count: 0 },
          files: { count: 0 },
          chunks: { count: 0 },
          memories: { count: 0 },
          knowledgeCards: { count: 0 },
          vectors: { available: true, documentCount: 0 }
        }),
      createSampleData: () => Promise.resolve(),
      clearAllData: () => Promise.resolve(),
      resetDatabase: () => Promise.resolve(),
      searchVectors: () => Promise.resolve([])
    }
  },
  writable: true
})

describe('App', () => {
  it('renders main app by default', async () => {
    render(
      <ChakraProvider>
        <App />
      </ChakraProvider>
    )

    // Wait for the app to initialize and show the main content
    await waitFor(() => {
      expect(screen.getByText('Knowlex')).toBeDefined()
    })

    await waitFor(() => {
      expect(screen.getByText('Desktop')).toBeDefined()
    })

    await waitFor(() => {
      expect(screen.getByText('欢迎使用 Knowlex 桌面智能助理')).toBeDefined()
    })
  })

  it('renders debug app when mode=debug', async () => {
    // Mock URL search params for debug mode
    Object.defineProperty(window, 'location', {
      value: {
        href: 'http://localhost:3000/?mode=debug',
        search: '?mode=debug'
      },
      writable: true
    })

    render(
      <ChakraProvider>
        <App />
      </ChakraProvider>
    )

    // Wait for the app to initialize and show the debug content
    await waitFor(() => {
      expect(screen.getByText('Knowlex Desktop Debug')).toBeDefined()
    })

    await waitFor(() => {
      expect(screen.getByText('Test IPC Ping')).toBeDefined()
    })
  })
})
