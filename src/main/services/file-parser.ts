import { promises as fs } from 'fs'
import { getFileExtension, getMimeTypeFromExtension } from '@shared/utils/validation'
import { getErrorMessage } from '@shared/utils/error-handling'

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
      // Minimal log without content preview
      console.log(`[PlainTextParser] Parsed ${this.filename} chars=${content.length}`)
      return {
        content,
        mimeType: this.mimeType,
        metadata: {
          extension: this.fileExtension,
          encoding: 'utf8'
        }
      }
    } catch (error) {
      throw new Error(`Failed to parse plain text file ${this.filename}: ${getErrorMessage(error)}`)
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
            cleanContent = cleanContent.replace(new RegExp(String.fromCharCode(i), 'g'), '')
          }
          // Remove DEL character
          cleanContent = cleanContent.replace(new RegExp(String.fromCharCode(127), 'g'), '')

          return cleanContent.trim()
        }
      } catch {
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
 * Handles PDF documents using pdfjs-dist directly for text extraction
 */
export class PDFParser extends FileParser {
  private static readonly SUPPORTED_EXTENSIONS = ['.pdf']

  canParse(): boolean {
    return PDFParser.SUPPORTED_EXTENSIONS.includes(this.fileExtension)
  }

  async parse(): Promise<FileParserResult> {
    // Add a temporary unhandled rejection handler for PDF.js
    const tempHandler = (reason: any, _promise: Promise<any>) => {
      if (reason && reason.message && reason.message.includes('DOMMatrix')) {
        // Silently ignore DOMMatrix-related unhandled rejections from PDF.js
        console.debug(`[PDFParser] Suppressed PDF.js DOMMatrix rejection:`, reason.message)
        return
      }
    }
    process.on('unhandledRejection', tempHandler)

    try {
      console.log(`[PDFParser] Parsing PDF file with pdfjs-dist: ${this.filename}`)

      // Use CommonJS require via createRequire to load pdfjs-dist v3 build
      const { createRequire } = await import('module')
      const require = createRequire(import.meta.url)
      // pdfjs-dist v3 exports a main entry we can require in Node
      const pdfjs = require('pdfjs-dist')

      try {
        // Set workerSrc explicitly to the distributed worker file to avoid warnings.
        // In v3 the worker file is available at 'pdf.worker.js' in the package root when bundled.
        // Use require.resolve to get the correct path.
        const workerSrc = require.resolve('pdfjs-dist/build/pdf.worker.js')
        pdfjs.GlobalWorkerOptions = pdfjs.GlobalWorkerOptions || {}
        pdfjs.GlobalWorkerOptions.workerSrc = workerSrc
      } catch {
        // ignore if worker file not present or resolve fails
      }

      // Provide polyfills for DOM APIs that PDF.js might reference
      if (typeof (globalThis as any).DOMMatrix === 'undefined') {
        class DOMMatrixPolyfill {
          a = 1
          b = 0
          c = 0
          d = 1
          e = 0
          f = 0
          constructor(_init?: any) {}
          toFloat32Array(): Float32Array {
            return new Float32Array([
              this.a,
              this.b,
              0,
              0,
              this.c,
              this.d,
              0,
              0,
              0,
              0,
              1,
              0,
              this.e,
              this.f,
              0,
              1
            ])
          }
          toString() {
            return 'DOMMatrixPolyfill'
          }
        }
        ;(globalThis as any).DOMMatrix = DOMMatrixPolyfill as any
      }

      // Provide ImageData polyfill
      if (typeof (globalThis as any).ImageData === 'undefined') {
        class ImageDataPolyfill {
          data: Uint8ClampedArray
          width: number
          height: number
          constructor(dataOrWidth: Uint8ClampedArray | number, width?: number, height?: number) {
            if (typeof dataOrWidth === 'number') {
              this.width = dataOrWidth
              this.height = width || dataOrWidth
              this.data = new Uint8ClampedArray(this.width * this.height * 4)
            } else {
              this.data = dataOrWidth
              this.width = width || 0
              this.height = height || 0
            }
          }
        }
        ;(globalThis as any).ImageData = ImageDataPolyfill as any
      }

      // Provide Path2D polyfill
      if (typeof (globalThis as any).Path2D === 'undefined') {
        class Path2DPolyfill {
          constructor(_path?: string | Path2DPolyfill) {}
          addPath(_path: Path2DPolyfill, _transform?: any) {}
          arc(
            _x: number,
            _y: number,
            _radius: number,
            _startAngle: number,
            _endAngle: number,
            _anticlockwise?: boolean
          ) {}
          arcTo(_x1: number, _y1: number, _x2: number, _y2: number, _radius: number) {}
          bezierCurveTo(
            _cp1x: number,
            _cp1y: number,
            _cp2x: number,
            _cp2y: number,
            _x: number,
            _y: number
          ) {}
          closePath() {}
          ellipse(
            _x: number,
            _y: number,
            _radiusX: number,
            _radiusY: number,
            _rotation: number,
            _startAngle: number,
            _endAngle: number,
            _anticlockwise?: boolean
          ) {}
          lineTo(_x: number, _y: number) {}
          moveTo(_x: number, _y: number) {}
          quadraticCurveTo(_cpx: number, _cpy: number, _x: number, _y: number) {}
          rect(_x: number, _y: number, _w: number, _h: number) {}
        }
        ;(globalThis as any).Path2D = Path2DPolyfill as any
      }

      // Polyfill process.getBuiltinModule to avoid the warning
      if (typeof process !== 'undefined' && !process.getBuiltinModule) {
        process.getBuiltinModule = function (_moduleName: string) {
          throw new Error('process.getBuiltinModule is not available in this environment')
        }
      }

      // In Node environment, pdfjs v3 supports passing a Uint8Array directly.
      const data = await fs.readFile(this.filePath)

      // Disable worker in main process to avoid packaging complications
      const loadingTask = pdfjs.getDocument({
        data: new Uint8Array(data),
        disableWorker: true,
        verbosity: 0 // Reduce PDF.js console output
      })

      // Handle potential unhandled promise rejections
      const doc = await loadingTask.promise.catch((error: any) => {
        console.warn(`[PDFParser] PDF loading error for ${this.filename}:`, error.message)
        throw error
      })

      let fullText = ''
      const meta: Record<string, unknown> = {
        extension: this.fileExtension,
        parser: 'pdfjs-dist',
        pages: doc.numPages
      }

      // Try to get metadata (safe guarded)
      try {
        if (doc.getMetadata) {
          const m = await doc.getMetadata().catch(() => null)
          if (m) {
            meta.info = m.info
            meta.metadata = m.metadata?.getAll?.() ?? undefined
          }
        }
      } catch {
        // ignore metadata extraction errors
      }

      for (let pageNum = 1; pageNum <= doc.numPages; pageNum++) {
        const page = await doc.getPage(pageNum)
        const textContent = await page.getTextContent({
          disableCombineTextItems: false,
          normalizeWhitespace: true
        })

        interface TxtItem {
          str: string
          x: number
          y: number
        }
        const rawItems: TxtItem[] = []
        for (const item of textContent.items as any[]) {
          const t = item.transform ? item.transform : item.matrix
          const y = t ? t[5] : 0
          const x = t ? t[4] : 0
          const str: string = item.str ?? ''
          if (!str) continue
          rawItems.push({ str, x, y })
        }
        if (rawItems.length === 0) continue

        const Y_GROUP_TOLERANCE = 0.1
        const lineBuckets: { y: number; items: TxtItem[] }[] = []
        for (const it of rawItems) {
          let bucket = lineBuckets.find((b) => Math.abs(b.y - it.y) <= Y_GROUP_TOLERANCE)
          if (!bucket) {
            bucket = { y: it.y, items: [] }
            lineBuckets.push(bucket)
          }
          bucket.items.push(it)
        }

        // Sort by y descending (top to bottom). We will not infer paragraphs; each Y bucket is a line.
        lineBuckets.sort((a, b) => b.y - a.y)

        const pageLines: string[] = []
        for (const bucket of lineBuckets) {
          bucket.items.sort((a, b) => a.x - b.x)
          let line = ''
          for (const seg of bucket.items) {
            if (/-$/.test(line) && /^[A-Za-z]/.test(seg.str)) {
              line = line.slice(0, -1) + seg.str
            } else {
              line += seg.str
            }
          }
          line = line.replace(/ {2,}/g, ' ').trimEnd()
          pageLines.push(line)
        }

        const pageText = pageLines.join('\n').trimEnd()
        if (pageText) {
          console.log(
            `[PDFParser] Page ${pageNum}/${doc.numPages} lines=${pageLines.length} chars=${pageText.length}`
          )
          fullText += (fullText ? '\n' : '') + pageText
        } else {
          console.log(`[PDFParser] Page ${pageNum}/${doc.numPages} empty after processing`)
        }
      }
      const totalLines = fullText ? fullText.split(/\n/).length : 0
      console.log(
        `[PDFParser] Finished ${this.filename}: pages=${doc.numPages} lines=${totalLines} chars=${fullText.length}`
      )

      return {
        content: fullText.trim(),
        mimeType: this.mimeType,
        metadata: meta
      }
    } catch (error: any) {
      console.error(`[PDFParser] Error parsing (pdfjs-dist) ${this.filename}:`, error)
      throw new Error(
        `Failed to parse PDF document (pdfjs-dist) ${this.filename}: ${getErrorMessage(error)}`
      )
    } finally {
      // Remove the temporary unhandled rejection handler
      try {
        ;(process as any).removeListener('unhandledRejection', tempHandler)
      } catch {
        // Ignore if removal fails
      }
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
