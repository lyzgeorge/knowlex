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

/**
 * Process temporary files for immediate use in conversations
 * @param filePaths Array of file paths to process
 * @returns Array of processing results with content or errors
 */
/**
 * Process temporary files from content data (for browser File API)
 * @param files Array of file data with content
 * @returns Array of processing results with content or errors
 */
export async function processTemporaryFileContents(
  files: Array<{ name: string; content: string; size: number }>
): Promise<TemporaryFileResult[]> {
  console.log('[MAIN] processTemporaryFileContents called with', files.length, 'files')
  const results: TemporaryFileResult[] = []

  try {
    // Validate file constraints first using shared validator
    validateFileConstraints(files.map((f) => ({ name: f.name, size: f.size })))

    // Process each file individually
    for (const file of files) {
      try {
        const result = await processSingleTemporaryFileContent(file.name, file.content, file.size)
        results.push(result)
      } catch (error) {
        console.error('[MAIN] File processing error for', file.name, ':', error)
        results.push({
          filename: file.name,
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
    console.error('[MAIN] Critical error in processTemporaryFileContents:', error)
    return files.map((file) => ({
      filename: file.name,
      content: '',
      size: file.size,
      mimeType: '',
      error: criticalErrorMessage(error)
    }))
  }
}

export async function processTemporaryFiles(filePaths: string[]): Promise<TemporaryFileResult[]> {
  const results: TemporaryFileResult[] = []

  // Validate file constraints first: collect stats then validate
  const fileStats = await Promise.all(
    filePaths.map(async (filePath) => {
      try {
        const stats = await fs.stat(filePath)
        const filename = path.basename(filePath)
        return {
          name: filename,
          size: stats.size,
          path: filePath
        }
      } catch (error) {
        return {
          name: path.basename(filePath),
          size: 0,
          path: filePath,
          error: `Failed to read file: ${error instanceof Error ? error.message : 'Unknown error'}`
        }
      }
    })
  )

  // Check for file stat errors
  const fileStatErrors = fileStats.filter((stat) => stat.error)
  if (fileStatErrors.length > 0) {
    return fileStatErrors.map((stat) => ({
      filename: stat.name,
      content: '',
      size: 0,
      mimeType: '',
      error: stat.error || undefined
    }))
  }

  // Run shared validation on collected files
  const validation = validateFileConstraints(fileStats.map((s) => ({ name: s.name, size: s.size })))
  if (!validation.valid) {
    return fileStats.map((s) => ({
      filename: s.name,
      content: '',
      size: s.size,
      mimeType: '',
      error: validation.errors.join('; ')
    }))
  }

  // Individual file validation will be handled during processing

  // Process each file individually
  for (const stat of fileStats) {
    if (stat.error) {
      results.push({
        filename: stat.name,
        content: '',
        size: 0,
        mimeType: '',
        error: stat.error
      })
      continue
    }

    try {
      const result = await _dispatchProcessFileByType(stat.path, stat.name, stat.size)
      results.push(result)
    } catch (error) {
      results.push({
        filename: stat.name,
        content: '',
        size: stat.size,
        mimeType: '',
        error: processingErrorMessage(error)
      })
    }
  }

  return results
}

// Note: single-file processing is handled by the internal dispatcher `_dispatchProcessFileByType`

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
 * Process a single temporary file from content
 * @param filename Original filename
 * @param content File content as string
 * @param size File size in bytes
 * @returns Processing result with content or error
 */
async function processSingleTemporaryFileContent(
  filename: string,
  content: string,
  size: number
): Promise<TemporaryFileResult> {
  // Dispatch to content-based processor for in-memory content
  return _dispatchProcessContentByType(filename, content, size)
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
// Internal processors & dispatcher
// -----------------------------

async function _dispatchProcessFileByType(
  filePath: string,
  filename: string,
  size: number
): Promise<TemporaryFileResult> {
  // Shared validation
  if (!isValidFileType(filename)) {
    return {
      filename,
      content: '',
      size,
      mimeType: '',
      error: `Unsupported file type. Only ${SUPPORTED_FILE_TYPES.join(', ')} files are supported.`
    }
  }

  if (size > FILE_CONSTRAINTS.maxFileSize) {
    return {
      filename,
      content: '',
      size,
      mimeType: '',
      error: `File too large. Maximum size is ${formatBytes(FILE_CONSTRAINTS.maxFileSize)}.`
    }
  }

  try {
    if (isImageFile(filename)) {
      return _processImageFileFromPath(filePath, filename, size)
    }

    const needsParsing = FileParserFactory.isBinary(filename)
    if (needsParsing) {
      return _processBinaryFileFromPath(filePath, filename, size)
    }

    return _processPlainTextFileFromPath(filePath, filename, size)
  } catch (error) {
    return {
      filename,
      content: '',
      size,
      mimeType: getMimeTypeFromExtension(filename),
      error: `Failed to extract content: ${error instanceof Error ? error.message : 'Unknown error'}`
    }
  }
}

async function _processImageFileFromPath(filePath: string, filename: string, size: number) {
  console.log(`[MAIN] Processing image file from path: ${filename}`)
  const imageBuffer = await fs.readFile(filePath)
  const base64Content = imageBuffer.toString('base64')
  const dataUrl = `data:${getMimeTypeFromExtension(filename)};base64,${base64Content}`

  return {
    filename,
    content: dataUrl,
    size,
    mimeType: getMimeTypeFromExtension(filename),
    error: undefined
  }
}

async function _processBinaryFileFromPath(filePath: string, filename: string, size: number) {
  const result = await parseFile(filePath, filename)
  return {
    filename,
    content: result.content,
    size,
    mimeType: result.mimeType,
    error: undefined
  }
}

async function _processPlainTextFileFromPath(filePath: string, filename: string, size: number) {
  const result = await parseFile(filePath, filename)
  return {
    filename,
    content: result.content,
    size,
    mimeType: result.mimeType,
    error: undefined
  }
}

async function _dispatchProcessContentByType(
  filename: string,
  content: string,
  size: number
): Promise<TemporaryFileResult> {
  // Shared validation
  if (!isValidFileType(filename)) {
    return {
      filename,
      content: '',
      size,
      mimeType: '',
      error: `Unsupported file type. Only ${SUPPORTED_FILE_TYPES.join(', ')} files are supported.`
    }
  }

  if (size > FILE_CONSTRAINTS.maxFileSize) {
    return {
      filename,
      content: '',
      size,
      mimeType: '',
      error: `File too large. Maximum size is ${formatBytes(FILE_CONSTRAINTS.maxFileSize)}.`
    }
  }

  try {
    const mimeType = getMimeTypeFromExtension(filename)

    if (isImageFile(filename)) {
      console.log(`[MAIN] Processing image file: ${filename}`)
      const dataUrl = content.startsWith('data:') ? content : `data:${mimeType};base64,${content}`
      return {
        filename,
        content: dataUrl,
        size,
        mimeType,
        error: undefined
      }
    }

    const needsParsing = FileParserFactory.isBinary(filename)
    if (needsParsing) {
      // Write to temp file and parse
      const tempDir = os.tmpdir()
      const tempFilePath = path.join(tempDir, `knowlex_temp_${Date.now()}_${filename}`)

      try {
        let buffer: Buffer
        try {
          buffer = Buffer.from(content, 'base64')
        } catch (bufferError) {
          throw new Error(
            `Failed to decode file content: ${bufferError instanceof Error ? bufferError.message : 'Unknown buffer error'}`
          )
        }

        await fs.writeFile(tempFilePath, buffer)

        const parseResult = await parseFile(tempFilePath, filename)

        await fs
          .unlink(tempFilePath)
          .catch((err) => console.warn(`[MAIN] Failed to cleanup temp file ${tempFilePath}:`, err))

        if (!parseResult.content || parseResult.content.trim().length === 0) {
          return {
            filename,
            content: '',
            size,
            mimeType: parseResult.mimeType,
            error: `File appears to be empty or corrupted. No readable content could be extracted.`
          }
        }

        return {
          filename,
          content: parseResult.content,
          size,
          mimeType: parseResult.mimeType,
          error: undefined
        }
      } catch (parseError) {
        await fs.unlink(tempFilePath).catch(() => {})

        if (parseError instanceof Error) {
          if (parseError.message.includes('officeparser')) {
            throw new Error(
              `PDF/Office document parsing failed: ${parseError.message}. Please ensure the file is not corrupted.`
            )
          } else if (parseError.message.includes('base64')) {
            throw new Error(
              `File encoding error: ${parseError.message}. Please try re-uploading the file.`
            )
          } else {
            throw new Error(`File processing error: ${parseError.message}`)
          }
        } else {
          throw new Error(`Unknown file processing error occurred`)
        }
      }
    } else {
      const trimmedContent = content.trim()
      if (!trimmedContent || trimmedContent.length === 0) {
        return {
          filename,
          content: '',
          size,
          mimeType,
          error: `File appears to be empty. No readable content found.`
        }
      }

      return {
        filename,
        content: trimmedContent,
        size,
        mimeType,
        error: undefined
      }
    }
  } catch (error) {
    console.error(`[MAIN] Error processing ${filename}:`, error)
    return {
      filename,
      content: '',
      size,
      mimeType: getMimeTypeFromExtension(filename),
      error: `Failed to process content: ${error instanceof Error ? error.message : 'Unknown error'}`
    }
  }
}
