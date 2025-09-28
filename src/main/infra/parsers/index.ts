import { getFileExtension } from '@shared/utils/validation'
import { FileParser, type FileParserResult } from './base'
import { PlainTextParser } from './text'
import { PDFParser } from './pdf'
import { OfficeParser } from './office'

const REGISTERED_PARSERS = [PlainTextParser, PDFParser, OfficeParser]

export class FileParserFactory {
  static createParser(filePath: string, filename: string): FileParser | null {
    for (const ParserClass of REGISTERED_PARSERS) {
      const parser = new ParserClass(filePath, filename)
      if (parser.canParse()) {
        return parser
      }
    }
    return null
  }

  static getSupportedExtensions(): string[] {
    const extensions = new Set<string>()
    PlainTextParser.SUPPORTED_EXTENSIONS.forEach((ext) => extensions.add(ext))
    PDFParser.SUPPORTED_EXTENSIONS.forEach((ext) => extensions.add(ext))
    OfficeParser.SUPPORTED_EXTENSIONS.forEach((ext) => extensions.add(ext))
    return Array.from(extensions).sort()
  }

  static isSupported(filename: string): boolean {
    const extension = getFileExtension(filename).toLowerCase()
    return this.getSupportedExtensions().includes(extension)
  }

  static isBinary(filename: string): boolean {
    const parser = this.createParser('dummy/path', filename)
    return !!parser && !(parser instanceof PlainTextParser)
  }
}

export async function parseFile(filePath: string, filename: string): Promise<FileParserResult> {
  const parser = FileParserFactory.createParser(filePath, filename)

  if (!parser) {
    const extension = getFileExtension(filename)
    const supported = FileParserFactory.getSupportedExtensions()
    throw new Error(`Unsupported file type: ${extension}. Supported types: ${supported.join(', ')}`)
  }

  return await parser.parse()
}

export type { FileParserResult } from './base'
