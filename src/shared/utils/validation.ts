import { SUPPORTED_FILE_TYPES, FILE_CONSTRAINTS } from '@shared/constants/file'
import { IMAGE_EXTENSIONS, EXTENSION_TO_MIME, DEFAULT_MIME } from '@shared/constants/file-types'

/**
 * Generic string validators shared across layers to keep SPOT/DRY.
 */
export function isNonEmptyString(value: unknown): value is string {
  return typeof value === 'string' && value.trim().length > 0
}

export function ensureNonEmptyString(value: unknown, name = 'Value'): string {
  if (!isNonEmptyString(value)) {
    throw new Error(`${name} is required and must be a non-empty string`)
  }
  return value.trim()
}

/**
 * File validation helpers
 */
function isValidFileSize(size: number): boolean {
  return size <= FILE_CONSTRAINTS.maxFileSize
}

export function getFileExtension(filename: string): string {
  const lastDot = filename.lastIndexOf('.')
  return lastDot === -1 ? '' : filename.substring(lastDot)
}

export function formatFileSize(bytes: number): string {
  if (bytes === 0) return '0 B'

  const k = 1024
  const sizes = ['B', 'KB', 'MB', 'GB']
  const i = Math.floor(Math.log(bytes) / Math.log(k))

  return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i]
}

export function isImageFile(filename: string): boolean {
  const extension = getFileExtension(filename).toLowerCase()
  return (IMAGE_EXTENSIONS as readonly string[]).includes(extension)
}

export function getMimeTypeFromExtension(filename: string): string {
  const extension = getFileExtension(filename).toLowerCase()
  return EXTENSION_TO_MIME[extension] || DEFAULT_MIME
}

/**
 * Validate a list of files (name + size) against shared constraints.
 * Returns { valid, errors }.
 */
interface FileDescriptor {
  name: string
  size: number
}

interface FileValidationOptions {
  /** Files that are already part of the batch (used when validating incremental additions) */
  existingFiles?: FileDescriptor[]
  /** Override maximum number of files allowed */
  maxFiles?: number
  /** Override maximum total size allowed */
  maxTotalSize?: number
}

interface FileValidationResult {
  valid: boolean
  errors: string[]
}

export function validateFileConstraints(
  files: FileDescriptor[],
  options: FileValidationOptions = {}
): FileValidationResult {
  const errors: string[] = []

  const existingFiles = options.existingFiles ?? []
  const maxFiles = options.maxFiles ?? FILE_CONSTRAINTS.maxFilesPerBatch
  const maxTotalSize = options.maxTotalSize ?? FILE_CONSTRAINTS.maxTotalSize

  const supportedExtensions = new Set<string>(SUPPORTED_FILE_TYPES as readonly string[])

  const totalFiles = existingFiles.length + files.length
  if (typeof maxFiles === 'number' && maxFiles > 0 && totalFiles > maxFiles) {
    errors.push(`Too many files selected. Maximum allowed per batch is ${maxFiles}.`)
  }

  const existingSize = existingFiles.reduce((acc, file) => acc + (file.size || 0), 0)
  const incomingSize = files.reduce((acc, file) => acc + (file.size || 0), 0)
  const totalSize = existingSize + incomingSize

  if (typeof maxTotalSize === 'number' && maxTotalSize > 0 && totalSize > maxTotalSize) {
    errors.push(
      `Combined file size exceeds limit of ${formatFileSize(maxTotalSize)} (current batch: ${formatFileSize(
        totalSize
      )}).`
    )
  }

  files.forEach((file, idx) => {
    const ext = getFileExtension(file.name).toLowerCase()
    if (!supportedExtensions.has(ext)) {
      errors.push(
        `File ${idx + 1} (${file.name}): Unsupported file type ${ext}. Supported: ${(
          SUPPORTED_FILE_TYPES as readonly string[]
        ).join(', ')}`
      )
    }

    if (!isValidFileSize(file.size)) {
      errors.push(
        `File ${idx + 1} (${file.name}): File too large. Maximum is ${formatFileSize(FILE_CONSTRAINTS.maxFileSize)}.`
      )
    }

    if (file.size === 0) {
      errors.push(`File ${idx + 1} (${file.name}): File is empty.`)
    }
  })

  return { valid: errors.length === 0, errors }
}
