import { describe, it, expect } from 'vitest'
import { render, screen } from '@testing-library/react'
import { ChakraProvider } from '@chakra-ui/react'
import App from './App'

// Mock window.api
Object.defineProperty(window, 'api', {
  value: {
    ping: () => Promise.resolve('pong')
  },
  writable: true
})

describe('App', () => {
  it('renders Knowlex Desktop title', () => {
    render(
      <ChakraProvider>
        <App />
      </ChakraProvider>
    )

    expect(screen.getByText('Knowlex Desktop')).toBeDefined()
    expect(screen.getByText('桌面智能助理')).toBeDefined()
  })

  it('renders IPC test button', () => {
    render(
      <ChakraProvider>
        <App />
      </ChakraProvider>
    )

    expect(screen.getByText('Test IPC Communication')).toBeDefined()
  })
})
