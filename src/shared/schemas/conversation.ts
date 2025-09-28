import { z } from 'zod'

const NonEmptyString = z.string().trim().min(1, 'Value is required')
const NullableId = NonEmptyString.nullable().optional()

const ConversationIdSchema = NonEmptyString.describe('Conversation ID')
export const SessionSettingsSchema = z
  .object({
    systemPrompt: z.string().trim().max(4000).optional(),
    temperature: z.number().min(0).max(2).optional()
  })
  .strict()

export const ConversationCreateRequestSchema = z
  .object({
    title: z.string().trim().min(1).max(200).optional(),
    projectId: NullableId,
    modelConfigId: NullableId,
    settings: SessionSettingsSchema.optional()
  })
  .strict()

export const ConversationListRequestSchema = z
  .object({
    limit: z.number().int().min(1).max(50).optional(),
    offset: z.number().int().min(0).optional()
  })
  .strict()

export const ConversationUpdateRequestSchema = z
  .object({
    id: ConversationIdSchema,
    title: z.string().trim().min(1).max(200).optional(),
    settings: SessionSettingsSchema.optional(),
    projectId: NullableId,
    modelConfigId: NullableId
  })
  .strict()

export const ConversationMoveRequestSchema = z
  .object({
    conversationId: ConversationIdSchema,
    projectId: NullableId
  })
  .strict()

export type SessionSettingsInput = z.infer<typeof SessionSettingsSchema>
