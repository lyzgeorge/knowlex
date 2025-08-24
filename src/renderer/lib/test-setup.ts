// Test setup file for vitest
import { vi } from 'vitest'

// Mock Electron APIs that might be used in tests
global.window = global.window || {}

// Mock electron APIs if needed
vi.mock('electron', () => ({
  app: {
    getPath: vi.fn(() => '/tmp'),
    getName: vi.fn(() => 'knowlex-test')
  },
  ipcMain: {
    handle: vi.fn(),
    on: vi.fn()
  },
  ipcRenderer: {
    invoke: vi.fn(),
    on: vi.fn()
  }
}))

// Setup console for tests
global.console = console
