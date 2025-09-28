import { z } from 'zod'
import type { ReasoningEffort } from '@shared/types/models'

const NonEmptyString = z.string().trim().min(1, 'Value is required')

const MessageIdSchema = NonEmptyString.describe('Message ID')

const CitationSchema = z
  .object({
    fileId: NonEmptyString,
    filename: NonEmptyString,
    content: NonEmptyString,
    similarity: z.number().min(0),
    pageNumber: z.number().int().min(0).optional(),
    metadata: z.record(z.string(), z.any()).optional()
  })
  .strict()

const ToolCallSchema = z
  .object({
    id: NonEmptyString,
    name: NonEmptyString,
    arguments: z.record(z.string(), z.any()),
    result: z.any().optional()
  })
  .strict()

const AttachmentSchema = z
  .object({
    filename: NonEmptyString,
    content: NonEmptyString,
    size: z.number().int().min(0),
    mimeType: NonEmptyString
  })
  .strict()

const ImageSchema = z
  .object({
    image: NonEmptyString,
    mediaType: z.string().trim().min(1).optional(),
    filename: z.string().trim().min(1).optional()
  })
  .strict()

const TextPartSchema = z
  .object({
    type: z.literal('text'),
    text: NonEmptyString
  })
  .strict()

const CitationPartSchema = z
  .object({
    type: z.literal('citation'),
    citation: CitationSchema
  })
  .strict()

const ToolCallPartSchema = z
  .object({
    type: z.literal('tool-call'),
    toolCall: ToolCallSchema
  })
  .strict()

const AttachmentPartSchema = z
  .object({
    type: z.literal('attachment'),
    attachment: AttachmentSchema
  })
  .strict()

const ImagePartSchema = z
  .object({
    type: z.literal('image'),
    image: ImageSchema
  })
  .strict()

const MessageContentPartSchema = z.discriminatedUnion('type', [
  TextPartSchema,
  CitationPartSchema,
  ToolCallPartSchema,
  AttachmentPartSchema,
  ImagePartSchema
])

export const MessageContentSchema = z
  .array(MessageContentPartSchema)
  .min(1, 'Message must include at least one content part')

const OptionalId = NonEmptyString.nullable().optional()

const ReasoningEffortValues = [
  'low',
  'medium',
  'high'
] as const satisfies readonly ReasoningEffort[]

export const MessageUpdateRequestSchema = z
  .object({
    id: MessageIdSchema,
    content: MessageContentSchema
  })
  .strict()

export const MessageSendRequestSchema = z
  .object({
    content: MessageContentSchema,
    reasoningEffort: z.enum(ReasoningEffortValues).optional(),
    conversationId: OptionalId,
    parentMessageId: OptionalId,
    projectId: OptionalId,
    modelConfigId: OptionalId
  })
  .strict()
