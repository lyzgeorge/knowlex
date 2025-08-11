import React, { useMemo } from 'react'
import { MainApp, DebugApp } from './pages'

/**
 * Main App component that routes between MainApp and DebugApp based on URL parameters
 * - Default route (/) renders MainApp - the main user interface
 * - Debug route (/?mode=debug) renders DebugApp - development debugging interface
 */
function App(): JSX.Element {
  const appMode = useMemo(() => {
    const urlParams = new URLSearchParams(window.location.search)
    return urlParams.get('mode')
  }, [])

  // Route to debug interface if mode=debug parameter is present
  if (appMode === 'debug') {
    return <DebugApp />
  }

  // Default to main application interface
  return <MainApp />
}

export default App
