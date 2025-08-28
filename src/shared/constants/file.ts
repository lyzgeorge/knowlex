export const FILE_CONSTRAINTS = {
  TEMPORARY: {
    maxFileSize: 10 * 1024 * 1024, // 10MB
    maxTotalSize: 100 * 1024 * 1024, // 100MB
    maxFileCount: 10
  },
  PROJECT: {
    maxFileSize: 50 * 1024 * 1024, // 50MB
    maxTotalSize: 500 * 1024 * 1024, // 500MB
    maxFileCount: 100
  }
} as const

export const SUPPORTED_FILE_TYPES = {
  TEMPORARY: [
    // Plain text files
    '.txt',
    '.md',
    '.csv',
    '.json',
    '.xml',
    '.html',
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
    '.svg'
  ],
  PROJECT: [
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
  ]
} as const

export const MIME_TYPES = {
  // Plain text files
  'text/plain': '.txt',
  'text/markdown': '.md',
  'text/html': '.html',
  'application/json': '.json',
  'text/csv': '.csv',
  'application/xml': '.xml',
  'text/xml': '.xml',

  // PDF files
  'application/pdf': '.pdf',

  // Microsoft Office files
  'application/vnd.openxmlformats-officedocument.wordprocessingml.document': '.docx',
  'application/vnd.ms-powerpoint': '.ppt',
  'application/vnd.openxmlformats-officedocument.presentationml.presentation': '.pptx',
  'application/vnd.ms-excel': '.xls',
  'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet': '.xlsx',

  // OpenDocument files
  'application/vnd.oasis.opendocument.text': '.odt',
  'application/vnd.oasis.opendocument.presentation': '.odp',
  'application/vnd.oasis.opendocument.spreadsheet': '.ods',

  // Image files
  'image/jpeg': '.jpg',
  'image/png': '.png',
  'image/gif': '.gif',
  'image/bmp': '.bmp',
  'image/webp': '.webp',
  'image/svg+xml': '.svg'
} as const

export const CHUNK_SIZE = 1000 // characters per chunk for vectorization
export const CHUNK_OVERLAP = 200 // overlap between chunks
