/**
 * IPC Test Component
 *
 * A development-only component for testing the IPC communication framework.
 * This component will be removed in production builds.
 */

import React, { useState, useEffect } from 'react'
import { ipcService, StreamController } from '../services/ipc.service'
import { IPC_CHANNELS, StreamChunk } from '../types/ipc.types'

export const IPCTest: React.FC = () => {
  const [results, setResults] = useState<string[]>([])
  const [isLoading, setIsLoading] = useState(false)
  const [streamController, setStreamController] = useState<StreamController | null>(null)
  const [streamOutput, setStreamOutput] = useState<string>('')

  const addResult = (message: string) => {
    setResults(prev => [...prev, `${new Date().toLocaleTimeString()}: ${message}`])
  }

  const clearResults = () => {
    setResults([])
    setStreamOutput('')
  }

  // Test basic IPC request
  const testEcho = async () => {
    setIsLoading(true)
    try {
      const result = await ipcService.request(IPC_CHANNELS.TEST_ECHO, {
        message: 'Hello from renderer!',
        timestamp: Date.now(),
      })
      addResult(`Echo test successful: ${JSON.stringify(result)}`)
    } catch (error) {
      addResult(`Echo test failed: ${error}`)
    } finally {
      setIsLoading(false)
    }
  }

  // Test ping/pong
  const testPing = async () => {
    setIsLoading(true)
    try {
      const result = await ipcService.request(IPC_CHANNELS.TEST_PING, {
        timestamp: Date.now(),
      })
      addResult(`Ping test successful: ${JSON.stringify(result)}`)
    } catch (error) {
      addResult(`Ping test failed: ${error}`)
    } finally {
      setIsLoading(false)
    }
  }

  // Test error handling
  const testError = async (errorType: string) => {
    setIsLoading(true)
    try {
      await ipcService.request(IPC_CHANNELS.TEST_ERROR, { errorType })
      addResult('Error test unexpectedly succeeded')
    } catch (error) {
      addResult(`Error test correctly failed: ${error}`)
    } finally {
      setIsLoading(false)
    }
  }

  // Test validation
  const testValidation = async (valid: boolean) => {
    setIsLoading(true)
    try {
      const data = valid ? { testField: 'valid-value' } : { invalidField: 'missing-required-field' }

      const result = await ipcService.request(IPC_CHANNELS.TEST_VALIDATION, data)
      addResult(`Validation test result: ${JSON.stringify(result)}`)
    } catch (error) {
      addResult(`Validation test error: ${error}`)
    } finally {
      setIsLoading(false)
    }
  }

  // Test streaming
  const testStream = () => {
    if (streamController) {
      streamController.stop()
      setStreamController(null)
      addResult('Stream stopped')
      return
    }

    setStreamOutput('')
    addResult('Starting stream test...')

    const controller = ipcService.startStream(
      IPC_CHANNELS.TEST_STREAM,
      { count: 5, delay: 500 },
      (chunk: StreamChunk) => {
        setStreamOutput(prev => prev + chunk.data)
        if (chunk.isLast) {
          addResult('Stream completed')
          setStreamController(null)
        }
      },
      (error: Error) => {
        addResult(`Stream error: ${error.message}`)
        setStreamController(null)
      },
      () => {
        addResult('Stream ended')
        setStreamController(null)
      }
    )

    setStreamController(controller)
  }

  // Test system info
  const testSystemInfo = async () => {
    setIsLoading(true)
    try {
      const result = await ipcService.request(IPC_CHANNELS.SYSTEM_GET_INFO, {})
      addResult(`System info: ${JSON.stringify(result, null, 2)}`)
    } catch (error) {
      addResult(`System info failed: ${error}`)
    } finally {
      setIsLoading(false)
    }
  }

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      if (streamController) {
        streamController.stop()
      }
    }
  }, [streamController])

  if (process.env.NODE_ENV === 'production') {
    return null // Don't render in production
  }

  return (
    <div
      style={{
        padding: '20px',
        border: '2px solid #ccc',
        margin: '20px',
        borderRadius: '8px',
        backgroundColor: '#f9f9f9',
      }}
    >
      <h2>IPC Framework Test</h2>

      <div style={{ marginBottom: '20px' }}>
        <button onClick={testEcho} disabled={isLoading}>
          Test Echo
        </button>
        <button onClick={testPing} disabled={isLoading} style={{ marginLeft: '10px' }}>
          Test Ping
        </button>
        <button onClick={testSystemInfo} disabled={isLoading} style={{ marginLeft: '10px' }}>
          Test System Info
        </button>
      </div>

      <div style={{ marginBottom: '20px' }}>
        <button onClick={() => testError('generic')} disabled={isLoading}>
          Test Generic Error
        </button>
        <button
          onClick={() => testError('validation')}
          disabled={isLoading}
          style={{ marginLeft: '10px' }}
        >
          Test Validation Error
        </button>
        <button
          onClick={() => testError('network')}
          disabled={isLoading}
          style={{ marginLeft: '10px' }}
        >
          Test Network Error
        </button>
      </div>

      <div style={{ marginBottom: '20px' }}>
        <button onClick={() => testValidation(true)} disabled={isLoading}>
          Test Valid Data
        </button>
        <button
          onClick={() => testValidation(false)}
          disabled={isLoading}
          style={{ marginLeft: '10px' }}
        >
          Test Invalid Data
        </button>
      </div>

      <div style={{ marginBottom: '20px' }}>
        <button onClick={testStream} disabled={isLoading}>
          {streamController ? 'Stop Stream' : 'Test Stream'}
        </button>
        {streamController && (
          <>
            <button onClick={() => streamController.pause()} style={{ marginLeft: '10px' }}>
              Pause Stream
            </button>
            <button onClick={() => streamController.resume()} style={{ marginLeft: '10px' }}>
              Resume Stream
            </button>
          </>
        )}
      </div>

      <div style={{ marginBottom: '20px' }}>
        <button onClick={clearResults}>Clear Results</button>
      </div>

      {streamOutput && (
        <div style={{ marginBottom: '20px' }}>
          <h3>Stream Output:</h3>
          <pre
            style={{
              backgroundColor: '#000',
              color: '#0f0',
              padding: '10px',
              borderRadius: '4px',
              fontSize: '12px',
              maxHeight: '200px',
              overflow: 'auto',
            }}
          >
            {streamOutput}
          </pre>
        </div>
      )}

      <div>
        <h3>Test Results:</h3>
        <div
          style={{
            maxHeight: '300px',
            overflow: 'auto',
            backgroundColor: '#fff',
            padding: '10px',
            border: '1px solid #ddd',
            borderRadius: '4px',
          }}
        >
          {results.map((result, index) => (
            <div
              key={index}
              style={{
                marginBottom: '5px',
                fontSize: '12px',
                fontFamily: 'monospace',
              }}
            >
              {result}
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}

export default IPCTest
