/**
 * Database entity schemas for Knowlex
 * Defines the mapping between TypeScript entities and database tables
 */

import type { Conversation } from '@shared/types/conversation'
import type { Project } from '@shared/types/project'
import type { Message } from '@shared/types/message'
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
