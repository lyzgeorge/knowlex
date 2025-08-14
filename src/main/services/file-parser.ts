import { promises as fs } from 'fs'
import { getFileExtension, getMimeTypeFromExtension } from '../../shared/utils/validation'

/**
 * File Parser Interface
 *
 * Defines the contract for file content extraction.
 * All file parsers must implement this interface.
 */
export interface FileParserResult {
  content: string
  mimeType: string
  metadata?: Record<string, unknown>
}

/**
 * Abstract File Parser Base Class
 *
 * Provides common functionality and defines the interface for file parsers.
 * Concrete implementations handle specific file types.
 */
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

  /**
   * Parse file content - must be implemented by concrete classes
   */
  abstract parse(): Promise<FileParserResult>

  /**
   * Check if this parser can handle the given file
   */
  abstract canParse(): boolean

  /**
   * Get file stats for validation
   */
  protected async getFileStats(): Promise<{ size: number }> {
    const stats = await fs.stat(this.filePath)
    return { size: stats.size }
  }
}

/**
 * Plain Text File Parser
 *
 * Handles plain text files including:
 * - Text files (.txt, .md)
 * - Data files (.csv, .json, .xml)
 * - Code files (.js, .ts, .py, .java, etc.)
 */
export class PlainTextParser extends FileParser {
  private static readonly SUPPORTED_EXTENSIONS = [
    '.txt',
    '.md',
    '.csv',
    '.json',
    '.xml',
    '.html',
    '.htm',
    '.js',
    '.jsx',
    '.ts',
    '.tsx',
    '.py',
    '.java',
    '.cpp',
    '.c',
    '.h',
    '.cs',
    '.php',
    '.rb',
    '.go',
    '.rs',
    '.swift',
    '.kt'
  ]

  canParse(): boolean {
    return PlainTextParser.SUPPORTED_EXTENSIONS.includes(this.fileExtension)
  }

  async parse(): Promise<FileParserResult> {
    try {
      const content = await this.extractPlainTextContent()
      return {
        content,
        mimeType: this.mimeType,
        metadata: {
          extension: this.fileExtension,
          encoding: 'utf8'
        }
      }
    } catch (error) {
      throw new Error(
        `Failed to parse plain text file ${this.filename}: ${
          error instanceof Error ? error.message : 'Unknown error'
        }`
      )
    }
  }

  private async extractPlainTextContent(): Promise<string> {
    // Try different encodings for better compatibility
    const encodings = ['utf8', 'utf16le', 'latin1'] as const

    for (const encoding of encodings) {
      try {
        const content = await fs.readFile(this.filePath, encoding)

        if (typeof content === 'string') {
          // Clean content by removing control characters except newlines and tabs
          let cleanContent = content
          for (let i = 0; i <= 31; i++) {
            if (i === 9 || i === 10 || i === 13) continue // Keep tab, newline, carriage return
            cleanContent = cleanContent.replaceAll(String.fromCharCode(i), '')
          }
          // Remove DEL character
          cleanContent = cleanContent.replaceAll(String.fromCharCode(127), '')

          return cleanContent.trim()
        }
      } catch (encodingError) {
        // Try next encoding
        continue
      }
    }

    throw new Error('Unable to read file with any supported encoding')
  }
}

/**
 * PDF Document Parser
 *
 * Handles PDF documents using pdf-parse library for better PDF processing
 */
export class PDFParser extends FileParser {
  private static readonly SUPPORTED_EXTENSIONS = ['.pdf']

  canParse(): boolean {
    return PDFParser.SUPPORTED_EXTENSIONS.includes(this.fileExtension)
  }

  async parse(): Promise<FileParserResult> {
    try {
      console.log(`[PDFParser] Parsing PDF file: ${this.filename}`)

      // pdf-parse is a CommonJS module, use createRequire for proper loading
      const { createRequire } = await import('module')
      const require = createRequire(import.meta.url)
      const pdfParse = require('pdf-parse')

      // Configure PDF.js options for Node.js environment
      // Leave options empty to use defaults which work better in test environment
      const options = {}

      // Read the PDF file as buffer
      const buffer = await fs.readFile(this.filePath)

      // Parse the PDF - pdf-parse expects a Buffer and returns a promise
      const data = await pdfParse(buffer, options)

      console.log(
        `[PDFParser] Successfully extracted ${data.text.length} characters from ${this.filename}`
      )

      return {
        content: data.text.trim(),
        mimeType: this.mimeType,
        metadata: {
          extension: this.fileExtension,
          parser: 'pdf-parse',
          pages: data.numpages,
          numrender: data.numrender,
          version: data.version,
          info: data.info
        }
      }
    } catch (error) {
      console.error(`[PDFParser] Error parsing ${this.filename}:`, error)
      throw new Error(
        `Failed to parse PDF document ${this.filename}: ${
          error instanceof Error ? error.message : 'Unknown error'
        }`
      )
    }
  }
}

/**
 * Office Document Parser
 *
 * Handles Office documents using officeParser library:
 * - Microsoft Office: .docx, .pptx, .xlsx
 * - OpenDocument: .odt, .odp, .ods
 */
export class OfficeParser extends FileParser {
  private static readonly SUPPORTED_EXTENSIONS = ['.docx', '.pptx', '.xlsx', '.odt', '.odp', '.ods']

  canParse(): boolean {
    return OfficeParser.SUPPORTED_EXTENSIONS.includes(this.fileExtension)
  }

  async parse(): Promise<FileParserResult> {
    try {
      console.log(`[OfficeParser] Parsing ${this.fileExtension} file: ${this.filename}`)

      // Dynamic import to avoid loading officeParser if not needed
      const officeParserModule = await import('officeparser')
      // Handle both ES module and CommonJS module exports
      const officeParser = officeParserModule.default || officeParserModule

      console.log(`[OfficeParser] Available methods:`, Object.keys(officeParser))

      // Use parseOfficeAsync for proper async/await support
      const data = await officeParser.parseOfficeAsync(this.filePath)

      console.log(
        `[OfficeParser] Successfully extracted ${data.length} characters from ${this.filename}`
      )

      return {
        content: data.trim(),
        mimeType: this.mimeType,
        metadata: {
          extension: this.fileExtension,
          parser: 'officeparser'
        }
      }
    } catch (error) {
      console.error(`[OfficeParser] Error parsing ${this.filename}:`, error)
      throw new Error(
        `Failed to parse office document ${this.filename}: ${
          error instanceof Error ? error.message : 'Unknown error'
        }`
      )
    }
  }
}

/**
 * File Parser Factory
 *
 * Creates appropriate parser instances based on file type.
 * Supports both file path and content-type based detection.
 */
export class FileParserFactory {
  private static readonly PARSERS = [PlainTextParser, PDFParser, OfficeParser]

  /**
   * Create parser for a file
   * @param filePath Path to the file
   * @param filename Original filename
   * @returns Appropriate parser instance or null if unsupported
   */
  static createParser(filePath: string, filename: string): FileParser | null {
    for (const ParserClass of this.PARSERS) {
      const parser = new ParserClass(filePath, filename)
      if (parser.canParse()) {
        return parser
      }
    }
    return null
  }

  /**
   * Get supported file extensions
   * @returns Array of supported extensions
   */
  static getSupportedExtensions(): string[] {
    const extensions = new Set<string>()

    // Add plain text extensions
    PlainTextParser['SUPPORTED_EXTENSIONS'].forEach((ext) => extensions.add(ext))
    // Add PDF extensions
    PDFParser['SUPPORTED_EXTENSIONS'].forEach((ext) => extensions.add(ext))
    // Add office extensions
    OfficeParser['SUPPORTED_EXTENSIONS'].forEach((ext) => extensions.add(ext))

    return Array.from(extensions).sort()
  }

  /**
   * Check if a file type is supported
   * @param filename Filename to check
   * @returns True if supported, false otherwise
   */
  static isSupported(filename: string): boolean {
    const extension = getFileExtension(filename).toLowerCase()
    return this.getSupportedExtensions().includes(extension)
  }

  /**
   * Check if a file is considered a binary type that requires parsing from a buffer
   * @param filename Filename to check
   * @returns True if binary, false otherwise
   */
  static isBinary(filename: string): boolean {
    // PlainTextParser handles all its extensions as text.
    // If a parser other than PlainTextParser can handle it, it's binary for our purpose.
    const parser = this.createParser('dummy/path', filename)
    return !!parser && !(parser instanceof PlainTextParser)
  }
}

/**
 * Main file parsing function
 *
 * High-level function to parse any supported file type.
 * @param filePath Path to the file
 * @param filename Original filename
 * @returns Parsed content and metadata
 */
export async function parseFile(filePath: string, filename: string): Promise<FileParserResult> {
  const parser = FileParserFactory.createParser(filePath, filename)

  if (!parser) {
    const extension = getFileExtension(filename)
    const supported = FileParserFactory.getSupportedExtensions()
    throw new Error(`Unsupported file type: ${extension}. Supported types: ${supported.join(', ')}`)
  }

  return await parser.parse()
}
