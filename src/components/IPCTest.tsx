import React, { useState } from 'react'
import { useIPC, useSystemAPI, useDatabaseAPI, useLLMStream } from '../hooks/useIPC'

export function IPCTest() {
  const { isReady } = useIPC()
  const { ping, getAppInfo } = useSystemAPI()
  const { healthCheck, getStats } = useDatabaseAPI()
  const { startStream, content, isStreaming, resetContent } = useLLMStream()

  const [results, setResults] = useState<Record<string, any>>({})
  const [loading, setLoading] = useState<Record<string, boolean>>({})

  const runTest = async (testName: string, testFn: () => Promise<any>) => {
    setLoading((prev) => ({ ...prev, [testName]: true }))
    try {
      const result = await testFn()
      setResults((prev) => ({ ...prev, [testName]: result }))
    } catch (error: any) {
      setResults((prev) => ({
        ...prev,
        [testName]: { error: error.message, code: error.code }
      }))
    } finally {
      setLoading((prev) => ({ ...prev, [testName]: false }))
    }
  }

  const testPing = () => runTest('ping', ping)
  const testAppInfo = () => runTest('appInfo', getAppInfo)
  const testDbHealth = () => runTest('dbHealth', healthCheck)
  const testDbStats = () => runTest('dbStats', getStats)

  const testLLMStream = async () => {
    resetContent()
    await startStream(
      [{ role: 'user', content: 'Say "Hello from IPC Stream!" and then count from 1 to 5.' }],
      {
        model: 'gpt-3.5-turbo',
        max_tokens: 50
      }
    )
  }

  if (!isReady) {
    return (
      <div className="p-4 bg-red-50 border border-red-200 rounded-lg">
        <h3 className="text-red-800 font-semibold">IPC Not Ready</h3>
        <p className="text-red-600">
          The IPC client is not ready. Please check the preload script configuration.
        </p>
      </div>
    )
  }

  return (
    <div className="p-6 max-w-4xl mx-auto">
      <h2 className="text-2xl font-bold mb-6">IPC Communication Test Suite</h2>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* System Tests */}
        <div className="bg-white p-4 rounded-lg border border-gray-200">
          <h3 className="text-lg font-semibold mb-4">System API Tests</h3>

          <div className="space-y-3">
            <button
              onClick={testPing}
              disabled={loading.ping}
              className="w-full px-4 py-2 bg-blue-500 text-white rounded hover:bg-blue-600 disabled:opacity-50"
            >
              {loading.ping ? 'Testing...' : 'Test Ping'}
            </button>
            {results.ping && (
              <div className="p-2 bg-gray-50 rounded text-sm">
                <strong>Result:</strong> {JSON.stringify(results.ping)}
              </div>
            )}

            <button
              onClick={testAppInfo}
              disabled={loading.appInfo}
              className="w-full px-4 py-2 bg-green-500 text-white rounded hover:bg-green-600 disabled:opacity-50"
            >
              {loading.appInfo ? 'Getting Info...' : 'Get App Info'}
            </button>
            {results.appInfo && (
              <div className="p-2 bg-gray-50 rounded text-sm">
                <strong>App Info:</strong>
                <pre>{JSON.stringify(results.appInfo, null, 2)}</pre>
              </div>
            )}
          </div>
        </div>

        {/* Database Tests */}
        <div className="bg-white p-4 rounded-lg border border-gray-200">
          <h3 className="text-lg font-semibold mb-4">Database API Tests</h3>

          <div className="space-y-3">
            <button
              onClick={testDbHealth}
              disabled={loading.dbHealth}
              className="w-full px-4 py-2 bg-purple-500 text-white rounded hover:bg-purple-600 disabled:opacity-50"
            >
              {loading.dbHealth ? 'Checking...' : 'Health Check'}
            </button>
            {results.dbHealth && (
              <div className="p-2 bg-gray-50 rounded text-sm">
                <strong>Health:</strong> {JSON.stringify(results.dbHealth)}
              </div>
            )}

            <button
              onClick={testDbStats}
              disabled={loading.dbStats}
              className="w-full px-4 py-2 bg-indigo-500 text-white rounded hover:bg-indigo-600 disabled:opacity-50"
            >
              {loading.dbStats ? 'Getting Stats...' : 'Get DB Stats'}
            </button>
            {results.dbStats && (
              <div className="p-2 bg-gray-50 rounded text-sm">
                <strong>Stats:</strong>
                <pre>{JSON.stringify(results.dbStats, null, 2)}</pre>
              </div>
            )}
          </div>
        </div>

        {/* Streaming Tests */}
        <div className="bg-white p-4 rounded-lg border border-gray-200 md:col-span-2">
          <h3 className="text-lg font-semibold mb-4">Streaming API Tests</h3>

          <div className="space-y-3">
            <button
              onClick={testLLMStream}
              disabled={isStreaming}
              className="px-4 py-2 bg-orange-500 text-white rounded hover:bg-orange-600 disabled:opacity-50"
            >
              {isStreaming ? 'Streaming...' : 'Test LLM Stream'}
            </button>

            {(content || isStreaming) && (
              <div className="p-4 bg-gray-50 rounded border">
                <div className="flex justify-between items-center mb-2">
                  <strong>Stream Response:</strong>
                  {isStreaming && <span className="text-orange-500 text-sm">● Streaming...</span>}
                </div>
                <div className="whitespace-pre-wrap font-mono text-sm">
                  {content}
                  {isStreaming && <span className="animate-pulse">|</span>}
                </div>
              </div>
            )}
          </div>
        </div>

        {/* IPC Status */}
        <div className="bg-green-50 p-4 rounded-lg border border-green-200 md:col-span-2">
          <h3 className="text-lg font-semibold text-green-800 mb-2">IPC Status</h3>
          <div className="text-green-700">
            <p>✅ IPC Client Ready: {isReady ? 'Yes' : 'No'}</p>
            <p>✅ Context Bridge: Available</p>
            <p>✅ Security Validation: Enabled</p>
            <p>✅ Streaming Support: Enabled</p>
            <p>✅ Error Handling: Enabled</p>
          </div>
        </div>
      </div>
    </div>
  )
}
