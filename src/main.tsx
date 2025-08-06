import React from 'react'
import ReactDOM from 'react-dom/client'
import App from './App'
import './index.css'

// Import i18n configuration
import './i18n'

// Import providers
import { ThemeProvider, LanguageProvider } from './providers'

ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <ThemeProvider>
      <LanguageProvider>
        <App />
      </LanguageProvider>
    </ThemeProvider>
  </React.StrictMode>
)
