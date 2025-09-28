import { readFile } from 'node:fs/promises'
import { getErrorMessage } from '@shared/utils/error-handling'
import { FileParser } from './base'

export class PlainTextParser extends FileParser {
  public static readonly SUPPORTED_EXTENSIONS = [
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
  ] as const

  canParse(): boolean {
    return PlainTextParser.SUPPORTED_EXTENSIONS.includes(this.fileExtension as any)
  }

  async parse() {
    try {
      const content = await this.extractPlainTextContent()
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
    const encodings = ['utf8', 'utf16le', 'latin1'] as const

    for (const encoding of encodings) {
      try {
        const content = await readFile(this.filePath, encoding)
        if (typeof content === 'string') {
          let cleanContent = content
          for (let i = 0; i <= 31; i++) {
            if (i === 9 || i === 10 || i === 13) continue
            cleanContent = cleanContent.replace(new RegExp(String.fromCharCode(i), 'g'), '')
          }
          cleanContent = cleanContent.replace(new RegExp(String.fromCharCode(127), 'g'), '')
          return cleanContent.trim()
        }
      } catch {
        continue
      }
    }

    throw new Error('Unable to read file with any supported encoding')
  }
}
