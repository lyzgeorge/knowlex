import { getErrorMessage } from '@shared/utils/error-handling'
import { FileParser, type FileParserResult } from './base'

export class OfficeParser extends FileParser {
  public static readonly SUPPORTED_EXTENSIONS = [
    '.docx',
    '.pptx',
    '.xlsx',
    '.odt',
    '.odp',
    '.ods'
  ] as const

  canParse(): boolean {
    return OfficeParser.SUPPORTED_EXTENSIONS.includes(this.fileExtension as any)
  }

  async parse(): Promise<FileParserResult> {
    try {
      console.log(`[OfficeParser] Parsing ${this.fileExtension} file: ${this.filename}`)
      const officeParserModule = await import('officeparser')
      const officeParser = officeParserModule.default || officeParserModule
      const data = await officeParser.parseOfficeAsync(this.filePath)
      const trimmed = data.trim()
      console.log(`[OfficeParser] Parsed ${this.filename} chars=${trimmed.length}`)
      return {
        content: trimmed,
        mimeType: this.mimeType,
        metadata: {
          extension: this.fileExtension,
          parser: 'officeparser'
        }
      }
    } catch (error) {
      console.error(`[OfficeParser] Error parsing ${this.filename}:`, error)
      throw new Error(`Failed to parse office document ${this.filename}: ${getErrorMessage(error)}`)
    }
  }
}
