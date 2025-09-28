import type { CitationEvidence } from './citation'

export interface Message {
  id: string
  conversationId: string
  role: 'user' | 'assistant' | 'system'
  content: MessageContent
  reasoning?: string
  // Optional transient property set by sender to indicate chosen reasoning effort
  reasoningEffort?: import('./models').ReasoningEffort
  createdAt: string
  updatedAt: string
  parentMessageId?: string
}

export type MessageContent = MessageContentPart[]

export interface MessageContentPart {
  type: ContentType
  text?: string
  citation?: CitationEvidence
  toolCall?: ToolCallContent
  attachment?: AttachmentContent
  image?: ImageContent
}

type ContentType = 'text' | 'citation' | 'tool-call' | 'attachment' | 'image'

interface ToolCallContent {
  id: string
  name: string
  arguments: Record<string, unknown>
  result?: unknown
}

interface AttachmentContent {
  filename: string
  content: string
  size: number
  mimeType: string
}

interface ImageContent {
  /**
   * Image data as string (base64 data URL, URL, or base64 content)
   * Compatible with AI SDK ImagePart.image format
   * For binary data (ArrayBuffer, Uint8Array, Buffer), convert to base64 string first
   */
  image: string
  /**
   * Optional IANA media type of the image.
   * We recommend leaving this out as it will be detected automatically.
   */
  mediaType?: string
  /**
   * Optional filename for the image
   */
  filename?: string
}
