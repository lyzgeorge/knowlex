/**
 * Jest setup file for Knowlex Desktop Application
 *
 * This file is automatically loaded by Jest before running tests.
 * It sets up testing utilities and global mocks.
 */

import '@testing-library/jest-dom'

// Mock window.matchMedia
Object.defineProperty(window, 'matchMedia', {
  writable: true,
  value: jest.fn().mockImplementation(query => ({
    matches: false,
    media: query,
    onchange: null,
    addListener: jest.fn(), // deprecated
    removeListener: jest.fn(), // deprecated
    addEventListener: jest.fn(),
    removeEventListener: jest.fn(),
    dispatchEvent: jest.fn(),
  })),
})

// Mock ResizeObserver
global.ResizeObserver = jest.fn().mockImplementation(() => ({
  observe: jest.fn(),
  unobserve: jest.fn(),
  disconnect: jest.fn(),
}))

// Mock IntersectionObserver
global.IntersectionObserver = jest.fn().mockImplementation(() => ({
  observe: jest.fn(),
  unobserve: jest.fn(),
  disconnect: jest.fn(),
}))

// Mock localStorage
const localStorageMock = {
  getItem: jest.fn(),
  setItem: jest.fn(),
  removeItem: jest.fn(),
  clear: jest.fn(),
}
global.localStorage = localStorageMock as Storage

// Mock sessionStorage
const sessionStorageMock = {
  getItem: jest.fn(),
  setItem: jest.fn(),
  removeItem: jest.fn(),
  clear: jest.fn(),
  key: jest.fn(),
  length: 0,
}
global.sessionStorage = sessionStorageMock as Storage

// Mock console methods to reduce noise in tests
global.console = {
  ...console,
  // Uncomment to ignore specific console methods
  // log: jest.fn(),
  // debug: jest.fn(),
  // info: jest.fn(),
  // warn: jest.fn(),
  // error: jest.fn(),
}

// Mock Electron APIs if needed
global.window.electronAPI = {
  minimize: jest.fn(),
  maximize: jest.fn(),
  close: jest.fn(),
  toggleMaximize: jest.fn(),
}

// Set up default language for tests
beforeEach(() => {
  localStorageMock.getItem.mockImplementation((key: string) => {
    if (key === 'i18nextLng') return 'en'
    if (key === 'knowlex-theme') return 'light'
    return null
  })
})

// Clean up after each test
afterEach(() => {
  jest.clearAllMocks()
})
