import type { ZodTypeAny } from 'zod'
import type {
  AttachmentProcessRequestSchema,
  AttachmentContentProcessRequestSchema
} from '@shared/schemas/file'
import type { ConversationCreateRequestSchema } from '@shared/schemas/conversation'

type SchemaOutput<S extends ZodTypeAny> = S['_output']

export interface IPCResult<T = unknown> {
  success: boolean
  data?: T
  error?: string
}

// Conversation IPC
export type ConversationCreateRequest = SchemaOutput<typeof ConversationCreateRequestSchema>
// Additional aliases kept for legacy API support have been removed

// Attachment processing IPC
export type AttachmentProcessRequest = SchemaOutput<typeof AttachmentProcessRequestSchema>
export type AttachmentContentProcessRequest = SchemaOutput<
  typeof AttachmentContentProcessRequestSchema
>

// Settings IPC
export type SettingsUpdateRequest =
  | { key: string; value: unknown }
  | { fileProcessingModelId?: string | null; fileMaxInputTokens?: number }
