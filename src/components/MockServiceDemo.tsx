/**
 * Mock Service Demo Component
 *
 * Demonstrates the mock services functionality for development and testing.
 * This component shows how to use the mock services and switch between scenarios.
 */

import React, { useState, useEffect } from 'react'
import { developmentTools } from '@/services/development-factory'
import type { ScenarioInfo, MockStats } from '@/services/interfaces/mock-facade'

export const MockServiceDemo: React.FC = () => {
  const [currentScenario, setCurrentScenario] = useState<string>('default')
  const [scenarios, setScenarios] = useState<ScenarioInfo[]>([])
  const [stats, setStats] = useState<MockStats | null>(null)
  const [isDevMode, setIsDevMode] = useState<boolean>(false)
  const [testResults, setTestResults] = useState<Record<string, unknown> | null>(null)

  useEffect(() => {
    loadData()
  }, [])

  const loadData = async () => {
    try {
      const mockFacade = developmentTools.getMockFacade?.()
      if (!mockFacade) {
        setIsDevMode(false)
        return
      }

      const availableScenarios = mockFacade.getAvailableScenarios()
      const currentStats = await mockFacade.getMockStats()
      const devModeStatus = mockFacade.isEnabled()

      setScenarios(availableScenarios)
      setCurrentScenario(currentStats.currentScenario)
      setStats(currentStats)
      setIsDevMode(devModeStatus)
    } catch (error) {
      // console.error('Failed to load mock service data:', error)
      setIsDevMode(false)
    }
  }

  const handleScenarioChange = async (scenarioName: string) => {
    try {
      const mockFacade = developmentTools.getMockFacade?.()
      if (!mockFacade) return

      mockFacade.switchScenario(scenarioName)
      setCurrentScenario(scenarioName)
      await loadData()
    } catch (error) {
      // console.error('Failed to switch scenario:', error)
    }
  }

  const runValidationTest = async () => {
    try {
      const mockFacade = developmentTools.getMockFacade?.()
      if (!mockFacade) {
        setTestResults({ error: 'Mock services not available' })
        return
      }

      const validation = await mockFacade.validateServices()
      setTestResults(validation)
    } catch (error) {
      // console.error('Validation test failed:', error)
      setTestResults({ error: (error as Error).message })
    }
  }

  const exportMockData = async () => {
    try {
      const mockFacade = developmentTools.getMockFacade?.()
      if (!mockFacade) return

      const exportData = await mockFacade.exportMockData()
      const blob = new Blob([JSON.stringify(exportData, null, 2)], {
        type: 'application/json',
      })
      const url = URL.createObjectURL(blob)
      const a = document.createElement('a')
      a.href = url
      a.download = `mock-data-${exportData.scenario || 'unknown'}-${Date.now()}.json`
      document.body.appendChild(a)
      a.click()
      document.body.removeChild(a)
      URL.revokeObjectURL(url)
    } catch (error) {
      // console.error('Failed to export mock data:', error)
    }
  }

  if (!isDevMode) {
    return (
      <div className="p-4 bg-yellow-50 border border-yellow-200 rounded-lg">
        <h3 className="text-lg font-semibold text-yellow-800 mb-2">Mock Services Demo</h3>
        <p className="text-yellow-700">
          Mock services are only available in development mode. This component is hidden in
          production.
        </p>
      </div>
    )
  }

  return (
    <div className="p-6 bg-white border border-gray-200 rounded-lg shadow-sm">
      <h2 className="text-2xl font-bold text-gray-900 mb-6">Mock Services Demo</h2>

      {/* Current Status */}
      <div className="mb-6 p-4 bg-blue-50 border border-blue-200 rounded-lg">
        <h3 className="text-lg font-semibold text-blue-800 mb-2">Current Status</h3>
        <div className="grid grid-cols-2 gap-4 text-sm">
          <div>
            <span className="font-medium">Scenario:</span> {currentScenario}
          </div>
          <div>
            <span className="font-medium">Dev Mode:</span>
            <span
              className={`ml-1 px-2 py-1 rounded text-xs ${
                isDevMode ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'
              }`}
            >
              {isDevMode ? 'Enabled' : 'Disabled'}
            </span>
          </div>
        </div>
      </div>

      {/* Scenario Switcher */}
      <div className="mb-6">
        <h3 className="text-lg font-semibold text-gray-800 mb-3">Switch Scenario</h3>
        <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
          {scenarios.map(scenario => (
            <button
              key={scenario.name}
              onClick={() => handleScenarioChange(scenario.name)}
              className={`p-3 text-left border rounded-lg transition-colors ${
                currentScenario === scenario.name
                  ? 'bg-blue-100 border-blue-300 text-blue-800'
                  : 'bg-gray-50 border-gray-200 text-gray-700 hover:bg-gray-100'
              }`}
            >
              <div className="font-medium">{scenario.name}</div>
              <div className="text-xs text-gray-600 mt-1">{scenario.description}</div>
            </button>
          ))}
        </div>
      </div>

      {/* Actions */}
      <div className="mb-6">
        <h3 className="text-lg font-semibold text-gray-800 mb-3">Actions</h3>
        <div className="flex flex-wrap gap-3">
          <button
            onClick={runValidationTest}
            className="px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors"
          >
            Validate Services
          </button>
          <button
            onClick={exportMockData}
            className="px-4 py-2 bg-purple-600 text-white rounded-lg hover:bg-purple-700 transition-colors"
          >
            Export Data
          </button>
          <button
            onClick={loadData}
            className="px-4 py-2 bg-gray-600 text-white rounded-lg hover:bg-gray-700 transition-colors"
          >
            Refresh Stats
          </button>
        </div>
      </div>

      {/* Test Results */}
      {testResults && (
        <div className="mb-6">
          <h3 className="text-lg font-semibold text-gray-800 mb-3">Validation Results</h3>
          <div className="p-4 bg-gray-50 border border-gray-200 rounded-lg">
            <pre className="text-sm text-gray-700 whitespace-pre-wrap">
              {JSON.stringify(testResults, null, 2)}
            </pre>
          </div>
        </div>
      )}

      {/* Statistics */}
      {stats && (
        <div>
          <h3 className="text-lg font-semibold text-gray-800 mb-3">Service Statistics</h3>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="p-4 bg-gray-50 border border-gray-200 rounded-lg">
              <h4 className="font-medium text-gray-800 mb-2">IPC Service</h4>
              <div className="text-sm text-gray-600">
                <div>Available Scenarios: {stats.ipcScenarios?.length || 0}</div>
                <div>Current: {currentScenario}</div>
              </div>
            </div>
            <div className="p-4 bg-gray-50 border border-gray-200 rounded-lg">
              <h4 className="font-medium text-gray-800 mb-2">OpenAI Service</h4>
              <div className="text-sm text-gray-600">
                <div>Model: {stats.openaiConfig?.model || 'N/A'}</div>
                <div>Response Delay: {stats.openaiConfig?.responseDelay || 0}ms</div>
                <div>Error Rate: {((stats.openaiConfig?.errorRate || 0) * 100).toFixed(1)}%</div>
              </div>
            </div>
            <div className="p-4 bg-gray-50 border border-gray-200 rounded-lg">
              <h4 className="font-medium text-gray-800 mb-2">Database Service</h4>
              <div className="text-sm text-gray-600">
                <div>Available Scenarios: {stats.databaseScenarios?.length || 0}</div>
                <div>Total Projects: {stats.databaseStats?.totalProjects || 0}</div>
                <div>Total Messages: {stats.databaseStats?.totalMessages || 0}</div>
              </div>
            </div>
            <div className="p-4 bg-gray-50 border border-gray-200 rounded-lg">
              <h4 className="font-medium text-gray-800 mb-2">System Info</h4>
              <div className="text-sm text-gray-600">
                <div>Database Size: {stats.databaseStats?.databaseSize || 'N/A'}</div>
                <div>Table Count: {stats.databaseStats?.tableCount || 0}</div>
                <div>Index Count: {stats.databaseStats?.indexCount || 0}</div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Debug Info */}
      <div className="mt-6 p-4 bg-yellow-50 border border-yellow-200 rounded-lg">
        <h4 className="font-medium text-yellow-800 mb-2">Debug Information</h4>
        <div className="text-sm text-yellow-700">
          <p>Use browser console commands for advanced debugging:</p>
          <ul className="list-disc list-inside mt-2 space-y-1">
            <li>
              <code>window.mockDebug.switchScenario(&lsquo;scenario-name&rsquo;)</code>
            </li>
            <li>
              <code>window.mockDebug.getStats()</code>
            </li>
            <li>
              <code>window.mockDebug.validateServices()</code>
            </li>
            <li>
              <code>window.mockDebug.toggleMocks()</code>
            </li>
          </ul>
          <p className="mt-2">
            Keyboard shortcuts: Ctrl+Shift+Alt+1/2/3 to switch scenarios, Ctrl+Shift+Alt+0 to toggle
          </p>
        </div>
      </div>
    </div>
  )
}

export default MockServiceDemo
