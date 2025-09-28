/**
 * Central registry for all IPC channel identifiers.
 *
 * Maintains a single source of truth so the main process handlers,
 * preload bridge, and renderer clients stay in sync.
 */
export const IPC_CHANNELS = {
  conversation: {
    create: 'conversation:create',
    listPaginated: 'conversation:list-paginated',
    get: 'conversation:get',
    update: 'conversation:update',
    delete: 'conversation:delete',
    move: 'conversation:move'
  },
  message: {
    list: 'message:list',
    get: 'message:get',
    send: 'message:send',
    update: 'message:update',
    delete: 'message:delete',
    stop: 'message:stop',
    regenerate: 'message:regenerate'
  },
  project: {
    create: 'project:create',
    list: 'project:list',
    get: 'project:get',
    update: 'project:update',
    delete: 'project:delete',
    conversations: 'project:conversations'
  },
  projectFile: {
    upload: 'projectFile:upload',
    list: 'projectFile:list',
    get: 'projectFile:get',
    updateContent: 'projectFile:updateContent',
    updateSmartNotes: 'projectFile:updateSmartNotes',
    regenerateSmartNotes: 'projectFile:regenerateSmartNotes',
    delete: 'projectFile:delete',
    open: 'projectFile:open'
  },
  attachment: {
    process: 'attachment:process',
    processContent: 'attachment:process-content'
  },
  settings: {
    get: 'settings:get',
    update: 'settings:update'
  },
  modelConfig: {
    list: 'model-config:list',
    get: 'model-config:get',
    create: 'model-config:create',
    update: 'model-config:update',
    delete: 'model-config:delete',
    test: 'model-config:test',
    getDefault: 'model-config:get-default',
    setDefault: 'model-config:set-default'
  },
  ai: {
    testConnection: 'ai:test-connection'
  }
} as const

export const CONVERSATION_CHANNELS = IPC_CHANNELS.conversation
export const MESSAGE_CHANNELS = IPC_CHANNELS.message
export const PROJECT_CHANNELS = IPC_CHANNELS.project
export const PROJECT_FILE_CHANNELS = IPC_CHANNELS.projectFile
export const ATTACHMENT_CHANNELS = IPC_CHANNELS.attachment
export const SETTINGS_CHANNELS = IPC_CHANNELS.settings
export const MODEL_CONFIG_CHANNELS = IPC_CHANNELS.modelConfig
export const AI_CHANNELS = IPC_CHANNELS.ai

// Utility types for better inference when working with channel strings
