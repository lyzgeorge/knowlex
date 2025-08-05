import React from 'react'
import { render, screen } from '@testing-library/react'
import App from './App'

test('renders Knowlex Desktop App', () => {
  render(<App />)
  const linkElement = screen.getByText(/Knowlex Desktop App/i)
  expect(linkElement).toBeInTheDocument()
})
