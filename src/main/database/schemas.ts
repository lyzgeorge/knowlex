/**
 * Database entity schemas for Knowlex
 * Defines the mapping between TypeScript entities and database tables
 */

import type { Conversation } from '@shared/types/conversation-types'
import type { Project } from '@shared/types/project'
import type { Message } from '@shared/types/message'
import type { ModelConfig } from '@shared/types/models'
// Import type only where used externally; avoid unused lint here
import { DatabaseEntity, type EntitySchema, createFieldMapping } from './entity'

/**
 * Conversation entity schema
 */
export const conversationSchema: EntitySchema<Conversation> = {
  tableName: 'conversations',
  primaryKey: 'id',
  defaultOrder: {
    column: 'updated_at',
    direction: 'DESC'
  },
  fields: [
    createFieldMapping('id', 'id'),
    // Nullable foreign key to projects
    createFieldMapping('projectId', 'project_id', {
      required: false,
      updatable: true
    }),
    createFieldMapping('title', 'title'),
    createFieldMapping('createdAt', 'created_at'),
    createFieldMapping('updatedAt', 'updated_at'),
    createFieldMapping('settings', 'settings', {
      isJson: true,
      required: false,
      updatable: true
    }),
    createFieldMapping('modelConfigId', 'model_config_id', {
      required: false,
      updatable: true
    })
  ]
}

/**
 * Message entity schema
 */
export const messageSchema: EntitySchema<Message> = {
  tableName: 'messages',
  primaryKey: 'id',
  defaultOrder: {
    column: 'created_at',
    direction: 'ASC'
  },
  fields: [
    createFieldMapping('id', 'id'),
    createFieldMapping('conversationId', 'conversation_id'),
    createFieldMapping('role', 'role'),
    createFieldMapping('content', 'content', {
      isJson: true,
      updatable: true
    }),
    createFieldMapping('parentMessageId', 'parent_message_id', {
      required: false,
      updatable: false
    }),
    createFieldMapping('reasoning', 'reasoning', {
      required: false,
      updatable: true
    }),
    createFieldMapping('createdAt', 'created_at'),
    createFieldMapping('updatedAt', 'updated_at')
  ]
}

/**
 * Pre-configured entity instances
 */
export const conversationEntity = new DatabaseEntity<Conversation>(conversationSchema)
export const messageEntity = new DatabaseEntity<Message>(messageSchema)

/**
 * Project entity schema
 */
export const projectSchema: EntitySchema<Project> = {
  tableName: 'projects',
  primaryKey: 'id',
  defaultOrder: {
    column: 'created_at',
    direction: 'DESC'
  },
  fields: [
    createFieldMapping('id', 'id'),
    createFieldMapping('name', 'name'),
    createFieldMapping('createdAt', 'created_at'),
    createFieldMapping('updatedAt', 'updated_at')
  ]
}

export const projectEntity = new DatabaseEntity<Project>(projectSchema)

/**
 * Model config entity schema
 */
export const modelConfigSchema: EntitySchema<ModelConfig> = {
  tableName: 'model_configs',
  primaryKey: 'id',
  defaultOrder: {
    column: 'created_at',
    direction: 'ASC'
  },
  fields: [
    createFieldMapping('id', 'id'),
    createFieldMapping('name', 'name'),
    createFieldMapping('apiEndpoint', 'api_endpoint'),
    createFieldMapping('apiKey', 'api_key', {
      required: false,
      updatable: true
    }),
    createFieldMapping('modelId', 'model_id'),
    createFieldMapping('temperature', 'temperature', {
      required: false,
      updatable: true
    }),
    createFieldMapping('topP', 'top_p', {
      required: false,
      updatable: true
    }),
    createFieldMapping('frequencyPenalty', 'frequency_penalty', {
      required: false,
      updatable: true
    }),
    createFieldMapping('presencePenalty', 'presence_penalty', {
      required: false,
      updatable: true
    }),
    createFieldMapping('maxInputTokens', 'max_input_tokens', {
      required: false,
      updatable: true
    }),
    createFieldMapping('supportsReasoning', 'supports_reasoning'),
    createFieldMapping('supportsVision', 'supports_vision'),
    createFieldMapping('supportsToolUse', 'supports_tool_use'),
    createFieldMapping('supportsWebSearch', 'supports_web_search'),
    createFieldMapping('createdAt', 'created_at'),
    createFieldMapping('updatedAt', 'updated_at')
  ]
}

export const modelConfigEntity = new DatabaseEntity<ModelConfig>(modelConfigSchema)

/**
 * Project file entity schema
 */
export const projectFileSchema: EntitySchema<any> = {
  tableName: 'project_files',
  primaryKey: 'id',
  defaultOrder: { column: 'updated_at', direction: 'DESC' },
  fields: [
    createFieldMapping('id', 'id'),
    createFieldMapping('project_id', 'project_id'),
    createFieldMapping('filename', 'filename'),
    createFieldMapping('file_size', 'file_size'),
    createFieldMapping('file_hash', 'file_hash'),
    createFieldMapping('file_path', 'file_path', { required: false, updatable: true }),
    createFieldMapping('content_path', 'content_path', { required: false, updatable: true }),
    createFieldMapping('mime_type', 'mime_type'),
    createFieldMapping('smart_notes', 'smart_notes', {
      isJson: true,
      required: false,
      updatable: true
    }),
    createFieldMapping('smart_notes_status', 'smart_notes_status'),
    createFieldMapping('smart_notes_generated_at', 'smart_notes_generated_at', {
      required: false,
      updatable: true
    }),
    createFieldMapping('smart_notes_schema_version', 'smart_notes_schema_version'),
    createFieldMapping('error', 'error', { required: false, updatable: true }),
    createFieldMapping('upload_time', 'upload_time'),
    createFieldMapping('created_at', 'created_at'),
    createFieldMapping('updated_at', 'updated_at')
  ]
}

// DatabaseEntity requires createdAt/updatedAt camelCase in T; our row uses snake_case.
// Cast to any for entity while keeping external functions typed with ProjectFileRow.
export const projectFileEntity = new DatabaseEntity<any>(projectFileSchema as any)
