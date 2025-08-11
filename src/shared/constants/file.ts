export const FILE_CONSTRAINTS = {
  TEMPORARY: {
    maxFileSize: 1024 * 1024, // 1MB
    maxTotalSize: 10 * 1024 * 1024, // 10MB
    maxFileCount: 10
  },
  PROJECT: {
    maxFileSize: 50 * 1024 * 1024, // 50MB
    maxTotalSize: 500 * 1024 * 1024, // 500MB
    maxFileCount: 100
  }
} as const

export const SUPPORTED_FILE_TYPES = {
  TEMPORARY: ['.txt', '.md'],
  PROJECT: [
    '.txt',
    '.md',
    '.pdf',
    '.docx',
    '.rtf',
    '.html',
    '.htm',
    '.csv',
    '.json',
    '.xml',
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
  'text/plain': '.txt',
  'text/markdown': '.md',
  'application/pdf': '.pdf',
  'application/vnd.openxmlformats-officedocument.wordprocessingml.document': '.docx',
  'text/html': '.html',
  'application/json': '.json',
  'text/csv': '.csv',
  'application/xml': '.xml'
} as const

export const CHUNK_SIZE = 1000 // characters per chunk for vectorization
export const CHUNK_OVERLAP = 200 // overlap between chunks
