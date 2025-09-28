import { readFile } from 'node:fs/promises'
import { getErrorMessage } from '@shared/utils/error-handling'
import { FileParser, type FileParserResult } from './base'

export class PDFParser extends FileParser {
  public static readonly SUPPORTED_EXTENSIONS = ['.pdf'] as const

  canParse(): boolean {
    return PDFParser.SUPPORTED_EXTENSIONS.includes(this.fileExtension as any)
  }

  async parse(): Promise<FileParserResult> {
    const tempHandler = (reason: any) => {
      if (reason && reason.message && reason.message.includes('DOMMatrix')) {
        console.debug(`[PDFParser] Suppressed PDF.js DOMMatrix rejection:`, reason.message)
      }
    }
    process.on('unhandledRejection', tempHandler)

    try {
      console.log(`[PDFParser] Parsing PDF file with pdfjs-dist: ${this.filename}`)
      const { createRequire } = await import('module')
      const require = createRequire(import.meta.url)
      const pdfjs = require('pdfjs-dist')

      try {
        const workerSrc = require.resolve('pdfjs-dist/build/pdf.worker.js')
        pdfjs.GlobalWorkerOptions = pdfjs.GlobalWorkerOptions || {}
        pdfjs.GlobalWorkerOptions.workerSrc = workerSrc
      } catch {
        // ignore resolve failure
      }

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

      if (typeof process !== 'undefined' && !(process as any).getBuiltinModule) {
        ;(process as any).getBuiltinModule = function (_moduleName: string) {
          throw new Error('process.getBuiltinModule is not available in this environment')
        }
      }

      const data = await readFile(this.filePath)
      const loadingTask = pdfjs.getDocument({
        data: new Uint8Array(data),
        disableWorker: true,
        verbosity: 0
      })

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

      try {
        if (doc.getMetadata) {
          const metadata = await doc.getMetadata().catch(() => null)
          if (metadata) {
            meta.info = metadata.info
            meta.metadata = metadata.metadata?.getAll?.() ?? undefined
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
          const transform = item.transform ? item.transform : item.matrix
          const y = transform ? transform[5] : 0
          const x = transform ? transform[4] : 0
          const str: string = item.str ?? ''
          if (!str) continue
          rawItems.push({ str, x, y })
        }
        if (rawItems.length === 0) continue

        const Y_GROUP_TOLERANCE = 0.1
        const lineBuckets: { y: number; items: TxtItem[] }[] = []
        for (const item of rawItems) {
          let bucket = lineBuckets.find((b) => Math.abs(b.y - item.y) <= Y_GROUP_TOLERANCE)
          if (!bucket) {
            bucket = { y: item.y, items: [] }
            lineBuckets.push(bucket)
          }
          bucket.items.push(item)
        }

        lineBuckets.sort((a, b) => b.y - a.y)

        const pageLines: string[] = []
        for (const bucket of lineBuckets) {
          bucket.items.sort((a, b) => a.x - b.x)
          let line = ''
          for (const segment of bucket.items) {
            if (/-$/.test(line) && /^[A-Za-z]/.test(segment.str)) {
              line = line.slice(0, -1) + segment.str
            } else {
              line += segment.str
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
      try {
        ;(process as any).removeListener('unhandledRejection', tempHandler)
      } catch {
        // ignore errors
      }
    }
  }
}
