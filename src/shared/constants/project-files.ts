export const PROJECT_FILE_LIMITS = {
  maxFilesPerProject: 100,
  maxFileSizeBytes: 50 * 1024 * 1024
}

export const PROJECT_FILE_SMART_NOTES = {
  schemaVersion: '1.1',
  chunkSizeTokens: 30000,
  overlapTokens: 2000,
  defaultMaxInputTokens: 131072,
  maxKeywords: 32
}

export const PROJECT_FILE_STORAGE = {
  // Paths are stored relative to the app userData root.
  // Files will be kept under <projectId>/<fileId>/
  originalFilename: (ext: string) => `original.${ext}`,
  contentFilename: 'content.txt'
}

export const PROJECT_FILE_EVENTS = {
  statusUpdate: 'projectFile:statusUpdate',
  created: 'projectFile:created',
  updated: 'projectFile:updated',
  deleted: 'projectFile:deleted'
} as const

export const PROJECT_FILE_CHANNELS = {
  upload: 'projectFile:upload',
  list: 'projectFile:list',
  get: 'projectFile:get',
  updateContent: 'projectFile:updateContent',
  updateSmartNotes: 'projectFile:updateSmartNotes',
  regenerateSmartNotes: 'projectFile:regenerateSmartNotes',
  delete: 'projectFile:delete',
  open: 'projectFile:open'
} as const
