import React from 'react'
import ReactDOM from 'react-dom/client'
import App from './App'
import './index.css'

// Import main providers component
import { AppProviders } from './providers'

ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <AppProviders>
      <App />
    </AppProviders>
  </React.StrictMode>
)
