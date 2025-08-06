/**
 * Common types used across the application
 */

export interface BaseEntity {
  id: number
  createdAt: string
  updatedAt: string
}

export interface PaginationParams {
  limit?: number
  offset?: number
}

export interface PaginatedResponse<T> {
  data: T[]
  total: number
  limit: number
  offset: number
  hasMore: boolean
}

export interface ErrorResponse {
  code: string
  message: string
  details?: unknown
}

export interface SuccessResponse<T = unknown> {
  success: true
  data: T
}

export interface FailureResponse {
  success: false
  error: ErrorResponse
}

export type APIResponse<T = unknown> = SuccessResponse<T> | FailureResponse

export interface FileMetadata {
  filename: string
  size: number
  mimeType: string
  md5: string
  path: string
}

export interface ProcessingStatus {
  status: 'pending' | 'processing' | 'completed' | 'failed'
  progress?: number
  error?: string
  startedAt?: string
  completedAt?: string
}

export type Theme = 'light' | 'dark' | 'system'
export type Language = 'en' | 'zh'
export type MessageRole = 'user' | 'assistant' | 'system' | 'tool'
