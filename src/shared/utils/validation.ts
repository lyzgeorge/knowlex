import { SUPPORTED_FILE_TYPES, FILE_CONSTRAINTS } from '../constants/file'

export function isValidFileType(filename: string, context: 'temporary' | 'project'): boolean {
  const extension = getFileExtension(filename).toLowerCase()
  const supportedTypes =
    context === 'temporary' ? SUPPORTED_FILE_TYPES.TEMPORARY : SUPPORTED_FILE_TYPES.PROJECT

  return supportedTypes.includes(extension)
}

export function isValidFileSize(size: number, context: 'temporary' | 'project'): boolean {
  const maxSize =
    context === 'temporary'
      ? FILE_CONSTRAINTS.TEMPORARY.maxFileSize
      : FILE_CONSTRAINTS.PROJECT.maxFileSize

  return size <= maxSize
}

export function validateFileConstraints(
  files: File[],
  context: 'temporary' | 'project'
): {
  valid: boolean
  errors: string[]
} {
  const errors: string[] = []
  const constraints =
    context === 'temporary' ? FILE_CONSTRAINTS.TEMPORARY : FILE_CONSTRAINTS.PROJECT

  // Check file count
  if (files.length > constraints.maxFileCount) {
    errors.push(`Too many files. Maximum ${constraints.maxFileCount} files allowed.`)
  }

  // Check total size
  const totalSize = files.reduce((sum, file) => sum + file.size, 0)
  if (totalSize > constraints.maxTotalSize) {
    errors.push(
      `Total file size too large. Maximum ${formatBytes(constraints.maxTotalSize)} allowed.`
    )
  }

  // Check individual files
  files.forEach((file, index) => {
    if (!isValidFileType(file.name, context)) {
      errors.push(`File ${index + 1}: Unsupported file type ${getFileExtension(file.name)}`)
    }

    if (!isValidFileSize(file.size, context)) {
      errors.push(
        `File ${index + 1}: File too large. Maximum ${formatBytes(constraints.maxFileSize)} allowed.`
      )
    }
  })

  return {
    valid: errors.length === 0,
    errors
  }
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
