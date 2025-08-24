import { describe, test, expect, beforeAll, afterAll, vi } from 'vitest'
import { promises as fs } from 'fs'
import path from 'path'
import os from 'os'
import { registerFileIPCHandlers, unregisterFileIPCHandlers } from '@main/ipc/file'
import { ipcMain } from 'electron'

// Mock electron
vi.mock('electron', () => ({
  ipcMain: {
    handle: vi.fn(),
    removeAllListeners: vi.fn()
  },
  BrowserWindow: {
    getAllWindows: vi.fn(() => [])
  }
}))

describe('File IPC Handler', () => {
  let tempDir: string
  const testFiles: string[] = []

  beforeAll(async () => {
    tempDir = await fs.mkdtemp(path.join(os.tmpdir(), 'knowlex-ipc-test-'))
  })

  afterAll(async () => {
    // Clean up test files
    for (const file of testFiles) {
      try {
        await fs.unlink(file)
      } catch (error) {
        // Ignore cleanup errors
      }
    }

    try {
      await fs.rmdir(tempDir)
    } catch (error) {
      // Ignore cleanup errors
    }
  })

  async function createTestFile(filename: string, content: string): Promise<string> {
    const filePath = path.join(tempDir, filename)
    await fs.writeFile(filePath, content, 'utf8')
    testFiles.push(filePath)
    return filePath
  }

  test('registers IPC handlers correctly', () => {
    registerFileIPCHandlers()

    expect(ipcMain.handle).toHaveBeenCalledWith('file:process-temp', expect.any(Function))
  })

  test('unregisters IPC handlers correctly', () => {
    unregisterFileIPCHandlers()

    expect(ipcMain.removeAllListeners).toHaveBeenCalledWith('file:process-temp')
  })

  test('handles valid temporary file processing request', async () => {
    const txtFile = await createTestFile('test.txt', 'Hello, world!')
    const mdFile = await createTestFile('test.md', '# Markdown\nContent here')

    // Get the handler function that was registered
    const handleCall = (ipcMain.handle as any).mock.calls.find(
      (call: any) => call[0] === 'file:process-temp'
    )?.[1]

    expect(handleCall).toBeDefined()

    const request = {
      files: [
        { name: 'test.txt', path: txtFile, size: 13 },
        { name: 'test.md', path: mdFile, size: 22 }
      ]
    }

    const result = await handleCall(null, request)

    expect(result.success).toBe(true)
    expect(result.data).toHaveLength(2)
    expect(result.data[0].filename).toBe('test.txt')
    expect(result.data[0].content).toBe('Hello, world!')
    expect(result.data[1].filename).toBe('test.md')
    expect(result.data[1].content).toBe('# Markdown\nContent here')
  })

  test('handles invalid request data', async () => {
    // Get the handler function that was registered
    const handleCall = (ipcMain.handle as any).mock.calls.find(
      (call: any) => call[0] === 'file:process-temp'
    )?.[1]

    expect(handleCall).toBeDefined()

    // Test with invalid request
    const result = await handleCall(null, { invalid: 'data' })

    expect(result.success).toBe(false)
    expect(result.error).toContain('Invalid temporary file processing request')
  })

  test('handles file processing errors', async () => {
    // Get the handler function that was registered
    const handleCall = (ipcMain.handle as any).mock.calls.find(
      (call: any) => call[0] === 'file:process-temp'
    )?.[1]

    expect(handleCall).toBeDefined()

    const request = {
      files: [{ name: 'nonexistent.txt', path: '/nonexistent/file.txt', size: 100 }]
    }

    const result = await handleCall(null, request)

    expect(result.success).toBe(true)
    expect(result.data).toHaveLength(1)
    expect(result.data[0].error).toBeTruthy()
  })
})
