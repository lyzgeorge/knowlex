export interface Message {
  id: string
  conversationId: string
  role: 'user' | 'assistant' | 'system'
  content: MessageContent
  reasoning?: string
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
  url: string
  alt?: string
  mimeType?: string
  size?: number
}
