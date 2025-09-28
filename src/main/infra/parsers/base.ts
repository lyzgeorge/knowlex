import { stat } from 'node:fs/promises'
import { getFileExtension, getMimeTypeFromExtension } from '@shared/utils/validation'

export interface FileParserResult {
  content: string
  mimeType: string
  metadata?: Record<string, unknown>
}

export abstract class FileParser {
  protected filename: string
  protected filePath: string
  protected fileExtension: string
  protected mimeType: string

  constructor(filePath: string, filename: string) {
    this.filePath = filePath
    this.filename = filename
    this.fileExtension = getFileExtension(filename).toLowerCase()
    this.mimeType = getMimeTypeFromExtension(filename)
  }

  abstract parse(): Promise<FileParserResult>

  abstract canParse(): boolean

  protected async getFileStats(): Promise<{ size: number }> {
    const stats = await stat(this.filePath)
    return { size: stats.size }
  }
}
