export const FILE_CONSTRAINTS = {
  /** Maximum size for a single attachment (10MB) */
  maxFileSize: 10 * 1024 * 1024,
  /** Maximum combined size for a batch of attachments (100MB) */
  maxTotalSize: 100 * 1024 * 1024,
  /** Maximum number of files processed in a single batch */
  maxFilesPerBatch: 10
} as const

export const SUPPORTED_FILE_TYPES = [
  // Plain text files
  '.txt',
  '.md',
  '.csv',
  '.json',
  '.xml',
  '.html',
  '.htm',
  // PDF files
  '.pdf',
  // Office documents
  '.docx',
  '.pptx',
  '.xlsx',
  '.odt',
  '.odp',
  '.ods',
  // Image files
  '.jpg',
  '.jpeg',
  '.png',
  '.gif',
  '.bmp',
  '.webp',
  '.svg',
  // Code files
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

export const getFileAcceptString = (): string =>
  (SUPPORTED_FILE_TYPES as readonly string[]).join(',')
