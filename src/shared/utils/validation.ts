import { SUPPORTED_FILE_TYPES, FILE_CONSTRAINTS } from '@shared/constants/file'

export function isValidFileType(filename: string): boolean {
  const extension = getFileExtension(filename).toLowerCase()

  return (SUPPORTED_FILE_TYPES as readonly string[]).includes(extension)
}

export function isValidFileSize(size: number): boolean {
  return size <= FILE_CONSTRAINTS.maxFileSize
}

export function getFileExtension(filename: string): string {
  const lastDot = filename.lastIndexOf('.')
  return lastDot === -1 ? '' : filename.substring(lastDot)
}

export function formatBytes(bytes: number): string {
  if (bytes === 0) return '0 B'

  const k = 1024
  const sizes = ['B', 'KB', 'MB', 'GB']
  const i = Math.floor(Math.log(bytes) / Math.log(k))

  return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i]
}

export function isValidEmail(email: string): boolean {
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
  return emailRegex.test(email)
}

export function isValidUrl(url: string): boolean {
  try {
    new URL(url)
    return true
  } catch {
    return false
  }
}

export function sanitizeFilename(filename: string): string {
  return filename.replace(/[^a-zA-Z0-9._-]/g, '_')
}

export function isImageFile(filename: string): boolean {
  const extension = getFileExtension(filename).toLowerCase()
  const imageExtensions = ['.jpg', '.jpeg', '.png', '.gif', '.bmp', '.webp', '.svg']
  return imageExtensions.includes(extension)
}

export function getMimeTypeFromExtension(filename: string): string {
  const extension = getFileExtension(filename).toLowerCase()

  switch (extension) {
    // Plain text files
    case '.txt':
      return 'text/plain'
    case '.md':
      return 'text/markdown'
    case '.html':
    case '.htm':
      return 'text/html'
    case '.json':
      return 'application/json'
    case '.csv':
      return 'text/csv'
    case '.xml':
      return 'application/xml'

    // PDF files
    case '.pdf':
      return 'application/pdf'

    // Microsoft Office files
    case '.docx':
      return 'application/vnd.openxmlformats-officedocument.wordprocessingml.document'
    case '.pptx':
      return 'application/vnd.openxmlformats-officedocument.presentationml.presentation'
    case '.xlsx':
      return 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'

    // OpenDocument files
    case '.odt':
      return 'application/vnd.oasis.opendocument.text'
    case '.odp':
      return 'application/vnd.oasis.opendocument.presentation'
    case '.ods':
      return 'application/vnd.oasis.opendocument.spreadsheet'

    // Image files
    case '.jpg':
    case '.jpeg':
      return 'image/jpeg'
    case '.png':
      return 'image/png'
    case '.gif':
      return 'image/gif'
    case '.bmp':
      return 'image/bmp'
    case '.webp':
      return 'image/webp'
    case '.svg':
      return 'image/svg+xml'

    default:
      return 'application/octet-stream'
  }
}

/**
 * Validate a list of files (name + size) against shared constraints.
 * Returns { valid, errors }.
 */
export function validateFileConstraints(files: Array<{ name: string; size: number }>): {
  valid: boolean
  errors: string[]
} {
  const errors: string[] = []

  files.forEach((file, idx) => {
    const ext = getFileExtension(file.name).toLowerCase()
    if (!(SUPPORTED_FILE_TYPES as readonly string[]).includes(ext)) {
      errors.push(
        `File ${idx + 1} (${file.name}): Unsupported file type ${ext}. Supported: ${(
          SUPPORTED_FILE_TYPES as readonly string[]
        ).join(', ')}`
      )
    }

    if (!isValidFileSize(file.size)) {
      errors.push(
        `File ${idx + 1} (${file.name}): File too large. Maximum is ${formatBytes(FILE_CONSTRAINTS.maxFileSize)}.`
      )
    }

    if (file.size === 0) {
      errors.push(`File ${idx + 1} (${file.name}): File is empty.`)
    }
  })

  return { valid: errors.length === 0, errors }
}
