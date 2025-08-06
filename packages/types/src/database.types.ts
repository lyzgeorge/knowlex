/**
 * Database schema types and interfaces
 */

import { BaseEntity, ProcessingStatus, MessageRole } from './common.types'

export interface Project extends BaseEntity {
  name: string
  description?: string
}

export interface Conversation extends BaseEntity {
  title: string
  projectId?: number
}

export interface Message extends BaseEntity {
  conversationId: string
  role: MessageRole
  content: string
  fileReferences?: string[]
  toolCalls?: unknown[]
  metadata?: Record<string, unknown>
}

export interface ProjectFile extends BaseEntity {
  projectId: number
  filename: string
  originalPath: string
  pdfPath: string
  fileSize: number
  md5Original: string
  md5Pdf: string
  status: ProcessingStatus['status']
}

export interface ProjectMemory extends BaseEntity {
  projectId: number
  content: string
  type: 'memory' | 'description'
  isSystem: boolean
}

export interface ProjectKnowledge extends BaseEntity {
  projectId: number
  title: string
  content: string
}

export interface VectorDocument {
  id: string
  fileId: number
  projectId: number
  chunkIndex: number
  content: string
  filename: string
  chunkStart: number
  chunkEnd: number
  createdAt: string
  embedding: number[]
}

export interface AppSetting {
  key: string
  value: string
  updatedAt: string
}

export interface RerankSetting extends BaseEntity {
  modelName: string
  apiKey?: string
  baseUrl?: string
  enabled: boolean
}
