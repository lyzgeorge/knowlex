import { promises as fs } from 'fs'
import path from 'path'
import os from 'os'
import {
  processTemporaryFiles,
  extractTextContent,
  validateTemporaryFileConstraints
} from '../file-temp'
import { expect } from 'vitest'
import { expect } from 'vitest'
import { test } from 'vitest'
import { expect } from 'vitest'
import { expect } from 'vitest'
import { test } from 'vitest'
import { expect } from 'vitest'
import { expect } from 'vitest'
import { test } from 'vitest'
import { expect } from 'vitest'
import { expect } from 'vitest'
import { test } from 'vitest'
import { expect } from 'vitest'
import { expect } from 'vitest'
import { test } from 'vitest'
import { expect } from 'vitest'
import { expect } from 'vitest'
import { test } from 'vitest'
import { describe } from 'vitest'
import { expect } from 'vitest'
import { test } from 'vitest'
import { expect } from 'vitest'
import { test } from 'vitest'
import { expect } from 'vitest'
import { test } from 'vitest'
import { expect } from 'vitest'
import { test } from 'vitest'
import { describe } from 'vitest'
import { expect } from 'vitest'
import { expect } from 'vitest'
import { expect } from 'vitest'
import { test } from 'vitest'
import { expect } from 'vitest'
import { expect } from 'vitest'
import { expect } from 'vitest'
import { expect } from 'vitest'
import { test } from 'vitest'
import { expect } from 'vitest'
import { expect } from 'vitest'
import { expect } from 'vitest'
import { expect } from 'vitest'
import { test } from 'vitest'
import { expect } from 'vitest'
import { expect } from 'vitest'
import { expect } from 'vitest'
import { expect } from 'vitest'
import { expect } from 'vitest'
import { expect } from 'vitest'
import { expect } from 'vitest'
import { expect } from 'vitest'
import { expect } from 'vitest'
import { test } from 'vitest'
import { describe } from 'vitest'
import { afterAll } from 'vitest'
import { beforeAll } from 'vitest'
import { describe } from 'vitest'

describe('Temporary File Processing', () => {
  let tempDir: string
  const testFiles: string[] = []

  beforeAll(async () => {
    tempDir = await fs.mkdtemp(path.join(os.tmpdir(), 'knowlex-test-'))
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

  describe('processTemporaryFiles', () => {
    test('processes valid text files successfully', async () => {
      const txtFile = await createTestFile('test.txt', 'Hello, world!')
      const mdFile = await createTestFile('test.md', '# Markdown\nContent here')

      const results = await processTemporaryFiles([txtFile, mdFile])

      expect(results).toHaveLength(2)

      // Check text file result
      expect(results[0].filename).toBe('test.txt')
      expect(results[0].content).toBe('Hello, world!')
      expect(results[0].mimeType).toBe('text/plain')
      expect(results[0].error).toBeUndefined()

      // Check markdown file result
      expect(results[1].filename).toBe('test.md')
      expect(results[1].content).toBe('# Markdown\nContent here')
      expect(results[1].mimeType).toBe('text/markdown')
      expect(results[1].error).toBeUndefined()
    })

    test('handles non-existent files gracefully', async () => {
      const nonExistentFile = path.join(tempDir, 'does-not-exist.txt')

      const results = await processTemporaryFiles([nonExistentFile])

      expect(results).toHaveLength(1)
      expect(results[0].filename).toBe('does-not-exist.txt')
      expect(results[0].content).toBe('')
      expect(results[0].error).toContain('Failed to read file')
    })

    test('rejects unsupported file types', async () => {
      const pdfFile = await createTestFile('test.pdf', 'fake pdf content')

      const results = await processTemporaryFiles([pdfFile])

      expect(results).toHaveLength(1)
      expect(results[0].filename).toBe('test.pdf')
      expect(results[0].content).toBe('')
      expect(results[0].error).toContain('Unsupported file type')
    })

    test('handles mixed success and failure', async () => {
      const validFile = await createTestFile('valid.txt', 'Valid content')
      const invalidFile = await createTestFile('invalid.pdf', 'Invalid content')

      const results = await processTemporaryFiles([validFile, invalidFile])

      expect(results).toHaveLength(2)

      // Find results by filename since order might vary
      const validResult = results.find((r) => r.filename === 'valid.txt')
      const invalidResult = results.find((r) => r.filename === 'invalid.pdf')

      expect(validResult?.error).toBeUndefined()
      expect(invalidResult?.error).toBeTruthy()
    })
  })

  describe('extractTextContent', () => {
    test('extracts content from text files', async () => {
      const filePath = await createTestFile('extract-test.txt', 'Test content for extraction')

      const content = await extractTextContent(filePath, 'extract-test.txt')

      expect(content).toBe('Test content for extraction')
    })

    test('extracts content from markdown files', async () => {
      const markdownContent = '# Title\n\nSome **bold** text'
      const filePath = await createTestFile('extract-test.md', markdownContent)

      const content = await extractTextContent(filePath, 'extract-test.md')

      expect(content).toBe(markdownContent)
    })

    test('throws error for unsupported file types', async () => {
      const filePath = await createTestFile('unsupported.pdf', 'fake content')

      await expect(extractTextContent(filePath, 'unsupported.pdf')).rejects.toThrow(
        'Unsupported file type'
      )
    })

    test('handles empty files', async () => {
      const filePath = await createTestFile('empty.txt', '')

      const content = await extractTextContent(filePath, 'empty.txt')

      expect(content).toBe('')
    })
  })

  describe('validateTemporaryFileConstraints', () => {
    test('validates file count limit', () => {
      const files = Array.from({ length: 11 }, (_, i) => ({
        name: `file${i}.txt`,
        size: 1000
      }))

      const result = validateTemporaryFileConstraints(files)

      expect(result.valid).toBe(false)
      expect(result.errors).toContain('Too many files. Maximum 10 files allowed.')
    })

    test('validates individual file size limit', () => {
      const files = [
        {
          name: 'large-file.txt',
          size: 2 * 1024 * 1024 // 2MB
        }
      ]

      const result = validateTemporaryFileConstraints(files)

      expect(result.valid).toBe(false)
      expect(result.errors[0]).toContain('File too large')
    })

    test('validates total size limit', () => {
      const files = Array.from({ length: 10 }, (_, i) => ({
        name: `file${i}.txt`,
        size: 1.5 * 1024 * 1024 // 1.5MB each = 15MB total
      }))

      const result = validateTemporaryFileConstraints(files)

      expect(result.valid).toBe(false)
      expect(result.errors[0]).toContain('Total file size too large')
    })

    test('validates file types', () => {
      const files = [
        { name: 'valid.txt', size: 1000 },
        { name: 'invalid.pdf', size: 1000 }
      ]

      const result = validateTemporaryFileConstraints(files)

      expect(result.valid).toBe(false)
      expect(result.errors[0]).toContain('Unsupported file type')
    })

    test('validates empty files', () => {
      const files = [{ name: 'empty.txt', size: 0 }]

      const result = validateTemporaryFileConstraints(files)

      expect(result.valid).toBe(false)
      expect(result.errors[0]).toContain('File is empty')
    })

    test('passes validation for valid files', () => {
      const files = [
        { name: 'file1.txt', size: 500000 },
        { name: 'file2.md', size: 300000 }
      ]

      const result = validateTemporaryFileConstraints(files)

      expect(result.valid).toBe(true)
      expect(result.errors).toHaveLength(0)
    })
  })
})
