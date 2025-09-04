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
