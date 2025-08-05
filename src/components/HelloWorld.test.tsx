import React from 'react'
import { render, screen } from '@testing-library/react'
import HelloWorld from './HelloWorld'

describe('HelloWorld', () => {
  test('renders with default name', () => {
    render(<HelloWorld />)
    const element = screen.getByText(/Hello, World!/i)
    expect(element).toBeInTheDocument()
  })

  test('renders with custom name', () => {
    render(<HelloWorld name="Knowlex" />)
    const element = screen.getByText(/Hello, Knowlex!/i)
    expect(element).toBeInTheDocument()
  })

  test('renders description text', () => {
    render(<HelloWorld />)
    const element = screen.getByText(/test component to verify/i)
    expect(element).toBeInTheDocument()
  })
})
