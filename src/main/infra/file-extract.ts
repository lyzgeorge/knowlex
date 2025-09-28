import type { FileParserResult } from '@main/infra/parsers'
import { FileParserFactory, parseFile as parseFileInternal } from '@main/infra/parsers'

/**
 * Extract textual content from a file using the registered parser pipeline.
 */
export async function extractFileContent(
  filePath: string,
  filename: string
): Promise<FileParserResult> {
  return await parseFileInternal(filePath, filename)
}

/**
 * Returns true when a given filename maps to a binary parser (PDF/Office/etc).
 * Useful when deciding whether temp files are required before parsing.
 */
export function isBinaryParsableFile(filename: string): boolean {
  return FileParserFactory.isBinary(filename)
}

/**
 * Whether the file type is supported by the parser pipeline.
 */
export function isSupportedFileType(filename: string): boolean {
  return FileParserFactory.isSupported(filename)
}
