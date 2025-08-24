import { promises as fs } from 'fs'
import path from 'path'
import os from 'os'
import { TemporaryFileResult } from '@shared/types/file'
import {
  getFileExtension,
  isValidTemporaryFileType,
  getMimeTypeFromExtension,
  formatBytes,
  isImageFile
} from '@shared/utils/validation'
import { SUPPORTED_FILE_TYPES, FILE_CONSTRAINTS } from '@shared/constants/file'
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
  console.log('[MAIN] processTemporaryFileContents called with', files.length, 'files')
  const results: TemporaryFileResult[] = []

  try {
    // Validate file constraints first
    validateTemporaryFileContentConstraints(files)

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
          error: `Processing failed: ${error instanceof Error ? error.message : 'Unknown error'}`
        })
      }
    }

    console.log('[MAIN] Successfully processed', results.length, 'files')
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
      error: `File too large. Maximum size is ${formatBytes(FILE_CONSTRAINTS.TEMPORARY.maxFileSize)}.`
    }
  }

  try {
    // Handle image files - read as base64 without text parsing
    if (isImageFile(filename)) {
      console.log(`[MAIN] Processing image file from path: ${filename}`)
      const imageBuffer = await fs.readFile(filePath)
      const base64Content = imageBuffer.toString('base64')
      const dataUrl = `data:${getMimeTypeFromExtension(filename)};base64,${base64Content}`

      return {
        filename,
        content: dataUrl, // Return as data URL for frontend compatibility
        size,
        mimeType: getMimeTypeFromExtension(filename),
        error: undefined
      }
    }

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
 * @param throwOnError If true, throws error instead of returning result
 * @returns Validation result with errors if any (only when throwOnError is false)
 */
function validateTemporaryFileConstraintsInternal(
  files: { name: string; size: number }[],
  throwOnError: boolean = false
): { valid: boolean; errors: string[] } | void {
  const errors: string[] = []
  const constraints = FILE_CONSTRAINTS.TEMPORARY

  // Check file count
  if (files.length > constraints.maxFileCount) {
    const error = `Too many files. Maximum ${constraints.maxFileCount} files allowed.`
    if (throwOnError) throw new Error(error)
    errors.push(error)
  }

  // Check total size
  const totalSize = files.reduce((sum, file) => sum + file.size, 0)
  if (totalSize > constraints.maxTotalSize) {
    const error = `Total file size too large. Maximum ${formatBytes(constraints.maxTotalSize)} allowed.`
    if (throwOnError) throw new Error(error)
    errors.push(error)
  }

  // Check individual files
  files.forEach((file, index) => {
    if (!isValidTemporaryFileType(file.name)) {
      const extension = getFileExtension(file.name)
      const error = `File ${index + 1} (${file.name}): Unsupported file type ${extension}. Only ${SUPPORTED_FILE_TYPES.TEMPORARY.join(', ')} files are supported.`
      if (throwOnError) throw new Error(error)
      errors.push(error)
    }

    if (file.size > constraints.maxFileSize) {
      const error = `File ${index + 1} (${file.name}): File too large. Maximum ${formatBytes(constraints.maxFileSize)} allowed.`
      if (throwOnError) throw new Error(error)
      errors.push(error)
    }

    // Note: Empty files are allowed in processing, but flagged in validation
    if (file.size === 0) {
      const error = `File ${index + 1} (${file.name}): File is empty.`
      if (throwOnError) throw new Error(error)
      errors.push(error)
    }
  })

  if (!throwOnError) {
    return {
      valid: errors.length === 0,
      errors
    }
  }

  return
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
  return validateTemporaryFileConstraintsInternal(files, false) as {
    valid: boolean
    errors: string[]
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
  // Use the unified validation with throwOnError = true
  validateTemporaryFileConstraintsInternal(files, true)
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
      error: `File too large. Maximum size is ${formatBytes(FILE_CONSTRAINTS.TEMPORARY.maxFileSize)}.`
    }
  }

  try {
    const mimeType = getMimeTypeFromExtension(filename)

    // Handle image files - ensure content is a base64 data URL for consistency
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

    // Check if this file type needs parsing (binary files like DOCX, PDF, etc.)
    const needsParsing = FileParserFactory.isBinary(filename)

    if (needsParsing) {
      // Create a temporary file to use with the file parser
      const tempDir = os.tmpdir()
      const tempFilePath = path.join(tempDir, `knowlex_temp_${Date.now()}_${filename}`)

      try {
        // Write binary content to temporary file
        // Content is base64 encoded binary data for binary files
        let buffer: Buffer
        try {
          buffer = Buffer.from(content, 'base64')
        } catch (bufferError) {
          throw new Error(
            `Failed to decode file content: ${bufferError instanceof Error ? bufferError.message : 'Unknown buffer error'}`
          )
        }

        await fs.writeFile(tempFilePath, buffer)

        // Parse the temporary file
        const parseResult = await parseFile(tempFilePath, filename)

        // Clean up temporary file
        await fs
          .unlink(tempFilePath)
          .catch((err) => console.warn(`[MAIN] Failed to cleanup temp file ${tempFilePath}:`, err))

        console.log(
          `[MAIN] Successfully parsed ${filename}:`,
          parseResult.content.length,
          'characters'
        )

        // Check if parsed content is empty or invalid
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
      const trimmedContent = content.trim()

      // Check if text content is empty
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
