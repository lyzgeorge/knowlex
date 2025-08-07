/**
 * File Import Service
 *
 * Handles temporary file import for chat functionality.
 * Reads file content as plain text and validates file constraints.
 * This is different from project file management - files are not stored permanently.
 */

import fs from 'fs/promises'
import path from 'path'
import { FileMetadata } from '@knowlex/types'

export interface FileImportError {
  filename: string
  error: string
}

export interface FileImportResult {
  success: FileImportContent[]
  errors: FileImportError[]
}

export interface FileImportContent {
  filename: string
  content: string
  size: number
}

export class FileImportService {
  // File constraints from requirements
  private static readonly MAX_FILE_SIZE = 1 * 1024 * 1024 // 1MB
  private static readonly MAX_FILE_COUNT = 10
  private static readonly ALLOWED_EXTENSIONS = ['.txt', '.md']

  /**
   * Import and read multiple files for chat context
   */
  async importFiles(files: FileMetadata[]): Promise<FileImportResult> {
    const success: FileImportContent[] = []
    const errors: FileImportError[] = []

    // Validate file count limit
    if (files.length > FileImportService.MAX_FILE_COUNT) {
      throw new Error(`最多只能上传${FileImportService.MAX_FILE_COUNT}个文件`)
    }

    // Process each file
    for (const file of files) {
      try {
        const content = await this.importSingleFile(file)
        success.push(content)
      } catch (error) {
        errors.push({
          filename: file.filename,
          error: error instanceof Error ? error.message : '未知错误',
        })
      }
    }

    return { success, errors }
  }

  /**
   * Import and read a single file
   */
  private async importSingleFile(file: FileMetadata): Promise<FileImportContent> {
    // Validate file extension
    const ext = path.extname(file.filename).toLowerCase()
    if (!FileImportService.ALLOWED_EXTENSIONS.includes(ext)) {
      throw new Error(`仅支持 ${FileImportService.ALLOWED_EXTENSIONS.join(', ')} 文件`)
    }

    // Validate file size
    if (file.size > FileImportService.MAX_FILE_SIZE) {
      throw new Error('文件大小超出1MB，未上传')
    }

    // Validate file exists
    try {
      await fs.access(file.path)
    } catch {
      throw new Error('文件不存在或无法访问')
    }

    // Read file content as text
    try {
      const content = await fs.readFile(file.path, 'utf-8')

      return {
        filename: file.filename,
        content: content.trim(),
        size: file.size,
      }
    } catch (error) {
      throw new Error(`读取文件失败: ${error instanceof Error ? error.message : '未知错误'}`)
    }
  }

  /**
   * Format file contents for chat context
   * Format: "filename: file content"
   */
  formatFilesForContext(files: FileImportContent[]): string {
    if (files.length === 0) {
      return ''
    }

    const formattedFiles = files.map(file => `${file.filename}:\n${file.content}`)

    return formattedFiles.join('\n\n---\n\n')
  }

  /**
   * Validate file constraints without reading content
   */
  validateFiles(files: FileMetadata[]): { valid: boolean; errors: string[] } {
    const errors: string[] = []

    // Check file count
    if (files.length > FileImportService.MAX_FILE_COUNT) {
      errors.push(`最多只能上传${FileImportService.MAX_FILE_COUNT}个文件`)
    }

    // Check each file
    for (const file of files) {
      // Check file extension
      const ext = path.extname(file.filename).toLowerCase()
      if (!FileImportService.ALLOWED_EXTENSIONS.includes(ext)) {
        errors.push(
          `文件 ${file.filename} 不支持，仅支持 ${FileImportService.ALLOWED_EXTENSIONS.join(', ')} 文件`
        )
      }

      // Check file size
      if (file.size > FileImportService.MAX_FILE_SIZE) {
        errors.push(`文件 ${file.filename} 大小超出1MB限制`)
      }
    }

    return {
      valid: errors.length === 0,
      errors,
    }
  }

  /**
   * Get file size limit in bytes
   */
  static getMaxFileSize(): number {
    return FileImportService.MAX_FILE_SIZE
  }

  /**
   * Get maximum file count
   */
  static getMaxFileCount(): number {
    return FileImportService.MAX_FILE_COUNT
  }

  /**
   * Get allowed file extensions
   */
  static getAllowedExtensions(): string[] {
    return [...FileImportService.ALLOWED_EXTENSIONS]
  }
}
