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
  citation?: CitationContent
  toolCall?: ToolCallContent
  temporaryFile?: TemporaryFileContent
  image?: ImageContent
}

export type ContentType = 'text' | 'citation' | 'tool-call' | 'temporary-file' | 'image'

export interface CitationContent {
  filename: string
  fileId: string
  content: string
  similarity: number
  pageNumber?: number
}

export interface ToolCallContent {
  id: string
  name: string
  arguments: Record<string, unknown>
  result?: unknown
}

export interface TemporaryFileContent {
  filename: string
  content: string
  size: number
  mimeType: string
}

export interface ImageContent {
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
