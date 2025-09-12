import { promises as fs } from 'fs'
import path from 'path'
import os from 'os'
import { TemporaryFileResult } from '@shared/types/file'
import {
  isValidFileType,
  getMimeTypeFromExtension,
  formatBytes,
  isImageFile,
  validateFileConstraints
} from '@shared/utils/validation'
import { SUPPORTED_FILE_TYPES, FILE_CONSTRAINTS } from '@shared/constants/file'
import { parseFile, FileParserFactory } from './file-parser'
import { processingErrorMessage, criticalErrorMessage } from '@main/utils/error'

/**
 * Temporary File Processing Service
 *
 * Handles temporary file uploads for unclassified chat mode.
 * Files are processed immediately and content is extracted for conversation context.
 * No persistent storage - files are cleaned up after processing.
 */

// Internal file data structure for unified processing
interface ProcessableFile {
  filename: string
  size: number
  content?: string // For content-based processing
  filePath?: string // For path-based processing
}

/**
 * Process temporary files from content data (for browser File API)
 * @param files Array of file data with content
 * @returns Array of processing results with content or errors
 */
export async function processTemporaryFileContents(
  files: Array<{ name: string; content: string; size: number }>
): Promise<TemporaryFileResult[]> {
  console.log('[MAIN] processTemporaryFileContents called with', files.length, 'files')
  const processableFiles: ProcessableFile[] = files.map((f) => ({
    filename: f.name,
    size: f.size,
    content: f.content
  }))
  return _processTemporaryFilesUnified(processableFiles)
}

/**
 * Process temporary files for immediate use in conversations
 * @param filePaths Array of file paths to process
 * @returns Array of processing results with content or errors
 */
export async function processTemporaryFiles(filePaths: string[]): Promise<TemporaryFileResult[]> {
  // Collect file stats first
  const fileStats = await Promise.all(
    filePaths.map(async (filePath) => {
      try {
        const stats = await fs.stat(filePath)
        const filename = path.basename(filePath)
        return {
          filename,
          size: stats.size,
          filePath
        }
      } catch (error) {
        return {
          filename: path.basename(filePath),
          size: 0,
          filePath,
          error: `Failed to read file: ${error instanceof Error ? error.message : 'Unknown error'}`
        }
      }
    })
  )

  // Check for file stat errors
  const fileStatErrors = fileStats.filter((stat) => 'error' in stat)
  if (fileStatErrors.length > 0) {
    return fileStatErrors.map((stat) => ({
      filename: stat.filename,
      content: '',
      size: 0,
      mimeType: '',
      error: (stat as any).error
    }))
  }

  const processableFiles: ProcessableFile[] = fileStats.map((stat) => ({
    filename: stat.filename,
    size: stat.size,
    filePath: stat.filePath
  }))

  return _processTemporaryFilesUnified(processableFiles)
}

/**
 * Extract text content from a file using the file parser system
 * @param filePath Path to the file
 * @param filename Original filename for type detection
 * @returns Extracted text content
 */
export async function extractFileTextContent(filePath: string, filename: string): Promise<string> {
  try {
    const result = await parseFile(filePath, filename)
    return result.content
  } catch (error) {
    throw new Error(`Failed to extract content from ${filename}: ${processingErrorMessage(error)}`)
  }
}

/**
 * Clean up temporary files (utility function for future use)
 * @param filePaths Array of file paths to clean up
 */
export async function cleanupTemporaryFiles(filePaths: string[]): Promise<void> {
  const cleanupPromises = filePaths.map(async (filePath) => {
    try {
      await fs.unlink(filePath)
    } catch (error) {
      console.warn(`Failed to cleanup temporary file ${filePath}:`, error)
    }
  })

  await Promise.all(cleanupPromises)
}

// -----------------------------
// Unified processing system
// -----------------------------

/**
 * Unified processing for both file paths and content
 */
async function _processTemporaryFilesUnified(
  files: ProcessableFile[]
): Promise<TemporaryFileResult[]> {
  try {
    // Validate file constraints first
    validateFileConstraints(files.map((f) => ({ name: f.filename, size: f.size })))

    const results: TemporaryFileResult[] = []
    for (const file of files) {
      try {
        const result = await _processSingleFile(file)
        results.push(result)
      } catch (error) {
        console.error('[MAIN] File processing error for', file.filename, ':', error)
        results.push({
          filename: file.filename,
          content: '',
          size: file.size,
          mimeType: '',
          error: processingErrorMessage(error)
        })
      }
    }

    console.log('[MAIN] Successfully processed', results.length, 'files')
    return results
  } catch (error) {
    console.error('[MAIN] Critical error in processing:', error)
    return files.map((file) => ({
      filename: file.filename,
      content: '',
      size: file.size,
      mimeType: '',
      error: criticalErrorMessage(error)
    }))
  }
}

/**
 * Process a single file (unified for both path and content based)
 */
async function _processSingleFile(file: ProcessableFile): Promise<TemporaryFileResult> {
  // Shared validation
  if (!isValidFileType(file.filename)) {
    return {
      filename: file.filename,
      content: '',
      size: file.size,
      mimeType: '',
      error: `Unsupported file type. Only ${SUPPORTED_FILE_TYPES.join(', ')} files are supported.`
    }
  }

  if (file.size > FILE_CONSTRAINTS.maxFileSize) {
    return {
      filename: file.filename,
      content: '',
      size: file.size,
      mimeType: '',
      error: `File too large. Maximum size is ${formatBytes(FILE_CONSTRAINTS.maxFileSize)}.`
    }
  }

  const mimeType = getMimeTypeFromExtension(file.filename)

  try {
    if (isImageFile(file.filename)) {
      return _processImage(file, mimeType)
    }

    if (FileParserFactory.isBinary(file.filename)) {
      return _processBinaryFile(file)
    }

    return _processTextFile(file, mimeType)
  } catch (error) {
    return {
      filename: file.filename,
      content: '',
      size: file.size,
      mimeType,
      error: `Failed to process: ${error instanceof Error ? error.message : 'Unknown error'}`
    }
  }
}

/**
 * Process image files (unified for both path and content)
 */
async function _processImage(
  file: ProcessableFile,
  mimeType: string
): Promise<TemporaryFileResult> {
  console.log(`[MAIN] Processing image file: ${file.filename}`)

  let dataUrl: string
  if (file.content) {
    // Content-based: assume base64 or data URL
    dataUrl = file.content.startsWith('data:')
      ? file.content
      : `data:${mimeType};base64,${file.content}`
  } else if (file.filePath) {
    // Path-based: read and convert to data URL
    const imageBuffer = await fs.readFile(file.filePath)
    const base64Content = imageBuffer.toString('base64')
    dataUrl = `data:${mimeType};base64,${base64Content}`
  } else {
    throw new Error('No content or file path provided')
  }

  return {
    filename: file.filename,
    content: dataUrl,
    size: file.size,
    mimeType,
    error: undefined
  }
}

/**
 * Process binary files that need parsing (unified for both path and content)
 */
async function _processBinaryFile(file: ProcessableFile): Promise<TemporaryFileResult> {
  let parseResult

  if (file.filePath) {
    // Path-based: parse directly
    parseResult = await parseFile(file.filePath, file.filename)
  } else if (file.content) {
    // Content-based: create temp file and parse
    const tempDir = os.tmpdir()
    const tempFilePath = path.join(tempDir, `knowlex_temp_${Date.now()}_${file.filename}`)

    try {
      const buffer = Buffer.from(file.content, 'base64')
      await fs.writeFile(tempFilePath, buffer)
      parseResult = await parseFile(tempFilePath, file.filename)

      await fs
        .unlink(tempFilePath)
        .catch((err) => console.warn(`[MAIN] Failed to cleanup temp file ${tempFilePath}:`, err))
    } catch (error) {
      await fs.unlink(tempFilePath).catch(() => {})

      if (error instanceof Error) {
        if (error.message.includes('officeparser')) {
          throw new Error(
            `PDF/Office document parsing failed: ${error.message}. Please ensure the file is not corrupted.`
          )
        } else if (error.message.includes('base64')) {
          throw new Error(
            `File encoding error: ${error.message}. Please try re-uploading the file.`
          )
        }
      }
      throw error
    }
  } else {
    throw new Error('No content or file path provided')
  }

  if (!parseResult.content?.trim()) {
    return {
      filename: file.filename,
      content: '',
      size: file.size,
      mimeType: parseResult.mimeType,
      error: 'File appears to be empty or corrupted. No readable content could be extracted.'
    }
  }

  return {
    filename: file.filename,
    content: parseResult.content,
    size: file.size,
    mimeType: parseResult.mimeType,
    error: undefined
  }
}

/**
 * Process plain text files (unified for both path and content)
 */
async function _processTextFile(
  file: ProcessableFile,
  mimeType: string
): Promise<TemporaryFileResult> {
  let content: string

  if (file.filePath) {
    // Path-based: parse file
    const parseResult = await parseFile(file.filePath, file.filename)
    content = parseResult.content
  } else if (file.content) {
    // Content-based: use directly
    content = file.content.trim()
  } else {
    throw new Error('No content or file path provided')
  }

  if (!content) {
    return {
      filename: file.filename,
      content: '',
      size: file.size,
      mimeType,
      error: 'File appears to be empty. No readable content found.'
    }
  }

  return {
    filename: file.filename,
    content,
    size: file.size,
    mimeType,
    error: undefined
  }
}
