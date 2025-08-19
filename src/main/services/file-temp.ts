import { promises as fs } from 'fs'
import path from 'path'
import os from 'os'
import { TemporaryFileResult } from '../../shared/types/file'
import {
  getFileExtension,
  isValidTemporaryFileType,
  getMimeTypeFromExtension
} from '../../shared/utils/validation'
import { SUPPORTED_FILE_TYPES, FILE_CONSTRAINTS } from '../../shared/constants/file'
import { parseFile, FileParserFactory } from './file-parser'

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
  console.log(
    '[MAIN] processTemporaryFileContents called with files:',
    files.map((f) => ({ name: f.name, size: f.size, contentLength: f.content.length }))
  )
  const results: TemporaryFileResult[] = []

  try {
    // Validate file constraints first
    console.log('[MAIN] Validating file constraints...')
    if (!validateTemporaryFileContentConstraints(files)) {
      throw new Error('File constraints validation failed')
    }
    console.log('[MAIN] File constraints validation passed')

    // Process each file individually
    for (const file of files) {
      try {
        console.log('[MAIN] Processing file:', file.name)
        const result = await processSingleTemporaryFileContent(file.name, file.content, file.size)
        console.log('[MAIN] File processing result:', {
          filename: result.filename,
          error: result.error,
          contentLength: result.content?.length
        })
        results.push(result)
      } catch (error) {
        console.error('[MAIN] File processing error for', file.name, ':', error)
        results.push({
          filename: file.name,
          content: '',
          size: file.size,
          mimeType: '',
          error: `Processing failed: ${error instanceof Error ? error.message : 'Unknown error'}`
        })
      }
    }

    console.log(
      '[MAIN] All files processed, returning results:',
      results.map((r) => ({
        filename: r.filename,
        error: r.error,
        contentLength: r.content?.length
      }))
    )
    return results
  } catch (error) {
    console.error('[MAIN] Critical error in processTemporaryFileContents:', error)
    // Return error results for all files if validation or other critical error occurs
    return files.map((file) => ({
      filename: file.name,
      content: '',
      size: file.size,
      mimeType: '',
      error: `Critical error: ${error instanceof Error ? error.message : 'Unknown error'}`
    }))
  }
}

export async function processTemporaryFiles(filePaths: string[]): Promise<TemporaryFileResult[]> {
  const results: TemporaryFileResult[] = []

  // Validate file constraints first
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

  // Validate overall constraints (count and total size)
  const validation = validateTemporaryFileConstraints(fileStats)

  if (!validation.valid) {
    // Check if errors are global (count/total size) vs individual file errors
    const globalErrors = validation.errors.filter(
      (error) => error.includes('Too many files') || error.includes('Total file size too large')
    )

    if (globalErrors.length > 0) {
      // Return error for all files if global validation fails
      return filePaths.map((filePath) => ({
        filename: path.basename(filePath),
        content: '',
        size: 0,
        mimeType: '',
        error: globalErrors.join('; ')
      }))
    }
  }

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
      const result = await processSingleTemporaryFile(stat.path, stat.name, stat.size)
      results.push(result)
    } catch (error) {
      results.push({
        filename: stat.name,
        content: '',
        size: stat.size,
        mimeType: '',
        error: `Processing failed: ${error instanceof Error ? error.message : 'Unknown error'}`
      })
    }
  }

  return results
}

/**
 * Process a single temporary file
 * @param filePath Path to the file
 * @param filename Original filename
 * @param size File size in bytes
 * @returns Processing result with content or error
 */
async function processSingleTemporaryFile(
  filePath: string,
  filename: string,
  size: number
): Promise<TemporaryFileResult> {
  // Validate file type
  if (!isValidTemporaryFileType(filename)) {
    return {
      filename,
      content: '',
      size,
      mimeType: '',
      error: `Unsupported file type. Only ${SUPPORTED_FILE_TYPES.TEMPORARY.join(', ')} files are supported.`
    }
  }

  // Validate file size
  if (size > FILE_CONSTRAINTS.TEMPORARY.maxFileSize) {
    return {
      filename,
      content: '',
      size,
      mimeType: '',
      error: `File too large. Maximum size is ${FILE_CONSTRAINTS.TEMPORARY.maxFileSize / (1024 * 1024)}MB.`
    }
  }

  try {
    const result = await parseFile(filePath, filename)

    return {
      filename,
      content: result.content,
      size,
      mimeType: result.mimeType,
      error: undefined
    }
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

/**
 * Extract text content from a file using the file parser system
 * @param filePath Path to the file
 * @param filename Original filename for type detection
 * @returns Extracted text content
 */
export async function extractTextContent(filePath: string, filename: string): Promise<string> {
  try {
    const result = await parseFile(filePath, filename)
    return result.content
  } catch (error) {
    throw new Error(
      `Failed to extract content from ${filename}: ${error instanceof Error ? error.message : 'Unknown error'}`
    )
  }
}

/**
 * Validate file constraints specifically for temporary files
 * @param files Array of files to validate
 * @returns Validation result with errors if any
 */
export function validateTemporaryFileConstraints(files: { name: string; size: number }[]): {
  valid: boolean
  errors: string[]
} {
  const errors: string[] = []
  const constraints = FILE_CONSTRAINTS.TEMPORARY

  // Check file count
  if (files.length > constraints.maxFileCount) {
    errors.push(`Too many files. Maximum ${constraints.maxFileCount} files allowed.`)
  }

  // Check total size
  const totalSize = files.reduce((sum, file) => sum + file.size, 0)
  if (totalSize > constraints.maxTotalSize) {
    errors.push(
      `Total file size too large. Maximum ${Math.round(constraints.maxTotalSize / (1024 * 1024))}MB allowed.`
    )
  }

  // Check individual files
  files.forEach((file, index) => {
    if (!isValidTemporaryFileType(file.name)) {
      const extension = getFileExtension(file.name)
      errors.push(
        `File ${index + 1} (${file.name}): Unsupported file type ${extension}. Only ${SUPPORTED_FILE_TYPES.TEMPORARY.join(', ')} files are supported.`
      )
    }

    if (file.size > constraints.maxFileSize) {
      errors.push(
        `File ${index + 1} (${file.name}): File too large. Maximum ${Math.round(constraints.maxFileSize / (1024 * 1024))}MB allowed.`
      )
    }

    // Note: Empty files are allowed in processing, but flagged in validation
    if (file.size === 0) {
      errors.push(`File ${index + 1} (${file.name}): File is empty.`)
    }
  })

  return {
    valid: errors.length === 0,
    errors
  }
}

/**
 * Validate temporary file constraints for content-based processing
 * @param files Array of file data to validate
 * @returns True if valid, throws error if invalid
 */
function validateTemporaryFileContentConstraints(
  files: Array<{ name: string; content: string; size: number }>
): boolean {
  const constraints = FILE_CONSTRAINTS.TEMPORARY

  // Check file count
  if (files.length > constraints.maxFileCount) {
    throw new Error(`Too many files. Maximum ${constraints.maxFileCount} files allowed.`)
  }

  // Check total size
  const totalSize = files.reduce((sum, file) => sum + file.size, 0)
  if (totalSize > constraints.maxTotalSize) {
    throw new Error(
      `Total file size too large. Maximum ${Math.round(constraints.maxTotalSize / (1024 * 1024))}MB allowed.`
    )
  }

  // Check individual files
  files.forEach((file, index) => {
    if (!isValidTemporaryFileType(file.name)) {
      const extension = getFileExtension(file.name)
      throw new Error(
        `File ${index + 1} (${file.name}): Unsupported file type ${extension}. Only ${SUPPORTED_FILE_TYPES.TEMPORARY.join(', ')} files are supported.`
      )
    }

    if (file.size > constraints.maxFileSize) {
      throw new Error(
        `File ${index + 1} (${file.name}): File too large. Maximum ${Math.round(constraints.maxFileSize / (1024 * 1024))}MB allowed.`
      )
    }

    if (file.size === 0) {
      throw new Error(`File ${index + 1} (${file.name}): File is empty.`)
    }
  })

  return true
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
  // Validate file type
  if (!isValidTemporaryFileType(filename)) {
    return {
      filename,
      content: '',
      size,
      mimeType: '',
      error: `Unsupported file type. Only ${SUPPORTED_FILE_TYPES.TEMPORARY.join(', ')} files are supported.`
    }
  }

  // Validate file size
  if (size > FILE_CONSTRAINTS.TEMPORARY.maxFileSize) {
    return {
      filename,
      content: '',
      size,
      mimeType: '',
      error: `File too large. Maximum size is ${FILE_CONSTRAINTS.TEMPORARY.maxFileSize / (1024 * 1024)}MB.`
    }
  }

  try {
    const mimeType = getMimeTypeFromExtension(filename)

    // Check if this file type needs parsing (binary files like DOCX, PDF, etc.)
    const needsParsing = FileParserFactory.isBinary(filename)

    if (needsParsing) {
      console.log(`[MAIN] File ${filename} needs parsing, creating temporary file...`)

      // Create a temporary file to use with the file parser
      const tempDir = os.tmpdir()
      const tempFilePath = path.join(tempDir, `knowlex_temp_${Date.now()}_${filename}`)

      try {
        // Write binary content to temporary file
        // Content is base64 encoded binary data for binary files
        console.log(`[MAIN] Decoding base64 content for ${filename} (${content.length} chars)...`)

        let buffer: Buffer
        try {
          buffer = Buffer.from(content, 'base64')
          console.log(`[MAIN] Successfully decoded base64 to buffer of ${buffer.length} bytes`)
        } catch (bufferError) {
          console.error(`[MAIN] Failed to decode base64 content for ${filename}:`, bufferError)
          throw new Error(
            `Failed to decode file content: ${bufferError instanceof Error ? bufferError.message : 'Unknown buffer error'}`
          )
        }

        console.log(`[MAIN] Writing buffer to temporary file ${tempFilePath}...`)
        await fs.writeFile(tempFilePath, buffer)
        console.log(`[MAIN] Successfully wrote temporary file for ${filename}`)

        // Parse the temporary file
        console.log(`[MAIN] Parsing temporary file ${tempFilePath} for ${filename}...`)
        const parseResult = await parseFile(tempFilePath, filename)
        console.log(`[MAIN] Parse completed for ${filename}`)

        // Clean up temporary file
        await fs
          .unlink(tempFilePath)
          .catch((err) => console.warn(`[MAIN] Failed to cleanup temp file ${tempFilePath}:`, err))

        console.log(
          `[MAIN] Successfully parsed ${filename}, extracted ${parseResult.content.length} characters`
        )

        return {
          filename,
          content: parseResult.content,
          size,
          mimeType: parseResult.mimeType,
          error: undefined
        }
      } catch (parseError) {
        console.error(`[MAIN] Parse error occurred for ${filename}:`, parseError)
        // Clean up temporary file on error
        await fs.unlink(tempFilePath).catch(() => {}) // Ignore cleanup errors

        // Provide more specific error messages
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
      // For plain text files, content is already text - just clean up
      console.log(`[MAIN] File ${filename} is plain text, using content directly`)
      return {
        filename,
        content: content.trim(),
        size,
        mimeType,
        error: undefined
      }
    }
  } catch (error) {
    console.log(`[MAIN] Error processing ${filename}:`, error)
    return {
      filename,
      content: '',
      size,
      mimeType: getMimeTypeFromExtension(filename),
      error: `Failed to process content: ${error instanceof Error ? error.message : 'Unknown error'}`
    }
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
      // Ignore errors - file might already be deleted
      console.warn(`Failed to cleanup temporary file ${filePath}:`, error)
    }
  })

  await Promise.all(cleanupPromises)
}
