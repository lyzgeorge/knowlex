export const FILE_CONSTRAINTS = {
  maxFileSize: 10 * 1024 * 1024 // 10MB
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
